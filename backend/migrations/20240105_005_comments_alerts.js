exports.up = async (knex) => {
  await knex.schema.createTable('dashboard_comments', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('dashboard_id').notNullable().references('id').inTable('dashboards').onDelete('CASCADE');
    t.uuid('user_id').references('id').inTable('users').onDelete('SET NULL');
    t.text('text').notNullable();
    t.uuid('widget_id');
    t.timestamps(true, true);
    t.index('dashboard_id');
  });

  await knex.schema.createTable('widget_alerts', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('dashboard_id').notNullable().references('id').inTable('dashboards').onDelete('CASCADE');
    t.uuid('widget_id');
    t.string('name', 255).notNullable();
    t.string('measure', 100).notNullable();
    t.string('operator', 10).notNullable();
    t.decimal('threshold', 14, 2).notNullable();
    t.boolean('is_active').defaultTo(true);
    t.boolean('triggered').defaultTo(false);
    t.timestamp('last_triggered_at');
    t.uuid('created_by').references('id').inTable('users').onDelete('SET NULL');
    t.timestamps(true, true);
    t.index('dashboard_id');
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('widget_alerts');
  await knex.schema.dropTableIfExists('dashboard_comments');
};
