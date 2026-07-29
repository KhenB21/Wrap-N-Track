const express = require('express');
const router = express.Router();
const multer = require('multer');
const pool = require('../config/db');
const bcrypt = require('bcrypt');
const verifyJwt = require('../middleware/verifyJwt')();
const requireRole = require('../middleware/requireRole');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error('Only PNG, JPG, JPEG, or WEBP images are allowed'), false);
    }
    cb(null, true);
  }
});

const VALID_ROLES = ['admin', 'business_developer', 'creatives', 'director', 'sales_manager', 'assistant_sales', 'packer'];

const deriveName = (first_name, last_name, fallbackName) => {
  const combined = [first_name, last_name].filter(Boolean).join(' ').trim();
  return combined || (fallbackName || '').trim();
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Apply admin-only access to all routes
router.use(verifyJwt, requireRole(['admin']));

// GET /api/account-management/users - Get all users (including archived)
router.get('/users', async (req, res) => {
  try {
    const { includeArchived = false, search = '', role = '', status = '' } = req.query;
    
    let query = `
      SELECT
        user_id,
        name,
        first_name,
        last_name,
        username,
        email,
        phone_number,
        department,
        role,
        is_active,
        is_archived,
        created_at,
        updated_at
      FROM users
      WHERE 1=1
    `;
    
    const queryParams = [];
    let paramCount = 0;
    
    // Filter by archived status
    if (includeArchived === 'false') {
      query += ` AND (is_archived IS NULL OR is_archived = false)`;
    }
    
    // Search functionality
    if (search) {
      paramCount++;
      query += ` AND (name ILIKE $${paramCount} OR email ILIKE $${paramCount})`;
      queryParams.push(`%${search}%`);
    }
    
    // Filter by role
    if (role) {
      paramCount++;
      query += ` AND role = $${paramCount}`;
      queryParams.push(role);
    }
    
    // Filter by status
    if (status === 'active') {
      query += ` AND is_active = true`;
    } else if (status === 'inactive') {
      query += ` AND is_active = false`;
    }
    
    query += ` ORDER BY created_at DESC`;
    
    const result = await pool.query(query, queryParams);
    
    res.json({
      success: true,
      users: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users'
    });
  }
});

// GET /api/account-management/users/:id - Get specific user
router.get('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT
        user_id,
        name,
        first_name,
        last_name,
        username,
        email,
        phone_number,
        department,
        address,
        notes,
        role,
        is_active,
        is_archived,
        created_at,
        updated_at,
        profile_picture_data
      FROM users
      WHERE user_id = $1
    `, [id]);

    if (result.rows.length > 0 && result.rows[0].profile_picture_data) {
      result.rows[0].profile_picture_data = result.rows[0].profile_picture_data.toString('base64');
    }
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.json({
      success: true,
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user'
    });
  }
});

// POST /api/account-management/users - Create new user
router.post('/users', upload.single('profilePicture'), async (req, res) => {
  try {
    const {
      name, first_name, last_name, username, email, phone_number,
      department, address, notes, password, role
    } = req.body;

    const resolvedName = deriveName(first_name, last_name, name);

    // Validation
    if (!resolvedName || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, password, and role are required'
      });
    }

    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid email address'
      });
    }

    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role'
      });
    }

    // Check if email already exists
    const existingUser = await pool.query(
      'SELECT user_id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Email already exists'
      });
    }

    // Check if username already exists (only when provided — column is nullable)
    if (username && username.trim()) {
      const existingUsername = await pool.query(
        'SELECT user_id FROM users WHERE username = $1',
        [username.trim()]
      );
      if (existingUsername.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Username already exists'
        });
      }
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    const profilePictureData = req.file ? req.file.buffer : null;

    // Create user
    const result = await pool.query(`
      INSERT INTO users (
        name, first_name, last_name, username, email, phone_number,
        department, address, notes, password_hash, role,
        profile_picture_data, is_active, is_archived
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, true, false)
      RETURNING user_id, name, first_name, last_name, username, email, phone_number,
                department, address, notes, role, is_active, is_archived, created_at
    `, [
      resolvedName, first_name || null, last_name || null, username?.trim() || null,
      email, phone_number || null, department || null, address || null, notes || null,
      passwordHash, role, profilePictureData
    ]);

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create user'
    });
  }
});

// PUT /api/account-management/users/:id - Update user
router.put('/users/:id', upload.single('profilePicture'), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name, first_name, last_name, username, email, phone_number,
      department, address, notes, role, is_active
    } = req.body;

    // Check if user exists
    const existingUser = await pool.query(
      'SELECT user_id FROM users WHERE user_id = $1',
      [id]
    );

    if (existingUser.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (email && !EMAIL_REGEX.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid email address'
      });
    }

    // Check if email is being changed and if it already exists
    if (email) {
      const emailCheck = await pool.query(
        'SELECT user_id FROM users WHERE email = $1 AND user_id != $2',
        [email, id]
      );

      if (emailCheck.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Email already exists'
        });
      }
    }

    // Check if username is being changed and if it already exists
    if (username && username.trim()) {
      const usernameCheck = await pool.query(
        'SELECT user_id FROM users WHERE username = $1 AND user_id != $2',
        [username.trim(), id]
      );

      if (usernameCheck.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Username already exists'
        });
      }
    }

    // Validate role if provided
    if (role && !VALID_ROLES.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role'
      });
    }

    const resolvedName = (first_name || last_name) ? deriveName(first_name, last_name, name) : name;

    // Build update query dynamically
    const updateFields = [];
    const updateValues = [];
    let paramCount = 0;

    const addField = (column, value) => {
      paramCount++;
      updateFields.push(`${column} = $${paramCount}`);
      updateValues.push(value);
    };

    if (resolvedName) addField('name', resolvedName);
    if (first_name !== undefined) addField('first_name', first_name || null);
    if (last_name !== undefined) addField('last_name', last_name || null);
    if (username !== undefined) addField('username', username?.trim() || null);
    if (email) addField('email', email);
    if (phone_number !== undefined) addField('phone_number', phone_number || null);
    if (department !== undefined) addField('department', department || null);
    if (address !== undefined) addField('address', address || null);
    if (notes !== undefined) addField('notes', notes || null);
    if (role) addField('role', role);
    if (is_active !== undefined) addField('is_active', is_active === 'true' || is_active === true);
    if (req.file) addField('profile_picture_data', req.file.buffer);

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    paramCount++;
    updateValues.push(id);

    const result = await pool.query(`
      UPDATE users
      SET ${updateFields.join(', ')}, updated_at = NOW()
      WHERE user_id = $${paramCount}
      RETURNING user_id, name, first_name, last_name, username, email, phone_number,
                department, address, notes, role, is_active, is_archived, created_at
    `, updateValues);

    res.json({
      success: true,
      message: 'User updated successfully',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user'
    });
  }
});

// PUT /api/account-management/users/:id/password - Reset password
router.put('/users/:id/password', async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;
    
    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Password is required'
      });
    }
    
    // Check if user exists
    const existingUser = await pool.query(
      'SELECT user_id FROM users WHERE user_id = $1',
      [id]
    );
    
    if (existingUser.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Hash new password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    // Update password
    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE user_id = $2',
      [passwordHash, id]
    );
    
    res.json({
      success: true,
      message: 'Password updated successfully'
    });
  } catch (error) {
    console.error('Error updating password:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update password'
    });
  }
});

// PUT /api/account-management/users/:id/archive - Archive user
router.put('/users/:id/archive', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if user exists
    const existingUser = await pool.query(
      'SELECT user_id, name FROM users WHERE user_id = $1',
      [id]
    );
    
    if (existingUser.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Archive user
    await pool.query(
      'UPDATE users SET is_archived = true, is_active = false, archived_at = NOW() WHERE user_id = $1',
      [id]
    );
    
    res.json({
      success: true,
      message: `User ${existingUser.rows[0].name} has been archived successfully`
    });
  } catch (error) {
    console.error('Error archiving user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to archive user'
    });
  }
});

// PUT /api/account-management/users/:id/restore - Restore user
router.put('/users/:id/restore', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if user exists and is archived
    const existingUser = await pool.query(
      'SELECT user_id, name FROM users WHERE user_id = $1 AND is_archived = true',
      [id]
    );
    
    if (existingUser.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found or not archived'
      });
    }
    
    // Restore user
    await pool.query(
      'UPDATE users SET is_archived = false, is_active = true, restored_at = NOW() WHERE user_id = $1',
      [id]
    );
    
    res.json({
      success: true,
      message: `User ${existingUser.rows[0].name} has been restored successfully`
    });
  } catch (error) {
    console.error('Error restoring user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to restore user'
    });
  }
});

// GET /api/account-management/roles - Get available roles
router.get('/roles', async (req, res) => {
  try {
    const roles = [
      { value: 'admin', label: 'Admin', description: 'Full system access' },
      { value: 'director', label: 'Director', description: 'Management level access' },
      { value: 'business_developer', label: 'Business Developer', description: 'Business development focus' },
      { value: 'creatives', label: 'Creatives', description: 'Design and creative focus' },
      { value: 'sales_manager', label: 'Sales Manager', description: 'Sales team management' },
      { value: 'assistant_sales', label: 'Assistant Sales', description: 'Sales support role' },
      { value: 'packer', label: 'Packer', description: 'Read-only operational role' }
    ];
    
    res.json({
      success: true,
      roles
    });
  } catch (error) {
    console.error('Error fetching roles:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch roles'
    });
  }
});

// GET /api/account-management/users-check-availability - Live duplicate check for email/username
router.get('/users-check-availability', async (req, res) => {
  try {
    const { email, username, excludeId } = req.query;
    const result = { emailTaken: false, usernameTaken: false };

    if (email) {
      const params = excludeId ? [email, excludeId] : [email];
      const query = excludeId
        ? 'SELECT user_id FROM users WHERE email = $1 AND user_id != $2'
        : 'SELECT user_id FROM users WHERE email = $1';
      const emailResult = await pool.query(query, params);
      result.emailTaken = emailResult.rows.length > 0;
    }

    if (username && username.trim()) {
      const params = excludeId ? [username.trim(), excludeId] : [username.trim()];
      const query = excludeId
        ? 'SELECT user_id FROM users WHERE username = $1 AND user_id != $2'
        : 'SELECT user_id FROM users WHERE username = $1';
      const usernameResult = await pool.query(query, params);
      result.usernameTaken = usernameResult.rows.length > 0;
    }

    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Error checking availability:', error);
    res.status(500).json({ success: false, message: 'Failed to check availability' });
  }
});

// GET /api/account-management/roles/:role/permissions - Read-only feature list for a role
router.get('/roles/:role/permissions', async (req, res) => {
  try {
    const { role } = req.params;

    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role'
      });
    }

    const result = await pool.query(`
      SELECT f.feature_id, f.name
      FROM role_feature_access rfa
      JOIN features f ON f.feature_id = rfa.feature_id
      WHERE rfa.role = $1
      ORDER BY f.name
    `, [role]);

    res.json({
      success: true,
      role,
      permissions: result.rows
    });
  } catch (error) {
    console.error('Error fetching role permissions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch role permissions'
    });
  }
});

module.exports = router;
