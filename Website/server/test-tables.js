const pool = require('./config/db');

async function testTables() {
  try {
    console.log('🔍 Testing database tables...');
    
    // Test if suppliers table exists
    const suppliersResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'suppliers'
      );
    `);
    console.log('✅ Suppliers table exists:', suppliersResult.rows[0].exists);
    
    // Test if reorder_level column exists in inventory_items
    const reorderLevelResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'inventory_items' 
        AND column_name = 'reorder_level'
      );
    `);
    console.log('✅ reorder_level column exists:', reorderLevelResult.rows[0].exists);
    
    // Test if supplier_id column exists in inventory_items
    const supplierIdResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'inventory_items' 
        AND column_name = 'supplier_id'
      );
    `);
    console.log('✅ supplier_id column exists:', supplierIdResult.rows[0].exists);
    
    // Test if we can query suppliers
    const suppliersCount = await pool.query('SELECT COUNT(*) FROM suppliers');
    console.log('📊 Number of suppliers:', suppliersCount.rows[0].count);
    
    // Test if we can query inventory_items with new columns
    const inventoryResult = await pool.query(`
      SELECT sku, name, reorder_level, supplier_id 
      FROM inventory_items 
      LIMIT 3
    `);
    console.log('📦 Sample inventory items:', inventoryResult.rows);
    
    console.log('✅ All tests passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    process.exit(0);
  }
}

testTables();
