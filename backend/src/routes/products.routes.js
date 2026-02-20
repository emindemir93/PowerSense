const router = require('express').Router();
const db = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth.middleware');

/**
 * @swagger
 * tags:
 *   name: Products
 *   description: Ürün kataloğu
 */

router.get('/', authenticate, authorize('admin', 'analyst', 'viewer'), async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, category } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = db('products')
      .join('categories', 'products.category_id', 'categories.id')
      .select('products.*', 'categories.name as category_name');

    if (search) query = query.where('products.name', 'ilike', `%${search}%`);
    if (category) query = query.where('categories.name', category);

    const [{ count }] = await query.clone().count('products.id as count');
    const products = await query.orderBy('products.name').limit(parseInt(limit)).offset(offset);

    res.json({
      success: true, data: products,
      meta: { page: parseInt(page), limit: parseInt(limit), total: parseInt(count), totalPages: Math.ceil(parseInt(count) / parseInt(limit)) },
    });
  } catch (err) { next(err); }
});

router.get('/categories', authenticate, async (req, res, next) => {
  try {
    const cats = await db('categories').select('*').orderBy('name');
    res.json({ success: true, data: cats });
  } catch (err) { next(err); }
});

module.exports = router;
