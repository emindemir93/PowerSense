require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const logger = require('./config/logger');

const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const dashboardsRoutes = require('./routes/dashboards.routes');
const queryRoutes = require('./routes/query.routes');
const salesRoutes = require('./routes/sales.routes');
const ordersRoutes = require('./routes/orders.routes');
const customersRoutes = require('./routes/customers.routes');
const productsRoutes = require('./routes/products.routes');
const reportsRoutes = require('./routes/reports.routes');
const schemaRoutes = require('./routes/schema.routes');
const bookmarksRoutes = require('./routes/bookmarks.routes');
const commentsRoutes = require('./routes/comments.routes');
const alertsRoutes = require('./routes/alerts.routes');
const sqlRoutes = require('./routes/sql.routes');
const connectionsRoutes = require('./routes/connections.routes');
const savedQueriesRoutes = require('./routes/savedQueries.routes');
const auditRoutes = require('./routes/audit.routes');

const app = express();

app.use(helmet({ contentSecurityPolicy: false }));

const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:3000',
  process.env.BACKOFFICE_URL || 'http://localhost:3001',
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error('CORS policy violation'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please wait.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many login attempts. Please wait 15 minutes.' },
});

app.use('/api/', limiter);

app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use(morgan('combined', {
  stream: { write: (msg) => logger.http(msg.trim()) },
}));

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'PowerSense API Docs',
}));

app.get('/api-docs.json', (req, res) => res.json(swaggerSpec));

app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV,
  });
});

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/dashboards', dashboardsRoutes);
app.use('/api/query', queryRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/schema', schemaRoutes);
app.use('/api/bookmarks', bookmarksRoutes);
app.use('/api/comments', commentsRoutes);
app.use('/api/alerts', alertsRoutes);
app.use('/api/sql', sqlRoutes);
app.use('/api/connections', connectionsRoutes);
app.use('/api/saved-queries', savedQueriesRoutes);
app.use('/api/audit', auditRoutes);

app.use((req, res) => {
  res.status(404).json({ success: false, message: `Endpoint not found: ${req.method} ${req.path}` });
});

app.use((err, req, res, next) => {
  logger.error({ message: err.message, stack: err.stack, path: req.path });

  if (err.message === 'CORS policy violation') {
    return res.status(403).json({ success: false, message: 'CORS error' });
  }

  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Server error' : err.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  logger.info(`PowerSense API running on http://localhost:${PORT}`);
  logger.info(`Swagger docs: http://localhost:${PORT}/api-docs`);
  logger.info(`Environment: ${process.env.NODE_ENV}`);
});

module.exports = app;
