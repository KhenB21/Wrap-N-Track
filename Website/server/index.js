const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const { pool, wss, notifyChange } = require('./db');
const customersRouter = require('./routes/customers');
const suppliersRouter = require('./routes/suppliers');
const ordersRouter = require('./routes/orders');
const supplierOrdersRouter = require('./routes/supplier-orders');
require('dotenv').config({ path: __dirname + '/.env' });

const app = express();
const port = process.env.PORT || 3001;

// Function to archive completed or cancelled orders
async function archiveCompletedOrCancelledOrders() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Get admin user ID
    const adminResult = await client.query(
      'SELECT user_id FROM users WHERE role = $1 LIMIT 1',
      ['admin']
    );
    const adminUserId = adminResult.rows[0]?.user_id;

    if (!adminUserId) {
      console.error('No admin user found');
      return;
    }

    // Get completed or cancelled orders
    const ordersResult = await client.query(
      'SELECT * FROM orders WHERE status IN ($1, $2)',
      ['Completed', 'Cancelled']
    );

    if (ordersResult.rows.length === 0) {
      return;
    }

    console.log(`Found ${ordersResult.rows.length} orders to archive`);

    // Process each order
    for (const order of ordersResult.rows) {
      try {
        // Insert into order_history
        await client.query(
          `INSERT INTO order_history (
            order_id, customer_name, name, shipped_to, order_date, expected_delivery,
            status, shipping_address, total_cost, payment_type, payment_method,
            account_name, remarks, telephone, cellphone, email_address, archived_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
          [
            order.order_id,
            order.name, // Using name as customer_name
            order.name,
            order.shipped_to,
            order.order_date,
            order.expected_delivery,
            order.status,
            order.shipping_address,
            order.total_cost,
            order.payment_type,
            order.payment_method,
            order.account_name,
            order.remarks,
            order.telephone,
            order.cellphone,
            order.email_address,
            adminUserId
          ]
        );

        // Get and insert order products
        const productsResult = await client.query(
          'SELECT op.*, i.unit_price FROM order_products op JOIN inventory_items i ON op.sku = i.sku WHERE op.order_id = $1',
          [order.order_id]
        );

        for (const product of productsResult.rows) {
          await client.query(
            `INSERT INTO order_history_products (order_id, sku, quantity, unit_price)
             VALUES ($1, $2, $3, $4)`,
            [order.order_id, product.sku, product.quantity, product.unit_price]
          );
        }

        // Delete from order_products first (due to foreign key constraint)
        await client.query('DELETE FROM order_products WHERE order_id = $1', [order.order_id]);

        // Delete from orders
        await client.query('DELETE FROM orders WHERE order_id = $1', [order.order_id]);

        console.log(`Successfully archived order: ${order.order_id}`);

        // Notify WebSocket clients
        wss.clients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              type: 'order-archived',
              orderId: order.order_id
            }));
          }
        });
      } catch (error) {
        console.error(`Error archiving order ${order.order_id}:`, error);
        // Continue with other orders even if one fails
      }
    }

    await client.query('COMMIT');
  } catch (error) {
    console.error('Error in archiveCompletedOrCancelledOrders:', error);
    await client.query('ROLLBACK');
  } finally {
    client.release();
  }
}

// Run archive check every 5 minutes
setInterval(archiveCompletedOrCancelledOrders, 5 * 60 * 1000);

// Configure multer for memory storage only
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: function (req, file, cb) {
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
      return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
  }
});

// CORS configuration
app.use(cors({
  origin: 'https://wrap-n-track-b6z5.vercel.app',
  credentials: true
}));

// Add a middleware to log all requests
app.use((req, res, next) => {
  console.log('Incoming request:', {
    method: req.method,
    path: req.path,
    origin: req.headers.origin,
    headers: req.headers
  });
  next();
});

// Add error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  console.error('Request details:', {
    method: req.method,
    path: req.path,
    origin: req.headers.origin,
    headers: req.headers
  });
  res.status(500).json({
    success: false,
    message: err.message || 'Internal server error'
  });
});

app.use(express.json());

// Test database connection
pool.connect((err, client, release) => {
  if (err) {
    console.error('Error acquiring client', err.stack);
    console.error('Database connection details:', {
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT || 5432,
    });
    process.exit(1);
  }
  console.log('Successfully connected to PostgreSQL database');

  // Add profit-related columns to orders table
  client.query(`
    ALTER TABLE orders 
    ADD COLUMN IF NOT EXISTS total_profit_estimation DECIMAL(10,2) DEFAULT 0.00;
  `, (err) => {
    if (err) {
      console.error('Error adding total_profit_estimation column:', err);
    } else {
      console.log('Successfully added total_profit_estimation column to orders table');
    }
  });

  // Add profit-related columns to order_products table
  client.query(`
    ALTER TABLE order_products 
    ADD COLUMN IF NOT EXISTS profit_margin DECIMAL(5,2) DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS profit_estimation DECIMAL(10,2) DEFAULT 0.00;
  `, (err) => {
    if (err) {
      console.error('Error adding profit columns to order_products:', err);
    } else {
      console.log('Successfully added profit columns to order_products table');
    }
  });

  release();
});

// Add error handler for pool
pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

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

// Add this test endpoint before the registration endpoint
app.get('/api/test/roles', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT conname, pg_get_constraintdef(oid) 
      FROM pg_constraint 
      WHERE conrelid = 'users'::regclass 
      AND conname = 'users_role_check'
    `);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error checking constraint:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add this before the registration endpoint
app.post('/api/fix-role-constraint', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // First, update any existing rows with invalid roles to 'director'
    await client.query(`
      UPDATE users 
      SET role = 'director' 
      WHERE role NOT IN ('admin', 'business_developer', 'creatives', 'director', 'sales_manager', 'assistant_sales', 'packer')
    `);
    
    // Then update the constraint
    await client.query(`
      ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
      ALTER TABLE users ADD CONSTRAINT users_role_check 
      CHECK (role IN ('admin', 'business_developer', 'creatives', 'director', 'sales_manager', 'assistant_sales', 'packer'));
    `);
    
    await client.query('COMMIT');
    res.json({ success: true, message: 'Role constraint updated successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating constraint:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// Registration endpoint with file upload (store profile picture in DB)
app.post('/api/auth/register', upload.single('profilePicture'), async (req, res) => {
  console.log('Registration request received:', {
    body: req.body,
    role: req.body.role,
    roleType: typeof req.body.role
  });

  const { name, email, password, role } = req.body;
  let profilePictureData = null;
  if (req.file) {
    profilePictureData = req.file.buffer;
  }

  // Convert role to lowercase for validation
  const roleLower = role.toLowerCase();
  console.log('Role after conversion:', {
    original: role,
    converted: roleLower
  });

  // Validate role
  const validRoles = [
    'business_developer',
    'creatives',
    'director',
    'admin',
    'sales_manager',
    'assistant_sales',
    'packer'
  ];

  console.log('Validating role:', {
    roleLower,
    isValid: validRoles.includes(roleLower),
    validRoles
  });

  if (!validRoles.includes(roleLower)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid role selected'
    });
  }

  try {
    // Check if email already exists
    const emailCheck = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (emailCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    console.log('Attempting to insert user with role:', roleLower);

    // Insert new user with profile picture data (using lowercase role)
    const result = await pool.query(
      'INSERT INTO users (name, email, password_hash, role, profile_picture_data) VALUES ($1, $2, $3, $4, $5) RETURNING user_id, name, email, role',
      [name, email, passwordHash, roleLower, profilePictureData]
    );

    const newUser = result.rows[0];

    // Create JWT token
    const token = jwt.sign(
      { 
        user_id: newUser.user_id,
        name: newUser.name,
        role: newUser.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Return success response
    res.status(201).json({
      success: true,
      token,
      user: {
        user_id: newUser.user_id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        profile_picture_data: profilePictureData ? profilePictureData.toString('base64') : null
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    console.error('Error details:', {
      code: error.code,
      message: error.message,
      detail: error.detail
    });
    // Check for specific database errors
    if (error.code === '23514') { // Check constraint violation
      res.status(400).json({
        success: false,
        message: 'Invalid role selected'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
});

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    // Get user from database
    const result = await pool.query(
      'SELECT * FROM users WHERE name = $1',
      [username]
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password'
      });
    }

    // Compare password
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password'
      });
    }

    // Create JWT token
    const token = jwt.sign(
      { 
        user_id: user.user_id,
        name: user.name,
        role: user.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Return success response with profile picture data
    res.json({
      success: true,
      token,
      user: {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        role: user.role,
        profile_picture_data: user.profile_picture_data ? user.profile_picture_data.toString('base64') : null
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// User details endpoint (return profile_picture_data as base64)
app.get('/api/user/details', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT user_id, name, email, role, created_at, profile_picture_data FROM users WHERE user_id = $1',
      [req.user.user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    const user = result.rows[0];
    user.profile_picture_data = user.profile_picture_data ? user.profile_picture_data.toString('base64') : null;
    res.json(user);
  } catch (error) {
    console.error('Error fetching user details:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Upload or change profile picture endpoint (store in DB)
app.post('/api/user/profile-picture', verifyToken, upload.single('profilePicture'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }
  const profilePictureData = req.file.buffer;
  try {
    await pool.query(
      'UPDATE users SET profile_picture_data = $1 WHERE user_id = $2',
      [profilePictureData, req.user.user_id]
    );
    res.json({ success: true, profile_picture_data: profilePictureData.toString('base64') });
  } catch (error) {
    console.error('Profile picture upload error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Add a new inventory item (with image upload to DB)
app.post('/api/inventory', upload.single('image'), async (req, res) => {
  const client = await pool.connect();
  try {
    console.log('Received inventory POST request');
    console.log('Request body:', req.body);
    console.log('Request file:', req.file ? {
      fieldname: req.file.fieldname,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    } : 'No file uploaded');

    await client.query('BEGIN');
    
    const { sku, name, description, quantity, unit_price, category } = req.body;
    let imageData = null;
    
    // Validate required fields
    if (!sku || !name || !quantity || !unit_price) {
      console.log('Missing required fields:', { sku, name, quantity, unit_price });
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields: SKU, name, quantity, and unit price are required' 
      });
    }

    if (isNaN(quantity) || isNaN(unit_price)) {
      console.log('Invalid numeric fields:', { quantity, unit_price });
      return res.status(400).json({ 
        success: false, 
        message: 'Quantity and unit price must be numbers' 
      });
    }
    
    // Process image if present
    if (req.file) {
      imageData = req.file.buffer;
      console.log('Image data read from memory, size:', imageData.length);
      
      // Validate image size (should already be validated by multer, but double-check)
      if (imageData.length > 5 * 1024 * 1024) { // 5MB limit
        throw new Error('Image size exceeds 5MB limit');
      }
    }
    
    // Check if SKU already exists
    const existingProduct = await client.query(
      'SELECT sku FROM inventory_items WHERE sku = $1 FOR UPDATE',
      [sku]
    );

    if (existingProduct.rows.length > 0) {
      console.log('Duplicate SKU found:', sku);
      return res.status(400).json({ 
        success: false, 
        message: 'A product with this SKU already exists' 
      });
    }

    console.log('Inserting new product with data:', {
      sku, name, description, quantity, unit_price, category,
      hasImage: !!imageData
    });

    // Insert the new product
    const result = await client.query(
      `INSERT INTO inventory_items 
       (sku, name, description, quantity, unit_price, category, image_data, last_updated) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW()) 
       RETURNING *`,
      [sku, name, description, Number(quantity), Number(unit_price), category, imageData]
    );
    
    await client.query('COMMIT');
    
    // Convert image data to base64 for the response
    const product = result.rows[0];
    if (product.image_data) {
      product.image_data = product.image_data.toString('base64');
    }
    
    console.log('Product inserted successfully');
    
    res.status(201).json({
      success: true,
      message: 'Product added successfully',
      product
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error adding inventory item:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to add product. ' + error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  } finally {
    client.release();
  }
});

// Edit an inventory item (with optional image upload to DB)
app.put('/api/inventory/:sku', upload.single('image'), async (req, res) => {
  const { sku } = req.params;
  const { name, description, quantity, unit_price, category } = req.body;
  let imageData = null;
  
  if (req.file) {
    imageData = req.file.buffer;
  }

  try {
    let updateQuery = 'UPDATE inventory_items SET name=$1, description=$2, quantity=$3, unit_price=$4, category=$5';
    let params = [name, description, quantity, unit_price, category];
    let paramIndex = 6;

    if (imageData) {
      updateQuery += `, image_data=$${paramIndex}`;
      params.push(imageData);
      paramIndex++;
    }

    updateQuery += `, last_updated=NOW() WHERE sku=$${paramIndex} RETURNING *`;
    params.push(sku);

    const result = await pool.query(updateQuery, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Convert image data to base64 for the response
    const product = result.rows[0];
    if (product.image_data) {
      product.image_data = product.image_data.toString('base64');
    }

    res.json(product);
  } catch (error) {
    console.error('Error editing inventory item:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Get all inventory items
app.get('/api/inventory', async (req, res) => {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT 
        sku, 
        name, 
        description, 
        quantity, 
        unit_price, 
        category, 
        last_updated,
        CASE 
          WHEN image_data IS NOT NULL THEN encode(image_data, 'base64')
          ELSE NULL 
        END as image_data
      FROM inventory_items 
      ORDER BY last_updated DESC
    `);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching inventory:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch inventory',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    client.release();
  }
});

// Delete an inventory item
app.delete('/api/inventory/:sku', async (req, res) => {
  const { sku } = req.params;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM order_products WHERE sku = $1', [sku]);
    // Do NOT delete from order_history_products to preserve archived order data
    await client.query('DELETE FROM inventory_items WHERE sku = $1', [sku]);
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error deleting inventory item:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  } finally {
    client.release();
  }
});

// Get a single inventory item by SKU (return image_data as base64)
app.get('/api/inventory/:sku', async (req, res) => {
  const { sku } = req.params;
  try {
    const result = await pool.query('SELECT * FROM inventory_items WHERE sku = $1', [sku]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    const row = result.rows[0];
    row.image_data = row.image_data ? row.image_data.toString('base64') : null;
    res.json(row);
  } catch (error) {
    console.error('Error fetching inventory item:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Get all users (admin only)
app.get('/api/users', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      console.log('Access denied: User role is not admin', req.user);
      return res.status(403).json({ success: false, message: 'Forbidden: Admin access required' });
    }

    console.log('Fetching users for admin:', req.user.user_id);
    const result = await pool.query(
      'SELECT user_id, name, email, role, created_at, profile_picture_data, is_active, deleted_at FROM users WHERE is_active = true ORDER BY created_at DESC'
    );

    console.log(`Found ${result.rows.length} active users`);
    const users = result.rows.map(user => ({
      ...user,
      profile_picture_data: user.profile_picture_data
        ? user.profile_picture_data.toString('base64')
        : null,
    }));

    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ success: false, message: 'Internal server error while fetching users' });
  }
});

// Update user (admin only)
app.put('/api/users/:user_id', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    const { user_id } = req.params;
    const { name, email, role } = req.body;
    await pool.query(
      'UPDATE users SET name=$1, email=$2, role=$3 WHERE user_id=$4',
      [name, email, role, user_id]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Delete user (admin only)
app.delete('/api/users/:user_id', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    const { user_id } = req.params;
    console.log('Attempting to delete user:', user_id);
    
    // Actually delete the user
    const result = await pool.query(
      'DELETE FROM users WHERE user_id = $1 RETURNING *',
      [user_id]
    );
    
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Basic test route
app.get('/api/test', (req, res) => {
  res.json({ message: 'Server is running!' });
});

// Create HTTP server
const server = app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

// Upgrade HTTP server to WebSocket server
server.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});

// WebSocket connection handling
wss.on('connection', (ws) => {
  console.log('New WebSocket connection established');

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log('Received message:', data);
      
      // Handle different message types
      switch (data.type) {
        case 'barcode':
          // Broadcast barcode to all connected clients
          broadcastBarcode(data.barcode);
          break;
        default:
          console.log('Unknown message type:', data.type);
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

// Broadcast barcode to all connected clients
const broadcastBarcode = (barcode) => {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({
        type: 'barcode_scanned',
        barcode: barcode
      }));
    }
  });
};

// API endpoint to receive scanned barcode
app.post('/api/inventory/scanned-barcode', (req, res) => {
  const { barcode } = req.body;
  
  if (!barcode) {
    return res.status(400).json({ error: 'Barcode is required' });
  }

  // Broadcast the barcode to all connected clients
  broadcastBarcode(barcode);
  
  res.json({ success: true });
});

// Get customer's ongoing orders
app.get('/api/orders/customer/:customer_name', async (req, res) => {
  const { customer_name } = req.params;
  
  try {
    const result = await pool.query(`
      SELECT 
        o.*, 
        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'sku', op.sku, 
              'quantity', op.quantity, 
              'profit_margin', op.profit_margin,
              'profit_estimation', op.profit_estimation,
              'name', i.name, 
              'image_data', ENCODE(i.image_data, 'base64')
            )
          ) FILTER (WHERE op.sku IS NOT NULL), '[]'
        ) AS products
      FROM orders o
      LEFT JOIN order_products op ON o.order_id = op.order_id
      LEFT JOIN inventory_items i ON op.sku = i.sku
      WHERE o.name = $1
      GROUP BY o.order_id
      ORDER BY o.order_date DESC
    `, [customer_name]);

    const orders = result.rows.map(order => ({
      ...order,
      products: order.products || []
    }));

    res.json(orders);
  } catch (error) {
    console.error('Error fetching customer orders:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get customer's order history
app.get('/api/order-history/customer/:customer_name', async (req, res) => {
  const { customer_name } = req.params;
  
  try {
    const result = await pool.query(`
      SELECT 
        oh.*, 
        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'sku', ohp.sku, 
              'quantity', ohp.quantity, 
              'unit_price', ohp.unit_price,
              'name', i.name, 
              'image_data', ENCODE(i.image_data, 'base64')
            )
          ) FILTER (WHERE ohp.sku IS NOT NULL), '[]'
        ) AS products
      FROM order_history oh
      LEFT JOIN order_history_products ohp ON oh.order_id = ohp.order_id
      LEFT JOIN inventory_items i ON ohp.sku = i.sku
      WHERE oh.customer_name = $1
      GROUP BY oh.order_id
      ORDER BY oh.order_date DESC
    `, [customer_name]);

    const orders = result.rows.map(order => ({
      ...order,
      products: order.products || []
    }));

    res.json(orders);
  } catch (error) {
    console.error('Error fetching customer order history:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all orders
app.get('/api/orders', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        o.*, 
        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'sku', op.sku, 
              'quantity', op.quantity,
              'profit_margin', op.profit_margin,
              'profit_estimation', op.profit_estimation,
              'name', i.name, 
              'image_data', ENCODE(i.image_data, 'base64')
            )
          ) FILTER (WHERE op.sku IS NOT NULL), '[]'
        ) AS products
      FROM orders o
      LEFT JOIN order_products op ON o.order_id = op.order_id
      LEFT JOIN inventory_items i ON op.sku = i.sku
      GROUP BY o.order_id
      ORDER BY o.order_date DESC
    `);

    const orders = result.rows.map(order => ({
      ...order,
      products: order.products || []
    }));

    res.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all archived orders
app.get('/api/orders/history', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        oh.*,
        COALESCE(u.name, 'Deleted User') as archived_by_name,
        u.profile_picture_data as archived_by_profile_picture,
        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'sku', ohp.sku,
              'quantity', ohp.quantity,
              'unit_price', ohp.unit_price,
              'name', i.name,
              'image_data', ENCODE(i.image_data, 'base64')
            )
          ) FILTER (WHERE ohp.sku IS NOT NULL), '[]'
        ) AS products
      FROM order_history oh
      LEFT JOIN users u ON oh.archived_by = u.user_id
      LEFT JOIN order_history_products ohp ON oh.order_id = ohp.order_id
      LEFT JOIN inventory_items i ON ohp.sku = i.sku
      GROUP BY oh.order_id, u.name, u.profile_picture_data
      ORDER BY oh.archived_at DESC
    `);
    
    const orders = result.rows.map(order => ({
      ...order,
      archived_by_profile_picture: order.archived_by_profile_picture ? order.archived_by_profile_picture.toString('base64') : null,
      products: order.products || []
    }));
    
    res.json(orders);
  } catch (err) {
    console.error('Error fetching order history:', err);
    res.status(500).json({ message: 'Failed to fetch order history' });
  }
});

// Get products for an archived order
app.get('/api/orders/history/:order_id/products', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        ohp.sku,
        ohp.quantity,
        ohp.unit_price,
        i.name,
        i.image_data,
        i.description
      FROM order_history_products ohp
      LEFT JOIN inventory_items i ON ohp.sku = i.sku
      WHERE ohp.order_id = $1
    `, [req.params.order_id]);
    
    const products = result.rows.map(row => ({
      ...row,
      image_data: row.image_data ? row.image_data.toString('base64') : null
    }));
    
    res.json(products);
  } catch (err) {
    console.error('Error fetching archived order products:', err);
    res.status(500).json({ message: 'Failed to fetch archived order products' });
  }
});

// Routes
app.use('/api/customers', customersRouter);
app.use('/api/suppliers', suppliersRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/supplier-orders', supplierOrdersRouter);

// Example of how to use real-time updates in your routes
app.post('/api/update-data', async (req, res) => {
  try {
    const { data } = req.body;
    
    // Update your database
    await pool.query('UPDATE your_table SET data = $1 WHERE id = $2', [data, req.body.id]);
    
    // Notify all connected clients about the change
    await notifyChange('data-update', { id: req.body.id, data });
    
    res.json({ success: true, message: 'Data updated successfully' });
  } catch (error) {
    console.error('Error updating data:', error);
    res.status(500).json({ success: false, message: 'Error updating data' });
  }
});

// Search inventory item by name (case-insensitive, partial match)
app.get('/api/inventory/search', async (req, res) => {
  const { name } = req.query;
  if (!name) {
    return res.status(400).json({ success: false, message: 'Missing name query parameter' });
  }

  try {
    const result = await pool.query(
      `SELECT * FROM inventory_items WHERE LOWER(name) LIKE LOWER($1) LIMIT 1`,
      [`%${name}%`]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'No matching product found' });
    }
    const row = result.rows[0];
    row.image_data = row.image_data ? row.image_data.toString('base64') : null;
    res.json(row);
  } catch (error) {
    console.error('Error searching inventory by name:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Adjust inventory quantity
app.put('/api/inventory/:sku/adjust', async (req, res) => {
  const { sku } = req.params;
  const { quantity, operation } = req.body;
  const client = await pool.connect();

  try {
    // Validate input
    if (!quantity || !operation || !['add', 'subtract'].includes(operation)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request. Quantity and operation (add/subtract) are required.'
      });
    }

    await client.query('BEGIN');

    // Get current inventory
    const result = await client.query(
      'SELECT quantity, name FROM inventory_items WHERE sku = $1 FOR UPDATE',
      [sku]
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const currentQuantity = result.rows[0].quantity;
    const productName = result.rows[0].name;
    const newQuantity = operation === 'add' 
      ? currentQuantity + Number(quantity)
      : currentQuantity - Number(quantity);

    // Check if we have enough stock for subtraction
    if (operation === 'subtract' && newQuantity < 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: `Not enough stock for ${productName}. Current quantity: ${currentQuantity}, Requested: ${quantity}`
      });
    }

    // Update inventory
    await client.query(
      'UPDATE inventory_items SET quantity = $1, last_updated = NOW() WHERE sku = $2',
      [newQuantity, sku]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: `Inventory updated successfully. New quantity: ${newQuantity}`,
      product: {
        sku,
        name: productName,
        quantity: newQuantity
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error adjusting inventory:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      details: error.message
    });
  } finally {
    client.release();
  }
});