const express = require('express');
const router = express.Router();
// Use centralized pool (migrated from legacy ../db)
const pool = require('../config/db');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { isValidRegion, isValidCity, isValidBarangay } = require('../data/philippineLocations');

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

const ensureCustomerProfileColumns = async () => {
  const columns = [
    'ADD COLUMN IF NOT EXISTS address TEXT',
    'ADD COLUMN IF NOT EXISTS house_street_number TEXT',
    'ADD COLUMN IF NOT EXISTS region TEXT',
    'ADD COLUMN IF NOT EXISTS region_code TEXT',
    'ADD COLUMN IF NOT EXISTS city_code TEXT',
    'ADD COLUMN IF NOT EXISTS barangay TEXT',
    'ADD COLUMN IF NOT EXISTS barangay_code TEXT',
    'ADD COLUMN IF NOT EXISTS postal_code TEXT',
    'ADD COLUMN IF NOT EXISTS profile_picture_data BYTEA',
  ];

  for (const column of columns) {
    await pool.query(`ALTER TABLE customer_details ${column}`);
  }
};

// Get customer profile
router.get('/profile', verifyToken, async (req, res) => {

  const customerId = req.user.customer_id;
  console.log('[Customer/Profile] Fetching profile for customer_id:', customerId);

  try {
    await ensureCustomerProfileColumns();

    // 2. Parameterized query (SQL injection safe) + base64 encode in SQL for clarity
    const sql = `
      SELECT 
        customer_id,
        username,
        name,
        email_address,
        phone_number,
        address,
        house_street_number,
        region,
        region_code,
        city,
        city_code,
        barangay,
        barangay_code,
        postal_code,
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
        house_street_number: row.house_street_number,
        region: row.region,
        region_code: row.region_code,
        city: row.city,
        city_code: row.city_code,
        barangay: row.barangay,
        barangay_code: row.barangay_code,
        postal_code: row.postal_code,
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
router.put('/profile', verifyToken, async (req, res) => {
  try {
    const customerId = req.user.customer_id;
    const {
      name,
      username,
      email_address,
      phone_number,
      house_street_number,
      region,
      region_code,
      city,
      city_code,
      barangay,
      barangay_code,
      postal_code,
      address,
    } = req.body;

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

    // Phone/PSGC address fields are all optional here — the signup flow no
    // longer collects them, and this endpoint also handles single-field edits
    // (e.g. just updating "address") from the profile page, which don't send
    // the rest. Only validate a field's format when it's actually provided.
    if (phone_number && !/^(09\d{9}|\+639\d{9})$/.test(phone_number)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid Philippine mobile number (09XXXXXXXXX or +639XXXXXXXXX)'
      });
    }

    if (region_code && !isValidRegion(region_code, region)) {
      return res.status(400).json({
        success: false,
        message: 'Please select a valid region'
      });
    }

    if (city_code && !isValidCity(region_code, city_code, city)) {
      return res.status(400).json({
        success: false,
        message: 'Please select a valid city'
      });
    }

    if (barangay_code && !isValidBarangay(city_code, barangay_code, barangay)) {
      return res.status(400).json({
        success: false,
        message: 'Please select a valid barangay'
      });
    }

    if (postal_code && !/^\d{4}$/.test(postal_code)) {
      return res.status(400).json({
        success: false,
        message: 'Postal code must be 4 digits'
      });
    }

    await ensureCustomerProfileColumns();

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

    const addressParts = [house_street_number?.trim(), barangay ? `Barangay ${barangay}` : '', city, region, postal_code].filter(Boolean);
    const fullAddress = address?.trim() || (addressParts.length ? addressParts.join(', ') : null);

    const result = await pool.query(
      `UPDATE customer_details
       SET name = $1,
           username = $2,
           email_address = $3,
           phone_number = COALESCE($4, phone_number),
           address = COALESCE($5, address),
           house_street_number = COALESCE($6, house_street_number),
           region = COALESCE($7, region),
           region_code = COALESCE($8, region_code),
           city = COALESCE($9, city),
           city_code = COALESCE($10, city_code),
           barangay = COALESCE($11, barangay),
           barangay_code = COALESCE($12, barangay_code),
           postal_code = COALESCE($13, postal_code)
       WHERE customer_id = $14
       RETURNING *`,
      [
        name.trim(),
        username.trim(),
        email_address.trim(),
        phone_number || null,
        fullAddress,
        house_street_number ? house_street_number.trim() : null,
        region || null,
        region_code || null,
        city || null,
        city_code || null,
        barangay || null,
        barangay_code || null,
        postal_code || null,
        customerId
      ]
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
      message: 'Profile updated successfully',
      customer: {
        customer_id: updatedCustomer.customer_id,
        name: updatedCustomer.name,
        username: updatedCustomer.username,
        email_address: updatedCustomer.email_address,
        phone_number: updatedCustomer.phone_number,
        address: updatedCustomer.address,
        house_street_number: updatedCustomer.house_street_number,
        region: updatedCustomer.region,
        region_code: updatedCustomer.region_code,
        city: updatedCustomer.city,
        city_code: updatedCustomer.city_code,
        barangay: updatedCustomer.barangay,
        barangay_code: updatedCustomer.barangay_code,
        postal_code: updatedCustomer.postal_code,
        profile_picture_base64: updatedCustomer.profile_picture_data ? updatedCustomer.profile_picture_data.toString('base64') : null,
        is_verified: updatedCustomer.is_verified
      }
    });
  } catch (error) {
    console.error('Error updating customer profile:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      stack: error.stack
    });
    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }
});

// Update profile picture
router.post('/profile-picture', verifyToken, upload.single('profilePicture'), async (req, res) => {
  try {
    const customerId = req.user.customer_id;
    await ensureCustomerProfileColumns();
    
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
    console.error('Error updating profile picture:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      stack: error.stack
    });
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
router.post('/profile/address', verifyToken, async (req, res) => {
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

// Mark the authenticated customer as verified. Called after they successfully
// complete the one-time-password check at order time (see /api/otp/verify-otp
// + OrderProcess.js) — that OTP check proves email ownership, so once it
// passes we don't need to make them repeat it on every future order.
router.put('/mark-verified', verifyToken, async (req, res) => {
  try {
    const customerId = req.user.customer_id;
    const result = await pool.query(
      'UPDATE customer_details SET is_verified = true WHERE customer_id = $1 RETURNING customer_id, is_verified',
      [customerId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }
    res.json({ success: true, is_verified: true });
  } catch (error) {
    console.error('Error marking customer verified:', error);
    res.status(500).json({ success: false, message: 'Failed to update verification status' });
  }
});

// Change password
router.put('/change-password', verifyToken, async (req, res) => {
  try {
    const customerId = req.user.customer_id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 8 characters long'
      });
    }

    // Get current password hash
    const customerResult = await pool.query(
      'SELECT password_hash FROM customer_details WHERE customer_id = $1',
      [customerId]
    );

    if (customerResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, customerResult.rows[0].password_hash);
    if (!isValidPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Hash new password
    const saltRounds = 10;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await pool.query(
      'UPDATE customer_details SET password_hash = $1 WHERE customer_id = $2',
      [newPasswordHash, customerId]
    );

    res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to change password'
    });
  }
});

module.exports = router; 
