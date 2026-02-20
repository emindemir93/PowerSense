const router = require('express').Router();
const db = require('../config/database');
const { getConnection } = require('../config/connectionManager');
const { authenticate, authorize } = require('../middleware/auth.middleware');

router.get('/', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const connectionId = req.query.connectionId;
    const { db: targetDb, dbType } = await getConnection(connectionId);

    let result;
    if (dbType === 'mssql') {
      result = await getMssqlSchema(targetDb);
    } else if (dbType === 'mysql') {
      result = await getMysqlSchema(targetDb);
    } else {
      result = await getPostgresSchema(targetDb);
    }

    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

async function getPostgresSchema(targetDb) {
  const dbName = targetDb.client?.config?.connection?.database || 'database';

  const tablesResult = await targetDb.raw(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name
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
    rowCountResult.rows.forEach((r) => { rowCounts[r.table_name] = parseInt(r.estimated_rows) || 0; });
  } catch { /* ignore if pg_stat not available */ }

  const pkSet = new Set(pkResult.rows.map((r) => `${r.table_name}.${r.column_name}`));
  const uniqueSet = new Set(uniqueResult.rows.map((r) => `${r.table_name}.${r.column_name}`));

  const columnsByTable = {};
  columnsResult.rows.forEach((c) => {
    if (!columnsByTable[c.table_name]) columnsByTable[c.table_name] = [];
    columnsByTable[c.table_name].push({
      name: c.column_name,
      type: formatPgType(c),
      nullable: c.is_nullable === 'YES',
      hasDefault: !!c.column_default,
      isPrimaryKey: pkSet.has(`${c.table_name}.${c.column_name}`),
      isUnique: uniqueSet.has(`${c.table_name}.${c.column_name}`),
      isForeignKey: fkResult.rows.some((fk) => fk.source_table === c.table_name && fk.source_column === c.column_name),
      position: c.ordinal_position,
    });
  });

  const tables = tablesResult.rows.map((t) => ({
    name: t.table_name,
    columns: columnsByTable[t.table_name] || [],
    rowCount: rowCounts[t.table_name] || 0,
  }));

  const relationships = fkResult.rows.map((fk) => ({
    name: fk.constraint_name,
    sourceTable: fk.source_table, sourceColumn: fk.source_column,
    targetTable: fk.target_table, targetColumn: fk.target_column,
  }));

  return {
    database: dbName, dbType: 'postgresql', tables, relationships,
    stats: { tableCount: tables.length, relationshipCount: relationships.length, totalColumns: columnsResult.rows.length },
  };
}

async function getMssqlSchema(targetDb) {
  const dbResult = await targetDb.raw('SELECT DB_NAME() AS db');
  const dbName = (dbResult[0] || dbResult.rows || [])[0]?.db || 'database';

  const tablesRaw = await targetDb.raw(`
    SELECT TABLE_NAME AS table_name FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME
  `);
  const tableNames = (tablesRaw[0] || tablesRaw.rows || tablesRaw).map((r) => r.table_name);

  const colsRaw = await targetDb.raw(`
    SELECT TABLE_NAME AS table_name, COLUMN_NAME AS column_name, DATA_TYPE AS data_type,
      IS_NULLABLE AS is_nullable, COLUMN_DEFAULT AS column_default,
      CHARACTER_MAXIMUM_LENGTH AS char_max_len, NUMERIC_PRECISION AS num_prec,
      ORDINAL_POSITION AS ordinal_position
    FROM INFORMATION_SCHEMA.COLUMNS ORDER BY TABLE_NAME, ORDINAL_POSITION
  `);
  const cols = colsRaw[0] || colsRaw.rows || colsRaw;

  const pkRaw = await targetDb.raw(`
    SELECT tc.TABLE_NAME AS table_name, kcu.COLUMN_NAME AS column_name
    FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
    JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
      ON tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME AND tc.TABLE_SCHEMA = kcu.TABLE_SCHEMA
    WHERE tc.CONSTRAINT_TYPE = 'PRIMARY KEY'
  `);
  const pks = pkRaw[0] || pkRaw.rows || pkRaw;

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
  const fks = fkRaw[0] || fkRaw.rows || fkRaw;

  const uniqueRaw = await targetDb.raw(`
    SELECT tc.TABLE_NAME AS table_name, kcu.COLUMN_NAME AS column_name
    FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
    JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
      ON tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME AND tc.TABLE_SCHEMA = kcu.TABLE_SCHEMA
    WHERE tc.CONSTRAINT_TYPE = 'UNIQUE'
  `);
  const uniques = uniqueRaw[0] || uniqueRaw.rows || uniqueRaw;

  let rowCounts = {};
  try {
    const rcRaw = await targetDb.raw(`
      SELECT t.name AS table_name, SUM(p.rows) AS row_count
      FROM sys.tables t JOIN sys.partitions p ON t.object_id = p.object_id
      WHERE p.index_id IN (0, 1) GROUP BY t.name
    `);
    (rcRaw[0] || rcRaw.rows || rcRaw).forEach((r) => { rowCounts[r.table_name] = parseInt(r.row_count) || 0; });
  } catch { /* ignore */ }

  const pkSet = new Set(pks.map((r) => `${r.table_name}.${r.column_name}`));
  const uniqueSet = new Set(uniques.map((r) => `${r.table_name}.${r.column_name}`));
  const fkSourceSet = new Set(fks.map((fk) => `${fk.source_table}.${fk.source_column}`));

  const columnsByTable = {};
  cols.forEach((c) => {
    if (!columnsByTable[c.table_name]) columnsByTable[c.table_name] = [];
    let type = c.data_type;
    if (c.char_max_len && c.char_max_len > 0) type += `(${c.char_max_len})`;
    else if (c.num_prec) type += `(${c.num_prec})`;
    columnsByTable[c.table_name].push({
      name: c.column_name, type, nullable: c.is_nullable === 'YES',
      hasDefault: !!c.column_default,
      isPrimaryKey: pkSet.has(`${c.table_name}.${c.column_name}`),
      isUnique: uniqueSet.has(`${c.table_name}.${c.column_name}`),
      isForeignKey: fkSourceSet.has(`${c.table_name}.${c.column_name}`),
      position: c.ordinal_position,
    });
  });

  const tables = tableNames.map((t) => ({
    name: t, columns: columnsByTable[t] || [], rowCount: rowCounts[t] || 0,
  }));

  const relationships = fks.map((fk) => ({
    name: fk.constraint_name,
    sourceTable: fk.source_table, sourceColumn: fk.source_column,
    targetTable: fk.target_table, targetColumn: fk.target_column,
  }));

  return {
    database: dbName, dbType: 'mssql', tables, relationships,
    stats: { tableCount: tables.length, relationshipCount: relationships.length, totalColumns: cols.length },
  };
}

async function getMysqlSchema(targetDb) {
  const dbResult = await targetDb.raw('SELECT DATABASE() AS db');
  const dbName = (dbResult[0] || dbResult.rows || [])[0]?.db || 'database';

  const tablesRaw = await targetDb.raw(`
    SELECT TABLE_NAME AS table_name FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME
  `);
  const tableNames = (tablesRaw[0] || tablesRaw.rows || tablesRaw).map((r) => r.table_name || r.TABLE_NAME);

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

  const tables = tableNames.map((t) => ({
    name: t, columns: columnsByTable[t] || [], rowCount: rowCounts[t] || 0,
  }));

  const relationships = fks.map((fk) => ({
    name: fk.constraint_name,
    sourceTable: fk.source_table, sourceColumn: fk.source_column,
    targetTable: fk.target_table, targetColumn: fk.target_column,
  }));

  return {
    database: dbName, dbType: 'mysql', tables, relationships,
    stats: { tableCount: tables.length, relationshipCount: relationships.length, totalColumns: cols.length },
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
