/**
 * Query Builder Universal
 * Construye queries para MongoDB, PostgreSQL y MySQL
 */

class QueryBuilder {
  constructor(dbType) {
    this.dbType = dbType.toLowerCase();
    this.reset();
  }

  /**
   * Resetear el builder
   */
  reset() {
    this.query = {
      type: null,
      table: null,
      collection: null,
      fields: [],
      joins: [],
      where: [],
      having: [],
      orderBy: [],
      groupBy: [],
      limit: null,
      offset: null,
      values: [],
      updates: {},
      pipeline: [], // Para MongoDB aggregation
    };
    return this;
  }

  /**
   * Clonar el builder
   */
  clone() {
    const cloned = new QueryBuilder(this.dbType);
    cloned.query = JSON.parse(JSON.stringify(this.query));
    return cloned;
  }

  /**
   * SELECT query
   */
  select(fields = ["*"]) {
    this.query.type = "select";
    this.query.fields = Array.isArray(fields) ? fields : [fields];
    return this;
  }

  /**
   * FROM clause / Collection
   */
  from(table) {
    if (this.dbType === "mongodb") {
      this.query.collection = table;
    } else {
      this.query.table = table;
    }
    return this;
  }

  /**
   * WHERE clause
   */
  where(field, operator, value) {
    // Si solo se pasan 2 parámetros, asumir operador '='
    if (arguments.length === 2) {
      value = operator;
      operator = "=";
    }

    this.query.where.push({
      field,
      operator,
      value,
      logic: "AND",
    });
    return this;
  }

  /**
   * OR WHERE clause
   */
  orWhere(field, operator, value) {
    if (arguments.length === 2) {
      value = operator;
      operator = "=";
    }

    this.query.where.push({
      field,
      operator,
      value,
      logic: "OR",
    });
    return this;
  }

  /**
   * WHERE IN clause
   */
  whereIn(field, values) {
    this.query.where.push({
      field,
      operator: "IN",
      value: values,
      logic: "AND",
    });
    return this;
  }

  /**
   * WHERE BETWEEN clause
   */
  whereBetween(field, min, max) {
    this.query.where.push({
      field,
      operator: "BETWEEN",
      value: [min, max],
      logic: "AND",
    });
    return this;
  }

  /**
   * WHERE LIKE clause
   */
  whereLike(field, pattern) {
    this.query.where.push({
      field,
      operator: "LIKE",
      value: pattern,
      logic: "AND",
    });
    return this;
  }

  /**
   * WHERE NULL clause
   */
  whereNull(field) {
    this.query.where.push({
      field,
      operator: "IS NULL",
      value: null,
      logic: "AND",
    });
    return this;
  }

  /**
   * WHERE NOT NULL clause
   */
  whereNotNull(field) {
    this.query.where.push({
      field,
      operator: "IS NOT NULL",
      value: null,
      logic: "AND",
    });
    return this;
  }

  /**
   * JOIN clause (solo SQL)
   */
  join(table, firstField, operator, secondField) {
    if (this.dbType === "mongodb") {
      console.warn(
        "JOIN no es soportado nativamente en MongoDB. Use aggregate con $lookup"
      );
      return this;
    }

    if (arguments.length === 3) {
      secondField = operator;
      operator = "=";
    }

    this.query.joins.push({
      type: "INNER",
      table,
      firstField,
      operator,
      secondField,
    });
    return this;
  }

  /**
   * LEFT JOIN clause
   */
  leftJoin(table, firstField, operator, secondField) {
    if (this.dbType === "mongodb") {
      console.warn(
        "LEFT JOIN no es soportado nativamente en MongoDB. Use aggregate con $lookup"
      );
      return this;
    }

    if (arguments.length === 3) {
      secondField = operator;
      operator = "=";
    }

    this.query.joins.push({
      type: "LEFT",
      table,
      firstField,
      operator,
      secondField,
    });
    return this;
  }

  /**
   * ORDER BY clause
   */
  orderBy(field, direction = "ASC") {
    this.query.orderBy.push({
      field,
      direction: direction.toUpperCase(),
    });
    return this;
  }

  /**
   * GROUP BY clause
   */
  groupBy(fields) {
    this.query.groupBy = Array.isArray(fields) ? fields : [fields];
    return this;
  }

  /**
   * HAVING clause
   */
  having(field, operator, value) {
    if (arguments.length === 2) {
      value = operator;
      operator = "=";
    }

    this.query.having.push({
      field,
      operator,
      value,
      logic: "AND",
    });
    return this;
  }

  /**
   * LIMIT clause
   */
  limit(count) {
    this.query.limit = count;
    return this;
  }

  /**
   * OFFSET clause
   */
  offset(count) {
    this.query.offset = count;
    return this;
  }

  /**
   * INSERT query
   */
  insert(data) {
    this.query.type = "insert";
    this.query.values = Array.isArray(data) ? data : [data];
    return this;
  }

  /**
   * UPDATE query
   */
  update(data) {
    this.query.type = "update";
    this.query.updates = data;
    return this;
  }

  /**
   * DELETE query
   */
  delete() {
    this.query.type = "delete";
    return this;
  }

  /**
   * COUNT query
   */
  count(field = "*") {
    this.query.type = "count";
    this.query.fields = [field];
    return this;
  }

  /**
   * Búsqueda de texto completo
   */
  search(fields, term) {
    if (this.dbType === "mongodb") {
      // MongoDB text search
      this.query.where.push({
        field: "$text",
        operator: "$search",
        value: term,
        logic: "AND",
      });
    } else {
      // SQL full-text search o LIKE
      const searchConditions = fields.map((field) => ({
        field,
        operator: "LIKE",
        value: `%${term}%`,
        logic: "OR",
      }));

      // Agrupar condiciones de búsqueda
      this.query.where.push({
        type: "group",
        conditions: searchConditions,
        logic: "AND",
      });
    }
    return this;
  }

  /**
   * Aggregation pipeline (MongoDB)
   */
  aggregate(pipeline) {
    if (this.dbType !== "mongodb") {
      throw new Error("Aggregate solo es soportado en MongoDB");
    }

    this.query.type = "aggregate";
    this.query.pipeline = pipeline;
    return this;
  }

  /**
   * $match stage para aggregation (MongoDB)
   */
  match(conditions) {
    if (this.dbType !== "mongodb") {
      throw new Error("Match solo es soportado en MongoDB");
    }

    this.query.pipeline.push({
      $match: conditions,
    });
    return this;
  }

  /**
   * $group stage para aggregation (MongoDB)
   */
  aggregateGroup(groupBy, operations = {}) {
    if (this.dbType !== "mongodb") {
      throw new Error("Group solo es soportado en MongoDB");
    }

    this.query.pipeline.push({
      $group: {
        _id: groupBy,
        ...operations,
      },
    });
    return this;
  }

  /**
   * $lookup stage para aggregation (MongoDB - equivalente a JOIN)
   */
  lookup(from, localField, foreignField, as) {
    if (this.dbType !== "mongodb") {
      throw new Error("Lookup solo es soportado en MongoDB");
    }

    this.query.pipeline.push({
      $lookup: {
        from,
        localField,
        foreignField,
        as,
      },
    });
    return this;
  }

  /**
   * Convertir a SQL
   */
  toSQL() {
    if (this.dbType === "mongodb") {
      return this.toMongoDB();
    }

    switch (this.query.type) {
      case "select":
        return this._buildSelectSQL();
      case "insert":
        return this._buildInsertSQL();
      case "update":
        return this._buildUpdateSQL();
      case "delete":
        return this._buildDeleteSQL();
      case "count":
        return this._buildCountSQL();
      default:
        throw new Error(`Tipo de query no soportado: ${this.query.type}`);
    }
  }

  /**
   * Convertir a MongoDB query
   */
  toMongoDB() {
    if (this.dbType !== "mongodb") {
      throw new Error("toMongoDB solo puede ser usado con MongoDB");
    }

    const operation = {
      collection: this.query.collection,
    };

    switch (this.query.type) {
      case "select":
        operation.method = "find";
        operation.query = this._buildMongoWhere();
        if (this.query.fields.length > 0 && !this.query.fields.includes("*")) {
          operation.projection = this._buildMongoProjection();
        }
        if (this.query.orderBy.length > 0) {
          operation.sort = this._buildMongoSort();
        }
        if (this.query.limit) {
          operation.limit = this.query.limit;
        }
        if (this.query.offset) {
          operation.skip = this.query.offset;
        }
        break;

      case "insert":
        operation.method =
          this.query.values.length > 1 ? "insertMany" : "insertOne";
        operation.query =
          this.query.values.length > 1
            ? this.query.values
            : this.query.values[0];
        break;

      case "update":
        operation.method = "updateMany";
        operation.query = this._buildMongoWhere();
        operation.update = { $set: this.query.updates };
        break;

      case "delete":
        operation.method = "deleteMany";
        operation.query = this._buildMongoWhere();
        break;

      case "count":
        operation.method = "count";
        operation.query = this._buildMongoWhere();
        break;

      case "aggregate":
        operation.method = "aggregate";
        operation.pipeline = this.query.pipeline;
        break;

      default:
        throw new Error(
          `Tipo de query no soportado para MongoDB: ${this.query.type}`
        );
    }

    return operation;
  }

  /**
   * Construir SELECT SQL
   */
  _buildSelectSQL() {
    let sql = `SELECT ${this.query.fields.join(", ")} FROM ${this.query.table}`;

    // JOINs
    if (this.query.joins.length > 0) {
      sql +=
        " " +
        this.query.joins
          .map(
            (join) =>
              `${join.type} JOIN ${join.table} ON ${join.firstField} ${join.operator} ${join.secondField}`
          )
          .join(" ");
    }

    // WHERE
    if (this.query.where.length > 0) {
      sql += " WHERE " + this._buildSQLWhere();
    }

    // GROUP BY
    if (this.query.groupBy.length > 0) {
      sql += " GROUP BY " + this.query.groupBy.join(", ");
    }

    // HAVING
    if (this.query.having.length > 0) {
      sql += " HAVING " + this._buildSQLHaving();
    }

    // ORDER BY
    if (this.query.orderBy.length > 0) {
      sql +=
        " ORDER BY " +
        this.query.orderBy
          .map((order) => `${order.field} ${order.direction}`)
          .join(", ");
    }

    // LIMIT
    if (this.query.limit) {
      if (this.dbType === "mysql") {
        sql += ` LIMIT ${this.query.limit}`;
        if (this.query.offset) {
          sql += ` OFFSET ${this.query.offset}`;
        }
      } else if (this.dbType === "postgresql") {
        sql += ` LIMIT ${this.query.limit}`;
        if (this.query.offset) {
          sql += ` OFFSET ${this.query.offset}`;
        }
      }
    }

    return sql;
  }

  /**
   * Construir INSERT SQL
   */
  _buildInsertSQL() {
    if (this.query.values.length === 0) {
      throw new Error("No hay datos para insertar");
    }

    const firstRecord = this.query.values[0];
    const columns = Object.keys(firstRecord);

    let sql = `INSERT INTO ${this.query.table} (${columns.join(", ")}) VALUES `;

    const valuePlaceholders = this.query.values
      .map((record) => `(${columns.map(() => "?").join(", ")})`)
      .join(", ");

    sql += valuePlaceholders;

    return sql;
  }

  /**
   * Construir UPDATE SQL
   */
  _buildUpdateSQL() {
    const updates = Object.keys(this.query.updates).map((key) => `${key} = ?`);
    let sql = `UPDATE ${this.query.table} SET ${updates.join(", ")}`;

    if (this.query.where.length > 0) {
      sql += " WHERE " + this._buildSQLWhere();
    }

    return sql;
  }

  /**
   * Construir DELETE SQL
   */
  _buildDeleteSQL() {
    let sql = `DELETE FROM ${this.query.table}`;

    if (this.query.where.length > 0) {
      sql += " WHERE " + this._buildSQLWhere();
    }

    return sql;
  }

  /**
   * Construir COUNT SQL
   */
  _buildCountSQL() {
    let sql = `SELECT COUNT(${this.query.fields[0]}) as count FROM ${this.query.table}`;

    if (this.query.where.length > 0) {
      sql += " WHERE " + this._buildSQLWhere();
    }

    return sql;
  }

  /**
   * Construir WHERE clause para SQL
   */
  _buildSQLWhere() {
    return this._buildSQLConditions(this.query.where);
  }

  /**
   * Construir HAVING clause para SQL
   */
  _buildSQLHaving() {
    return this._buildSQLConditions(this.query.having);
  }

  /**
   * Construir condiciones SQL
   */
  _buildSQLConditions(conditions) {
    if (conditions.length === 0) return "";

    let sql = "";

    for (let i = 0; i < conditions.length; i++) {
      const condition = conditions[i];

      if (i > 0) {
        sql += ` ${condition.logic} `;
      }

      if (condition.type === "group") {
        sql += "(" + this._buildSQLConditions(condition.conditions) + ")";
      } else {
        switch (condition.operator) {
          case "IN":
            sql += `${condition.field} IN (${condition.value
              .map(() => "?")
              .join(", ")})`;
            break;
          case "BETWEEN":
            sql += `${condition.field} BETWEEN ? AND ?`;
            break;
          case "IS NULL":
            sql += `${condition.field} IS NULL`;
            break;
          case "IS NOT NULL":
            sql += `${condition.field} IS NOT NULL`;
            break;
          default:
            sql += `${condition.field} ${condition.operator} ?`;
        }
      }
    }

    return sql;
  }

  /**
   * Construir WHERE para MongoDB
   */
  _buildMongoWhere() {
    const query = {};

    for (const condition of this.query.where) {
      if (condition.type === "group") {
        // Manejar grupos de condiciones (para búsqueda)
        const orConditions = condition.conditions.map((cond) => ({
          [cond.field]: this._getMongoOperator(cond.operator, cond.value),
        }));

        if (
          condition.logic === "OR" ||
          condition.conditions[0].logic === "OR"
        ) {
          query.$or = orConditions;
        } else {
          query.$and = orConditions;
        }
      } else {
        const mongoCondition = this._getMongoOperator(
          condition.operator,
          condition.value
        );

        if (condition.logic === "OR") {
          if (!query.$or) query.$or = [];
          query.$or.push({ [condition.field]: mongoCondition });
        } else {
          query[condition.field] = mongoCondition;
        }
      }
    }

    return query;
  }

  /**
   * Obtener operador MongoDB
   */
  _getMongoOperator(operator, value) {
    switch (operator) {
      case "=":
        return value;
      case "!=":
      case "<>":
        return { $ne: value };
      case ">":
        return { $gt: value };
      case ">=":
        return { $gte: value };
      case "<":
        return { $lt: value };
      case "<=":
        return { $lte: value };
      case "IN":
        return { $in: value };
      case "LIKE":
        return { $regex: value.replace(/%/g, ".*"), $options: "i" };
      case "BETWEEN":
        return { $gte: value[0], $lte: value[1] };
      case "IS NULL":
        return null;
      case "IS NOT NULL":
        return { $ne: null };
      case "$search":
        return value;
      default:
        return value;
    }
  }

  /**
   * Construir proyección MongoDB
   */
  _buildMongoProjection() {
    const projection = {};
    for (const field of this.query.fields) {
      projection[field] = 1;
    }
    return projection;
  }

  /**
   * Construir sort MongoDB
   */
  _buildMongoSort() {
    const sort = {};
    for (const order of this.query.orderBy) {
      sort[order.field] = order.direction === "ASC" ? 1 : -1;
    }
    return sort;
  }

  /**
   * Obtener parámetros para la query
   */
  getParams() {
    const params = [];

    // Parámetros de WHERE
    for (const condition of this.query.where) {
      if (condition.type === "group") {
        for (const groupCondition of condition.conditions) {
          this._addConditionParams(groupCondition, params);
        }
      } else {
        this._addConditionParams(condition, params);
      }
    }

    // Parámetros de INSERT
    if (this.query.type === "insert") {
      for (const record of this.query.values) {
        params.push(...Object.values(record));
      }
    }

    // Parámetros de UPDATE
    if (this.query.type === "update") {
      params.push(...Object.values(this.query.updates));
    }

    // Parámetros de HAVING
    for (const condition of this.query.having) {
      this._addConditionParams(condition, params);
    }

    return params;
  }

  /**
   * Agregar parámetros de condición
   */
  _addConditionParams(condition, params) {
    switch (condition.operator) {
      case "IN":
        params.push(...condition.value);
        break;
      case "BETWEEN":
        params.push(condition.value[0], condition.value[1]);
        break;
      case "IS NULL":
      case "IS NOT NULL":
        // No agregar parámetros
        break;
      default:
        if (condition.value !== null && condition.value !== undefined) {
          params.push(condition.value);
        }
    }
  }
}

module.exports = QueryBuilder;
