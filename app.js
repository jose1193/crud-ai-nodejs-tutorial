const express = require("express");
const cors = require("cors");
const userRoutes = require("./routes/userRoutes");
const emailRoutes = require("./routes/emailRoutes");
const {
  errorHandler,
  requestLogger,
  validateJSON,
  sanitizeInput,
} = require("./middleware/validation");

// Crear aplicación Express
const app = express();

// Puerto del servidor
const PORT = process.env.PORT || 3000;

// Middleware global
app.use(cors()); // Habilitar CORS
app.use(express.json({ limit: "10mb" })); // Parser JSON con límite
app.use(express.urlencoded({ extended: true })); // Parser URL encoded
app.use(requestLogger); // Logger de peticiones
app.use(validateJSON); // Validar JSON
app.use(sanitizeInput); // Sanitizar entrada

// Ruta de bienvenida
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "API de Gestión de Usuarios",
    version: "1.0.0",
    endpoints: {
      users: "/api/users",
      emails: "/api/emails",
      documentation: "/api/docs",
    },
  });
});

// Ruta de documentación básica
app.get("/api/docs", (req, res) => {
  res.json({
    success: true,
    message: "Documentación de la API",
    endpoints: [
      {
        method: "POST",
        path: "/api/users",
        description: "Crear nuevo usuario",
        body: {
          name: "string (requerido, 2-50 caracteres)",
          email: "string (requerido, formato email válido)",
          password: "string (requerido, 6-100 caracteres)",
        },
      },
      {
        method: "GET",
        path: "/api/users",
        description: "Obtener todos los usuarios",
      },
      {
        method: "GET",
        path: "/api/users/:id",
        description: "Obtener usuario por ID",
        params: {
          id: "UUID del usuario",
        },
      },
      {
        method: "PUT",
        path: "/api/users/:id",
        description: "Actualizar usuario completo",
        params: {
          id: "UUID del usuario",
        },
        body: {
          name: "string (opcional)",
          email: "string (opcional)",
          password: "string (opcional)",
        },
      },
      {
        method: "PATCH",
        path: "/api/users/:id",
        description: "Actualizar usuario parcial",
        params: {
          id: "UUID del usuario",
        },
        body: {
          name: "string (opcional)",
          email: "string (opcional)",
          password: "string (opcional)",
        },
      },
      {
        method: "DELETE",
        path: "/api/users/:id",
        description: "Eliminar usuario",
        params: {
          id: "UUID del usuario",
        },
      },
      {
        method: "GET",
        path: "/api/users/stats",
        description: "Obtener estadísticas de usuarios",
      },
      {
        method: "GET",
        path: "/api/users/search/email/:email",
        description: "Buscar usuario por email",
        params: {
          email: "Email del usuario",
        },
      },
    ],
    examples: {
      createUser: {
        method: "POST",
        url: "/api/users",
        body: {
          name: "Juan Pérez",
          email: "juan@example.com",
          password: "mi_password_123",
        },
      },
      updateUser: {
        method: "PATCH",
        url: "/api/users/123e4567-e89b-12d3-a456-426614174000",
        body: {
          name: "Juan Carlos Pérez",
        },
      },
    },
  });
});

// Rutas de la API
app.use("/api/users", userRoutes);
app.use("/api/emails", emailRoutes);

// Middleware para rutas no encontradas
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: "Ruta no encontrada",
    availableRoutes: [
      "GET /",
      "GET /api/docs",
      "POST /api/users",
      "GET /api/users",
      "GET /api/users/:id",
      "PUT /api/users/:id",
      "PATCH /api/users/:id",
      "DELETE /api/users/:id",
      "GET /api/users/stats",
      "GET /api/users/search/email/:email",
      "GET /api/emails/stats",
      "POST /api/emails/welcome",
      "POST /api/emails/test",
    ],
  });
});

// Middleware de manejo de errores (debe ir al final)
app.use(errorHandler);

// Iniciar servidor
const server = app.listen(PORT, () => {
  console.log(`
🚀 Servidor iniciado exitosamente
📍 Puerto: ${PORT}
🌍 URL: http://localhost:${PORT}
📚 Documentación: http://localhost:${PORT}/api/docs
👥 Usuarios API: http://localhost:${PORT}/api/users
📧 Emails API: http://localhost:${PORT}/api/emails

Rutas disponibles:
- GET    /                           - Página de bienvenida
- GET    /api/docs                   - Documentación de la API
- POST   /api/users                  - Crear usuario
- GET    /api/users                  - Listar usuarios
- GET    /api/users/:id              - Obtener usuario por ID
- PUT    /api/users/:id              - Actualizar usuario completo
- PATCH  /api/users/:id              - Actualizar usuario parcial
- DELETE /api/users/:id              - Eliminar usuario
- GET    /api/users/stats            - Estadísticas de usuarios
- GET    /api/users/search/email/:email - Buscar por email
- GET    /api/emails/stats           - Estadísticas de emails
- POST   /api/emails/welcome         - Enviar email de bienvenida
- POST   /api/emails/test            - Probar configuración de email
    `);
});

// Manejo de cierre graceful
process.on("SIGTERM", () => {
  console.log("SIGTERM recibido. Cerrando servidor...");
  server.close(() => {
    console.log("Servidor cerrado exitosamente");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  console.log("\nSIGINT recibido. Cerrando servidor...");
  server.close(() => {
    console.log("Servidor cerrado exitosamente");
    process.exit(0);
  });
});

module.exports = app;
