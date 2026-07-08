const express = require('express');
const router = express.Router();
// Central pool
const pool = require('../config/db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const requireRole = require('../middleware/requireRole');
require('dotenv').config();

const STAFF_CUSTOMER_ROLES = [
  'operations_manager',
  'sales_manager',
  'super_admin',
  'admin',
  'director',
  'business_developer',
  'assistant_sales',
  'social_media_manager',
];

let customerSchemaReady = false;

async function ensureCustomerSchema() {
  if (customerSchemaReady) return;

  await pool.query(`
    ALTER TABLE customer_details
      ADD COLUMN IF NOT EXISTS telephone VARCHAR(30),
      ADD COLUMN IF NOT EXISTS cellphone VARCHAR(30),
      ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active',
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
  `);

  await pool.query(`
    UPDATE customer_details
    SET cellphone = COALESCE(NULLIF(cellphone, ''), phone_number)
    WHERE (cellphone IS NULL OR cellphone = '') AND phone_number IS NOT NULL;
  `);

  customerSchemaReady = true;
}

const normalizePhone = (value) => String(value || '').replace(/[^\d+]/g, '');
const isValidEmail = (value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const isValidPhilippineMobile = (value) => {
  if (!value) return false;
  const phone = normalizePhone(value);
  return /^09\d{9}$/.test(phone) || /^\+639\d{9}$/.test(phone) || /^639\d{9}$/.test(phone);
};

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
router.use(verifyToken);
router.use(async (req, res, next) => {
  try {
    await ensureCustomerSchema();
    next();
  } catch (error) {
    console.error('Error preparing customer schema:', error);
    res.status(500).json({ error: 'Failed to prepare customer module' });
  }
});
router.use(requireRole(STAFF_CUSTOMER_ROLES));

// Get all customers
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        cd.*,
        COALESCE(cd.cellphone, cd.phone_number) AS cellphone,
        cd.telephone,
        COALESCE(cd.status, 'active') AS status,
        COALESCE(active_orders.order_count, 0) + COALESCE(history_orders.order_count, 0) AS order_count,
        COALESCE(active_orders.latest_order_status, history_orders.latest_order_status) AS latest_order_status,
        COALESCE(active_orders.latest_order_date, history_orders.latest_order_date) AS latest_order_date,
        COALESCE(active_orders.total_spent, 0) + COALESCE(history_orders.total_spent, 0) AS total_spent
      FROM customer_details cd
      LEFT JOIN LATERAL (
        SELECT
          COUNT(*)::int AS order_count,
          (ARRAY_AGG(o.status::text ORDER BY o.order_date DESC NULLS LAST))[1] AS latest_order_status,
          MAX(o.order_date) AS latest_order_date,
          COALESCE(SUM(o.total_cost), 0) AS total_spent
        FROM orders o
        WHERE o.customer_id = cd.customer_id OR LOWER(o.email_address) = LOWER(cd.email_address)
      ) active_orders ON true
      LEFT JOIN LATERAL (
        SELECT
          COUNT(*)::int AS order_count,
          (ARRAY_AGG(oh.status ORDER BY oh.order_date DESC NULLS LAST))[1] AS latest_order_status,
          MAX(oh.order_date) AS latest_order_date,
          COALESCE(SUM(oh.total_cost), 0) AS total_spent
        FROM order_history oh
        WHERE oh.customer_id = cd.customer_id OR LOWER(oh.email_address) = LOWER(cd.email_address)
      ) history_orders ON true
      WHERE COALESCE(cd.status, 'active') <> 'deleted'
      ORDER BY cd.customer_id DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching customers:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add a new customer
router.post('/', async (req, res) => {
  const { name, telephone, cellphone, phone_number, email_address, address, status = 'active' } = req.body;
  const mobile = cellphone || phone_number;
  
  if (!name || !email_address || !mobile || !address) {
    return res.status(400).json({ error: 'Full name, email, cellphone, and shipping address are required' });
  }
  if (!isValidEmail(email_address)) {
    return res.status(400).json({ error: 'Invalid email address' });
  }
  if (!isValidPhilippineMobile(mobile)) {
    return res.status(400).json({ error: 'Cellphone must use Philippine format (+63 or 09)' });
  }

  try {
    const duplicate = await pool.query(`
      SELECT customer_id FROM customer_details
      WHERE LOWER(email_address) = LOWER($1)
         OR regexp_replace(COALESCE(cellphone, phone_number, ''), '[^0-9]', '', 'g') = regexp_replace($2, '[^0-9]', '', 'g')
      LIMIT 1
    `, [email_address, mobile]);
    if (duplicate.rows.length) {
      return res.status(400).json({ error: 'A customer with the same email or cellphone already exists' });
    }

    const baseUsername = String(email_address)
      .split('@')[0]
      .replace(/[^a-zA-Z0-9_]/g, '_')
      .slice(0, 20) || `customer_${Date.now()}`;
    let username = baseUsername;
    let suffix = 1;

    while (true) {
      const usernameCheck = await pool.query(
        'SELECT customer_id FROM customer_details WHERE username = $1',
        [username]
      );
      if (usernameCheck.rows.length === 0) break;
      username = `${baseUsername.slice(0, 16)}_${suffix}`;
      suffix += 1;
    }

    const passwordHash = await bcrypt.hash(`Temp${Date.now()}!`, 10);
    const result = await pool.query(
      `INSERT INTO customer_details (username, name, phone_number, telephone, cellphone, email_address, address, password_hash, is_verified, status, updated_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW()) RETURNING *`,
      [username, name, mobile, telephone || null, mobile, email_address, address, passwordHash, true, status]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') { // Unique violation
      res.status(400).json({ error: 'Email already exists' });
    } else {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// Edit a customer
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, telephone, cellphone, phone_number, email_address, address, status = 'active' } = req.body;
  const mobile = cellphone || phone_number;

  if (!name || !email_address || !mobile || !address) {
    return res.status(400).json({ error: 'Full name, email, cellphone, and shipping address are required' });
  }
  if (!isValidEmail(email_address)) {
    return res.status(400).json({ error: 'Invalid email address' });
  }
  if (!isValidPhilippineMobile(mobile)) {
    return res.status(400).json({ error: 'Cellphone must use Philippine format (+63 or 09)' });
  }

  try {
    const duplicate = await pool.query(`
      SELECT customer_id FROM customer_details
      WHERE customer_id <> $3
        AND (
          LOWER(email_address) = LOWER($1)
          OR regexp_replace(COALESCE(cellphone, phone_number, ''), '[^0-9]', '', 'g') = regexp_replace($2, '[^0-9]', '', 'g')
        )
      LIMIT 1
    `, [email_address, mobile, id]);
    if (duplicate.rows.length) {
      return res.status(400).json({ error: 'A customer with the same email or cellphone already exists' });
    }

    const result = await pool.query(
      `UPDATE customer_details 
       SET name = $1,
           phone_number = $2,
           telephone = $3,
           cellphone = $4,
           email_address = $5,
           address = $6,
           status = $7,
           updated_at = NOW()
       WHERE customer_id = $8 RETURNING *`,
      [name, mobile, telephone || null, mobile, email_address, address, status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') { // Unique violation
      res.status(400).json({ error: 'Email already exists' });
    } else {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// Deactivate a customer
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `UPDATE customer_details
       SET status = 'inactive', updated_at = NOW()
       WHERE customer_id = $1 RETURNING *`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    res.json({ message: 'Customer deactivated successfully', customer: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get customer by email
router.get('/email/:email', async (req, res) => {
  try {
    const { email } = req.params;
    console.log('Fetching customer details for email:', email);
    
    const result = await pool.query(
      'SELECT customer_id, name, email_address, phone_number, telephone, COALESCE(cellphone, phone_number) AS cellphone, address, company, notes, status FROM customer_details WHERE email_address = $1',
      [email]
    );

    if (result.rows.length === 0) {
      console.log('No customer found with email:', email);
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    const customer = result.rows[0];
    console.log('Found customer:', customer);
    
    res.json({
      success: true,
      ...customer
    });
  } catch (error) {
    console.error('Error fetching customer details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch customer details'
    });
  }
});

// Get customer by ID
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `SELECT
         cd.*,
         COALESCE(cd.cellphone, cd.phone_number) AS cellphone,
         cd.telephone
       FROM customer_details cd
       WHERE cd.customer_id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching customer:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get customer order history and ongoing orders
router.get('/:id/orders', async (req, res) => {
  const { id } = req.params;

  try {
    const customerResult = await pool.query('SELECT * FROM customer_details WHERE customer_id = $1', [id]);
    if (customerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const customer = customerResult.rows[0];
    const activeOrders = await pool.query(`
      SELECT order_id, order_date, expected_delivery, status, total_cost, shipping_address
      FROM orders
      WHERE customer_id = $1 OR LOWER(email_address) = LOWER($2)
      ORDER BY order_date DESC NULLS LAST
    `, [id, customer.email_address]);
    const historyOrders = await pool.query(`
      SELECT order_id, order_date, expected_delivery, status, total_cost, shipping_address
      FROM order_history
      WHERE customer_id = $1 OR LOWER(email_address) = LOWER($2)
      ORDER BY order_date DESC NULLS LAST
    `, [id, customer.email_address]);

    res.json({
      success: true,
      ongoing: activeOrders.rows,
      history: historyOrders.rows,
    });
  } catch (err) {
    console.error('Error fetching customer orders:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 
