const express = require('express');
const router = express.Router(); // <--- THIS IS REQUIRED!
const pool = require('../db');

router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, description, price, category, image_url FROM products ORDER BY name ASC'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
