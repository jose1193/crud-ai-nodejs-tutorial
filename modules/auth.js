// MÓDULO: Sistema de autenticación y autorización completo

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const rateLimit = require("express-rate-limit");

// ==================== CONFIGURACIÓN ====================

const authConfig = {
  jwt: {
    accessTokenSecret:
      process.env.JWT_ACCESS_SECRET || "your-access-secret-key",
    refreshTokenSecret:
      process.env.JWT_REFRESH_SECRET || "your-refresh-secret-key",
    accessTokenExpiry: process.env.JWT_ACCESS_EXPIRY || "15m",
    refreshTokenExpiry: process.env.JWT_REFRESH_EXPIRY || "7d",
    issuer: process.env.JWT_ISSUER || "your-app-name",
    audience: process.env.JWT_AUDIENCE || "your-app-users",
  },
  bcrypt: {
    saltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12,
  },
  passwordReset: {
    tokenExpiry: 3600000, // 1 hora en millisegundos
    maxAttempts: 3,
  },
  rateLimiting: {
    windowMs: 15 * 60 * 1000, // 15 minutos
    maxAttempts: 5,
    skipSuccessfulRequests: true,
  },
};

// ==================== ALMACENAMIENTO EN MEMORIA ====================

// Blacklist de tokens JWT
const tokenBlacklist = new Set();

// Tokens de recuperación de contraseña
const passwordResetTokens = new Map();

// Intentos de login por usuario
const loginAttempts = new Map();

// Refresh tokens válidos
const validRefreshTokens = new Set();

// ==================== UTILIDADES DE SEGURIDAD ====================

/**
 * Genera un hash seguro de contraseña
 */
async function hashPassword(password) {
  try {
    const salt = await bcrypt.genSalt(authConfig.bcrypt.saltRounds);
    return await bcrypt.hash(password, salt);
  } catch (error) {
    console.error("Error al hashear contraseña:", error);
    throw new Error("Error interno del servidor");
  }
}

/**
 * Verifica una contraseña contra su hash
 */
async function verifyPassword(password, hash) {
  try {
    return await bcrypt.compare(password, hash);
  } catch (error) {
    console.error("Error al verificar contraseña:", error);
    return false;
  }
}

/**
 * Genera tokens JWT (access y refresh)
 */
function generateTokens(user) {
  try {
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role || "user",
      name: user.name,
    };

    const accessToken = jwt.sign(payload, authConfig.jwt.accessTokenSecret, {
      expiresIn: authConfig.jwt.accessTokenExpiry,
      issuer: authConfig.jwt.issuer,
      audience: authConfig.jwt.audience,
      subject: user.id.toString(),
    });

    const refreshToken = jwt.sign(
      { userId: user.id, tokenType: "refresh" },
      authConfig.jwt.refreshTokenSecret,
      {
        expiresIn: authConfig.jwt.refreshTokenExpiry,
        issuer: authConfig.jwt.issuer,
        audience: authConfig.jwt.audience,
        subject: user.id.toString(),
      }
    );

    // Agregar refresh token a la lista de tokens válidos
    validRefreshTokens.add(refreshToken);

    return { accessToken, refreshToken };
  } catch (error) {
    console.error("Error al generar tokens:", error);
    throw new Error("Error interno del servidor");
  }
}

/**
 * Verifica un token JWT
 */
function verifyToken(token, secret) {
  try {
    // Verificar si el token está en la blacklist
    if (tokenBlacklist.has(token)) {
      throw new Error("Token revocado");
    }

    return jwt.verify(token, secret, {
      issuer: authConfig.jwt.issuer,
      audience: authConfig.jwt.audience,
    });
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      throw new Error("Token expirado");
    } else if (error.name === "JsonWebTokenError") {
      throw new Error("Token inválido");
    }
    throw error;
  }
}

/**
 * Genera token de recuperación de contraseña
 */
function generatePasswordResetToken(userId) {
  const token = crypto.randomBytes(32).toString("hex");
  const expiry = Date.now() + authConfig.passwordReset.tokenExpiry;

  passwordResetTokens.set(token, {
    userId,
    expiry,
    attempts: 0,
  });

  // Limpiar tokens expirados
  cleanupExpiredTokens();

  return token;
}

/**
 * Limpia tokens de recuperación expirados
 */
function cleanupExpiredTokens() {
  const now = Date.now();
  for (const [token, data] of passwordResetTokens.entries()) {
    if (data.expiry < now) {
      passwordResetTokens.delete(token);
    }
  }
}

// ==================== FUNCIONES PRINCIPALES ====================

/**
 * Registra un nuevo usuario
 */
async function registerUser(userData, userRepository) {
  try {
    const { name, email, password, role = "user" } = userData;

    // Validar datos requeridos
    if (!name || !email || !password) {
      throw new Error("Nombre, email y contraseña son requeridos");
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error("Formato de email inválido");
    }

    // Validar fortaleza de contraseña
    if (password.length < 8) {
      throw new Error("La contraseña debe tener al menos 8 caracteres");
    }

    // Verificar si el usuario ya existe
    const existingUser = userRepository.findByEmail(email);
    if (existingUser) {
      throw new Error("El email ya está registrado");
    }

    // Hashear contraseña
    const hashedPassword = await hashPassword(password);

    // Crear usuario
    const user = userRepository.create({
      name,
      email,
      password: hashedPassword,
      role,
      isVerified: false,
      createdAt: new Date(),
    });

    console.log(`[AUTH] Usuario registrado: ${email} (ID: ${user.id})`);

    return {
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
      },
    };
  } catch (error) {
    console.error("[AUTH] Error en registro:", error.message);
    throw error;
  }
}

/**
 * Autentica un usuario (login)
 */
async function loginUser(credentials, userRepository) {
  try {
    const { email, password } = credentials;

    if (!email || !password) {
      throw new Error("Email y contraseña son requeridos");
    }

    // Verificar rate limiting
    const attempts = loginAttempts.get(email) || { count: 0, lastAttempt: 0 };
    const now = Date.now();

    if (attempts.count >= authConfig.rateLimiting.maxAttempts) {
      const timeSinceLastAttempt = now - attempts.lastAttempt;
      if (timeSinceLastAttempt < authConfig.rateLimiting.windowMs) {
        throw new Error("Demasiados intentos de login. Intenta más tarde");
      } else {
        // Reset attempts after window
        loginAttempts.delete(email);
      }
    }

    // Buscar usuario
    const user = userRepository.findByEmail(email);
    if (!user) {
      // Incrementar intentos fallidos
      loginAttempts.set(email, {
        count: attempts.count + 1,
        lastAttempt: now,
      });
      throw new Error("Credenciales inválidas");
    }

    // Verificar contraseña
    const isValidPassword = await verifyPassword(password, user.password);
    if (!isValidPassword) {
      // Incrementar intentos fallidos
      loginAttempts.set(email, {
        count: attempts.count + 1,
        lastAttempt: now,
      });
      throw new Error("Credenciales inválidas");
    }

    // Login exitoso - limpiar intentos fallidos
    loginAttempts.delete(email);

    // Generar tokens
    const tokens = generateTokens(user);

    console.log(`[AUTH] Login exitoso: ${email} (ID: ${user.id})`);

    return {
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
      },
      tokens,
    };
  } catch (error) {
    console.error("[AUTH] Error en login:", error.message);
    throw error;
  }
}

/**
 * Refresca un access token usando refresh token
 */
async function refreshAccessToken(refreshToken, userRepository) {
  try {
    if (!refreshToken) {
      throw new Error("Refresh token requerido");
    }

    // Verificar si el refresh token es válido
    if (!validRefreshTokens.has(refreshToken)) {
      throw new Error("Refresh token inválido");
    }

    // Verificar el refresh token
    const decoded = verifyToken(
      refreshToken,
      authConfig.jwt.refreshTokenSecret
    );

    if (decoded.tokenType !== "refresh") {
      throw new Error("Token type inválido");
    }

    // Buscar usuario
    const user = userRepository.findById(decoded.userId);
    if (!user) {
      throw new Error("Usuario no encontrado");
    }

    // Generar nuevo access token
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    };

    const newAccessToken = jwt.sign(payload, authConfig.jwt.accessTokenSecret, {
      expiresIn: authConfig.jwt.accessTokenExpiry,
      issuer: authConfig.jwt.issuer,
      audience: authConfig.jwt.audience,
      subject: user.id.toString(),
    });

    console.log(`[AUTH] Token refrescado para usuario: ${user.email}`);

    return {
      success: true,
      accessToken: newAccessToken,
    };
  } catch (error) {
    console.error("[AUTH] Error al refrescar token:", error.message);
    throw error;
  }
}

/**
 * Cierra sesión (logout) - invalida tokens
 */
function logoutUser(accessToken, refreshToken) {
  try {
    // Agregar tokens a la blacklist
    if (accessToken) {
      tokenBlacklist.add(accessToken);
    }

    if (refreshToken) {
      validRefreshTokens.delete(refreshToken);
      tokenBlacklist.add(refreshToken);
    }

    console.log("[AUTH] Logout exitoso - tokens invalidados");

    return {
      success: true,
      message: "Logout exitoso",
    };
  } catch (error) {
    console.error("[AUTH] Error en logout:", error.message);
    throw error;
  }
}

/**
 * Inicia proceso de recuperación de contraseña
 */
function initiatePasswordReset(email, userRepository) {
  try {
    if (!email) {
      throw new Error("Email requerido");
    }

    // Buscar usuario
    const user = userRepository.findByEmail(email);
    if (!user) {
      // Por seguridad, no revelar si el email existe
      return {
        success: true,
        message: "Si el email existe, recibirás instrucciones de recuperación",
      };
    }

    // Generar token de recuperación
    const resetToken = generatePasswordResetToken(user.id);

    console.log(`[AUTH] Token de recuperación generado para: ${email}`);

    return {
      success: true,
      resetToken, // En producción, esto se enviaría por email
      message: "Token de recuperación generado",
    };
  } catch (error) {
    console.error("[AUTH] Error en recuperación de contraseña:", error.message);
    throw error;
  }
}

/**
 * Restablece contraseña usando token
 */
async function resetPassword(resetToken, newPassword, userRepository) {
  try {
    if (!resetToken || !newPassword) {
      throw new Error("Token y nueva contraseña son requeridos");
    }

    // Verificar token
    const tokenData = passwordResetTokens.get(resetToken);
    if (!tokenData) {
      throw new Error("Token de recuperación inválido");
    }

    // Verificar expiración
    if (Date.now() > tokenData.expiry) {
      passwordResetTokens.delete(resetToken);
      throw new Error("Token de recuperación expirado");
    }

    // Verificar intentos
    if (tokenData.attempts >= authConfig.passwordReset.maxAttempts) {
      passwordResetTokens.delete(resetToken);
      throw new Error("Demasiados intentos con este token");
    }

    // Validar nueva contraseña
    if (newPassword.length < 8) {
      tokenData.attempts++;
      throw new Error("La contraseña debe tener al menos 8 caracteres");
    }

    // Buscar usuario
    const user = userRepository.findById(tokenData.userId);
    if (!user) {
      passwordResetTokens.delete(resetToken);
      throw new Error("Usuario no encontrado");
    }

    // Hashear nueva contraseña
    const hashedPassword = await hashPassword(newPassword);

    // Actualizar contraseña
    userRepository.update(user.id, { password: hashedPassword });

    // Eliminar token usado
    passwordResetTokens.delete(resetToken);

    console.log(`[AUTH] Contraseña restablecida para usuario: ${user.email}`);

    return {
      success: true,
      message: "Contraseña restablecida exitosamente",
    };
  } catch (error) {
    console.error("[AUTH] Error al restablecer contraseña:", error.message);
    throw error;
  }
}

// ==================== MIDDLEWARES ====================

/**
 * Middleware de autenticación - verifica JWT
 */
function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Token de acceso requerido",
      });
    }

    const decoded = verifyToken(token, authConfig.jwt.accessTokenSecret);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({
      success: false,
      message: error.message,
    });
  }
}

/**
 * Middleware de autorización por roles
 */
function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Usuario no autenticado",
        });
      }

      if (!allowedRoles.includes(req.user.role)) {
        console.log(
          `[AUTH] Acceso denegado: ${req.user.email} (${
            req.user.role
          }) intentó acceder a recurso que requiere: ${allowedRoles.join(", ")}`
        );
        return res.status(403).json({
          success: false,
          message: "No tienes permisos para acceder a este recurso",
        });
      }

      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Error interno del servidor",
      });
    }
  };
}

/**
 * Rate limiting middleware para login
 */
const loginRateLimit = rateLimit({
  windowMs: authConfig.rateLimiting.windowMs,
  max: authConfig.rateLimiting.maxAttempts,
  message: {
    success: false,
    message: "Demasiados intentos de login. Intenta más tarde",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: authConfig.rateLimiting.skipSuccessfulRequests,
});

/**
 * Middleware de logging de seguridad
 */
function securityLogger(req, res, next) {
  const originalSend = res.send;

  res.send = function (data) {
    // Log de eventos de seguridad
    if (
      req.path.includes("/auth/") ||
      req.path.includes("/login") ||
      req.path.includes("/register")
    ) {
      const logData = {
        timestamp: new Date().toISOString(),
        ip: req.ip,
        userAgent: req.get("User-Agent"),
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        user: req.user ? req.user.email : "anonymous",
      };

      console.log("[SECURITY]", JSON.stringify(logData));
    }

    originalSend.call(this, data);
  };

  next();
}

// ==================== EXPORTACIONES ====================

module.exports = {
  // Configuración
  authConfig,

  // Funciones principales
  registerUser,
  loginUser,
  refreshAccessToken,
  logoutUser,
  initiatePasswordReset,
  resetPassword,

  // Utilidades
  hashPassword,
  verifyPassword,
  generateTokens,
  verifyToken,

  // Middlewares
  authenticateToken,
  authorizeRoles,
  loginRateLimit,
  securityLogger,

  // Estado interno (para testing/debugging)
  getTokenBlacklist: () => Array.from(tokenBlacklist),
  getValidRefreshTokens: () => Array.from(validRefreshTokens),
  getPasswordResetTokens: () => Object.fromEntries(passwordResetTokens),
  getLoginAttempts: () => Object.fromEntries(loginAttempts),

  // Limpieza
  clearTokenBlacklist: () => tokenBlacklist.clear(),
  clearValidRefreshTokens: () => validRefreshTokens.clear(),
  clearPasswordResetTokens: () => passwordResetTokens.clear(),
  clearLoginAttempts: () => loginAttempts.clear(),
};
