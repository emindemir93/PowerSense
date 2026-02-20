const router = require('express').Router();
const db = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth.middleware');

/**
 * @swagger
 * tags:
 *   name: Audit
 *   description: Denetim logları (Sadece admin)
 */

/**
 * @swagger
 * /api/audit:
 *   get:
 *     summary: Audit log listesi
 *     tags: [Audit]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: user_id
 *         schema: { type: string }
 *       - in: query
 *         name: action
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Audit logları
 */
router.get('/', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { page = 1, limit = 50, user_id, action } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = db('audit_logs')
      .leftJoin('users', 'audit_logs.user_id', 'users.id')
      .select('audit_logs.*', 'users.name as user_name', 'users.email as user_email');

    if (user_id) query = query.where('audit_logs.user_id', user_id);
    if (action) query = query.where('audit_logs.action', 'ilike', `%${action}%`);

    const [{ count }] = await query.clone().count('audit_logs.id as count');
    const logs = await query.orderBy('audit_logs.created_at', 'desc').limit(parseInt(limit)).offset(offset);

    res.json({
      success: true, data: logs,
      meta: { page: parseInt(page), limit: parseInt(limit), total: parseInt(count), totalPages: Math.ceil(parseInt(count) / parseInt(limit)) },
    });
  } catch (err) { next(err); }
});

module.exports = router;
