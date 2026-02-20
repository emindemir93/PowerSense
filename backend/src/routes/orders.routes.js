const router = require('express').Router();
const db = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth.middleware');

/**
 * @swagger
 * tags:
 *   name: Orders
 *   description: Sipariş yönetimi
 */

/**
 * @swagger
 * /api/orders:
 *   get:
 *     summary: Sipariş listesi (filtreli, sayfalı)
 *     tags: [Orders]
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
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *       - in: query
 *         name: region
 *         schema: { type: string }
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *       - in: query
 *         name: date_from
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: date_to
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: sort_by
 *         schema: { type: string, default: order_date }
 *       - in: query
 *         name: sort_dir
 *         schema: { type: string, enum: [asc, desc], default: desc }
 *     responses:
 *       200:
 *         description: Sipariş listesi
 */
router.get('/', authenticate, authorize('admin', 'analyst', 'viewer'), async (req, res, next) => {
  try {
    const {
      page = 1, limit = 20, search, status, region, category,
      date_from, date_to, sort_by = 'order_date', sort_dir = 'desc',
      payment_method, year,
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const validSorts = ['order_date', 'total_amount', 'customer_name', 'status'];
    const sortCol = validSorts.includes(sort_by) ? sort_by : 'order_date';

    let query = db('orders')
      .leftJoin('customers', 'orders.customer_id', 'customers.id')
      .select(
        'orders.id', 'orders.order_number', 'orders.status',
        'orders.total_amount', 'orders.order_date', 'orders.region',
        'orders.payment_method',
        'customers.name as customer_name', 'customers.email as customer_email'
      );

    if (search) {
      query = query.where(q =>
        q.where('orders.order_number', 'ilike', `%${search}%`)
         .orWhere('customers.name', 'ilike', `%${search}%`)
         .orWhere('customers.email', 'ilike', `%${search}%`)
      );
    }
    if (status) query = query.where('orders.status', status);
    if (region) query = query.whereIn('orders.region', region.split(','));
    if (payment_method) query = query.whereIn('orders.payment_method', payment_method.split(','));
    if (date_from) query = query.where('orders.order_date', '>=', date_from);
    if (date_to) query = query.where('orders.order_date', '<=', date_to);
    if (year) query = query.whereRaw('EXTRACT(YEAR FROM orders.order_date) = ?', [year]);

    if (category) {
      query = query
        .join('order_items', 'orders.id', 'order_items.order_id')
        .join('products', 'order_items.product_id', 'products.id')
        .join('categories', 'products.category_id', 'categories.id')
        .whereIn('categories.name', category.split(','))
        .distinct('orders.id');
    }

    const [{ count }] = await query.clone().count('orders.id as count');
    const orders = await query.orderBy(`orders.${sortCol}`, sort_dir)
      .limit(parseInt(limit)).offset(offset);

    res.json({
      success: true,
      data: orders,
      meta: {
        page: parseInt(page), limit: parseInt(limit),
        total: parseInt(count),
        totalPages: Math.ceil(parseInt(count) / parseInt(limit)),
      },
    });
  } catch (err) { next(err); }
});

/**
 * @swagger
 * /api/orders/{id}:
 *   get:
 *     summary: Sipariş detayı
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Sipariş detayı
 *       404:
 *         description: Sipariş bulunamadı
 */
router.get('/:id', authenticate, authorize('admin', 'analyst', 'viewer'), async (req, res, next) => {
  try {
    const order = await db('orders')
      .join('customers', 'orders.customer_id', 'customers.id')
      .where('orders.id', req.params.id)
      .select('orders.*', 'customers.name as customer_name', 'customers.email as customer_email', 'customers.phone as customer_phone')
      .first();

    if (!order) return res.status(404).json({ success: false, message: 'Sipariş bulunamadı.' });

    const items = await db('order_items')
      .join('products', 'order_items.product_id', 'products.id')
      .where('order_items.order_id', order.id)
      .select('order_items.*', 'products.name as product_name', 'products.sku');

    res.json({ success: true, data: { ...order, items } });
  } catch (err) { next(err); }
});

module.exports = router;
