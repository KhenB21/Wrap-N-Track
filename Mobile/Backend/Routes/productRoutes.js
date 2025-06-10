const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET all products
router.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM products ORDER BY id ASC");
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching products:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET product by id
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Product fetch error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
