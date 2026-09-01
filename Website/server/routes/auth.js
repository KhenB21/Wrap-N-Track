const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Resend } = require('resend');
const crypto = require('crypto');
// Use centralized pool from config/db to avoid undefined imports
const pool = require('../config/db');
// dotenv is loaded once at startup in index.js — no second call needed here.

// Resend email client
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

async function sendEmail(mailOptions) {
  if (!resend) {
    console.log('Email skipped (no RESEND_API_KEY). To:', mailOptions.to);
    return;
  }

  const { error } = await resend.emails.send({
    from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
    to: mailOptions.to,
    subject: mailOptions.subject,
    html: mailOptions.html
  });

  if (error) {
    throw new Error(error.message || 'Resend send failed');
  }
}

// Generate verification code
const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Store verification codes (in production, use Redis or a database)
const verificationCodes = new Map();

// Derives a unique login username from the customer's email since the login
// flow still looks accounts up by username — the simplified signup form only
// collects name/email/password, so this keeps the DB/login contract intact
// without exposing a username field to the user.
async function generateUniqueUsername(email) {
  const base = String(email).split('@')[0].replace(/[^a-zA-Z0-9_]/g, '').slice(0, 16) || 'user';
  let candidate = base;
  for (let attempt = 0; attempt < 20; attempt++) {
    const existing = await pool.query('SELECT 1 FROM customer_details WHERE username = $1', [candidate]);
    if (existing.rows.length === 0) return candidate;
    candidate = `${base}${Math.floor(1000 + Math.random() * 9000)}`;
  }
  // Extremely unlikely fallback if 20 random suffixes all collided.
  return `${base}${Date.now()}`;
}

// Register customer
// Simplified, minimal signup: name, email, password only. Everything else
// (phone, address, region/city/barangay, profile picture) is collected later
// — address at checkout time (see requireVerifiedCustomer in customer-orders.js),
// and the rest from the profile page. Accounts start unverified; verification
// is enforced only when the customer tries to place an order, not at signup.
router.post('/customer/register', async (req, res) => {
  const { name, email, password } = req.body;

  const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
  const fullName = String(name || '').trim();

  if (!fullName) {
    return res.status(400).json({ success: false, message: 'Please enter your name.' });
  }

  if (!emailRegex.test(String(email || '').trim())) {
    return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
  }

  const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;
  if (!passwordPattern.test(String(password || ''))) {
    return res.status(400).json({
      success: false,
      message: 'Password must be at least 8 characters and include at least 1 uppercase, 1 lowercase, 1 number, and 1 symbol.'
    });
  }

  try {
    const emailCheck = await pool.query(
      'SELECT 1 FROM customer_details WHERE email_address = $1',
      [email.trim()]
    );

    if (emailCheck.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    const username = await generateUniqueUsername(email.trim());
    const passwordHash = await bcrypt.hash(password, 10);

    const verificationCode = generateVerificationCode();
    verificationCodes.set(email.trim(), { code: verificationCode, timestamp: Date.now() });

    const result = await pool.query(
      `INSERT INTO customer_details (
        username, name, email_address, password_hash, is_verified
      ) VALUES ($1, $2, $3, $4, false)
      RETURNING customer_id, username, name, email_address, phone_number, address`,
      [username, fullName, email.trim(), passwordHash]
    );

    try {
      await sendEmail({
        to: email.trim(),
        subject: 'Verify your email address',
        html: `
          <h1>Welcome to Wrap N' Track!</h1>
          <p>Please use the following code to verify your email address:</p>
          <h2>${verificationCode}</h2>
          <p>This code will expire in 10 minutes.</p>
        `
      });
    } catch (emailError) {
      console.error('Verification email send failed (registration still succeeds):', emailError);
    }

    const newCustomer = result.rows[0];

    // Auto-login: the account exists and is usable immediately (unverified).
    // Verification is only enforced later, when the customer tries to order.
    const token = jwt.sign({
      customer_id: newCustomer.customer_id,
      username: newCustomer.username,
      name: newCustomer.name,
      email: newCustomer.email_address,
      role: 'customer'
    }, process.env.JWT_SECRET, { expiresIn: '24h' });

    res.status(201).json({
      success: true,
      message: 'Registration successful.',
      token,
      customer: {
        customer_id: newCustomer.customer_id,
        username: newCustomer.username,
        name: newCustomer.name,
        email: newCustomer.email_address,
        phone_number: newCustomer.phone_number,
        address: newCustomer.address,
        is_verified: false,
        role: 'customer'
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, message: 'Registration failed. Please try again.' });
  }
});

// Verify email
router.post('/customer/verify', async (req, res) => {
  const { email, code } = req.body;

  try {
    const storedData = verificationCodes.get(email);
    
    if (!storedData) {
      return res.status(400).json({
        success: false,
        message: 'No verification code found for this email'
      });
    }

    // Check if code has expired (10 minutes)
    if (Date.now() - storedData.timestamp > 10 * 60 * 1000) {
      verificationCodes.delete(email);
      return res.status(400).json({
        success: false,
        message: 'Verification code has expired'
      });
    }

    if (storedData.code !== code) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification code'
      });
    }

    // Update customer verification status
    await pool.query(
      'UPDATE customer_details SET is_verified = true WHERE email_address = $1',
      [email]
    );

    // Remove used code
    verificationCodes.delete(email);

    res.json({
      success: true,
      message: 'Email verified successfully'
    });

  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Verification failed. Please try again.'
    });
  }
});

// Resend verification code
router.post('/customer/resend-code', async (req, res) => {
  const { email } = req.body;

  try {
    // Check if user exists and is not verified
    const userCheck = await pool.query(
      'SELECT * FROM customer_details WHERE email_address = $1 AND is_verified = false',
      [email]
    );

    if (userCheck.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No unverified account found with this email'
      });
    }

    // Generate new verification code
    const verificationCode = generateVerificationCode();
    verificationCodes.set(email, {
      code: verificationCode,
      timestamp: Date.now()
    });

    // Send new verification email
    await sendEmail({
      to: email,
      subject: 'New verification code',
      html: `
        <h1>Wrap N' Track - New Verification Code</h1>
        <p>Please use the following code to verify your email address:</p>
        <h2>${verificationCode}</h2>
        <p>This code will expire in 10 minutes.</p>
      `
    });

    res.json({
      success: true,
      message: 'New verification code sent successfully'
    });

  } catch (error) {
    console.error('Resend code error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resend verification code'
    });
  }
});

// Customer login (now also allows employee login using same form)
router.post('/customer/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    // 1. Try customer_details by username OR email — signup only asks for an
    // email (username is auto-generated and never shown), so login has to
    // accept whichever identifier the customer actually has.
    const customerResult = await pool.query(
      'SELECT * FROM customer_details WHERE username = $1 OR LOWER(email_address) = LOWER($1)',
      [username]
    );

    if (customerResult.rows.length > 0) {
      const customer = customerResult.rows[0];
      const validPassword = await bcrypt.compare(password, customer.password_hash);
      if (!validPassword) {
        return res.status(401).json({ success: false, message: 'Invalid username or password' });
      }
      const token = jwt.sign({
        customer_id: customer.customer_id,
        username: customer.username,
        name: customer.name,
        email: customer.email_address,
        role: 'customer'
      }, process.env.JWT_SECRET, { expiresIn: '24h' });
      return res.json({
        success: true,
        token,
        customer: {
          customer_id: customer.customer_id,
          username: customer.username,
          name: customer.name,
          email: customer.email_address,
          phone_number: customer.phone_number,
          address: customer.address,
          house_street_number: customer.house_street_number,
          region: customer.region,
          region_code: customer.region_code,
          city: customer.city,
          city_code: customer.city_code,
          barangay: customer.barangay,
          barangay_code: customer.barangay_code,
          postal_code: customer.postal_code,
          role: 'customer'
        }
      });
    }

    // 2. Fallback: treat username as employee 'name' in users table
    const employeeResult = await pool.query(
      'SELECT * FROM users WHERE name = $1',
      [username]
    );
    if (employeeResult.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid username or password' });
    }
    const user = employeeResult.rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ success: false, message: 'Invalid username or password' });
    }
    const lastLoginResult = await pool.query(
      'UPDATE users SET last_login = NOW() WHERE user_id = $1 RETURNING last_login',
      [user.user_id]
    );
    user.last_login = lastLoginResult.rows[0].last_login;
    const token = jwt.sign({
      user_id: user.user_id,
      name: user.name,
      role: user.role,
      email: user.email
    }, process.env.JWT_SECRET, { expiresIn: '24h' });
    return res.json({
      success: true,
      token,
      employee: {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Unified customer/employee login error:', error);
    res.status(500).json({ success: false, message: 'Login failed. Please try again.' });
  }
});

// Check if email exists
router.get('/check-email', async (req, res) => {
  const { email } = req.query;

  try {
    const result = await pool.query(
      'SELECT * FROM customer_details WHERE email_address = $1',
      [email]
    );

    res.json({
      exists: result.rows.length > 0
    });
  } catch (error) {
    console.error('Email check error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check email'
    });
  }
});

// Name uniqueness check removed - multiple users can have the same name

// Check if username exists
router.get('/check-username', async (req, res) => {
  const { username } = req.query;

  try {
    const result = await pool.query(
      'SELECT * FROM customer_details WHERE username = $1',
      [username]
    );

    res.json({
      exists: result.rows.length > 0
    });
  } catch (error) {
    console.error('Username check error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check username'
    });
  }
});

// Get user's email by username
router.get('/customer/get-email/:username', async (req, res) => {
  const { username } = req.params;

  try {
    const result = await pool.query(
      'SELECT email_address FROM customer_details WHERE username = $1',
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      email: result.rows[0].email_address
    });
  } catch (error) {
    console.error('Get email error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user email'
    });
  }
});


// Change password from login/forgot-password flow using existing password
router.post('/change-password-with-current', async (req, res) => {
  const { username, currentPassword, newPassword } = req.body;

  if (!username || !currentPassword || !newPassword) {
    return res.status(400).json({ success: false, message: 'Username, existing password, and new password are required' });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ success: false, message: 'New password must be at least 8 characters long' });
  }

  try {
    const customerResult = await pool.query('SELECT customer_id, password_hash FROM customer_details WHERE username = $1', [username]);
    if (customerResult.rows.length > 0) {
      const customer = customerResult.rows[0];
      const validPassword = await bcrypt.compare(currentPassword, customer.password_hash);
      if (!validPassword) {
        return res.status(400).json({ success: false, message: 'Existing password is incorrect' });
      }
      const passwordHash = await bcrypt.hash(newPassword, 10);
      await pool.query('UPDATE customer_details SET password_hash = $1 WHERE customer_id = $2', [passwordHash, customer.customer_id]);
      return res.json({ success: true, message: 'Password changed successfully' });
    }

    const employeeResult = await pool.query('SELECT user_id, password_hash FROM users WHERE name = $1', [username]);
    if (employeeResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Account not found' });
    }

    const employee = employeeResult.rows[0];
    const validPassword = await bcrypt.compare(currentPassword, employee.password_hash);
    if (!validPassword) {
      return res.status(400).json({ success: false, message: 'Existing password is incorrect' });
    }
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password_hash = $1 WHERE user_id = $2', [passwordHash, employee.user_id]);
    return res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password with current error:', error);
    return res.status(500).json({ success: false, message: 'Failed to change password' });
  }
});

module.exports = router; 

