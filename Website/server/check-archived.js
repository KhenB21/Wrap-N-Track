const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
});

async function checkArchivedProducts() {
  try {
    console.log('Testing database connection...');
    const result = await pool.query('SELECT COUNT(*) as total FROM inventory_items');
    console.log('Total inventory items:', result.rows[0].total);

    const archivedResult = await pool.query('SELECT COUNT(*) as archived FROM inventory_items WHERE is_active = false');
    console.log('Archived items:', archivedResult.rows[0].archived);

    if (archivedResult.rows[0].archived > 0) {
      const sample = await pool.query('SELECT sku, name, is_active FROM inventory_items WHERE is_active = false LIMIT 3');
      console.log('Sample archived products:');
      sample.rows.forEach(p => console.log(' -', p.sku, ':', p.name));
    } else {
      console.log('No archived products found.');
      console.log('');
      console.log('To archive products in your app:');
      console.log('1. Go to the Inventory page');
      console.log('2. Find products you want to archive');
      console.log('3. Click the Archive/Delete button (trash icon)');
      console.log('4. Products will be marked as archived (is_active = false)');
      console.log('5. They will appear in the Archive Products page');
    }
  } catch (error) {
    console.error('Database error:', error.message);
    console.log('Make sure your database is running and .env.local has correct credentials');
  } finally {
    await pool.end();
  }
}

checkArchivedProducts();
