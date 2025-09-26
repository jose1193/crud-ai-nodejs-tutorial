/**
 * Cache Manager con Redis
 * Maneja el cache de queries y resultados
 */

const EventEmitter = require("events");
const Redis = require("redis");
const crypto = require("crypto");

class CacheManager extends EventEmitter {
  constructor(config = {}) {
    super();

    this.config = {
      enabled: config.enabled !== false,
      redis: {
        host: config.redis?.host || "localhost",
        port: config.redis?.port || 6379,
        password: config.redis?.password || "",
        db: config.redis?.db || 0,
        retryDelayOnFailover: 100,
        enableReadyCheck: true,
        maxRetriesPerRequest: 3,
        ...config.redis,
      },
      ttl: config.ttl || 300, // 5 minutos por defecto
      keyPrefix: config.keyPrefix || "db:cache:",
      compression: config.compression !== false,
      serialization: config.serialization || "json", // json, msgpack
      maxKeySize: config.maxKeySize || 250,
      maxValueSize: config.maxValueSize || 1024 * 1024, // 1MB
      ...config,
    };

    this.client = null;
    this.isConnected = false;
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0,
      totalRequests: 0,
    };
  }

  /**
   * Conectar a Redis
   */
  async connect() {
    if (!this.config.enabled) {
      console.log("📦 Cache deshabilitado");
      return;
    }

    try {
      console.log("🔄 Conectando a Redis...");

      this.client = Redis.createClient({
        socket: {
          host: this.config.redis.host,
          port: this.config.redis.port,
          connectTimeout: 10000,
          commandTimeout: 5000,
        },
        password: this.config.redis.password || undefined,
        database: this.config.redis.db,
        retryDelayOnFailover: this.config.redis.retryDelayOnFailover,
        enableReadyCheck: this.config.redis.enableReadyCheck,
        maxRetriesPerRequest: this.config.redis.maxRetriesPerRequest,
      });

      this._setupEventHandlers();

      await this.client.connect();

      this.isConnected = true;
      console.log("✅ Conectado a Redis");

      // Verificar conexión
      await this.client.ping();

      this.emit("connected");
    } catch (error) {
      this.isConnected = false;
      console.error("❌ Error conectando a Redis:", error.message);
      this.emit("error", error);

      if (this.config.fallbackToMemory) {
        console.log("📦 Fallback a cache en memoria");
        this._initMemoryCache();
      } else {
        throw error;
      }
    }
  }

  /**
   * Desconectar de Redis
   */
  async disconnect() {
    try {
      if (this.client && this.isConnected) {
        await this.client.quit();
        this.isConnected = false;
        console.log("✅ Desconectado de Redis");
        this.emit("disconnected");
      }
    } catch (error) {
      console.error("❌ Error desconectando de Redis:", error.message);
      this.emit("error", error);
    }
  }

  /**
   * Obtener valor del cache
   */
  async get(key) {
    if (!this.config.enabled || !this.isConnected) {
      return null;
    }

    try {
      this.stats.totalRequests++;

      const cacheKey = this._buildKey(key);
      const value = await this.client.get(cacheKey);

      if (value === null) {
        this.stats.misses++;
        this.emit("miss", { key: cacheKey });
        return null;
      }

      this.stats.hits++;
      this.emit("hit", { key: cacheKey });

      return this._deserialize(value);
    } catch (error) {
      this.stats.errors++;
      this.emit("error", error);
      console.error("❌ Error obteniendo del cache:", error.message);
      return null;
    }
  }

  /**
   * Establecer valor en el cache
   */
  async set(key, value, ttl = null) {
    if (!this.config.enabled || !this.isConnected) {
      return false;
    }

    try {
      const cacheKey = this._buildKey(key);
      const serializedValue = this._serialize(value);

      // Verificar tamaño máximo
      if (serializedValue.length > this.config.maxValueSize) {
        console.warn(
          `⚠️ Valor muy grande para cache: ${serializedValue.length} bytes`
        );
        return false;
      }

      const cacheTTL = ttl || this.config.ttl;

      await this.client.setEx(cacheKey, cacheTTL, serializedValue);

      this.stats.sets++;
      this.emit("set", {
        key: cacheKey,
        ttl: cacheTTL,
        size: serializedValue.length,
      });

      return true;
    } catch (error) {
      this.stats.errors++;
      this.emit("error", error);
      console.error("❌ Error estableciendo en cache:", error.message);
      return false;
    }
  }

  /**
   * Eliminar valor del cache
   */
  async delete(key) {
    if (!this.config.enabled || !this.isConnected) {
      return false;
    }

    try {
      const cacheKey = this._buildKey(key);
      const result = await this.client.del(cacheKey);

      if (result > 0) {
        this.stats.deletes++;
        this.emit("delete", { key: cacheKey });
        return true;
      }

      return false;
    } catch (error) {
      this.stats.errors++;
      this.emit("error", error);
      console.error("❌ Error eliminando del cache:", error.message);
      return false;
    }
  }

  /**
   * Eliminar múltiples claves por patrón
   */
  async deletePattern(pattern) {
    if (!this.config.enabled || !this.isConnected) {
      return 0;
    }

    try {
      const searchPattern = this._buildKey(pattern);
      const keys = await this.client.keys(searchPattern);

      if (keys.length === 0) {
        return 0;
      }

      const result = await this.client.del(keys);
      this.stats.deletes += result;

      this.emit("deletePattern", {
        pattern: searchPattern,
        deletedCount: result,
      });

      return result;
    } catch (error) {
      this.stats.errors++;
      this.emit("error", error);
      console.error("❌ Error eliminando patrón del cache:", error.message);
      return 0;
    }
  }

  /**
   * Verificar si existe una clave
   */
  async exists(key) {
    if (!this.config.enabled || !this.isConnected) {
      return false;
    }

    try {
      const cacheKey = this._buildKey(key);
      const result = await this.client.exists(cacheKey);
      return result === 1;
    } catch (error) {
      this.stats.errors++;
      this.emit("error", error);
      return false;
    }
  }

  /**
   * Obtener TTL de una clave
   */
  async getTTL(key) {
    if (!this.config.enabled || !this.isConnected) {
      return -1;
    }

    try {
      const cacheKey = this._buildKey(key);
      return await this.client.ttl(cacheKey);
    } catch (error) {
      this.stats.errors++;
      this.emit("error", error);
      return -1;
    }
  }

  /**
   * Establecer TTL para una clave existente
   */
  async expire(key, ttl) {
    if (!this.config.enabled || !this.isConnected) {
      return false;
    }

    try {
      const cacheKey = this._buildKey(key);
      const result = await this.client.expire(cacheKey, ttl);
      return result === 1;
    } catch (error) {
      this.stats.errors++;
      this.emit("error", error);
      return false;
    }
  }

  /**
   * Limpiar todo el cache
   */
  async clear() {
    if (!this.config.enabled || !this.isConnected) {
      return false;
    }

    try {
      const pattern = this._buildKey("*");
      const keys = await this.client.keys(pattern);

      if (keys.length > 0) {
        await this.client.del(keys);
      }

      this.emit("cleared", { deletedCount: keys.length });
      console.log(`🗑️ Cache limpiado: ${keys.length} claves eliminadas`);

      return true;
    } catch (error) {
      this.stats.errors++;
      this.emit("error", error);
      console.error("❌ Error limpiando cache:", error.message);
      return false;
    }
  }

  /**
   * Obtener estadísticas del cache
   */
  async getStats() {
    const baseStats = {
      ...this.stats,
      hitRate:
        this.stats.totalRequests > 0
          ? ((this.stats.hits / this.stats.totalRequests) * 100).toFixed(2) +
            "%"
          : "0%",
      enabled: this.config.enabled,
      connected: this.isConnected,
    };

    if (!this.isConnected) {
      return baseStats;
    }

    try {
      const info = await this.client.info("memory");
      const memoryInfo = this._parseRedisInfo(info);

      const keyCount = await this.client.dbSize();

      return {
        ...baseStats,
        redis: {
          keys: keyCount,
          memoryUsed: memoryInfo.used_memory_human,
          memoryPeak: memoryInfo.used_memory_peak_human,
          version: memoryInfo.redis_version,
        },
      };
    } catch (error) {
      return baseStats;
    }
  }

  /**
   * Cache con función de callback (get-or-set pattern)
   */
  async remember(key, callback, ttl = null) {
    // Intentar obtener del cache
    const cached = await this.get(key);
    if (cached !== null) {
      return cached;
    }

    // Ejecutar callback y cachear resultado
    try {
      const result = await callback();
      await this.set(key, result, ttl);
      return result;
    } catch (error) {
      // No cachear errores
      throw error;
    }
  }

  /**
   * Cache con invalidación automática por tags
   */
  async setWithTags(key, value, tags = [], ttl = null) {
    const success = await this.set(key, value, ttl);

    if (success && tags.length > 0) {
      // Asociar tags con la clave
      for (const tag of tags) {
        const tagKey = this._buildTagKey(tag);
        await this.client.sAdd(tagKey, this._buildKey(key));

        // Establecer TTL para el tag
        const tagTTL = (ttl || this.config.ttl) + 60; // Un poco más que el valor
        await this.client.expire(tagKey, tagTTL);
      }
    }

    return success;
  }

  /**
   * Invalidar cache por tags
   */
  async invalidateByTag(tag) {
    if (!this.config.enabled || !this.isConnected) {
      return 0;
    }

    try {
      const tagKey = this._buildTagKey(tag);
      const keys = await this.client.sMembers(tagKey);

      if (keys.length === 0) {
        return 0;
      }

      // Eliminar las claves asociadas al tag
      const deletedKeys = await this.client.del(keys);

      // Eliminar el tag
      await this.client.del(tagKey);

      this.emit("invalidateTag", { tag, deletedCount: deletedKeys });

      return deletedKeys;
    } catch (error) {
      this.stats.errors++;
      this.emit("error", error);
      return 0;
    }
  }

  /**
   * Configurar event handlers de Redis
   */
  _setupEventHandlers() {
    this.client.on("connect", () => {
      console.log("🔄 Conectando a Redis...");
    });

    this.client.on("ready", () => {
      this.isConnected = true;
      console.log("✅ Redis listo");
    });

    this.client.on("error", (error) => {
      this.isConnected = false;
      console.error("❌ Error de Redis:", error.message);
      this.emit("error", error);
    });

    this.client.on("end", () => {
      this.isConnected = false;
      console.log("❌ Conexión a Redis terminada");
      this.emit("disconnected");
    });

    this.client.on("reconnecting", () => {
      console.log("🔄 Reconectando a Redis...");
    });
  }

  /**
   * Construir clave de cache
   */
  _buildKey(key) {
    const fullKey = this.config.keyPrefix + key;

    if (fullKey.length > this.config.maxKeySize) {
      // Usar hash para claves muy largas
      const hash = crypto.createHash("sha256").update(fullKey).digest("hex");
      return this.config.keyPrefix + "hash:" + hash;
    }

    return fullKey;
  }

  /**
   * Construir clave de tag
   */
  _buildTagKey(tag) {
    return this.config.keyPrefix + "tag:" + tag;
  }

  /**
   * Serializar valor
   */
  _serialize(value) {
    try {
      let serialized;

      switch (this.config.serialization) {
        case "json":
          serialized = JSON.stringify(value);
          break;
        case "msgpack":
          // Requiere librería msgpack
          const msgpack = require("msgpack");
          serialized = msgpack.pack(value).toString("base64");
          break;
        default:
          serialized = JSON.stringify(value);
      }

      // Compresión opcional
      if (this.config.compression && serialized.length > 1000) {
        const zlib = require("zlib");
        return zlib.gzipSync(serialized).toString("base64");
      }

      return serialized;
    } catch (error) {
      console.error("❌ Error serializando valor:", error.message);
      return JSON.stringify(null);
    }
  }

  /**
   * Deserializar valor
   */
  _deserialize(value) {
    try {
      let data = value;

      // Descompresión si es necesario
      if (this.config.compression) {
        try {
          const zlib = require("zlib");
          const buffer = Buffer.from(data, "base64");
          data = zlib.gunzipSync(buffer).toString();
        } catch (error) {
          // No está comprimido, continuar
        }
      }

      switch (this.config.serialization) {
        case "json":
          return JSON.parse(data);
        case "msgpack":
          const msgpack = require("msgpack");
          const buffer = Buffer.from(data, "base64");
          return msgpack.unpack(buffer);
        default:
          return JSON.parse(data);
      }
    } catch (error) {
      console.error("❌ Error deserializando valor:", error.message);
      return null;
    }
  }

  /**
   * Parsear información de Redis
   */
  _parseRedisInfo(info) {
    const lines = info.split("\r\n");
    const result = {};

    for (const line of lines) {
      if (line.includes(":")) {
        const [key, value] = line.split(":");
        result[key] = value;
      }
    }

    return result;
  }

  /**
   * Inicializar cache en memoria como fallback
   */
  _initMemoryCache() {
    this.memoryCache = new Map();
    this.memoryCacheTTL = new Map();

    // Limpiar cache expirado cada minuto
    setInterval(() => {
      const now = Date.now();
      for (const [key, expiry] of this.memoryCacheTTL.entries()) {
        if (expiry < now) {
          this.memoryCache.delete(key);
          this.memoryCacheTTL.delete(key);
        }
      }
    }, 60000);

    console.log("📦 Cache en memoria inicializado");
  }
}

module.exports = CacheManager;
