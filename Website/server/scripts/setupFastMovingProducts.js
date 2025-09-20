const pool = require('../config/db');

async function setupFastMovingProducts() {
  try {
    console.log('🔄 Setting up fast-moving products for testing...');
    
    // Set some products as fast-moving with high sales count
    const result = await pool.query(`
      UPDATE inventory_items 
      SET fast_moving = true, 
          sales_count_30_days = 75,
          last_sales_update = NOW()
      WHERE sku IN (
        SELECT sku FROM inventory_items 
        WHERE is_active = true 
        ORDER BY RANDOM() 
        LIMIT 3
      )
      RETURNING sku, name, fast_moving, sales_count_30_days
    `);
    
    console.log(`✅ Set ${result.rows.length} products as fast-moving:`);
    result.rows.forEach(product => {
      console.log(`  - ${product.name} (${product.sku}): ${product.sales_count_30_days} sales in 30 days`);
    });
    
    // Show current fast-moving products
    const fastMovingProducts = await pool.query(`
      SELECT sku, name, quantity, fast_moving, sales_count_30_days
      FROM inventory_items 
      WHERE fast_moving = true AND is_active = true
    `);
    
    console.log(`\n📊 Current fast-moving products (${fastMovingProducts.rows.length} total):`);
    fastMovingProducts.rows.forEach(product => {
      console.log(`  - ${product.name} (${product.sku}): ${product.quantity} units, ${product.sales_count_30_days} sales`);
    });
    
  } catch (error) {
    console.error('❌ Error setting up fast-moving products:', error);
  } finally {
    await pool.end();
  }
}

setupFastMovingProducts();
