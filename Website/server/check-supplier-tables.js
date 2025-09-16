const pool = require('./config/db');

async function checkTables() {
  try {
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name LIKE '%supplier%' 
      ORDER BY table_name
    `);
    
    console.log('Supplier-related tables:');
    result.rows.forEach(row => console.log('- ' + row.table_name));
    
    // Check if supplier_orders table exists
    const ordersResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'supplier_orders'
    `);
    
    if (ordersResult.rows.length === 0) {
      console.log('\n❌ supplier_orders table does not exist');
    } else {
      console.log('\n✅ supplier_orders table exists');
    }
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

checkTables();
