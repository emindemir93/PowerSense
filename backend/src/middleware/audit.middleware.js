const db = require('../config/database');
const logger = require('../config/logger');

const auditLog = (action) => async (req, res, next) => {
  const originalJson = res.json.bind(res);

  res.json = async (data) => {
    if (req.user && res.statusCode < 400) {
      try {
        await db('audit_logs').insert({
          user_id: req.user.id,
          action,
          resource: req.path,
          method: req.method,
          ip_address: req.ip,
          user_agent: req.get('User-Agent'),
          status_code: res.statusCode,
          created_at: new Date(),
        });
      } catch (err) {
        logger.error('Audit log error:', err);
      }
    }
    return originalJson(data);
  };

  next();
};

module.exports = auditLog;
