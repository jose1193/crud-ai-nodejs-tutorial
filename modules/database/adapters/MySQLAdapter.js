/**
 * Adaptador para MySQL
 * Implementa todas las funcionalidades para MySQL
 */

const BaseAdapter = require("./BaseAdapter");
const mysql = require("mysql2/promise");
const fs = require("fs").promises;
const path = require("path");
const { spawn } = require("child_process");

class MySQLAdapter extends BaseAdapter {
  constructor(config) {
    super(config);
    this.pool = null;

    // Configuración específica de MySQL
    this.mysqlConfig = {
      host: config.host,
      port: config.port || 3306,
      database: config.database,
      user: config.username,
      password: config.password,
      connectionLimit: config.maxPoolSize || 10,
      acquireTimeout: config.connectionTimeout || 10000,
      timeout: config.queryTimeout || 30000,
      ssl: config.ssl || false,
      charset: config.charset || "utf8mb4",
      timezone: config.timezone || "local",
      ...config.mysqlOptions,
    };
  }

  /**
   * Conectar a MySQL
   */
  async connect() {
    try {
      this._log("info", "Conectando a MySQL...", {
        host: this.config.host,
        database: this.config.database,
      });

      this.pool = mysql.createPool(this.mysqlConfig);

      // Probar conexión
      const connection = await this.pool.getConnection();
      connection.release();

      this.isConnected = true;
      this.emit("connected");

      this._log("info", "Conectado exitosamente a MySQL");
    } catch (error) {
      this.isConnected = false;
      const normalizedError = this._normalizeError(error, "connect");
      this.emit("error", normalizedError);
      throw normalizedError;
    }
  }

  /**
   * Desconectar de MySQL
   */
  async disconnect() {
    try {
      if (this.pool) {
        await this.pool.end();
        this.pool = null;
      }

      this.isConnected = false;
      this.emit("disconnected");

      this._log("info", "Desconectado de MySQL");
    } catch (error) {
      const normalizedError = this._normalizeError(error, "disconnect");
      this.emit("error", normalizedError);
      throw normalizedError;
    }
  }

  /**
   * Ejecutar query en MySQL
   */
  async query(sql, params = [], options = {}) {
    if (!this.isConnectionActive()) {
      throw new Error("No hay conexión activa a MySQL");
    }

    try {
      const [rows, fields] = await this.pool.execute(sql, params);

      return {
        rows: rows,
        fields: fields,
        affectedRows: rows.affectedRows,
        insertId: rows.insertId,
        changedRows: rows.changedRows,
      };
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
      throw new Error("No hay conexión activa a MySQL");
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
   * Obtener estadísticas de MySQL
   */
  async getStats() {
    if (!this.isConnectionActive()) {
      throw new Error("No hay conexión activa a MySQL");
    }

    try {
      // Información del servidor
      const versionResult = await this.query("SELECT VERSION() as version");

      // Estadísticas de la base de datos
      const dbStatsQuery = `
                SELECT 
                    table_schema as database_name,
                    COUNT(*) as table_count,
                    SUM(data_length + index_length) as total_size,
                    SUM(data_length) as data_size,
                    SUM(index_length) as index_size
                FROM information_schema.tables 
                WHERE table_schema = ?
                GROUP BY table_schema
            `;
      const dbStats = await this.query(dbStatsQuery, [this.config.database]);

      // Estadísticas de conexiones
      const connStatsQuery = `
                SELECT 
                    VARIABLE_NAME, VARIABLE_VALUE
                FROM information_schema.GLOBAL_STATUS 
                WHERE VARIABLE_NAME IN (
                    'Threads_connected', 'Threads_running', 
                    'Max_used_connections', 'Connections'
                )
            `;
      const connStatsResult = await this.query(connStatsQuery);

      const connectionStats = {};
      connStatsResult.rows.forEach((row) => {
        connectionStats[row.VARIABLE_NAME] = parseInt(row.VARIABLE_VALUE);
      });

      // Estadísticas de queries
      const queryStatsQuery = `
                SELECT 
                    VARIABLE_NAME, VARIABLE_VALUE
                FROM information_schema.GLOBAL_STATUS 
                WHERE VARIABLE_NAME IN (
                    'Queries', 'Questions', 'Slow_queries',
                    'Com_select', 'Com_insert', 'Com_update', 'Com_delete'
                )
            `;
      const queryStatsResult = await this.query(queryStatsQuery);

      const queryStats = {};
      queryStatsResult.rows.forEach((row) => {
        queryStats[row.VARIABLE_NAME] = parseInt(row.VARIABLE_VALUE);
      });

      return {
        database: this.config.database,
        version: versionResult.rows[0].version,
        tables: dbStats.rows[0]?.table_count || 0,
        totalSize: dbStats.rows[0]?.total_size || 0,
        dataSize: dbStats.rows[0]?.data_size || 0,
        indexSize: dbStats.rows[0]?.index_size || 0,
        connections: connectionStats,
        queries: queryStats,
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
      throw new Error("No hay conexión activa a MySQL");
    }

    let connection = null;

    try {
      connection = await this.pool.getConnection();
      await connection.beginTransaction();

      try {
        const result = await callback(connection);
        await connection.commit();
        return result;
      } catch (error) {
        await connection.rollback();
        throw error;
      }
    } catch (error) {
      const normalizedError = this._normalizeError(error, "transaction");
      throw normalizedError;
    } finally {
      if (connection) {
        connection.release();
      }
    }
  }

  /**
   * Crear backup de MySQL usando mysqldump
   */
  async createBackup(options = {}) {
    if (!this.isConnectionActive()) {
      throw new Error("No hay conexión activa a MySQL");
    }

    try {
      const backupDir = options.path || path.join(process.cwd(), "backups");
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const backupFile = path.join(backupDir, `mysql-backup-${timestamp}.sql`);

      // Crear directorio de backup si no existe
      await fs.mkdir(backupDir, { recursive: true });

      const dumpArgs = [
        `-h${this.config.host}`,
        `-P${this.config.port}`,
        `-u${this.config.username}`,
        `-p${this.config.password}`,
        "--single-transaction",
        "--routines",
        "--triggers",
        "--add-drop-table",
        "--extended-insert",
        "--create-options",
      ];

      // Agregar opciones adicionales
      if (options.noData) {
        dumpArgs.push("--no-data");
      }
      if (options.dataOnly) {
        dumpArgs.push("--no-create-info");
      }
      if (options.compact) {
        dumpArgs.push("--compact");
      }

      dumpArgs.push(this.config.database);

      return new Promise((resolve, reject) => {
        const mysqldump = spawn("mysqldump", dumpArgs);
        const writeStream = require("fs").createWriteStream(backupFile);

        mysqldump.stdout.pipe(writeStream);

        let errorOutput = "";
        mysqldump.stderr.on("data", (data) => {
          errorOutput += data.toString();
        });

        mysqldump.on("close", async (code) => {
          writeStream.end();

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
              new Error(`mysqldump falló con código ${code}: ${errorOutput}`)
            );
          }
        });

        mysqldump.on("error", (error) => {
          reject(new Error(`Error ejecutando mysqldump: ${error.message}`));
        });
      });
    } catch (error) {
      const normalizedError = this._normalizeError(error, "createBackup");
      throw normalizedError;
    }
  }

  /**
   * Restaurar backup de MySQL usando mysql client
   */
  async restoreBackup(backupPath, options = {}) {
    if (!this.isConnectionActive()) {
      throw new Error("No hay conexión activa a MySQL");
    }

    try {
      this._log("info", "Iniciando restauración de backup", {
        path: backupPath,
      });

      const mysqlArgs = [
        `-h${this.config.host}`,
        `-P${this.config.port}`,
        `-u${this.config.username}`,
        `-p${this.config.password}`,
        this.config.database,
      ];

      return new Promise((resolve, reject) => {
        const mysql = spawn("mysql", mysqlArgs);
        const readStream = require("fs").createReadStream(backupPath);

        readStream.pipe(mysql.stdin);

        let errorOutput = "";
        mysql.stderr.on("data", (data) => {
          errorOutput += data.toString();
          this._log("debug", "mysql output", { output: data.toString() });
        });

        mysql.on("close", async (code) => {
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
            reject(new Error(`mysql falló con código ${code}: ${errorOutput}`));
          }
        });

        mysql.on("error", (error) => {
          reject(new Error(`Error ejecutando mysql: ${error.message}`));
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
      throw new Error("No hay conexión activa a MySQL");
    }

    try {
      // Obtener tablas
      const tablesQuery = `
                SELECT 
                    table_name, table_type, engine, table_rows, 
                    data_length, index_length, table_comment
                FROM information_schema.tables 
                WHERE table_schema = ?
                ORDER BY table_name
            `;
      const tables = await this.query(tablesQuery, [this.config.database]);

      const schema = {};

      for (const table of tables.rows) {
        const tableName = table.table_name;

        // Obtener columnas
        const columnsQuery = `
                    SELECT 
                        column_name, data_type, is_nullable, column_default,
                        character_maximum_length, numeric_precision, numeric_scale,
                        column_key, extra, column_comment
                    FROM information_schema.columns 
                    WHERE table_schema = ? AND table_name = ?
                    ORDER BY ordinal_position
                `;
        const columns = await this.query(columnsQuery, [
          this.config.database,
          tableName,
        ]);

        // Obtener índices
        const indexesQuery = `
                    SELECT 
                        index_name, column_name, seq_in_index, non_unique,
                        index_type, comment
                    FROM information_schema.statistics 
                    WHERE table_schema = ? AND table_name = ?
                    ORDER BY index_name, seq_in_index
                `;
        const indexes = await this.query(indexesQuery, [
          this.config.database,
          tableName,
        ]);

        // Obtener llaves foráneas
        const fkQuery = `
                    SELECT 
                        constraint_name, column_name, referenced_table_name,
                        referenced_column_name, update_rule, delete_rule
                    FROM information_schema.key_column_usage 
                    WHERE table_schema = ? AND table_name = ? 
                        AND referenced_table_name IS NOT NULL
                `;
        const foreignKeys = await this.query(fkQuery, [
          this.config.database,
          tableName,
        ]);

        schema[tableName] = {
          type: table.table_type,
          engine: table.engine,
          rows: table.table_rows,
          dataSize: table.data_length,
          indexSize: table.index_length,
          comment: table.table_comment,
          columns: columns.rows,
          indexes: this._groupIndexes(indexes.rows),
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
      throw new Error("No hay conexión activa a MySQL");
    }

    try {
      this._log("info", "Ejecutando migración", { name: migration.name });

      // Crear tabla de migraciones si no existe
      await this.query(`
                CREATE TABLE IF NOT EXISTS _migrations (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    name VARCHAR(255) NOT NULL UNIQUE,
                    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    version VARCHAR(50)
                )
            `);

      // Ejecutar la migración en una transacción
      await this.transaction(async (connection) => {
        // Ejecutar la función de migración
        await migration.up(connection);

        // Registrar migración ejecutada
        await connection.execute(
          "INSERT INTO _migrations (name, version) VALUES (?, ?)",
          [migration.name, migration.version || "1.0.0"]
        );
      });

      this._log("info", "Migración completada", { name: migration.name });
    } catch (error) {
      const normalizedError = this._normalizeError(error, "executeMigration");
      throw normalizedError;
    }
  }

  /**
   * Agrupar índices por nombre
   */
  _groupIndexes(indexes) {
    const grouped = {};

    indexes.forEach((index) => {
      if (!grouped[index.index_name]) {
        grouped[index.index_name] = {
          name: index.index_name,
          unique: index.non_unique === 0,
          type: index.index_type,
          comment: index.comment,
          columns: [],
        };
      }

      grouped[index.index_name].columns.push({
        name: index.column_name,
        position: index.seq_in_index,
      });
    });

    return Object.values(grouped);
  }
}

module.exports = MySQLAdapter;
