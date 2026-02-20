const router = require('express').Router();
const db = require('../config/database');
const { getConnection } = require('../config/connectionManager');
const { authenticate, authorize } = require('../middleware/auth.middleware');

router.get('/', authenticate, authorize('admin', 'analyst'), async (req, res, next) => {
  try {
    const connectionId = req.query.connectionId;
    let targetDb;
    let dbType = 'postgresql';
    try {
      const conn = await getConnection(connectionId);
      targetDb = conn.db;
      dbType = conn.dbType || 'postgresql';
    } catch (err) {
      targetDb = db;
      dbType = 'postgresql';
    }

    let result;
    try {
      if (dbType === 'mssql') {
        result = await getMssqlSchema(targetDb);
      } else if (dbType === 'mysql') {
        result = await getMysqlSchema(targetDb);
      } else {
        result = await getPostgresSchema(targetDb);
      }
    } catch (schemaErr) {
      throw schemaErr;
    }

    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

function toRows(result) {
  if (!result) return [];
  if (Array.isArray(result)) return result;
  if (result.rows) return result.rows;
  if (result.recordset) return result.recordset;
  if (result.recordsets?.[0]) return result.recordsets[0];
  if (result[0]) return Array.isArray(result[0]) ? result[0] : [result[0]];
  return [];
}

function getRowVal(row, ...keys) {
  if (!row || typeof row !== 'object') return undefined;
  const keySet = new Set(Object.keys(row));
  for (const k of keys) {
    let v = row[k];
    if (v !== undefined) return v;
    const upper = typeof k === 'string' ? k.toUpperCase() : k;
    const lower = typeof k === 'string' ? k.toLowerCase() : k;
    const found = keySet.has(upper) ? row[upper] : keySet.has(lower) ? row[lower] : undefined;
    if (found !== undefined) return found;
  }
  return undefined;
}

async function getPostgresSchema(targetDb) {
  const dbName = targetDb.client?.config?.connection?.database || 'database';

  const tablesResult = await targetDb.raw(`
    SELECT table_name, table_type FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type IN ('BASE TABLE', 'VIEW') ORDER BY table_name
  `);

  const columnsResult = await targetDb.raw(`
    SELECT c.table_name, c.column_name, c.data_type, c.is_nullable,
      c.column_default, c.character_maximum_length, c.numeric_precision, c.ordinal_position
    FROM information_schema.columns c WHERE c.table_schema = 'public'
    ORDER BY c.table_name, c.ordinal_position
  `);

  const pkResult = await targetDb.raw(`
    SELECT tc.table_name, kcu.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
    WHERE tc.constraint_type = 'PRIMARY KEY' AND tc.table_schema = 'public'
  `);

  const fkResult = await targetDb.raw(`
    SELECT tc.constraint_name,
      kcu.table_name AS source_table, kcu.column_name AS source_column,
      ccu.table_name AS target_table, ccu.column_name AS target_column
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage ccu
      ON tc.constraint_name = ccu.constraint_name AND tc.table_schema = ccu.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
  `);

  const uniqueResult = await targetDb.raw(`
    SELECT tc.table_name, kcu.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
    WHERE tc.constraint_type = 'UNIQUE' AND tc.table_schema = 'public'
  `);

  let rowCounts = {};
  try {
    const rowCountResult = await targetDb.raw(`
      SELECT relname AS table_name, n_live_tup AS estimated_rows
      FROM pg_stat_user_tables WHERE schemaname = 'public' ORDER BY relname
    `);
    toRows(rowCountResult).forEach((r) => { rowCounts[r.table_name] = parseInt(r.estimated_rows) || 0; });
  } catch { /* ignore if pg_stat not available */ }

  const pkRows = toRows(pkResult);
  const uniqueRows = toRows(uniqueResult);
  const fkRows = toRows(fkResult);
  const pkSet = new Set(pkRows.map((r) => `${r.table_name}.${r.column_name}`));
  const uniqueSet = new Set(uniqueRows.map((r) => `${r.table_name}.${r.column_name}`));

  const columnsByTable = {};
  toRows(columnsResult).forEach((c) => {
    if (!columnsByTable[c.table_name]) columnsByTable[c.table_name] = [];
    columnsByTable[c.table_name].push({
      name: c.column_name,
      type: formatPgType(c),
      nullable: c.is_nullable === 'YES',
      hasDefault: !!c.column_default,
      isPrimaryKey: pkSet.has(`${c.table_name}.${c.column_name}`),
      isUnique: uniqueSet.has(`${c.table_name}.${c.column_name}`),
      isForeignKey: fkRows.some((fk) => fk.source_table === c.table_name && fk.source_column === c.column_name),
      position: c.ordinal_position,
    });
  });

  const tables = toRows(tablesResult).map((t) => ({
    name: t.table_name,
    type: t.table_type === 'VIEW' ? 'view' : 'table',
    columns: columnsByTable[t.table_name] || [],
    rowCount: rowCounts[t.table_name] || 0,
  }));

  const relationships = fkRows.map((fk) => ({
    name: fk.constraint_name,
    sourceTable: fk.source_table, sourceColumn: fk.source_column,
    targetTable: fk.target_table, targetColumn: fk.target_column,
  }));

  const tableCount = tables.filter((t) => t.type === 'table').length;
  const viewCount = tables.filter((t) => t.type === 'view').length;

  return {
    database: dbName, dbType: 'postgresql', tables, relationships,
    stats: { tableCount, viewCount, relationshipCount: relationships.length, totalColumns: toRows(columnsResult).length },
  };
}

async function getMssqlSchema(targetDb) {
  const dbResult = await targetDb.raw('SELECT DB_NAME() AS db');
  const dbRows = toRows(dbResult);
  const dbName = getRowVal(dbRows[0], 'db', 'DB') || 'database';

  const tablesRaw = await targetDb.raw(`
    SELECT TABLE_NAME AS table_name, TABLE_TYPE AS table_type FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_TYPE IN ('BASE TABLE', 'VIEW') ORDER BY TABLE_NAME
  `);
  const tableRows = toRows(tablesRaw);
  const tableEntries = tableRows.map((r) => ({
    name: getRowVal(r, 'table_name', 'TABLE_NAME') || r.table_name || r.TABLE_NAME,
    tableType: getRowVal(r, 'table_type', 'TABLE_TYPE') || r.table_type || r.TABLE_TYPE,
  })).filter((e) => e.name);
  const tableNames = tableEntries.map((e) => e.name);

  const colsRaw = await targetDb.raw(`
    SELECT TABLE_NAME AS table_name, COLUMN_NAME AS column_name, DATA_TYPE AS data_type,
      IS_NULLABLE AS is_nullable, COLUMN_DEFAULT AS column_default,
      CHARACTER_MAXIMUM_LENGTH AS char_max_len, NUMERIC_PRECISION AS num_prec,
      ORDINAL_POSITION AS ordinal_position
    FROM INFORMATION_SCHEMA.COLUMNS ORDER BY TABLE_NAME, ORDINAL_POSITION
  `);
  const cols = toRows(colsRaw);

  const pkRaw = await targetDb.raw(`
    SELECT tc.TABLE_NAME AS table_name, kcu.COLUMN_NAME AS column_name
    FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
    JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
      ON tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME AND tc.TABLE_SCHEMA = kcu.TABLE_SCHEMA
    WHERE tc.CONSTRAINT_TYPE = 'PRIMARY KEY'
  `);
  const pks = toRows(pkRaw);

  const fkRaw = await targetDb.raw(`
    SELECT fk.name AS constraint_name,
      tp.name AS source_table, cp.name AS source_column,
      tr.name AS target_table, cr.name AS target_column
    FROM sys.foreign_keys fk
    INNER JOIN sys.foreign_key_columns fkc ON fk.object_id = fkc.constraint_object_id
    INNER JOIN sys.tables tp ON fkc.parent_object_id = tp.object_id
    INNER JOIN sys.columns cp ON fkc.parent_object_id = cp.object_id AND fkc.parent_column_id = cp.column_id
    INNER JOIN sys.tables tr ON fkc.referenced_object_id = tr.object_id
    INNER JOIN sys.columns cr ON fkc.referenced_object_id = cr.object_id AND fkc.referenced_column_id = cr.column_id
  `);
  const fks = toRows(fkRaw);

  const uniqueRaw = await targetDb.raw(`
    SELECT tc.TABLE_NAME AS table_name, kcu.COLUMN_NAME AS column_name
    FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
    JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
      ON tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME AND tc.TABLE_SCHEMA = kcu.TABLE_SCHEMA
    WHERE tc.CONSTRAINT_TYPE = 'UNIQUE'
  `);
  const uniques = toRows(uniqueRaw);

  let rowCounts = {};
  try {
    const rcRaw = await targetDb.raw(`
      SELECT t.name AS table_name, SUM(p.rows) AS row_count
      FROM sys.tables t JOIN sys.partitions p ON t.object_id = p.object_id
      WHERE p.index_id IN (0, 1) GROUP BY t.name
    `);
    toRows(rcRaw).forEach((r) => {
      const tn = getRowVal(r, 'table_name', 'TABLE_NAME');
      const rc = getRowVal(r, 'row_count', 'row_count');
      if (tn) rowCounts[tn] = parseInt(rc) || 0;
    });
  } catch { /* ignore */ }

  const pkSet = new Set(pks.map((r) => `${getRowVal(r, 'table_name', 'TABLE_NAME')}.${getRowVal(r, 'column_name', 'COLUMN_NAME')}`));
  const uniqueSet = new Set(uniques.map((r) => `${getRowVal(r, 'table_name', 'TABLE_NAME')}.${getRowVal(r, 'column_name', 'COLUMN_NAME')}`));
  const fkSourceSet = new Set(fks.map((fk) => `${getRowVal(fk, 'source_table')}.${getRowVal(fk, 'source_column')}`));

  const columnsByTable = {};
  cols.forEach((c) => {
    const tn = getRowVal(c, 'table_name', 'TABLE_NAME');
    if (!tn) return;
    if (!columnsByTable[tn]) columnsByTable[tn] = [];
    let type = getRowVal(c, 'data_type', 'DATA_TYPE') || 'unknown';
    const charMax = getRowVal(c, 'char_max_len', 'CHARACTER_MAXIMUM_LENGTH');
    const numPrec = getRowVal(c, 'num_prec', 'NUMERIC_PRECISION');
    if (charMax && charMax > 0) type += `(${charMax})`;
    else if (numPrec) type += `(${numPrec})`;
    const colName = getRowVal(c, 'column_name', 'COLUMN_NAME');
    const isNullable = (getRowVal(c, 'is_nullable', 'IS_NULLABLE') || '').toUpperCase() === 'YES';
    const hasDefault = !!getRowVal(c, 'column_default', 'COLUMN_DEFAULT');
    const pos = getRowVal(c, 'ordinal_position', 'ORDINAL_POSITION');
    columnsByTable[tn].push({
      name: colName, type, nullable: isNullable,
      hasDefault,
      isPrimaryKey: pkSet.has(`${tn}.${colName}`),
      isUnique: uniqueSet.has(`${tn}.${colName}`),
      isForeignKey: fkSourceSet.has(`${tn}.${colName}`),
      position: pos,
    });
  });

  const typeMap = {};
  tableEntries.forEach((e) => { typeMap[e.name] = e.tableType; });

  const tables = tableNames.map((t) => ({
    name: t,
    type: typeMap[t] === 'VIEW' ? 'view' : 'table',
    columns: columnsByTable[t] || [],
    rowCount: rowCounts[t] || 0,
  }));

  const relationships = fks.map((fk) => ({
    name: getRowVal(fk, 'constraint_name'),
    sourceTable: getRowVal(fk, 'source_table'), sourceColumn: getRowVal(fk, 'source_column'),
    targetTable: getRowVal(fk, 'target_table'), targetColumn: getRowVal(fk, 'target_column'),
  }));

  const tableCount = tables.filter((t) => t.type === 'table').length;
  const viewCount = tables.filter((t) => t.type === 'view').length;

  return {
    database: dbName, dbType: 'mssql', tables, relationships,
    stats: { tableCount, viewCount, relationshipCount: relationships.length, totalColumns: cols.length },
  };
}

async function getMysqlSchema(targetDb) {
  const dbResult = await targetDb.raw('SELECT DATABASE() AS db');
  const dbName = (dbResult[0] || dbResult.rows || [])[0]?.db || 'database';

  const tablesRaw = await targetDb.raw(`
    SELECT TABLE_NAME AS table_name, TABLE_TYPE AS table_type FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE IN ('BASE TABLE', 'VIEW') ORDER BY TABLE_NAME
  `);
  const tableEntries = (tablesRaw[0] || tablesRaw.rows || tablesRaw).map((r) => ({
    name: r.table_name || r.TABLE_NAME,
    tableType: r.table_type || r.TABLE_TYPE,
  }));
  const tableNames = tableEntries.map((e) => e.name);

  const colsRaw = await targetDb.raw(`
    SELECT TABLE_NAME AS table_name, COLUMN_NAME AS column_name, COLUMN_TYPE AS data_type,
      IS_NULLABLE AS is_nullable, COLUMN_DEFAULT AS column_default, COLUMN_KEY AS column_key,
      ORDINAL_POSITION AS ordinal_position
    FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE()
    ORDER BY TABLE_NAME, ORDINAL_POSITION
  `);
  const cols = colsRaw[0] || colsRaw.rows || colsRaw;

  const fkRaw = await targetDb.raw(`
    SELECT CONSTRAINT_NAME AS constraint_name,
      TABLE_NAME AS source_table, COLUMN_NAME AS source_column,
      REFERENCED_TABLE_NAME AS target_table, REFERENCED_COLUMN_NAME AS target_column
    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE() AND REFERENCED_TABLE_NAME IS NOT NULL
  `);
  const fks = fkRaw[0] || fkRaw.rows || fkRaw;

  let rowCounts = {};
  try {
    const rcRaw = await targetDb.raw(`
      SELECT TABLE_NAME AS table_name, TABLE_ROWS AS row_count
      FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE()
    `);
    (rcRaw[0] || rcRaw.rows || rcRaw).forEach((r) => {
      rowCounts[r.table_name || r.TABLE_NAME] = parseInt(r.row_count || r.TABLE_ROWS) || 0;
    });
  } catch { /* ignore */ }

  const fkSourceSet = new Set(fks.map((fk) => `${fk.source_table}.${fk.source_column}`));

  const columnsByTable = {};
  cols.forEach((c) => {
    const tbl = c.table_name;
    if (!columnsByTable[tbl]) columnsByTable[tbl] = [];
    columnsByTable[tbl].push({
      name: c.column_name, type: c.data_type, nullable: c.is_nullable === 'YES',
      hasDefault: !!c.column_default,
      isPrimaryKey: c.column_key === 'PRI',
      isUnique: c.column_key === 'UNI',
      isForeignKey: fkSourceSet.has(`${tbl}.${c.column_name}`),
      position: c.ordinal_position,
    });
  });

  const typeMap = {};
  tableEntries.forEach((e) => { typeMap[e.name] = e.tableType; });

  const tables = tableNames.map((t) => ({
    name: t,
    type: typeMap[t] === 'VIEW' ? 'view' : 'table',
    columns: columnsByTable[t] || [],
    rowCount: rowCounts[t] || 0,
  }));

  const relationships = fks.map((fk) => ({
    name: fk.constraint_name,
    sourceTable: fk.source_table, sourceColumn: fk.source_column,
    targetTable: fk.target_table, targetColumn: fk.target_column,
  }));

  const tableCount = tables.filter((t) => t.type === 'table').length;
  const viewCount = tables.filter((t) => t.type === 'view').length;

  return {
    database: dbName, dbType: 'mysql', tables, relationships,
    stats: { tableCount, viewCount, relationshipCount: relationships.length, totalColumns: cols.length },
  };
}

function formatPgType(col) {
  let t = col.data_type;
  if (t === 'character varying' && col.character_maximum_length) t = `varchar(${col.character_maximum_length})`;
  else if (t === 'character varying') t = 'varchar';
  else if (t === 'numeric' && col.numeric_precision) t = `numeric(${col.numeric_precision})`;
  else if (t === 'timestamp with time zone') t = 'timestamptz';
  else if (t === 'timestamp without time zone') t = 'timestamp';
  else if (t === 'USER-DEFINED') t = 'enum';
  return t;
}

module.exports = router;
