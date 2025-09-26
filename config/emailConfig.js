require("dotenv").config();

/**
 * Configuración de email con soporte para múltiples proveedores
 */

const emailConfig = {
  // Proveedor activo (gmail, sendgrid, smtp)
  provider: process.env.EMAIL_PROVIDER || "gmail",

  // Configuración de Gmail
  gmail: {
    user: process.env.GMAIL_USER,
    password: process.env.GMAIL_APP_PASSWORD, // App password, no la contraseña normal
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // true para 465, false para otros puertos
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  },

  // Configuración de SendGrid
  sendgrid: {
    apiKey: process.env.SENDGRID_API_KEY,
    from: process.env.SENDGRID_FROM_EMAIL || process.env.EMAIL_FROM,
    host: "smtp.sendgrid.net",
    port: 587,
    secure: false,
    auth: {
      user: "apikey",
      pass: process.env.SENDGRID_API_KEY,
    },
  },

  // Configuración SMTP genérica
  smtp: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  },

  // Configuración general
  from: process.env.EMAIL_FROM || "noreply@tuapp.com",
  fromName: process.env.EMAIL_FROM_NAME || "Tu Aplicación",

  // Configuración de reintentos
  retry: {
    attempts: parseInt(process.env.EMAIL_RETRY_ATTEMPTS) || 3,
    delay: parseInt(process.env.EMAIL_RETRY_DELAY) || 5000, // 5 segundos
    backoff: process.env.EMAIL_RETRY_BACKOFF || "exponential", // linear, exponential
  },

  // Configuración de colas
  queue: {
    enabled: process.env.EMAIL_QUEUE_ENABLED !== "false",
    maxConcurrent: parseInt(process.env.EMAIL_MAX_CONCURRENT) || 5,
    delay: parseInt(process.env.EMAIL_QUEUE_DELAY) || 1000, // 1 segundo entre emails
    batchSize: parseInt(process.env.EMAIL_BATCH_SIZE) || 10,
  },

  // Configuración de logging
  logging: {
    enabled: process.env.EMAIL_LOGGING_ENABLED !== "false",
    level: process.env.EMAIL_LOG_LEVEL || "info", // error, warn, info, debug
    logFile: process.env.EMAIL_LOG_FILE || "logs/email.log",
  },

  // Configuración de desarrollo
  development: {
    enabled: process.env.NODE_ENV === "development",
    logToConsole: true,
    saveToFile: process.env.EMAIL_DEV_SAVE_FILE === "true",
    filePath: "logs/dev-emails.json",
  },

  // Rate limiting
  rateLimit: {
    enabled: process.env.EMAIL_RATE_LIMIT_ENABLED === "true",
    maxPerHour: parseInt(process.env.EMAIL_MAX_PER_HOUR) || 100,
    maxPerDay: parseInt(process.env.EMAIL_MAX_PER_DAY) || 1000,
  },

  // Templates
  templates: {
    baseUrl: process.env.EMAIL_TEMPLATE_BASE_URL || "http://localhost:3000",
    assetsUrl: process.env.EMAIL_ASSETS_URL || "http://localhost:3000/assets",
    defaultLanguage: process.env.EMAIL_DEFAULT_LANGUAGE || "es",
  },
};

/**
 * Validar configuración
 */
const validateConfig = () => {
  const errors = [];

  // Validar proveedor
  if (!["gmail", "sendgrid", "smtp"].includes(emailConfig.provider)) {
    errors.push("EMAIL_PROVIDER debe ser: gmail, sendgrid o smtp");
  }

  // Validar configuración según proveedor
  switch (emailConfig.provider) {
    case "gmail":
      if (!emailConfig.gmail.user) errors.push("GMAIL_USER es requerido");
      if (!emailConfig.gmail.password)
        errors.push("GMAIL_APP_PASSWORD es requerido");
      break;

    case "sendgrid":
      if (!emailConfig.sendgrid.apiKey)
        errors.push("SENDGRID_API_KEY es requerido");
      break;

    case "smtp":
      if (!emailConfig.smtp.host) errors.push("SMTP_HOST es requerido");
      if (!emailConfig.smtp.auth.user) errors.push("SMTP_USER es requerido");
      if (!emailConfig.smtp.auth.pass)
        errors.push("SMTP_PASSWORD es requerido");
      break;
  }

  if (!emailConfig.from) {
    errors.push("EMAIL_FROM es requerido");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Obtener configuración del proveedor activo
 */
const getProviderConfig = () => {
  const provider = emailConfig.provider;
  const config = emailConfig[provider];

  if (!config) {
    throw new Error(
      `Configuración no encontrada para el proveedor: ${provider}`
    );
  }

  return {
    ...config,
    from: emailConfig.from,
    fromName: emailConfig.fromName,
  };
};

/**
 * Configuración de ejemplo para .env
 */
const envExample = `
# Configuración de Email
EMAIL_PROVIDER=gmail
EMAIL_FROM=tu-email@gmail.com
EMAIL_FROM_NAME=Tu Aplicación

# Gmail (requiere App Password)
GMAIL_USER=tu-email@gmail.com
GMAIL_APP_PASSWORD=tu-app-password

# SendGrid
SENDGRID_API_KEY=tu-sendgrid-api-key
SENDGRID_FROM_EMAIL=tu-email@tudominio.com

# SMTP Genérico
SMTP_HOST=smtp.tuproveedor.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=tu-usuario
SMTP_PASSWORD=tu-password

# Configuración de reintentos
EMAIL_RETRY_ATTEMPTS=3
EMAIL_RETRY_DELAY=5000
EMAIL_RETRY_BACKOFF=exponential

# Configuración de colas
EMAIL_QUEUE_ENABLED=true
EMAIL_MAX_CONCURRENT=5
EMAIL_QUEUE_DELAY=1000
EMAIL_BATCH_SIZE=10

# Configuración de logging
EMAIL_LOGGING_ENABLED=true
EMAIL_LOG_LEVEL=info
EMAIL_LOG_FILE=logs/email.log

# Rate limiting
EMAIL_RATE_LIMIT_ENABLED=false
EMAIL_MAX_PER_HOUR=100
EMAIL_MAX_PER_DAY=1000

# Templates
EMAIL_TEMPLATE_BASE_URL=http://localhost:3000
EMAIL_ASSETS_URL=http://localhost:3000/assets
EMAIL_DEFAULT_LANGUAGE=es
`;

module.exports = {
  emailConfig,
  validateConfig,
  getProviderConfig,
  envExample,
};
