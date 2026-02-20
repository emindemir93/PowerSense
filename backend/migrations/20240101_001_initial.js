exports.up = async (knex) => {
  // Extensions
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

  // Users
  await knex.schema.createTable('users', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('name', 100).notNullable();
    t.string('email', 255).notNullable().unique();
    t.string('password_hash').notNullable();
    t.enum('role', ['admin', 'analyst', 'viewer']).defaultTo('viewer');
    t.boolean('is_active').defaultTo(true);
    t.timestamp('last_login');
    t.timestamps(true, true);
  });

  // Refresh tokens
  await knex.schema.createTable('refresh_tokens', (t) => {
    t.uuid('id').primary();
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.text('token').notNullable().unique();
    t.timestamp('expires_at').notNullable();
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // Audit logs
  await knex.schema.createTable('audit_logs', (t) => {
    t.increments('id').primary();
    t.uuid('user_id').references('id').inTable('users').onDelete('SET NULL');
    t.string('action', 100).notNullable();
    t.string('resource', 255);
    t.string('method', 10);
    t.string('ip_address', 50);
    t.text('user_agent');
    t.integer('status_code');
    t.jsonb('metadata');
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.index(['user_id', 'created_at']);
    t.index('action');
  });

  // Categories
  await knex.schema.createTable('categories', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('name', 100).notNullable().unique();
    t.string('color', 7);
    t.timestamps(true, true);
  });

  // Products
  await knex.schema.createTable('products', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('name', 255).notNullable();
    t.string('sku', 50).unique();
    t.uuid('category_id').references('id').inTable('categories').onDelete('SET NULL');
    t.decimal('price', 12, 2).notNullable();
    t.integer('stock').defaultTo(0);
    t.boolean('is_active').defaultTo(true);
    t.timestamps(true, true);
    t.index('category_id');
  });

  // Customers
  await knex.schema.createTable('customers', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('name', 100).notNullable();
    t.string('email', 255).unique();
    t.string('phone', 20);
    t.string('city', 100);
    t.string('region', 100);
    t.enum('type', ['individual', 'corporate']).defaultTo('individual');
    t.boolean('is_active').defaultTo(true);
    t.timestamps(true, true);
    t.index('region');
  });

  // Orders
  await knex.schema.createTable('orders', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('order_number', 30).unique().notNullable();
    t.uuid('customer_id').references('id').inTable('customers').onDelete('SET NULL');
    t.enum('status', ['completed', 'shipped', 'pending', 'cancelled', 'returned']).defaultTo('pending');
    t.decimal('total_amount', 14, 2).notNullable();
    t.decimal('discount_amount', 14, 2).defaultTo(0);
    t.decimal('tax_amount', 14, 2).defaultTo(0);
    t.string('region', 100);
    t.enum('payment_method', ['credit_card', 'bank_transfer', 'cash', 'online_payment']).notNullable();
    t.timestamp('order_date').notNullable();
    t.timestamps(true, true);
    t.index('customer_id');
    t.index('order_date');
    t.index('region');
    t.index('status');
  });

  // Order items
  await knex.schema.createTable('order_items', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('order_id').notNullable().references('id').inTable('orders').onDelete('CASCADE');
    t.uuid('product_id').references('id').inTable('products').onDelete('SET NULL');
    t.integer('quantity').notNullable().defaultTo(1);
    t.decimal('unit_price', 12, 2).notNullable();
    t.decimal('total_price', 14, 2).notNullable();
    t.index('order_id');
    t.index('product_id');
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('order_items');
  await knex.schema.dropTableIfExists('orders');
  await knex.schema.dropTableIfExists('customers');
  await knex.schema.dropTableIfExists('products');
  await knex.schema.dropTableIfExists('categories');
  await knex.schema.dropTableIfExists('audit_logs');
  await knex.schema.dropTableIfExists('refresh_tokens');
  await knex.schema.dropTableIfExists('users');
};
