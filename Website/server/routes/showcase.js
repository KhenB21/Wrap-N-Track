const express = require('express');
const multer  = require('multer');
const jwt     = require('jsonwebtoken');
const router  = express.Router();
const pool    = require('../config/db');

const ALLOWED_MIME = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only JPG, PNG, and WEBP images are allowed'), false);
  }
});

const VALID_CATEGORIES = ['wedding', 'corporate', 'bespoke'];

// Employee-only middleware — requires a user JWT (not a customer JWT)
function verifyEmployee(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }
  try {
    const decoded = jwt.verify(auth.split(' ')[1], process.env.JWT_SECRET);
    if (!decoded.user_id) {
      return res.status(403).json({ success: false, message: 'Employee access required' });
    }
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
}

// ─── Shared SQL fragment ───────────────────────────────────────────────────────
const IMAGE_SELECT = `
  id, category, title, description, is_active,
  cover_image_mime,
  CASE WHEN cover_image IS NOT NULL
    THEN encode(cover_image, 'base64')
    ELSE NULL
  END AS cover_image,
  created_at, updated_at
`;

// ─── Public endpoints ──────────────────────────────────────────────────────────

// GET /api/showcase?category=wedding  — active bundles (optionally filtered by category)
router.get('/', async (req, res) => {
  try {
    const { category } = req.query;
    const params = [];
    const where  = ['is_active = true'];

    if (category) {
      const cat = category.toLowerCase();
      if (!VALID_CATEGORIES.includes(cat)) {
        return res.status(400).json({ success: false, message: 'Invalid category' });
      }
      params.push(cat);
      where.push(`category = $${params.length}`);
    }

    const sql = `SELECT ${IMAGE_SELECT} FROM showcase_bundles WHERE ${where.join(' AND ')} ORDER BY created_at DESC`;
    const result = await pool.query(sql, params);
    res.json({ success: true, bundles: result.rows });
  } catch (err) {
    console.error('[showcase] GET / error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch showcase bundles' });
  }
});

// GET /api/showcase/manage/all  — ALL bundles including inactive (employee use)
// Must be defined BEFORE /:id to avoid 'manage' being treated as an id
router.get('/manage/all', verifyEmployee, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ${IMAGE_SELECT}, created_by FROM showcase_bundles ORDER BY created_at DESC`
    );
    res.json({ success: true, bundles: result.rows });
  } catch (err) {
    console.error('[showcase] GET /manage/all error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch bundles' });
  }
});

// GET /api/showcase/:id  — single bundle by id
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ${IMAGE_SELECT} FROM showcase_bundles WHERE id = $1`,
      [req.params.id]
    );
    if (!result.rows.length) {
      return res.status(404).json({ success: false, message: 'Bundle not found' });
    }
    res.json({ success: true, bundle: result.rows[0] });
  } catch (err) {
    console.error('[showcase] GET /:id error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch bundle' });
  }
});

// ─── Employee-only write endpoints ────────────────────────────────────────────

// POST /api/showcase  — create bundle
router.post('/', verifyEmployee, upload.single('cover_image'), async (req, res) => {
  try {
    const { title, description, category } = req.body;
    if (!title || !description || !category) {
      return res.status(400).json({ success: false, message: 'Title, description, and category are required' });
    }
    const cat = category.toLowerCase();
    if (!VALID_CATEGORIES.includes(cat)) {
      return res.status(400).json({ success: false, message: 'Category must be wedding, corporate, or bespoke' });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Cover image is required' });
    }

    const result = await pool.query(`
      INSERT INTO showcase_bundles
        (category, title, description, cover_image, cover_image_mime, created_by, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, true)
      RETURNING id, category, title, description, is_active, created_at
    `, [cat, title.trim(), description.trim(), req.file.buffer, req.file.mimetype, req.user.user_id]);

    res.status(201).json({ success: true, bundle: result.rows[0] });
  } catch (err) {
    console.error('[showcase] POST / error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to create bundle' });
  }
});

// PUT /api/showcase/:id  — update bundle (image optional)
router.put('/:id', verifyEmployee, upload.single('cover_image'), async (req, res) => {
  try {
    const { title, description, category } = req.body;
    if (!title || !description || !category) {
      return res.status(400).json({ success: false, message: 'Title, description, and category are required' });
    }
    const cat = category.toLowerCase();
    if (!VALID_CATEGORIES.includes(cat)) {
      return res.status(400).json({ success: false, message: 'Category must be wedding, corporate, or bespoke' });
    }

    let sql, params;
    if (req.file) {
      sql = `
        UPDATE showcase_bundles
        SET title=$1, description=$2, category=$3,
            cover_image=$4, cover_image_mime=$5, updated_at=NOW()
        WHERE id=$6
        RETURNING id, category, title, description, is_active, updated_at
      `;
      params = [title.trim(), description.trim(), cat, req.file.buffer, req.file.mimetype, req.params.id];
    } else {
      sql = `
        UPDATE showcase_bundles
        SET title=$1, description=$2, category=$3, updated_at=NOW()
        WHERE id=$4
        RETURNING id, category, title, description, is_active, updated_at
      `;
      params = [title.trim(), description.trim(), cat, req.params.id];
    }

    const result = await pool.query(sql, params);
    if (!result.rows.length) {
      return res.status(404).json({ success: false, message: 'Bundle not found' });
    }
    res.json({ success: true, bundle: result.rows[0] });
  } catch (err) {
    console.error('[showcase] PUT /:id error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to update bundle' });
  }
});

// PATCH /api/showcase/:id/toggle  — flip is_active
router.patch('/:id/toggle', verifyEmployee, async (req, res) => {
  try {
    const result = await pool.query(`
      UPDATE showcase_bundles
      SET is_active = NOT is_active, updated_at = NOW()
      WHERE id = $1
      RETURNING id, is_active
    `, [req.params.id]);

    if (!result.rows.length) {
      return res.status(404).json({ success: false, message: 'Bundle not found' });
    }
    res.json({ success: true, bundle: result.rows[0] });
  } catch (err) {
    console.error('[showcase] PATCH /:id/toggle error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to toggle bundle status' });
  }
});

// DELETE /api/showcase/:id
router.delete('/:id', verifyEmployee, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM showcase_bundles WHERE id = $1 RETURNING id',
      [req.params.id]
    );
    if (!result.rows.length) {
      return res.status(404).json({ success: false, message: 'Bundle not found' });
    }
    res.json({ success: true, message: 'Bundle deleted' });
  } catch (err) {
    console.error('[showcase] DELETE /:id error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to delete bundle' });
  }
});

module.exports = router;
