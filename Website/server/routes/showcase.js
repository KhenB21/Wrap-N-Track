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

// GET /api/showcase/:id  — single bundle with bundle_items and gallery count
router.get('/:id', async (req, res) => {
  try {
    const bundleResult = await pool.query(
      `SELECT ${IMAGE_SELECT} FROM showcase_bundles WHERE id = $1`,
      [req.params.id]
    );
    if (!bundleResult.rows.length) {
      return res.status(404).json({ success: false, message: 'Bundle not found' });
    }
    const bundle = bundleResult.rows[0];

    const [itemsResult, galleryCountResult] = await Promise.all([
      pool.query(
        `SELECT bi.id, bi.sku, bi.quantity, ii.name AS item_name, ii.unit_price
         FROM bundle_items bi
         JOIN inventory_items ii ON bi.sku = ii.sku
         WHERE bi.bundle_id = $1
         ORDER BY bi.id ASC`,
        [req.params.id]
      ),
      pool.query(
        'SELECT COUNT(*) AS cnt FROM bundle_gallery_images WHERE bundle_id = $1',
        [req.params.id]
      )
    ]);

    bundle.bundle_items = itemsResult.rows;
    bundle.gallery_image_count = parseInt(galleryCountResult.rows[0].cnt, 10);

    res.json({ success: true, bundle });
  } catch (err) {
    console.error('[showcase] GET /:id error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch bundle' });
  }
});

// ─── Gallery image sub-routes ──────────────────────────────────────────────

const MAX_GALLERY = 10;

// GET /api/showcase/:id/gallery  — all gallery images (base64) for a bundle
router.get('/:id/gallery', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, sort_order, image_mime,
         encode(image_data, 'base64') AS image_data
       FROM bundle_gallery_images
       WHERE bundle_id = $1
       ORDER BY sort_order ASC, id ASC`,
      [req.params.id]
    );
    res.json({ success: true, images: result.rows });
  } catch (err) {
    console.error('[showcase] GET /:id/gallery error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch gallery images' });
  }
});

// POST /api/showcase/:id/gallery  — upload one gallery image (employee, max 10)
router.post('/:id/gallery', verifyEmployee, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Image file is required' });
    }
    const bundleCheck = await pool.query(
      'SELECT id FROM showcase_bundles WHERE id = $1', [req.params.id]
    );
    if (!bundleCheck.rows.length) {
      return res.status(404).json({ success: false, message: 'Bundle not found' });
    }
    const countResult = await pool.query(
      'SELECT COUNT(*) AS cnt FROM bundle_gallery_images WHERE bundle_id = $1',
      [req.params.id]
    );
    if (parseInt(countResult.rows[0].cnt, 10) >= MAX_GALLERY) {
      return res.status(400).json({ success: false, message: `Maximum ${MAX_GALLERY} gallery images per bundle` });
    }
    const sortResult = await pool.query(
      'SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM bundle_gallery_images WHERE bundle_id = $1',
      [req.params.id]
    );
    const result = await pool.query(
      `INSERT INTO bundle_gallery_images (bundle_id, image_data, image_mime, sort_order)
       VALUES ($1, $2, $3, $4)
       RETURNING id, sort_order, image_mime, encode(image_data, 'base64') AS image_data`,
      [req.params.id, req.file.buffer, req.file.mimetype, sortResult.rows[0].next_order]
    );
    res.status(201).json({ success: true, image: result.rows[0] });
  } catch (err) {
    console.error('[showcase] POST /:id/gallery error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to upload gallery image' });
  }
});

// DELETE /api/showcase/:id/gallery/:imageId  — remove one gallery image
router.delete('/:id/gallery/:imageId', verifyEmployee, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM bundle_gallery_images WHERE id = $1 AND bundle_id = $2 RETURNING id',
      [req.params.imageId, req.params.id]
    );
    if (!result.rows.length) {
      return res.status(404).json({ success: false, message: 'Gallery image not found' });
    }
    res.json({ success: true, message: 'Gallery image deleted' });
  } catch (err) {
    console.error('[showcase] DELETE /:id/gallery/:imageId error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to delete gallery image' });
  }
});

// PUT /api/showcase/:id/items  — replace all bundle items (employee)
router.put('/:id/items', verifyEmployee, async (req, res) => {
  const { items } = req.body;
  if (!Array.isArray(items)) {
    return res.status(400).json({ success: false, message: 'items must be an array' });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const bundleCheck = await client.query(
      'SELECT id FROM showcase_bundles WHERE id = $1', [req.params.id]
    );
    if (!bundleCheck.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Bundle not found' });
    }

    await client.query('DELETE FROM bundle_items WHERE bundle_id = $1', [req.params.id]);

    const savedItems = [];
    for (const item of items) {
      if (!item.sku || !item.quantity || Number(item.quantity) < 1) continue;
      const skuCheck = await client.query(
        'SELECT sku, name, unit_price FROM inventory_items WHERE sku = $1', [item.sku]
      );
      if (!skuCheck.rows.length) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, message: `SKU ${item.sku} not found in inventory` });
      }
      const ins = await client.query(
        'INSERT INTO bundle_items (bundle_id, sku, quantity) VALUES ($1, $2, $3) RETURNING id, sku, quantity',
        [req.params.id, item.sku, parseInt(item.quantity, 10)]
      );
      savedItems.push({
        ...ins.rows[0],
        item_name:  skuCheck.rows[0].name,
        unit_price: skuCheck.rows[0].unit_price
      });
    }

    await client.query('COMMIT');
    res.json({ success: true, items: savedItems });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[showcase] PUT /:id/items error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to save bundle items' });
  } finally {
    client.release();
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
