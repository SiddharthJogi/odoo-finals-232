const { Pool } = require('pg');
const config = require('./config');

const pool = new Pool({
  connectionString: config.databaseUrl,
});

pool.on('error', (err) => {
  console.error('Unexpected PG pool error:', err);
  process.exit(1);
});

/**
 * Execute a parameterized query against the pool.
 * @param {string} text - SQL query text with $1, $2, ... placeholders
 * @param {Array} params - Parameter values
 * @returns {Promise<import('pg').QueryResult>}
 */
async function query(text, params) {
  return pool.query(text, params);
}

/**
 * Get a client from the pool for transaction use.
 * Caller is responsible for calling client.release().
 * @returns {Promise<import('pg').PoolClient>}
 */
async function getClient() {
  return pool.connect();
}

module.exports = { query, getClient, pool };
