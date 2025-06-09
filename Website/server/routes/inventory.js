// Example: routes/inventory.js
const express = require('express');
const router = express.Router();
const pool = require('../db'); // your pg Pool instance

router.get('/items', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM inventory_items');
    res.json({ success: true, items: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;