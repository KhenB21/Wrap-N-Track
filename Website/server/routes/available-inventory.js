const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const jwt = require('jsonwebtoken');

// Minimal inline verifyToken (same pattern used in other route files)
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

// Helper: validate UUID v4/standard format
const isValidUuid = (value) => {
  return typeof value === 'string' && /^(?:[0-9a-fA-F]{8}-){1}[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(value);
};

// GET available inventory (grouped by category, with item details) - public for customers
router.get('/', async (req, res) => {
  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS public.available_inventory (
      category TEXT NOT NULL,
      sku TEXT NOT NULL REFERENCES public.inventory_items(sku) ON DELETE CASCADE,
      created_by UUID NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (category, sku)
    )`);
    const result = await pool.query(`
      SELECT ai.category, i.sku, i.name, i.unit_price, i.category AS inventory_category, 
             CASE WHEN i.image_data IS NOT NULL THEN encode(i.image_data, 'base64') ELSE NULL END AS image_data
      FROM public.available_inventory ai
      JOIN public.inventory_items i ON i.sku = ai.sku
      ORDER BY ai.category, i.name ASC
    `);

    const byCategory = {};
    for (const row of result.rows) {
      if (!byCategory[row.category]) byCategory[row.category] = [];
      byCategory[row.category].push({
        sku: row.sku,
        name: row.name,
        unit_price: row.unit_price,
        image_data: row.image_data,
        inventory_category: row.inventory_category
      });
    }
    res.json({ success: true, available: byCategory });
  } catch (err) {
    console.error('Error fetching available inventory:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch available inventory' });
  }
});

// Mutations require auth (employees only)
router.use(verifyToken);

// PUT entire available set (idempotent replace per category)
router.put('/', async (req, res) => {
  const { available } = req.body; // { category: [sku,...], ... }
  if (!available || typeof available !== 'object') {
    return res.status(400).json({ success: false, message: 'Invalid payload' });
  }

  // Ensure table exists outside the transaction, then do the upsert work
  await pool.query(`CREATE TABLE IF NOT EXISTS public.available_inventory (
    category TEXT NOT NULL,
    sku TEXT NOT NULL REFERENCES public.inventory_items(sku) ON DELETE CASCADE,
    created_by UUID NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (category, sku)
  )`);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const categories = Object.keys(available);
    for (const category of categories) {
      await client.query('DELETE FROM public.available_inventory WHERE category = $1', [category]);
      const skus = Array.isArray(available[category]) ? available[category] : [];
      for (const sku of skus) {
        const rawUserId = req.user?.user_id || req.user?.id || null;
        const createdBy = isValidUuid(rawUserId) ? rawUserId : null;
        await client.query(
          'INSERT INTO public.available_inventory (category, sku, created_by) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
          [category, sku, createdBy]
        );
      }
    }
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error saving available inventory:', err);
    res.status(500).json({ success: false, message: 'Failed to save available inventory' });
  } finally {
    client.release();
  }
});

module.exports = router;


