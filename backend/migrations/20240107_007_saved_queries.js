exports.up = async (knex) => {
  await knex.schema.createTable('saved_queries', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('name', 255).notNullable();
    t.text('sql').notNullable();
    t.string('connection_id', 36);
    t.uuid('created_by').references('id').inTable('users').onDelete('SET NULL');
    t.timestamps(true, true);
    t.index('created_by');
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('saved_queries');
};
