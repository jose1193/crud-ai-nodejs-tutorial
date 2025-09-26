/**
 * Ejemplos de uso del módulo de base de datos
 * Demuestra todas las funcionalidades principales
 */

const DatabaseManager = require("../modules/database");

// Configuraciones de ejemplo para diferentes bases de datos
const configs = {
  mongodb: {
    type: "mongodb",
    host: "localhost",
    port: 27017,
    database: "mi_app",
    username: "usuario",
    password: "contraseña",
    cache: {
      enabled: true,
      redis: { host: "localhost", port: 6379 },
    },
  },

  postgresql: {
    type: "postgresql",
    host: "localhost",
    port: 5432,
    database: "mi_app",
    username: "usuario",
    password: "contraseña",
    backup: {
      enabled: true,
      schedule: "0 2 * * *",
      path: "./backups/postgresql",
    },
  },

  mysql: {
    type: "mysql",
    host: "localhost",
    port: 3306,
    database: "mi_app",
    username: "usuario",
    password: "contraseña",
    monitoring: {
      enabled: true,
      slowQueryThreshold: 1000,
    },
  },
};

/**
 * Ejemplo 1: Configuración e inicialización básica
 */
async function ejemplo1_inicializacion() {
  console.log("=== Ejemplo 1: Inicialización ===");

  // Crear instancia del manager
  const db = new DatabaseManager(configs.postgresql);

  // Configurar event listeners
  db.on("connected", () => {
    console.log("✅ Base de datos conectada");
  });

  db.on("disconnected", () => {
    console.log("❌ Base de datos desconectada");
  });

  db.on("slowQuery", (data) => {
    console.log(
      `🐌 Query lenta: ${data.duration}ms - ${data.sql.substring(0, 50)}...`
    );
  });

  try {
    // Conectar
    await db.connect();

    // Health check
    const health = await db.healthCheck();
    console.log("Estado de salud:", health);

    // Estadísticas
    const stats = await db.getStats();
    console.log("Estadísticas:", stats);

    return db;
  } catch (error) {
    console.error("Error:", error.message);
    throw error;
  }
}

/**
 * Ejemplo 2: Query Builder básico
 */
async function ejemplo2_queryBuilder(db) {
  console.log("\n=== Ejemplo 2: Query Builder ===");

  const qb = db.getQueryBuilder();

  try {
    // SELECT básico
    const selectQuery = qb
      .select(["id", "name", "email", "created_at"])
      .from("users")
      .where("active", true)
      .orderBy("created_at", "DESC")
      .limit(10);

    console.log("SQL generado:", selectQuery.toSQL());
    console.log("Parámetros:", selectQuery.getParams());

    // Ejecutar query
    const users = await db.query(selectQuery.toSQL(), selectQuery.getParams());
    console.log(
      `Usuarios encontrados: ${users.rows?.length || users.length || 0}`
    );

    // INSERT
    const insertQuery = qb.reset().from("users").insert({
      name: "Juan Pérez",
      email: "juan@example.com",
      active: true,
      created_at: new Date(),
    });

    console.log("INSERT SQL:", insertQuery.toSQL());

    // UPDATE con condiciones
    const updateQuery = qb
      .reset()
      .from("users")
      .update({ last_login: new Date() })
      .where("email", "juan@example.com");

    console.log("UPDATE SQL:", updateQuery.toSQL());

    // DELETE condicional
    const deleteQuery = qb
      .reset()
      .from("users")
      .delete()
      .where("active", false)
      .where(
        "created_at",
        "<",
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      ); // 30 días

    console.log("DELETE SQL:", deleteQuery.toSQL());
  } catch (error) {
    console.error("Error en Query Builder:", error.message);
  }
}

/**
 * Ejemplo 3: Consultas complejas con JOINs
 */
async function ejemplo3_consultasComplejas(db) {
  console.log("\n=== Ejemplo 3: Consultas Complejas ===");

  const qb = db.getQueryBuilder();

  try {
    // JOIN con agregaciones
    const complexQuery = qb
      .select([
        "u.id",
        "u.name",
        "u.email",
        "COUNT(o.id) as order_count",
        "SUM(o.total) as total_spent",
        "MAX(o.created_at) as last_order",
      ])
      .from("users u")
      .leftJoin("orders o", "u.id", "o.user_id")
      .where("u.active", true)
      .groupBy(["u.id", "u.name", "u.email"])
      .having("COUNT(o.id)", ">", 0)
      .orderBy("total_spent", "DESC")
      .limit(20);

    console.log("Query compleja:", complexQuery.toSQL());

    // Búsqueda de texto
    const searchQuery = qb
      .reset()
      .select()
      .from("products")
      .search(["name", "description"], "laptop gaming")
      .where("active", true)
      .whereBetween("price", 500, 2000)
      .orderBy("price", "ASC");

    console.log("Búsqueda:", searchQuery.toSQL());

    // Query con múltiples condiciones
    const filterQuery = qb
      .reset()
      .select()
      .from("orders")
      .where("status", "completed")
      .whereIn("payment_method", ["credit_card", "paypal"])
      .whereBetween("created_at", "2023-01-01", "2023-12-31")
      .whereNotNull("shipped_at")
      .orderBy("total", "DESC");

    console.log("Filtros múltiples:", filterQuery.toSQL());
  } catch (error) {
    console.error("Error en consultas complejas:", error.message);
  }
}

/**
 * Ejemplo 4: MongoDB Aggregation
 */
async function ejemplo4_mongodbAggregation(db) {
  console.log("\n=== Ejemplo 4: MongoDB Aggregation ===");

  if (db.adapter.config.type !== "mongodb") {
    console.log("Saltando ejemplo (no es MongoDB)");
    return;
  }

  const qb = db.getQueryBuilder();

  try {
    // Aggregation pipeline
    const aggregationQuery = qb.from("orders").aggregate([
      // Filtrar órdenes del último año
      {
        $match: {
          created_at: {
            $gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
          },
          status: "completed",
        },
      },

      // Agrupar por mes
      {
        $group: {
          _id: {
            year: { $year: "$created_at" },
            month: { $month: "$created_at" },
          },
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: "$total" },
          averageOrder: { $avg: "$total" },
          customers: { $addToSet: "$user_id" },
        },
      },

      // Agregar campo de conteo de clientes únicos
      {
        $addFields: {
          uniqueCustomers: { $size: "$customers" },
        },
      },

      // Remover array de customers para limpiar output
      {
        $project: {
          customers: 0,
        },
      },

      // Ordenar por año y mes
      {
        $sort: {
          "_id.year": 1,
          "_id.month": 1,
        },
      },
    ]);

    console.log(
      "MongoDB Aggregation:",
      JSON.stringify(aggregationQuery.toMongoDB(), null, 2)
    );

    // Lookup (equivalente a JOIN)
    const lookupQuery = qb
      .reset()
      .from("users")
      .match({ active: true })
      .lookup("orders", "_id", "user_id", "user_orders")
      .match({ user_orders: { $ne: [] } }) // Solo usuarios con órdenes
      .aggregateGroup("$department", {
        totalUsers: { $sum: 1 },
        totalOrders: { $sum: { $size: "$user_orders" } },
        avgOrdersPerUser: { $avg: { $size: "$user_orders" } },
      });

    console.log(
      "Lookup Query:",
      JSON.stringify(lookupQuery.toMongoDB(), null, 2)
    );
  } catch (error) {
    console.error("Error en MongoDB aggregation:", error.message);
  }
}

/**
 * Ejemplo 5: Paginación avanzada
 */
async function ejemplo5_paginacion(db) {
  console.log("\n=== Ejemplo 5: Paginación ===");

  try {
    // Paginación básica
    const basicPagination = await db.paginate(
      {
        table: "users",
      },
      {
        page: 1,
        limit: 10,
        sortBy: "created_at",
        sortOrder: "desc",
      }
    );

    console.log("Paginación básica:");
    console.log(`- Página: ${basicPagination.pagination.currentPage}`);
    console.log(`- Total páginas: ${basicPagination.pagination.totalPages}`);
    console.log(
      `- Total registros: ${basicPagination.pagination.totalRecords}`
    );
    console.log(
      `- Registros por página: ${basicPagination.pagination.recordsPerPage}`
    );

    // Paginación con filtros
    const filteredPagination = await db.paginate(
      {
        table: "products",
      },
      {
        page: 2,
        limit: 20,
        sortBy: "price",
        sortOrder: "asc",
        filters: {
          active: true,
          category: "electronics",
        },
        searchFields: ["name", "description"],
        searchTerm: "wireless",
      }
    );

    console.log("\nPaginación con filtros:");
    console.log(
      `- Filtros aplicados: ${JSON.stringify(filteredPagination.filters)}`
    );
    console.log(
      `- Búsqueda: "${
        filteredPagination.search.term
      }" en [${filteredPagination.search.fields.join(", ")}]`
    );
    console.log(
      `- Ordenamiento: ${filteredPagination.sort.field} ${filteredPagination.sort.order}`
    );

    // Navegación
    if (filteredPagination.pagination.hasNextPage) {
      console.log(
        `- Siguiente página: ${filteredPagination.pagination.nextPage}`
      );
    }
    if (filteredPagination.pagination.hasPrevPage) {
      console.log(
        `- Página anterior: ${filteredPagination.pagination.prevPage}`
      );
    }
  } catch (error) {
    console.error("Error en paginación:", error.message);
  }
}

/**
 * Ejemplo 6: Transacciones
 */
async function ejemplo6_transacciones(db) {
  console.log("\n=== Ejemplo 6: Transacciones ===");

  try {
    // Transacción exitosa
    const result = await db.transaction(async (client) => {
      console.log("Iniciando transacción...");

      // Insertar usuario
      const userResult = await client.query(
        "INSERT INTO users (name, email) VALUES (?, ?) RETURNING id",
        ["María García", "maria@example.com"]
      );

      const userId = userResult.rows?.[0]?.id || userResult.insertId;
      console.log(`Usuario creado con ID: ${userId}`);

      // Insertar perfil
      await client.query(
        "INSERT INTO profiles (user_id, bio, avatar) VALUES (?, ?, ?)",
        [userId, "Desarrolladora Frontend", "avatar.jpg"]
      );

      console.log("Perfil creado");

      // Insertar configuración inicial
      await client.query(
        "INSERT INTO user_settings (user_id, theme, notifications) VALUES (?, ?, ?)",
        [userId, "dark", true]
      );

      console.log("Configuración creada");

      return { userId, success: true };
    });

    console.log("✅ Transacción completada:", result);

    // Ejemplo de transacción que falla
    try {
      await db.transaction(async (client) => {
        console.log("Iniciando transacción que fallará...");

        await client.query("INSERT INTO users (name, email) VALUES (?, ?)", [
          "Test User",
          "test@example.com",
        ]);

        // Esta query fallará intencionalmente
        await client.query("INSERT INTO invalid_table (field) VALUES (?)", [
          "value",
        ]);
      });
    } catch (error) {
      console.log("❌ Transacción falló como se esperaba:", error.message);
      console.log("✅ Rollback automático ejecutado");
    }
  } catch (error) {
    console.error("Error en transacciones:", error.message);
  }
}

/**
 * Ejemplo 7: Cache inteligente
 */
async function ejemplo7_cache(db) {
  console.log("\n=== Ejemplo 7: Cache ===");

  if (!db.cache) {
    console.log("Cache no habilitado, saltando ejemplo");
    return;
  }

  try {
    // Cache manual
    console.log("Probando cache manual...");

    // Establecer valor
    await db.cache.set(
      "user:123",
      {
        id: 123,
        name: "Usuario Test",
        email: "test@example.com",
      },
      300
    ); // 5 minutos

    // Obtener valor
    const cachedUser = await db.cache.get("user:123");
    console.log("Usuario desde cache:", cachedUser);

    // Patrón get-or-set
    const expensiveData = await db.cache.remember(
      "expensive:calculation",
      async () => {
        console.log("Ejecutando cálculo costoso...");
        await new Promise((resolve) => setTimeout(resolve, 1000)); // Simular operación lenta
        return { result: Math.random() * 1000, timestamp: new Date() };
      },
      600
    ); // 10 minutos

    console.log("Resultado costoso:", expensiveData);

    // Cache con tags
    await db.cache.setWithTags(
      "products:electronics",
      [
        { id: 1, name: "Laptop" },
        { id: 2, name: "Mouse" },
      ],
      ["products", "electronics"],
      1800 // 30 minutos
    );

    // Invalidar por tag
    console.log("Invalidando cache por tag...");
    const invalidatedCount = await db.cache.invalidateByTag("products");
    console.log(`Invalidadas ${invalidatedCount} entradas de cache`);

    // Estadísticas del cache
    const cacheStats = await db.cache.getStats();
    console.log("Estadísticas de cache:", {
      hitRate: cacheStats.hitRate,
      hits: cacheStats.hits,
      misses: cacheStats.misses,
      connected: cacheStats.connected,
    });
  } catch (error) {
    console.error("Error en cache:", error.message);
  }
}

/**
 * Ejemplo 8: Monitoreo de performance
 */
async function ejemplo8_monitoreo(db) {
  console.log("\n=== Ejemplo 8: Monitoreo ===");

  if (!db.monitor) {
    console.log("Monitoreo no habilitado, saltando ejemplo");
    return;
  }

  try {
    // Ejecutar algunas queries para generar datos
    console.log("Ejecutando queries para generar datos de monitoreo...");

    const qb = db.getQueryBuilder();

    // Query rápida
    await db.query(
      qb.reset().select(["id"]).from("users").limit(1).toSQL(),
      qb.getParams()
    );

    // Query lenta simulada (con sleep en SQL)
    if (db.adapter.config.type === "postgresql") {
      await db.query("SELECT pg_sleep(0.5)"); // 500ms
    } else if (db.adapter.config.type === "mysql") {
      await db.query("SELECT SLEEP(0.5)"); // 500ms
    }

    // Obtener estadísticas
    const stats = await db.monitor.getStats();
    console.log("Estadísticas de performance:");
    console.log(`- Total queries: ${stats.totalQueries}`);
    console.log(`- Queries por segundo: ${stats.queriesPerSecond.toFixed(2)}`);
    console.log(`- Duración promedio: ${stats.averageDuration.toFixed(2)}ms`);
    console.log(`- Duración mediana: ${stats.medianDuration.toFixed(2)}ms`);
    console.log(`- Percentil 95: ${stats.p95Duration.toFixed(2)}ms`);
    console.log(`- Queries lentas: ${stats.slowQueryPercentage}%`);

    // Queries lentas
    const slowQueries = await db.monitor.getSlowQueries(5);
    if (slowQueries.length > 0) {
      console.log("\nTop queries lentas:");
      slowQueries.forEach((query, index) => {
        console.log(
          `${index + 1}. ${query.duration}ms - ${query.sql.substring(0, 50)}...`
        );
      });
    }

    // Estadísticas por tipo
    const typeStats = await db.monitor.getQueryTypeStats();
    console.log("\nEstadísticas por tipo de query:");
    typeStats.forEach((stat) => {
      console.log(
        `- ${stat.type}: ${
          stat.count
        } queries, promedio ${stat.averageDuration.toFixed(2)}ms`
      );
    });

    // Generar reporte
    const report = await db.monitor.generateReport();
    console.log("\nReporte de performance:", {
      summary: report.summary,
      recommendations: report.recommendations,
    });
  } catch (error) {
    console.error("Error en monitoreo:", error.message);
  }
}

/**
 * Ejemplo 9: Sistema de migraciones
 */
async function ejemplo9_migraciones(db) {
  console.log("\n=== Ejemplo 9: Migraciones ===");

  try {
    // Estado actual
    const status = await db.migrations.getStatus();
    console.log("Estado de migraciones:");
    console.log(`- Total: ${status.summary.total}`);
    console.log(`- Ejecutadas: ${status.summary.executed}`);
    console.log(`- Pendientes: ${status.summary.pending}`);

    if (status.migrations.length > 0) {
      console.log("\nMigraciones:");
      status.migrations.forEach((migration) => {
        const estado = migration.executed ? "✅" : "⏳";
        console.log(`${estado} ${migration.name}`);
      });
    }

    // Crear nueva migración (solo ejemplo, no ejecutar)
    console.log("\nEjemplo de crear migración:");
    console.log(
      'await db.migrations.createMigration("add_user_preferences_table");'
    );

    // Ejecutar migraciones pendientes (solo ejemplo)
    console.log("\nEjemplo de ejecutar migraciones:");
    console.log("const results = await db.migrations.runPending();");

    // Validar integridad
    const validation = await db.migrations.validate();
    if (validation.valid) {
      console.log("✅ Migraciones válidas");
    } else {
      console.log("❌ Problemas encontrados en migraciones:");
      validation.issues.forEach((issue) => {
        console.log(`- ${issue.type}: ${issue.message}`);
      });
    }
  } catch (error) {
    console.error("Error en migraciones:", error.message);
  }
}

/**
 * Ejemplo 10: Sistema de seeds
 */
async function ejemplo10_seeds(db) {
  console.log("\n=== Ejemplo 10: Seeds ===");

  try {
    // Estado de seeds
    const status = await db.seeds.getStatus();
    console.log("Estado de seeds:");
    console.log(`- Total: ${status.summary.total}`);
    console.log(`- Ejecutados: ${status.summary.executed}`);
    console.log(`- Pendientes: ${status.summary.pending}`);
    console.log(`- Entorno: ${status.summary.environment}`);

    // Generar datos de prueba
    console.log("\nGenerando datos de prueba:");

    const users = db.seeds.generateTestData("user", 5);
    console.log(
      "Usuarios generados:",
      users.map((u) => ({ name: u.name, email: u.email }))
    );

    const products = db.seeds.generateTestData("product", 3);
    console.log(
      "Productos generados:",
      products.map((p) => ({ name: p.name, price: p.price }))
    );

    // Datos personalizados
    const adminUsers = db.seeds.generateTestData("user", 2, {
      role: "admin",
      active: true,
      department: "IT",
    });
    console.log(
      "Admins generados:",
      adminUsers.map((u) => ({ name: u.name, role: u.role }))
    );

    // Ejemplo de crear seed (solo mostrar)
    console.log("\nEjemplo de crear seed:");
    console.log('await db.seeds.createSeed("demo_users");');

    // Ejemplo de ejecutar seeds (solo mostrar)
    console.log("\nEjemplo de ejecutar seeds:");
    console.log(
      "await db.seeds.runAll({ force: false, continueOnError: true });"
    );
  } catch (error) {
    console.error("Error en seeds:", error.message);
  }
}

/**
 * Ejemplo 11: Sistema de backups
 */
async function ejemplo11_backups(db) {
  console.log("\n=== Ejemplo 11: Backups ===");

  try {
    // Inicializar sistema de backups
    await db.backups.initialize();

    // Listar backups existentes
    const backups = await db.backups.listBackups({ limit: 5 });
    console.log(`Backups disponibles: ${backups.length}`);

    if (backups.length > 0) {
      console.log("Últimos backups:");
      backups.forEach((backup) => {
        console.log(
          `- ${backup.filename} (${
            backup.sizeFormatted
          }, ${backup.created.toLocaleDateString()})`
        );
      });
    }

    // Estadísticas de backups
    const stats = await db.backups.getStats();
    console.log("\nEstadísticas de backups:");
    console.log(`- Total: ${stats.totalBackups}`);
    console.log(`- Tamaño total: ${stats.totalSizeFormatted}`);
    console.log(`- Tamaño promedio: ${stats.averageSizeFormatted}`);

    if (stats.oldestBackup) {
      console.log(`- Más antiguo: ${stats.oldestBackup.toLocaleDateString()}`);
    }
    if (stats.newestBackup) {
      console.log(`- Más reciente: ${stats.newestBackup.toLocaleDateString()}`);
    }

    // Ejemplo de crear backup (comentado para no crear archivos)
    console.log("\nEjemplo de crear backup:");
    console.log("const backup = await db.backups.createBackup({");
    console.log('    type: "manual",');
    console.log('    description: "Backup antes de actualización",');
    console.log('    formats: ["native"],');
    console.log("    compression: true");
    console.log("});");
  } catch (error) {
    console.error("Error en backups:", error.message);
  }
}

/**
 * Ejemplo principal - ejecutar todos los ejemplos
 */
async function ejecutarEjemplos() {
  console.log("🚀 Iniciando ejemplos del módulo de base de datos\n");

  let db;

  try {
    // Ejemplo 1: Inicialización
    db = await ejemplo1_inicializacion();

    // Ejemplo 2: Query Builder
    await ejemplo2_queryBuilder(db);

    // Ejemplo 3: Consultas complejas
    await ejemplo3_consultasComplejas(db);

    // Ejemplo 4: MongoDB (solo si es MongoDB)
    await ejemplo4_mongodbAggregation(db);

    // Ejemplo 5: Paginación
    await ejemplo5_paginacion(db);

    // Ejemplo 6: Transacciones
    await ejemplo6_transacciones(db);

    // Ejemplo 7: Cache
    await ejemplo7_cache(db);

    // Ejemplo 8: Monitoreo
    await ejemplo8_monitoreo(db);

    // Ejemplo 9: Migraciones
    await ejemplo9_migraciones(db);

    // Ejemplo 10: Seeds
    await ejemplo10_seeds(db);

    // Ejemplo 11: Backups
    await ejemplo11_backups(db);

    console.log("\n✅ Todos los ejemplos completados exitosamente");
  } catch (error) {
    console.error("\n❌ Error ejecutando ejemplos:", error.message);
    console.error(error.stack);
  } finally {
    // Limpiar conexiones
    if (db) {
      try {
        await db.disconnect();
        console.log("🔌 Conexión cerrada");
      } catch (error) {
        console.error("Error cerrando conexión:", error.message);
      }
    }
  }
}

// Exportar funciones para uso individual
module.exports = {
  configs,
  ejemplo1_inicializacion,
  ejemplo2_queryBuilder,
  ejemplo3_consultasComplejas,
  ejemplo4_mongodbAggregation,
  ejemplo5_paginacion,
  ejemplo6_transacciones,
  ejemplo7_cache,
  ejemplo8_monitoreo,
  ejemplo9_migraciones,
  ejemplo10_seeds,
  ejemplo11_backups,
  ejecutarEjemplos,
};

// Ejecutar ejemplos si se llama directamente
if (require.main === module) {
  ejecutarEjemplos()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error("Error fatal:", error);
      process.exit(1);
    });
}
