const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' && process.env.DATABASE_URL?.includes('amazonaws')
    ? { rejectUnauthorized: false }
    : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('connect', () => {
  // Silent connect - logged only in dev
  if (process.env.NODE_ENV !== 'production') {
    // console.log('New DB client connected');
  }
});

pool.on('error', (err) => {
  console.error('Unexpected DB client error:', err);
});

const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV !== 'production' && duration > 100) {
      console.warn(`Slow query (${duration}ms):`, text.substring(0, 80));
    }
    return res;
  } catch (err) {
    console.error('DB query error:', err.message, '\nQuery:', text.substring(0, 120));
    throw err;
  }
};

const getClient = () => pool.connect();

module.exports = { pool, query, getClient };
