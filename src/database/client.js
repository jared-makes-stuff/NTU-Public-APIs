/**
 * PostgreSQL connection client module.
 * Manages a singleton connection pool to the database.
 */
const { Pool } = require('pg');
require('dotenv').config();
const logger = require('../utils/logger');

let pool;

/**
 * Checks if the necessary database environment variables are set.
 * @returns {boolean} True if configuration exists, false otherwise.
 */
const hasDatabaseConfig = () =>
  !!process.env.DATABASE_URL ||
  (process.env.PGHOST && process.env.PGUSER && process.env.PGPASSWORD && process.env.PGDATABASE);

/**
 * Determines the SSL configuration for the Postgres connection.
 * @returns {object|boolean|undefined} The SSL config object, false, or undefined.
 */
const sslSetting = () => {
  const val = (process.env.PGSSL || '').toLowerCase();
  if (val === 'true' || val === '1' || val === 'require') {
    return { rejectUnauthorized: false };
  }
  if (val === 'disable' || val === 'false' || val === '0') {
    return false;
  }
  return undefined; // Let pg decide or default
};

/**
 * Retrieves the singleton PostgreSQL pool instance.
 * Initializes it if it doesn't exist.
 * @throws {Error} If database configuration is missing.
 * @returns {Pool} The pg Pool instance.
 */
const getPool = () => {
  if (pool) return pool;
  if (!hasDatabaseConfig()) {
    logger.warn('Database configuration is missing. Set DATABASE_URL or PG* env vars.');
    throw new Error('Database configuration is missing.');
  }

  const config = process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL, ssl: sslSetting() }
    : {
        host: process.env.PGHOST,
        port: Number(process.env.PGPORT || 5432),
        user: process.env.PGUSER,
        password: process.env.PGPASSWORD,
        database: process.env.PGDATABASE,
        ssl: sslSetting(),
      };

  pool = new Pool(config);
  
  pool.on('error', (err) => {
    logger.error('Unexpected error on idle client', err);
    process.exit(-1);
  });

  logger.info('Database pool initialized');
  return pool;
};

module.exports = {
  getPool,
  hasDatabaseConfig,
};
