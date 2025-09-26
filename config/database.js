/**
 * Configuración de base de datos
 * Configuración por entorno para el módulo de base de datos
 */

require("dotenv").config();

const config = {
  // Entorno de desarrollo
  development: {
    type: process.env.DB_TYPE || "mongodb",
    host: process.env.DB_HOST || "localhost",
    port:
      parseInt(process.env.DB_PORT) ||
      (process.env.DB_TYPE === "postgresql"
        ? 5432
        : process.env.DB_TYPE === "mysql"
        ? 3306
        : 27017),
    database: process.env.DB_NAME || "mi_app_dev",
    username: process.env.DB_USER || "",
    password: process.env.DB_PASS || "",

    // Configuración de conexión
    maxRetries: 5,
    retryDelay: 2000,
    connectionTimeout: 10000,
    queryTimeout: 30000,

    // Cache con Redis
    cache: {
      enabled: process.env.CACHE_ENABLED === "true",
      redis: {
        host: process.env.REDIS_HOST || "localhost",
        port: parseInt(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD || "",
        db: parseInt(process.env.REDIS_DB) || 0,
      },
      ttl: 300, // 5 minutos
      keyPrefix: "dev:cache:",
    },

    // Backups
    backup: {
      enabled: process.env.BACKUP_ENABLED === "true",
      schedule: process.env.BACKUP_SCHEDULE || "0 2 * * *", // 2 AM diario
      path: process.env.BACKUP_PATH || "./backups/development",
      retention: parseInt(process.env.BACKUP_RETENTION) || 7, // 7 días en dev
      compression: true,
      encryption: false,
    },

    // Monitoreo
    monitoring: {
      enabled: process.env.MONITORING_ENABLED === "true",
      slowQueryThreshold: parseInt(process.env.SLOW_QUERY_THRESHOLD) || 1000,
      logPath: process.env.MONITOR_LOG_PATH || "./logs/db-performance-dev.log",
      sampleRate: 1.0, // 100% en desarrollo
    },

    // Migraciones
    migrationsPath: "./migrations",
    autoMigrate: true,

    // Seeds
    seedsPath: "./seeds",
    seedEnvironment: "development",
  },

  // Entorno de testing
  testing: {
    type: process.env.TEST_DB_TYPE || process.env.DB_TYPE || "mongodb",
    host: process.env.TEST_DB_HOST || process.env.DB_HOST || "localhost",
    port:
      parseInt(process.env.TEST_DB_PORT || process.env.DB_PORT) ||
      (process.env.DB_TYPE === "postgresql"
        ? 5432
        : process.env.DB_TYPE === "mysql"
        ? 3306
        : 27017),
    database: process.env.TEST_DB_NAME || "mi_app_test",
    username: process.env.TEST_DB_USER || process.env.DB_USER || "",
    password: process.env.TEST_DB_PASS || process.env.DB_PASS || "",

    // Conexión más rápida para tests
    maxRetries: 3,
    retryDelay: 1000,
    connectionTimeout: 5000,
    queryTimeout: 10000,

    // Cache deshabilitado en tests
    cache: {
      enabled: false,
    },

    // Backups deshabilitados en tests
    backup: {
      enabled: false,
    },

    // Monitoreo simplificado
    monitoring: {
      enabled: false,
    },

    // Migraciones automáticas
    migrationsPath: "./migrations",
    autoMigrate: true,

    // Seeds de testing
    seedsPath: "./seeds",
    seedEnvironment: "testing",
  },

  // Entorno de producción
  production: {
    type: process.env.DB_TYPE || "postgresql",
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT),
    database: process.env.DB_NAME,
    username: process.env.DB_USER,
    password: process.env.DB_PASS,

    // Configuración robusta para producción
    maxRetries: 10,
    retryDelay: 5000,
    connectionTimeout: 30000,
    queryTimeout: 60000,

    // SSL para producción
    ssl: process.env.DB_SSL === "true",

    // Pool de conexiones optimizado
    maxPoolSize: parseInt(process.env.DB_POOL_SIZE) || 20,

    // Cache habilitado
    cache: {
      enabled: process.env.CACHE_ENABLED === "true",
      redis: {
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD,
        db: parseInt(process.env.REDIS_DB) || 0,
      },
      ttl: parseInt(process.env.CACHE_TTL) || 600, // 10 minutos
      keyPrefix: "prod:cache:",
      compression: true,
    },

    // Backups programados
    backup: {
      enabled: process.env.BACKUP_ENABLED === "true",
      schedule: process.env.BACKUP_SCHEDULE || "0 2 * * *",
      path: process.env.BACKUP_PATH || "./backups/production",
      retention: parseInt(process.env.BACKUP_RETENTION) || 30,
      compression: true,
      encryption: process.env.BACKUP_ENCRYPTION === "true",
      encryptionKey: process.env.BACKUP_ENCRYPTION_KEY,
    },

    // Monitoreo completo
    monitoring: {
      enabled: process.env.MONITORING_ENABLED === "true",
      slowQueryThreshold: parseInt(process.env.SLOW_QUERY_THRESHOLD) || 2000,
      logPath: process.env.MONITOR_LOG_PATH || "./logs/db-performance.log",
      sampleRate: parseFloat(process.env.MONITOR_SAMPLE_RATE) || 0.1, // 10% en producción
    },

    // Migraciones manuales en producción
    migrationsPath: "./migrations",
    autoMigrate: false,

    // Seeds deshabilitados en producción
    seedsPath: "./seeds",
    seedEnvironment: "production",
  },
};

// Obtener configuración según el entorno
const environment = process.env.NODE_ENV || "development";
const dbConfig = config[environment];

if (!dbConfig) {
  throw new Error(
    `Configuración de base de datos no encontrada para el entorno: ${environment}`
  );
}

// Validar configuración requerida
if (!dbConfig.host && environment === "production") {
  throw new Error("DB_HOST es requerido en producción");
}

if (!dbConfig.database) {
  throw new Error("Nombre de base de datos es requerido");
}

// Exportar configuración
module.exports = {
  ...dbConfig,
  environment,
};

// Exportar todas las configuraciones para testing
module.exports.configs = config;
