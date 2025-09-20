const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const bcrypt = require('bcrypt');
const verifyJwt = require('../middleware/verifyJwt')();
const requireRole = require('../middleware/requireRole');

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
        email,
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
        email,
        role,
        is_active,
        is_archived,
        created_at,
        updated_at,
        profile_picture_data
      FROM users 
      WHERE user_id = $1
    `, [id]);
    
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
router.post('/users', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    
    // Validation
    if (!name || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
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
    
    // Validate role
    const validRoles = ['admin', 'business_developer', 'creatives', 'director', 'sales_manager', 'assistant_sales', 'packer'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role'
      });
    }
    
    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    // Create user
    const result = await pool.query(`
      INSERT INTO users (name, email, password_hash, role, is_active, is_archived)
      VALUES ($1, $2, $3, $4, true, false)
      RETURNING user_id, name, email, role, is_active, is_archived, created_at
    `, [name, email, passwordHash, role]);
    
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
router.put('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role, is_active } = req.body;
    
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
    
    // Validate role if provided
    if (role) {
      const validRoles = ['admin', 'business_developer', 'creatives', 'director', 'sales_manager', 'assistant_sales', 'packer'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid role'
        });
      }
    }
    
    // Build update query dynamically
    const updateFields = [];
    const updateValues = [];
    let paramCount = 0;
    
    if (name) {
      paramCount++;
      updateFields.push(`name = $${paramCount}`);
      updateValues.push(name);
    }
    
    if (email) {
      paramCount++;
      updateFields.push(`email = $${paramCount}`);
      updateValues.push(email);
    }
    
    if (role) {
      paramCount++;
      updateFields.push(`role = $${paramCount}`);
      updateValues.push(role);
    }
    
    if (is_active !== undefined) {
      paramCount++;
      updateFields.push(`is_active = $${paramCount}`);
      updateValues.push(is_active);
    }
    
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
      RETURNING user_id, name, email, role, is_active, is_archived, created_at
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

module.exports = router;
