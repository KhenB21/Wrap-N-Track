const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const multer = require('multer');
const { pool } = require('../db');
require('dotenv').config();

// Configure multer for memory storage
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

// Create nodemailer transporter
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  },
  tls: {
    rejectUnauthorized: false
  }
});

// Verify transporter configuration
transporter.verify(function(error, success) {
  if (error) {
    console.error('SMTP configuration error:', error);
  } else {
    console.log('SMTP server is ready to take our messages');
  }
});

// Generate verification code
const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Store verification codes (in production, use Redis or a database)
const verificationCodes = new Map();

// Register customer
router.post('/customer/register', upload.single('profilePicture'), async (req, res) => {
  console.log('Registration request received:', {
    body: req.body,
    file: req.file ? {
      fieldname: req.file.fieldname,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    } : 'No file uploaded'
  });

  const { username, name, email, password, phone_number, address } = req.body;
  let profilePictureData = null;

  if (req.file) {
    profilePictureData = req.file.buffer;
  }

  try {
    // Check if username exists
    console.log('Checking if username exists:', username);
    const usernameCheck = await pool.query(
      'SELECT * FROM customer_details WHERE username = $1',
      [username]
    );

    if (usernameCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Username already taken'
      });
    }

    // Check if email exists
    console.log('Checking if email exists:', email);
    const emailCheck = await pool.query(
      'SELECT * FROM customer_details WHERE email_address = $1',
      [email]
    );

    if (emailCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }

    // Hash password
    console.log('Hashing password...');
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Generate verification code
    console.log('Generating verification code...');
    const verificationCode = generateVerificationCode();
    verificationCodes.set(email, {
      code: verificationCode,
      timestamp: Date.now()
    });

    // Insert new customer
    console.log('Inserting new customer into database...');
    const result = await pool.query(
      'INSERT INTO customer_details (username, name, email_address, password_hash, is_verified, profile_picture_data, phone_number, address) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING customer_id, username, name, email_address, phone_number, address',
      [username, name, email, passwordHash, false, profilePictureData, phone_number, address]
    );

    let emailSent = false;
    try {
      // Send verification email
      console.log('Sending verification email to:', email);
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Verify your email address',
        html: `
          <h1>Welcome to Wrap N' Track!</h1>
          <p>Please use the following code to verify your email address:</p>
          <h2>${verificationCode}</h2>
          <p>This code will expire in 10 minutes.</p>
        `
      };

      await transporter.sendMail(mailOptions);
      console.log('Verification email sent successfully');
      emailSent = true;
    } catch (emailError) {
      console.error('Email sending error:', emailError);
      // Continue with registration even if email fails
      console.log('Continuing with registration despite email error');
    }

    const newCustomer = result.rows[0];
    console.log('Customer registered successfully:', newCustomer);

    res.status(201).json({
      success: true,
      message: emailSent 
        ? 'Registration successful. Please check your email for verification code.'
        : 'Registration successful. Please contact support for verification.',
      customer: {
        customer_id: newCustomer.customer_id,
        username: newCustomer.username,
        name: newCustomer.name,
        email: newCustomer.email_address,
        phone_number: newCustomer.phone_number,
        address: newCustomer.address
      }
    });

  } catch (error) {
    console.error('Registration error details:', {
      message: error.message,
      stack: error.stack,
      emailConfig: {
        user: process.env.EMAIL_USER,
        hasPassword: !!process.env.EMAIL_PASSWORD
      },
      requestBody: {
        username: req.body.username,
        name: req.body.name,
        email: req.body.email,
        hasPassword: !!req.body.password
      },
      databaseError: error.code === '23505' ? 'Unique constraint violation' : 'Other database error'
    });
    res.status(500).json({
      success: false,
      message: 'Registration failed. Please try again.'
    });
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
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'New verification code',
      html: `
        <h1>Wrap N' Track - New Verification Code</h1>
        <p>Please use the following code to verify your email address:</p>
        <h2>${verificationCode}</h2>
        <p>This code will expire in 10 minutes.</p>
      `
    };

    await transporter.sendMail(mailOptions);

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

// Customer login
router.post('/customer/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    // Find customer by username
    const result = await pool.query(
      'SELECT * FROM customer_details WHERE username = $1',
      [username]
    );

    if (result.rows.length === 0) {
      console.log(`[LOGIN DEBUG] Username not found: ${username}`);
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password'
      });
    }

    const customer = result.rows[0];

    // Verify password
    const validPassword = await bcrypt.compare(password, customer.password_hash);
    if (!validPassword) {
      console.log(`[LOGIN DEBUG] Password mismatch for username: ${username}`);
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password'
      });
    }

    // Check if email is verified
    if (!customer.is_verified) {
      console.log(`[LOGIN DEBUG] Email not verified for username: ${username}`);
      return res.status(401).json({
        success: false,
        message: 'Please verify your email before logging in'
      });
    }

    // Create JWT token
    const token = jwt.sign(
      {
        customer_id: customer.customer_id,
        username: customer.username,
        name: customer.name,
        email: customer.email_address
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      token,
      customer: {
        customer_id: customer.customer_id,
        username: customer.username,
        name: customer.name,
        email: customer.email_address,
        phone_number: customer.phone_number
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed. Please try again.'
    });
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

// Check if name exists
router.get('/check-name', async (req, res) => {
  const { name } = req.query;

  try {
    const result = await pool.query(
      'SELECT * FROM customer_details WHERE name = $1',
      [name]
    );

    res.json({
      exists: result.rows.length > 0
    });
  } catch (error) {
    console.error('Name check error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check name'
    });
  }
});

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

module.exports = router; 