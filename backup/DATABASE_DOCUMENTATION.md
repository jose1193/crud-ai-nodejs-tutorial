# 📚 Documentación del Módulo de Base de Datos

## 🎯 Descripción General

El módulo de base de datos es un sistema avanzado y completo que proporciona utilidades para trabajar con múltiples tipos de bases de datos de manera unificada. Soporta MongoDB, PostgreSQL y MySQL con características avanzadas como:

- ✅ Conexión automática con reconexión
- ✅ Query builder universal para consultas complejas
- ✅ Paginación automática con metadata
- ✅ Sistema de backups automáticos programados
- ✅ Sistema de migraciones de esquema
- ✅ Sistema de seeds para datos de prueba
- ✅ Monitoreo de performance de queries
- ✅ Cache layer con Redis

## 📦 Instalación

### Dependencias Requeridas

```bash
npm install mongodb pg mysql2 redis node-cron
```

### Dependencias Opcionales

```bash
# Para compresión de backups
npm install zlib

# Para serialización avanzada
npm install msgpack
```

## ⚙️ Configuración

### Variables de Entorno

Crea un archivo `.env` con las siguientes variables:

```env
# Base de datos principal
DB_TYPE=mongodb              # mongodb, postgresql, mysql
DB_HOST=localhost
DB_PORT=27017               # 27017 para MongoDB, 5432 para PostgreSQL, 3306 para MySQL
DB_NAME=mi_base_datos
DB_USER=usuario
DB_PASS=contraseña

# Redis Cache
CACHE_ENABLED=true
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Backups
BACKUP_ENABLED=true
BACKUP_SCHEDULE=0 2 * * *    # 2 AM diario
BACKUP_PATH=./backups
BACKUP_RETENTION=30          # días

# Monitoreo
MONITORING_ENABLED=true
SLOW_QUERY_THRESHOLD=1000    # ms
MONITOR_LOG_PATH=./logs/db-performance.log
```

## 🚀 Uso Básico

### Inicialización

```javascript
const DatabaseManager = require("./modules/database");

// Configuración básica
const db = new DatabaseManager({
  type: "mongodb",
  host: "localhost",
  database: "mi_app",
  username: "usuario",
  password: "contraseña",
});

// Conectar
await db.connect();
```

### Configuración Avanzada

```javascript
const db = new DatabaseManager({
  // Configuración de conexión
  type: "postgresql",
  host: "localhost",
  port: 5432,
  database: "mi_app",
  username: "usuario",
  password: "contraseña",

  // Opciones de conexión
  maxRetries: 5,
  retryDelay: 2000,
  connectionTimeout: 10000,
  queryTimeout: 30000,

  // Cache
  cache: {
    enabled: true,
    redis: {
      host: "localhost",
      port: 6379,
      password: "",
      db: 0,
    },
    ttl: 300, // 5 minutos
  },

  // Backups
  backup: {
    enabled: true,
    schedule: "0 2 * * *", // 2 AM diario
    path: "./backups",
    retention: 30, // días
  },

  // Monitoreo
  monitoring: {
    enabled: true,
    slowQueryThreshold: 1000, // ms
    logPath: "./logs/db-performance.log",
  },
});
```

## 📊 Query Builder

### Consultas Básicas

```javascript
const queryBuilder = db.getQueryBuilder();

// SELECT
const users = await db.query(
  queryBuilder
    .select(["id", "name", "email"])
    .from("users")
    .where("active", true)
    .orderBy("created_at", "DESC")
    .limit(10)
    .toSQL(),
  queryBuilder.getParams()
);

// INSERT
await db.query(
  queryBuilder
    .reset()
    .from("users")
    .insert({
      name: "Juan Pérez",
      email: "juan@example.com",
      active: true,
    })
    .toSQL(),
  queryBuilder.getParams()
);

// UPDATE
await db.query(
  queryBuilder
    .reset()
    .from("users")
    .update({ active: false })
    .where("id", 123)
    .toSQL(),
  queryBuilder.getParams()
);

// DELETE
await db.query(
  queryBuilder.reset().from("users").delete().where("active", false).toSQL(),
  queryBuilder.getParams()
);
```

### Consultas Complejas

```javascript
// JOINs (solo SQL)
const usersWithOrders = await db.query(
  queryBuilder
    .reset()
    .select(["u.name", "u.email", "COUNT(o.id) as order_count"])
    .from("users u")
    .leftJoin("orders o", "u.id", "o.user_id")
    .where("u.active", true)
    .groupBy(["u.id", "u.name", "u.email"])
    .having("COUNT(o.id)", ">", 0)
    .orderBy("order_count", "DESC")
    .toSQL(),
  queryBuilder.getParams()
);

// Búsqueda de texto
const searchResults = await db.query(
  queryBuilder
    .reset()
    .select()
    .from("products")
    .search(["name", "description"], "laptop gaming")
    .where("active", true)
    .toSQL(),
  queryBuilder.getParams()
);

// Consultas con IN y BETWEEN
const filteredUsers = await db.query(
  queryBuilder
    .reset()
    .select()
    .from("users")
    .whereIn("status", ["active", "pending"])
    .whereBetween("created_at", "2023-01-01", "2023-12-31")
    .toSQL(),
  queryBuilder.getParams()
);
```

### MongoDB Aggregation

```javascript
// Para MongoDB
const mongoQuery = queryBuilder
  .reset()
  .from("users")
  .aggregate([
    { $match: { active: true } },
    {
      $group: {
        _id: "$department",
        count: { $sum: 1 },
        avgAge: { $avg: "$age" },
      },
    },
    { $sort: { count: -1 } },
  ])
  .toMongoDB();

const result = await db.query(mongoQuery);
```

## 📄 Paginación

```javascript
// Paginación automática
const paginatedResults = await db.paginate(
  {
    table: "users", // o collection para MongoDB
  },
  {
    page: 1,
    limit: 20,
    sortBy: "created_at",
    sortOrder: "desc",
    filters: {
      active: true,
      department: "IT",
    },
    searchFields: ["name", "email"],
    searchTerm: "juan",
  }
);

console.log(paginatedResults);
/*
{
    data: [...], // Registros de la página actual
    pagination: {
        currentPage: 1,
        totalPages: 5,
        totalRecords: 100,
        recordsPerPage: 20,
        hasNextPage: true,
        hasPrevPage: false,
        nextPage: 2,
        prevPage: null
    },
    filters: { active: true, department: 'IT' },
    search: { term: 'juan', fields: ['name', 'email'] },
    sort: { field: 'created_at', order: 'desc' }
}
*/
```

## 🔄 Migraciones

### Crear Migración

```javascript
// Crear nueva migración
await db.migrations.createMigration("create_users_table");
// Genera: 2023-12-01_120000_create_users_table.js
```

### Archivo de Migración (SQL)

```javascript
// migrations/2023-12-01_120000_create_users_table.js
module.exports = {
  async up(adapter) {
    await adapter.query(`
            CREATE TABLE users (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

    await adapter.query(`
            CREATE INDEX idx_users_email ON users(email)
        `);

    console.log("Tabla users creada");
  },

  async down(adapter) {
    await adapter.query("DROP TABLE IF EXISTS users");
    console.log("Tabla users eliminada");
  },

  version: "1.0.0",
};
```

### Archivo de Migración (MongoDB)

```javascript
// migrations/2023-12-01_120000_create_users_indexes.js
module.exports = {
  async up(db) {
    await db.collection("users").createIndex({ email: 1 }, { unique: true });

    await db.collection("users").createIndex({ name: "text", bio: "text" });

    console.log("Índices de users creados");
  },

  async down(db) {
    await db.collection("users").dropIndex("email_1");
    await db.collection("users").dropIndex("name_text_bio_text");
    console.log("Índices de users eliminados");
  },

  version: "1.0.0",
};
```

### Ejecutar Migraciones

```javascript
// Ejecutar migraciones pendientes
const results = await db.migrations.runPending();

// Rollback de la última migración
await db.migrations.rollbackLast();

// Rollback hasta una migración específica
await db.migrations.rollbackTo("2023-12-01_120000_create_users_table");

// Estado de las migraciones
const status = await db.migrations.getStatus();
console.log(status);
```

## 🌱 Seeds

### Crear Seed

```javascript
// Crear nuevo seed
await db.seeds.createSeed("users_seed");
// Genera: 2023-12-01_120000_users_seed.js
```

### Archivo de Seed

```javascript
// seeds/2023-12-01_120000_users_seed.js
module.exports = {
  async run(adapter, seedManager) {
    console.log("Ejecutando seed de usuarios");

    // Generar datos de prueba
    const users = seedManager.generateTestData("user", 50, {
      department: "IT",
    });

    // Para SQL
    for (const user of users) {
      await adapter.query(
        "INSERT INTO users (name, email, age, active) VALUES (?, ?, ?, ?)",
        [user.name, user.email, user.age, user.active]
      );
    }

    console.log(`${users.length} usuarios creados`);
  },

  async down(adapter, seedManager) {
    // Limpiar datos del seed
    await adapter.query("DELETE FROM users WHERE department = ?", ["IT"]);
    console.log("Datos de seed eliminados");
  },

  environments: ["development", "testing"],
  version: "1.0.0",
};
```

### Ejecutar Seeds

```javascript
// Ejecutar todos los seeds
await db.seeds.runAll();

// Ejecutar seed específico
await db.seeds.run("users_seed");

// Ejecutar con opciones
await db.seeds.runAll({
  force: true, // Ejecutar aunque ya estén ejecutados
  only: ["users_seed"], // Solo ejecutar seeds específicos
  continueOnError: true, // Continuar si hay errores
});

// Limpiar datos de seeds
await db.seeds.clean(); // Limpiar todos
await db.seeds.clean("users_seed"); // Limpiar específico

// Estado de los seeds
const status = await db.seeds.getStatus();
```

### Generador de Datos de Prueba

```javascript
// Generar datos usando factories built-in
const users = db.seeds.generateTestData("user", 10);
const products = db.seeds.generateTestData("product", 50);
const orders = db.seeds.generateTestData("order", 100);

// Con overrides
const adminUsers = db.seeds.generateTestData("user", 5, {
  role: "admin",
  active: true,
});
```

## 💾 Sistema de Backups

### Configuración de Backups

```javascript
// Inicializar sistema de backups
await db.backups.initialize();

// Crear backup manual
const backup = await db.backups.createBackup({
  type: "manual",
  description: "Backup antes de actualización",
  formats: ["native", "json"],
  compression: true,
  encryption: false,
});

console.log(backup);
```

### Programar Backups Automáticos

Los backups se programan automáticamente según la configuración:

```javascript
// En la configuración
backup: {
    enabled: true,
    schedule: '0 2 * * *',     // 2 AM diario
    path: './backups',
    retention: 30,             // días
    compression: true,
    encryption: false,
    formats: ['native']
}
```

### Gestión de Backups

```javascript
// Listar backups disponibles
const backups = await db.backups.listBackups();

// Filtrar backups
const recentBackups = await db.backups.listBackups({
  type: "scheduled",
  limit: 10,
});

// Restaurar backup
await db.backups.restoreBackup("./backups/backup-manual-2023-12-01.sql", {
  dropExisting: true,
});

// Eliminar backup
await db.backups.deleteBackup("./backups/old-backup.sql");

// Limpiar backups antiguos
const deletedCount = await db.backups.cleanupOldBackups();

// Estadísticas
const stats = await db.backups.getStats();
console.log(stats);
```

## 📈 Monitoreo de Performance

### Configuración

```javascript
// El monitoreo se activa automáticamente
monitoring: {
    enabled: true,
    slowQueryThreshold: 1000,  // ms
    logPath: './logs/db-performance.log',
    sampleRate: 1.0           // 100% de queries
}
```

### Obtener Estadísticas

```javascript
// Estadísticas generales
const stats = await db.monitor.getStats();
console.log(stats);

// Queries lentas
const slowQueries = await db.monitor.getSlowQueries(10);

// Historial de queries
const history = await db.monitor.getQueryHistory(100, {
  queryType: "SELECT",
  minDuration: 500,
  since: "2023-12-01",
});

// Estadísticas por tipo de query
const typeStats = await db.monitor.getQueryTypeStats();

// Estadísticas por hora
const hourlyStats = await db.monitor.getHourlyStats(24);

// Generar reporte
const report = await db.monitor.generateReport();
```

### Eventos de Monitoreo

```javascript
// Escuchar eventos
db.on("slowQuery", (data) => {
  console.log(`Query lenta detectada: ${data.duration}ms`);
  console.log(data.sql);
});

db.monitor.on("queryRecorded", (record) => {
  if (record.duration > 2000) {
    console.warn(`Query muy lenta: ${record.duration}ms`);
  }
});
```

## 🗄️ Cache con Redis

### Configuración

```javascript
cache: {
    enabled: true,
    redis: {
        host: 'localhost',
        port: 6379,
        password: '',
        db: 0
    },
    ttl: 300,              // 5 minutos
    keyPrefix: 'db:cache:',
    compression: true
}
```

### Uso Manual del Cache

```javascript
// Obtener del cache
const cached = await db.cache.get("user:123");

// Establecer en cache
await db.cache.set("user:123", userData, 600); // 10 minutos

// Eliminar del cache
await db.cache.delete("user:123");

// Patrón get-or-set
const user = await db.cache.remember(
  "user:123",
  async () => {
    return await db.query("SELECT * FROM users WHERE id = ?", [123]);
  },
  300
);

// Cache con tags
await db.cache.setWithTags("user:123", userData, ["users", "profile"]);

// Invalidar por tags
await db.cache.invalidateByTag("users");

// Estadísticas del cache
const cacheStats = await db.cache.getStats();
```

### Cache Automático

```javascript
// Las queries SELECT se cachean automáticamente
const users = await db.query(
  "SELECT * FROM users WHERE active = ?",
  [true],
  { cache: true, cacheTTL: 600 } // Cachear por 10 minutos
);

// Desactivar cache para una query específica
const freshData = await db.query("SELECT * FROM users", [], { cache: false });
```

## 🔄 Transacciones

### Uso Básico

```javascript
// Transacción simple
await db.transaction(async (client) => {
  await client.query("INSERT INTO users (name) VALUES (?)", ["Juan"]);
  await client.query("INSERT INTO profiles (user_id) VALUES (?)", [userId]);

  // Si hay error, se hace rollback automáticamente
});
```

### Transacciones Complejas

```javascript
// Con manejo de errores personalizado
try {
  const result = await db.transaction(async (client) => {
    const user = await client.query(
      "INSERT INTO users (name, email) VALUES (?, ?) RETURNING id",
      ["Juan Pérez", "juan@example.com"]
    );

    const userId = user.rows[0].id;

    await client.query("INSERT INTO profiles (user_id, bio) VALUES (?, ?)", [
      userId,
      "Desarrollador Full Stack",
    ]);

    return { userId, success: true };
  });

  console.log("Usuario creado:", result.userId);
} catch (error) {
  console.error("Error en transacción:", error.message);
}
```

## 📊 Estadísticas y Health Check

### Health Check

```javascript
// Verificar salud de la conexión
const health = await db.healthCheck();
console.log(health);
/*
{
    status: 'healthy',
    database: 'postgresql',
    host: 'localhost',
    responseTime: '15.23ms',
    connected: true,
    timestamp: '2023-12-01T10:30:00.000Z'
}
*/
```

### Estadísticas Generales

```javascript
// Estadísticas completas
const stats = await db.getStats();
console.log(stats);
/*
{
    database: 'mi_app',
    tables: 15,
    totalSize: 52428800,
    connections: { active: 5, idle: 3 },
    performance: { ... },
    cache: { hitRate: '85.2%', ... }
}
*/
```

## 🎛️ Eventos del Sistema

```javascript
// Eventos de conexión
db.on("connected", () => {
  console.log("✅ Base de datos conectada");
});

db.on("disconnected", () => {
  console.log("❌ Base de datos desconectada");
});

db.on("error", (error) => {
  console.error("❌ Error de base de datos:", error);
});

// Eventos de queries
db.on("queryExecuted", (data) => {
  console.log(`Query ejecutada en ${data.duration}ms`);
});

db.on("slowQuery", (data) => {
  console.warn(`Query lenta: ${data.duration}ms - ${data.sql}`);
});

db.on("cacheHit", (data) => {
  console.log("Cache hit:", data.key);
});

// Eventos de migraciones
db.migrations.on("migrationExecuted", (data) => {
  console.log(`Migración ejecutada: ${data.name}`);
});

// Eventos de backups
db.backups.on("backupCompleted", (data) => {
  console.log(`Backup completado: ${data.filename}`);
});
```

## 🛠️ CLI Tools

### Scripts de NPM

Agrega estos scripts a tu `package.json`:

```json
{
  "scripts": {
    "db:migrate": "node -e \"require('./modules/database').migrations.runPending()\"",
    "db:rollback": "node -e \"require('./modules/database').migrations.rollbackLast()\"",
    "db:seed": "node -e \"require('./modules/database').seeds.runAll()\"",
    "db:backup": "node -e \"require('./modules/database').backups.createBackup()\"",
    "db:status": "node -e \"console.log(await require('./modules/database').getStats())\"",
    "db:health": "node -e \"console.log(await require('./modules/database').healthCheck())\""
  }
}
```

### Herramientas de Línea de Comandos

```bash
# Ejecutar migraciones
npm run db:migrate

# Rollback
npm run db:rollback

# Ejecutar seeds
npm run db:seed

# Crear backup
npm run db:backup

# Ver estado
npm run db:status

# Health check
npm run db:health
```

## 🚨 Manejo de Errores

### Errores Comunes

```javascript
try {
  await db.connect();
} catch (error) {
  switch (error.code) {
    case "ECONNREFUSED":
      console.error("No se puede conectar a la base de datos");
      break;
    case "EAUTH":
      console.error("Credenciales inválidas");
      break;
    case "ENOTFOUND":
      console.error("Host de base de datos no encontrado");
      break;
    default:
      console.error("Error desconocido:", error.message);
  }
}
```

### Reconexión Automática

```javascript
// La reconexión se maneja automáticamente
db.on("disconnected", () => {
  console.log("Intentando reconectar...");
});

db.on("maxRetriesReached", () => {
  console.error("Máximo número de reintentos alcanzado");
  process.exit(1);
});
```

## 🔧 Configuración Avanzada

### Configuración por Entorno

```javascript
// config/database.js
const config = {
  development: {
    type: "postgresql",
    host: "localhost",
    database: "mi_app_dev",
    // ...
  },
  testing: {
    type: "postgresql",
    host: "localhost",
    database: "mi_app_test",
    // ...
  },
  production: {
    type: "postgresql",
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    ssl: true,
    // ...
  },
};

const env = process.env.NODE_ENV || "development";
module.exports = config[env];
```

### Pool de Conexiones

```javascript
// Configuración específica por base de datos
const config = {
  // PostgreSQL
  pgOptions: {
    max: 20, // máximo de conexiones
    idleTimeoutMillis: 30000, // timeout de conexiones idle
    connectionTimeoutMillis: 2000,
  },

  // MySQL
  mysqlOptions: {
    connectionLimit: 20,
    acquireTimeout: 60000,
    timeout: 60000,
  },

  // MongoDB
  mongoOptions: {
    maxPoolSize: 20,
    minPoolSize: 5,
    maxIdleTimeMS: 30000,
  },
};
```

## 📋 Mejores Prácticas

### 1. Gestión de Conexiones

```javascript
// ✅ Buena práctica
const db = new DatabaseManager(config);
await db.connect();

// Usar la misma instancia en toda la aplicación
module.exports = db;

// ❌ Evitar múltiples conexiones innecesarias
```

### 2. Manejo de Transacciones

```javascript
// ✅ Usar transacciones para operaciones relacionadas
await db.transaction(async (client) => {
  await client.query("INSERT INTO orders ...");
  await client.query("UPDATE inventory ...");
  await client.query("INSERT INTO order_items ...");
});
```

### 3. Cache Inteligente

```javascript
// ✅ Cachear datos que cambian poco
const categories = await db.cache.remember(
  "categories",
  async () => {
    return await db.query("SELECT * FROM categories ORDER BY name");
  },
  3600
); // 1 hora

// ❌ No cachear datos que cambian frecuentemente
```

### 4. Monitoreo Proactivo

```javascript
// ✅ Configurar alertas para queries lentas
db.on("slowQuery", (data) => {
  if (data.duration > 5000) {
    // Enviar alerta crítica
    console.error(`CRÍTICO: Query extremadamente lenta: ${data.duration}ms`);
  }
});
```

### 5. Backups Regulares

```javascript
// ✅ Configurar backups automáticos
backup: {
    enabled: true,
    schedule: '0 2 * * *',  // Diario a las 2 AM
    retention: 30,          // Mantener 30 días
    compression: true       // Comprimir para ahorrar espacio
}
```

## 🔍 Troubleshooting

### Problemas Comunes

#### 1. Conexión Lenta

```javascript
// Verificar configuración de timeout
connectionTimeout: 10000,  // Aumentar si es necesario
queryTimeout: 30000
```

#### 2. Memoria Alta

```javascript
// Ajustar pool de conexiones
maxPoolSize: 10,  // Reducir si hay problemas de memoria

// Configurar cache
cache: {
    maxValueSize: 512 * 1024  // Limitar tamaño de valores en cache
}
```

#### 3. Queries Lentas

```javascript
// Activar monitoreo detallado
monitoring: {
    enabled: true,
    slowQueryThreshold: 500,  // Detectar queries > 500ms
    sampleRate: 1.0          // Monitorear 100% de queries
}
```

#### 4. Problemas de Cache

```javascript
// Verificar conexión a Redis
const cacheStats = await db.cache.getStats();
console.log("Cache connected:", cacheStats.connected);
console.log("Hit rate:", cacheStats.hitRate);
```

## 📚 Recursos Adicionales

### Documentación de Dependencias

- [MongoDB Node.js Driver](https://docs.mongodb.com/drivers/node/)
- [node-postgres (pg)](https://node-postgres.com/)
- [MySQL2](https://github.com/sidorares/node-mysql2)
- [Redis](https://github.com/redis/node-redis)
- [node-cron](https://github.com/node-cron/node-cron)

### Ejemplos de Uso

Ver el directorio `examples/database-examples.js` para ejemplos completos y casos de uso avanzados.

---

## 📄 Licencia

MIT License - ver archivo LICENSE para más detalles.

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor, lee las guías de contribución antes de enviar un pull request.

## 📞 Soporte

Para soporte técnico o preguntas, crear un issue en el repositorio del proyecto.

---

_Documentación actualizada: Diciembre 2023_
