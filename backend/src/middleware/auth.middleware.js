const jwt = require('jsonwebtoken');
const db = require('../config/database');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Yetkilendirme token\'ı gereklidir.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await db('users')
      .where({ id: decoded.id, is_active: true })
      .select('id', 'name', 'email', 'role', 'is_active')
      .first();

    if (!user) {
      return res.status(401).json({ success: false, message: 'Geçersiz token veya kullanıcı aktif değil.' });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token süresi dolmuş.', code: 'TOKEN_EXPIRED' });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ success: false, message: 'Geçersiz token.' });
    }
    next(err);
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: `Bu işlem için '${roles.join(' veya ')}' rolü gereklidir.`,
    });
  }
  next();
};

module.exports = { authenticate, authorize };
