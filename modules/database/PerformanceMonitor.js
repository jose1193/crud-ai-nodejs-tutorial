/**
 * Monitor de Performance para queries de base de datos
 * Registra y analiza el rendimiento de las consultas
 */

const EventEmitter = require("events");
const fs = require("fs").promises;
const path = require("path");

class PerformanceMonitor extends EventEmitter {
  constructor(config = {}) {
    super();

    this.config = {
      enabled: config.enabled !== false,
      slowQueryThreshold: config.slowQueryThreshold || 1000, // ms
      logPath: config.logPath || "./logs/db-performance.log",
      maxLogSize: config.maxLogSize || 50 * 1024 * 1024, // 50MB
      retentionDays: config.retentionDays || 30,
      sampleRate: config.sampleRate || 1.0, // 1.0 = 100% de queries
      ...config,
    };

    this.stats = {
      totalQueries: 0,
      slowQueries: 0,
      failedQueries: 0,
      totalDuration: 0,
      averageDuration: 0,
      queryTypes: {},
      topSlowQueries: [],
      hourlyStats: {},
      dailyStats: {},
      startTime: new Date(),
    };

    this.queryHistory = [];
    this.maxHistorySize = config.maxHistorySize || 1000;

    if (this.config.enabled) {
      this._initializeLogging();
      this._startCleanupTimer();
    }
  }

  /**
   * Registrar una query ejecutada
   */
  recordQuery(queryData) {
    if (!this.config.enabled) return;

    // Aplicar sample rate
    if (Math.random() > this.config.sampleRate) return;

    const record = {
      id: this._generateId(),
      timestamp: new Date(),
      sql: queryData.sql,
      params: queryData.params,
      duration: queryData.duration,
      success: queryData.success,
      error: queryData.error,
      queryType: this._extractQueryType(queryData.sql),
      ...queryData,
    };

    // Actualizar estadísticas
    this._updateStats(record);

    // Agregar al historial
    this._addToHistory(record);

    // Verificar si es una query lenta
    if (record.duration >= this.config.slowQueryThreshold) {
      this._handleSlowQuery(record);
    }

    // Log la query si es necesario
    if (this.config.logPath) {
      this._logQuery(record);
    }

    this.emit("queryRecorded", record);
  }

  /**
   * Obtener estadísticas actuales
   */
  getStats() {
    const now = new Date();
    const uptime = now - this.stats.startTime;

    return {
      ...this.stats,
      uptime: uptime,
      uptimeFormatted: this._formatDuration(uptime),
      queriesPerSecond: this.stats.totalQueries / (uptime / 1000),
      slowQueryPercentage:
        this.stats.totalQueries > 0
          ? ((this.stats.slowQueries / this.stats.totalQueries) * 100).toFixed(
              2
            )
          : 0,
      failureRate:
        this.stats.totalQueries > 0
          ? (
              (this.stats.failedQueries / this.stats.totalQueries) *
              100
            ).toFixed(2)
          : 0,
      medianDuration: this._calculateMedianDuration(),
      p95Duration: this._calculatePercentileDuration(95),
      p99Duration: this._calculatePercentileDuration(99),
    };
  }

  /**
   * Obtener queries lentas
   */
  getSlowQueries(limit = 10) {
    return this.stats.topSlowQueries
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit);
  }

  /**
   * Obtener historial de queries
   */
  getQueryHistory(limit = 100, filters = {}) {
    let history = [...this.queryHistory];

    // Aplicar filtros
    if (filters.queryType) {
      history = history.filter((q) => q.queryType === filters.queryType);
    }

    if (filters.minDuration) {
      history = history.filter((q) => q.duration >= filters.minDuration);
    }

    if (filters.success !== undefined) {
      history = history.filter((q) => q.success === filters.success);
    }

    if (filters.since) {
      const since = new Date(filters.since);
      history = history.filter((q) => q.timestamp >= since);
    }

    return history.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);
  }

  /**
   * Obtener estadísticas por tipo de query
   */
  getQueryTypeStats() {
    return Object.entries(this.stats.queryTypes)
      .map(([type, stats]) => ({
        type,
        count: stats.count,
        totalDuration: stats.totalDuration,
        averageDuration: stats.totalDuration / stats.count,
        slowQueries: stats.slowQueries,
        failedQueries: stats.failedQueries,
      }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Obtener estadísticas por hora
   */
  getHourlyStats(hours = 24) {
    const now = new Date();
    const stats = [];

    for (let i = hours - 1; i >= 0; i--) {
      const hour = new Date(now);
      hour.setHours(hour.getHours() - i, 0, 0, 0);
      const hourKey = hour.toISOString().substr(0, 13);

      stats.push({
        hour: hourKey,
        ...(this.stats.hourlyStats[hourKey] || {
          queries: 0,
          slowQueries: 0,
          failedQueries: 0,
          totalDuration: 0,
        }),
      });
    }

    return stats;
  }

  /**
   * Resetear estadísticas
   */
  resetStats() {
    this.stats = {
      totalQueries: 0,
      slowQueries: 0,
      failedQueries: 0,
      totalDuration: 0,
      averageDuration: 0,
      queryTypes: {},
      topSlowQueries: [],
      hourlyStats: {},
      dailyStats: {},
      startTime: new Date(),
    };

    this.queryHistory = [];
    this.emit("statsReset");
  }

  /**
   * Generar reporte de performance
   */
  generateReport() {
    const stats = this.getStats();
    const slowQueries = this.getSlowQueries();
    const typeStats = this.getQueryTypeStats();
    const hourlyStats = this.getHourlyStats();

    return {
      generatedAt: new Date().toISOString(),
      summary: {
        totalQueries: stats.totalQueries,
        uptime: stats.uptimeFormatted,
        queriesPerSecond: stats.queriesPerSecond,
        averageDuration: stats.averageDuration,
        medianDuration: stats.medianDuration,
        slowQueryPercentage: stats.slowQueryPercentage,
        failureRate: stats.failureRate,
      },
      performance: {
        p95Duration: stats.p95Duration,
        p99Duration: stats.p99Duration,
        slowQueryThreshold: this.config.slowQueryThreshold,
      },
      topSlowQueries: slowQueries.slice(0, 5).map((q) => ({
        sql: q.sql.substring(0, 100) + (q.sql.length > 100 ? "..." : ""),
        duration: q.duration,
        timestamp: q.timestamp,
      })),
      queryTypes: typeStats,
      hourlyTrend: hourlyStats.slice(-12), // Últimas 12 horas
      recommendations: this._generateRecommendations(stats, slowQueries),
    };
  }

  /**
   * Actualizar estadísticas
   */
  _updateStats(record) {
    this.stats.totalQueries++;
    this.stats.totalDuration += record.duration;
    this.stats.averageDuration =
      this.stats.totalDuration / this.stats.totalQueries;

    if (!record.success) {
      this.stats.failedQueries++;
    }

    if (record.duration >= this.config.slowQueryThreshold) {
      this.stats.slowQueries++;
    }

    // Estadísticas por tipo de query
    if (!this.stats.queryTypes[record.queryType]) {
      this.stats.queryTypes[record.queryType] = {
        count: 0,
        totalDuration: 0,
        slowQueries: 0,
        failedQueries: 0,
      };
    }

    const typeStats = this.stats.queryTypes[record.queryType];
    typeStats.count++;
    typeStats.totalDuration += record.duration;

    if (record.duration >= this.config.slowQueryThreshold) {
      typeStats.slowQueries++;
    }

    if (!record.success) {
      typeStats.failedQueries++;
    }

    // Estadísticas por hora
    const hourKey = record.timestamp.toISOString().substr(0, 13);
    if (!this.stats.hourlyStats[hourKey]) {
      this.stats.hourlyStats[hourKey] = {
        queries: 0,
        slowQueries: 0,
        failedQueries: 0,
        totalDuration: 0,
      };
    }

    const hourStats = this.stats.hourlyStats[hourKey];
    hourStats.queries++;
    hourStats.totalDuration += record.duration;

    if (record.duration >= this.config.slowQueryThreshold) {
      hourStats.slowQueries++;
    }

    if (!record.success) {
      hourStats.failedQueries++;
    }
  }

  /**
   * Agregar query al historial
   */
  _addToHistory(record) {
    this.queryHistory.push(record);

    // Mantener tamaño máximo del historial
    if (this.queryHistory.length > this.maxHistorySize) {
      this.queryHistory = this.queryHistory.slice(-this.maxHistorySize);
    }
  }

  /**
   * Manejar query lenta
   */
  _handleSlowQuery(record) {
    // Agregar a top slow queries
    this.stats.topSlowQueries.push({
      ...record,
      sql: record.sql.substring(0, 200), // Truncar SQL largo
    });

    // Mantener solo las top 100 queries lentas
    if (this.stats.topSlowQueries.length > 100) {
      this.stats.topSlowQueries.sort((a, b) => b.duration - a.duration);
      this.stats.topSlowQueries = this.stats.topSlowQueries.slice(0, 100);
    }

    this.emit("slowQuery", {
      sql: record.sql,
      duration: record.duration,
      params: record.params,
      timestamp: record.timestamp,
    });
  }

  /**
   * Extraer tipo de query
   */
  _extractQueryType(sql) {
    if (!sql || typeof sql !== "string") return "UNKNOWN";

    const trimmed = sql.trim().toUpperCase();

    if (trimmed.startsWith("SELECT")) return "SELECT";
    if (trimmed.startsWith("INSERT")) return "INSERT";
    if (trimmed.startsWith("UPDATE")) return "UPDATE";
    if (trimmed.startsWith("DELETE")) return "DELETE";
    if (trimmed.startsWith("CREATE")) return "CREATE";
    if (trimmed.startsWith("ALTER")) return "ALTER";
    if (trimmed.startsWith("DROP")) return "DROP";
    if (trimmed.startsWith("SHOW")) return "SHOW";
    if (trimmed.startsWith("DESCRIBE")) return "DESCRIBE";

    return "OTHER";
  }

  /**
   * Calcular duración mediana
   */
  _calculateMedianDuration() {
    if (this.queryHistory.length === 0) return 0;

    const durations = this.queryHistory
      .map((q) => q.duration)
      .sort((a, b) => a - b);

    const mid = Math.floor(durations.length / 2);

    return durations.length % 2 === 0
      ? (durations[mid - 1] + durations[mid]) / 2
      : durations[mid];
  }

  /**
   * Calcular percentil de duración
   */
  _calculatePercentileDuration(percentile) {
    if (this.queryHistory.length === 0) return 0;

    const durations = this.queryHistory
      .map((q) => q.duration)
      .sort((a, b) => a - b);

    const index = Math.ceil((percentile / 100) * durations.length) - 1;
    return durations[Math.max(0, index)];
  }

  /**
   * Inicializar logging
   */
  async _initializeLogging() {
    if (!this.config.logPath) return;

    try {
      const logDir = path.dirname(this.config.logPath);
      await fs.mkdir(logDir, { recursive: true });
    } catch (error) {
      console.error("Error creando directorio de logs:", error);
    }
  }

  /**
   * Log de query
   */
  async _logQuery(record) {
    if (!this.config.logPath) return;

    try {
      const logEntry = {
        timestamp: record.timestamp.toISOString(),
        duration: record.duration,
        success: record.success,
        type: record.queryType,
        sql: record.sql.substring(0, 500), // Truncar SQL muy largo
        ...(record.error && { error: record.error }),
      };

      const logLine = JSON.stringify(logEntry) + "\n";

      // Verificar tamaño del archivo
      try {
        const stats = await fs.stat(this.config.logPath);
        if (stats.size > this.config.maxLogSize) {
          await this._rotateLog();
        }
      } catch (error) {
        // Archivo no existe, está bien
      }

      await fs.appendFile(this.config.logPath, logLine);
    } catch (error) {
      console.error("Error escribiendo log de performance:", error);
    }
  }

  /**
   * Rotar log cuando alcanza el tamaño máximo
   */
  async _rotateLog() {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const rotatedPath = this.config.logPath.replace(
        ".log",
        `-${timestamp}.log`
      );

      await fs.rename(this.config.logPath, rotatedPath);
    } catch (error) {
      console.error("Error rotando log:", error);
    }
  }

  /**
   * Timer de limpieza de datos antiguos
   */
  _startCleanupTimer() {
    // Ejecutar limpieza cada hora
    setInterval(() => {
      this._cleanupOldData();
    }, 60 * 60 * 1000);
  }

  /**
   * Limpiar datos antiguos
   */
  _cleanupOldData() {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);

    // Limpiar historial de queries
    this.queryHistory = this.queryHistory.filter(
      (q) => q.timestamp > cutoffDate
    );

    // Limpiar estadísticas por hora
    Object.keys(this.stats.hourlyStats).forEach((hourKey) => {
      const hourDate = new Date(hourKey);
      if (hourDate < cutoffDate) {
        delete this.stats.hourlyStats[hourKey];
      }
    });
  }

  /**
   * Generar recomendaciones
   */
  _generateRecommendations(stats, slowQueries) {
    const recommendations = [];

    if (stats.slowQueryPercentage > 10) {
      recommendations.push({
        type: "performance",
        severity: "high",
        message: `${stats.slowQueryPercentage}% de queries son lentas. Considere optimizar las consultas más frecuentes.`,
      });
    }

    if (stats.failureRate > 5) {
      recommendations.push({
        type: "reliability",
        severity: "high",
        message: `${stats.failureRate}% de queries fallan. Revise los errores más comunes.`,
      });
    }

    if (slowQueries.length > 0) {
      const commonPatterns = this._findCommonSlowQueryPatterns(slowQueries);
      if (commonPatterns.length > 0) {
        recommendations.push({
          type: "optimization",
          severity: "medium",
          message: `Patrones comunes en queries lentas: ${commonPatterns.join(
            ", "
          )}`,
        });
      }
    }

    return recommendations;
  }

  /**
   * Encontrar patrones comunes en queries lentas
   */
  _findCommonSlowQueryPatterns(slowQueries) {
    const patterns = [];

    const hasFullTableScan = slowQueries.some(
      (q) => q.sql && (q.sql.includes("SELECT *") || !q.sql.includes("WHERE"))
    );

    if (hasFullTableScan) {
      patterns.push("Full table scans");
    }

    const hasComplexJoins = slowQueries.some(
      (q) => q.sql && (q.sql.match(/JOIN/gi) || []).length > 3
    );

    if (hasComplexJoins) {
      patterns.push("Complex joins");
    }

    return patterns;
  }

  /**
   * Formatear duración
   */
  _formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d ${hours % 24}h ${minutes % 60}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Generar ID único
   */
  _generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}

module.exports = PerformanceMonitor;
