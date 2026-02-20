const router = require('express').Router();
const db = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth.middleware');

// GET /api/saved-queries - List saved queries (current user)
router.get('/', authenticate, authorize('admin', 'analyst', 'viewer'), async (req, res, next) => {
  try {
    const queries = await db('saved_queries')
      .where('created_by', req.user.id)
      .orderBy('updated_at', 'desc');
    res.json({ success: true, data: queries });
  } catch (err) { next(err); }
});

// POST /api/saved-queries - Create saved query
router.post('/', authenticate, authorize('admin', 'analyst'), async (req, res, next) => {
  try {
    const { name, sql, connection_id } = req.body;
    if (!name?.trim() || !sql?.trim()) {
      return res.status(400).json({ success: false, message: 'Name and sql are required' });
    }
    const [row] = await db('saved_queries')
      .insert({
        name: name.trim(),
        sql: sql.trim(),
        connection_id: connection_id || null,
        created_by: req.user.id,
      })
      .returning('*');
    res.status(201).json({ success: true, data: row });
  } catch (err) { next(err); }
});

// GET /api/saved-queries/:id - Get single saved query
router.get('/:id', authenticate, authorize('admin', 'analyst', 'viewer'), async (req, res, next) => {
  try {
    const row = await db('saved_queries')
      .where({ id: req.params.id, created_by: req.user.id })
      .first();
    if (!row) return res.status(404).json({ success: false, message: 'Saved query not found' });
    res.json({ success: true, data: row });
  } catch (err) { next(err); }
});

// PUT /api/saved-queries/:id - Update saved query
router.put('/:id', authenticate, authorize('admin', 'analyst'), async (req, res, next) => {
  try {
    const { name, sql, connection_id } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name.trim();
    if (sql !== undefined) updates.sql = sql.trim();
    if (connection_id !== undefined) updates.connection_id = connection_id || null;
    updates.updated_at = new Date();

    const count = await db('saved_queries')
      .where({ id: req.params.id, created_by: req.user.id })
      .update(updates);
    if (count === 0) return res.status(404).json({ success: false, message: 'Saved query not found' });
    const row = await db('saved_queries').where('id', req.params.id).first();
    res.json({ success: true, data: row });
  } catch (err) { next(err); }
});

// DELETE /api/saved-queries/:id
router.delete('/:id', authenticate, authorize('admin', 'analyst'), async (req, res, next) => {
  try {
    const count = await db('saved_queries')
      .where({ id: req.params.id, created_by: req.user.id })
      .delete();
    if (count === 0) return res.status(404).json({ success: false, message: 'Saved query not found' });
    res.json({ success: true, message: 'Deleted' });
  } catch (err) { next(err); }
});

module.exports = router;
