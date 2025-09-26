/**
 * Adaptador para MongoDB
 * Implementa todas las funcionalidades para MongoDB
 */

const BaseAdapter = require("./BaseAdapter");
const { MongoClient, GridFSBucket } = require("mongodb");
const fs = require("fs").promises;
const path = require("path");

class MongoDBAdapter extends BaseAdapter {
  constructor(config) {
    super(config);
    this.client = null;
    this.db = null;
    this.gridFS = null;

    // Configuración específica de MongoDB
    this.mongoConfig = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: config.maxPoolSize || 10,
      serverSelectionTimeoutMS: config.connectionTimeout || 10000,
      socketTimeoutMS: config.queryTimeout || 30000,
      ...config.mongoOptions,
    };
  }

  /**
   * Conectar a MongoDB
   */
  async connect() {
    try {
      const uri = this._buildConnectionString();

      this._log("info", "Conectando a MongoDB...", {
        uri: uri.replace(/\/\/.*@/, "//***:***@"),
      });

      this.client = new MongoClient(uri, this.mongoConfig);
      await this.client.connect();

      this.db = this.client.db(this.config.database);
      this.gridFS = new GridFSBucket(this.db);

      this.isConnected = true;
      this.emit("connected");

      this._log("info", "Conectado exitosamente a MongoDB");
    } catch (error) {
      this.isConnected = false;
      const normalizedError = this._normalizeError(error, "connect");
      this.emit("error", normalizedError);
      throw normalizedError;
    }
  }

  /**
   * Desconectar de MongoDB
   */
  async disconnect() {
    try {
      if (this.client) {
        await this.client.close();
        this.client = null;
        this.db = null;
        this.gridFS = null;
      }

      this.isConnected = false;
      this.emit("disconnected");

      this._log("info", "Desconectado de MongoDB");
    } catch (error) {
      const normalizedError = this._normalizeError(error, "disconnect");
      this.emit("error", normalizedError);
      throw normalizedError;
    }
  }

  /**
   * Ejecutar operación en MongoDB
   */
  async query(operation, params = [], options = {}) {
    if (!this.isConnectionActive()) {
      throw new Error("No hay conexión activa a MongoDB");
    }

    try {
      const { collection, method, query, update, pipeline, ...queryOptions } =
        operation;

      if (!collection) {
        throw new Error("Debe especificar una colección");
      }

      const coll = this.db.collection(collection);
      let result;

      switch (method) {
        case "find":
          result = await coll.find(query || {}, queryOptions).toArray();
          break;

        case "findOne":
          result = await coll.findOne(query || {}, queryOptions);
          break;

        case "insertOne":
          result = await coll.insertOne(query, queryOptions);
          break;

        case "insertMany":
          result = await coll.insertMany(query, queryOptions);
          break;

        case "updateOne":
          result = await coll.updateOne(query, update, queryOptions);
          break;

        case "updateMany":
          result = await coll.updateMany(query, update, queryOptions);
          break;

        case "deleteOne":
          result = await coll.deleteOne(query, queryOptions);
          break;

        case "deleteMany":
          result = await coll.deleteMany(query, queryOptions);
          break;

        case "aggregate":
          result = await coll.aggregate(pipeline || [], queryOptions).toArray();
          break;

        case "count":
          result = await coll.countDocuments(query || {}, queryOptions);
          break;

        case "distinct":
          result = await coll.distinct(queryOptions.field, query || {});
          break;

        default:
          throw new Error(`Método no soportado: ${method}`);
      }

      return result;
    } catch (error) {
      const normalizedError = this._normalizeError(error, "query");
      this.emit("error", normalizedError);
      throw normalizedError;
    }
  }

  /**
   * Verificar conexión
   */
  async ping() {
    if (!this.isConnectionActive()) {
      throw new Error("No hay conexión activa a MongoDB");
    }

    try {
      await this.db.admin().ping();
      return true;
    } catch (error) {
      const normalizedError = this._normalizeError(error, "ping");
      throw normalizedError;
    }
  }

  /**
   * Obtener estadísticas de MongoDB
   */
  async getStats() {
    if (!this.isConnectionActive()) {
      throw new Error("No hay conexión activa a MongoDB");
    }

    try {
      const dbStats = await this.db.stats();
      const serverStatus = await this.db.admin().serverStatus();

      return {
        database: this.config.database,
        collections: dbStats.collections,
        documents: dbStats.objects,
        dataSize: dbStats.dataSize,
        storageSize: dbStats.storageSize,
        indexSize: dbStats.indexSize,
        averageObjectSize: dbStats.avgObjSize,
        version: serverStatus.version,
        uptime: serverStatus.uptime,
        connections: serverStatus.connections,
        memory: serverStatus.mem,
        network: serverStatus.network,
      };
    } catch (error) {
      const normalizedError = this._normalizeError(error, "getStats");
      throw normalizedError;
    }
  }

  /**
   * Ejecutar transacción
   */
  async transaction(callback) {
    if (!this.isConnectionActive()) {
      throw new Error("No hay conexión activa a MongoDB");
    }

    const session = this.client.startSession();

    try {
      let result;

      await session.withTransaction(async () => {
        result = await callback(session);
      });

      return result;
    } catch (error) {
      const normalizedError = this._normalizeError(error, "transaction");
      throw normalizedError;
    } finally {
      await session.endSession();
    }
  }

  /**
   * Crear backup de MongoDB
   */
  async createBackup(options = {}) {
    if (!this.isConnectionActive()) {
      throw new Error("No hay conexión activa a MongoDB");
    }

    try {
      const backupDir = options.path || path.join(process.cwd(), "backups");
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const backupPath = path.join(backupDir, `mongodb-backup-${timestamp}`);

      // Crear directorio de backup si no existe
      await fs.mkdir(backupPath, { recursive: true });

      // Obtener todas las colecciones
      const collections = await this.db.listCollections().toArray();

      for (const collectionInfo of collections) {
        const collectionName = collectionInfo.name;
        const collection = this.db.collection(collectionName);

        // Exportar documentos
        const documents = await collection.find({}).toArray();
        const filePath = path.join(backupPath, `${collectionName}.json`);

        await fs.writeFile(filePath, JSON.stringify(documents, null, 2));

        this._log("info", `Colección ${collectionName} respaldada`, {
          documents: documents.length,
          file: filePath,
        });
      }

      // Crear metadata del backup
      const metadata = {
        database: this.config.database,
        timestamp: new Date().toISOString(),
        collections: collections.length,
        version: await this._getMongoVersion(),
        type: "full",
      };

      await fs.writeFile(
        path.join(backupPath, "metadata.json"),
        JSON.stringify(metadata, null, 2)
      );

      this._log("info", "Backup completado", {
        path: backupPath,
        collections: collections.length,
      });

      return {
        path: backupPath,
        metadata,
      };
    } catch (error) {
      const normalizedError = this._normalizeError(error, "createBackup");
      throw normalizedError;
    }
  }

  /**
   * Restaurar backup de MongoDB
   */
  async restoreBackup(backupPath, options = {}) {
    if (!this.isConnectionActive()) {
      throw new Error("No hay conexión activa a MongoDB");
    }

    try {
      // Leer metadata
      const metadataPath = path.join(backupPath, "metadata.json");
      const metadata = JSON.parse(await fs.readFile(metadataPath, "utf8"));

      this._log("info", "Iniciando restauración de backup", {
        path: backupPath,
        metadata,
      });

      // Leer archivos de colecciones
      const files = await fs.readdir(backupPath);
      const collectionFiles = files.filter(
        (file) => file.endsWith(".json") && file !== "metadata.json"
      );

      for (const file of collectionFiles) {
        const collectionName = path.basename(file, ".json");
        const filePath = path.join(backupPath, file);

        const documents = JSON.parse(await fs.readFile(filePath, "utf8"));

        if (documents.length > 0) {
          const collection = this.db.collection(collectionName);

          // Limpiar colección si se especifica
          if (options.dropExisting) {
            await collection.deleteMany({});
          }

          await collection.insertMany(documents);

          this._log("info", `Colección ${collectionName} restaurada`, {
            documents: documents.length,
          });
        }
      }

      this._log("info", "Restauración completada", {
        collections: collectionFiles.length,
      });

      return {
        collections: collectionFiles.length,
        metadata,
      };
    } catch (error) {
      const normalizedError = this._normalizeError(error, "restoreBackup");
      throw normalizedError;
    }
  }

  /**
   * Obtener esquema de la base de datos
   */
  async getSchema() {
    if (!this.isConnectionActive()) {
      throw new Error("No hay conexión activa a MongoDB");
    }

    try {
      const collections = await this.db.listCollections().toArray();
      const schema = {};

      for (const collectionInfo of collections) {
        const collectionName = collectionInfo.name;
        const collection = this.db.collection(collectionName);

        // Obtener índices
        const indexes = await collection.indexes();

        // Analizar estructura de documentos (muestra)
        const sampleDocs = await collection.find({}).limit(10).toArray();
        const fields = new Set();

        sampleDocs.forEach((doc) => {
          Object.keys(doc).forEach((key) => fields.add(key));
        });

        schema[collectionName] = {
          type: "collection",
          indexes: indexes,
          sampleFields: Array.from(fields),
          documentCount: await collection.countDocuments(),
        };
      }

      return schema;
    } catch (error) {
      const normalizedError = this._normalizeError(error, "getSchema");
      throw normalizedError;
    }
  }

  /**
   * Ejecutar migración
   */
  async executeMigration(migration) {
    if (!this.isConnectionActive()) {
      throw new Error("No hay conexión activa a MongoDB");
    }

    try {
      this._log("info", "Ejecutando migración", { name: migration.name });

      // Ejecutar la función de migración
      const result = await migration.up(this.db);

      // Registrar migración ejecutada
      const migrationsCollection = this.db.collection("_migrations");
      await migrationsCollection.insertOne({
        name: migration.name,
        executedAt: new Date(),
        version: migration.version || "1.0.0",
      });

      this._log("info", "Migración completada", { name: migration.name });

      return result;
    } catch (error) {
      const normalizedError = this._normalizeError(error, "executeMigration");
      throw normalizedError;
    }
  }

  /**
   * Construir string de conexión
   */
  _buildConnectionString() {
    const { host, port, username, password, database } = this.config;

    let uri = "mongodb://";

    if (username && password) {
      uri += `${encodeURIComponent(username)}:${encodeURIComponent(password)}@`;
    }

    uri += host;

    if (port) {
      uri += `:${port}`;
    }

    uri += `/${database}`;

    return uri;
  }

  /**
   * Obtener versión de MongoDB
   */
  async _getMongoVersion() {
    try {
      const serverStatus = await this.db.admin().serverStatus();
      return serverStatus.version;
    } catch (error) {
      return "unknown";
    }
  }
}

module.exports = MongoDBAdapter;
