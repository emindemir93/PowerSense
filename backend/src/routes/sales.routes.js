const router = require('express').Router();
const db = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth.middleware');

router.get('/summary', authenticate, authorize('admin', 'analyst', 'viewer'), async (req, res, next) => {
  try {
    const { period = '3m', group_by = 'month' } = req.query;
    const [{ total }] = await db('orders').sum('total_amount as total');
    res.json({ success: true, data: { total: parseFloat(total) } });
  } catch (err) { next(err); }
});

module.exports = router;
