/**
 * Adaptador para PostgreSQL
 * Implementa todas las funcionalidades para PostgreSQL
 */

const BaseAdapter = require("./BaseAdapter");
const { Pool, Client } = require("pg");
const fs = require("fs").promises;
const path = require("path");
const { spawn } = require("child_process");

class PostgreSQLAdapter extends BaseAdapter {
  constructor(config) {
    super(config);
    this.pool = null;

    // Configuración específica de PostgreSQL
    this.pgConfig = {
      host: config.host,
      port: config.port || 5432,
      database: config.database,
      user: config.username,
      password: config.password,
      max: config.maxPoolSize || 10,
      idleTimeoutMillis: config.idleTimeout || 30000,
      connectionTimeoutMillis: config.connectionTimeout || 10000,
      statement_timeout: config.queryTimeout || 30000,
      ssl: config.ssl || false,
      ...config.pgOptions,
    };
  }

  /**
   * Conectar a PostgreSQL
   */
  async connect() {
    try {
      this._log("info", "Conectando a PostgreSQL...", {
        host: this.config.host,
        database: this.config.database,
      });

      this.pool = new Pool(this.pgConfig);

      // Probar conexión
      const client = await this.pool.connect();
      client.release();

      this.isConnected = true;
      this.emit("connected");

      this._log("info", "Conectado exitosamente a PostgreSQL");
    } catch (error) {
      this.isConnected = false;
      const normalizedError = this._normalizeError(error, "connect");
      this.emit("error", normalizedError);
      throw normalizedError;
    }
  }

  /**
   * Desconectar de PostgreSQL
   */
  async disconnect() {
    try {
      if (this.pool) {
        await this.pool.end();
        this.pool = null;
      }

      this.isConnected = false;
      this.emit("disconnected");

      this._log("info", "Desconectado de PostgreSQL");
    } catch (error) {
      const normalizedError = this._normalizeError(error, "disconnect");
      this.emit("error", normalizedError);
      throw normalizedError;
    }
  }

  /**
   * Ejecutar query en PostgreSQL
   */
  async query(sql, params = [], options = {}) {
    if (!this.isConnectionActive()) {
      throw new Error("No hay conexión activa a PostgreSQL");
    }

    let client = null;

    try {
      client = await this.pool.connect();

      // Configurar timeout si se especifica
      if (options.timeout) {
        await client.query(`SET statement_timeout = ${options.timeout}`);
      }

      const result = await client.query(sql, params);

      return {
        rows: result.rows,
        rowCount: result.rowCount,
        command: result.command,
        fields: result.fields,
      };
    } catch (error) {
      const normalizedError = this._normalizeError(error, "query");
      this.emit("error", normalizedError);
      throw normalizedError;
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  /**
   * Verificar conexión
   */
  async ping() {
    if (!this.isConnectionActive()) {
      throw new Error("No hay conexión activa a PostgreSQL");
    }

    try {
      const result = await this.query("SELECT 1 as ping");
      return result.rows[0].ping === 1;
    } catch (error) {
      const normalizedError = this._normalizeError(error, "ping");
      throw normalizedError;
    }
  }

  /**
   * Obtener estadísticas de PostgreSQL
   */
  async getStats() {
    if (!this.isConnectionActive()) {
      throw new Error("No hay conexión activa a PostgreSQL");
    }

    try {
      // Estadísticas de la base de datos
      const dbStatsQuery = `
                SELECT 
                    pg_database_size(current_database()) as db_size,
                    (SELECT count(*) FROM information_schema.tables 
                     WHERE table_schema = 'public') as table_count,
                    version() as version
            `;
      const dbStats = await this.query(dbStatsQuery);

      // Estadísticas de conexiones
      const connStatsQuery = `
                SELECT 
                    count(*) as total_connections,
                    count(*) FILTER (WHERE state = 'active') as active_connections,
                    count(*) FILTER (WHERE state = 'idle') as idle_connections
                FROM pg_stat_activity 
                WHERE datname = current_database()
            `;
      const connStats = await this.query(connStatsQuery);

      // Estadísticas de actividad
      const activityQuery = `
                SELECT 
                    tup_returned, tup_fetched, tup_inserted, 
                    tup_updated, tup_deleted, conflicts, deadlocks
                FROM pg_stat_database 
                WHERE datname = current_database()
            `;
      const activityStats = await this.query(activityQuery);

      return {
        database: this.config.database,
        size: dbStats.rows[0].db_size,
        tables: dbStats.rows[0].table_count,
        version: dbStats.rows[0].version,
        connections: connStats.rows[0],
        activity: activityStats.rows[0],
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
      throw new Error("No hay conexión activa a PostgreSQL");
    }

    let client = null;

    try {
      client = await this.pool.connect();

      await client.query("BEGIN");

      try {
        const result = await callback(client);
        await client.query("COMMIT");
        return result;
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    } catch (error) {
      const normalizedError = this._normalizeError(error, "transaction");
      throw normalizedError;
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  /**
   * Crear backup de PostgreSQL usando pg_dump
   */
  async createBackup(options = {}) {
    if (!this.isConnectionActive()) {
      throw new Error("No hay conexión activa a PostgreSQL");
    }

    try {
      const backupDir = options.path || path.join(process.cwd(), "backups");
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const backupFile = path.join(
        backupDir,
        `postgresql-backup-${timestamp}.sql`
      );

      // Crear directorio de backup si no existe
      await fs.mkdir(backupDir, { recursive: true });

      const dumpArgs = [
        "-h",
        this.config.host,
        "-p",
        this.config.port.toString(),
        "-U",
        this.config.username,
        "-d",
        this.config.database,
        "-f",
        backupFile,
        "--verbose",
        "--clean",
        "--create",
      ];

      // Agregar opciones adicionales
      if (options.dataOnly) {
        dumpArgs.push("--data-only");
      }
      if (options.schemaOnly) {
        dumpArgs.push("--schema-only");
      }
      if (options.noOwner) {
        dumpArgs.push("--no-owner");
      }

      return new Promise((resolve, reject) => {
        const pgDump = spawn("pg_dump", dumpArgs, {
          env: { ...process.env, PGPASSWORD: this.config.password },
        });

        let errorOutput = "";

        pgDump.stderr.on("data", (data) => {
          errorOutput += data.toString();
          this._log("debug", "pg_dump output", { output: data.toString() });
        });

        pgDump.on("close", async (code) => {
          if (code === 0) {
            // Crear metadata del backup
            const stats = await fs.stat(backupFile);
            const metadata = {
              database: this.config.database,
              timestamp: new Date().toISOString(),
              size: stats.size,
              type: "full",
              options: options,
            };

            await fs.writeFile(
              backupFile.replace(".sql", ".metadata.json"),
              JSON.stringify(metadata, null, 2)
            );

            this._log("info", "Backup completado", {
              file: backupFile,
              size: stats.size,
            });

            resolve({
              path: backupFile,
              metadata,
            });
          } else {
            reject(
              new Error(`pg_dump falló con código ${code}: ${errorOutput}`)
            );
          }
        });

        pgDump.on("error", (error) => {
          reject(new Error(`Error ejecutando pg_dump: ${error.message}`));
        });
      });
    } catch (error) {
      const normalizedError = this._normalizeError(error, "createBackup");
      throw normalizedError;
    }
  }

  /**
   * Restaurar backup de PostgreSQL usando psql
   */
  async restoreBackup(backupPath, options = {}) {
    if (!this.isConnectionActive()) {
      throw new Error("No hay conexión activa a PostgreSQL");
    }

    try {
      this._log("info", "Iniciando restauración de backup", {
        path: backupPath,
      });

      const psqlArgs = [
        "-h",
        this.config.host,
        "-p",
        this.config.port.toString(),
        "-U",
        this.config.username,
        "-d",
        this.config.database,
        "-f",
        backupPath,
        "--verbose",
      ];

      if (options.singleTransaction) {
        psqlArgs.push("--single-transaction");
      }

      return new Promise((resolve, reject) => {
        const psql = spawn("psql", psqlArgs, {
          env: { ...process.env, PGPASSWORD: this.config.password },
        });

        let errorOutput = "";

        psql.stderr.on("data", (data) => {
          errorOutput += data.toString();
          this._log("debug", "psql output", { output: data.toString() });
        });

        psql.on("close", async (code) => {
          if (code === 0) {
            // Leer metadata si existe
            let metadata = {};
            const metadataPath = backupPath.replace(".sql", ".metadata.json");

            try {
              const metadataContent = await fs.readFile(metadataPath, "utf8");
              metadata = JSON.parse(metadataContent);
            } catch (error) {
              // Metadata no disponible
            }

            this._log("info", "Restauración completada", { path: backupPath });

            resolve({ metadata });
          } else {
            reject(new Error(`psql falló con código ${code}: ${errorOutput}`));
          }
        });

        psql.on("error", (error) => {
          reject(new Error(`Error ejecutando psql: ${error.message}`));
        });
      });
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
      throw new Error("No hay conexión activa a PostgreSQL");
    }

    try {
      // Obtener tablas
      const tablesQuery = `
                SELECT 
                    table_name, table_type, table_schema
                FROM information_schema.tables 
                WHERE table_schema = 'public'
                ORDER BY table_name
            `;
      const tables = await this.query(tablesQuery);

      const schema = {};

      for (const table of tables.rows) {
        const tableName = table.table_name;

        // Obtener columnas
        const columnsQuery = `
                    SELECT 
                        column_name, data_type, is_nullable, 
                        column_default, character_maximum_length
                    FROM information_schema.columns 
                    WHERE table_schema = 'public' AND table_name = $1
                    ORDER BY ordinal_position
                `;
        const columns = await this.query(columnsQuery, [tableName]);

        // Obtener índices
        const indexesQuery = `
                    SELECT 
                        indexname, indexdef
                    FROM pg_indexes 
                    WHERE schemaname = 'public' AND tablename = $1
                `;
        const indexes = await this.query(indexesQuery, [tableName]);

        // Obtener llaves foráneas
        const fkQuery = `
                    SELECT 
                        tc.constraint_name, kcu.column_name,
                        ccu.table_name AS foreign_table_name,
                        ccu.column_name AS foreign_column_name
                    FROM information_schema.table_constraints AS tc
                    JOIN information_schema.key_column_usage AS kcu
                        ON tc.constraint_name = kcu.constraint_name
                    JOIN information_schema.constraint_column_usage AS ccu
                        ON ccu.constraint_name = tc.constraint_name
                    WHERE tc.constraint_type = 'FOREIGN KEY' 
                        AND tc.table_name = $1
                `;
        const foreignKeys = await this.query(fkQuery, [tableName]);

        schema[tableName] = {
          type: table.table_type,
          schema: table.table_schema,
          columns: columns.rows,
          indexes: indexes.rows,
          foreignKeys: foreignKeys.rows,
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
      throw new Error("No hay conexión activa a PostgreSQL");
    }

    try {
      this._log("info", "Ejecutando migración", { name: migration.name });

      // Crear tabla de migraciones si no existe
      await this.query(`
                CREATE TABLE IF NOT EXISTS _migrations (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(255) NOT NULL UNIQUE,
                    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    version VARCHAR(50)
                )
            `);

      // Ejecutar la migración en una transacción
      await this.transaction(async (client) => {
        // Ejecutar la función de migración
        await migration.up(client);

        // Registrar migración ejecutada
        await client.query(
          "INSERT INTO _migrations (name, version) VALUES ($1, $2)",
          [migration.name, migration.version || "1.0.0"]
        );
      });

      this._log("info", "Migración completada", { name: migration.name });
    } catch (error) {
      const normalizedError = this._normalizeError(error, "executeMigration");
      throw normalizedError;
    }
  }
}

module.exports = PostgreSQLAdapter;
