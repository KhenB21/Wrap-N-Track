const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
// Pool now sourced from config/db.js (task requirement). Retaining wss/notifyChange from legacy db.js if still needed.
let wss, notifyChange;
const pool = require('./config/db');
try {
  // Attempt to also load websocket exports if old db.js still present
  const legacy = require('./db');
  if (legacy && legacy.wss) wss = legacy.wss;
  if (legacy && legacy.notifyChange) notifyChange = legacy.notifyChange;
} catch (e) {
  console.log('Legacy db.js (wss/notifyChange) not loaded (optional):', e.message);
}
const customersRouter = require('./routes/customers');
const otpRouter = require('./routes/otp');
const suppliersRouter = require('./routes/suppliers');
const ordersRouter = require('./routes/orders');
const supplierOrdersRouter = require('./routes/supplier-orders');
const notificationsRouter = require('./routes/notifications');
const inventoryRouter = require('./routes/inventory');
const availableInventoryRouter = require('./routes/available-inventory');

const authRouter = require('./routes/auth');
const customerRoutes = require('./routes/customer');
const employeeRouter = require('./routes/employee');
const verifyJwt = require('./middleware/verifyJwt')();
const requireRole = require('./middleware/requireRole');
require('dotenv').config({ path: __dirname + '/../.env' });


const app = express();
// Dynamic port selection: use platform-provided PORT (e.g. DigitalOcean) or fallback to 3001 locally
const port = process.env.PORT || 3001;
const portSource = process.env.PORT ? 'env:PORT' : 'default:3001';

// Immediate DB connectivity test (task requirement)
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Database connection error (initial pool.connect):', err.stack || err.message);
  } else {
    console.log('✅ Database pool connected (initial test)');
    release();
  }
});

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

// --- CORS configuration (hardened) ---
// Build the allowed origins list once. If CORS_ORIGIN env var exists, it overrides defaults.
const allowedOrigins = (process.env.CORS_ORIGIN && process.env.CORS_ORIGIN.split(',').map(o => o.trim()).filter(Boolean)) || [
  // Production deployed frontend (replace if you change deployment URL)
  'https://staticwrapntrack-tz5cu.ondigitalocean.app',
  // API origin (self) if browser ever calls directly from same host
  'https://wrapntrack-ztp8a.ondigitalocean.app',
  // Development local React
  'http://localhost:3000',
  // Legacy fallbacks (remove when no longer needed)
  'https://wrap-n-track-b6z5.vercel.app',
  'https://wrap-n-track-b6z5-git-main-khenb21s-projects.vercel.app'
];

console.log('[CORS] Allowed origins source:', process.env.CORS_ORIGIN ? 'ENV (CORS_ORIGIN)' : 'Default list');
console.log('[CORS] Allowed origins:', allowedOrigins);

const corsOptions = {
  origin: function (origin, callback) {
    // Allow server-to-server / curl / mobile requests without origin
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    console.log('[CORS] Blocked origin:', origin);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 86400
};

app.use(cors(corsOptions));

// Add headers middleware (only echo allowed origins)
app.use((req, res, next) => {
  const requestOrigin = req.headers.origin;
  if (!requestOrigin || allowedOrigins.includes(requestOrigin)) {
    if (requestOrigin) res.header('Access-Control-Allow-Origin', requestOrigin);
    res.header('Vary', 'Origin');
  }
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Add a middleware to log all requests
app.use((req, res, next) => {
  console.log('Incoming request:', {
    method: req.method,
    path: req.path,
    origin: req.headers.origin,
    headers: req.headers,
    timestamp: new Date().toISOString()
  });
  next();
});

app.use(express.json());

// Routes
app.use('/api/customers', customersRouter);
// OTP routes: new canonical path /api/otp plus legacy /api/customers for backward compatibility
app.use('/api/otp', otpRouter);            // new preferred mount
app.use('/api/customers', otpRouter);      // legacy alias (remove after frontend fully migrated)
app.use('/api/suppliers', suppliersRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/supplier-orders', supplierOrdersRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/auth', authRouter);
app.use('/api/customer', customerRoutes);
app.use('/api/inventory', inventoryRouter);
app.use('/api/available-inventory', availableInventoryRouter);
// Employee-only routes (protected)
app.use('/api/employee', verifyJwt, requireRole(['admin','business_developer','creatives','director','sales_manager','assistant_sales','packer']), employeeRouter);

// Add error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  console.error('Request details:', {
    method: req.method,
    path: req.path,
    origin: req.headers.origin,
    headers: req.headers,
    timestamp: new Date().toISOString()
  });
  console.error('Error details:', {
    code: err.code,
    message: err.message,
    stack: err.stack
  });
  res.status(500).json({
    success: false,
    message: err.message || 'Internal server error'
  });
});

// Test database connection
pool.connect((err, client, release) => {
  if (err) {
    console.error('Error acquiring client', err.stack);
    console.error('Database connection details:', {
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT || 5432,
      // Don't log the actual password
      hasPassword: !!process.env.DB_PASSWORD,
      hasDatabaseUrl: !!process.env.DATABASE_URL
    });
    console.error('Full error:', err);
    process.exit(1);
  }
  console.log('Successfully connected to PostgreSQL database');
  console.log('Database connection details:', {
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 5432,
    // Don't log the actual password
    hasPassword: !!process.env.DB_PASSWORD,
    hasDatabaseUrl: !!process.env.DATABASE_URL
  });

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


// Add this before the registration endpoint
app.get('/api/test/env', async (req, res) => {
  try {
    // Only return non-sensitive environment information
    const envInfo = {
      NODE_ENV: process.env.NODE_ENV,
      PORT: process.env.PORT,
      DATABASE_URL: process.env.DATABASE_URL ? 'Set' : 'Not Set',
      JWT_SECRET: process.env.JWT_SECRET ? 'Set' : 'Not Set',
      CORS_ORIGIN: process.env.CORS_ORIGIN ? 'Set' : 'Not Set',
      // Add server info
      SERVER_TIME: new Date().toISOString(),
      SERVER_TIMEZONE: Intl.DateTimeFormat().resolvedOptions().timeZone,
      DATABASE_CONNECTED: pool.totalCount > 0
    };
    
    res.json({
      success: true,
      environment: envInfo
    });
  } catch (error) {
    console.error('Error checking environment:', error);
    console.error('Error details:', {
      code: error.code,
      message: error.message,
      stack: error.stack
    });
    res.status(500).json({ 
      success: false, 
      message: 'Error checking environment',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });

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
  console.log('Login attempt received:', {
    body: req.body,
    origin: req.headers.origin,
    headers: req.headers
  });

  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: 'Username and password are required'
    });
  }

  try {
    // Get user from database
    const result = await pool.query(
      'SELECT * FROM users WHERE name = $1',
      [username]
    );

    const user = result.rows[0];

    if (!user) {
      console.log('Login failed: User not found');
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password'
      });
    }

    // Compare password
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      console.log('Login failed: Invalid password');
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

    console.log('Login successful for user:', username);

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
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Email verification endpoint
app.post('/api/auth/verify', async (req, res) => {
  const { email, code } = req.body;

  if (!email || !code) {
    return res.status(400).json({ success: false, message: 'Email and verification code are required.' });
  }

  try {
    const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const user = userResult.rows[0];

    if (user.is_email_verified) {
      return res.status(400).json({ success: false, message: 'Email is already verified.' });
    }

    // Check if 'email_verification_code' and 'email_verification_expires_at' columns exist before querying them
    // This is a placeholder check; ideally, these columns should be guaranteed by migrations.
    if (user.email_verification_code === undefined || user.email_verification_expires_at === undefined) {
        console.error('Missing email verification columns in users table for user:', email);
        return res.status(500).json({ success: false, message: 'Server configuration error for email verification.' });
    }

    if (user.email_verification_code !== code) {
      return res.status(400).json({ success: false, message: 'Invalid verification code.' });
    }

    if (new Date() > new Date(user.email_verification_expires_at)) {
      return res.status(400).json({ success: false, message: 'Verification code has expired.' });
    }

    // Mark email as verified and clear the code
    await pool.query(
      'UPDATE users SET is_email_verified = TRUE, email_verification_code = NULL, email_verification_expires_at = NULL WHERE user_id = $1',
      [user.user_id]
    );

    res.json({ success: true, message: 'Email successfully verified.' });

  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ success: false, message: 'Internal server error during email verification.' });
  }
});

// Resend verification code endpoint
app.post('/api/auth/resend-code', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ success: false, message: 'Email is required.' });
  }

  try {
    const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const user = userResult.rows[0];

    if (user.is_email_verified) {
      return res.status(400).json({ success: false, message: 'Email is already verified.' });
    }

    // Generate new verification code (e.g., 6-digit number)
    const verificationCode = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // Code expires in 15 minutes

    await pool.query(
      'UPDATE users SET email_verification_code = $1, email_verification_expires_at = $2 WHERE user_id = $3',
      [verificationCode, expiresAt, user.user_id]
    );

    // Send email using nodemailer
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: 'Your Email Verification Code for Wrap N\' Track',
      text: `Hello ${user.name},

Your email verification code is: ${verificationCode}

This code will expire in 15 minutes.

If you did not request this, please ignore this email.

Thanks,
The Wrap N' Track Team`,
      html: `<p>Hello ${user.name},</p><p>Your email verification code is: <strong>${verificationCode}</strong></p><p>This code will expire in 15 minutes.</p><p>If you did not request this, please ignore this email.</p><p>Thanks,<br/>The Wrap N' Track Team</p>`
    };

    await transporter.sendMail(mailOptions);

    res.json({ success: true, message: 'New verification code sent to your email.' });

  } catch (error) {
    console.error('Error resending verification code:', error);
    if (error.code === 'EENVELOPE' || error.responseCode === 550) {
        return res.status(500).json({ success: false, message: 'Failed to send verification email. Please check server email configuration or recipient address.' });
    }
    res.status(500).json({ success: false, message: 'Internal server error while resending code.' });
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
    
    const { sku, name, description, quantity, unit_price, category, uom, conversion_qty, expiration } = req.body;
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
    
    // Check if SKU already exists for potential update
    const { isUpdate } = req.body; // Hint from frontend, but DB check is source of truth
    const existingProductQuery = await client.query(
      'SELECT * FROM inventory_items WHERE sku = $1',
      [sku]
    );

    let product;
    let message;
    let statusCode = 200;

    if (existingProductQuery.rows.length > 0) {
      // Product exists, so UPDATE
      console.log('Product SKU exists, attempting update:', sku);
      // const existingProductData = existingProductQuery.rows[0]; // Not strictly needed with new logic
      let updateFieldsArray = []; // To store "column = $N" parts
      const queryParams = [];
      let paramIndex = 1;

      // Dynamically build the SET part of the UPDATE query based on provided fields
      if (name !== undefined) {
        updateFieldsArray.push(`name = $${paramIndex++}`);
        queryParams.push(name);
      }
      if (description !== undefined) {
        updateFieldsArray.push(`description = $${paramIndex++}`);
        queryParams.push(description);
      }
      if (quantity !== undefined) {
        updateFieldsArray.push(`quantity = $${paramIndex++}`);
        queryParams.push(Number(quantity));
      }
      if (unit_price !== undefined) {
        updateFieldsArray.push(`unit_price = $${paramIndex++}`);
        queryParams.push(Number(unit_price));
      }
      if (category !== undefined) {
        updateFieldsArray.push(`category = $${paramIndex++}`);
        queryParams.push(category);
      }
      if (uom !== undefined) {
        updateFieldsArray.push(`uom = $${paramIndex++}`);
        queryParams.push(uom);
      }
      if (conversion_qty !== undefined) {
        updateFieldsArray.push(`conversion_qty = $${paramIndex++}`);
        queryParams.push(conversion_qty === '' ? null : Number(conversion_qty));
      }
      if (expiration !== undefined) {
        updateFieldsArray.push(`expiration = $${paramIndex++}`);
        queryParams.push(expiration === '' ? null : expiration);
      }

      if (req.file) {
        updateFieldsArray.push(`image_data = $${paramIndex++}`);
        queryParams.push(imageData); // imageData is req.file.buffer
      } else if (req.body.removeImage === 'true') { 
        // Frontend can send removeImage: 'true' to clear the image
        updateFieldsArray.push(`image_data = $${paramIndex++}`);
        queryParams.push(null);
      }
      // If no new image and no explicit removal, image_data column is not touched by these conditions.
      
      if (updateFieldsArray.length === 0 && !req.file && req.body.removeImage !== 'true') {
        // No actual data fields were sent for update, and no image changes requested.
        // We will still update last_updated as a 'touch' operation.
        console.log('Update request for SKU:', sku, 'contained no new data fields; only updating last_updated.');
      }
      
      // Always include last_updated in the update
      updateFieldsArray.push(`last_updated = NOW()`);
      
      let updateQuery = `UPDATE inventory_items SET ${updateFieldsArray.join(', ')} WHERE sku = $${paramIndex++} RETURNING *`;
      queryParams.push(sku); // Add sku for the WHERE clause
      
      console.log('Update Query:', updateQuery);
      console.log('Update Params:', queryParams);

      const result = await client.query(updateQuery, queryParams);
      product = result.rows[0];
      message = 'Product updated successfully';
      statusCode = 200;
      console.log('Product updated successfully:', product.sku);

    } else {
      // Product does not exist, so INSERT
      console.log('Inserting new product with data:', {
        sku, name, description, quantity, unit_price, category, uom,
        hasImage: !!imageData
      });
      const result = await client.query(
        `INSERT INTO inventory_items 
         (sku, name, description, quantity, unit_price, category, uom, conversion_qty, expiration, image_data, last_updated) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW()) 
         RETURNING *`,
        [sku, name, description, Number(quantity), Number(unit_price), category, uom, conversion_qty === '' ? null : Number(conversion_qty), expiration === '' ? null : expiration, imageData]
      );
      product = result.rows[0];
      message = 'Product added successfully';
      statusCode = 201;
      console.log('Product inserted successfully:', product.sku);
    }
    
    await client.query('COMMIT');
    
    if (product.image_data) {
      product.image_data = product.image_data.toString('base64');
    }
    
    res.status(statusCode).json({
      success: true,
      message,
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

// Get all inventory items
app.get('/api/inventory', async (req, res) => {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT 
        i.sku, 
        i.name, 
        i.description, 
        i.quantity, 
        i.unit_price, 
        i.category, 
        i.last_updated,
        i.uom,
        i.conversion_qty,
        i.expiration,
        CASE 
          WHEN i.image_data IS NOT NULL THEN encode(i.image_data, 'base64')
          ELSE NULL 
        END as image_data,
        COALESCE(SUM(CASE WHEN o.status IN ('Pending', 'To be pack', 'To be ship', 'Out for Delivery') THEN op.quantity ELSE 0 END), 0) AS ordered_quantity
      FROM 
        inventory_items i
      LEFT JOIN 
        order_products op ON i.sku = op.sku
      LEFT JOIN 
        orders o ON op.order_id = o.order_id
      GROUP BY 
        i.sku, i.name, i.description, i.quantity, i.unit_price, i.category, i.last_updated, i.uom, i.conversion_qty, i.expiration, i.image_data
      ORDER BY 
        i.last_updated DESC
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

    // Check if email already exists for another user
    const emailCheck = await pool.query(
      'SELECT user_id FROM users WHERE email = $1 AND user_id != $2',
      [email, user_id]
    );
    if (emailCheck.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    // Check if name already exists for another user
    const nameCheck = await pool.query(
      'SELECT user_id FROM users WHERE name = $1 AND user_id != $2',
      [name, user_id]
    );
    if (nameCheck.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'Name already taken' });
    }

    await pool.query(
      'UPDATE users SET name=$1, email=$2, role=$3 WHERE user_id=$4',
      [name, email, role, user_id]
    );
    res.json({ success: true, message: 'User updated successfully' });
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

// Lightweight root/health endpoint (no auth, minimal payload for uptime checks)
app.get('/', (req, res) => {
  res.json({
    service: 'wrap-n-track-api',
    status: 'ok',
    time: new Date().toISOString(),
    uptime_seconds: process.uptime()
  });
});

// Create HTTP server
const server = app.listen(port, () => {
  console.log(`[Startup] API listening on port ${port} (${portSource}) | NODE_ENV=${process.env.NODE_ENV || 'development'} | PID=${process.pid}`);
  console.log('[Startup] If deployed (e.g. DigitalOcean App Platform), PORT is injected via environment.');
});

// Error handling for the server
server.on('error', (error) => {
  console.error('Server error:', error);
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${port} is already in use`);
    process.exit(1);
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Don't exit the process in production
  if (process.env.NODE_ENV !== 'production') {
    process.exit(1);
  }
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit the process in production
  if (process.env.NODE_ENV !== 'production') {
    process.exit(1);
  }
});

// Upgrade HTTP server to WebSocket server
server.on('upgrade', (request, socket, head) => {
  if (!wss) {
    socket.destroy();
    return;
  }
  try {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } catch (e) {
    console.error('WebSocket upgrade failed:', e.message);
    try { socket.destroy(); } catch(_) {}
  }
});

// WebSocket connection handling
if (wss) {
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
} else {
  console.log('WebSocket server (wss) not initialized; skipping connection handler setup.');
}

// Broadcast barcode to all connected clients
const broadcastBarcode = (barcode) => {
  if (!wss) return; // silently ignore if websocket not available
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ type: 'barcode_scanned', barcode }));
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
              'line_id', op.line_id,
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
              'line_id', op.line_id,
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

// --- PASSWORD RESET ENDPOINTS ---

// Forgot Password: Generate and store reset code and send via email
app.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email is required" });

  try {
    // Fetch all user columns to match registration resend flow
    const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userResult.rows.length === 0) {
      // Always respond the same to avoid leaking which emails are registered
      return res.json({ message: "If this email exists, instructions have been sent." });
    }

    const user = userResult.rows[0];
    // Generate secure OTP using crypto.randomInt (same as registration)
    const resetCode = crypto.randomInt(100000, 999999).toString();
    const expires = new Date(Date.now() + 15 * 60 * 1000);

    // Store code and expiry
    await pool.query('UPDATE users SET reset_code = $1, reset_code_expires = $2 WHERE user_id = $3', [resetCode, expires, user.user_id]);

    // Nodemailer transporter (same as registration resend-code)
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    // Email content (match registration resend-code)
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: "Your Password Reset Code for Wrap N' Track",
      text: `Hello ${user.name},\n\nYour password reset code is: ${resetCode}\n\nThis code will expire in 15 minutes.\n\nIf you did not request this, please ignore this email.\n\nThanks,\nThe Wrap N' Track Team`,
      html: `<p>Hello ${user.name},</p><p>Your password reset code is: <strong>${resetCode}</strong></p><p>This code will expire in 15 minutes.</p><p>If you did not request this, please ignore this email.</p><p>Thanks,<br/>The Wrap N' Track Team</p>`
    };

    try {
      await transporter.sendMail(mailOptions);
    } catch (emailError) {
      console.error('Error sending forgot password email:', emailError);
      if (emailError.code === 'EENVELOPE' || emailError.responseCode === 550) {
        return res.status(500).json({ message: 'Failed to send reset email. Please check server email configuration or recipient address.' });
      }
      return res.status(500).json({ message: 'Internal server error while sending reset code.' });
    }

    return res.json({ message: "If this email exists, instructions have been sent." });
  } catch (err) {
    console.error('Forgot password error:', err);
    return res.status(500).json({ message: "Server error" });
  }
});

// Verify Reset Code
app.post('/api/auth/verify-reset-code', async (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) return res.status(400).json({ message: "Email and code are required" });

  try {
    const userResult = await pool.query(
      'SELECT reset_code, reset_code_expires FROM users WHERE email = $1',
      [email]
    );
    if (userResult.rows.length === 0) {
      return res.status(400).json({ message: "Invalid code or email" });
    }
    const { reset_code, reset_code_expires } = userResult.rows[0];
    if (
      !reset_code ||
      reset_code !== code ||
      !reset_code_expires ||
      new Date(reset_code_expires) < new Date()
    ) {
      return res.status(400).json({ message: "Invalid or expired code" });
    }
    return res.json({ message: "Code verified" });
  } catch (err) {
    console.error('Verify reset code error:', err);
    return res.status(500).json({ message: "Server error" });
  }
});

// Reset Password: Update password after verifying code
app.post('/api/auth/reset-password', async (req, res) => {
  const { email, code, newPassword } = req.body;
  if (!email || !code || !newPassword) {
    return res.status(400).json({ message: "Email, code, and new password are required" });
  }
  try {
    // Check code validity
    const userResult = await pool.query(
      'SELECT user_id, reset_code, reset_code_expires FROM users WHERE email = $1',
      [email]
    );
    if (userResult.rows.length === 0) {
      return res.status(400).json({ message: "Invalid email or code" });
    }
    const { user_id, reset_code, reset_code_expires } = userResult.rows[0];
    if (
      !reset_code ||
      reset_code !== code ||
      !reset_code_expires ||
      new Date(reset_code_expires) < new Date()
    ) {
      return res.status(400).json({ message: "Invalid or expired code" });
    }
    // Hash new password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);
    // Update password and clear reset code
    await pool.query(
      'UPDATE users SET password_hash = $1, reset_code = NULL, reset_code_expires = NULL WHERE user_id = $2',
      [passwordHash, user_id]
    );
    res.json({ message: "Password reset successful" });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ message: "Server error" });
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


// GET all inventory items with ordered and delivered quantities
app.get('/api/inventory', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        i.sku,
        i.name,
        i.description,
        i.quantity,
        i.unit_price,
        i.category,
        i.supplier_id,
        i.image_data,
        i.last_updated,
        i.reorder_level,
        i.location,
        i.barcode,
        i.weight,
        i.dimensions,
        i.color,
        i.material,
        i.brand,
        i.expiration_date,
        i.cost_price,
        i.markup_percentage,
        i.tags,
        i.status AS item_status, -- Renamed to avoid conflict with order status
        i.minimum_stock_level,
        i.maximum_stock_level,
        i.notes,
        i.custom_fields,
        i.is_active,
        i.lead_time_days,
        i.safety_stock_days,
        i.purchase_unit,
        i.sale_unit,
        i.conversion_factor,
        i.is_serialized,
        i.is_batch_tracked,
        i.is_consignment,
        i.is_discontinued,
        i.created_at,
        i.updated_at,
        i.archived_at,
        COALESCE(SUM(CASE 
                       WHEN o.status NOT IN ('DELIVERED', 'COMPLETED', 'CANCELLED') 
                       THEN op.quantity 
                       ELSE 0 
                     END), 0) AS ordered_quantity,
        COALESCE(SUM(CASE 
                       WHEN o.status IN ('DELIVERED', 'COMPLETED') 
                       THEN op.quantity 
                       ELSE 0 
                     END), 0) AS delivered_quantity
      FROM inventory_items i
      LEFT JOIN order_products op ON i.sku = op.sku
      LEFT JOIN orders o ON op.order_id = o.order_id
      GROUP BY 
        i.sku, i.name, i.description, i.quantity, i.unit_price, i.category, i.supplier_id, i.image_data, i.last_updated, 
        i.reorder_level, i.location, i.barcode, i.weight, i.dimensions, i.color, i.material, i.brand, i.expiration_date, 
        i.cost_price, i.markup_percentage, i.tags, i.status, i.minimum_stock_level, i.maximum_stock_level, i.notes, 
        i.custom_fields, i.is_active, i.lead_time_days, i.safety_stock_days, i.purchase_unit, i.sale_unit, 
        i.conversion_factor, i.is_serialized, i.is_batch_tracked, i.is_consignment, i.is_discontinued, 
        i.created_at, i.updated_at, i.archived_at
      ORDER BY i.name ASC;
    `);
    
    const inventory = result.rows.map(item => ({
      ...item,
      image_data: item.image_data ? item.image_data.toString('base64') : null,
      ordered_quantity: parseInt(item.ordered_quantity, 10),
      delivered_quantity: parseInt(item.delivered_quantity, 10)
    }));
    
    res.json(inventory);
  } catch (error) {
    console.error('Error fetching inventory:', error);
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
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

// Add stock to an existing inventory item
app.post('/api/inventory/add-stock', async (req, res) => {
    const { sku, quantityToAdd } = req.body;
    const client = await pool.connect();

    try {
        if (!sku || quantityToAdd === undefined || isNaN(Number(quantityToAdd))) {
            return res.status(400).json({
                success: false,
                message: 'Invalid request. SKU and a numeric quantityToAdd are required.'
            });
        }

        const quantity = Number(quantityToAdd);
        if (quantity <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Quantity to add must be a positive number.'
            });
        }

        await client.query('BEGIN');

        const result = await client.query(
            'UPDATE inventory_items SET quantity = quantity + $1, last_updated = NOW() WHERE sku = $2 RETURNING *',
            [quantity, sku]
        );

        if (result.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        await client.query('COMMIT');

        const updatedProduct = result.rows[0];
        if (updatedProduct.image_data) {
            updatedProduct.image_data = updatedProduct.image_data.toString('base64');
        }

        res.json({
            success: true,
            message: 'Stock added successfully.',
            product: updatedProduct
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error adding stock:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            details: error.message
        });
    } finally {
        client.release();
    }
});
