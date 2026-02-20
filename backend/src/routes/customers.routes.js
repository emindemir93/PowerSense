const router = require('express').Router();
const db = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth.middleware');

/**
 * @swagger
 * tags:
 *   name: Customers
 *   description: Müşteri yönetimi
 */

/**
 * @swagger
 * /api/customers:
 *   get:
 *     summary: Müşteri listesi
 *     tags: [Customers]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Müşteri listesi
 */
router.get('/', authenticate, authorize('admin', 'analyst', 'viewer'), async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = db('customers')
      .select('customers.*')
      .leftJoin(
        db('orders').select('customer_id').sum('total_amount as total_spent').count('id as order_count').groupBy('customer_id').as('o'),
        'customers.id', 'o.customer_id'
      )
      .select('o.total_spent', 'o.order_count');

    if (search) {
      query = query.where(q =>
        q.where('customers.name', 'ilike', `%${search}%`)
         .orWhere('customers.email', 'ilike', `%${search}%`)
      );
    }

    const [{ count }] = await db('customers').count('* as count').modify(q => {
      if (search) q.where('name', 'ilike', `%${search}%`).orWhere('email', 'ilike', `%${search}%`);
    });

    const customers = await query.orderBy('customers.created_at', 'desc').limit(parseInt(limit)).offset(offset);

    res.json({
      success: true,
      data: customers,
      meta: { page: parseInt(page), limit: parseInt(limit), total: parseInt(count), totalPages: Math.ceil(parseInt(count) / parseInt(limit)) },
    });
  } catch (err) { next(err); }
});

router.get('/:id', authenticate, authorize('admin', 'analyst'), async (req, res, next) => {
  try {
    const customer = await db('customers').where({ id: req.params.id }).first();
    if (!customer) return res.status(404).json({ success: false, message: 'Müşteri bulunamadı.' });

    const orders = await db('orders').where({ customer_id: req.params.id }).orderBy('order_date', 'desc').limit(10);
    res.json({ success: true, data: { ...customer, recentOrders: orders } });
  } catch (err) { next(err); }
});

module.exports = router;
