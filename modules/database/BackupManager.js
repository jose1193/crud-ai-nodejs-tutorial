/**
 * Backup Manager
 * Sistema de backups automáticos programados para todas las bases de datos
 */

const fs = require("fs").promises;
const path = require("path");
const EventEmitter = require("events");
const cron = require("node-cron");

class BackupManager extends EventEmitter {
  constructor(adapter, config = {}) {
    super();

    this.adapter = adapter;
    this.config = {
      enabled: config.enabled !== false,
      schedule: config.schedule || "0 2 * * *", // 2 AM diario por defecto
      path: config.path || "./backups",
      retention: config.retention || 30, // días
      compression: config.compression !== false,
      encryption: config.encryption || false,
      encryptionKey: config.encryptionKey || "",
      maxBackups: config.maxBackups || 50,
      prefix: config.prefix || "backup",
      formats: config.formats || ["native"], // native, sql, json
      ...config,
    };

    this.scheduledJob = null;
    this.isRunning = false;
    this.backupHistory = [];
  }

  /**
   * Inicializar el sistema de backups
   */
  async initialize() {
    try {
      // Crear directorio de backups
      await fs.mkdir(this.config.path, { recursive: true });

      // Cargar historial de backups
      await this._loadBackupHistory();

      // Programar backups automáticos
      if (this.config.enabled && this.config.schedule) {
        this._scheduleBackups();
      }

      console.log("📦 Sistema de backups inicializado");
      this.emit("initialized");
    } catch (error) {
      console.error(
        "❌ Error inicializando sistema de backups:",
        error.message
      );
      throw error;
    }
  }

  /**
   * Crear backup manual
   */
  async createBackup(options = {}) {
    if (this.isRunning) {
      throw new Error("Ya hay un backup en progreso");
    }

    try {
      this.isRunning = true;
      console.log("📦 Iniciando backup manual...");

      const backupOptions = {
        type: "manual",
        formats: options.formats || this.config.formats,
        compression: options.compression ?? this.config.compression,
        encryption: options.encryption ?? this.config.encryption,
        description: options.description || "Backup manual",
        ...options,
      };

      const result = await this._performBackup(backupOptions);

      console.log(`✅ Backup completado: ${result.filename}`);
      this.emit("backupCompleted", result);

      return result;
    } catch (error) {
      console.error("❌ Error creando backup:", error.message);
      this.emit("backupFailed", { error });
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Restaurar backup
   */
  async restoreBackup(backupPath, options = {}) {
    try {
      console.log(`🔄 Restaurando backup: ${backupPath}`);

      // Verificar que el archivo existe
      await fs.access(backupPath);

      // Leer metadata si existe
      const metadata = await this._getBackupMetadata(backupPath);

      // Validar compatibilidad
      if (metadata && metadata.dbType !== this.adapter.config.type) {
        console.warn(
          `⚠️ Advertencia: Backup creado para ${metadata.dbType}, restaurando en ${this.adapter.config.type}`
        );
      }

      const startTime = Date.now();

      // Descomprimir si es necesario
      let actualBackupPath = backupPath;
      if (this._isCompressed(backupPath)) {
        actualBackupPath = await this._decompressBackup(backupPath);
      }

      // Desencriptar si es necesario
      if (this._isEncrypted(actualBackupPath)) {
        actualBackupPath = await this._decryptBackup(
          actualBackupPath,
          options.encryptionKey
        );
      }

      // Restaurar usando el adaptador
      const result = await this.adapter.restoreBackup(
        actualBackupPath,
        options
      );

      const duration = Date.now() - startTime;

      // Limpiar archivos temporales
      if (actualBackupPath !== backupPath) {
        await fs.unlink(actualBackupPath);
      }

      console.log(`✅ Backup restaurado exitosamente (${duration}ms)`);

      this.emit("backupRestored", {
        backupPath,
        duration,
        metadata: result.metadata,
      });

      return {
        success: true,
        duration,
        metadata: result.metadata || metadata,
      };
    } catch (error) {
      console.error("❌ Error restaurando backup:", error.message);
      this.emit("restoreFailed", { backupPath, error });
      throw error;
    }
  }

  /**
   * Listar backups disponibles
   */
  async listBackups(options = {}) {
    try {
      const files = await fs.readdir(this.config.path);

      let backupFiles = files.filter(
        (file) =>
          file.startsWith(this.config.prefix) &&
          (file.endsWith(".sql") ||
            file.endsWith(".json") ||
            file.endsWith(".gz") ||
            file.endsWith(".enc"))
      );

      // Aplicar filtros
      if (options.type) {
        backupFiles = backupFiles.filter((file) => file.includes(options.type));
      }

      if (options.limit) {
        backupFiles = backupFiles.slice(0, options.limit);
      }

      // Obtener información detallada
      const backups = await Promise.all(
        backupFiles.map(async (file) => {
          const filePath = path.join(this.config.path, file);
          const stats = await fs.stat(filePath);
          const metadata = await this._getBackupMetadata(filePath);

          return {
            filename: file,
            path: filePath,
            size: stats.size,
            sizeFormatted: this._formatBytes(stats.size),
            created: stats.birthtime,
            modified: stats.mtime,
            compressed: this._isCompressed(file),
            encrypted: this._isEncrypted(file),
            metadata,
          };
        })
      );

      // Ordenar por fecha de creación (más reciente primero)
      backups.sort((a, b) => b.created - a.created);

      return backups;
    } catch (error) {
      console.error("❌ Error listando backups:", error.message);
      throw error;
    }
  }

  /**
   * Eliminar backup
   */
  async deleteBackup(backupPath) {
    try {
      await fs.unlink(backupPath);

      // Eliminar archivos de metadata asociados
      const metadataPath = backupPath.replace(
        /\.(sql|json|gz|enc)$/,
        ".metadata.json"
      );
      try {
        await fs.unlink(metadataPath);
      } catch (error) {
        // Metadata no existe, continuar
      }

      console.log(`🗑️ Backup eliminado: ${path.basename(backupPath)}`);

      this.emit("backupDeleted", { backupPath });

      return true;
    } catch (error) {
      console.error("❌ Error eliminando backup:", error.message);
      throw error;
    }
  }

  /**
   * Limpiar backups antiguos
   */
  async cleanupOldBackups() {
    try {
      console.log("🧹 Limpiando backups antiguos...");

      const backups = await this.listBackups();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.config.retention);

      let deletedCount = 0;

      for (const backup of backups) {
        if (
          backup.created < cutoffDate ||
          backups.indexOf(backup) >= this.config.maxBackups
        ) {
          await this.deleteBackup(backup.path);
          deletedCount++;
        }
      }

      console.log(`🗑️ ${deletedCount} backups antiguos eliminados`);

      this.emit("cleanupCompleted", { deletedCount });

      return deletedCount;
    } catch (error) {
      console.error("❌ Error limpiando backups:", error.message);
      throw error;
    }
  }

  /**
   * Obtener estadísticas de backups
   */
  async getStats() {
    try {
      const backups = await this.listBackups();

      const stats = {
        totalBackups: backups.length,
        totalSize: backups.reduce((sum, backup) => sum + backup.size, 0),
        oldestBackup:
          backups.length > 0 ? backups[backups.length - 1].created : null,
        newestBackup: backups.length > 0 ? backups[0].created : null,
        averageSize:
          backups.length > 0
            ? backups.reduce((sum, backup) => sum + backup.size, 0) /
              backups.length
            : 0,
        byType: {},
        byMonth: {},
      };

      // Estadísticas por tipo
      backups.forEach((backup) => {
        const type = backup.metadata?.type || "unknown";
        stats.byType[type] = (stats.byType[type] || 0) + 1;
      });

      // Estadísticas por mes
      backups.forEach((backup) => {
        const month = backup.created.toISOString().substr(0, 7); // YYYY-MM
        stats.byMonth[month] = (stats.byMonth[month] || 0) + 1;
      });

      // Formatear tamaños
      stats.totalSizeFormatted = this._formatBytes(stats.totalSize);
      stats.averageSizeFormatted = this._formatBytes(stats.averageSize);

      return stats;
    } catch (error) {
      console.error("❌ Error obteniendo estadísticas:", error.message);
      throw error;
    }
  }

  /**
   * Detener backups programados
   */
  stop() {
    if (this.scheduledJob) {
      this.scheduledJob.stop();
      this.scheduledJob = null;
      console.log("⏹️ Backups automáticos detenidos");
      this.emit("stopped");
    }
  }

  /**
   * Programar backups automáticos
   */
  _scheduleBackups() {
    try {
      if (!cron.validate(this.config.schedule)) {
        throw new Error(`Expresión cron inválida: ${this.config.schedule}`);
      }

      this.scheduledJob = cron.schedule(
        this.config.schedule,
        async () => {
          try {
            console.log("⏰ Ejecutando backup programado...");
            await this.createBackup({ type: "scheduled" });
          } catch (error) {
            console.error("❌ Error en backup programado:", error.message);
          }
        },
        {
          scheduled: true,
          timezone: this.config.timezone || "UTC",
        }
      );

      console.log(`⏰ Backups programados: ${this.config.schedule}`);
      this.emit("scheduled");
    } catch (error) {
      console.error("❌ Error programando backups:", error.message);
      throw error;
    }
  }

  /**
   * Realizar backup
   */
  async _performBackup(options) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const baseFilename = `${this.config.prefix}-${options.type}-${timestamp}`;

    const results = [];

    for (const format of options.formats) {
      try {
        console.log(`📦 Creando backup en formato: ${format}`);

        let filename = `${baseFilename}.${this._getFileExtension(format)}`;
        let filePath = path.join(this.config.path, filename);

        // Crear backup usando el adaptador
        const backupResult = await this.adapter.createBackup({
          path: filePath,
          format,
          ...options,
        });

        // Comprimir si está habilitado
        if (options.compression) {
          filePath = await this._compressFile(filePath);
          filename = path.basename(filePath);
        }

        // Encriptar si está habilitado
        if (options.encryption && this.config.encryptionKey) {
          filePath = await this._encryptFile(
            filePath,
            this.config.encryptionKey
          );
          filename = path.basename(filePath);
        }

        // Obtener información del archivo final
        const stats = await fs.stat(filePath);

        // Crear metadata
        const metadata = {
          filename,
          type: options.type,
          format,
          dbType: this.adapter.config.type,
          database: this.adapter.config.database,
          created: new Date(),
          size: stats.size,
          compressed: options.compression,
          encrypted: options.encryption,
          description: options.description,
          version: "1.0.0",
          ...backupResult.metadata,
        };

        // Guardar metadata
        await this._saveBackupMetadata(filePath, metadata);

        results.push({
          filename,
          path: filePath,
          format,
          size: stats.size,
          sizeFormatted: this._formatBytes(stats.size),
          metadata,
        });

        console.log(
          `✅ Backup ${format} completado: ${filename} (${this._formatBytes(
            stats.size
          )})`
        );
      } catch (error) {
        console.error(`❌ Error creando backup ${format}:`, error.message);
        results.push({
          format,
          error: error.message,
          success: false,
        });
      }
    }

    // Actualizar historial
    this._addToHistory({
      timestamp: new Date(),
      type: options.type,
      results,
      success: results.some((r) => !r.error),
    });

    // Limpiar backups antiguos
    if (options.cleanup !== false) {
      setTimeout(() => this.cleanupOldBackups(), 5000);
    }

    return {
      timestamp: new Date(),
      results,
      success: results.some((r) => !r.error),
    };
  }

  /**
   * Comprimir archivo
   */
  async _compressFile(filePath) {
    try {
      const zlib = require("zlib");
      const compressedPath = filePath + ".gz";

      const readStream = require("fs").createReadStream(filePath);
      const writeStream = require("fs").createWriteStream(compressedPath);
      const gzipStream = zlib.createGzip();

      await new Promise((resolve, reject) => {
        readStream
          .pipe(gzipStream)
          .pipe(writeStream)
          .on("finish", resolve)
          .on("error", reject);
      });

      // Eliminar archivo original
      await fs.unlink(filePath);

      return compressedPath;
    } catch (error) {
      console.error("❌ Error comprimiendo archivo:", error.message);
      throw error;
    }
  }

  /**
   * Descomprimir archivo
   */
  async _decompressBackup(compressedPath) {
    try {
      const zlib = require("zlib");
      const decompressedPath = compressedPath.replace(".gz", "");

      const readStream = require("fs").createReadStream(compressedPath);
      const writeStream = require("fs").createWriteStream(decompressedPath);
      const gunzipStream = zlib.createGunzip();

      await new Promise((resolve, reject) => {
        readStream
          .pipe(gunzipStream)
          .pipe(writeStream)
          .on("finish", resolve)
          .on("error", reject);
      });

      return decompressedPath;
    } catch (error) {
      console.error("❌ Error descomprimiendo archivo:", error.message);
      throw error;
    }
  }

  /**
   * Encriptar archivo
   */
  async _encryptFile(filePath, key) {
    try {
      const crypto = require("crypto");
      const algorithm = "aes-256-cbc";
      const iv = crypto.randomBytes(16);

      const cipher = crypto.createCipher(algorithm, key);
      const encryptedPath = filePath + ".enc";

      const readStream = require("fs").createReadStream(filePath);
      const writeStream = require("fs").createWriteStream(encryptedPath);

      // Escribir IV al inicio del archivo
      writeStream.write(iv);

      await new Promise((resolve, reject) => {
        readStream
          .pipe(cipher)
          .pipe(writeStream)
          .on("finish", resolve)
          .on("error", reject);
      });

      // Eliminar archivo original
      await fs.unlink(filePath);

      return encryptedPath;
    } catch (error) {
      console.error("❌ Error encriptando archivo:", error.message);
      throw error;
    }
  }

  /**
   * Desencriptar archivo
   */
  async _decryptBackup(encryptedPath, key) {
    try {
      if (!key) {
        throw new Error("Clave de encriptación requerida");
      }

      const crypto = require("crypto");
      const algorithm = "aes-256-cbc";

      const decryptedPath = encryptedPath.replace(".enc", "");

      const readStream = require("fs").createReadStream(encryptedPath);
      const writeStream = require("fs").createWriteStream(decryptedPath);

      // Leer IV del inicio del archivo
      const iv = Buffer.alloc(16);
      await new Promise((resolve, reject) => {
        readStream.read(16, (err, data) => {
          if (err) reject(err);
          else {
            iv.copy(data);
            resolve();
          }
        });
      });

      const decipher = crypto.createDecipher(algorithm, key);

      await new Promise((resolve, reject) => {
        readStream
          .pipe(decipher)
          .pipe(writeStream)
          .on("finish", resolve)
          .on("error", reject);
      });

      return decryptedPath;
    } catch (error) {
      console.error("❌ Error desencriptando archivo:", error.message);
      throw error;
    }
  }

  /**
   * Guardar metadata del backup
   */
  async _saveBackupMetadata(backupPath, metadata) {
    try {
      const metadataPath = backupPath.replace(
        /\.(sql|json|gz|enc)$/,
        ".metadata.json"
      );
      await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
    } catch (error) {
      console.error("❌ Error guardando metadata:", error.message);
    }
  }

  /**
   * Obtener metadata del backup
   */
  async _getBackupMetadata(backupPath) {
    try {
      const metadataPath = backupPath.replace(
        /\.(sql|json|gz|enc)$/,
        ".metadata.json"
      );
      const metadataContent = await fs.readFile(metadataPath, "utf8");
      return JSON.parse(metadataContent);
    } catch (error) {
      return null;
    }
  }

  /**
   * Verificar si archivo está comprimido
   */
  _isCompressed(filename) {
    return filename.endsWith(".gz");
  }

  /**
   * Verificar si archivo está encriptado
   */
  _isEncrypted(filename) {
    return filename.endsWith(".enc");
  }

  /**
   * Obtener extensión de archivo según formato
   */
  _getFileExtension(format) {
    const extensions = {
      native: "sql",
      sql: "sql",
      json: "json",
      csv: "csv",
    };

    return extensions[format] || "backup";
  }

  /**
   * Formatear bytes a formato legible
   */
  _formatBytes(bytes) {
    if (bytes === 0) return "0 Bytes";

    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  /**
   * Cargar historial de backups
   */
  async _loadBackupHistory() {
    try {
      const historyPath = path.join(this.config.path, ".backup-history.json");
      const historyContent = await fs.readFile(historyPath, "utf8");
      this.backupHistory = JSON.parse(historyContent);
    } catch (error) {
      this.backupHistory = [];
    }
  }

  /**
   * Agregar al historial
   */
  _addToHistory(entry) {
    this.backupHistory.push(entry);

    // Mantener solo los últimos 100 registros
    if (this.backupHistory.length > 100) {
      this.backupHistory = this.backupHistory.slice(-100);
    }

    // Guardar historial
    this._saveBackupHistory();
  }

  /**
   * Guardar historial de backups
   */
  async _saveBackupHistory() {
    try {
      const historyPath = path.join(this.config.path, ".backup-history.json");
      await fs.writeFile(
        historyPath,
        JSON.stringify(this.backupHistory, null, 2)
      );
    } catch (error) {
      console.error("❌ Error guardando historial:", error.message);
    }
  }
}

module.exports = BackupManager;
