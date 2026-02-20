exports.up = async (knex) => {
  await knex.schema.createTable('reports', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('name', 255).notNullable();
    t.text('description');
    t.uuid('created_by').references('id').inTable('users').onDelete('SET NULL');
    t.jsonb('query_config').notNullable();
    t.jsonb('columns_config').defaultTo('[]');
    t.string('schedule', 50);
    t.timestamp('last_run_at');
    t.integer('run_count').defaultTo(0);
    t.boolean('is_public').defaultTo(false);
    t.timestamps(true, true);
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('reports');
};
