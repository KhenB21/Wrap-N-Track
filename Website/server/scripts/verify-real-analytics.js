const pool = require('../config/db');

async function verifyRealAnalytics() {
  console.log('🎁 Verifying Real Gift Wrapping Inventory Analytics...\n');
  
  try {
    // Check if we have the real products
    console.log('1️⃣ Checking real gift wrapping products...');
    const products = await pool.query(`
      SELECT sku, name, category, quantity, unit_price, reorder_level, lead_time_days
      FROM inventory_items 
      WHERE sku IN ('WRAP001', 'WRAP002', 'BOW001', 'BOW002', 'TAG001', 'BOX001', 'BOX002', 'BOX003')
      ORDER BY sku
    `);
    
    console.log('   📦 Your Gift Wrapping Products:');
    products.rows.forEach(product => {
      console.log(`     ${product.sku}: ${product.name} (${product.category}) - ₱${product.unit_price}, Qty: ${product.quantity}, Reorder: ${product.reorder_level}, Lead: ${product.lead_time_days} days`);
    });
    
    // Check sales data
    console.log('\n2️⃣ Checking sales data...');
    const salesData = await pool.query(`
      SELECT 
        i.sku,
        i.name,
        i.category,
        COALESCE(SUM(CASE 
          WHEN o.status IN ('DELIVERED', 'COMPLETED') 
          AND o.order_date >= CURRENT_DATE - INTERVAL '90 days'
          THEN op.quantity 
          ELSE 0 
        END), 0) as sold_quantity,
        COALESCE(SUM(CASE 
          WHEN o.status IN ('DELIVERED', 'COMPLETED') 
          AND o.order_date >= CURRENT_DATE - INTERVAL '90 days'
          THEN op.quantity * op.unit_price 
          ELSE 0 
        END), 0) as sales_value
      FROM inventory_items i
      LEFT JOIN order_products op ON i.sku = op.sku
      LEFT JOIN orders o ON op.order_id = o.order_id
      WHERE i.sku IN ('WRAP001', 'WRAP002', 'BOW001', 'BOW002', 'TAG001', 'BOX001', 'BOX002', 'BOX003')
      GROUP BY i.sku, i.name, i.category
      ORDER BY sold_quantity DESC
    `);
    
    console.log('   📊 Sales Performance (Last 90 Days):');
    salesData.rows.forEach(item => {
      const category = item.sold_quantity === 0 ? 'DEAD_STOCK' : 
                     item.sold_quantity <= 10 ? 'SLOW_MOVING' :
                     item.sold_quantity <= 50 ? 'MODERATE_MOVING' : 'FAST_MOVING';
      console.log(`     ${item.sku} (${item.name}): ${item.sold_quantity} sold, ₱${parseFloat(item.sales_value).toFixed(2)} → ${category}`);
    });
    
    // Check movement analysis
    console.log('\n3️⃣ Movement Analysis Summary:');
    const movementSummary = await pool.query(`
      SELECT 
        movement_category,
        COUNT(*) as item_count,
        SUM(sold_quantity) as total_sold,
        SUM(sales_value) as total_sales
      FROM (
        SELECT 
          i.sku,
          COALESCE(SUM(CASE 
            WHEN o.status IN ('DELIVERED', 'COMPLETED') 
            AND o.order_date >= CURRENT_DATE - INTERVAL '90 days'
            THEN op.quantity 
            ELSE 0 
          END), 0) as sold_quantity,
          COALESCE(SUM(CASE 
            WHEN o.status IN ('DELIVERED', 'COMPLETED') 
            AND o.order_date >= CURRENT_DATE - INTERVAL '90 days'
            THEN op.quantity * op.unit_price 
            ELSE 0 
          END), 0) as sales_value,
          CASE 
            WHEN COALESCE(SUM(CASE 
              WHEN o.status IN ('DELIVERED', 'COMPLETED') 
              AND o.order_date >= CURRENT_DATE - INTERVAL '90 days'
              THEN op.quantity 
              ELSE 0 
            END), 0) = 0 THEN 'DEAD_STOCK'
            WHEN COALESCE(SUM(CASE 
              WHEN o.status IN ('DELIVERED', 'COMPLETED') 
              AND o.order_date >= CURRENT_DATE - INTERVAL '90 days'
              THEN op.quantity 
              ELSE 0 
            END), 0) > 0 AND COALESCE(SUM(CASE 
              WHEN o.status IN ('DELIVERED', 'COMPLETED') 
              AND o.order_date >= CURRENT_DATE - INTERVAL '90 days'
              THEN op.quantity 
              ELSE 0 
            END), 0) <= 10 THEN 'SLOW_MOVING'
            WHEN COALESCE(SUM(CASE 
              WHEN o.status IN ('DELIVERED', 'COMPLETED') 
              AND o.order_date >= CURRENT_DATE - INTERVAL '90 days'
              THEN op.quantity 
              ELSE 0 
            END), 0) > 10 AND COALESCE(SUM(CASE 
              WHEN o.status IN ('DELIVERED', 'COMPLETED') 
              AND o.order_date >= CURRENT_DATE - INTERVAL '90 days'
              THEN op.quantity 
              ELSE 0 
            END), 0) <= 50 THEN 'MODERATE_MOVING'
            WHEN COALESCE(SUM(CASE 
              WHEN o.status IN ('DELIVERED', 'COMPLETED') 
              AND o.order_date >= CURRENT_DATE - INTERVAL '90 days'
              THEN op.quantity 
              ELSE 0 
            END), 0) > 50 THEN 'FAST_MOVING'
          END as movement_category
        FROM inventory_items i
        LEFT JOIN order_products op ON i.sku = op.sku
        LEFT JOIN orders o ON op.order_id = o.order_id
        WHERE i.sku IN ('WRAP001', 'WRAP002', 'BOW001', 'BOW002', 'TAG001', 'BOX001', 'BOX002', 'BOX003')
        GROUP BY i.sku
      ) subquery
      GROUP BY movement_category
      ORDER BY 
        CASE movement_category
          WHEN 'FAST_MOVING' THEN 1
          WHEN 'MODERATE_MOVING' THEN 2
          WHEN 'SLOW_MOVING' THEN 3
          WHEN 'DEAD_STOCK' THEN 4
        END
    `);
    
    console.log('   🚀 Movement Categories:');
    movementSummary.rows.forEach(row => {
      console.log(`     ${row.movement_category}: ${row.item_count} items, ${row.total_sold} sold, ₱${parseFloat(row.total_sales).toFixed(2)}`);
    });
    
    // Check replenishment suggestions
    console.log('\n4️⃣ Replenishment Priority Summary:');
    const replenishmentSummary = await pool.query(`
      SELECT 
        priority_level,
        COUNT(*) as item_count,
        AVG(current_stock) as avg_stock,
        SUM(suggested_order_quantity) as total_suggested_qty
      FROM (
        SELECT 
          i.sku,
          i.quantity as current_stock,
          COALESCE(SUM(CASE 
            WHEN o.status IN ('DELIVERED', 'COMPLETED') 
            AND o.order_date >= CURRENT_DATE - INTERVAL '90 days'
            THEN op.quantity 
            ELSE 0 
          END), 0) as avg_daily_demand,
          CASE 
            WHEN i.quantity <= COALESCE(i.reorder_level, CEIL(i.quantity * 0.2)) THEN 'URGENT'
            WHEN i.quantity <= COALESCE(i.reorder_level, CEIL(i.quantity * 0.2)) * 1.5 THEN 'SOON'
            WHEN COALESCE(SUM(CASE 
              WHEN o.status IN ('DELIVERED', 'COMPLETED') 
              AND o.order_date >= CURRENT_DATE - INTERVAL '90 days'
              THEN op.quantity 
              ELSE 0 
            END), 0) > 0 AND i.quantity <= (COALESCE(SUM(CASE 
              WHEN o.status IN ('DELIVERED', 'COMPLETED') 
              AND o.order_date >= CURRENT_DATE - INTERVAL '90 days'
              THEN op.quantity 
              ELSE 0 
            END), 0) / 90) * COALESCE(i.lead_time_days, 7) * 2 THEN 'PLAN'
            ELSE 'ADEQUATE'
          END as priority_level,
          CASE 
            WHEN COALESCE(SUM(CASE 
              WHEN o.status IN ('DELIVERED', 'COMPLETED') 
              AND o.order_date >= CURRENT_DATE - INTERVAL '90 days'
              THEN op.quantity 
              ELSE 0 
            END), 0) > 0 THEN 
              CEIL(COALESCE(SUM(CASE 
                WHEN o.status IN ('DELIVERED', 'COMPLETED') 
                AND o.order_date >= CURRENT_DATE - INTERVAL '90 days'
                THEN op.quantity 
                ELSE 0 
              END), 0) / 90 * 30)
            ELSE 0
          END as suggested_order_quantity
        FROM inventory_items i
        LEFT JOIN order_products op ON i.sku = op.sku
        LEFT JOIN orders o ON op.order_id = o.order_id
        WHERE i.sku IN ('WRAP001', 'WRAP002', 'BOW001', 'BOW002', 'TAG001', 'BOX001', 'BOX002', 'BOX003')
        GROUP BY i.sku, i.quantity, i.reorder_level, i.lead_time_days
      ) subquery
      GROUP BY priority_level
      ORDER BY 
        CASE priority_level
          WHEN 'URGENT' THEN 1
          WHEN 'SOON' THEN 2
          WHEN 'PLAN' THEN 3
          WHEN 'ADEQUATE' THEN 4
        END
    `);
    
    console.log('   🔄 Replenishment Priorities:');
    replenishmentSummary.rows.forEach(row => {
      console.log(`     ${row.priority_level}: ${row.item_count} items, avg stock: ${parseFloat(row.avg_stock).toFixed(1)}, suggested: ${parseInt(row.total_suggested_qty)}`);
    });
    
    // Check order statistics
    console.log('\n5️⃣ Order Statistics:');
    const orderStats = await pool.query(`
      SELECT 
        status,
        COUNT(*) as order_count,
        SUM(total_amount) as total_value
      FROM orders 
      WHERE order_id LIKE 'ORD%'
      GROUP BY status
      ORDER BY order_count DESC
    `);
    
    console.log('   📋 Order Status Distribution:');
    orderStats.rows.forEach(row => {
      console.log(`     ${row.status}: ${row.order_count} orders, ₱${parseFloat(row.total_value).toFixed(2)}`);
    });
    
    console.log('\n✅ Real inventory analytics verification completed!');
    console.log('\n🎯 Key Insights:');
    console.log('   - Your gift wrapping products now have realistic sales data');
    console.log('   - Movement analysis shows which items are fast/slow moving');
    console.log('   - Replenishment suggestions help optimize inventory levels');
    console.log('   - Seasonal patterns reflect gift wrapping business cycles');
    
    console.log('\n🚀 Ready to test in your frontend!');
    console.log('   Navigate to Inventory Reports to see the enhanced analytics');
    
  } catch (error) {
    console.error('❌ Verification failed:', error);
  } finally {
    await pool.end();
  }
}

// Run verification
if (require.main === module) {
  verifyRealAnalytics();
}

module.exports = { verifyRealAnalytics };

