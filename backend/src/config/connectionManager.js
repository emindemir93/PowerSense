const knex = require('knex');
const appDb = require('./database');

const pools = new Map();

function injectMssqlTop(sql, max) {
  const trimmed = sql.trim();
  if (/\bSELECT\s+TOP\s+\d+/i.test(trimmed)) {
    return trimmed.replace(/\bSELECT\s+TOP\s+\d+/i, `SELECT TOP ${max}`);
  }
  if (/\bSELECT\s+DISTINCT\s+TOP\s+\d+/i.test(trimmed)) {
    return trimmed.replace(/\bSELECT\s+DISTINCT\s+TOP\s+\d+/i, `SELECT DISTINCT TOP ${max}`);
  }
  if (/\bSELECT\s+DISTINCT\s+/i.test(trimmed)) {
    return trimmed.replace(/\bSELECT\s+DISTINCT\s+/i, `SELECT DISTINCT TOP ${max} `);
  }
  return trimmed.replace(/\bSELECT\s+/i, `SELECT TOP ${max} `);
}

const DB_CONFIGS = {
  postgresql: {
    client: 'pg',
    buildConnection: (conn) => ({
      host: conn.host,
      port: conn.port || 5432,
      database: conn.database,
      user: conn.username,
      password: conn.password_encrypted,
      ssl: conn.ssl ? { rejectUnauthorized: false } : false,
      connectTimeout: 10000,
    }),
    versionQuery: 'SELECT version() AS version, current_database() AS db, current_user AS "user"',
    tableCountQuery: "SELECT COUNT(*) AS count FROM information_schema.tables WHERE table_schema = 'public' AND table_type IN ('BASE TABLE', 'VIEW')",
    schemaQuery: `
      SELECT t.table_name, t.table_type,
        array_agg(json_build_object('column', c.column_name, 'type', c.data_type, 'nullable', c.is_nullable, 'default', c.column_default) ORDER BY c.ordinal_position) AS columns
      FROM information_schema.tables t
      JOIN information_schema.columns c ON c.table_schema = t.table_schema AND c.table_name = t.table_name
      WHERE t.table_schema = 'public' AND t.table_type IN ('BASE TABLE', 'VIEW')
      GROUP BY t.table_name, t.table_type ORDER BY t.table_name`,
    fkQuery: `
      SELECT tc.table_name AS from_table, kcu.column_name AS from_column, ccu.table_name AS to_table, ccu.column_name AS to_column
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'`,
    wrapLimit: (sql, max) => `SELECT * FROM (${sql}) AS __result LIMIT ${max}`,
  },
  mssql: {
    client: 'mssql',
    buildConnection: (conn) => ({
      server: conn.host,
      port: conn.port || 1433,
      database: conn.database,
      user: conn.username,
      password: conn.password_encrypted,
      options: {
        encrypt: conn.ssl || false,
        trustServerCertificate: true,
        connectTimeout: 10000,
        requestTimeout: 30000,
      },
    }),
    versionQuery: "SELECT @@VERSION AS version, DB_NAME() AS db, SUSER_SNAME() AS [user]",
    tableCountQuery: "SELECT COUNT(*) AS count FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE IN ('BASE TABLE', 'VIEW')",
    schemaQuery: null,
    fkQuery: null,
    wrapLimit: (sql, max) => injectMssqlTop(sql, max),
  },
  mysql: {
    client: 'mysql2',
    buildConnection: (conn) => ({
      host: conn.host,
      port: conn.port || 3306,
      database: conn.database,
      user: conn.username,
      password: conn.password_encrypted,
      ssl: conn.ssl ? { rejectUnauthorized: false } : undefined,
      connectTimeout: 10000,
    }),
    versionQuery: "SELECT VERSION() AS version, DATABASE() AS db, CURRENT_USER() AS user",
    tableCountQuery: "SELECT COUNT(*) AS count FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE IN ('BASE TABLE', 'VIEW')",
    schemaQuery: null,
    fkQuery: null,
    wrapLimit: (sql, max) => `SELECT * FROM (${sql}) AS __result LIMIT ${max}`,
  },
};

function getDbConfig(dbType) {
  return DB_CONFIGS[dbType] || DB_CONFIGS.postgresql;
}

function createKnexInstance(conn) {
  const config = getDbConfig(conn.db_type);
  return knex({
    client: config.client,
    connection: config.buildConnection(conn),
    pool: { min: 0, max: 5, idleTimeoutMillis: 30000 },
  });
}

async function getConnection(connectionId) {
  try {
    if (!connectionId) {
      const defaultConn = await appDb('data_connections')
        .where({ is_default: true, is_active: true })
        .first();
      if (!defaultConn) return { db: appDb, dbType: 'postgresql' };
      connectionId = defaultConn.id;
    }

    if (pools.has(connectionId)) {
      const conn = await appDb('data_connections').where({ id: connectionId }).select('db_type').first();
      return { db: pools.get(connectionId), dbType: conn?.db_type || 'postgresql' };
    }

    const conn = await appDb('data_connections')
      .where({ id: connectionId, is_active: true })
      .first();

    if (!conn) return { db: appDb, dbType: 'postgresql' };

    const instance = createKnexInstance(conn);
    pools.set(connectionId, instance);
    return { db: instance, dbType: conn.db_type || 'postgresql' };
  } catch (err) {
    return { db: appDb, dbType: 'postgresql' };
  }
}

async function testConnection(config) {
  const dbType = config.db_type || 'postgresql';
  const dbConfig = getDbConfig(dbType);
  let instance;
  try {
    instance = knex({
      client: dbConfig.client,
      connection: dbConfig.buildConnection({
        ...config,
        password_encrypted: config.password_encrypted || config.password,
      }),
      pool: { min: 0, max: 1 },
    });

    const result = await instance.raw(dbConfig.versionQuery);
    const rows = result.rows || result[0] || (Array.isArray(result) ? result : [result]);
    const info = Array.isArray(rows) ? rows[0] : rows;

    const tableResult = await instance.raw(dbConfig.tableCountQuery);
    const tableRows = tableResult.rows || tableResult[0] || (Array.isArray(tableResult) ? tableResult : [tableResult]);
    const tableInfo = Array.isArray(tableRows) ? tableRows[0] : tableRows;

    return {
      success: true,
      version: info?.version || info?.VERSION || 'Unknown',
      database: info?.db || info?.DB || config.database,
      user: info?.user || info?.USER || config.username,
      tableCount: parseInt(tableInfo?.count || tableInfo?.COUNT || 0),
      dbType,
    };
  } finally {
    if (instance) await instance.destroy().catch(() => {});
  }
}

function toRows(r) {
  if (!r) return [];
  if (Array.isArray(r)) return r;
  if (r.rows) return r.rows;
  if (r[0]) return Array.isArray(r[0]) ? r[0] : r;
  return [];
}

async function getTablesForConnection(connectionId) {
  const { db: targetDb, dbType } = await getConnection(connectionId);
  const config = getDbConfig(dbType);

  if (dbType === 'postgresql' && config.schemaQuery) {
    const result = await targetDb.raw(config.schemaQuery);
    const fkResult = await targetDb.raw(config.fkQuery);
    const fkMap = {};
    for (const fk of toRows(fkResult)) {
      if (!fkMap[fk.from_table]) fkMap[fk.from_table] = [];
      fkMap[fk.from_table].push(fk);
    }
    return toRows(result).map((r) => ({
      name: r.table_name,
      type: r.table_type === 'VIEW' ? 'view' : 'table',
      columns: r.columns,
      foreignKeys: fkMap[r.table_name] || [],
    }));
  }

  if (dbType === 'mssql') {
    const tablesResult = await targetDb.raw(`
      SELECT TABLE_NAME AS table_name, TABLE_TYPE AS table_type FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_TYPE IN ('BASE TABLE', 'VIEW') ORDER BY TABLE_NAME
    `);
    const tableEntries = toRows(tablesResult).map((r) => ({
      name: r.table_name || r.TABLE_NAME,
      tableType: r.table_type || r.TABLE_TYPE,
    }));
    const tables = tableEntries.map((e) => e.name);

    const colsResult = await targetDb.raw(`
      SELECT TABLE_NAME AS table_name, COLUMN_NAME AS column_name, DATA_TYPE AS data_type,
        IS_NULLABLE AS is_nullable, COLUMN_DEFAULT AS column_default, ORDINAL_POSITION AS ordinal_position
      FROM INFORMATION_SCHEMA.COLUMNS
      ORDER BY TABLE_NAME, ORDINAL_POSITION
    `);
    const cols = toRows(colsResult);

    const fkResult = await targetDb.raw(`
      SELECT fk.name AS constraint_name, tp.name AS from_table, cp.name AS from_column,
        tr.name AS to_table, cr.name AS to_column
      FROM sys.foreign_keys fk
      INNER JOIN sys.foreign_key_columns fkc ON fk.object_id = fkc.constraint_object_id
      INNER JOIN sys.tables tp ON fkc.parent_object_id = tp.object_id
      INNER JOIN sys.columns cp ON fkc.parent_object_id = cp.object_id AND fkc.parent_column_id = cp.column_id
      INNER JOIN sys.tables tr ON fkc.referenced_object_id = tr.object_id
      INNER JOIN sys.columns cr ON fkc.referenced_object_id = cr.object_id AND fkc.referenced_column_id = cr.column_id
    `);
    const fks = toRows(fkResult);

    const fkMap = {};
    for (const fk of fks) {
      const t = fk.from_table;
      if (!fkMap[t]) fkMap[t] = [];
      fkMap[t].push(fk);
    }

    const colMap = {};
    for (const c of cols) {
      const t = c.table_name;
      if (!colMap[t]) colMap[t] = [];
      colMap[t].push({ column: c.column_name, type: c.data_type, nullable: c.is_nullable, default: c.column_default });
    }

    const typeMap = {};
    tableEntries.forEach((e) => { typeMap[e.name] = e.tableType; });

    return tables.map((t) => ({
      name: t,
      type: typeMap[t] === 'VIEW' ? 'view' : 'table',
      columns: colMap[t] || [],
      foreignKeys: fkMap[t] || [],
    }));
  }

  if (dbType === 'mysql') {
    const tablesResult = await targetDb.raw(`
      SELECT TABLE_NAME AS table_name, TABLE_TYPE AS table_type FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE IN ('BASE TABLE', 'VIEW') ORDER BY TABLE_NAME
    `);
    const tableEntries = toRows(tablesResult).map((r) => ({
      name: r.table_name || r.TABLE_NAME,
      tableType: r.table_type || r.TABLE_TYPE,
    }));
    const tables = tableEntries.map((e) => e.name);

    const colsResult = await targetDb.raw(`
      SELECT TABLE_NAME AS table_name, COLUMN_NAME AS column_name, DATA_TYPE AS data_type,
        IS_NULLABLE AS is_nullable, COLUMN_DEFAULT AS column_default
      FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE()
      ORDER BY TABLE_NAME, ORDINAL_POSITION
    `);
    const cols = toRows(colsResult);

    const fkResult = await targetDb.raw(`
      SELECT TABLE_NAME AS from_table, COLUMN_NAME AS from_column,
        REFERENCED_TABLE_NAME AS to_table, REFERENCED_COLUMN_NAME AS to_column
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE() AND REFERENCED_TABLE_NAME IS NOT NULL
    `);
    const fks = toRows(fkResult);

    const colMap = {};
    for (const c of cols) {
      const t = c.table_name;
      if (!colMap[t]) colMap[t] = [];
      colMap[t].push({ column: c.column_name, type: c.data_type, nullable: c.is_nullable, default: c.column_default });
    }
    const fkMap = {};
    for (const fk of fks) {
      if (!fkMap[fk.from_table]) fkMap[fk.from_table] = [];
      fkMap[fk.from_table].push(fk);
    }

    const typeMap = {};
    tableEntries.forEach((e) => { typeMap[e.name] = e.tableType; });

    return tables.map((t) => ({
      name: t,
      type: typeMap[t] === 'VIEW' ? 'view' : 'table',
      columns: colMap[t] || [],
      foreignKeys: fkMap[t] || [],
    }));
  }

  return [];
}

function removePool(connectionId) {
  if (pools.has(connectionId)) {
    const instance = pools.get(connectionId);
    instance.destroy().catch(() => {});
    pools.delete(connectionId);
  }
}

function clearAllPools() {
  for (const [, instance] of pools) {
    instance.destroy().catch(() => {});
  }
  pools.clear();
}

module.exports = { getConnection, testConnection, getTablesForConnection, getDbConfig, removePool, clearAllPools };
