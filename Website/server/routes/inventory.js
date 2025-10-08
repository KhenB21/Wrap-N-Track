const express = require('express');
const multer = require('multer');
const router = express.Router();
const pool = require('../config/db');

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// GET /api/inventory/archived - Get all archived (soft-deleted) inventory items
router.get('/archived', async (req, res) => {
  try {
    console.log('Archived inventory route called');
    // Query for archived products with the same structure as active inventory
    const result = await pool.query(`
      WITH order_quantities AS (
        SELECT
          op.sku,
          SUM(CASE
            WHEN o.status NOT IN ('Order Received', 'Completed', 'Cancelled')
            THEN op.quantity
            ELSE 0
          END) AS ordered_quantity,
          SUM(CASE
            WHEN o.status IN ('Order Received', 'Completed')
            THEN op.quantity
            ELSE 0
          END) AS delivered_quantity
        FROM order_products op
        JOIN orders o ON op.order_id = o.order_id
        GROUP BY op.sku
      )
      SELECT
        i.sku,
        i.name,
        i.description,
        i.category,
        i.quantity,
        i.unit_price,
        i.last_updated,
        i.uom,
        i.conversion_qty,
        i.expirable,
        i.expiration,
        i.supplier_id,
        s.name as supplier_name,
        s.phone as supplier_phone,
        s.website as supplier_website,
        CASE
          WHEN i.image_data IS NOT NULL THEN encode(i.image_data, 'base64')
          ELSE NULL
        END as image_data,
        COALESCE(oq.ordered_quantity, 0) AS ordered_quantity,
        COALESCE(oq.delivered_quantity, 0) AS delivered_quantity
      FROM inventory_items i
      LEFT JOIN suppliers s ON i.supplier_id = s.supplier_id
      LEFT JOIN order_quantities oq ON i.sku = oq.sku
      WHERE i.is_active = false
      ORDER BY i.name ASC
    `);

    console.log('Archived inventory query result:', result.rows.length, 'items found');

    return res.json({
      success: true,
      archivedInventory: result.rows
    });
  } catch (error) {
    console.error('Error fetching archived inventory:', { error: error.message, stack: error.stack });
    return res.status(500).json({ success: false, message: 'Failed to fetch archived inventory' });
  }
});

// Middleware to verify JWT token (reusing from existing patterns)
const jwt = require('jsonwebtoken');

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

// Apply authentication middleware to all inventory routes except public ones
// router.use(verifyToken);

// GET /api/inventory - Get all inventory items (public route for order process)
router.get('/', async (req, res) => {
  try {
    console.log('Inventory route called');
    // Optimized inventory query with better performance
    const result = await pool.query(`
      WITH order_quantities AS (
        SELECT
          op.sku,
          SUM(CASE
            WHEN o.status NOT IN ('Order Received', 'Completed', 'Cancelled')
            THEN op.quantity
            ELSE 0
          END) AS ordered_quantity,
          SUM(CASE
            WHEN o.status IN ('Order Received', 'Completed')
            THEN op.quantity
            ELSE 0
          END) AS delivered_quantity
        FROM order_products op
        JOIN orders o ON op.order_id = o.order_id
        GROUP BY op.sku
      )
      SELECT
        i.sku,
        i.name,
        i.description,
        i.category,
        i.quantity,
        i.unit_price,
        i.last_updated,
        i.uom,
        i.conversion_qty,
        i.expirable,
        i.expiration,
        i.supplier_id,
        s.name as supplier_name,
        s.phone as supplier_phone,
        s.website as supplier_website,
        CASE
          WHEN i.image_data IS NOT NULL THEN encode(i.image_data, 'base64')
          ELSE NULL
        END as image_data,
        COALESCE(oq.ordered_quantity, 0) AS ordered_quantity,
        COALESCE(oq.delivered_quantity, 0) AS delivered_quantity
      FROM inventory_items i
      LEFT JOIN suppliers s ON i.supplier_id = s.supplier_id
      LEFT JOIN order_quantities oq ON i.sku = oq.sku
      WHERE i.is_active = true
      ORDER BY i.name ASC
    `);

    console.log('Inventory query result:', result.rows.length, 'items found');
    console.log('Sample inventory item:', result.rows[0]);

    return res.json({
      success: true,
      inventory: result.rows
    });
  } catch (error) {
    console.error('Error fetching inventory:', { error: error.message, stack: error.stack });
    return res.status(500).json({ success: false, message: 'Failed to fetch inventory' });
  }
});

// GET /api/inventory/:sku - Get specific inventory item
router.get('/:sku', async (req, res) => {
  const { sku } = req.params;
  try {
    const result = await pool.query(`
      SELECT
        i.sku,
        i.name,
        i.description,
        i.category,
        i.quantity,
        i.unit_price,
        i.last_updated,
        i.uom,
        i.conversion_qty,
        i.expirable,
        i.expiration,
        i.supplier_id,
        s.name as supplier_name,
        s.phone as supplier_phone,
        s.website as supplier_website,
        CASE
          WHEN i.image_data IS NOT NULL THEN encode(i.image_data, 'base64')
          ELSE NULL
        END as image_data
      FROM inventory_items i
      LEFT JOIN suppliers s ON i.supplier_id = s.supplier_id
      WHERE i.sku = $1 AND i.is_active = true
    `, [sku]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }

    return res.json({
      success: true,
      item: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching inventory item:', { sku, error: error.message, stack: error.stack });
    return res.status(500).json({ success: false, message: 'Failed to fetch item' });
  }
});

// POST /api/inventory/add-stock - Add stock to existing item
router.post('/add-stock', async (req, res) => {
  const { sku, quantity } = req.body;

  console.log('Add stock request received:', { sku, quantity });

  if (!sku || !quantity || quantity <= 0) {
    return res.status(400).json({
      success: false,
      message: 'SKU and positive quantity are required'
    });
  }

  try {
    // Check if item exists and is active
    const existingItem = await pool.query('SELECT sku, name, quantity FROM inventory_items WHERE sku = $1 AND is_active = true', [sku]);
    if (existingItem.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }

    // Update quantity
    const result = await pool.query(`
      UPDATE inventory_items
      SET quantity = quantity + $1, last_updated = NOW()
      WHERE sku = $2
      RETURNING sku, name, quantity
    `, [Number(quantity), sku]);

    console.log('Stock added successfully:', result.rows[0]);

    return res.json({
      success: true,
      message: `Added ${quantity} units to ${sku}`,
      product: result.rows[0]
    });
  } catch (error) {
    console.error('Error adding stock:', { sku, quantity, error: error.message, stack: error.stack });
    return res.status(500).json({
      success: false,
      message: 'Failed to add stock'
    });
  }
});

// POST /api/inventory - Create new inventory item OR update existing item
router.post('/', upload.single('image'), async (req, res) => {
  const { sku, name, description, category, quantity, unit_price, image_data, isUpdate, supplier_id, uom, conversion_qty, expirable, expiration } = req.body;

  // Convert expirable to boolean
  const expirableBool = expirable === 'true' || expirable === true;

  // Handle empty string conversion_qty - convert to null for database
  const conversionQty = conversion_qty === '' || conversion_qty === null ? null : Number(conversion_qty);
  // Sanitize optional fields that may arrive as empty strings from FormData
  const supplierId = supplier_id === '' || supplier_id === null || typeof supplier_id === 'undefined' ? null : Number(supplier_id);
  const uomValue = !uom || (typeof uom === 'string' && uom.trim() === '') ? null : uom;
  const expirationDate = expiration === '' || typeof expiration === 'undefined' || expiration === null ? null : expiration;

  console.log('Inventory POST request:', { sku, isUpdate, name });

  try {
    // Check if item already exists
    const existingItem = await pool.query('SELECT sku FROM inventory_items WHERE sku = $1', [sku]);
    const itemExists = existingItem.rows.length > 0;

    if (isUpdate || (itemExists && isUpdate !== false)) {
      // This is an update operation
      if (!itemExists) {
        return res.status(404).json({
          success: false,
          message: 'Item not found for update'
        });
      }

      // Handle image data if provided
      let imageBuffer = null;
      if (req.file) {
        // Image uploaded via FormData
        imageBuffer = req.file.buffer;
      } else if (image_data) {
        // Base64 image data from JSON
        imageBuffer = Buffer.from(image_data.replace(/^data:image\/[a-z]+;base64,/, ''), 'base64');
      }

      // Check if expirable column exists before including it in the query
      const columnCheck = await pool.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'inventory_items'
        AND column_name = 'expirable'
      `);

      const hasExpirableColumn = columnCheck.rows.length > 0;

      let result;
      if (hasExpirableColumn) {
        result = await pool.query(`
          UPDATE inventory_items
          SET name = COALESCE($1, name),
              description = COALESCE($2, description),
              category = COALESCE($3, category),
              unit_price = COALESCE($4, unit_price),
              image_data = COALESCE($5, image_data),
              supplier_id = COALESCE($6, supplier_id),
              uom = COALESCE($7, uom),
              conversion_qty = COALESCE($8, conversion_qty),
              expirable = COALESCE($9, expirable),
              expiration = COALESCE($10, expiration),
              last_updated = NOW()
          WHERE sku = $11
          RETURNING sku, name, description, category, quantity, unit_price, supplier_id, uom, conversion_qty, expirable, expiration
        `, [name, description, category, unit_price, imageBuffer, supplierId, uomValue, conversionQty, expirableBool, expirationDate, sku]);
      } else {
        result = await pool.query(`
          UPDATE inventory_items
          SET name = COALESCE($1, name),
              description = COALESCE($2, description),
              category = COALESCE($3, category),
              unit_price = COALESCE($4, unit_price),
              image_data = COALESCE($5, image_data),
              supplier_id = COALESCE($6, supplier_id),
              uom = COALESCE($7, uom),
              conversion_qty = COALESCE($8, conversion_qty),
              last_updated = NOW()
          WHERE sku = $9
          RETURNING sku, name, description, category, quantity, unit_price, supplier_id, uom, conversion_qty
        `, [name, description, category, unit_price, imageBuffer, supplierId, uomValue, conversionQty, sku]);
      }

      return res.json({
        success: true,
        message: 'Item updated successfully',
        product: result.rows[0]
      });
    } else {
      // This is a create operation
      if (itemExists) {
        return res.status(400).json({
          success: false,
          message: 'Item with this SKU already exists'
        });
      }

      // Handle image data if provided
      let imageBuffer = null;
      if (req.file) {
        // Image uploaded via FormData
        imageBuffer = req.file.buffer;
      } else if (image_data) {
        // Base64 image data from JSON
        imageBuffer = Buffer.from(image_data.replace(/^data:image\/[a-z]+;base64,/, ''), 'base64');
      }

      // Check if expirable column exists before including it in the query
      const columnCheck = await pool.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'inventory_items'
        AND column_name = 'expirable'
      `);

      const hasExpirableColumn = columnCheck.rows.length > 0;

      let result;
      if (hasExpirableColumn) {
        result = await pool.query(`
          INSERT INTO inventory_items (sku, name, description, category, quantity, unit_price, image_data, supplier_id, uom, conversion_qty, expirable, expiration, is_active, last_updated)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, true, NOW())
          RETURNING sku, name, description, category, quantity, unit_price, supplier_id, uom, conversion_qty, expirable, expiration
        `, [sku, name, description, category, quantity || 0, unit_price, imageBuffer, supplierId, uomValue, conversionQty, expirableBool, expirationDate]);
      } else {
        result = await pool.query(`
          INSERT INTO inventory_items (sku, name, description, category, quantity, unit_price, image_data, supplier_id, uom, conversion_qty, is_active, last_updated)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true, NOW())
          RETURNING sku, name, description, category, quantity, unit_price, supplier_id, uom, conversion_qty
        `, [sku, name, description, category, quantity || 0, unit_price, imageBuffer, supplierId, uomValue, conversionQty]);
      }

      return res.status(201).json({
        success: true,
        message: 'Item created successfully',
        product: result.rows[0]
      });
    }
  } catch (error) {
    console.error('Error in inventory POST:', { sku, error: error.message, stack: error.stack });
    return res.status(500).json({
      success: false,
      message: 'Failed to process item'
    });
  }
});

// PUT /api/inventory/:sku - Update inventory item
router.put('/:sku', async (req, res) => {
  const { sku } = req.params;
  const { name, description, category, quantity, unit_price, image_data, supplier_id, uom, conversion_qty, expirable, expiration } = req.body;

  // Convert expirable to boolean
  const expirableBool = expirable === 'true' || expirable === true;

  // Handle empty string conversion_qty - convert to null for database
  const conversionQty = conversion_qty === '' || conversion_qty === null ? null : Number(conversion_qty);
  // Sanitize optional fields
  const supplierId = supplier_id === '' || supplier_id === null || typeof supplier_id === 'undefined' ? null : Number(supplier_id);
  const uomValue = !uom || (typeof uom === 'string' && uom.trim() === '') ? null : uom;
  const expirationDate = expiration === '' || typeof expiration === 'undefined' || expiration === null ? null : expiration;

  try {
    // Check if item exists and is active
    const existingItem = await pool.query('SELECT sku FROM inventory_items WHERE sku = $1 AND is_active = true', [sku]);
    if (existingItem.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }

    // Handle image data if provided
    let imageBuffer = null;
    if (image_data) {
      imageBuffer = Buffer.from(image_data.replace(/^data:image\/[a-z]+;base64,/, ''), 'base64');
    }

    // Check if expirable column exists before including it in the query
    const columnCheck = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'inventory_items'
      AND column_name = 'expirable'
    `);

    const hasExpirableColumn = columnCheck.rows.length > 0;

    let result;
    if (hasExpirableColumn) {
      result = await pool.query(`
        UPDATE inventory_items
        SET name = COALESCE($1, name),
            description = COALESCE($2, description),
            category = COALESCE($3, category),
            quantity = COALESCE($4, quantity),
            unit_price = COALESCE($5, unit_price),
            image_data = COALESCE($6, image_data),
            supplier_id = COALESCE($7, supplier_id),
            uom = COALESCE($8, uom),
            conversion_qty = COALESCE($9, conversion_qty),
            expirable = COALESCE($10, expirable),
            expiration = COALESCE($11, expiration),
            last_updated = NOW()
        WHERE sku = $12
        RETURNING sku, name, description, category, quantity, unit_price, supplier_id, uom, conversion_qty, expirable, expiration
      `, [name, description, category, quantity, unit_price, imageBuffer, supplierId, uomValue, conversionQty, expirableBool, expirationDate, sku]);
    } else {
      result = await pool.query(`
        UPDATE inventory_items
        SET name = COALESCE($1, name),
            description = COALESCE($2, description),
            category = COALESCE($3, category),
            quantity = COALESCE($4, quantity),
            unit_price = COALESCE($5, unit_price),
            image_data = COALESCE($6, image_data),
            supplier_id = COALESCE($7, supplier_id),
            uom = COALESCE($8, uom),
            conversion_qty = COALESCE($9, conversion_qty),
            last_updated = NOW()
        WHERE sku = $10
        RETURNING sku, name, description, category, quantity, unit_price, supplier_id, uom, conversion_qty
      `, [name, description, category, quantity, unit_price, imageBuffer, supplierId, uomValue, conversionQty, sku]);
    }

    return res.json({
      success: true,
      message: 'Item updated successfully',
      product: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating inventory item:', { sku, error: error.message, stack: error.stack });
    return res.status(500).json({
      success: false,
      message: 'Failed to update item'
    });
  }
});

// DELETE /api/inventory/:sku - Delete inventory item
router.delete('/:sku', async (req, res) => {
  const { sku } = req.params;

  try {
    // Check if item exists and is active
    const existingItem = await pool.query('SELECT sku FROM inventory_items WHERE sku = $1 AND is_active = true', [sku]);
    if (existingItem.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Item not found or already deleted'
      });
    }

    // Soft delete item (set is_active to false)
    await pool.query('UPDATE inventory_items SET is_active = false, last_updated = NOW() WHERE sku = $1', [sku]);

    return res.json({
      success: true,
      message: 'Item deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting inventory item:', { sku, error: error.message, stack: error.stack });
    return res.status(500).json({
      success: false,
      message: 'Failed to delete item'
    });
  }
});

// PATCH /api/inventory/:sku/restore - Restore soft-deleted inventory item
router.patch('/:sku/restore', async (req, res) => {
  const { sku } = req.params;

  try {
    // Check if item exists (including inactive ones)
    const existingItem = await pool.query('SELECT sku FROM inventory_items WHERE sku = $1', [sku]);
    if (existingItem.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }

    // Restore item (set is_active to true)
    await pool.query('UPDATE inventory_items SET is_active = true, last_updated = NOW() WHERE sku = $1', [sku]);
    return res.json({
      success: true,
      message: 'Item restored successfully'
    });
  } catch (error) {
    console.error('Error restoring inventory item:', { sku, error: error.message, stack: error.stack });
    return res.status(500).json({
      success: false,
      message: 'Failed to restore item'
    });
  }
});

module.exports = router;
