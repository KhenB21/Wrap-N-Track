const express = require("express");
const router = express.Router();
const { pool } = require("../db");
const jwt = require("jsonwebtoken");

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      success: false,
      message: "No token provided",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid token",
    });
  }
};

// Apply authentication middleware to all routes
router.use(verifyToken);

// GET /api/inventory_items - fetch all inventory items
router.get("/", async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query(
      "SELECT * FROM inventory_items ORDER BY sku ASC"
    );
    client.release();
    // Convert image_data to base64 if present
    const items = result.rows.map((item) => ({
      ...item,
      image_data: item.image_data ? item.image_data.toString("base64") : null,
    }));
    res.json(items);
  } catch (error) {
    console.error("Error fetching inventory:", error);
    res.status(500).json({ error: "Failed to fetch inventory" });
  }
});

// GET inventory movement report (reductions only)
router.get("/movement-report", async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query(`
      SELECT 
        TO_CHAR(DATE_TRUNC('month', o.order_date), 'Month YYYY') as month,
        ABS(SUM(op.quantity)) as reductions
      FROM orders o
      JOIN order_products op ON o.order_id = op.order_id
      GROUP BY DATE_TRUNC('month', o.order_date)
      ORDER BY DATE_TRUNC('month', o.order_date) DESC
      LIMIT 12;
    `);
    client.release();
    res.json(result.rows);
  } catch (error) {
    console.error("Error generating inventory movement report:", error);
    res
      .status(500)
      .json({ error: "Failed to generate inventory movement report" });
  }
});

module.exports = router;
