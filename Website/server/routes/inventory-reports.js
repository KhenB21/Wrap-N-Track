
const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// GET /api/inventory-reports/summary - Get inventory summary data
router.get('/summary', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_skus,
        SUM(quantity * unit_price) as total_value,
        AVG(quantity * unit_price) as avg_item_value,
        COUNT(CASE WHEN quantity <= COALESCE(reorder_level, CEIL(quantity * 0.2)) THEN 1 END) as low_stock_count,
        COUNT(CASE WHEN expiration_date IS NOT NULL AND expiration_date <= CURRENT_DATE + INTERVAL '30 days' THEN 1 END) as expiring_count
      FROM inventory_items 
      WHERE is_active = true
    `);
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching inventory summary:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch inventory summary' 
    });
  }
});

// GET /api/inventory-reports/category-breakdown - Get category breakdown
router.get('/category-breakdown', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COALESCE(category, 'Uncategorized') as category,
        COUNT(*) as item_count,
        SUM(quantity * unit_price) as total_value,
        AVG(quantity * unit_price) as avg_value_per_item,
        SUM(quantity) as total_quantity
      FROM inventory_items 
      WHERE is_active = true
      GROUP BY COALESCE(category, 'Uncategorized')
      ORDER BY total_value DESC
    `);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching category breakdown:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch category breakdown' 
    });
  }
});

// GET /api/inventory-reports/low-stock - Get low stock items
router.get('/low-stock', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        sku,
        name,
        category,
        quantity,
        unit_price,
        reorder_level,
        COALESCE(reorder_level, CEIL(quantity * 0.2)) as calculated_reorder_level,
        (quantity * unit_price) as total_value,
        last_updated
      FROM inventory_items 
      WHERE is_active = true 
        AND quantity <= COALESCE(reorder_level, CEIL(quantity * 0.2))
      ORDER BY (quantity - COALESCE(reorder_level, CEIL(quantity * 0.2))) ASC
    `);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching low stock items:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch low stock items' 
    });
  }
});

// GET /api/inventory-reports/expiring - Get expiring items
router.get('/expiring', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    
    const result = await pool.query(`
      SELECT 
        sku,
        name,
        category,
        quantity,
        unit_price,
        expiration_date,
        (quantity * unit_price) as total_value,
        (expiration_date - CURRENT_DATE) as days_until_expiration
      FROM inventory_items 
      WHERE is_active = true 
        AND expiration_date IS NOT NULL 
        AND expiration_date <= CURRENT_DATE + INTERVAL '${parseInt(days)} days'
      ORDER BY expiration_date ASC
    `);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching expiring items:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch expiring items' 
    });
  }
});

// GET /api/inventory-reports/movement - Get inventory movement data
router.get('/movement', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const dateFilter = startDate && endDate 
      ? `AND o.order_date BETWEEN '${startDate}' AND '${endDate}'`
      : '';
    
    const result = await pool.query(`
      SELECT 
        i.sku,
        i.name,
        i.category,
        i.quantity as current_stock,
        COALESCE(SUM(CASE 
          WHEN o.status NOT IN ('Order Received', 'Completed', 'Cancelled') 
          THEN op.quantity 
          ELSE 0 
        END), 0) as ordered_quantity,
        COALESCE(SUM(CASE 
          WHEN o.status IN ('Order Received', 'Completed') 
          THEN op.quantity 
          ELSE 0 
        END), 0) as delivered_quantity,
        COALESCE(SUM(CASE 
          WHEN o.status IN ('Order Received', 'Completed') 
          THEN op.quantity * i.unit_price 
          ELSE 0 
        END), 0) as sales_value
      FROM inventory_items i
      LEFT JOIN order_products op ON i.sku = op.sku
      LEFT JOIN orders o ON op.order_id = o.order_id ${dateFilter}
      WHERE i.is_active = true
      GROUP BY i.sku, i.name, i.category, i.quantity
      ORDER BY sales_value DESC
    `);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching inventory movement:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch inventory movement' 
    });
  }
});

// GET /api/inventory-reports/abc-analysis - Get ABC analysis
router.get('/abc-analysis', async (req, res) => {
  try {
    const result = await pool.query(`
      WITH item_values AS (
        SELECT 
          sku,
          name,
          category,
          quantity,
          unit_price,
          (quantity * unit_price) as total_value,
          ROW_NUMBER() OVER (ORDER BY (quantity * unit_price) DESC) as rank,
          COUNT(*) OVER () as total_items
        FROM inventory_items 
        WHERE is_active = true
      ),
      cumulative_values AS (
        SELECT 
          *,
          SUM(total_value) OVER (ORDER BY total_value DESC) as cumulative_value,
          (SUM(total_value) OVER (ORDER BY total_value DESC)) / (SUM(total_value) OVER ()) as cumulative_percentage
        FROM item_values
      )
      SELECT 
        sku,
        name,
        category,
        quantity,
        unit_price,
        total_value,
        rank,
        cumulative_percentage,
        CASE 
          WHEN cumulative_percentage <= 0.8 THEN 'A'
          WHEN cumulative_percentage <= 0.95 THEN 'B'
          ELSE 'C'
        END as abc_category
      FROM cumulative_values
      ORDER BY total_value DESC
    `);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching ABC analysis:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch ABC analysis' 
    });
  }
});

// GET /api/inventory-reports/turnover - Get inventory turnover analysis
router.get('/turnover', async (req, res) => {
  try {
    const { months = 12 } = req.query;
    
    const result = await pool.query(`
      WITH monthly_sales AS (
        SELECT 
          DATE_TRUNC('month', o.order_date) as month,
          SUM(op.quantity * i.unit_price) as monthly_sales
        FROM orders o
        JOIN order_products op ON o.order_id = op.order_id
        WHERE o.status IN ('Order Received', 'Completed')
          AND o.order_date >= CURRENT_DATE - INTERVAL '${parseInt(months)} months'
        GROUP BY DATE_TRUNC('month', o.order_date)
      ),
      avg_inventory AS (
        SELECT AVG(quantity * unit_price) as avg_inventory_value
        FROM inventory_items 
        WHERE is_active = true
      )
      SELECT 
        ms.month,
        ms.monthly_sales,
        ai.avg_inventory_value,
        CASE 
          WHEN ai.avg_inventory_value > 0 
          THEN ms.monthly_sales / ai.avg_inventory_value 
          ELSE 0 
        END as turnover_ratio
      FROM monthly_sales ms
      CROSS JOIN avg_inventory ai
      ORDER BY ms.month DESC
    `);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching turnover analysis:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch turnover analysis' 
    });
  }
});

// GET /api/inventory-reports/supplier-performance - Get supplier performance
router.get('/supplier-performance', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        s.supplier_id,
        s.name as supplier_name,
        COUNT(i.sku) as item_count,
        SUM(i.quantity * i.unit_price) as total_value,
        AVG(i.quantity * i.unit_price) as avg_item_value,
        AVG(i.lead_time_days) as avg_lead_time,
        COUNT(CASE WHEN i.quantity <= COALESCE(i.reorder_level, CEIL(i.quantity * 0.2)) THEN 1 END) as low_stock_items
      FROM suppliers s
      LEFT JOIN inventory_items i ON s.supplier_id = i.supplier_id AND i.is_active = true
      GROUP BY s.supplier_id, s.name
      HAVING COUNT(i.sku) > 0
      ORDER BY total_value DESC
    `);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching supplier performance:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch supplier performance' 
    });
  }
});

// GET /api/inventory-reports/movement-analysis - Get fast/slow moving items analysis
router.get('/movement-analysis', async (req, res) => {
  try {
    const { days = 90 } = req.query;
    
    const result = await pool.query(`
      WITH sales_analysis AS (
        SELECT 
          i.sku,
          i.name,
          i.category,
          i.quantity as current_stock,
          i.unit_price,
          i.reorder_level,
          COALESCE(SUM(CASE 
            WHEN o.status IN ('Order Received', 'Completed') 
            AND o.order_date >= CURRENT_DATE - INTERVAL '${parseInt(days)} days'
            THEN op.quantity 
            ELSE 0 
          END), 0) as sold_quantity,
          COALESCE(SUM(CASE 
            WHEN o.status IN ('Order Received', 'Completed') 
            AND o.order_date >= CURRENT_DATE - INTERVAL '${parseInt(days)} days'
            THEN op.quantity * i.unit_price 
            ELSE 0 
          END), 0) as sales_value,
          COUNT(CASE 
            WHEN o.status IN ('Order Received', 'Completed') 
            AND o.order_date >= CURRENT_DATE - INTERVAL '${parseInt(days)} days'
            THEN 1 
          END) as sales_frequency
        FROM inventory_items i
        LEFT JOIN order_products op ON i.sku = op.sku
        LEFT JOIN orders o ON op.order_id = o.order_id
        WHERE i.is_active = true
        GROUP BY i.sku, i.name, i.category, i.quantity, i.unit_price, i.reorder_level
      ),
      movement_classification AS (
        SELECT 
          *,
          CASE 
            WHEN sold_quantity = 0 THEN 'DEAD_STOCK'
            WHEN sold_quantity > 0 AND sold_quantity <= 10 THEN 'SLOW_MOVING'
            WHEN sold_quantity > 10 AND sold_quantity <= 50 THEN 'MODERATE_MOVING'
            WHEN sold_quantity > 50 THEN 'FAST_MOVING'
          END as movement_category,
          CASE 
            WHEN current_stock > 0 THEN sold_quantity::float / current_stock
            ELSE 0
          END as velocity_ratio,
          CASE 
            WHEN sold_quantity > 0 THEN current_stock::float / sold_quantity
            ELSE 999
          END as months_of_stock
        FROM sales_analysis
      )
      SELECT 
        sku,
        name,
        category,
        current_stock,
        unit_price,
        reorder_level,
        sold_quantity,
        sales_value,
        sales_frequency,
        movement_category,
        ROUND(velocity_ratio::numeric, 2) as velocity_ratio,
        ROUND(months_of_stock::numeric, 1) as months_of_stock,
        (current_stock * unit_price) as inventory_value
      FROM movement_classification
      ORDER BY 
        CASE movement_category
          WHEN 'FAST_MOVING' THEN 1
          WHEN 'MODERATE_MOVING' THEN 2
          WHEN 'SLOW_MOVING' THEN 3
          WHEN 'DEAD_STOCK' THEN 4
        END,
        sales_value DESC
    `);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching movement analysis:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch movement analysis' 
    });
  }
});

// GET /api/inventory-reports/replenishment-suggestions - Get AI-powered replenishment suggestions
router.get('/replenishment-suggestions', async (req, res) => {
  try {
    const { days = 90 } = req.query;
    
    const result = await pool.query(`
      WITH demand_forecast AS (
        SELECT 
          i.sku,
          i.name,
          i.category,
          i.quantity as current_stock,
          i.unit_price,
          i.reorder_level,
          i.lead_time_days,
          i.supplier_id,
          s.name as supplier_name,
          COALESCE(SUM(CASE 
            WHEN o.status IN ('Order Received', 'Completed') 
            AND o.order_date >= CURRENT_DATE - INTERVAL '${parseInt(days)} days'
            THEN op.quantity 
            ELSE 0 
          END), 0) as avg_daily_demand,
          COALESCE(AVG(CASE 
            WHEN o.status IN ('Order Received', 'Completed') 
            AND o.order_date >= CURRENT_DATE - INTERVAL '${parseInt(days)} days'
            THEN op.quantity 
          END), 0) as avg_order_quantity,
          COUNT(CASE 
            WHEN o.status IN ('Order Received', 'Completed') 
            AND o.order_date >= CURRENT_DATE - INTERVAL '${parseInt(days)} days'
            THEN 1 
          END) as order_frequency
        FROM inventory_items i
        LEFT JOIN order_products op ON i.sku = op.sku
        LEFT JOIN orders o ON op.order_id = o.order_id
        LEFT JOIN suppliers s ON i.supplier_id = s.supplier_id
        WHERE i.is_active = true
        GROUP BY i.sku, i.name, i.category, i.quantity, i.unit_price, i.reorder_level, i.lead_time_days, i.supplier_id, s.name
      ),
      replenishment_calculations AS (
        SELECT 
          *,
          CASE 
            WHEN avg_daily_demand > 0 THEN avg_daily_demand / ${parseInt(days)}
            ELSE 0
          END as daily_demand_rate,
          CASE 
            WHEN avg_daily_demand > 0 THEN 
              GREATEST(
                CEIL(avg_daily_demand / ${parseInt(days)} * COALESCE(lead_time_days, 7) * 1.5),
                COALESCE(reorder_level, CEIL(current_stock * 0.2))
              )
            ELSE COALESCE(reorder_level, CEIL(current_stock * 0.2))
          END as suggested_reorder_point,
          CASE 
            WHEN avg_daily_demand > 0 THEN 
              CEIL(avg_daily_demand / ${parseInt(days)} * 30) -- 30 days supply
            ELSE 0
          END as suggested_order_quantity,
          CASE 
            WHEN current_stock <= COALESCE(reorder_level, CEIL(current_stock * 0.2)) THEN 'URGENT'
            WHEN current_stock <= COALESCE(reorder_level, CEIL(current_stock * 0.2)) * 1.5 THEN 'SOON'
            WHEN avg_daily_demand > 0 AND current_stock <= (avg_daily_demand / ${parseInt(days)}) * COALESCE(lead_time_days, 7) * 2 THEN 'PLAN'
            ELSE 'ADEQUATE'
          END as priority_level,
          CASE 
            WHEN avg_daily_demand > 0 AND (avg_daily_demand / ${parseInt(days)}) > 0 THEN 
              ROUND((current_stock / (avg_daily_demand / ${parseInt(days)}))::numeric, 1)
            ELSE 999
          END as days_of_supply
        FROM demand_forecast
      )
      SELECT 
        sku,
        name,
        category,
        current_stock,
        unit_price,
        reorder_level,
        lead_time_days,
        supplier_name,
        ROUND(avg_daily_demand::numeric, 2) as avg_daily_demand,
        ROUND(avg_order_quantity::numeric, 2) as avg_order_quantity,
        order_frequency,
        suggested_reorder_point,
        suggested_order_quantity,
        priority_level,
        days_of_supply,
        (current_stock * unit_price) as current_inventory_value,
        (suggested_order_quantity * unit_price) as suggested_order_value
      FROM replenishment_calculations
      ORDER BY 
        CASE priority_level
          WHEN 'URGENT' THEN 1
          WHEN 'SOON' THEN 2
          WHEN 'PLAN' THEN 3
          WHEN 'ADEQUATE' THEN 4
        END,
        suggested_order_value DESC
    `);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching replenishment suggestions:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch replenishment suggestions' 
    });
  }
});

// GET /api/inventory-reports/advanced-analytics - Get comprehensive inventory analytics
router.get('/advanced-analytics', async (req, res) => {
  try {
    const { days = 90 } = req.query;
    
    const result = await pool.query(`
      WITH inventory_metrics AS (
        SELECT 
          i.sku,
          i.name,
          i.category,
          i.quantity as current_stock,
          i.unit_price,
          i.reorder_level,
          i.supplier_id,
          s.name as supplier_name,
          COALESCE(SUM(CASE 
            WHEN o.status IN ('Order Received', 'Completed') 
            AND o.order_date >= CURRENT_DATE - INTERVAL '${parseInt(days)} days'
            THEN op.quantity 
            ELSE 0 
          END), 0) as sold_quantity,
          COALESCE(SUM(CASE 
            WHEN o.status IN ('Order Received', 'Completed') 
            AND o.order_date >= CURRENT_DATE - INTERVAL '${parseInt(days)} days'
            THEN op.quantity * i.unit_price 
            ELSE 0 
          END), 0) as sales_value,
          COUNT(CASE 
            WHEN o.status IN ('Order Received', 'Completed') 
            AND o.order_date >= CURRENT_DATE - INTERVAL '${parseInt(days)} days'
            THEN 1 
          END) as order_count,
          AVG(CASE 
            WHEN o.status IN ('Order Received', 'Completed') 
            AND o.order_date >= CURRENT_DATE - INTERVAL '${parseInt(days)} days'
            THEN op.quantity 
          END) as avg_order_quantity
        FROM inventory_items i
        LEFT JOIN order_products op ON i.sku = op.sku
        LEFT JOIN orders o ON op.order_id = o.order_id
        LEFT JOIN suppliers s ON i.supplier_id = s.supplier_id
        WHERE i.is_active = true
        GROUP BY i.sku, i.name, i.category, i.quantity, i.unit_price, i.reorder_level, i.supplier_id, s.name
      ),
      analytics_calculations AS (
        SELECT 
          *,
          (current_stock * unit_price) as inventory_value,
          CASE 
            WHEN sold_quantity > 0 THEN sales_value / sold_quantity
            ELSE unit_price
          END as avg_selling_price,
          CASE 
            WHEN sold_quantity > 0 AND ${parseInt(days)} > 0 THEN 
              ROUND((sold_quantity / ${parseInt(days)})::numeric, 2)
            ELSE 0
          END as daily_velocity,
          CASE 
            WHEN sold_quantity > 0 AND ${parseInt(days)} > 0 AND (sold_quantity / ${parseInt(days)}) > 0 THEN 
              ROUND((current_stock / (sold_quantity / ${parseInt(days)}))::numeric, 1)
            ELSE 999
          END as days_of_supply,
          CASE 
            WHEN sold_quantity > 0 THEN 
              ROUND((sold_quantity / current_stock)::numeric, 2)
            ELSE 0
          END as turnover_ratio,
          CASE 
            WHEN sold_quantity = 0 THEN 'DEAD_STOCK'
            WHEN sold_quantity > 0 AND sold_quantity <= 10 THEN 'SLOW_MOVING'
            WHEN sold_quantity > 10 AND sold_quantity <= 50 THEN 'MODERATE_MOVING'
            WHEN sold_quantity > 50 THEN 'FAST_MOVING'
          END as movement_category,
          CASE 
            WHEN current_stock <= COALESCE(reorder_level, CEIL(current_stock * 0.2)) THEN 'LOW_STOCK'
            WHEN current_stock <= COALESCE(reorder_level, CEIL(current_stock * 0.2)) * 1.5 THEN 'MEDIUM_STOCK'
            ELSE 'HIGH_STOCK'
          END as stock_level,
          CASE 
            WHEN sold_quantity > 0 THEN 
              ROUND(((sales_value / sold_quantity) - unit_price)::numeric, 2)
            ELSE 0
          END as profit_margin,
          CASE 
            WHEN sold_quantity > 0 THEN 
              ROUND((((sales_value / sold_quantity) - unit_price) / (sales_value / sold_quantity) * 100)::numeric, 1)
            ELSE 0
          END as profit_margin_percentage
        FROM inventory_metrics
      )
      SELECT 
        sku,
        name,
        category,
        current_stock,
        unit_price,
        reorder_level,
        supplier_name,
        sold_quantity,
        sales_value,
        order_count,
        ROUND(avg_order_quantity::numeric, 2) as avg_order_quantity,
        inventory_value,
        ROUND(avg_selling_price::numeric, 2) as avg_selling_price,
        daily_velocity,
        days_of_supply,
        turnover_ratio,
        movement_category,
        stock_level,
        ROUND(profit_margin::numeric, 2) as profit_margin,
        profit_margin_percentage
      FROM analytics_calculations
      ORDER BY sales_value DESC
    `);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching advanced analytics:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch advanced analytics' 
    });
  }
});

// Test data endpoints for development/testing
router.post('/test-data/insert', async (req, res) => {
  try {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Insert test orders with different movement patterns
      const testOrders = [
        // Fast moving items (high sales)
        {
          order_id: 'TEST-FAST-001',
          name: 'Test Customer Fast',
          shipped_to: 'Test Address',
          order_date: new Date(),
          status: 'Completed',
          shipping_address: 'Test Address',
          total_cost: 150.00,
          payment_type: 'Cash',
          payment_method: 'Cash',
          telephone: '123-456-7890',
          cellphone: '123-456-7890',
          email_address: 'testfast@example.com'
        },
        {
          order_id: 'TEST-FAST-002',
          name: 'Test Customer Fast 2',
          shipped_to: 'Test Address 2',
          order_date: new Date(),
          status: 'Completed',
          shipping_address: 'Test Address 2',
          total_cost: 200.00,
          payment_type: 'Cash',
          payment_method: 'Cash',
          telephone: '123-456-7891',
          cellphone: '123-456-7891',
          email_address: 'testfast2@example.com'
        },
        // Moderate moving items (medium sales)
        {
          order_id: 'TEST-MOD-001',
          name: 'Test Customer Mod',
          shipped_to: 'Test Address',
          order_date: new Date(),
          status: 'Completed',
          shipping_address: 'Test Address',
          total_cost: 75.00,
          payment_type: 'Cash',
          payment_method: 'Cash',
          telephone: '123-456-7892',
          cellphone: '123-456-7892',
          email_address: 'testmod@example.com'
        },
        // Slow moving items (low sales)
        {
          order_id: 'TEST-SLOW-001',
          name: 'Test Customer Slow',
          shipped_to: 'Test Address',
          order_date: new Date(),
          status: 'Completed',
          shipping_address: 'Test Address',
          total_cost: 25.00,
          payment_type: 'Cash',
          payment_method: 'Cash',
          telephone: '123-456-7893',
          cellphone: '123-456-7893',
          email_address: 'testslow@example.com'
        }
      ];
      
      // Insert orders
      for (const order of testOrders) {
        await client.query(`
          INSERT INTO orders (order_id, name, shipped_to, order_date, status, shipping_address, total_cost, payment_type, payment_method, telephone, cellphone, email_address)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          ON CONFLICT (order_id) DO NOTHING
        `, [order.order_id, order.name, order.shipped_to, order.order_date, order.status, order.shipping_address, order.total_cost, order.payment_type, order.payment_method, order.telephone, order.cellphone, order.email_address]);
      }
      
      // Get some existing inventory items to use for test data
      const inventoryItems = await client.query(`
        SELECT sku, name, unit_price FROM inventory_items 
        WHERE is_active = true 
        ORDER BY sku 
        LIMIT 10
      `);
      
      if (inventoryItems.rows.length === 0) {
        throw new Error('No inventory items found to create test data');
      }
      
      // Insert order products with different quantities to simulate movement patterns
      const testOrderProducts = [
        // Fast moving - high quantities
        { order_id: 'TEST-FAST-001', sku: inventoryItems.rows[0].sku, quantity: 15 },
        { order_id: 'TEST-FAST-001', sku: inventoryItems.rows[1].sku, quantity: 12 },
        { order_id: 'TEST-FAST-002', sku: inventoryItems.rows[0].sku, quantity: 20 },
        { order_id: 'TEST-FAST-002', sku: inventoryItems.rows[2].sku, quantity: 18 },
        
        // Moderate moving - medium quantities
        { order_id: 'TEST-MOD-001', sku: inventoryItems.rows[3].sku, quantity: 5 },
        { order_id: 'TEST-MOD-001', sku: inventoryItems.rows[4].sku, quantity: 3 },
        
        // Slow moving - low quantities
        { order_id: 'TEST-SLOW-001', sku: inventoryItems.rows[5].sku, quantity: 1 },
        { order_id: 'TEST-SLOW-001', sku: inventoryItems.rows[6].sku, quantity: 2 }
      ];
      
      // Insert order products
      for (const product of testOrderProducts) {
        await client.query(`
          INSERT INTO order_products (order_id, sku, quantity)
          VALUES ($1, $2, $3)
        `, [product.order_id, product.sku, product.quantity]);
      }
      
      await client.query('COMMIT');
      
      res.json({
        success: true,
        message: 'Test data inserted successfully',
        data: {
          orders_inserted: testOrders.length,
          order_products_inserted: testOrderProducts.length,
          inventory_items_used: inventoryItems.rows.length
        }
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Error inserting test data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to insert test data',
      error: error.message
    });
  }
});

router.post('/test-data/clear', async (req, res) => {
  try {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Delete test order products first (due to foreign key constraints)
      await client.query(`
        DELETE FROM order_products 
        WHERE order_id LIKE 'TEST-%'
      `);
      
      // Delete test orders
      await client.query(`
        DELETE FROM orders 
        WHERE order_id LIKE 'TEST-%'
      `);
      
      await client.query('COMMIT');
      
      res.json({
        success: true,
        message: 'Test data cleared successfully'
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Error clearing test data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear test data',
      error: error.message
    });
  }
});

module.exports = router;
