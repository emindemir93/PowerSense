const router = require('express').Router();
const { getConnection, getTablesForConnection, getDbConfig } = require('../config/connectionManager');
const { authenticate, authorize } = require('../middleware/auth.middleware');

const FORBIDDEN_PATTERNS = [
  /\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE|GRANT|REVOKE|EXEC|EXECUTE)\b/i,
  /;\s*(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE)/i,
];

const MAX_ROWS = 5000;
const QUERY_TIMEOUT = 30000;

router.post('/execute', authenticate, authorize('admin', 'analyst'), async (req, res) => {
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

    if (!/^\s*(SELECT|WITH)\b/i.test(trimmed)) {
      return res.status(403).json({
        success: false,
        message: 'Query must start with SELECT or WITH (CTE).',
      });
    }

    const { db: targetDb, dbType } = await getConnection(connectionId);
    const config = getDbConfig(dbType);
    const wrappedSql = config.wrapLimit(trimmed, MAX_ROWS);

    const startTime = Date.now();
    const result = await targetDb.raw(wrappedSql).timeout(QUERY_TIMEOUT);
    const elapsed = Date.now() - startTime;

    let rows, fields;
    if (dbType === 'postgresql') {
      rows = result.rows || [];
      fields = result.fields
        ? result.fields.map((f) => ({ name: f.name, dataTypeID: f.dataTypeID }))
        : rows.length > 0 ? Object.keys(rows[0]).map((name) => ({ name })) : [];
    } else if (dbType === 'mssql') {
      rows = result[0] || result.rows || [];
      fields = rows.length > 0 ? Object.keys(rows[0]).map((name) => ({ name })) : [];
    } else {
      rows = result[0] || result.rows || [];
      fields = rows.length > 0 ? Object.keys(rows[0]).map((name) => ({ name })) : [];
    }

    res.json({
      success: true,
      data: {
        rows,
        fields,
        rowCount: rows.length,
        truncated: rows.length >= MAX_ROWS,
        elapsed,
        dbType,
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

router.get('/tables', authenticate, authorize('admin', 'analyst'), async (req, res) => {
  try {
    const connectionId = req.query.connectionId;
    const tables = await getTablesForConnection(connectionId);
    res.json({ success: true, data: tables });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

module.exports = router;
