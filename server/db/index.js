const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from the parent backend folder .env file
dotenv.config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle database client:', err);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
