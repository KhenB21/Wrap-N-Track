const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({
      success: false,
      message: 'No token provided'
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
};

// Apply authentication middleware to all routes
// Temporarily comment out for debugging
// router.use(verifyToken);

// GET /api/dashboard/analytics - Get dashboard analytics for a specific month/year
router.get('/analytics', async (req, res) => {
  try {
    console.log('Dashboard analytics request received:', req.query);
    const { month, year } = req.query;
    
    // Default to current month/year if not provided
    const currentDate = new Date();
    const targetMonth = month ? parseInt(month) : currentDate.getMonth() + 1;
    const targetYear = year ? parseInt(year) : currentDate.getFullYear();
    
    // Validate month and year
    if (targetMonth < 1 || targetMonth > 12) {
      return res.status(400).json({
        success: false,
        message: 'Invalid month. Must be between 1 and 12.'
      });
    }
    
    if (targetYear < 2020 || targetYear > 2030) {
      return res.status(400).json({
        success: false,
        message: 'Invalid year. Must be between 2020 and 2030.'
      });
    }

    // Get sales overview data - optimized query
    const salesOverview = await pool.query(`
      WITH monthly_orders AS (
        SELECT 
          o.order_id,
          o.name,
          o.total_cost,
          o.status,
          SUM(op.quantity) as total_quantity
        FROM orders o
        LEFT JOIN order_products op ON o.order_id = op.order_id
        WHERE DATE_PART('month', o.order_date) = $1 
        AND DATE_PART('year', o.order_date) = $2
        GROUP BY o.order_id, o.name, o.total_cost, o.status
      )
      SELECT 
        COALESCE(SUM(CASE 
          WHEN status IN ('Order Received', 'Completed') 
          THEN total_cost 
          ELSE 0 
        END), 0) as total_revenue,
        COUNT(*) as total_orders,
        COALESCE(SUM(CASE 
          WHEN status IN ('Order Received', 'Completed') 
          THEN total_quantity 
          ELSE 0 
        END), 0) as total_units_sold,
        COUNT(DISTINCT name) as total_customers
      FROM monthly_orders
    `, [targetMonth, targetYear]);

    // Get top selling products for the month - optimized query
    const topSellingProducts = await pool.query(`
      WITH monthly_sales AS (
        SELECT 
          op.sku,
          SUM(op.quantity) as units_sold,
          SUM(op.quantity * op.unit_price) as sales_value
        FROM order_products op
        JOIN orders o ON op.order_id = o.order_id
        WHERE o.status IN ('Order Received', 'Completed')
        AND DATE_PART('month', o.order_date) = $1 
        AND DATE_PART('year', o.order_date) = $2
        GROUP BY op.sku
      )
      SELECT 
        i.sku,
        i.name,
        i.category,
        i.unit_price,
        COALESCE(ms.units_sold, 0) as units_sold,
        COALESCE(ms.sales_value, 0) as sales_value
      FROM inventory_items i
      LEFT JOIN monthly_sales ms ON i.sku = ms.sku
      WHERE COALESCE(ms.units_sold, 0) > 0
      ORDER BY units_sold DESC, sales_value DESC
      LIMIT 5
    `, [targetMonth, targetYear]);

    // Get order status counts for sales activity - optimized query
    const orderStatusCounts = await pool.query(`
      SELECT 
        o.status,
        COUNT(*) as count
      FROM orders o
      WHERE DATE_PART('month', o.order_date) = $1 
      AND DATE_PART('year', o.order_date) = $2
      GROUP BY o.status
    `, [targetMonth, targetYear]);

    // Classify order statuses into dashboard buckets
    const classifyStatus = (status) => {
      if (!status) return null;
      const s = status.toString().toLowerCase();
      
      // Check for delivery statuses
      if (s.includes('deliver') || s.includes('out for') || s.includes('ready for deliver')) {
        return 'outForDelivery';
      }
      
      // Check for shipping statuses
      if (s.includes('ship') || s.includes('shipped')) {
        return 'toBeShipped';
      }
      
      // Check for packing/pending statuses
      if (s.includes('pack') || s.includes('pending') || s.includes('confirmed')) {
        return 'toBePack';
      }
      
      return null;
    };

    const salesActivity = {
      toBePack: 0,
      toBeShipped: 0,
      outForDelivery: 0
    };

    console.log('Order status counts:', orderStatusCounts.rows);
    
    orderStatusCounts.rows.forEach(row => {
      const classification = classifyStatus(row.status);
      console.log(`Status: ${row.status} -> Classification: ${classification}`);
      if (classification && salesActivity.hasOwnProperty(classification)) {
        salesActivity[classification] = parseInt(row.count);
      }
    });
    
    console.log('Final sales activity:', salesActivity);

    // Get recent activity (last 5 orders)
    const recentActivity = await pool.query(`
      SELECT 
        o.order_id,
        o.name as customer_name,
        o.order_date,
        o.status,
        o.name as archived_by_name,
        NULL as archived_by_profile_picture,
        o.order_date as archived_at
      FROM orders o
      ORDER BY o.order_date DESC
      LIMIT 5
    `);

    res.json({
      success: true,
      data: {
        salesOverview: salesOverview.rows[0],
        topSellingProducts: topSellingProducts.rows,
        salesActivity,
        recentActivity: recentActivity.rows,
        month: targetMonth,
        year: targetYear,
        monthName: new Date(targetYear, targetMonth - 1).toLocaleString('default', { month: 'long' })
      }
    });

  } catch (error) {
    console.error('Error fetching dashboard analytics:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard analytics',
      error: error.message
    });
  }
});

// GET /api/dashboard/available-months - Get available months/years with data
router.get('/available-months', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        DATE_PART('year', order_date) as year,
        DATE_PART('month', order_date) as month,
        COUNT(*) as order_count
      FROM orders
      GROUP BY DATE_PART('year', order_date), DATE_PART('month', order_date)
      ORDER BY year DESC, month DESC
    `);

    const availableMonths = result.rows.map(row => ({
      year: parseInt(row.year),
      month: parseInt(row.month),
      monthName: new Date(row.year, row.month - 1).toLocaleString('default', { month: 'long' }),
      orderCount: parseInt(row.order_count)
    }));

    res.json({
      success: true,
      data: availableMonths
    });

  } catch (error) {
    console.error('Error fetching available months:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch available months'
    });
  }
});

module.exports = router;
