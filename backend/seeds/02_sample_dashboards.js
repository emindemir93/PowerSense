const { v4: uuidv4 } = require('uuid');

exports.seed = async (knex) => {
  await knex('widgets').delete();
  await knex('dashboards').delete();

  const admin = await knex('users').where('email', 'admin@qlicksense.com').first();
  if (!admin) return;

  const d1 = uuidv4();
  const d2 = uuidv4();
  const d3 = uuidv4();

  await knex('dashboards').insert([
    {
      id: d1,
      name: 'Sales Overview',
      description: 'Comprehensive sales analytics with revenue trends, category breakdown, and regional performance.',
      created_by: admin.id,
      theme: 'dark',
      is_default: true,
      is_public: true,
    },
    {
      id: d2,
      name: 'Customer Insights',
      description: 'Customer segmentation analysis by region, type, and city distribution.',
      created_by: admin.id,
      theme: 'dark',
      is_default: false,
      is_public: true,
    },
    {
      id: d3,
      name: 'Product Performance',
      description: 'Product catalog analytics with category breakdown, inventory status, and pricing analysis.',
      created_by: admin.id,
      theme: 'dark',
      is_default: false,
      is_public: true,
    },
  ]);

  const widgets = [
    // ─── Sales Overview Dashboard ─────────────────────────────────────
    {
      id: uuidv4(), dashboard_id: d1, type: 'kpi', title: 'Total Revenue',
      data_config: JSON.stringify({ source: 'orders', dimensions: [], measures: [{ field: 'total_amount', aggregation: 'sum', alias: 'value' }] }),
      visual_config: JSON.stringify({ format: 'currency', prefix: '₺', color: '#4493f8', icon: 'revenue' }),
      position: JSON.stringify({ x: 0, y: 0, w: 3, h: 2 }),
    },
    {
      id: uuidv4(), dashboard_id: d1, type: 'kpi', title: 'Total Orders',
      data_config: JSON.stringify({ source: 'orders', dimensions: [], measures: [{ field: 'order_count', aggregation: 'count', alias: 'value' }] }),
      visual_config: JSON.stringify({ format: 'number', color: '#3fb950', icon: 'orders' }),
      position: JSON.stringify({ x: 3, y: 0, w: 3, h: 2 }),
    },
    {
      id: uuidv4(), dashboard_id: d1, type: 'kpi', title: 'Avg Order Value',
      data_config: JSON.stringify({ source: 'orders', dimensions: [], measures: [{ field: 'avg_order', aggregation: 'avg', alias: 'value' }] }),
      visual_config: JSON.stringify({ format: 'currency', prefix: '₺', color: '#d29922', icon: 'average' }),
      position: JSON.stringify({ x: 6, y: 0, w: 3, h: 2 }),
    },
    {
      id: uuidv4(), dashboard_id: d1, type: 'kpi', title: 'Total Discount',
      data_config: JSON.stringify({ source: 'orders', dimensions: [], measures: [{ field: 'discount_amount', aggregation: 'sum', alias: 'value' }] }),
      visual_config: JSON.stringify({ format: 'currency', prefix: '₺', color: '#f85149', icon: 'discount' }),
      position: JSON.stringify({ x: 9, y: 0, w: 3, h: 2 }),
    },
    {
      id: uuidv4(), dashboard_id: d1, type: 'line', title: 'Monthly Revenue Trend',
      data_config: JSON.stringify({ source: 'orders', dimensions: ['month'], measures: [{ field: 'total_amount', aggregation: 'sum', alias: 'revenue' }], sort: { field: 'dim_0', direction: 'asc' } }),
      visual_config: JSON.stringify({ colors: ['#4493f8'], showGrid: true, showDots: true }),
      position: JSON.stringify({ x: 0, y: 2, w: 8, h: 5 }),
    },
    {
      id: uuidv4(), dashboard_id: d1, type: 'donut', title: 'Revenue by Category',
      data_config: JSON.stringify({ source: 'orders', dimensions: ['category'], measures: [{ field: 'total_amount', aggregation: 'sum', alias: 'revenue' }] }),
      visual_config: JSON.stringify({ colors: ['#4493f8', '#7c3aed', '#3fb950', '#d29922', '#f85149'], showLabels: true }),
      position: JSON.stringify({ x: 8, y: 2, w: 4, h: 5 }),
    },
    {
      id: uuidv4(), dashboard_id: d1, type: 'bar', title: 'Revenue by Region',
      data_config: JSON.stringify({ source: 'orders', dimensions: ['region'], measures: [{ field: 'total_amount', aggregation: 'sum', alias: 'revenue' }] }),
      visual_config: JSON.stringify({ colors: ['#7c3aed'], showGrid: true }),
      position: JSON.stringify({ x: 0, y: 7, w: 6, h: 5 }),
    },
    {
      id: uuidv4(), dashboard_id: d1, type: 'table', title: 'Top Products by Revenue',
      data_config: JSON.stringify({ source: 'orders', dimensions: ['product'], measures: [{ field: 'total_amount', aggregation: 'sum', alias: 'revenue' }, { field: 'quantity', aggregation: 'sum', alias: 'units' }], limit: 10 }),
      visual_config: JSON.stringify({}),
      position: JSON.stringify({ x: 6, y: 7, w: 6, h: 5 }),
    },

    // ─── Customer Insights Dashboard ──────────────────────────────────
    {
      id: uuidv4(), dashboard_id: d2, type: 'kpi', title: 'Total Customers',
      data_config: JSON.stringify({ source: 'customers', dimensions: [], measures: [{ field: 'customer_count', aggregation: 'count', alias: 'value' }] }),
      visual_config: JSON.stringify({ format: 'number', color: '#4493f8', icon: 'customers' }),
      position: JSON.stringify({ x: 0, y: 0, w: 4, h: 2 }),
    },
    {
      id: uuidv4(), dashboard_id: d2, type: 'kpi', title: 'Corporate Clients',
      data_config: JSON.stringify({ source: 'customers', dimensions: [], measures: [{ field: 'customer_count', aggregation: 'count', alias: 'value' }], filters: { type: 'corporate' } }),
      visual_config: JSON.stringify({ format: 'number', color: '#7c3aed', icon: 'corporate' }),
      position: JSON.stringify({ x: 4, y: 0, w: 4, h: 2 }),
    },
    {
      id: uuidv4(), dashboard_id: d2, type: 'kpi', title: 'Individual Clients',
      data_config: JSON.stringify({ source: 'customers', dimensions: [], measures: [{ field: 'customer_count', aggregation: 'count', alias: 'value' }], filters: { type: 'individual' } }),
      visual_config: JSON.stringify({ format: 'number', color: '#3fb950', icon: 'individual' }),
      position: JSON.stringify({ x: 8, y: 0, w: 4, h: 2 }),
    },
    {
      id: uuidv4(), dashboard_id: d2, type: 'bar', title: 'Customers by Region',
      data_config: JSON.stringify({ source: 'customers', dimensions: ['region'], measures: [{ field: 'customer_count', aggregation: 'count', alias: 'count' }] }),
      visual_config: JSON.stringify({ colors: ['#4493f8'], showGrid: true }),
      position: JSON.stringify({ x: 0, y: 2, w: 6, h: 5 }),
    },
    {
      id: uuidv4(), dashboard_id: d2, type: 'donut', title: 'Customer Types',
      data_config: JSON.stringify({ source: 'customers', dimensions: ['type'], measures: [{ field: 'customer_count', aggregation: 'count', alias: 'count' }] }),
      visual_config: JSON.stringify({ colors: ['#7c3aed', '#3fb950'], showLabels: true }),
      position: JSON.stringify({ x: 6, y: 2, w: 6, h: 5 }),
    },
    {
      id: uuidv4(), dashboard_id: d2, type: 'hbar', title: 'Top Cities by Customer Count',
      data_config: JSON.stringify({ source: 'customers', dimensions: ['city'], measures: [{ field: 'customer_count', aggregation: 'count', alias: 'count' }], limit: 10 }),
      visual_config: JSON.stringify({ colors: ['#d29922'], showGrid: true }),
      position: JSON.stringify({ x: 0, y: 7, w: 12, h: 5 }),
    },

    // ─── Product Performance Dashboard ────────────────────────────────
    {
      id: uuidv4(), dashboard_id: d3, type: 'kpi', title: 'Total Products',
      data_config: JSON.stringify({ source: 'products', dimensions: [], measures: [{ field: 'product_count', aggregation: 'count', alias: 'value' }] }),
      visual_config: JSON.stringify({ format: 'number', color: '#4493f8', icon: 'products' }),
      position: JSON.stringify({ x: 0, y: 0, w: 3, h: 2 }),
    },
    {
      id: uuidv4(), dashboard_id: d3, type: 'kpi', title: 'Avg Price',
      data_config: JSON.stringify({ source: 'products', dimensions: [], measures: [{ field: 'price', aggregation: 'avg', alias: 'value' }] }),
      visual_config: JSON.stringify({ format: 'currency', prefix: '₺', color: '#3fb950', icon: 'price' }),
      position: JSON.stringify({ x: 3, y: 0, w: 3, h: 2 }),
    },
    {
      id: uuidv4(), dashboard_id: d3, type: 'kpi', title: 'Total Stock',
      data_config: JSON.stringify({ source: 'products', dimensions: [], measures: [{ field: 'stock', aggregation: 'sum', alias: 'value' }] }),
      visual_config: JSON.stringify({ format: 'number', color: '#d29922', icon: 'stock' }),
      position: JSON.stringify({ x: 6, y: 0, w: 3, h: 2 }),
    },
    {
      id: uuidv4(), dashboard_id: d3, type: 'kpi', title: 'Inventory Value',
      data_config: JSON.stringify({ source: 'products', dimensions: [], measures: [{ field: 'total_value', aggregation: 'sum', alias: 'value' }] }),
      visual_config: JSON.stringify({ format: 'currency', prefix: '₺', color: '#7c3aed', icon: 'value' }),
      position: JSON.stringify({ x: 9, y: 0, w: 3, h: 2 }),
    },
    {
      id: uuidv4(), dashboard_id: d3, type: 'bar', title: 'Products by Category',
      data_config: JSON.stringify({ source: 'products', dimensions: ['category'], measures: [{ field: 'product_count', aggregation: 'count', alias: 'count' }] }),
      visual_config: JSON.stringify({ colors: ['#4493f8', '#7c3aed', '#3fb950', '#d29922', '#f85149'], showGrid: true }),
      position: JSON.stringify({ x: 0, y: 2, w: 6, h: 5 }),
    },
    {
      id: uuidv4(), dashboard_id: d3, type: 'pie', title: 'Stock Distribution',
      data_config: JSON.stringify({ source: 'products', dimensions: ['category'], measures: [{ field: 'stock', aggregation: 'sum', alias: 'stock' }] }),
      visual_config: JSON.stringify({ colors: ['#4493f8', '#7c3aed', '#3fb950', '#d29922', '#f85149'], showLabels: true }),
      position: JSON.stringify({ x: 6, y: 2, w: 6, h: 5 }),
    },
    {
      id: uuidv4(), dashboard_id: d3, type: 'table', title: 'Product Catalog',
      data_config: JSON.stringify({ source: 'products', dimensions: ['name', 'category'], measures: [{ field: 'price', aggregation: 'avg', alias: 'price' }, { field: 'stock', aggregation: 'sum', alias: 'stock' }], limit: 20 }),
      visual_config: JSON.stringify({}),
      position: JSON.stringify({ x: 0, y: 7, w: 12, h: 6 }),
    },
  ];

  await knex('widgets').insert(widgets);

  console.log(`✅ Sample dashboards seeded: 3 dashboards, ${widgets.length} widgets`);
};
