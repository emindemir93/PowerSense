const router = require('express').Router();
const db = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth.middleware');

/**
 * @swagger
 * tags:
 *   name: Dashboard
 *   description: Dashboard KPI ve grafik verileri
 */

/**
 * @swagger
 * /api/dashboard/kpis:
 *   get:
 *     summary: Ana KPI metrikleri
 *     tags: [Dashboard]
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [7d, 1m, 3m, 6m, 1y, all]
 *           default: 3m
 *     responses:
 *       200:
 *         description: KPI verileri
 */
router.get('/kpis', authenticate, authorize('admin', 'analyst', 'viewer'), async (req, res, next) => {
  try {
    const { period = '3m' } = req.query;
    const dateFilter = getPeriodFilter(period);
    const prevDateFilter = getPrevPeriodFilter(period);

    // Current period
    const [current] = await db('orders')
      .where('order_date', '>=', dateFilter)
      .select(
        db.raw('COALESCE(SUM(total_amount), 0) as total_sales'),
        db.raw('COUNT(*) as order_count'),
        db.raw('COALESCE(AVG(total_amount), 0) as avg_basket'),
        db.raw('COALESCE(SUM(CASE WHEN status = \'returned\' THEN 1 ELSE 0 END)::float / NULLIF(COUNT(*), 0) * 100, 0) as return_rate')
      );

    // Previous period
    const [previous] = await db('orders')
      .where('order_date', '>=', prevDateFilter)
      .where('order_date', '<', dateFilter)
      .select(
        db.raw('COALESCE(SUM(total_amount), 0) as total_sales'),
        db.raw('COUNT(*) as order_count'),
        db.raw('COALESCE(AVG(total_amount), 0) as avg_basket'),
        db.raw('COALESCE(SUM(CASE WHEN status = \'returned\' THEN 1 ELSE 0 END)::float / NULLIF(COUNT(*), 0) * 100, 0) as return_rate')
      );

    const calcChange = (curr, prev) => prev > 0 ? ((curr - prev) / prev * 100).toFixed(1) : 0;

    res.json({
      success: true,
      data: {
        totalSales: {
          value: parseFloat(current.total_sales),
          change: parseFloat(calcChange(current.total_sales, previous.total_sales)),
        },
        orderCount: {
          value: parseInt(current.order_count),
          change: parseFloat(calcChange(current.order_count, previous.order_count)),
        },
        avgBasket: {
          value: parseFloat(current.avg_basket),
          change: parseFloat(calcChange(current.avg_basket, previous.avg_basket)),
        },
        returnRate: {
          value: parseFloat(current.return_rate),
          change: parseFloat(calcChange(current.return_rate, previous.return_rate)),
        },
      },
    });
  } catch (err) { next(err); }
});

/**
 * @swagger
 * /api/dashboard/sales-trend:
 *   get:
 *     summary: Satış trendi (aylık/haftalık)
 *     tags: [Dashboard]
 *     parameters:
 *       - in: query
 *         name: period
 *         schema: { type: string, enum: [3m, 6m, 1y] }
 *       - in: query
 *         name: region
 *         schema: { type: string }
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Trend verisi
 */
router.get('/sales-trend', authenticate, authorize('admin', 'analyst', 'viewer'), async (req, res, next) => {
  try {
    const { period = '6m', region, category } = req.query;
    const dateFilter = getPeriodFilter(period);

    let query = db('orders')
      .join('order_items', 'orders.id', 'order_items.order_id')
      .join('products', 'order_items.product_id', 'products.id')
      .where('orders.order_date', '>=', dateFilter)
      .select(
        db.raw("TO_CHAR(orders.order_date, 'YYYY-MM') as month"),
        db.raw('SUM(orders.total_amount) as revenue'),
        db.raw('COUNT(DISTINCT orders.id) as orders'),
        db.raw('SUM(order_items.quantity) as units')
      )
      .groupBy('month')
      .orderBy('month');

    if (region) query = query.where('orders.region', region);
    if (category) query = query.join('categories', 'products.category_id', 'categories.id').where('categories.name', category);

    const data = await query;

    res.json({
      success: true,
      data: data.map(r => ({
        month: r.month,
        revenue: parseFloat(r.revenue),
        orders: parseInt(r.orders),
        units: parseInt(r.units),
      })),
    });
  } catch (err) { next(err); }
});

/**
 * @swagger
 * /api/dashboard/category-distribution:
 *   get:
 *     summary: Kategori dağılımı
 *     tags: [Dashboard]
 *     responses:
 *       200:
 *         description: Kategori bazlı satış yüzdeleri
 */
router.get('/category-distribution', authenticate, authorize('admin', 'analyst', 'viewer'), async (req, res, next) => {
  try {
    const { period = '3m' } = req.query;
    const dateFilter = getPeriodFilter(period);

    const data = await db('orders')
      .join('order_items', 'orders.id', 'order_items.order_id')
      .join('products', 'order_items.product_id', 'products.id')
      .join('categories', 'products.category_id', 'categories.id')
      .where('orders.order_date', '>=', dateFilter)
      .select('categories.name as category')
      .sum('orders.total_amount as revenue')
      .count('orders.id as orders')
      .groupBy('categories.name')
      .orderBy('revenue', 'desc');

    const totalRevenue = data.reduce((sum, r) => sum + parseFloat(r.revenue), 0);

    res.json({
      success: true,
      data: data.map(r => ({
        category: r.category,
        revenue: parseFloat(r.revenue),
        orders: parseInt(r.orders),
        percentage: totalRevenue > 0 ? parseFloat((r.revenue / totalRevenue * 100).toFixed(1)) : 0,
      })),
    });
  } catch (err) { next(err); }
});

/**
 * @swagger
 * /api/dashboard/region-performance:
 *   get:
 *     summary: Bölge performansı
 *     tags: [Dashboard]
 *     responses:
 *       200:
 *         description: Bölge bazlı satış verileri
 */
router.get('/region-performance', authenticate, authorize('admin', 'analyst', 'viewer'), async (req, res, next) => {
  try {
    const { period = '3m' } = req.query;
    const dateFilter = getPeriodFilter(period);

    const data = await db('orders')
      .where('order_date', '>=', dateFilter)
      .select('region')
      .sum('total_amount as revenue')
      .count('id as orders')
      .avg('total_amount as avg_order')
      .groupBy('region')
      .orderBy('revenue', 'desc');

    res.json({
      success: true,
      data: data.map(r => ({
        region: r.region,
        revenue: parseFloat(r.revenue),
        orders: parseInt(r.orders),
        avgOrder: parseFloat(r.avg_order),
      })),
    });
  } catch (err) { next(err); }
});

/**
 * @swagger
 * /api/dashboard/top-products:
 *   get:
 *     summary: En çok satan ürünler
 *     tags: [Dashboard]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *     responses:
 *       200:
 *         description: Top ürün listesi
 */
router.get('/top-products', authenticate, authorize('admin', 'analyst', 'viewer'), async (req, res, next) => {
  try {
    const { period = '3m', limit = 10 } = req.query;
    const dateFilter = getPeriodFilter(period);

    const data = await db('order_items')
      .join('orders', 'order_items.order_id', 'orders.id')
      .join('products', 'order_items.product_id', 'products.id')
      .where('orders.order_date', '>=', dateFilter)
      .select('products.id', 'products.name', 'products.sku')
      .sum('order_items.quantity as units_sold')
      .sum(db.raw('order_items.quantity * order_items.unit_price as revenue'))
      .groupBy('products.id', 'products.name', 'products.sku')
      .orderBy('units_sold', 'desc')
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: data.map(r => ({
        id: r.id,
        name: r.name,
        sku: r.sku,
        unitsSold: parseInt(r.units_sold),
        revenue: parseFloat(r.revenue),
      })),
    });
  } catch (err) { next(err); }
});

/**
 * @swagger
 * /api/dashboard/payment-methods:
 *   get:
 *     summary: Ödeme yöntemi dağılımı
 *     tags: [Dashboard]
 *     responses:
 *       200:
 *         description: Ödeme yöntemi verisi
 */
router.get('/payment-methods', authenticate, authorize('admin', 'analyst', 'viewer'), async (req, res, next) => {
  try {
    const { period = '6m' } = req.query;
    const dateFilter = getPeriodFilter(period);

    const data = await db('orders')
      .where('order_date', '>=', dateFilter)
      .select(
        'payment_method',
        db.raw("TO_CHAR(order_date, 'YYYY-MM') as month")
      )
      .sum('total_amount as revenue')
      .count('id as orders')
      .groupBy('payment_method', 'month')
      .orderBy('month');

    res.json({ success: true, data });
  } catch (err) { next(err); }
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getPeriodFilter(period) {
  const now = new Date();
  const map = {
    '7d': new Date(now - 7 * 24 * 60 * 60 * 1000),
    '1m': new Date(now.setMonth(now.getMonth() - 1)),
    '3m': new Date(new Date().setMonth(new Date().getMonth() - 3)),
    '6m': new Date(new Date().setMonth(new Date().getMonth() - 6)),
    '1y': new Date(new Date().setFullYear(new Date().getFullYear() - 1)),
    'all': new Date('2020-01-01'),
  };
  return map[period] || map['3m'];
}

function getPrevPeriodFilter(period) {
  const now = new Date();
  const map = {
    '7d': new Date(now - 14 * 24 * 60 * 60 * 1000),
    '1m': new Date(now.setMonth(now.getMonth() - 2)),
    '3m': new Date(new Date().setMonth(new Date().getMonth() - 6)),
    '6m': new Date(new Date().setMonth(new Date().getMonth() - 12)),
    '1y': new Date(new Date().setFullYear(new Date().getFullYear() - 2)),
    'all': new Date('2019-01-01'),
  };
  return map[period] || map['3m'];
}

module.exports = router;
