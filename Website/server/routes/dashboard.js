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

    // Get sales overview data
    const salesOverview = await pool.query(`
      SELECT 
        COALESCE(SUM(CASE 
          WHEN o.status IN ('DELIVERED', 'COMPLETED') 
          AND DATE_PART('month', o.order_date) = $1 
          AND DATE_PART('year', o.order_date) = $2
          THEN o.total_cost 
          ELSE 0 
        END), 0) as total_revenue,
        COUNT(CASE 
          WHEN DATE_PART('month', o.order_date) = $1 
          AND DATE_PART('year', o.order_date) = $2
          THEN 1 
        END) as total_orders,
        COALESCE(SUM(CASE 
          WHEN o.status IN ('DELIVERED', 'COMPLETED') 
          AND DATE_PART('month', o.order_date) = $1 
          AND DATE_PART('year', o.order_date) = $2
          THEN op.quantity 
          ELSE 0 
        END), 0) as total_units_sold,
        COUNT(DISTINCT CASE 
          WHEN DATE_PART('month', o.order_date) = $1 
          AND DATE_PART('year', o.order_date) = $2
          THEN o.name 
        END) as total_customers
      FROM orders o
      LEFT JOIN order_products op ON o.order_id = op.order_id
    `, [targetMonth, targetYear]);

    // Get top selling products for the month
    const topSellingProducts = await pool.query(`
      SELECT 
        i.sku,
        i.name,
        i.category,
        i.unit_price,
        COALESCE(SUM(CASE 
          WHEN o.status IN ('DELIVERED', 'COMPLETED') 
          AND DATE_PART('month', o.order_date) = $1 
          AND DATE_PART('year', o.order_date) = $2
          THEN op.quantity 
          ELSE 0 
        END), 0) as units_sold,
        COALESCE(SUM(CASE 
          WHEN o.status IN ('DELIVERED', 'COMPLETED') 
          AND DATE_PART('month', o.order_date) = $1 
          AND DATE_PART('year', o.order_date) = $2
          THEN op.quantity * op.unit_price 
          ELSE 0 
        END), 0) as sales_value
      FROM inventory_items i
      LEFT JOIN order_products op ON i.sku = op.sku
      LEFT JOIN orders o ON op.order_id = o.order_id
      WHERE i.is_active = true
      GROUP BY i.sku, i.name, i.category, i.unit_price
      HAVING COALESCE(SUM(CASE 
        WHEN o.status IN ('DELIVERED', 'COMPLETED') 
        AND DATE_PART('month', o.order_date) = $1 
        AND DATE_PART('year', o.order_date) = $2
        THEN op.quantity 
        ELSE 0 
      END), 0) > 0
      ORDER BY units_sold DESC, sales_value DESC
      LIMIT 5
    `, [targetMonth, targetYear]);

    // Get order status counts for sales activity
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
      if (/deliver|out for|outfor|en\s?-?route|enroute/.test(s)) return 'outForDelivery';
      if (/ship|shipped|to be ship|to-be-ship|tobe ship|to be shipped/.test(s)) return 'toBeShipped';
      if (/pack|pending|to be pack|to-be-pack|tobe pack/.test(s)) return 'toBePack';
      return null;
    };

    const salesActivity = {
      toBePack: 0,
      toBeShipped: 0,
      outForDelivery: 0
    };

    orderStatusCounts.rows.forEach(row => {
      const classification = classifyStatus(row.status);
      if (classification && salesActivity.hasOwnProperty(classification)) {
        salesActivity[classification] = parseInt(row.count);
      }
    });

    // Get recent activity (last 5 orders)
    const recentActivity = await pool.query(`
      SELECT 
        o.order_id,
        o.name as customer_name,
        o.order_date,
        o.status,
        u.name as archived_by_name,
        u.profile_picture_data as archived_by_profile_picture,
        o.archived_at
      FROM orders o
      LEFT JOIN users u ON o.archived_by = u.user_id
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
