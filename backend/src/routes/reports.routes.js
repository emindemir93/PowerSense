const router = require('express').Router();
const db = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { v4: uuidv4 } = require('uuid');
const { getConnection, getDbConfig } = require('../config/connectionManager');

// GET /api/reports - List reports
router.get('/', authenticate, authorize('admin', 'analyst', 'viewer'), async (req, res, next) => {
  try {
    const reports = await db('reports')
      .leftJoin('users', 'reports.created_by', 'users.id')
      .select(
        'reports.*',
        'users.name as creator_name'
      )
      .where(function () {
        this.where('reports.created_by', req.user.id)
          .orWhere('reports.is_public', true);
      })
      .orderBy('reports.updated_at', 'desc');

    res.json({ success: true, data: reports });
  } catch (err) { next(err); }
});

// GET /api/reports/:id - Get single report
router.get('/:id', authenticate, authorize('admin', 'analyst', 'viewer'), async (req, res, next) => {
  try {
    const report = await db('reports')
      .leftJoin('users', 'reports.created_by', 'users.id')
      .select('reports.*', 'users.name as creator_name')
      .where('reports.id', req.params.id)
      .first();

    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    res.json({ success: true, data: report });
  } catch (err) { next(err); }
});

// POST /api/reports - Create report
router.post('/', authenticate, authorize('admin', 'analyst'), async (req, res, next) => {
  try {
    const { name, description, query_config, columns_config, is_public } = req.body;

    if (!name || !query_config) {
      return res.status(400).json({ success: false, message: 'Name and query_config are required' });
    }

    const id = uuidv4();
    await db('reports').insert({
      id,
      name,
      description: description || '',
      created_by: req.user.id,
      query_config: JSON.stringify(query_config),
      columns_config: JSON.stringify(columns_config || []),
      is_public: is_public || false,
    });

    const report = await db('reports').where('id', id).first();
    res.status(201).json({ success: true, data: report });
  } catch (err) { next(err); }
});

// PUT /api/reports/:id - Update report
router.put('/:id', authenticate, authorize('admin', 'analyst'), async (req, res, next) => {
  try {
    const { name, description, query_config, columns_config, is_public } = req.body;

    await db('reports')
      .where('id', req.params.id)
      .update({
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(query_config !== undefined && { query_config: JSON.stringify(query_config) }),
        ...(columns_config !== undefined && { columns_config: JSON.stringify(columns_config) }),
        ...(is_public !== undefined && { is_public }),
        updated_at: new Date(),
      });

    const report = await db('reports').where('id', req.params.id).first();
    res.json({ success: true, data: report });
  } catch (err) { next(err); }
});

// DELETE /api/reports/:id
router.delete('/:id', authenticate, authorize('admin', 'analyst'), async (req, res, next) => {
  try {
    await db('reports').where('id', req.params.id).delete();
    res.json({ success: true, message: 'Report deleted' });
  } catch (err) { next(err); }
});

// POST /api/reports/:id/run - Execute report query and update run stats
router.post('/:id/run', authenticate, authorize('admin', 'analyst', 'viewer'), async (req, res, next) => {
  try {
    const report = await db('reports').where('id', req.params.id).first();
    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    const queryConfig = typeof report.query_config === 'string'
      ? JSON.parse(report.query_config)
      : report.query_config;

    let queryRes;
    if (queryConfig.type === 'sql') {
      const trimmed = queryConfig.sql?.trim().replace(/;+$/, '') || '';
      if (!trimmed || !/^\s*(SELECT|WITH)\b/i.test(trimmed)) {
        return res.status(400).json({ success: false, message: 'Invalid SQL in report' });
      }
      const { db: targetDb, dbType } = await getConnection(queryConfig.connection_id);
      const config = getDbConfig(dbType);
      const wrappedSql = config.wrapLimit(trimmed, 5000);
      const result = await targetDb.raw(wrappedSql).timeout(30000);
      const toRows = (r) => {
        if (!r) return [];
        if (Array.isArray(r)) return r;
        if (r.rows) return r.rows;
        if (r[0]) return Array.isArray(r[0]) ? r[0] : [r[0]];
        return [];
      };
      const rows = toRows(result);
      queryRes = { data: { data: rows }, meta: { total: rows.length } };
    } else {
      const { default: axios } = require('axios');
      const token = req.headers.authorization;
      const baseUrl = `http://localhost:${process.env.PORT || 4000}`;
      queryRes = await axios.post(`${baseUrl}/api/query`, queryConfig, {
        headers: { Authorization: token, 'Content-Type': 'application/json' },
      });
    }

    // Update run stats
    await db('reports').where('id', req.params.id).update({
      last_run_at: new Date(),
      run_count: (report.run_count || 0) + 1,
    });

    res.json({
      success: true,
      data: queryRes.data.data,
      meta: {
        report_name: report.name,
        run_at: new Date().toISOString(),
        total: queryRes.data.meta?.total || queryRes.data.data?.length || 0,
      },
    });
  } catch (err) { next(err); }
});

// GET /api/reports/:id/export - Export report as CSV
router.get('/:id/export', authenticate, authorize('admin', 'analyst', 'viewer'), async (req, res, next) => {
  try {
    const report = await db('reports').where('id', req.params.id).first();
    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    const queryConfig = typeof report.query_config === 'string'
      ? JSON.parse(report.query_config)
      : report.query_config;

    let data;
    if (queryConfig.type === 'sql') {
      const trimmed = queryConfig.sql?.trim().replace(/;+$/, '') || '';
      if (!trimmed || !/^\s*(SELECT|WITH)\b/i.test(trimmed)) {
        return res.status(400).json({ success: false, message: 'Invalid SQL in report' });
      }
      const { db: targetDb, dbType } = await getConnection(queryConfig.connection_id);
      const config = getDbConfig(dbType);
      const wrappedSql = config.wrapLimit(trimmed, 5000);
      const result = await targetDb.raw(wrappedSql).timeout(30000);
      const toRows = (r) => {
        if (!r) return [];
        if (Array.isArray(r)) return r;
        if (r.rows) return r.rows;
        if (r[0]) return Array.isArray(r[0]) ? r[0] : [r[0]];
        return [];
      };
      data = toRows(result);
    } else {
      const { default: axios } = require('axios');
      const token = req.headers.authorization;
      const baseUrl = `http://localhost:${process.env.PORT || 4000}`;
      const queryRes = await axios.post(`${baseUrl}/api/query`, queryConfig, {
        headers: { Authorization: token, 'Content-Type': 'application/json' },
      });
      data = queryRes.data.data || [];
    }
    if (data.length === 0) {
      return res.status(200).send('No data');
    }

    const columns = Object.keys(data[0]);
    const csvHeader = columns.join(',');
    const csvRows = data.map((row) =>
      columns.map((col) => {
        const val = row[col];
        if (val === null || val === undefined) return '';
        const str = String(val);
        return str.includes(',') || str.includes('"') || str.includes('\n')
          ? `"${str.replace(/"/g, '""')}"` : str;
      }).join(',')
    );
    const csv = [csvHeader, ...csvRows].join('\n');

    const filename = report.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}_${Date.now()}.csv"`);
    res.send(csv);
  } catch (err) { next(err); }
});

// POST /api/reports/:id/duplicate
router.post('/:id/duplicate', authenticate, authorize('admin', 'analyst'), async (req, res, next) => {
  try {
    const original = await db('reports').where('id', req.params.id).first();
    if (!original) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    const id = uuidv4();
    await db('reports').insert({
      id,
      name: `${original.name} (Copy)`,
      description: original.description,
      created_by: req.user.id,
      query_config: original.query_config,
      columns_config: original.columns_config,
      is_public: false,
    });

    const report = await db('reports').where('id', id).first();
    res.status(201).json({ success: true, data: report });
  } catch (err) { next(err); }
});

module.exports = router;
