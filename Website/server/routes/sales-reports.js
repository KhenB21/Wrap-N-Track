const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// GET /api/sales-reports/overview - Get sales overview data
router.get('/overview', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Default to today if no dates provided
    const today = new Date();
    const defaultStartDate = startDate || today.toISOString().split('T')[0];
    const defaultEndDate = endDate || today.toISOString().split('T')[0];
    
    console.log('Fetching sales overview for period:', defaultStartDate, 'to', defaultEndDate);
    
    // Get sales overview data
    const salesOverview = await pool.query(`
      WITH period_orders AS (
        SELECT 
          o.order_id,
          o.name,
          o.total_cost,
          o.status,
          o.total_profit_estimation,
          SUM(op.quantity) as total_quantity
        FROM orders o
        LEFT JOIN order_products op ON o.order_id = op.order_id
        WHERE o.order_date BETWEEN $1 AND $2
        GROUP BY o.order_id, o.name, o.total_cost, o.status, o.total_profit_estimation
      )
      SELECT 
        COALESCE(SUM(CASE 
          WHEN status IN ('DELIVERED', 'COMPLETED') 
          THEN total_cost 
          ELSE 0 
        END), 0) as total_revenue,
        COUNT(*) as total_orders,
        COALESCE(SUM(CASE 
          WHEN status IN ('DELIVERED', 'COMPLETED') 
          THEN total_quantity 
          ELSE 0 
        END), 0) as total_units_sold,
        COALESCE(SUM(total_profit_estimation), 0) as total_profit,
        COUNT(DISTINCT name) as total_customers
      FROM period_orders
    `, [defaultStartDate, defaultEndDate]);

    // Get orders by status
    const ordersByStatus = await pool.query(`
      SELECT 
        status,
        COUNT(*) as count
      FROM orders 
      WHERE order_date BETWEEN $1 AND $2
      GROUP BY status
    `, [defaultStartDate, defaultEndDate]);

    // Get previous period data for trend calculation
    const previousPeriodStart = new Date(defaultStartDate);
    const previousPeriodEnd = new Date(defaultEndDate);
    const periodLength = Math.ceil((new Date(defaultEndDate) - new Date(defaultStartDate)) / (1000 * 60 * 60 * 24));
    
    previousPeriodStart.setDate(previousPeriodStart.getDate() - periodLength - 1);
    previousPeriodEnd.setDate(previousPeriodEnd.getDate() - periodLength - 1);

    const previousPeriodData = await pool.query(`
      WITH period_orders AS (
        SELECT 
          o.order_id,
          o.name,
          o.total_cost,
          o.status,
          o.total_profit_estimation,
          SUM(op.quantity) as total_quantity
        FROM orders o
        LEFT JOIN order_products op ON o.order_id = op.order_id
        WHERE o.order_date BETWEEN $1 AND $2
        GROUP BY o.order_id, o.name, o.total_cost, o.status, o.total_profit_estimation
      )
      SELECT 
        COALESCE(SUM(CASE 
          WHEN status IN ('DELIVERED', 'COMPLETED') 
          THEN total_cost 
          ELSE 0 
        END), 0) as total_revenue,
        COUNT(*) as total_orders,
        COALESCE(SUM(total_profit_estimation), 0) as total_profit
      FROM period_orders
    `, [previousPeriodStart.toISOString().split('T')[0], previousPeriodEnd.toISOString().split('T')[0]]);

    const currentData = salesOverview.rows[0];
    const previousData = previousPeriodData.rows[0];

    // Calculate trends
    const revenueTrend = calculateTrend(currentData.total_revenue, previousData.total_revenue);
    const ordersTrend = calculateTrend(currentData.total_orders, previousData.total_orders);
    const profitTrend = calculateTrend(currentData.total_profit, previousData.total_profit);

    // Calculate average order value
    const avgOrderValue = currentData.total_orders > 0 
      ? currentData.total_revenue / currentData.total_orders 
      : 0;

    // Process orders by status
    const statusData = {
      pending: 0,
      delivered: 0,
      completed: 0
    };

    ordersByStatus.rows.forEach(row => {
      const status = row.status.toLowerCase();
      if (status === 'pending') statusData.pending = parseInt(row.count);
      else if (status === 'delivered') statusData.delivered = parseInt(row.count);
      else if (status === 'completed') statusData.completed = parseInt(row.count);
    });

    const responseData = {
      totalRevenue: parseFloat(currentData.total_revenue) || 0,
      totalOrders: parseInt(currentData.total_orders) || 0,
      avgOrderValue: parseFloat(avgOrderValue) || 0,
      totalProfit: parseFloat(currentData.total_profit) || 0,
      totalUnitsSold: parseInt(currentData.total_units_sold) || 0,
      totalCustomers: parseInt(currentData.total_customers) || 0,
      ordersByStatus: statusData,
      revenueTrend,
      ordersTrend,
      profitTrend,
      period: {
        startDate: defaultStartDate,
        endDate: defaultEndDate
      }
    };

    res.json({
      success: true,
      data: responseData
    });

  } catch (error) {
    console.error('Error fetching sales overview:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sales overview',
      error: error.message
    });
  }
});

// GET /api/sales-reports/top-products - Get top selling products
router.get('/top-products', async (req, res) => {
  try {
    const { startDate, endDate, limit = 10 } = req.query;
    
    const today = new Date();
    const defaultStartDate = startDate || today.toISOString().split('T')[0];
    const defaultEndDate = endDate || today.toISOString().split('T')[0];
    
    const result = await pool.query(`
      WITH product_sales AS (
        SELECT 
          op.sku,
          SUM(op.quantity) as units_sold,
          SUM(op.quantity * COALESCE(op.unit_price, i.unit_price)) as sales_value,
          AVG(COALESCE(op.unit_price, i.unit_price)) as avg_price
        FROM order_products op
        JOIN orders o ON op.order_id = o.order_id
        JOIN inventory_items i ON op.sku = i.sku
        WHERE o.status IN ('DELIVERED', 'COMPLETED')
        AND o.order_date BETWEEN $1 AND $2
        GROUP BY op.sku
      )
      SELECT 
        i.sku,
        i.name,
        i.category,
        i.unit_price,
        COALESCE(ps.units_sold, 0) as units_sold,
        COALESCE(ps.sales_value, 0) as sales_value,
        COALESCE(ps.avg_price, i.unit_price) as avg_price
      FROM inventory_items i
      LEFT JOIN product_sales ps ON i.sku = ps.sku
      WHERE COALESCE(ps.units_sold, 0) > 0
      ORDER BY units_sold DESC, sales_value DESC
      LIMIT $3
    `, [defaultStartDate, defaultEndDate, parseInt(limit)]);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Error fetching top products:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch top products',
      error: error.message
    });
  }
});

// GET /api/sales-reports/customer-analysis - Get customer analysis
router.get('/customer-analysis', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const today = new Date();
    const defaultStartDate = startDate || today.toISOString().split('T')[0];
    const defaultEndDate = endDate || today.toISOString().split('T')[0];
    
    // Get customer analysis data
    const customerData = await pool.query(`
      WITH customer_orders AS (
        SELECT 
          o.name,
          o.email_address,
          o.telephone,
          COUNT(*) as order_count,
          SUM(o.total_cost) as total_spent,
          AVG(o.total_cost) as avg_order_value,
          MAX(o.order_date) as last_order_date,
          MIN(o.order_date) as first_order_date
        FROM orders o
        WHERE o.order_date BETWEEN $1 AND $2
        GROUP BY o.name, o.email_address, o.telephone
      )
      SELECT 
        name,
        email_address,
        telephone,
        order_count,
        total_spent,
        avg_order_value,
        last_order_date,
        first_order_date,
        CASE 
          WHEN order_count = 1 THEN 'New'
          WHEN order_count BETWEEN 2 AND 5 THEN 'Regular'
          ELSE 'VIP'
        END as customer_type
      FROM customer_orders
      ORDER BY total_spent DESC
    `, [defaultStartDate, defaultEndDate]);

    // Get summary statistics
    const summary = await pool.query(`
      SELECT 
        COUNT(DISTINCT o.name) as total_customers,
        COUNT(*) as total_orders,
        AVG(o.total_cost) as avg_order_value,
        SUM(o.total_cost) as total_revenue
      FROM orders o
      WHERE o.order_date BETWEEN $1 AND $2
    `, [defaultStartDate, defaultEndDate]);

    res.json({
      success: true,
      data: {
        customers: customerData.rows,
        summary: summary.rows[0]
      }
    });

  } catch (error) {
    console.error('Error fetching customer analysis:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch customer analysis',
      error: error.message
    });
  }
});

// GET /api/sales-reports/trends - Get sales trends over time
router.get('/trends', async (req, res) => {
  try {
    const { startDate, endDate, groupBy = 'day' } = req.query;
    
    const today = new Date();
    const defaultStartDate = startDate || new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const defaultEndDate = endDate || today.toISOString().split('T')[0];
    
    let dateFormat, interval;
    switch (groupBy) {
      case 'hour':
        dateFormat = "DATE_TRUNC('hour', o.order_date)";
        interval = "1 hour";
        break;
      case 'day':
        dateFormat = "DATE(o.order_date)";
        interval = "1 day";
        break;
      case 'week':
        dateFormat = "DATE_TRUNC('week', o.order_date)";
        interval = "1 week";
        break;
      case 'month':
        dateFormat = "DATE_TRUNC('month', o.order_date)";
        interval = "1 month";
        break;
      default:
        dateFormat = "DATE(o.order_date)";
        interval = "1 day";
    }
    
    const result = await pool.query(`
      SELECT 
        ${dateFormat} as period,
        COUNT(*) as order_count,
        SUM(CASE WHEN o.status IN ('DELIVERED', 'COMPLETED') THEN o.total_cost ELSE 0 END) as revenue,
        SUM(o.total_profit_estimation) as profit,
        COUNT(DISTINCT o.name) as unique_customers
      FROM orders o
      WHERE o.order_date BETWEEN $1 AND $2
      GROUP BY ${dateFormat}
      ORDER BY period ASC
    `, [defaultStartDate, defaultEndDate]);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Error fetching sales trends:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sales trends',
      error: error.message
    });
  }
});

// Helper function to calculate trend
function calculateTrend(current, previous) {
  if (!previous || previous === 0) return 'stable';
  const change = ((current - previous) / previous) * 100;
  if (change > 5) return 'up';
  if (change < -5) return 'down';
  return 'stable';
}

module.exports = router;
