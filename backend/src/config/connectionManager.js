const knex = require('knex');
const appDb = require('./database');

const pools = new Map();

function createKnexInstance(conn) {
  return knex({
    client: 'pg',
    connection: {
      host: conn.host,
      port: conn.port,
      database: conn.database,
      user: conn.username,
      password: conn.password_encrypted,
      ssl: conn.ssl ? { rejectUnauthorized: false } : false,
      connectTimeout: 10000,
    },
    pool: { min: 0, max: 5, idleTimeoutMillis: 30000 },
  });
}

async function getConnection(connectionId) {
  if (!connectionId) {
    const defaultConn = await appDb('data_connections')
      .where({ is_default: true, is_active: true })
      .first();
    if (!defaultConn) return appDb;
    connectionId = defaultConn.id;
  }

  if (pools.has(connectionId)) {
    return pools.get(connectionId);
  }

  const conn = await appDb('data_connections')
    .where({ id: connectionId, is_active: true })
    .first();

  if (!conn) return appDb;

  const instance = createKnexInstance(conn);
  pools.set(connectionId, instance);
  return instance;
}

async function testConnection(config) {
  let instance;
  try {
    instance = knex({
      client: 'pg',
      connection: {
        host: config.host,
        port: config.port,
        database: config.database,
        user: config.username,
        password: config.password_encrypted || config.password,
        ssl: config.ssl ? { rejectUnauthorized: false } : false,
        connectTimeout: 10000,
      },
      pool: { min: 0, max: 1 },
    });

    const result = await instance.raw('SELECT version() AS version, current_database() AS db, current_user AS "user"');
    const info = result.rows[0];

    const tableCount = await instance.raw(
      "SELECT COUNT(*) AS count FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'"
    );

    return {
      success: true,
      version: info.version,
      database: info.db,
      user: info.user,
      tableCount: parseInt(tableCount.rows[0].count),
    };
  } finally {
    if (instance) await instance.destroy().catch(() => {});
  }
}

function removePool(connectionId) {
  if (pools.has(connectionId)) {
    const instance = pools.get(connectionId);
    instance.destroy().catch(() => {});
    pools.delete(connectionId);
  }
}

function clearAllPools() {
  for (const [id, instance] of pools) {
    instance.destroy().catch(() => {});
  }
  pools.clear();
}

module.exports = { getConnection, testConnection, removePool, clearAllPools };
