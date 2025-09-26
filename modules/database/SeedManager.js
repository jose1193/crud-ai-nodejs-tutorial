/**
 * Seed Manager
 * Sistema para poblar la base de datos con datos de prueba
 */

const fs = require("fs").promises;
const path = require("path");
const EventEmitter = require("events");

class SeedManager extends EventEmitter {
  constructor(adapter, config = {}) {
    super();

    this.adapter = adapter;
    this.config = {
      seedsPath: config.seedsPath || "./seeds",
      tableName: config.tableName || "_seeds",
      environment: config.environment || "development",
      autoCreate: config.autoCreate !== false,
      batchSize: config.batchSize || 1000,
      ...config,
    };
  }

  /**
   * Ejecutar todos los seeds
   */
  async runAll(options = {}) {
    try {
      console.log("🌱 Ejecutando seeds...");

      // Crear tabla de seeds si no existe
      if (this.config.autoCreate) {
        await this._createSeedsTable();
      }

      // Obtener seeds ejecutados
      const executedSeeds = await this._getExecutedSeeds();

      // Obtener archivos de seed
      const seedFiles = await this._getSeedFiles();

      // Filtrar seeds según opciones
      let seedsToRun = seedFiles;

      if (!options.force) {
        seedsToRun = seedFiles.filter(
          (file) =>
            !executedSeeds.some((executed) => executed.name === file.name)
        );
      }

      if (options.only) {
        const onlySeeds = Array.isArray(options.only)
          ? options.only
          : [options.only];
        seedsToRun = seedsToRun.filter(
          (file) =>
            onlySeeds.includes(file.name) ||
            onlySeeds.includes(file.name.replace(".js", ""))
        );
      }

      if (seedsToRun.length === 0) {
        console.log("✅ No hay seeds para ejecutar");
        return [];
      }

      console.log(`📋 Ejecutando ${seedsToRun.length} seed(s)`);

      const results = [];

      for (const seedFile of seedsToRun) {
        try {
          console.log(`🌱 Ejecutando seed: ${seedFile.name}`);

          const seed = await this._loadSeed(seedFile.path);
          const startTime = Date.now();

          // Verificar entorno si está especificado
          if (
            seed.environments &&
            !seed.environments.includes(this.config.environment)
          ) {
            console.log(
              `⏭️ Seed ${seedFile.name} omitido (entorno: ${this.config.environment})`
            );
            continue;
          }

          await this._executeSeed(seed);

          // Registrar seed ejecutado
          if (!options.force) {
            await this._recordSeedExecution(seedFile.name, seed.version);
          }

          const duration = Date.now() - startTime;

          results.push({
            name: seedFile.name,
            success: true,
            duration,
            executedAt: new Date(),
          });

          console.log(`✅ Seed completado: ${seedFile.name} (${duration}ms)`);

          this.emit("seedExecuted", {
            name: seedFile.name,
            duration,
          });
        } catch (error) {
          console.error(`❌ Error en seed ${seedFile.name}:`, error.message);

          results.push({
            name: seedFile.name,
            success: false,
            error: error.message,
            executedAt: new Date(),
          });

          this.emit("seedFailed", {
            name: seedFile.name,
            error,
          });

          if (!options.continueOnError) {
            break;
          }
        }
      }

      const successCount = results.filter((r) => r.success).length;
      console.log(`🎉 Seeds completados: ${successCount}/${results.length}`);

      return results;
    } catch (error) {
      console.error("❌ Error ejecutando seeds:", error.message);
      throw error;
    }
  }

  /**
   * Ejecutar seed específico
   */
  async run(seedName, options = {}) {
    try {
      console.log(`🌱 Ejecutando seed específico: ${seedName}`);

      const seedFiles = await this._getSeedFiles();
      const seedFile = seedFiles.find(
        (f) =>
          f.name === seedName ||
          f.name === `${seedName}.js` ||
          f.name.replace(".js", "") === seedName
      );

      if (!seedFile) {
        throw new Error(`Seed no encontrado: ${seedName}`);
      }

      const seed = await this._loadSeed(seedFile.path);
      const startTime = Date.now();

      await this._executeSeed(seed);

      // Registrar seed ejecutado si no es forzado
      if (!options.force) {
        await this._recordSeedExecution(seedFile.name, seed.version);
      }

      const duration = Date.now() - startTime;

      console.log(`✅ Seed completado: ${seedFile.name} (${duration}ms)`);

      this.emit("seedExecuted", {
        name: seedFile.name,
        duration,
      });

      return {
        name: seedFile.name,
        success: true,
        duration,
        executedAt: new Date(),
      };
    } catch (error) {
      console.error(`❌ Error ejecutando seed ${seedName}:`, error.message);
      throw error;
    }
  }

  /**
   * Crear nuevo seed
   */
  async createSeed(name, options = {}) {
    try {
      // Crear directorio de seeds si no existe
      await fs.mkdir(this.config.seedsPath, { recursive: true });

      const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, "-")
        .replace("T", "_")
        .split(".")[0];
      const fileName = `${timestamp}_${name
        .replace(/\s+/g, "_")
        .toLowerCase()}.js`;
      const filePath = path.join(this.config.seedsPath, fileName);

      const template = this._getSeedTemplate(name, options);

      await fs.writeFile(filePath, template);

      console.log(`📄 Seed creado: ${fileName}`);

      this.emit("seedCreated", {
        name: fileName,
        path: filePath,
      });

      return {
        name: fileName,
        path: filePath,
      };
    } catch (error) {
      console.error("❌ Error creando seed:", error.message);
      throw error;
    }
  }

  /**
   * Limpiar datos de seeds (rollback)
   */
  async clean(seedName = null) {
    try {
      console.log("🧹 Limpiando datos de seeds...");

      let seedsToClean = [];

      if (seedName) {
        // Limpiar seed específico
        const executedSeeds = await this._getExecutedSeeds();
        const seedRecord = executedSeeds.find(
          (s) =>
            s.name === seedName ||
            s.name === `${seedName}.js` ||
            s.name.replace(".js", "") === seedName
        );

        if (!seedRecord) {
          throw new Error(`Seed no encontrado en registros: ${seedName}`);
        }

        seedsToClean = [seedRecord];
      } else {
        // Limpiar todos los seeds (en orden inverso)
        const executedSeeds = await this._getExecutedSeeds();
        seedsToClean = executedSeeds.reverse();
      }

      const results = [];

      for (const seedRecord of seedsToClean) {
        try {
          console.log(`🧹 Limpiando seed: ${seedRecord.name}`);

          const seedFiles = await this._getSeedFiles();
          const seedFile = seedFiles.find((f) => f.name === seedRecord.name);

          if (!seedFile) {
            console.warn(
              `⚠️ Archivo de seed no encontrado: ${seedRecord.name}`
            );
            // Remover registro sin limpiar datos
            await this._removeSeedRecord(seedRecord.name);
            continue;
          }

          const seed = await this._loadSeed(seedFile.path);

          if (!seed.down) {
            console.warn(
              `⚠️ Seed ${seedRecord.name} no tiene método down() para limpieza`
            );
            continue;
          }

          const startTime = Date.now();

          await this._executeSeedDown(seed);
          await this._removeSeedRecord(seedRecord.name);

          const duration = Date.now() - startTime;

          results.push({
            name: seedRecord.name,
            success: true,
            duration,
            cleanedAt: new Date(),
          });

          console.log(`✅ Seed limpiado: ${seedRecord.name} (${duration}ms)`);
        } catch (error) {
          console.error(
            `❌ Error limpiando seed ${seedRecord.name}:`,
            error.message
          );

          results.push({
            name: seedRecord.name,
            success: false,
            error: error.message,
            cleanedAt: new Date(),
          });
        }
      }

      const successCount = results.filter((r) => r.success).length;
      console.log(`🎉 Seeds limpiados: ${successCount}/${results.length}`);

      return results;
    } catch (error) {
      console.error("❌ Error limpiando seeds:", error.message);
      throw error;
    }
  }

  /**
   * Obtener estado de los seeds
   */
  async getStatus() {
    try {
      const executedSeeds = await this._getExecutedSeeds();
      const seedFiles = await this._getSeedFiles();

      const status = seedFiles.map((file) => {
        const executed = executedSeeds.find((e) => e.name === file.name);

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
        seeds: status,
        summary: {
          total: status.length,
          executed: executedCount,
          pending: pendingCount,
          environment: this.config.environment,
        },
      };
    } catch (error) {
      console.error("❌ Error obteniendo estado de seeds:", error.message);
      throw error;
    }
  }

  /**
   * Generar datos de prueba usando factories
   */
  generateTestData(model, count = 10, overrides = {}) {
    const factories = {
      user: () => ({
        id: this._generateId(),
        name: this._generateName(),
        email: this._generateEmail(),
        age: this._randomInt(18, 80),
        active: Math.random() > 0.3,
        createdAt: new Date(),
        ...overrides,
      }),

      product: () => ({
        id: this._generateId(),
        name: this._generateProductName(),
        price: parseFloat((Math.random() * 1000).toFixed(2)),
        category: this._randomChoice([
          "electronics",
          "clothing",
          "books",
          "home",
        ]),
        inStock: Math.random() > 0.2,
        createdAt: new Date(),
        ...overrides,
      }),

      order: () => ({
        id: this._generateId(),
        userId: this._generateId(),
        total: parseFloat((Math.random() * 500).toFixed(2)),
        status: this._randomChoice(["pending", "completed", "cancelled"]),
        items: this._randomInt(1, 5),
        createdAt: new Date(),
        ...overrides,
      }),
    };

    const factory = factories[model.toLowerCase()];
    if (!factory) {
      throw new Error(`Factory no encontrado para modelo: ${model}`);
    }

    return Array.from({ length: count }, () => factory());
  }

  /**
   * Crear tabla de seeds
   */
  async _createSeedsTable() {
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
                            version VARCHAR(50),
                            environment VARCHAR(50)
                        )
                    `;
          break;

        case "mysql":
          createSQL = `
                        CREATE TABLE IF NOT EXISTS ${this.config.tableName} (
                            id INT AUTO_INCREMENT PRIMARY KEY,
                            name VARCHAR(255) NOT NULL UNIQUE,
                            executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                            version VARCHAR(50),
                            environment VARCHAR(50)
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
      console.error("❌ Error creando tabla de seeds:", error.message);
      throw error;
    }
  }

  /**
   * Obtener seeds ejecutados
   */
  async _getExecutedSeeds() {
    try {
      const dbType = this.adapter.config?.type || "unknown";

      if (dbType.toLowerCase() === "mongodb") {
        const result = await this.adapter.query({
          collection: this.config.tableName,
          method: "find",
          query: { environment: this.config.environment },
          sort: { executed_at: 1 },
        });
        return result || [];
      } else {
        const result = await this.adapter.query(
          `SELECT * FROM ${this.config.tableName} WHERE environment = ? ORDER BY executed_at ASC`,
          [this.config.environment]
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
   * Obtener archivos de seed
   */
  async _getSeedFiles() {
    try {
      await fs.mkdir(this.config.seedsPath, { recursive: true });

      const files = await fs.readdir(this.config.seedsPath);

      const seedFiles = files
        .filter((file) => file.endsWith(".js"))
        .sort()
        .map((file) => ({
          name: file,
          path: path.join(this.config.seedsPath, file),
        }));

      return seedFiles;
    } catch (error) {
      console.error("❌ Error leyendo archivos de seed:", error.message);
      throw error;
    }
  }

  /**
   * Cargar archivo de seed
   */
  async _loadSeed(filePath) {
    try {
      // Limpiar require cache
      delete require.cache[require.resolve(path.resolve(filePath))];

      const seed = require(path.resolve(filePath));

      if (!seed.run && !seed.up) {
        throw new Error("Seed debe exportar función run() o up()");
      }

      return {
        name: path.basename(filePath, ".js"),
        ...seed,
      };
    } catch (error) {
      console.error(`❌ Error cargando seed ${filePath}:`, error.message);
      throw error;
    }
  }

  /**
   * Ejecutar seed
   */
  async _executeSeed(seed) {
    const dbType = this.adapter.config?.type || "unknown";

    if (dbType.toLowerCase() === "mongodb") {
      if (seed.run) {
        await seed.run(this.adapter.db, this);
      } else {
        await seed.up(this.adapter.db, this);
      }
    } else {
      if (seed.run) {
        await seed.run(this.adapter, this);
      } else {
        await seed.up(this.adapter, this);
      }
    }
  }

  /**
   * Ejecutar limpieza de seed
   */
  async _executeSeedDown(seed) {
    const dbType = this.adapter.config?.type || "unknown";

    if (dbType.toLowerCase() === "mongodb") {
      await seed.down(this.adapter.db, this);
    } else {
      await seed.down(this.adapter, this);
    }
  }

  /**
   * Registrar ejecución de seed
   */
  async _recordSeedExecution(seedName, version = "1.0.0") {
    const dbType = this.adapter.config?.type || "unknown";

    if (dbType.toLowerCase() === "mongodb") {
      await this.adapter.query({
        collection: this.config.tableName,
        method: "insertOne",
        query: {
          name: seedName,
          executed_at: new Date(),
          version,
          environment: this.config.environment,
        },
      });
    } else {
      await this.adapter.query(
        `INSERT INTO ${this.config.tableName} (name, version, environment) VALUES (?, ?, ?)`,
        [seedName, version, this.config.environment]
      );
    }
  }

  /**
   * Remover registro de seed
   */
  async _removeSeedRecord(seedName) {
    const dbType = this.adapter.config?.type || "unknown";

    if (dbType.toLowerCase() === "mongodb") {
      await this.adapter.query({
        collection: this.config.tableName,
        method: "deleteOne",
        query: {
          name: seedName,
          environment: this.config.environment,
        },
      });
    } else {
      await this.adapter.query(
        `DELETE FROM ${this.config.tableName} WHERE name = ? AND environment = ?`,
        [seedName, this.config.environment]
      );
    }
  }

  /**
   * Template de seed
   */
  _getSeedTemplate(name, options = {}) {
    const dbType = this.adapter.config?.type || "unknown";

    let template = `/**
 * Seed: ${name}
 * Entorno: ${this.config.environment}
 * Creado: ${new Date().toISOString()}
 */

`;

    if (dbType.toLowerCase() === "mongodb") {
      template += `module.exports = {
    /**
     * Ejecutar seed
     * @param {Object} db - Instancia de base de datos MongoDB
     * @param {Object} seedManager - Instancia del SeedManager
     */
    async run(db, seedManager) {
        console.log('Ejecutando seed: ${name}');
        
        // TODO: Implementar seed
        // Ejemplo:
        // const users = seedManager.generateTestData('user', 10);
        // await db.collection('users').insertMany(users);
    },

    /**
     * Limpiar datos del seed
     * @param {Object} db - Instancia de base de datos MongoDB
     * @param {Object} seedManager - Instancia del SeedManager
     */
    async down(db, seedManager) {
        console.log('Limpiando seed: ${name}');
        
        // TODO: Implementar limpieza
        // Ejemplo:
        // await db.collection('users').deleteMany({});
    },

    // Entornos donde se puede ejecutar este seed
    environments: ['development', 'testing'],
    
    version: '1.0.0'
};`;
    } else {
      template += `module.exports = {
    /**
     * Ejecutar seed
     * @param {Object} adapter - Adaptador de base de datos
     * @param {Object} seedManager - Instancia del SeedManager
     */
    async run(adapter, seedManager) {
        console.log('Ejecutando seed: ${name}');
        
        // TODO: Implementar seed
        // Ejemplo:
        // const users = seedManager.generateTestData('user', 10);
        // for (const user of users) {
        //     await adapter.query(
        //         'INSERT INTO users (name, email, age) VALUES (?, ?, ?)',
        //         [user.name, user.email, user.age]
        //     );
        // }
    },

    /**
     * Limpiar datos del seed
     * @param {Object} adapter - Adaptador de base de datos
     * @param {Object} seedManager - Instancia del SeedManager
     */
    async down(adapter, seedManager) {
        console.log('Limpiando seed: ${name}');
        
        // TODO: Implementar limpieza
        // Ejemplo:
        // await adapter.query('TRUNCATE TABLE users');
    },

    // Entornos donde se puede ejecutar este seed
    environments: ['development', 'testing'],
    
    version: '1.0.0'
};`;
    }

    return template;
  }

  // Utilidades para generar datos de prueba
  _generateId() {
    return Math.random().toString(36).substr(2, 9);
  }

  _generateName() {
    const firstNames = [
      "Ana",
      "Carlos",
      "María",
      "José",
      "Laura",
      "Pedro",
      "Carmen",
      "Antonio",
    ];
    const lastNames = [
      "García",
      "Rodríguez",
      "González",
      "Fernández",
      "López",
      "Martínez",
    ];

    return `${this._randomChoice(firstNames)} ${this._randomChoice(lastNames)}`;
  }

  _generateEmail() {
    const domains = ["example.com", "test.com", "demo.org"];
    const name = Math.random().toString(36).substr(2, 8);
    return `${name}@${this._randomChoice(domains)}`;
  }

  _generateProductName() {
    const adjectives = [
      "Premium",
      "Deluxe",
      "Professional",
      "Advanced",
      "Basic",
    ];
    const products = ["Widget", "Gadget", "Tool", "Device", "Component"];

    return `${this._randomChoice(adjectives)} ${this._randomChoice(products)}`;
  }

  _randomChoice(array) {
    return array[Math.floor(Math.random() * array.length)];
  }

  _randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}

module.exports = SeedManager;
