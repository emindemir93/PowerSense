const router = require('express').Router();
const db = require('../config/database');
const { getConnection } = require('../config/connectionManager');
const { authenticate, authorize } = require('../middleware/auth.middleware');

const FORBIDDEN_PATTERNS = [
  /\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE|GRANT|REVOKE|EXEC|EXECUTE)\b/i,
  /;\s*(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE)/i,
  /--.*$/m,
];

const MAX_ROWS = 5000;
const QUERY_TIMEOUT = 30000;

router.post('/execute', authenticate, authorize('admin', 'analyst'), async (req, res, next) => {
  try {
    const { sql, connectionId } = req.body;
    if (!sql || !sql.trim()) {
      return res.status(400).json({ success: false, message: 'SQL query is required' });
    }

    const trimmed = sql.trim().replace(/;+$/, '');

    for (const pattern of FORBIDDEN_PATTERNS) {
      if (pattern.test(trimmed)) {
        return res.status(403).json({
          success: false,
          message: 'Only SELECT queries are allowed. Write operations are forbidden.',
        });
      }
    }

    if (!/^\s*SELECT\b/i.test(trimmed) && !/^\s*WITH\b/i.test(trimmed)) {
      return res.status(403).json({
        success: false,
        message: 'Query must start with SELECT or WITH (CTE).',
      });
    }

    const targetDb = await getConnection(connectionId);
    const wrappedSql = `SELECT * FROM (${trimmed}) AS __result LIMIT ${MAX_ROWS}`;

    const startTime = Date.now();
    const result = await targetDb.raw(wrappedSql).timeout(QUERY_TIMEOUT);
    const elapsed = Date.now() - startTime;

    const rows = result.rows || [];
    const fields = result.fields
      ? result.fields.map((f) => ({ name: f.name, dataTypeID: f.dataTypeID }))
      : rows.length > 0
        ? Object.keys(rows[0]).map((name) => ({ name }))
        : [];

    res.json({
      success: true,
      data: {
        rows,
        fields,
        rowCount: rows.length,
        truncated: rows.length >= MAX_ROWS,
        elapsed,
      },
    });
  } catch (err) {
    const msg = err.message || 'Query execution failed';
    const pgError = err.code ? `[${err.code}] ` : '';
    res.status(400).json({
      success: false,
      message: `${pgError}${msg}`,
      position: err.position ? parseInt(err.position) : undefined,
    });
  }
});

router.get('/tables', authenticate, authorize('admin', 'analyst'), async (req, res, next) => {
  try {
    const connectionId = req.query.connectionId;
    const targetDb = await getConnection(connectionId);
    const result = await targetDb.raw(`
      SELECT
        t.table_name,
        array_agg(
          json_build_object(
            'column', c.column_name,
            'type', c.data_type,
            'nullable', c.is_nullable,
            'default', c.column_default
          )
          ORDER BY c.ordinal_position
        ) AS columns
      FROM information_schema.tables t
      JOIN information_schema.columns c
        ON c.table_schema = t.table_schema AND c.table_name = t.table_name
      WHERE t.table_schema = 'public'
        AND t.table_type = 'BASE TABLE'
      GROUP BY t.table_name
      ORDER BY t.table_name
    `);

    const fkResult = await targetDb.raw(`
      SELECT
        tc.table_name AS from_table,
        kcu.column_name AS from_column,
        ccu.table_name AS to_table,
        ccu.column_name AS to_column
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage ccu
        ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
    `);

    const fkMap = {};
    for (const fk of fkResult.rows) {
      if (!fkMap[fk.from_table]) fkMap[fk.from_table] = [];
      fkMap[fk.from_table].push(fk);
    }

    const tables = result.rows.map((r) => ({
      name: r.table_name,
      columns: r.columns,
      foreignKeys: fkMap[r.table_name] || [],
    }));

    res.json({ success: true, data: tables });
  } catch (err) { next(err); }
});

module.exports = router;
