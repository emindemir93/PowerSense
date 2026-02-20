const router = require('express').Router();
const db = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { v4: uuidv4 } = require('uuid');

router.get('/', authenticate, authorize('admin', 'analyst'), async (req, res, next) => {
  try {
    const dashboards = await db('dashboards')
      .leftJoin('users', 'dashboards.created_by', 'users.id')
      .select(
        'dashboards.*',
        'users.name as creator_name',
        db.raw('(SELECT COUNT(*)::int FROM widgets WHERE widgets.dashboard_id = dashboards.id) as widget_count')
      )
      .where(function () {
        this.where('dashboards.created_by', req.user.id)
          .orWhere('dashboards.is_public', true);
      })
      .orderBy('dashboards.updated_at', 'desc');

    res.json({ success: true, data: dashboards });
  } catch (err) { next(err); }
});

router.get('/:id', authenticate, authorize('admin', 'analyst'), async (req, res, next) => {
  try {
    const dashboard = await db('dashboards')
      .leftJoin('users', 'dashboards.created_by', 'users.id')
      .select('dashboards.*', 'users.name as creator_name')
      .where('dashboards.id', req.params.id)
      .first();

    if (!dashboard) {
      return res.status(404).json({ success: false, message: 'Dashboard not found' });
    }

    const widgets = await db('widgets')
      .where('dashboard_id', dashboard.id)
      .orderBy('created_at', 'asc');

    res.json({ success: true, data: { ...dashboard, widgets } });
  } catch (err) { next(err); }
});

router.post('/', authenticate, authorize('admin', 'analyst'), async (req, res, next) => {
  try {
    const { name, description, theme = 'dark', is_public = false, widgets = [] } = req.body;
    const id = uuidv4();

    await db('dashboards').insert({
      id, name, description, theme, is_public,
      created_by: req.user.id,
    });

    if (widgets.length > 0) {
      const widgetRows = widgets.map((w) => ({
        id: uuidv4(),
        dashboard_id: id,
        type: w.type,
        title: w.title || `New ${w.type}`,
        data_config: JSON.stringify(w.data_config || {}),
        visual_config: JSON.stringify(w.visual_config || {}),
        position: JSON.stringify(w.position || { x: 0, y: 0, w: 6, h: 4 }),
      }));
      await db('widgets').insert(widgetRows);
    }

    const dashboard = await db('dashboards').where('id', id).first();
    const dbWidgets = await db('widgets').where('dashboard_id', id);
    res.status(201).json({ success: true, data: { ...dashboard, widgets: dbWidgets } });
  } catch (err) { next(err); }
});

router.put('/:id', authenticate, authorize('admin', 'analyst'), async (req, res, next) => {
  try {
    const { name, description, theme, is_public, filters } = req.body;

    await db('dashboards')
      .where('id', req.params.id)
      .update({
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(theme !== undefined && { theme }),
        ...(is_public !== undefined && { is_public }),
        ...(filters !== undefined && { filters: JSON.stringify(filters) }),
        updated_at: new Date(),
      });

    const dashboard = await db('dashboards').where('id', req.params.id).first();
    res.json({ success: true, data: dashboard });
  } catch (err) { next(err); }
});

router.delete('/:id', authenticate, authorize('admin', 'analyst'), async (req, res, next) => {
  try {
    await db('dashboards').where('id', req.params.id).delete();
    res.json({ success: true, message: 'Dashboard deleted' });
  } catch (err) { next(err); }
});

router.post('/:id/widgets', authenticate, authorize('admin', 'analyst'), async (req, res, next) => {
  try {
    const { type, title, data_config, visual_config, position } = req.body;
    const id = uuidv4();

    await db('widgets').insert({
      id,
      dashboard_id: req.params.id,
      type,
      title: title || `New ${type} Widget`,
      data_config: JSON.stringify(data_config || {}),
      visual_config: JSON.stringify(visual_config || {}),
      position: JSON.stringify(position || { x: 0, y: 0, w: 6, h: 4 }),
    });

    const widget = await db('widgets').where('id', id).first();
    await db('dashboards').where('id', req.params.id).update({ updated_at: new Date() });
    res.status(201).json({ success: true, data: widget });
  } catch (err) { next(err); }
});

router.put('/:dashId/widgets/:widgetId', authenticate, authorize('admin', 'analyst'), async (req, res, next) => {
  try {
    const { type, title, data_config, visual_config, position } = req.body;

    await db('widgets')
      .where({ id: req.params.widgetId, dashboard_id: req.params.dashId })
      .update({
        ...(type !== undefined && { type }),
        ...(title !== undefined && { title }),
        ...(data_config !== undefined && { data_config: JSON.stringify(data_config) }),
        ...(visual_config !== undefined && { visual_config: JSON.stringify(visual_config) }),
        ...(position !== undefined && { position: JSON.stringify(position) }),
        updated_at: new Date(),
      });

    await db('dashboards').where('id', req.params.dashId).update({ updated_at: new Date() });
    const widget = await db('widgets').where('id', req.params.widgetId).first();
    res.json({ success: true, data: widget });
  } catch (err) { next(err); }
});

router.delete('/:dashId/widgets/:widgetId', authenticate, authorize('admin', 'analyst'), async (req, res, next) => {
  try {
    await db('widgets')
      .where({ id: req.params.widgetId, dashboard_id: req.params.dashId })
      .delete();
    await db('dashboards').where('id', req.params.dashId).update({ updated_at: new Date() });
    res.json({ success: true, message: 'Widget deleted' });
  } catch (err) { next(err); }
});

router.post('/:id/duplicate', authenticate, authorize('admin', 'analyst'), async (req, res, next) => {
  try {
    const original = await db('dashboards').where('id', req.params.id).first();
    if (!original) return res.status(404).json({ success: false, message: 'Dashboard not found' });

    const newId = uuidv4();
    await db('dashboards').insert({
      id: newId,
      name: `${original.name} (Copy)`,
      description: original.description,
      created_by: req.user.id,
      filters: original.filters,
      theme: original.theme,
      is_default: false,
      is_public: false,
    });

    const originalWidgets = await db('widgets').where('dashboard_id', req.params.id);
    if (originalWidgets.length > 0) {
      const newWidgets = originalWidgets.map((w) => ({
        id: uuidv4(),
        dashboard_id: newId,
        type: w.type,
        title: w.title,
        data_config: w.data_config,
        visual_config: w.visual_config,
        position: w.position,
      }));
      await db('widgets').insert(newWidgets);
    }

    const dashboard = await db('dashboards').where('id', newId).first();
    const widgets = await db('widgets').where('dashboard_id', newId);
    res.status(201).json({ success: true, data: { ...dashboard, widgets } });
  } catch (err) { next(err); }
});

router.put('/:id/layout', authenticate, authorize('admin', 'analyst'), async (req, res, next) => {
  try {
    const { layout } = req.body;

    await db.transaction(async (trx) => {
      for (const item of layout) {
        await trx('widgets')
          .where({ id: item.id, dashboard_id: req.params.id })
          .update({ position: JSON.stringify(item.position), updated_at: new Date() });
      }
    });

    await db('dashboards').where('id', req.params.id).update({ updated_at: new Date() });
    res.json({ success: true, message: 'Layout updated' });
  } catch (err) { next(err); }
});

module.exports = router;
