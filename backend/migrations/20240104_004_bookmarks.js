exports.up = async (knex) => {
  await knex.schema.createTable('bookmarks', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('dashboard_id').notNullable().references('id').inTable('dashboards').onDelete('CASCADE');
    t.string('name', 255).notNullable();
    t.jsonb('filters_state').defaultTo('[]');
    t.jsonb('date_range').defaultTo('{}');
    t.uuid('created_by').references('id').inTable('users').onDelete('SET NULL');
    t.boolean('is_default').defaultTo(false);
    t.timestamps(true, true);
    t.index('dashboard_id');
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('bookmarks');
};
