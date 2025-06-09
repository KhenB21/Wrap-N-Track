const express = require('express');
const router = express.Router();  // Ensure this is defined
const pool = require('../db');  // Ensure you're importing the pool for your database connection

// Product detail route
router.get('/:id', async (req, res) => {
  try {
    // Ensure you're using the correct column name (use product_id instead of id if necessary)
    const result = await pool.query('SELECT * FROM products WHERE id = $1', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Send the fetched product data as JSON
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Product fetch error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;  
