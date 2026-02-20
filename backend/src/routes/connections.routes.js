const router = require('express').Router();
const db = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { testConnection, removePool } = require('../config/connectionManager');
const { v4: uuidv4 } = require('uuid');

router.get('/', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const connections = await db('data_connections')
      .select('id', 'name', 'db_type', 'host', 'port', 'database', 'username',
        'ssl', 'is_default', 'is_active', 'status', 'last_tested_at', 'last_error',
        'created_at', 'updated_at')
      .orderBy('is_default', 'desc')
      .orderBy('name');
    res.json({ success: true, data: connections });
  } catch (err) { next(err); }
});

router.get('/:id', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const conn = await db('data_connections')
      .select('id', 'name', 'db_type', 'host', 'port', 'database', 'username',
        'ssl', 'is_default', 'is_active', 'status', 'last_tested_at', 'last_error',
        'password_encrypted', 'created_at', 'updated_at')
      .where('id', req.params.id).first();
    if (!conn) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: conn });
  } catch (err) { next(err); }
});

router.post('/', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { name, db_type, host, port, database, username, password, ssl, is_default } = req.body;
    if (!name || !host || !database || !username || !password) {
      return res.status(400).json({ success: false, message: 'name, host, database, username, password are required' });
    }

    const id = uuidv4();

    if (is_default) {
      await db('data_connections').update({ is_default: false });
    }

    await db('data_connections').insert({
      id, name, db_type: db_type || 'postgresql',
      host, port: port || 5432, database,
      username, password_encrypted: password,
      ssl: ssl || false, is_default: is_default || false,
      created_by: req.user.id, status: 'untested',
    });

    const conn = await db('data_connections').where('id', id).first();
    res.status(201).json({ success: true, data: conn });
  } catch (err) { next(err); }
});

router.put('/:id', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { name, db_type, host, port, database, username, password, ssl, is_default, is_active } = req.body;

    const updates = {
      ...(name !== undefined && { name }),
      ...(db_type !== undefined && { db_type }),
      ...(host !== undefined && { host }),
      ...(port !== undefined && { port }),
      ...(database !== undefined && { database }),
      ...(username !== undefined && { username }),
      ...(password && { password_encrypted: password }),
      ...(ssl !== undefined && { ssl }),
      ...(is_active !== undefined && { is_active }),
      updated_at: new Date(),
      status: 'untested',
    };

    if (is_default) {
      await db('data_connections').update({ is_default: false });
      updates.is_default = true;
    }

    await db('data_connections').where('id', req.params.id).update(updates);
    removePool(req.params.id);

    const conn = await db('data_connections')
      .select('id', 'name', 'db_type', 'host', 'port', 'database', 'username',
        'ssl', 'is_default', 'is_active', 'status', 'last_tested_at', 'last_error',
        'created_at', 'updated_at')
      .where('id', req.params.id).first();
    res.json({ success: true, data: conn });
  } catch (err) { next(err); }
});

router.delete('/:id', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const conn = await db('data_connections').where('id', req.params.id).first();
    if (!conn) return res.status(404).json({ success: false, message: 'Not found' });
    if (conn.is_default) {
      return res.status(400).json({ success: false, message: 'Cannot delete the default connection' });
    }
    removePool(req.params.id);
    await db('data_connections').where('id', req.params.id).delete();
    res.json({ success: true, message: 'Deleted' });
  } catch (err) { next(err); }
});

router.post('/:id/test', authenticate, authorize('admin'), async (req, res) => {
  try {
    const conn = await db('data_connections').where('id', req.params.id).first();
    if (!conn) return res.status(404).json({ success: false, message: 'Not found' });

    const result = await testConnection(conn);

    await db('data_connections').where('id', req.params.id).update({
      status: 'connected',
      last_tested_at: new Date(),
      last_error: null,
    });

    removePool(req.params.id);

    res.json({ success: true, data: result });
  } catch (err) {
    await db('data_connections').where('id', req.params.id).update({
      status: 'failed',
      last_tested_at: new Date(),
      last_error: err.message,
    }).catch(() => {});

    res.status(400).json({ success: false, message: err.message });
  }
});

router.post('/test-new', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { host, port, database, username, password, ssl, db_type } = req.body;
    if (!host || !database || !username || !password) {
      return res.status(400).json({ success: false, message: 'All connection fields required' });
    }
    const result = await testConnection({
      host, port: port || 5432, database,
      username, password_encrypted: password,
      ssl: ssl || false, db_type: db_type || 'postgresql',
    });
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.post('/:id/set-default', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    await db('data_connections').update({ is_default: false });
    await db('data_connections').where('id', req.params.id).update({ is_default: true });
    const conn = await db('data_connections')
      .select('id', 'name', 'db_type', 'host', 'port', 'database', 'username',
        'ssl', 'is_default', 'is_active', 'status', 'last_tested_at', 'last_error',
        'created_at', 'updated_at')
      .where('id', req.params.id).first();
    res.json({ success: true, data: conn });
  } catch (err) { next(err); }
});

module.exports = router;
