exports.up = async (knex) => {
  await knex.schema.createTable('dashboards', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('name', 255).notNullable();
    t.text('description');
    t.uuid('created_by').references('id').inTable('users').onDelete('SET NULL');
    t.jsonb('filters').defaultTo('{}');
    t.string('theme', 20).defaultTo('dark');
    t.boolean('is_default').defaultTo(false);
    t.boolean('is_public').defaultTo(false);
    t.timestamps(true, true);
  });

  await knex.schema.createTable('widgets', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('dashboard_id').notNullable().references('id').inTable('dashboards').onDelete('CASCADE');
    t.string('type', 50).notNullable();
    t.string('title', 255);
    t.jsonb('data_config').defaultTo('{}');
    t.jsonb('visual_config').defaultTo('{}');
    t.jsonb('position').defaultTo('{}');
    t.timestamps(true, true);
    t.index('dashboard_id');
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('widgets');
  await knex.schema.dropTableIfExists('dashboards');
};
