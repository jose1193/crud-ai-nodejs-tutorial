/**
 * Adaptador base para bases de datos
 * Define la interfaz común para todos los adaptadores
 */

const EventEmitter = require("events");

class BaseAdapter extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;
    this.connection = null;
    this.isConnected = false;
  }

  /**
   * Conectar a la base de datos
   * Debe ser implementado por cada adaptador
   */
  async connect() {
    throw new Error(
      "El método connect() debe ser implementado por el adaptador específico"
    );
  }

  /**
   * Desconectar de la base de datos
   * Debe ser implementado por cada adaptador
   */
  async disconnect() {
    throw new Error(
      "El método disconnect() debe ser implementado por el adaptador específico"
    );
  }

  /**
   * Ejecutar query
   * Debe ser implementado por cada adaptador
   */
  async query(sql, params = [], options = {}) {
    throw new Error(
      "El método query() debe ser implementado por el adaptador específico"
    );
  }

  /**
   * Verificar conexión (ping)
   * Debe ser implementado por cada adaptador
   */
  async ping() {
    throw new Error(
      "El método ping() debe ser implementado por el adaptador específico"
    );
  }

  /**
   * Obtener estadísticas de la base de datos
   * Debe ser implementado por cada adaptador
   */
  async getStats() {
    throw new Error(
      "El método getStats() debe ser implementado por el adaptador específico"
    );
  }

  /**
   * Ejecutar transacción
   * Debe ser implementado por cada adaptador
   */
  async transaction(callback) {
    throw new Error(
      "El método transaction() debe ser implementado por el adaptador específico"
    );
  }

  /**
   * Crear backup
   * Debe ser implementado por cada adaptador
   */
  async createBackup(options = {}) {
    throw new Error(
      "El método createBackup() debe ser implementado por el adaptador específico"
    );
  }

  /**
   * Restaurar backup
   * Debe ser implementado por cada adaptador
   */
  async restoreBackup(backupPath, options = {}) {
    throw new Error(
      "El método restoreBackup() debe ser implementado por el adaptador específico"
    );
  }

  /**
   * Obtener información del esquema
   * Debe ser implementado por cada adaptador
   */
  async getSchema() {
    throw new Error(
      "El método getSchema() debe ser implementado por el adaptador específico"
    );
  }

  /**
   * Ejecutar migración
   * Debe ser implementado por cada adaptador
   */
  async executeMigration(migration) {
    throw new Error(
      "El método executeMigration() debe ser implementado por el adaptador específico"
    );
  }

  /**
   * Validar si la conexión está activa
   */
  isConnectionActive() {
    return this.isConnected && this.connection !== null;
  }

  /**
   * Normalizar error para consistencia entre adaptadores
   */
  _normalizeError(error, context = "") {
    return {
      message: error.message,
      code: error.code || "UNKNOWN_ERROR",
      context,
      originalError: error,
      timestamp: new Date().toISOString(),
      adapter: this.constructor.name,
    };
  }

  /**
   * Log de eventos internos
   */
  _log(level, message, data = {}) {
    const logData = {
      level,
      message,
      adapter: this.constructor.name,
      timestamp: new Date().toISOString(),
      ...data,
    };

    this.emit("log", logData);

    // Log básico a consola si no hay listeners
    if (this.listenerCount("log") === 0) {
      console.log(
        `[${level.toUpperCase()}] ${this.constructor.name}: ${message}`,
        data
      );
    }
  }
}

module.exports = BaseAdapter;
