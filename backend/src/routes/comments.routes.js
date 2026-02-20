const router = require('express').Router();
const db = require('../config/database');
const { authenticate } = require('../middleware/auth.middleware');
const { v4: uuidv4 } = require('uuid');

router.get('/:dashboardId', authenticate, async (req, res, next) => {
  try {
    const comments = await db('dashboard_comments')
      .leftJoin('users', 'dashboard_comments.user_id', 'users.id')
      .select('dashboard_comments.*', 'users.name as user_name', 'users.role as user_role')
      .where('dashboard_comments.dashboard_id', req.params.dashboardId)
      .orderBy('dashboard_comments.created_at', 'desc');
    res.json({ success: true, data: comments });
  } catch (err) { next(err); }
});

router.post('/', authenticate, async (req, res, next) => {
  try {
    const { dashboard_id, text, widget_id } = req.body;
    if (!dashboard_id || !text?.trim()) {
      return res.status(400).json({ success: false, message: 'dashboard_id and text required' });
    }
    const id = uuidv4();
    await db('dashboard_comments').insert({
      id, dashboard_id, user_id: req.user.id,
      text: text.trim(), widget_id: widget_id || null,
    });
    const comment = await db('dashboard_comments')
      .leftJoin('users', 'dashboard_comments.user_id', 'users.id')
      .select('dashboard_comments.*', 'users.name as user_name', 'users.role as user_role')
      .where('dashboard_comments.id', id).first();
    res.status(201).json({ success: true, data: comment });
  } catch (err) { next(err); }
});

router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const comment = await db('dashboard_comments').where('id', req.params.id).first();
    if (!comment) return res.status(404).json({ success: false, message: 'Not found' });
    if (comment.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    await db('dashboard_comments').where('id', req.params.id).delete();
    res.json({ success: true, message: 'Deleted' });
  } catch (err) { next(err); }
});

module.exports = router;
