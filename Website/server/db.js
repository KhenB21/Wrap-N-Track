const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'wrap_n_track',
  password: 'your_password', // Change this to your actual password
  port: 5432,
});

module.exports = pool; 