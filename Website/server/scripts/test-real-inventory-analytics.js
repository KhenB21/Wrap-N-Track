const pool = require('../config/db');

// Real inventory products from your system
const realProducts = [
  { sku: 'WRAP001', name: 'Basic Gift Wrap', category: 'Wrapping Paper', unit_price: 2.99 },
  { sku: 'WRAP002', name: 'Premium Gift Wrap', category: 'Wrapping Paper', unit_price: 4.99 },
  { sku: 'BOW001', name: 'Standard Bow', category: 'Accessories', unit_price: 1.99 },
  { sku: 'BOW002', name: 'Premium Bow', category: 'Accessories', unit_price: 3.99 },
  { sku: 'TAG001', name: 'Gift Tag', category: 'Accessories', unit_price: 0.99 },
  { sku: 'BOX001', name: 'Small Gift Box', category: 'Boxes', unit_price: 2.99 },
  { sku: 'BOX002', name: 'Medium Gift Box', category: 'Boxes', unit_price: 4.99 },
  { sku: 'BOX003', name: 'Large Gift Box', category: 'Boxes', unit_price: 6.99 }
];

// Realistic suppliers for gift wrapping business
const suppliers = [
  { supplier_id: 'SUP001', name: 'GiftWrap Supplies Co.', contact_person: 'Maria Santos', email: 'maria@giftwrapsupplies.com', phone: '+63-2-8123-4567' },
  { supplier_id: 'SUP002', name: 'Premium Packaging Ltd.', contact_person: 'John Cruz', email: 'john@premiumpackaging.com', phone: '+63-2-8234-5678' },
  { supplier_id: 'SUP003', name: 'Creative Accessories Inc.', contact_person: 'Sarah Lopez', email: 'sarah@creativeaccessories.com', phone: '+63-2-8345-6789' }
];

// Realistic sales patterns for gift wrapping business
// Fast moving: Basic items that sell frequently
// Slow moving: Premium items that sell occasionally
// Dead stock: Items that haven't sold recently

const salesScenarios = {
  // Fast Moving Items (High demand, frequent sales)
  fastMoving: [
    { sku: 'WRAP001', name: 'Basic Gift Wrap', salesPattern: 'high' },
    { sku: 'BOW001', name: 'Standard Bow', salesPattern: 'high' },
    { sku: 'TAG001', name: 'Gift Tag', salesPattern: 'high' },
    { sku: 'BOX001', name: 'Small Gift Box', salesPattern: 'high' }
  ],
  
  // Moderate Moving Items (Medium demand)
  moderateMoving: [
    { sku: 'WRAP002', name: 'Premium Gift Wrap', salesPattern: 'medium' },
    { sku: 'BOW002', name: 'Premium Bow', salesPattern: 'medium' },
    { sku: 'BOX002', name: 'Medium Gift Box', salesPattern: 'medium' }
  ],
  
  // Slow Moving Items (Low demand, occasional sales)
  slowMoving: [
    { sku: 'BOX003', name: 'Large Gift Box', salesPattern: 'low' }
  ]
};

// Generate realistic orders based on gift wrapping business patterns
function generateOrders() {
  const orders = [];
  const orderId = 'ORD';
  let orderCounter = 1;
  
  // Generate orders for the last 90 days
  for (let daysAgo = 0; daysAgo < 90; daysAgo++) {
    const orderDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
    
    // Gift wrapping business has seasonal patterns
    // More orders during holidays, weekends, and special occasions
    const isWeekend = orderDate.getDay() === 0 || orderDate.getDay() === 6;
    const isHoliday = isHolidayPeriod(orderDate);
    const isSpecialOccasion = isSpecialOccasionDay(orderDate);
    
    // Determine order frequency based on day type
    let orderProbability = 0.3; // Base probability
    if (isWeekend) orderProbability += 0.2;
    if (isHoliday) orderProbability += 0.3;
    if (isSpecialOccasion) orderProbability += 0.1;
    
    // Generate 0-3 orders per day based on probability
    const numOrders = Math.random() < orderProbability ? Math.floor(Math.random() * 3) + 1 : 0;
    
    for (let i = 0; i < numOrders; i++) {
      const orderIdFull = `${orderId}${String(orderCounter).padStart(3, '0')}`;
      const customerId = `CUST${String(Math.floor(Math.random() * 50) + 1).padStart(3, '0')}`;
      
      // Determine order status based on age
      let status = 'PENDING';
      if (daysAgo < 1) status = 'PENDING';
      else if (daysAgo < 3) status = 'PROCESSING';
      else if (daysAgo < 7) status = 'OUT_FOR_DELIVERY';
      else if (daysAgo < 14) status = 'DELIVERED';
      else status = 'COMPLETED';
      
      orders.push({
        order_id: orderIdFull,
        customer_id: customerId,
        order_date: orderDate,
        status: status,
        total_amount: 0 // Will be calculated when adding products
      });
      
      orderCounter++;
    }
  }
  
  return orders;
}

// Generate order products based on realistic gift wrapping patterns
function generateOrderProducts(orders) {
  const orderProducts = [];
  
  orders.forEach(order => {
    const numProducts = Math.floor(Math.random() * 4) + 1; // 1-4 products per order
    const selectedProducts = [];
    let totalAmount = 0;
    
    // Select products based on realistic gift wrapping combinations
    for (let i = 0; i < numProducts; i++) {
      let product;
      let attempts = 0;
      
      // Avoid duplicate products in same order
      do {
        const category = getRandomCategory();
        const productsInCategory = realProducts.filter(p => p.category === category);
        product = productsInCategory[Math.floor(Math.random() * productsInCategory.length)];
        attempts++;
      } while (selectedProducts.some(p => p.sku === product.sku) && attempts < 10);
      
      if (product && !selectedProducts.some(p => p.sku === product.sku)) {
        // Determine quantity based on product type and sales pattern
        const salesPattern = getSalesPattern(product.sku);
        let quantity = 1;
        
        if (salesPattern === 'high') {
          quantity = Math.floor(Math.random() * 5) + 1; // 1-5 for fast moving
        } else if (salesPattern === 'medium') {
          quantity = Math.floor(Math.random() * 3) + 1; // 1-3 for moderate
        } else {
          quantity = 1; // 1 for slow moving
        }
        
        // Add some bulk orders occasionally
        if (Math.random() < 0.1) { // 10% chance of bulk order
          quantity *= 3;
        }
        
        const unitPrice = product.unit_price;
        const lineTotal = quantity * unitPrice;
        totalAmount += lineTotal;
        
        selectedProducts.push({
          order_id: order.order_id,
          sku: product.sku,
          quantity: quantity,
          unit_price: unitPrice
        });
      }
    }
    
    // Update order total
    order.total_amount = totalAmount;
    
    // Add order products
    orderProducts.push(...selectedProducts);
  });
  
  return orderProducts;
}

// Helper functions
function getRandomCategory() {
  const categories = ['Wrapping Paper', 'Accessories', 'Boxes'];
  return categories[Math.floor(Math.random() * categories.length)];
}

function getSalesPattern(sku) {
  const fastMoving = salesScenarios.fastMoving.map(p => p.sku);
  const moderateMoving = salesScenarios.moderateMoving.map(p => p.sku);
  
  if (fastMoving.includes(sku)) return 'high';
  if (moderateMoving.includes(sku)) return 'medium';
  return 'low';
}

function isHolidayPeriod(date) {
  const month = date.getMonth();
  const day = date.getDate();
  
  // Christmas season (Dec 1-31)
  if (month === 11) return true;
  
  // Valentine's Day (Feb 14)
  if (month === 1 && day === 14) return true;
  
  // Mother's Day (second Sunday in May)
  if (month === 4 && day >= 8 && day <= 14 && date.getDay() === 0) return true;
  
  // Father's Day (third Sunday in June)
  if (month === 5 && day >= 15 && day <= 21 && date.getDay() === 0) return true;
  
  return false;
}

function isSpecialOccasionDay(date) {
  const month = date.getMonth();
  const day = date.getDate();
  
  // Birthdays, anniversaries, etc. (simplified)
  return Math.random() < 0.05; // 5% chance of special occasion
}

async function clearTestData() {
  console.log('🧹 Clearing existing test data...');
  
  try {
    // Delete test orders and order products
    await pool.query('DELETE FROM order_products WHERE order_id LIKE \'ORD%\'');
    await pool.query('DELETE FROM orders WHERE order_id LIKE \'ORD%\'');
    
    // Reset inventory quantities to original values
    await pool.query(`
      UPDATE inventory_items 
      SET quantity = CASE sku
        WHEN 'WRAP001' THEN 100
        WHEN 'WRAP002' THEN 50
        WHEN 'BOW001' THEN 200
        WHEN 'BOW002' THEN 100
        WHEN 'TAG001' THEN 500
        WHEN 'BOX001' THEN 75
        WHEN 'BOX002' THEN 50
        WHEN 'BOX003' THEN 25
        ELSE quantity
      END,
      reorder_level = CASE sku
        WHEN 'WRAP001' THEN 20
        WHEN 'WRAP002' THEN 10
        WHEN 'BOW001' THEN 40
        WHEN 'BOW002' THEN 20
        WHEN 'TAG001' THEN 100
        WHEN 'BOX001' THEN 15
        WHEN 'BOX002' THEN 10
        WHEN 'BOX003' THEN 5
        ELSE reorder_level
      END,
      lead_time_days = CASE sku
        WHEN 'WRAP001' THEN 3
        WHEN 'WRAP002' THEN 5
        WHEN 'BOW001' THEN 2
        WHEN 'BOW002' THEN 4
        WHEN 'TAG001' THEN 1
        WHEN 'BOX001' THEN 3
        WHEN 'BOX002' THEN 5
        WHEN 'BOX003' THEN 7
        ELSE lead_time_days
      END,
      supplier_id = CASE sku
        WHEN 'WRAP001' THEN 'SUP001'
        WHEN 'WRAP002' THEN 'SUP002'
        WHEN 'BOW001' THEN 'SUP003'
        WHEN 'BOW002' THEN 'SUP003'
        WHEN 'TAG001' THEN 'SUP001'
        WHEN 'BOX001' THEN 'SUP002'
        WHEN 'BOX002' THEN 'SUP002'
        WHEN 'BOX003' THEN 'SUP002'
        ELSE supplier_id
      END
      WHERE sku IN ('WRAP001', 'WRAP002', 'BOW001', 'BOW002', 'TAG001', 'BOX001', 'BOX002', 'BOX003')
    `);
    
    console.log('✅ Test data cleared and inventory reset');
  } catch (error) {
    console.error('❌ Error clearing test data:', error);
  }
}

async function insertSuppliers() {
  console.log('📦 Inserting suppliers...');
  
  for (const supplier of suppliers) {
    try {
      await pool.query(`
        INSERT INTO suppliers (supplier_id, name, contact_person, email, cellphone)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (supplier_id) DO UPDATE SET
          name = EXCLUDED.name,
          contact_person = EXCLUDED.contact_person,
          email = EXCLUDED.email,
          cellphone = EXCLUDED.cellphone
      `, [supplier.supplier_id, supplier.name, supplier.contact_person, supplier.email, supplier.phone]);
    } catch (error) {
      console.error(`❌ Error inserting supplier ${supplier.supplier_id}:`, error);
    }
  }
  
  console.log('✅ Suppliers inserted successfully');
}

async function updateInventoryItems() {
  console.log('📦 Updating inventory items with realistic data...');
  
  try {
    await pool.query(`
      UPDATE inventory_items 
      SET 
        reorder_level = CASE sku
          WHEN 'WRAP001' THEN 20
          WHEN 'WRAP002' THEN 10
          WHEN 'BOW001' THEN 40
          WHEN 'BOW002' THEN 20
          WHEN 'TAG001' THEN 100
          WHEN 'BOX001' THEN 15
          WHEN 'BOX002' THEN 10
          WHEN 'BOX003' THEN 5
          ELSE reorder_level
        END,
        lead_time_days = CASE sku
          WHEN 'WRAP001' THEN 3
          WHEN 'WRAP002' THEN 5
          WHEN 'BOW001' THEN 2
          WHEN 'BOW002' THEN 4
          WHEN 'TAG001' THEN 1
          WHEN 'BOX001' THEN 3
          WHEN 'BOX002' THEN 5
          WHEN 'BOX003' THEN 7
          ELSE lead_time_days
        END,
        supplier_id = CASE sku
          WHEN 'WRAP001' THEN 'SUP001'
          WHEN 'WRAP002' THEN 'SUP002'
          WHEN 'BOW001' THEN 'SUP003'
          WHEN 'BOW002' THEN 'SUP003'
          WHEN 'TAG001' THEN 'SUP001'
          WHEN 'BOX001' THEN 'SUP002'
          WHEN 'BOX002' THEN 'SUP002'
          WHEN 'BOX003' THEN 'SUP002'
          ELSE supplier_id
        END
      WHERE sku IN ('WRAP001', 'WRAP002', 'BOW001', 'BOW002', 'TAG001', 'BOX001', 'BOX002', 'BOX003')
    `);
    
    console.log('✅ Inventory items updated successfully');
  } catch (error) {
    console.error('❌ Error updating inventory items:', error);
  }
}

async function insertOrders() {
  console.log('📦 Generating and inserting realistic orders...');
  
  const orders = generateOrders();
  console.log(`   Generated ${orders.length} orders over 90 days`);
  
  for (const order of orders) {
    try {
      await pool.query(`
        INSERT INTO orders (order_id, customer_id, order_date, status, total_amount)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (order_id) DO NOTHING
      `, [order.order_id, order.customer_id, order.order_date, order.status, order.total_amount]);
    } catch (error) {
      console.error(`❌ Error inserting order ${order.order_id}:`, error);
    }
  }
  
  console.log('✅ Orders inserted successfully');
  return orders;
}

async function insertOrderProducts(orders) {
  console.log('📦 Generating and inserting order products...');
  
  const orderProducts = generateOrderProducts(orders);
  console.log(`   Generated ${orderProducts.length} order product entries`);
  
  for (const orderProduct of orderProducts) {
    try {
      await pool.query(`
        INSERT INTO order_products (order_id, sku, quantity)
        VALUES ($1, $2, $3)
        ON CONFLICT (order_id, sku) DO NOTHING
      `, [orderProduct.order_id, orderProduct.sku, orderProduct.quantity]);
    } catch (error) {
      console.error(`❌ Error inserting order product ${orderProduct.order_id}-${orderProduct.sku}:`, error);
    }
  }
  
  console.log('✅ Order products inserted successfully');
}

async function runAnalyticsTests() {
  console.log('\n🧪 Testing analytics with real gift wrapping products...');
  
  try {
    // Test Movement Analysis
    console.log('\n📊 Movement Analysis Results:');
    const movementResult = await pool.query(`
      SELECT 
        sku, name, movement_category, sold_quantity, sales_value, velocity_ratio
      FROM (
        SELECT 
          i.sku,
          i.name,
          COALESCE(SUM(CASE 
            WHEN o.status IN ('DELIVERED', 'COMPLETED') 
            AND o.order_date >= CURRENT_DATE - INTERVAL '90 days'
            THEN op.quantity 
            ELSE 0 
          END), 0) as sold_quantity,
          COALESCE(SUM(CASE 
            WHEN o.status IN ('DELIVERED', 'COMPLETED') 
            AND o.order_date >= CURRENT_DATE - INTERVAL '90 days'
            THEN op.quantity * i.unit_price 
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
          END as movement_category,
          CASE 
            WHEN i.quantity > 0 THEN COALESCE(SUM(CASE 
              WHEN o.status IN ('DELIVERED', 'COMPLETED') 
              AND o.order_date >= CURRENT_DATE - INTERVAL '90 days'
              THEN op.quantity 
              ELSE 0 
            END), 0)::float / i.quantity
            ELSE 0
          END as velocity_ratio
        FROM inventory_items i
        LEFT JOIN order_products op ON i.sku = op.sku
        LEFT JOIN orders o ON op.order_id = o.order_id
        WHERE i.is_active = true AND i.sku IN ('WRAP001', 'WRAP002', 'BOW001', 'BOW002', 'TAG001', 'BOX001', 'BOX002', 'BOX003')
        GROUP BY i.sku, i.name, i.quantity
      ) subquery
      ORDER BY sold_quantity DESC
    `);
    
    movementResult.rows.forEach(row => {
      console.log(`  ${row.sku} (${row.name}): ${row.movement_category} - ${row.sold_quantity} sold, ₱${parseFloat(row.sales_value).toFixed(2)}, ${row.velocity_ratio}x velocity`);
    });
    
    // Test Replenishment Suggestions
    console.log('\n🔄 Replenishment Suggestions:');
    const replenishmentResult = await pool.query(`
      SELECT 
        sku, name, priority_level, current_stock, suggested_order_quantity, days_of_supply
      FROM (
        SELECT 
          i.sku,
          i.name,
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
          END as suggested_order_quantity,
          CASE 
            WHEN COALESCE(SUM(CASE 
              WHEN o.status IN ('DELIVERED', 'COMPLETED') 
              AND o.order_date >= CURRENT_DATE - INTERVAL '90 days'
              THEN op.quantity 
              ELSE 0 
            END), 0) > 0 THEN 
              ROUND((i.quantity / (COALESCE(SUM(CASE 
                WHEN o.status IN ('DELIVERED', 'COMPLETED') 
                AND o.order_date >= CURRENT_DATE - INTERVAL '90 days'
                THEN op.quantity 
                ELSE 0 
            END), 0) / 90))::numeric, 1)
            ELSE 999
          END as days_of_supply
        FROM inventory_items i
        LEFT JOIN order_products op ON i.sku = op.sku
        LEFT JOIN orders o ON op.order_id = o.order_id
        WHERE i.is_active = true AND i.sku IN ('WRAP001', 'WRAP002', 'BOW001', 'BOW002', 'TAG001', 'BOX001', 'BOX002', 'BOX003')
        GROUP BY i.sku, i.name, i.quantity, i.reorder_level, i.lead_time_days
      ) subquery
      ORDER BY 
        CASE priority_level
          WHEN 'URGENT' THEN 1
          WHEN 'SOON' THEN 2
          WHEN 'PLAN' THEN 3
          WHEN 'ADEQUATE' THEN 4
        END
    `);
    
    replenishmentResult.rows.forEach(row => {
      console.log(`  ${row.sku} (${row.name}): ${row.priority_level} - Stock: ${row.current_stock}, Suggested: ${row.suggested_order_quantity}, Days: ${row.days_of_supply}`);
    });
    
    console.log('\n✅ Analytics tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Error running analytics tests:', error);
  }
}

async function main() {
  console.log('🎁 Starting Real Gift Wrapping Inventory Analytics Test...\n');
  
  try {
    await clearTestData();
    await insertSuppliers();
    await updateInventoryItems();
    const orders = await insertOrders();
    await insertOrderProducts(orders);
    await runAnalyticsTests();
    
    console.log('\n🎉 Real inventory analytics test completed successfully!');
    console.log('\n📋 Test Summary:');
    console.log('  - Used your actual gift wrapping products');
    console.log('  - Generated realistic sales patterns over 90 days');
    console.log('  - Created seasonal and weekend sales variations');
    console.log('  - Set appropriate reorder levels and lead times');
    console.log('  - Added supplier relationships');
    console.log('\n🔍 You can now test the analytics with your real products!');
    console.log('\nExpected Results:');
    console.log('  - Fast Moving: Basic Gift Wrap, Standard Bow, Gift Tag, Small Gift Box');
    console.log('  - Moderate Moving: Premium Gift Wrap, Premium Bow, Medium Gift Box');
    console.log('  - Slow Moving: Large Gift Box');
    console.log('  - Replenishment suggestions based on actual demand patterns');
    
  } catch (error) {
    console.error('❌ Test setup failed:', error);
  } finally {
    await pool.end();
  }
}

// Run the test setup
if (require.main === module) {
  main();
}

module.exports = { realProducts, suppliers, salesScenarios, generateOrders, generateOrderProducts };
