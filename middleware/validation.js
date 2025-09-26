const { User } = require("../models/User");

/**
 * Middleware de validación para usuarios
 */

/**
 * Validar datos para crear usuario
 */
const validateUser = (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    // Verificar que se proporcionen todos los campos requeridos
    if (!name && !email && !password) {
      return res.status(400).json({
        success: false,
        message: "Faltan datos requeridos",
        error: "Se requieren name, email y password",
      });
    }

    // Usar la validación del modelo
    const validation = User.validate({ name, email, password });

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: "Datos de usuario inválidos",
        errors: validation.errors,
      });
    }

    // Sanitizar datos
    req.body.name = name.trim();
    req.body.email = email.toLowerCase().trim();

    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error en validación",
      error: error.message,
    });
  }
};

/**
 * Validar datos para actualizar usuario
 */
const validateUserUpdate = (req, res, next) => {
  try {
    const updateData = req.body;

    // Verificar que se proporcione al menos un campo para actualizar
    const allowedFields = ["name", "email", "password"];
    const providedFields = Object.keys(updateData).filter((key) =>
      allowedFields.includes(key)
    );

    if (providedFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No se proporcionaron campos válidos para actualizar",
        error: `Campos permitidos: ${allowedFields.join(", ")}`,
      });
    }

    // Usar la validación del modelo para actualización
    const validation = User.validateUpdate(updateData);

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: "Datos de actualización inválidos",
        errors: validation.errors,
      });
    }

    // Sanitizar datos si están presentes
    if (updateData.name) {
      req.body.name = updateData.name.trim();
    }
    if (updateData.email) {
      req.body.email = updateData.email.toLowerCase().trim();
    }

    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error en validación de actualización",
      error: error.message,
    });
  }
};

/**
 * Validar ID de usuario (UUID)
 */
const validateId = (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "ID de usuario requerido",
      });
    }

    // Validar formato UUID básico
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Formato de ID inválido",
        error: "El ID debe ser un UUID válido",
      });
    }

    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error en validación de ID",
      error: error.message,
    });
  }
};

/**
 * Validar email en parámetros de ruta
 */
const validateEmail = (req, res, next) => {
  try {
    const { email } = req.params;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email requerido",
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Formato de email inválido",
      });
    }

    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error en validación de email",
      error: error.message,
    });
  }
};

/**
 * Middleware para validar JSON
 */
const validateJSON = (req, res, next) => {
  if (req.method === "POST" || req.method === "PUT" || req.method === "PATCH") {
    if (!req.is("application/json")) {
      return res.status(400).json({
        success: false,
        message: "Content-Type debe ser application/json",
      });
    }
  }
  next();
};

/**
 * Middleware para sanitizar entrada general
 */
const sanitizeInput = (req, res, next) => {
  try {
    // Sanitizar strings en el body
    if (req.body && typeof req.body === "object") {
      Object.keys(req.body).forEach((key) => {
        if (typeof req.body[key] === "string") {
          // Remover espacios extra y caracteres peligrosos básicos
          req.body[key] = req.body[key].trim().replace(/[<>]/g, "");
        }
      });
    }

    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error en sanitización",
      error: error.message,
    });
  }
};

/**
 * Middleware de manejo de errores global
 */
const errorHandler = (err, req, res, next) => {
  console.error("Error:", err);

  // Error de JSON malformado
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({
      success: false,
      message: "JSON malformado",
      error: "El cuerpo de la petición contiene JSON inválido",
    });
  }

  // Error genérico
  res.status(500).json({
    success: false,
    message: "Error interno del servidor",
    error:
      process.env.NODE_ENV === "development" ? err.message : "Error interno",
  });
};

/**
 * Middleware de logging de peticiones
 */
const requestLogger = (req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path} - IP: ${req.ip}`);
  next();
};

module.exports = {
  validateUser,
  validateUserUpdate,
  validateId,
  validateEmail,
  validateJSON,
  sanitizeInput,
  errorHandler,
  requestLogger,
};
