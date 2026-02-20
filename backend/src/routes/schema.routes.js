const router = require('express').Router();
const db = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth.middleware');

router.get('/', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const dbName = db.client.config.connection.database || 'qlicksense';

    const tablesResult = await db.raw(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    const columnsResult = await db.raw(`
      SELECT
        c.table_name,
        c.column_name,
        c.data_type,
        c.is_nullable,
        c.column_default,
        c.character_maximum_length,
        c.numeric_precision,
        c.ordinal_position
      FROM information_schema.columns c
      WHERE c.table_schema = 'public'
      ORDER BY c.table_name, c.ordinal_position
    `);

    const pkResult = await db.raw(`
      SELECT
        tc.table_name,
        kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      WHERE tc.constraint_type = 'PRIMARY KEY'
        AND tc.table_schema = 'public'
    `);

    const fkResult = await db.raw(`
      SELECT
        tc.constraint_name,
        kcu.table_name AS source_table,
        kcu.column_name AS source_column,
        ccu.table_name AS target_table,
        ccu.column_name AS target_column
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage ccu
        ON tc.constraint_name = ccu.constraint_name
        AND tc.table_schema = ccu.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
    `);

    const uniqueResult = await db.raw(`
      SELECT
        tc.table_name,
        kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      WHERE tc.constraint_type = 'UNIQUE'
        AND tc.table_schema = 'public'
    `);

    const indexResult = await db.raw(`
      SELECT
        t.relname AS table_name,
        i.relname AS index_name,
        a.attname AS column_name,
        ix.indisunique AS is_unique,
        ix.indisprimary AS is_primary
      FROM pg_class t
      JOIN pg_index ix ON t.oid = ix.indrelid
      JOIN pg_class i ON i.oid = ix.indexrelid
      JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
      JOIN pg_namespace n ON n.oid = t.relnamespace
      WHERE n.nspname = 'public'
        AND t.relkind = 'r'
      ORDER BY t.relname, i.relname
    `);

    const rowCountResult = await db.raw(`
      SELECT
        relname AS table_name,
        n_live_tup AS estimated_rows
      FROM pg_stat_user_tables
      WHERE schemaname = 'public'
      ORDER BY relname
    `);

    const pkSet = new Set(pkResult.rows.map((r) => `${r.table_name}.${r.column_name}`));
    const uniqueSet = new Set(uniqueResult.rows.map((r) => `${r.table_name}.${r.column_name}`));
    const rowCounts = {};
    rowCountResult.rows.forEach((r) => { rowCounts[r.table_name] = parseInt(r.estimated_rows) || 0; });

    const columnsByTable = {};
    columnsResult.rows.forEach((c) => {
      if (!columnsByTable[c.table_name]) columnsByTable[c.table_name] = [];
      columnsByTable[c.table_name].push({
        name: c.column_name,
        type: formatType(c),
        nullable: c.is_nullable === 'YES',
        hasDefault: !!c.column_default,
        isPrimaryKey: pkSet.has(`${c.table_name}.${c.column_name}`),
        isUnique: uniqueSet.has(`${c.table_name}.${c.column_name}`),
        isForeignKey: fkResult.rows.some(
          (fk) => fk.source_table === c.table_name && fk.source_column === c.column_name
        ),
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
      sourceTable: fk.source_table,
      sourceColumn: fk.source_column,
      targetTable: fk.target_table,
      targetColumn: fk.target_column,
    }));

    res.json({
      success: true,
      data: {
        database: dbName,
        tables,
        relationships,
        stats: {
          tableCount: tables.length,
          relationshipCount: relationships.length,
          totalColumns: columnsResult.rows.length,
        },
      },
    });
  } catch (err) { next(err); }
});

function formatType(col) {
  let t = col.data_type;
  if (t === 'character varying' && col.character_maximum_length) {
    t = `varchar(${col.character_maximum_length})`;
  } else if (t === 'character varying') {
    t = 'varchar';
  } else if (t === 'numeric' && col.numeric_precision) {
    t = `numeric(${col.numeric_precision})`;
  } else if (t === 'timestamp with time zone') {
    t = 'timestamptz';
  } else if (t === 'timestamp without time zone') {
    t = 'timestamp';
  } else if (t === 'USER-DEFINED') {
    t = 'enum';
  }
  return t;
}

module.exports = router;
