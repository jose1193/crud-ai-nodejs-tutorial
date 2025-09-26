/**
 * MÓDULO: Utilidades avanzadas para base de datos
 *
 * Funcionalidades:
 * - Conexión automática con reconexión
 * - Query builder para consultas complejas
 * - Paginación automática con metadata
 * - Backup automático programado
 * - Migraciones de esquema
 * - Seed data para testing
 * - Performance monitoring de queries
 * - Cache layer con Redis
 *
 * Soporte para: MongoDB, PostgreSQL, MySQL
 * Estructura modular y configurable
 *
 * @author ARGENIS
 * @version 1.0.0
 */

const EventEmitter = require("events");
const fs = require("fs").promises;
const path = require("path");
const { performance } = require("perf_hooks");

// Importar adaptadores de base de datos
const MongoDBAdapter = require("./database/adapters/MongoDBAdapter");
const PostgreSQLAdapter = require("./database/adapters/PostgreSQLAdapter");
const MySQLAdapter = require("./database/adapters/MySQLAdapter");

// Importar utilidades
const QueryBuilder = require("./database/QueryBuilder");
const MigrationManager = require("./database/MigrationManager");
const SeedManager = require("./database/SeedManager");
const BackupManager = require("./database/BackupManager");
const PerformanceMonitor = require("./database/PerformanceMonitor");
const CacheManager = require("./database/CacheManager");

/**
 * Clase principal del módulo de base de datos
 */
class DatabaseManager extends EventEmitter {
  constructor(config = {}) {
    super();

    this.config = {
      // Configuración por defecto
      type: process.env.DB_TYPE || "mongodb",
      host: process.env.DB_HOST || "localhost",
      port: process.env.DB_PORT || null,
      database: process.env.DB_NAME || "defaultdb",
      username: process.env.DB_USER || "",
      password: process.env.DB_PASS || "",

      // Opciones de conexión
      maxRetries: 5,
      retryDelay: 2000,
      connectionTimeout: 10000,
      queryTimeout: 30000,

      // Configuración de cache
      cache: {
        enabled: process.env.CACHE_ENABLED === "true",
        redis: {
          host: process.env.REDIS_HOST || "localhost",
          port: process.env.REDIS_PORT || 6379,
          password: process.env.REDIS_PASSWORD || "",
          db: process.env.REDIS_DB || 0,
        },
        ttl: 300, // 5 minutos por defecto
      },

      // Configuración de backup
      backup: {
        enabled: process.env.BACKUP_ENABLED === "true",
        schedule: process.env.BACKUP_SCHEDULE || "0 2 * * *", // 2 AM diario
        path: process.env.BACKUP_PATH || "./backups",
        retention: parseInt(process.env.BACKUP_RETENTION) || 30, // días
      },

      // Configuración de monitoreo
      monitoring: {
        enabled: process.env.MONITORING_ENABLED === "true",
        slowQueryThreshold: parseInt(process.env.SLOW_QUERY_THRESHOLD) || 1000, // ms
        logPath: process.env.MONITOR_LOG_PATH || "./logs/db-performance.log",
      },

      // Sobrescribir con configuración personalizada
      ...config,
    };

    this.adapter = null;
    this.queryBuilder = null;
    this.migrationManager = null;
    this.seedManager = null;
    this.backupManager = null;
    this.performanceMonitor = null;
    this.cacheManager = null;

    this.isConnected = false;
    this.connectionRetries = 0;

    this._initializeComponents();
  }

  /**
   * Inicializar componentes del sistema
   */
  _initializeComponents() {
    // Inicializar adaptador de base de datos
    switch (this.config.type.toLowerCase()) {
      case "mongodb":
        this.adapter = new MongoDBAdapter(this.config);
        break;
      case "postgresql":
      case "postgres":
        this.adapter = new PostgreSQLAdapter(this.config);
        break;
      case "mysql":
        this.adapter = new MySQLAdapter(this.config);
        break;
      default:
        throw new Error(
          `Tipo de base de datos no soportado: ${this.config.type}`
        );
    }

    // Inicializar componentes
    this.queryBuilder = new QueryBuilder(this.config.type);
    this.migrationManager = new MigrationManager(this.adapter, this.config);
    this.seedManager = new SeedManager(this.adapter, this.config);
    this.backupManager = new BackupManager(this.adapter, this.config);
    this.performanceMonitor = new PerformanceMonitor(this.config.monitoring);

    if (this.config.cache.enabled) {
      this.cacheManager = new CacheManager(this.config.cache);
    }

    this._setupEventHandlers();
  }

  /**
   * Configurar manejadores de eventos
   */
  _setupEventHandlers() {
    // Eventos del adaptador
    this.adapter.on("connected", () => {
      this.isConnected = true;
      this.connectionRetries = 0;
      this.emit("connected");
      console.log(`✅ Conectado a ${this.config.type} en ${this.config.host}`);
    });

    this.adapter.on("disconnected", () => {
      this.isConnected = false;
      this.emit("disconnected");
      console.log(`❌ Desconectado de ${this.config.type}`);
      this._handleReconnection();
    });

    this.adapter.on("error", (error) => {
      this.emit("error", error);
      console.error("❌ Error de base de datos:", error.message);
    });

    // Eventos de performance
    if (this.performanceMonitor) {
      this.performanceMonitor.on("slowQuery", (data) => {
        this.emit("slowQuery", data);
        console.warn(
          `🐌 Query lenta detectada: ${data.duration}ms - ${data.query}`
        );
      });
    }
  }

  /**
   * Conectar a la base de datos
   */
  async connect() {
    try {
      console.log(`🔄 Conectando a ${this.config.type}...`);
      await this.adapter.connect();

      // Inicializar cache si está habilitado
      if (this.cacheManager) {
        await this.cacheManager.connect();
      }

      // Ejecutar migraciones pendientes si está configurado
      if (this.config.autoMigrate) {
        await this.migrationManager.runPending();
      }

      return true;
    } catch (error) {
      console.error("❌ Error al conectar:", error.message);
      throw error;
    }
  }

  /**
   * Desconectar de la base de datos
   */
  async disconnect() {
    try {
      if (this.cacheManager) {
        await this.cacheManager.disconnect();
      }

      await this.adapter.disconnect();
      console.log("✅ Desconectado correctamente");
    } catch (error) {
      console.error("❌ Error al desconectar:", error.message);
      throw error;
    }
  }

  /**
   * Manejar reconexión automática
   */
  async _handleReconnection() {
    if (this.connectionRetries >= this.config.maxRetries) {
      console.error(
        `❌ Máximo número de reintentos alcanzado (${this.config.maxRetries})`
      );
      this.emit("maxRetriesReached");
      return;
    }

    this.connectionRetries++;
    console.log(
      `🔄 Reintento de conexión ${this.connectionRetries}/${this.config.maxRetries}`
    );

    setTimeout(async () => {
      try {
        await this.connect();
      } catch (error) {
        console.error(
          `❌ Fallo en reintento ${this.connectionRetries}:`,
          error.message
        );
      }
    }, this.config.retryDelay * this.connectionRetries);
  }

  /**
   * Ejecutar query con monitoreo de performance
   */
  async query(sql, params = [], options = {}) {
    const startTime = performance.now();
    let result;

    try {
      // Verificar cache si está habilitado
      if (this.cacheManager && options.cache !== false) {
        const cacheKey = this._generateCacheKey(sql, params);
        const cachedResult = await this.cacheManager.get(cacheKey);

        if (cachedResult) {
          this.emit("cacheHit", { sql, params });
          return cachedResult;
        }

        result = await this.adapter.query(sql, params, options);

        // Guardar en cache si es una consulta SELECT
        if (sql.trim().toLowerCase().startsWith("select")) {
          await this.cacheManager.set(cacheKey, result, options.cacheTTL);
        }
      } else {
        result = await this.adapter.query(sql, params, options);
      }

      const duration = performance.now() - startTime;

      // Monitorear performance
      if (this.performanceMonitor) {
        this.performanceMonitor.recordQuery({
          sql,
          params,
          duration,
          success: true,
        });
      }

      this.emit("queryExecuted", { sql, params, duration, success: true });

      return result;
    } catch (error) {
      const duration = performance.now() - startTime;

      if (this.performanceMonitor) {
        this.performanceMonitor.recordQuery({
          sql,
          params,
          duration,
          success: false,
          error: error.message,
        });
      }

      this.emit("queryExecuted", {
        sql,
        params,
        duration,
        success: false,
        error,
      });
      throw error;
    }
  }

  /**
   * Generar clave de cache
   */
  _generateCacheKey(sql, params) {
    const crypto = require("crypto");
    const key = `${sql}:${JSON.stringify(params)}`;
    return crypto.createHash("md5").update(key).digest("hex");
  }

  /**
   * Obtener query builder
   */
  getQueryBuilder() {
    return this.queryBuilder;
  }

  /**
   * Paginación automática
   */
  async paginate(query, options = {}) {
    const {
      page = 1,
      limit = 10,
      sortBy = "id",
      sortOrder = "asc",
      filters = {},
      searchFields = [],
      searchTerm = "",
    } = options;

    const offset = (page - 1) * limit;

    // Construir query con filtros y búsqueda
    let paginatedQuery = this.queryBuilder.from(
      query.table || query.collection
    );

    // Aplicar filtros
    Object.entries(filters).forEach(([field, value]) => {
      paginatedQuery = paginatedQuery.where(field, value);
    });

    // Aplicar búsqueda
    if (searchTerm && searchFields.length > 0) {
      paginatedQuery = paginatedQuery.search(searchFields, searchTerm);
    }

    // Obtener total de registros
    const countQuery = paginatedQuery.clone().count();
    const totalRecords = await this.query(countQuery.toSQL());
    const total = totalRecords[0]?.count || totalRecords.length || 0;

    // Aplicar paginación y ordenamiento
    const dataQuery = paginatedQuery
      .orderBy(sortBy, sortOrder)
      .limit(limit)
      .offset(offset);

    const data = await this.query(dataQuery.toSQL());

    // Metadata de paginación
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return {
      data,
      pagination: {
        currentPage: page,
        totalPages,
        totalRecords: total,
        recordsPerPage: limit,
        hasNextPage,
        hasPrevPage,
        nextPage: hasNextPage ? page + 1 : null,
        prevPage: hasPrevPage ? page - 1 : null,
      },
      filters: filters,
      search: {
        term: searchTerm,
        fields: searchFields,
      },
      sort: {
        field: sortBy,
        order: sortOrder,
      },
    };
  }

  /**
   * Ejecutar transacción
   */
  async transaction(callback) {
    return await this.adapter.transaction(callback);
  }

  /**
   * Obtener estadísticas de la base de datos
   */
  async getStats() {
    const stats = await this.adapter.getStats();

    if (this.performanceMonitor) {
      stats.performance = this.performanceMonitor.getStats();
    }

    if (this.cacheManager) {
      stats.cache = await this.cacheManager.getStats();
    }

    return stats;
  }

  /**
   * Validar salud de la conexión
   */
  async healthCheck() {
    try {
      const startTime = performance.now();
      await this.adapter.ping();
      const responseTime = performance.now() - startTime;

      return {
        status: "healthy",
        database: this.config.type,
        host: this.config.host,
        responseTime: `${responseTime.toFixed(2)}ms`,
        connected: this.isConnected,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: "unhealthy",
        database: this.config.type,
        host: this.config.host,
        error: error.message,
        connected: false,
        timestamp: new Date().toISOString(),
      };
    }
  }

  // Getters para acceder a los managers
  get migrations() {
    return this.migrationManager;
  }
  get seeds() {
    return this.seedManager;
  }
  get backups() {
    return this.backupManager;
  }
  get monitor() {
    return this.performanceMonitor;
  }
  get cache() {
    return this.cacheManager;
  }
}

module.exports = DatabaseManager;
