const router = require('express').Router();
const db = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { v4: uuidv4 } = require('uuid');

router.get('/:dashboardId', authenticate, async (req, res, next) => {
  try {
    const alerts = await db('widget_alerts')
      .where('dashboard_id', req.params.dashboardId)
      .orderBy('created_at', 'desc');
    res.json({ success: true, data: alerts });
  } catch (err) { next(err); }
});

router.post('/', authenticate, authorize('admin', 'analyst'), async (req, res, next) => {
  try {
    const { dashboard_id, widget_id, name, measure, operator, threshold } = req.body;
    if (!dashboard_id || !name || !measure || !operator || threshold === undefined) {
      return res.status(400).json({ success: false, message: 'All fields required' });
    }
    const id = uuidv4();
    await db('widget_alerts').insert({
      id, dashboard_id, widget_id: widget_id || null,
      name, measure, operator, threshold: parseFloat(threshold),
      created_by: req.user.id,
    });
    const alert = await db('widget_alerts').where('id', id).first();
    res.status(201).json({ success: true, data: alert });
  } catch (err) { next(err); }
});

router.put('/:id', authenticate, authorize('admin', 'analyst'), async (req, res, next) => {
  try {
    const { name, measure, operator, threshold, is_active } = req.body;
    await db('widget_alerts').where('id', req.params.id).update({
      ...(name !== undefined && { name }),
      ...(measure !== undefined && { measure }),
      ...(operator !== undefined && { operator }),
      ...(threshold !== undefined && { threshold: parseFloat(threshold) }),
      ...(is_active !== undefined && { is_active }),
      updated_at: new Date(),
    });
    const alert = await db('widget_alerts').where('id', req.params.id).first();
    res.json({ success: true, data: alert });
  } catch (err) { next(err); }
});

router.delete('/:id', authenticate, authorize('admin', 'analyst'), async (req, res, next) => {
  try {
    await db('widget_alerts').where('id', req.params.id).delete();
    res.json({ success: true, message: 'Deleted' });
  } catch (err) { next(err); }
});

module.exports = router;
