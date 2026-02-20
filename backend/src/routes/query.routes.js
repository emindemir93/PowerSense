const router = require('express').Router();
const db = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth.middleware');

const SCHEMAS = {
  orders: {
    table: 'orders',
    dimensions: {
      status: { expr: 'orders.status', label: 'Order Status' },
      region: { expr: 'orders.region', label: 'Region' },
      payment_method: { expr: 'orders.payment_method', label: 'Payment Method' },
      month: { expr: "TO_CHAR(orders.order_date, 'YYYY-MM')", label: 'Month' },
      year: { expr: "EXTRACT(YEAR FROM orders.order_date)::text", label: 'Year' },
      quarter: { expr: "CONCAT('Q', EXTRACT(QUARTER FROM orders.order_date)::text)", label: 'Quarter' },
      customer_name: { expr: 'customers.name', label: 'Customer', join: 'customers' },
      customer_city: { expr: 'customers.city', label: 'City', join: 'customers' },
      customer_type: { expr: 'customers.type', label: 'Customer Type', join: 'customers' },
      category: { expr: 'categories.name', label: 'Category', join: 'categories' },
      product: { expr: 'products.name', label: 'Product', join: 'products' },
    },
    measures: {
      total_amount: { expr: 'orders.total_amount', label: 'Revenue', defaultAgg: 'sum' },
      discount_amount: { expr: 'orders.discount_amount', label: 'Discount', defaultAgg: 'sum' },
      tax_amount: { expr: 'orders.tax_amount', label: 'Tax', defaultAgg: 'sum' },
      order_count: { expr: 'orders.id', label: 'Order Count', defaultAgg: 'count' },
      quantity: { expr: 'order_items.quantity', label: 'Quantity Sold', defaultAgg: 'sum', join: 'order_items' },
      avg_order: { expr: 'orders.total_amount', label: 'Avg Order Value', defaultAgg: 'avg' },
    },
    joins: {
      customers: { sql: 'LEFT JOIN customers ON orders.customer_id = customers.id', requires: [] },
      order_items: { sql: 'LEFT JOIN order_items ON orders.id = order_items.order_id', requires: [] },
      products: { sql: 'LEFT JOIN products ON order_items.product_id = products.id', requires: ['order_items'] },
      categories: { sql: 'LEFT JOIN categories ON products.category_id = categories.id', requires: ['order_items', 'products'] },
    },
    filterColumns: {
      status: { column: 'orders.status', type: 'enum' },
      region: { column: 'orders.region', type: 'enum' },
      payment_method: { column: 'orders.payment_method', type: 'enum' },
      date_from: { column: 'orders.order_date', op: '>=' },
      date_to: { column: 'orders.order_date', op: '<=' },
      customer_type: { column: 'customers.type', type: 'enum', join: 'customers' },
      category: { column: 'categories.name', type: 'enum', join: 'categories' },
    },
  },
  customers: {
    table: 'customers',
    dimensions: {
      name: { expr: 'customers.name', label: 'Customer Name' },
      city: { expr: 'customers.city', label: 'City' },
      region: { expr: 'customers.region', label: 'Region' },
      type: { expr: 'customers.type', label: 'Customer Type' },
      is_active: { expr: 'customers.is_active::text', label: 'Active Status' },
    },
    measures: {
      customer_count: { expr: 'customers.id', label: 'Customer Count', defaultAgg: 'count' },
    },
    joins: {},
    filterColumns: {
      region: { column: 'customers.region', type: 'enum' },
      city: { column: 'customers.city', type: 'enum' },
      type: { column: 'customers.type', type: 'enum' },
    },
  },
  products: {
    table: 'products',
    dimensions: {
      name: { expr: 'products.name', label: 'Product Name' },
      sku: { expr: 'products.sku', label: 'SKU' },
      category: { expr: 'categories.name', label: 'Category', join: 'categories' },
      is_active: { expr: 'products.is_active::text', label: 'Active Status' },
    },
    measures: {
      product_count: { expr: 'products.id', label: 'Product Count', defaultAgg: 'count' },
      price: { expr: 'products.price', label: 'Price', defaultAgg: 'avg' },
      stock: { expr: 'products.stock', label: 'Stock', defaultAgg: 'sum' },
      total_value: { expr: '(products.price * products.stock)', label: 'Inventory Value', defaultAgg: 'sum' },
    },
    joins: {
      categories: { sql: 'LEFT JOIN categories ON products.category_id = categories.id', requires: [] },
    },
    filterColumns: {
      category: { column: 'categories.name', type: 'enum', join: 'categories' },
      is_active: { column: 'products.is_active', type: 'boolean' },
    },
  },
};

function addJoinWithDeps(schema, joinName, joinSet) {
  if (joinSet.has(joinName)) return;
  const joinConfig = schema.joins[joinName];
  if (!joinConfig) return;
  if (joinConfig.requires) {
    for (const dep of joinConfig.requires) {
      addJoinWithDeps(schema, dep, joinSet);
    }
  }
  joinSet.add(joinName);
}

router.get('/schema', authenticate, authorize('admin', 'analyst', 'viewer'), (req, res) => {
  const schema = {};
  for (const [source, config] of Object.entries(SCHEMAS)) {
    schema[source] = {
      label: source.charAt(0).toUpperCase() + source.slice(1),
      dimensions: Object.entries(config.dimensions).map(([key, val]) => ({
        key,
        label: val.label,
      })),
      measures: Object.entries(config.measures).map(([key, val]) => ({
        key,
        label: val.label,
        defaultAgg: val.defaultAgg,
      })),
      filters: Object.keys(config.filterColumns),
    };
  }
  res.json({ success: true, data: schema });
});

router.post('/', authenticate, authorize('admin', 'analyst', 'viewer'), async (req, res, next) => {
  try {
    const { source, dimensions = [], measures = [], filters = {}, sort, limit = 1000 } = req.body;

    const schema = SCHEMAS[source];
    if (!schema) {
      return res.status(400).json({ success: false, message: `Invalid data source: ${source}` });
    }

    const requiredJoins = new Set();

    for (const dim of dimensions) {
      const dc = schema.dimensions[dim];
      if (!dc) return res.status(400).json({ success: false, message: `Invalid dimension: ${dim}` });
      if (dc.join) addJoinWithDeps(schema, dc.join, requiredJoins);
    }

    for (const m of measures) {
      if (m.type === 'calculated') continue;
      const mc = schema.measures[m.field];
      if (!mc) return res.status(400).json({ success: false, message: `Invalid measure: ${m.field}` });
      if (mc.join) addJoinWithDeps(schema, mc.join, requiredJoins);
    }

    for (const [fk] of Object.entries(filters)) {
      const fc = schema.filterColumns[fk];
      if (fc && fc.join) addJoinWithDeps(schema, fc.join, requiredJoins);
    }

    let query = db(schema.table);

    for (const joinName of requiredJoins) {
      const jc = schema.joins[joinName];
      if (jc) query = query.joinRaw(jc.sql);
    }

    const selectParts = [];
    const groupParts = [];

    dimensions.forEach((dim, i) => {
      const dc = schema.dimensions[dim];
      const alias = `dim_${i}`;
      selectParts.push(db.raw(`${dc.expr} as "${alias}"`));
      groupParts.push(dc.expr);
    });

    const calcFields = [];
    measures.forEach((m, i) => {
      const alias = m.alias || `measure_${i}`;

      if (m.type === 'calculated' && m.expression) {
        calcFields.push({ alias, expression: m.expression });
        return;
      }

      const mc = schema.measures[m.field];
      if (!mc) return;
      const agg = m.aggregation || mc.defaultAgg;
      const expr = mc.expr;

      const aggMap = {
        sum: `COALESCE(SUM(${expr}), 0)`,
        count: `COUNT(${expr})`,
        count_distinct: `COUNT(DISTINCT ${expr})`,
        avg: `COALESCE(AVG(${expr}), 0)`,
        min: `COALESCE(MIN(${expr}), 0)`,
        max: `COALESCE(MAX(${expr}), 0)`,
      };
      selectParts.push(db.raw(`${aggMap[agg] || aggMap.sum} as "${alias}"`));
    });

    if (selectParts.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one dimension or measure required' });
    }

    query = query.select(selectParts);

    for (const [fk, fv] of Object.entries(filters)) {
      if (fv === null || fv === undefined || fv === '') continue;
      const fc = schema.filterColumns[fk];
      if (!fc) continue;
      const col = fc.column || fc;
      const op = fc.op || '=';

      if (Array.isArray(fv)) {
        query = query.whereIn(db.raw(col), fv);
      } else if (op !== '=') {
        query = query.where(db.raw(col), op, fv);
      } else {
        query = query.where(db.raw(col), fv);
      }
    }

    if (groupParts.length > 0) {
      groupParts.forEach((g) => { query = query.groupByRaw(g); });
    }

    if (sort && sort.field) {
      query = query.orderByRaw(`"${sort.field}" ${sort.direction === 'asc' ? 'ASC' : 'DESC'}`);
    } else if (measures.length > 0) {
      const firstAlias = measures[0].alias || 'measure_0';
      query = query.orderByRaw(`"${firstAlias}" DESC`);
    }

    query = query.limit(Math.min(parseInt(limit) || 1000, 10000));

    const data = await query;

    const result = data.map((row) => {
      const mapped = {};
      dimensions.forEach((dim, i) => { mapped[dim] = row[`dim_${i}`]; });
      measures.forEach((m, i) => {
        if (m.type === 'calculated') return;
        const alias = m.alias || `measure_${i}`;
        mapped[alias] = parseFloat(row[alias]) || 0;
      });
      for (const cf of calcFields) {
        try {
          const expr = cf.expression.replace(/\{(\w+)\}/g, (_, key) => {
            const val = mapped[key];
            return val !== undefined ? val : 0;
          });
          const safeExpr = expr.replace(/[^0-9+\-*/().%\s]/g, '');
          mapped[cf.alias] = Function('"use strict"; return (' + safeExpr + ')')();
          if (!isFinite(mapped[cf.alias])) mapped[cf.alias] = 0;
        } catch { mapped[cf.alias] = 0; }
      }
      return mapped;
    });

    res.json({ success: true, data: result, meta: { total: result.length } });
  } catch (err) { next(err); }
});

router.get('/filter-values/:source/:field', authenticate, authorize('admin', 'analyst', 'viewer'), async (req, res, next) => {
  try {
    const { source, field } = req.params;
    const schema = SCHEMAS[source];
    if (!schema) return res.status(400).json({ success: false, message: 'Invalid source' });

    const dc = schema.dimensions[field];
    if (!dc) return res.status(400).json({ success: false, message: 'Invalid field' });

    let query = db(schema.table);
    if (dc.join) {
      const joins = new Set();
      addJoinWithDeps(schema, dc.join, joins);
      for (const j of joins) {
        const jc = schema.joins[j];
        if (jc) query = query.joinRaw(jc.sql);
      }
    }

    const values = await query
      .select(db.raw(`DISTINCT ${dc.expr} as value`))
      .whereNotNull(db.raw(dc.expr))
      .orderByRaw(`${dc.expr} ASC`)
      .limit(500);

    res.json({ success: true, data: values.map((v) => v.value) });
  } catch (err) { next(err); }
});

module.exports = router;
