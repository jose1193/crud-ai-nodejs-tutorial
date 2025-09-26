// Integración de todos los módulos creados
// Crear aplicación que use: CRUD de usuarios + sistema de emails + autenticación + utilidades DB
// Mostrar cómo los módulos trabajan juntos sin conflictos
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

// Importar módulos del sistema
const DatabaseManager = require("./modules/database/DatabaseManager");
const UserCRUD = require("./modules/crud/UserCRUD");
const EmailService = require("./modules/email/EmailService");
const AuthService = require("./modules/auth/AuthService");
const CacheManager = require("./modules/database/CacheManager");

class IntegratedApp {
  constructor() {
    this.app = express();
    this.port = process.env.PORT || 3000;

    // Inicializar servicios
    this.dbManager = null;
    this.userCRUD = null;
    this.emailService = null;
    this.authService = null;
    this.cacheManager = null;

    this.setupMiddleware();
    this.setupRoutes();
  }

  /**
   * Configurar middleware de Express
   */
  setupMiddleware() {
    // Seguridad
    this.app.use(helmet());
    this.app.use(
      cors({
        origin: process.env.ALLOWED_ORIGINS?.split(",") || [
          "http://localhost:3000",
        ],
        credentials: true,
      })
    );

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutos
      max: 100, // máximo 100 requests por ventana
      message: "Demasiadas peticiones desde esta IP",
    });
    this.app.use(limiter);

    // Parsing
    this.app.use(express.json({ limit: "10mb" }));
    this.app.use(express.urlencoded({ extended: true }));

    // Logging middleware
    this.app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
      next();
    });
  }

  /**
   * Configurar rutas de la aplicación
   */
  setupRoutes() {
    // Ruta de salud
    this.app.get("/health", (req, res) => {
      res.json({
        status: "OK",
        timestamp: new Date().toISOString(),
        services: {
          database: this.dbManager?.isConnected || false,
          cache: this.cacheManager?.isConnected || false,
          email: this.emailService?.isConfigured || false,
        },
      });
    });

    // Rutas de autenticación
    this.app.post("/auth/register", this.handleRegister.bind(this));
    this.app.post("/auth/login", this.handleLogin.bind(this));
    this.app.post(
      "/auth/logout",
      this.authenticateToken.bind(this),
      this.handleLogout.bind(this)
    );
    this.app.post("/auth/refresh", this.handleRefreshToken.bind(this));
    this.app.post(
      "/auth/forgot-password",
      this.handleForgotPassword.bind(this)
    );
    this.app.post("/auth/reset-password", this.handleResetPassword.bind(this));

    // Rutas de usuarios (protegidas)
    this.app.get(
      "/users",
      this.authenticateToken.bind(this),
      this.getUsers.bind(this)
    );
    this.app.get(
      "/users/:id",
      this.authenticateToken.bind(this),
      this.getUser.bind(this)
    );
    this.app.put(
      "/users/:id",
      this.authenticateToken.bind(this),
      this.updateUser.bind(this)
    );
    this.app.delete(
      "/users/:id",
      this.authenticateToken.bind(this),
      this.deleteUser.bind(this)
    );

    // Rutas de perfil
    this.app.get(
      "/profile",
      this.authenticateToken.bind(this),
      this.getProfile.bind(this)
    );
    this.app.put(
      "/profile",
      this.authenticateToken.bind(this),
      this.updateProfile.bind(this)
    );

    // Rutas de administración
    this.app.get(
      "/admin/stats",
      this.authenticateToken.bind(this),
      this.requireAdmin.bind(this),
      this.getStats.bind(this)
    );
    this.app.post(
      "/admin/cache/clear",
      this.authenticateToken.bind(this),
      this.requireAdmin.bind(this),
      this.clearCache.bind(this)
    );

    // Manejo de errores
    this.app.use(this.errorHandler.bind(this));
  }

  /**
   * Inicializar todos los servicios
   */
  async initializeServices() {
    try {
      console.log("Inicializando servicios...");

      // Configuración de base de datos
      const dbConfig = {
        type: process.env.DB_TYPE || "mysql",
        host: process.env.DB_HOST || "localhost",
        port: parseInt(process.env.DB_PORT) || 3306,
        database: process.env.DB_NAME || "integrated_app",
        username: process.env.DB_USER || "root",
        password: process.env.DB_PASSWORD || "",
        maxPoolSize: 10,
        connectionTimeout: 10000,
        queryTimeout: 30000,
      };

      // Inicializar Database Manager
      this.dbManager = new DatabaseManager(dbConfig);
      await this.dbManager.connect();
      console.log("✓ Database Manager conectado");

      // Inicializar Cache Manager
      this.cacheManager = new CacheManager({
        enabled: process.env.CACHE_ENABLED !== "false",
        redis: {
          host: process.env.REDIS_HOST || "localhost",
          port: parseInt(process.env.REDIS_PORT) || 6379,
          password: process.env.REDIS_PASSWORD || "",
        },
        ttl: 300,
      });
      await this.cacheManager.connect();
      console.log("✓ Cache Manager conectado");

      // Inicializar User CRUD
      this.userCRUD = new UserCRUD(this.dbManager, this.cacheManager);
      console.log("✓ User CRUD inicializado");

      // Inicializar Email Service
      this.emailService = new EmailService({
        provider: process.env.EMAIL_PROVIDER || "smtp",
        smtp: {
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT) || 587,
          secure: process.env.SMTP_SECURE === "true",
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD,
          },
        },
        from: process.env.EMAIL_FROM || "noreply@example.com",
      });
      console.log("✓ Email Service inicializado");

      // Inicializar Auth Service
      this.authService = new AuthService(
        {
          jwtSecret: process.env.JWT_SECRET || "your-secret-key",
          jwtExpiration: process.env.JWT_EXPIRATION || "1h",
          refreshTokenExpiration: process.env.REFRESH_TOKEN_EXPIRATION || "7d",
          bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS) || 12,
        },
        this.userCRUD,
        this.emailService
      );
      console.log("✓ Auth Service inicializado");

      console.log("Todos los servicios inicializados correctamente");
    } catch (error) {
      console.error("Error inicializando servicios:", error);
      throw error;
    }
  }

  /**
   * Middleware de autenticación
   */
  async authenticateToken(req, res, next) {
    try {
      const authHeader = req.headers["authorization"];
      const token = authHeader && authHeader.split(" ")[1];

      if (!token) {
        return res.status(401).json({ error: "Token de acceso requerido" });
      }

      const decoded = await this.authService.verifyToken(token);
      req.user = decoded;
      next();
    } catch (error) {
      return res.status(403).json({ error: "Token inválido" });
    }
  }

  /**
   * Middleware para requerir permisos de admin
   */
  requireAdmin(req, res, next) {
    if (req.user.role !== "admin") {
      return res
        .status(403)
        .json({ error: "Permisos de administrador requeridos" });
    }
    next();
  }

  /**
   * Handlers de autenticación
   */
  async handleRegister(req, res) {
    try {
      const { email, password, name } = req.body;

      if (!email || !password || !name) {
        return res
          .status(400)
          .json({ error: "Email, password y name son requeridos" });
      }

      const result = await this.authService.register({ email, password, name });
      res.status(201).json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async handleLogin(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res
          .status(400)
          .json({ error: "Email y password son requeridos" });
      }

      const result = await this.authService.login(email, password);
      res.json(result);
    } catch (error) {
      res.status(401).json({ error: error.message });
    }
  }

  async handleLogout(req, res) {
    try {
      const token = req.headers["authorization"]?.split(" ")[1];
      await this.authService.logout(token);
      res.json({ message: "Logout exitoso" });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async handleRefreshToken(req, res) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({ error: "Refresh token requerido" });
      }

      const result = await this.authService.refreshToken(refreshToken);
      res.json(result);
    } catch (error) {
      res.status(401).json({ error: error.message });
    }
  }

  async handleForgotPassword(req, res) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ error: "Email es requerido" });
      }

      await this.authService.forgotPassword(email);
      res.json({ message: "Email de recuperación enviado" });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async handleResetPassword(req, res) {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return res
          .status(400)
          .json({ error: "Token y nueva password son requeridos" });
      }

      await this.authService.resetPassword(token, newPassword);
      res.json({ message: "Password actualizada exitosamente" });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  /**
   * Handlers de usuarios
   */
  async getUsers(req, res) {
    try {
      const { page = 1, limit = 10, search } = req.query;
      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        search,
      };

      const users = await this.userCRUD.getAll(options);
      res.json(users);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async getUser(req, res) {
    try {
      const { id } = req.params;
      const user = await this.userCRUD.getById(id);

      if (!user) {
        return res.status(404).json({ error: "Usuario no encontrado" });
      }

      res.json(user);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async updateUser(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // Solo admin puede actualizar otros usuarios
      if (req.user.id !== parseInt(id) && req.user.role !== "admin") {
        return res.status(403).json({ error: "No autorizado" });
      }

      const user = await this.userCRUD.update(id, updateData);
      res.json(user);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async deleteUser(req, res) {
    try {
      const { id } = req.params;

      // Solo admin puede eliminar usuarios
      if (req.user.role !== "admin") {
        return res
          .status(403)
          .json({ error: "Permisos de administrador requeridos" });
      }

      await this.userCRUD.delete(id);
      res.json({ message: "Usuario eliminado exitosamente" });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  /**
   * Handlers de perfil
   */
  async getProfile(req, res) {
    try {
      const user = await this.userCRUD.getById(req.user.id);
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async updateProfile(req, res) {
    try {
      const updateData = req.body;
      delete updateData.role; // No permitir cambio de rol desde perfil

      const user = await this.userCRUD.update(req.user.id, updateData);
      res.json(user);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  /**
   * Handlers de administración
   */
  async getStats(req, res) {
    try {
      const stats = {
        database: await this.dbManager.getStats(),
        cache: this.cacheManager.getStats(),
        users: await this.userCRUD.getStats(),
        auth: this.authService.getStats(),
      };

      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async clearCache(req, res) {
    try {
      await this.cacheManager.clear();
      res.json({ message: "Cache limpiado exitosamente" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Manejo de errores global
   */
  errorHandler(error, req, res, next) {
    console.error("Error no manejado:", error);

    if (res.headersSent) {
      return next(error);
    }

    res.status(500).json({
      error: "Error interno del servidor",
      message:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }

  /**
   * Iniciar el servidor
   */
  async start() {
    try {
      await this.initializeServices();

      this.app.listen(this.port, () => {
        console.log(`
🚀 Aplicación Integrada iniciada exitosamente
📍 Puerto: ${this.port}
🌍 Entorno: ${process.env.NODE_ENV || "development"}
📊 Servicios activos:
   - Database Manager (${this.dbManager.config.type})
   - Cache Manager (Redis)
   - User CRUD
   - Email Service
   - Auth Service

📋 Endpoints disponibles:
   GET  /health
   POST /auth/register
   POST /auth/login
   POST /auth/logout
   POST /auth/refresh
   POST /auth/forgot-password
   POST /auth/reset-password
   GET  /users
   GET  /users/:id
   PUT  /users/:id
   DELETE /users/:id
   GET  /profile
   PUT  /profile
   GET  /admin/stats
   POST /admin/cache/clear
        `);
      });
    } catch (error) {
      console.error("Error iniciando la aplicación:", error);
      process.exit(1);
    }
  }

  /**
   * Cerrar la aplicación gracefully
   */
  async shutdown() {
    console.log("Cerrando aplicación...");

    try {
      if (this.dbManager) {
        await this.dbManager.disconnect();
        console.log("✓ Database Manager desconectado");
      }

      if (this.cacheManager) {
        await this.cacheManager.disconnect();
        console.log("✓ Cache Manager desconectado");
      }

      console.log("Aplicación cerrada exitosamente");
      process.exit(0);
    } catch (error) {
      console.error("Error cerrando la aplicación:", error);
      process.exit(1);
    }
  }
}

// Crear e iniciar la aplicación
const app = new IntegratedApp();

// Manejo de señales para cierre graceful
process.on("SIGTERM", () => app.shutdown());
process.on("SIGINT", () => app.shutdown());

// Manejo de errores no capturados
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  app.shutdown();
});

// Iniciar la aplicación
app.start().catch(console.error);

module.exports = app;
