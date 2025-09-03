const express = require('express');
const router = express.Router();
// Use centralized pool (migrated from legacy ../db)
const pool = require('../config/db');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const jwt = require('jsonwebtoken');

// Authentication middleware
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
    // For customer routes, we expect the token to contain customer_id
    if (!decoded.customer_id) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token for customer access'
      });
    }
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

// Get customer profile
router.get('/profile', async (req, res) => {
  // 1. Ensure auth middleware attached a user object (defense-in-depth)
  if (!req.user || !req.user.customer_id) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: missing or invalid token'
    });
  }

  const customerId = req.user.customer_id;
  console.log('[Customer/Profile] Fetching profile for customer_id:', customerId);

  try {
    // 2. Parameterized query (SQL injection safe) + base64 encode in SQL for clarity
    const sql = `
      SELECT 
        customer_id,
        username,
        name,
        email_address,
        phone_number,
        address,
        is_verified,
        CASE WHEN profile_picture_data IS NOT NULL 
             THEN encode(profile_picture_data, 'base64')
             ELSE NULL END AS profile_picture_base64
      FROM customer_details
      WHERE customer_id = $1
      LIMIT 1;`;

    const result = await pool.query(sql, [customerId]);

    // 3. Handle not found
    if (result.rows.length === 0) {
      console.log('[Customer/Profile] No record for customer_id:', customerId);
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // 4. Build response object (limit exposure of raw column names)
    const row = result.rows[0];
    return res.status(200).json({
      success: true,
      customer: {
        customer_id: row.customer_id,
        username: row.username,
        name: row.name,
        email: row.email_address,
        phone_number: row.phone_number,
        address: row.address,
        is_verified: row.is_verified,
        profile_picture_base64: row.profile_picture_base64
      }
    });
  } catch (error) {
    // 5. Comprehensive logging (message + stack) for diagnostics
    console.error('[Customer/Profile] Error fetching profile:', {
      message: error.message,
      stack: error.stack
    });
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Update customer profile
router.put('/profile', async (req, res) => {
  try {
    const customerId = req.user.customer_id;
    const { name, username, email_address, phone_number, street, city, zipcode } = req.body;

    // Validate required fields
    if (!name?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Name is required'
      });
    }

    if (!username?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Username is required'
      });
    }

    if (!email_address?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Check if username is being changed and if it's already taken
    if (username) {
      const usernameCheck = await pool.query(
        'SELECT customer_id FROM customer_details WHERE username = $1 AND customer_id != $2',
        [username, customerId]
      );
      if (usernameCheck.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Username already taken'
        });
      }
    }

    // Check if email is being changed
    const currentCustomer = await pool.query(
      'SELECT email_address, is_verified FROM customer_details WHERE customer_id = $1',
      [customerId]
    );

    const isEmailChanged = currentCustomer.rows[0]?.email_address !== email_address;

    // Check if new email is already taken
    if (email_address) {
      const emailCheck = await pool.query(
        'SELECT customer_id FROM customer_details WHERE email_address = $1 AND customer_id != $2',
        [email_address, customerId]
      );
      if (emailCheck.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Email already registered'
        });
      }
    }

    // If email is changed, generate verification code and send email
    if (isEmailChanged) {
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

      // Store verification code in database and mark as unverified
      await pool.query(
        'UPDATE customer_details SET verification_code = $1, verification_expiry = $2, is_verified = false WHERE customer_id = $3',
        [verificationCode, verificationExpiry, customerId]
      );

      // Send verification email
      // TODO: Implement email sending functionality
      console.log('Verification code for new email:', verificationCode);
    }

    const result = await pool.query(
      'UPDATE customer_details SET name = $1, username = $2, email_address = $3, phone_number = $4, street = $5, city = $6, zipcode = $7 WHERE customer_id = $8 RETURNING *',
      [name.trim(), username.trim(), email_address.trim(), phone_number, street || '', city || '', zipcode || '', customerId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    const updatedCustomer = result.rows[0];
    res.json({
      success: true,
      message: isEmailChanged ? 'Profile updated. Please verify your new email address.' : 'Profile updated successfully',
      customer: {
        customer_id: updatedCustomer.customer_id,
        name: updatedCustomer.name,
        username: updatedCustomer.username,
        email_address: updatedCustomer.email_address,
        phone_number: updatedCustomer.phone_number,
        street: updatedCustomer.street,
        city: updatedCustomer.city,
        zipcode: updatedCustomer.zipcode,
        is_verified: updatedCustomer.is_verified
      }
    });
  } catch (error) {
    console.error('Error updating customer profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }
});

// Update profile picture
router.post('/profile-picture', upload.single('profilePicture'), async (req, res) => {
  try {
    const customerId = req.user.customer_id;
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const profilePictureData = req.file.buffer;

    // Validate file type
    if (!req.file.mimetype.startsWith('image/')) {
      return res.status(400).json({
        success: false,
        message: 'File must be an image'
      });
    }

    // Validate file size (max 5MB)
    if (req.file.size > 5 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        message: 'File size must be less than 5MB'
      });
    }

    const result = await pool.query(
      'UPDATE customer_details SET profile_picture_data = $1 WHERE customer_id = $2 RETURNING *',
      [profilePictureData, customerId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    res.json({
      success: true,
      message: 'Profile picture updated successfully',
      profile_picture_data: profilePictureData.toString('base64')
    });
  } catch (error) {
    console.error('Error updating profile picture:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile picture'
    });
  }
});

// Verify email
router.post('/verify-email', async (req, res) => {
  const { email, code } = req.body;

  try {
    // Find customer with matching email and verification code
    const result = await pool.query(
      'SELECT * FROM customer_details WHERE email_address = $1 AND verification_code = $2 AND verification_expiry > NOW()',
      [email, code]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification code'
      });
    }

    // Update customer verification status
    await pool.query(
      'UPDATE customer_details SET is_verified = true, verification_code = NULL, verification_expiry = NULL WHERE email_address = $1',
      [email]
    );

    res.json({
      success: true,
      message: 'Email verified successfully'
    });
  } catch (error) {
    console.error('Error verifying email:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify email'
    });
  }
});

// Resend verification code
router.post('/resend-verification', async (req, res) => {
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
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

    // Update verification code in database
    await pool.query(
      'UPDATE customer_details SET verification_code = $1, verification_expiry = $2 WHERE email_address = $3',
      [verificationCode, verificationExpiry, email]
    );

    // Send new verification email
    // TODO: Implement email sending functionality
    console.log('New verification code for email:', verificationCode);

    res.json({
      success: true,
      message: 'New verification code sent successfully'
    });
  } catch (error) {
    console.error('Error resending verification code:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resend verification code'
    });
  }
});

// Add or update address for customer
router.post('/profile/address', async (req, res) => {
  try {
    const customerId = req.user.customer_id;
    const { address } = req.body;

    if (!address || !address.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Address is required'
      });
    }

    // Save address to the database
    const result = await pool.query(
      'UPDATE customer_details SET street = $1 WHERE customer_id = $2 RETURNING street',
      [address.trim(), customerId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    res.json({
      success: true,
      street: result.rows[0].street
    });
  } catch (error) {
    console.error('Error saving address:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save address'
    });
  }
});

module.exports = router; 