/**
 * Migration Manager
 * Sistema de migraciones de esquema para todas las bases de datos
 */

const fs = require("fs").promises;
const path = require("path");
const EventEmitter = require("events");

class MigrationManager extends EventEmitter {
  constructor(adapter, config = {}) {
    super();

    this.adapter = adapter;
    this.config = {
      migrationsPath: config.migrationsPath || "./migrations",
      tableName: config.tableName || "_migrations",
      autoCreate: config.autoCreate !== false,
      lockTimeout: config.lockTimeout || 30000, // 30 segundos
      ...config,
    };

    this.isLocked = false;
    this.lockFile = path.join(this.config.migrationsPath, ".migration-lock");
  }

  /**
   * Ejecutar migraciones pendientes
   */
  async runPending() {
    try {
      await this._acquireLock();

      console.log("🔄 Verificando migraciones pendientes...");

      // Crear tabla de migraciones si no existe
      if (this.config.autoCreate) {
        await this._createMigrationsTable();
      }

      // Obtener migraciones ejecutadas
      const executedMigrations = await this._getExecutedMigrations();

      // Obtener archivos de migración
      const migrationFiles = await this._getMigrationFiles();

      // Filtrar migraciones pendientes
      const pendingMigrations = migrationFiles.filter(
        (file) =>
          !executedMigrations.some((executed) => executed.name === file.name)
      );

      if (pendingMigrations.length === 0) {
        console.log("✅ No hay migraciones pendientes");
        return [];
      }

      console.log(
        `📋 Ejecutando ${pendingMigrations.length} migración(es) pendiente(s)`
      );

      const results = [];

      for (const migrationFile of pendingMigrations) {
        try {
          console.log(`🔄 Ejecutando migración: ${migrationFile.name}`);

          const migration = await this._loadMigration(migrationFile.path);
          const startTime = Date.now();

          await this.adapter.executeMigration(migration);

          const duration = Date.now() - startTime;

          results.push({
            name: migrationFile.name,
            success: true,
            duration,
            executedAt: new Date(),
          });

          console.log(
            `✅ Migración completada: ${migrationFile.name} (${duration}ms)`
          );

          this.emit("migrationExecuted", {
            name: migrationFile.name,
            duration,
          });
        } catch (error) {
          console.error(
            `❌ Error en migración ${migrationFile.name}:`,
            error.message
          );

          results.push({
            name: migrationFile.name,
            success: false,
            error: error.message,
            executedAt: new Date(),
          });

          this.emit("migrationFailed", {
            name: migrationFile.name,
            error,
          });

          // Detener en el primer error
          break;
        }
      }

      const successCount = results.filter((r) => r.success).length;
      console.log(
        `🎉 Migraciones completadas: ${successCount}/${results.length}`
      );

      return results;
    } finally {
      await this._releaseLock();
    }
  }

  /**
   * Crear nueva migración
   */
  async createMigration(name, options = {}) {
    try {
      // Crear directorio de migraciones si no existe
      await fs.mkdir(this.config.migrationsPath, { recursive: true });

      const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, "-")
        .replace("T", "_")
        .split(".")[0];
      const fileName = `${timestamp}_${name
        .replace(/\s+/g, "_")
        .toLowerCase()}.js`;
      const filePath = path.join(this.config.migrationsPath, fileName);

      const template = this._getMigrationTemplate(name, options);

      await fs.writeFile(filePath, template);

      console.log(`📄 Migración creada: ${fileName}`);

      this.emit("migrationCreated", {
        name: fileName,
        path: filePath,
      });

      return {
        name: fileName,
        path: filePath,
      };
    } catch (error) {
      console.error("❌ Error creando migración:", error.message);
      throw error;
    }
  }

  /**
   * Rollback de la última migración
   */
  async rollbackLast() {
    try {
      await this._acquireLock();

      console.log("🔄 Ejecutando rollback de la última migración...");

      const executedMigrations = await this._getExecutedMigrations();

      if (executedMigrations.length === 0) {
        console.log("ℹ️ No hay migraciones para hacer rollback");
        return null;
      }

      // Obtener la última migración ejecutada
      const lastMigration = executedMigrations[executedMigrations.length - 1];

      // Buscar el archivo de migración
      const migrationFiles = await this._getMigrationFiles();
      const migrationFile = migrationFiles.find(
        (f) => f.name === lastMigration.name
      );

      if (!migrationFile) {
        throw new Error(
          `Archivo de migración no encontrado: ${lastMigration.name}`
        );
      }

      console.log(`🔄 Haciendo rollback: ${lastMigration.name}`);

      const migration = await this._loadMigration(migrationFile.path);

      if (!migration.down) {
        throw new Error(
          `Migración ${lastMigration.name} no tiene método down() para rollback`
        );
      }

      const startTime = Date.now();

      // Ejecutar rollback
      await this._executeMigrationDown(migration);

      // Remover de la tabla de migraciones
      await this._removeMigrationRecord(lastMigration.name);

      const duration = Date.now() - startTime;

      console.log(
        `✅ Rollback completado: ${lastMigration.name} (${duration}ms)`
      );

      this.emit("migrationRolledBack", {
        name: lastMigration.name,
        duration,
      });

      return {
        name: lastMigration.name,
        duration,
        rolledBackAt: new Date(),
      };
    } finally {
      await this._releaseLock();
    }
  }

  /**
   * Rollback hasta una migración específica
   */
  async rollbackTo(targetMigration) {
    try {
      await this._acquireLock();

      console.log(`🔄 Ejecutando rollback hasta: ${targetMigration}`);

      const executedMigrations = await this._getExecutedMigrations();
      const targetIndex = executedMigrations.findIndex(
        (m) => m.name === targetMigration
      );

      if (targetIndex === -1) {
        throw new Error(`Migración objetivo no encontrada: ${targetMigration}`);
      }

      // Migraciones a revertir (en orden inverso)
      const migrationsToRollback = executedMigrations
        .slice(targetIndex + 1)
        .reverse();

      if (migrationsToRollback.length === 0) {
        console.log("ℹ️ No hay migraciones para hacer rollback");
        return [];
      }

      const results = [];

      for (const migrationRecord of migrationsToRollback) {
        try {
          const migrationFiles = await this._getMigrationFiles();
          const migrationFile = migrationFiles.find(
            (f) => f.name === migrationRecord.name
          );

          if (!migrationFile) {
            console.warn(
              `⚠️ Archivo de migración no encontrado: ${migrationRecord.name}`
            );
            continue;
          }

          console.log(`🔄 Revirtiendo: ${migrationRecord.name}`);

          const migration = await this._loadMigration(migrationFile.path);

          if (!migration.down) {
            throw new Error(
              `Migración ${migrationRecord.name} no tiene método down()`
            );
          }

          const startTime = Date.now();

          await this._executeMigrationDown(migration);
          await this._removeMigrationRecord(migrationRecord.name);

          const duration = Date.now() - startTime;

          results.push({
            name: migrationRecord.name,
            success: true,
            duration,
            rolledBackAt: new Date(),
          });

          console.log(`✅ Revertida: ${migrationRecord.name} (${duration}ms)`);
        } catch (error) {
          console.error(
            `❌ Error revirtiendo ${migrationRecord.name}:`,
            error.message
          );

          results.push({
            name: migrationRecord.name,
            success: false,
            error: error.message,
            rolledBackAt: new Date(),
          });

          // Detener en el primer error
          break;
        }
      }

      const successCount = results.filter((r) => r.success).length;
      console.log(
        `🎉 Rollbacks completados: ${successCount}/${results.length}`
      );

      return results;
    } finally {
      await this._releaseLock();
    }
  }

  /**
   * Obtener estado de las migraciones
   */
  async getStatus() {
    try {
      const executedMigrations = await this._getExecutedMigrations();
      const migrationFiles = await this._getMigrationFiles();

      const status = migrationFiles.map((file) => {
        const executed = executedMigrations.find((e) => e.name === file.name);

        return {
          name: file.name,
          path: file.path,
          executed: !!executed,
          executedAt: executed?.executed_at || executed?.executedAt,
          version: executed?.version,
        };
      });

      const pendingCount = status.filter((s) => !s.executed).length;
      const executedCount = status.filter((s) => s.executed).length;

      return {
        migrations: status,
        summary: {
          total: status.length,
          executed: executedCount,
          pending: pendingCount,
        },
      };
    } catch (error) {
      console.error(
        "❌ Error obteniendo estado de migraciones:",
        error.message
      );
      throw error;
    }
  }

  /**
   * Validar integridad de las migraciones
   */
  async validate() {
    try {
      const executedMigrations = await this._getExecutedMigrations();
      const migrationFiles = await this._getMigrationFiles();

      const issues = [];

      // Verificar migraciones ejecutadas sin archivo
      for (const executed of executedMigrations) {
        const file = migrationFiles.find((f) => f.name === executed.name);
        if (!file) {
          issues.push({
            type: "missing_file",
            migration: executed.name,
            message: "Migración ejecutada pero archivo no encontrado",
          });
        }
      }

      // Verificar archivos de migración
      for (const file of migrationFiles) {
        try {
          const migration = await this._loadMigration(file.path);

          if (!migration.up || typeof migration.up !== "function") {
            issues.push({
              type: "invalid_migration",
              migration: file.name,
              message: "Método up() no encontrado o no es función",
            });
          }
        } catch (error) {
          issues.push({
            type: "load_error",
            migration: file.name,
            message: `Error cargando migración: ${error.message}`,
          });
        }
      }

      return {
        valid: issues.length === 0,
        issues,
      };
    } catch (error) {
      console.error("❌ Error validando migraciones:", error.message);
      throw error;
    }
  }

  /**
   * Crear tabla de migraciones
   */
  async _createMigrationsTable() {
    try {
      const dbType = this.adapter.config?.type || "unknown";

      let createSQL;

      switch (dbType.toLowerCase()) {
        case "postgresql":
          createSQL = `
                        CREATE TABLE IF NOT EXISTS ${this.config.tableName} (
                            id SERIAL PRIMARY KEY,
                            name VARCHAR(255) NOT NULL UNIQUE,
                            executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                            version VARCHAR(50)
                        )
                    `;
          break;

        case "mysql":
          createSQL = `
                        CREATE TABLE IF NOT EXISTS ${this.config.tableName} (
                            id INT AUTO_INCREMENT PRIMARY KEY,
                            name VARCHAR(255) NOT NULL UNIQUE,
                            executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                            version VARCHAR(50)
                        )
                    `;
          break;

        case "mongodb":
          // MongoDB no necesita crear tabla explícitamente
          return;

        default:
          throw new Error(`Tipo de base de datos no soportado: ${dbType}`);
      }

      await this.adapter.query(createSQL);
    } catch (error) {
      console.error("❌ Error creando tabla de migraciones:", error.message);
      throw error;
    }
  }

  /**
   * Obtener migraciones ejecutadas
   */
  async _getExecutedMigrations() {
    try {
      const dbType = this.adapter.config?.type || "unknown";

      if (dbType.toLowerCase() === "mongodb") {
        const result = await this.adapter.query({
          collection: this.config.tableName,
          method: "find",
          query: {},
          sort: { executed_at: 1 },
        });
        return result || [];
      } else {
        const result = await this.adapter.query(
          `SELECT * FROM ${this.config.tableName} ORDER BY executed_at ASC`
        );
        return result.rows || result || [];
      }
    } catch (error) {
      // Si la tabla no existe, retornar array vacío
      if (
        error.message?.includes("does not exist") ||
        error.message?.includes("doesn't exist") ||
        error.code === "ER_NO_SUCH_TABLE" ||
        error.code === "42P01"
      ) {
        return [];
      }
      throw error;
    }
  }

  /**
   * Obtener archivos de migración
   */
  async _getMigrationFiles() {
    try {
      await fs.mkdir(this.config.migrationsPath, { recursive: true });

      const files = await fs.readdir(this.config.migrationsPath);

      const migrationFiles = files
        .filter((file) => file.endsWith(".js"))
        .sort()
        .map((file) => ({
          name: file,
          path: path.join(this.config.migrationsPath, file),
        }));

      return migrationFiles;
    } catch (error) {
      console.error("❌ Error leyendo archivos de migración:", error.message);
      throw error;
    }
  }

  /**
   * Cargar archivo de migración
   */
  async _loadMigration(filePath) {
    try {
      // Limpiar require cache para recargar el archivo
      delete require.cache[require.resolve(path.resolve(filePath))];

      const migration = require(path.resolve(filePath));

      // Validar estructura básica
      if (!migration.up || typeof migration.up !== "function") {
        throw new Error("Migración debe exportar función up()");
      }

      return {
        name: path.basename(filePath, ".js"),
        ...migration,
      };
    } catch (error) {
      console.error(`❌ Error cargando migración ${filePath}:`, error.message);
      throw error;
    }
  }

  /**
   * Ejecutar rollback de migración
   */
  async _executeMigrationDown(migration) {
    const dbType = this.adapter.config?.type || "unknown";

    if (dbType.toLowerCase() === "mongodb") {
      await migration.down(this.adapter.db);
    } else {
      await migration.down(this.adapter);
    }
  }

  /**
   * Remover registro de migración
   */
  async _removeMigrationRecord(migrationName) {
    const dbType = this.adapter.config?.type || "unknown";

    if (dbType.toLowerCase() === "mongodb") {
      await this.adapter.query({
        collection: this.config.tableName,
        method: "deleteOne",
        query: { name: migrationName },
      });
    } else {
      await this.adapter.query(
        `DELETE FROM ${this.config.tableName} WHERE name = ?`,
        [migrationName]
      );
    }
  }

  /**
   * Adquirir lock para evitar migraciones concurrentes
   */
  async _acquireLock() {
    const maxWaitTime = this.config.lockTimeout;
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      try {
        await fs.mkdir(this.config.migrationsPath, { recursive: true });

        // Intentar crear archivo de lock
        await fs.writeFile(this.lockFile, process.pid.toString(), {
          flag: "wx",
        });
        this.isLocked = true;
        return;
      } catch (error) {
        if (error.code === "EEXIST") {
          // Lock ya existe, verificar si el proceso sigue activo
          try {
            const lockPid = await fs.readFile(this.lockFile, "utf8");

            // Verificar si el proceso sigue corriendo
            try {
              process.kill(parseInt(lockPid), 0);
              // Proceso activo, esperar
              await new Promise((resolve) => setTimeout(resolve, 1000));
            } catch (error) {
              // Proceso no activo, remover lock stale
              await fs.unlink(this.lockFile);
            }
          } catch (error) {
            // Error leyendo lock file, intentar removerlo
            try {
              await fs.unlink(this.lockFile);
            } catch (error) {
              // Ignorar
            }
          }
        } else {
          throw error;
        }
      }
    }

    throw new Error(
      "No se pudo adquirir lock para migraciones. Timeout alcanzado."
    );
  }

  /**
   * Liberar lock
   */
  async _releaseLock() {
    if (this.isLocked) {
      try {
        await fs.unlink(this.lockFile);
        this.isLocked = false;
      } catch (error) {
        // Ignorar errores al liberar lock
      }
    }
  }

  /**
   * Obtener template de migración
   */
  _getMigrationTemplate(name, options = {}) {
    const dbType = this.adapter.config?.type || "unknown";

    let template = `/**
 * Migración: ${name}
 * Creada: ${new Date().toISOString()}
 */

`;

    if (dbType.toLowerCase() === "mongodb") {
      template += `module.exports = {
    /**
     * Ejecutar migración
     * @param {Object} db - Instancia de base de datos MongoDB
     */
    async up(db) {
        // TODO: Implementar migración
        // Ejemplo:
        // await db.collection('users').createIndex({ email: 1 }, { unique: true });
        
        console.log('Migración ${name} ejecutada');
    },

    /**
     * Revertir migración
     * @param {Object} db - Instancia de base de datos MongoDB
     */
    async down(db) {
        // TODO: Implementar rollback
        // Ejemplo:
        // await db.collection('users').dropIndex('email_1');
        
        console.log('Migración ${name} revertida');
    },

    version: '1.0.0'
};`;
    } else {
      template += `module.exports = {
    /**
     * Ejecutar migración
     * @param {Object} adapter - Adaptador de base de datos
     */
    async up(adapter) {
        // TODO: Implementar migración
        // Ejemplo SQL:
        // await adapter.query(\`
        //     CREATE TABLE users (
        //         id SERIAL PRIMARY KEY,
        //         email VARCHAR(255) UNIQUE NOT NULL,
        //         created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        //     )
        // \`);
        
        console.log('Migración ${name} ejecutada');
    },

    /**
     * Revertir migración
     * @param {Object} adapter - Adaptador de base de datos
     */
    async down(adapter) {
        // TODO: Implementar rollback
        // Ejemplo SQL:
        // await adapter.query('DROP TABLE IF EXISTS users');
        
        console.log('Migración ${name} revertida');
    },

    version: '1.0.0'
};`;
    }

    return template;
  }
}

module.exports = MigrationManager;
