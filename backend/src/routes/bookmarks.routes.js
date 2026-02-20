const router = require('express').Router();
const db = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { v4: uuidv4 } = require('uuid');

router.get('/:dashboardId', authenticate, async (req, res, next) => {
  try {
    const bookmarks = await db('bookmarks')
      .where('dashboard_id', req.params.dashboardId)
      .orderBy('created_at', 'desc');
    res.json({ success: true, data: bookmarks });
  } catch (err) { next(err); }
});

router.post('/', authenticate, authorize('admin', 'analyst'), async (req, res, next) => {
  try {
    const { dashboard_id, name, filters_state, date_range, is_default } = req.body;
    if (!dashboard_id || !name) {
      return res.status(400).json({ success: false, message: 'dashboard_id and name required' });
    }

    if (is_default) {
      await db('bookmarks').where({ dashboard_id }).update({ is_default: false });
    }

    const id = uuidv4();
    await db('bookmarks').insert({
      id, dashboard_id, name,
      filters_state: JSON.stringify(filters_state || []),
      date_range: JSON.stringify(date_range || {}),
      created_by: req.user.id,
      is_default: is_default || false,
    });

    const bookmark = await db('bookmarks').where('id', id).first();
    res.status(201).json({ success: true, data: bookmark });
  } catch (err) { next(err); }
});

router.delete('/:id', authenticate, authorize('admin', 'analyst'), async (req, res, next) => {
  try {
    await db('bookmarks').where('id', req.params.id).delete();
    res.json({ success: true, message: 'Bookmark deleted' });
  } catch (err) { next(err); }
});

module.exports = router;
