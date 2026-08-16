const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

// Self-service profile picture upload for the logged-in staff user.
// Distinct from PUT /api/account-management/users/:id (admin editing any user) —
// this route targets req.user.user_id from the JWT, so a staff member can only
// ever update their own row.
router.patch('/profile-picture', upload.single('profilePicture'), async (req, res) => {
  try {
    const userId = req.user.user_id;

    if (!userId) {
      return res.status(403).json({
        success: false,
        message: 'This endpoint is for staff accounts only'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    if (!req.file.mimetype.startsWith('image/')) {
      return res.status(400).json({
        success: false,
        message: 'File must be an image'
      });
    }

    if (req.file.size > 5 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        message: 'File size must be less than 5MB'
      });
    }

    const result = await pool.query(
      'UPDATE users SET profile_picture_data = $1, updated_at = NOW() WHERE user_id = $2 RETURNING user_id',
      [req.file.buffer, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'Profile picture updated successfully',
      profile_picture_data: req.file.buffer.toString('base64')
    });
  } catch (error) {
    console.error('Error updating staff profile picture:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile picture'
    });
  }
});

module.exports = router;
