exports.up = async (knex) => {
  await knex.schema.createTable('data_connections', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('name', 255).notNullable();
    t.string('db_type', 50).notNullable().defaultTo('postgresql');
    t.string('host', 255).notNullable();
    t.integer('port').notNullable().defaultTo(5432);
    t.string('database', 255).notNullable();
    t.string('username', 255).notNullable();
    t.text('password_encrypted').notNullable();
    t.boolean('ssl').defaultTo(false);
    t.boolean('is_default').defaultTo(false);
    t.boolean('is_active').defaultTo(true);
    t.string('status', 50).defaultTo('untested');
    t.timestamp('last_tested_at');
    t.text('last_error');
    t.uuid('created_by').references('id').inTable('users').onDelete('SET NULL');
    t.timestamps(true, true);
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('data_connections');
};
