const express = require('express');
const multer = require('multer');
const router = express.Router();
const pool = require('../config/db');
const { broadcastInventoryUpdate, broadcastInventoryCreated, broadcastInventoryArchived, broadcastInventoryRestored } = require('../broadcast');

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
    await ensureInventorySchema();
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
        ${inventorySelect},
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

let schemaReady = false;

const toNumberOrNull = (value) => {
  if (value === '' || value === null || typeof value === 'undefined') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const allowedInventoryRoles = new Set([
  'admin',
  'super_admin',
  'director',
  'operations_manager',
  'sales_manager',
  'business_developer',
  'creatives',
  'assistant_sales',
  'packer'
]);

const requireInventoryStaff = (req, res, next) => {
  const role = String(req.user?.role || '').toLowerCase();
  if (!allowedInventoryRoles.has(role)) {
    return res.status(403).json({
      success: false,
      message: 'Inventory scanner lookup is restricted to authorized staff'
    });
  }
  next();
};

const toBoolean = (value) => value === 'true' || value === true;

const getActor = (req) => {
  if (!req.user) return null;
  return req.user.employee_id || req.user.user_id || req.user.id || req.user.email || req.user.username || null;
};

// { id, name } for the "updated by" real-time UI — never expose more than that.
const getActorInfo = (req) => {
  if (!req.user) return null;
  const id = req.user.user_id || req.user.employee_id || req.user.id || null;
  const name = req.user.name || null;
  if (!id && !name) return null;
  return { id, name };
};

const getStockStatus = (quantity, reorderLevel) => {
  const qty = Number(quantity || 0);
  const reorder = Number(reorderLevel || 0);
  if (qty <= 0) return 'Out of Stock';
  if (qty <= reorder) return 'Low Stock';
  return 'In Stock';
};

const categoryCodeMap = {
  box: 'BOX',
  boxes: 'BOX',
  ribbon: 'RIB',
  ribbons: 'RIB',
  wrap: 'WRAP',
  wraps: 'WRAP',
  'gift wraps': 'WRAP',
  card: 'CARD',
  cards: 'CARD',
  bag: 'BAG',
  bags: 'BAG',
  accessories: 'ACC',
  accessory: 'ACC',
  gift: 'GIFT',
  'gift items': 'GIFT',
  stationery: 'STAT',
  'party supplies': 'PARTY'
};

const getCategoryCode = (category = '') => {
  const normalized = String(category).trim().toLowerCase();
  if (categoryCodeMap[normalized]) return categoryCodeMap[normalized];
  const words = normalized.match(/[a-z0-9]+/g) || [];
  if (words.length > 1) {
    const initials = words.map(word => word[0]).join('').toUpperCase();
    if (initials.length >= 2) return initials.slice(0, 5);
  }
  const compact = normalized.replace(/[^a-z0-9]/g, '').toUpperCase();
  return (compact || 'ITEM').slice(0, 5);
};

const ensureInventorySchema = async (client = pool) => {
  if (schemaReady) return;

  await client.query(`
    ALTER TABLE inventory_items
      ADD COLUMN IF NOT EXISTS id BIGSERIAL,
      ADD COLUMN IF NOT EXISTS barcode_value TEXT,
      ADD COLUMN IF NOT EXISTS qr_value TEXT,
      ADD COLUMN IF NOT EXISTS reorder_level INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS expirable BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS expiration DATE,
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  `);

  await client.query(`
    UPDATE inventory_items
    SET barcode_value = COALESCE(NULLIF(barcode_value, ''), sku),
        qr_value = COALESCE(NULLIF(qr_value, ''), sku),
        updated_at = COALESCE(updated_at, last_updated, NOW()),
        created_at = COALESCE(created_at, last_updated, NOW()),
        reorder_level = COALESCE(reorder_level, 0)
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS stock_movements (
      id BIGSERIAL PRIMARY KEY,
      product_id TEXT NOT NULL,
      movement_type TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 0,
      previous_quantity INTEGER,
      new_quantity INTEGER,
      reason TEXT,
      performed_by TEXT,
      source TEXT DEFAULT 'manual',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  // Add source column if it was created before this migration
  await client.query(`ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual'`);

  await client.query('CREATE INDEX IF NOT EXISTS idx_stock_movements_product_id ON stock_movements(product_id)');
  await client.query('CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at ON stock_movements(created_at DESC)');
  await client.query('CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_barcode_value ON inventory_items(barcode_value) WHERE barcode_value IS NOT NULL');
  await client.query('CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_qr_value ON inventory_items(qr_value) WHERE qr_value IS NOT NULL');

  schemaReady = true;
};

const inventorySelect = `
  i.id,
  i.sku,
  i.sku AS product_id,
  i.name,
  i.name AS product_name,
  i.description,
  i.category,
  i.quantity,
  i.unit_price,
  i.last_updated,
  i.uom,
  i.uom AS unit,
  i.conversion_qty,
  i.expirable,
  i.expiration,
  i.supplier_id,
  i.barcode_value,
  i.qr_value,
  i.reorder_level,
  i.created_at,
  i.updated_at,
  CASE
    WHEN i.quantity <= 0 THEN 'Out of Stock'
    WHEN i.quantity <= COALESCE(i.reorder_level, 0) THEN 'Low Stock'
    ELSE 'In Stock'
  END AS stock_status,
  s.name as supplier_name,
  s.phone as supplier_phone,
  s.website as supplier_website,
  CASE
    WHEN i.image_data IS NOT NULL THEN encode(i.image_data, 'base64')
    ELSE NULL
  END as image_data
`;

const generateSku = async (category, client = pool) => {
  const categoryCode = getCategoryCode(category);
  const result = await client.query(`
    SELECT COALESCE(MAX(substring(sku FROM '-([0-9]{6})$')::INTEGER), 0) AS max_sequence
    FROM inventory_items
    WHERE sku ~ '-[0-9]{6}$'
  `);
  const nextSequence = Number(result.rows[0]?.max_sequence || 0) + 1;
  return `${categoryCode}-${String(nextSequence).padStart(6, '0')}`;
};

const logStockMovement = async (client, {
  sku,
  movement_type,
  quantity = 0,
  previous_quantity = null,
  new_quantity = null,
  reason = null,
  performed_by = null,
  source = 'manual'
}) => {
  await client.query(`
    INSERT INTO stock_movements (
      product_id,
      movement_type,
      quantity,
      previous_quantity,
      new_quantity,
      reason,
      performed_by,
      source
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
  `, [
    sku,
    movement_type,
    Number(quantity || 0),
    previous_quantity,
    new_quantity,
    reason,
    performed_by,
    source || 'manual'
  ]);
};

// Middleware: tries to verify JWT but never blocks — records performed_by when token present
const optionalVerifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = (authHeader.split(' ')[1] || '').trim();
    try {
      req.user = jwt.verify(token, process.env.JWT_SECRET);
    } catch (_) { /* invalid or expired — proceed without user */ }
  }
  next();
};

// GET /api/inventory - Get all inventory items (public route for order process)
router.get('/', async (req, res) => {
  try {
    await ensureInventorySchema();
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
        ${inventorySelect},
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

// GET /api/inventory/scan/:code - Staff scanner lookup by SKU, barcode, or QR value
router.get('/scan/:code', verifyToken, requireInventoryStaff, async (req, res) => {
  const { code } = req.params;

  try {
    await ensureInventorySchema();
    const result = await pool.query(`
      SELECT ${inventorySelect}
      FROM inventory_items i
      LEFT JOIN suppliers s ON i.supplier_id = s.supplier_id
      WHERE i.is_active = true
        AND (i.sku = $1 OR i.barcode_value = $2 OR i.qr_value = $3)
      LIMIT 1
    `, [code, code, code]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No active product found for this scanned code'
      });
    }

    return res.json({
      success: true,
      item: result.rows[0]
    });
  } catch (error) {
    console.error('Error looking up scanned inventory code:', { code, error: error.message, stack: error.stack });
    return res.status(500).json({
      success: false,
      message: 'Failed to look up scanned code'
    });
  }
});

// GET /api/inventory/movements/:sku - Get stock movement history for one product
router.get('/movements/:sku', async (req, res) => {
  const { sku } = req.params;

  try {
    await ensureInventorySchema();
    const result = await pool.query(`
      SELECT id, product_id, movement_type, quantity, previous_quantity, new_quantity, reason, performed_by, created_at
      FROM stock_movements
      WHERE product_id = $1
      ORDER BY created_at DESC
      LIMIT 100
    `, [sku]);

    return res.json({
      success: true,
      movements: result.rows
    });
  } catch (error) {
    console.error('Error fetching stock movements:', { sku, error: error.message, stack: error.stack });
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch stock movements'
    });
  }
});

// GET /api/inventory/:sku - Get specific inventory item
router.get('/:sku', async (req, res) => {
  const { sku } = req.params;
  try {
    await ensureInventorySchema();
    const result = await pool.query(`
      SELECT
        ${inventorySelect}
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
router.post('/add-stock', optionalVerifyToken, async (req, res) => {
  const { sku, quantity, reason, source } = req.body;

  console.log('Add stock request received:', { sku, quantity, reason });

  const movementQuantity = Number(quantity);
  if (!sku || !Number.isInteger(movementQuantity) || movementQuantity <= 0) {
    return res.status(400).json({
      success: false,
      message: 'SKU and positive quantity are required'
    });
  }

  const client = await pool.connect();
  try {
    await ensureInventorySchema(client);
    await client.query('BEGIN');

    // Check if item exists and is active
    const existingItem = await client.query('SELECT sku, name, quantity FROM inventory_items WHERE sku = $1 AND is_active = true FOR UPDATE', [sku]);
    if (existingItem.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }

    const previousQuantity = Number(existingItem.rows[0].quantity || 0);
    const newQuantity = previousQuantity + movementQuantity;

    // Update quantity
    const result = await client.query(`
      UPDATE inventory_items
      SET quantity = $1, last_updated = NOW(), updated_at = NOW()
      WHERE sku = $2
      RETURNING sku, name, quantity
    `, [newQuantity, sku]);

    await logStockMovement(client, {
      sku,
      movement_type: 'STOCK_IN',
      quantity: movementQuantity,
      previous_quantity: previousQuantity,
      new_quantity: newQuantity,
      reason,
      performed_by: getActor(req),
      source: source || 'manual'
    });

    await client.query('COMMIT');

    console.log('Stock added successfully:', result.rows[0]);
    broadcastInventoryUpdate({
      action: 'STOCK_IN',
      sku,
      product: result.rows[0],
      previousQuantity,
      newQuantity,
      adjustmentQuantity: movementQuantity,
      adjustmentType: 'ADD',
      updatedBy: getActorInfo(req)
    });

    return res.json({
      success: true,
      message: `Added ${quantity} units to ${sku}`,
      product: result.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error adding stock:', { sku, quantity, error: error.message, stack: error.stack });
    return res.status(500).json({
      success: false,
      message: 'Failed to add stock'
    });
  } finally {
    client.release();
  }
});

// POST /api/inventory/stock-out - Deduct stock from an existing item
router.post('/stock-out', optionalVerifyToken, async (req, res) => {
  const { sku, quantity, reason, source } = req.body;
  const movementQuantity = Number(quantity);

  if (!sku || !Number.isInteger(movementQuantity) || movementQuantity <= 0) {
    return res.status(400).json({
      success: false,
      message: 'SKU and positive quantity are required'
    });
  }

  const client = await pool.connect();
  try {
    await ensureInventorySchema(client);
    await client.query('BEGIN');

    const existingItem = await client.query('SELECT sku, name, quantity FROM inventory_items WHERE sku = $1 AND is_active = true FOR UPDATE', [sku]);
    if (existingItem.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }

    const previousQuantity = Number(existingItem.rows[0].quantity || 0);
    const newQuantity = previousQuantity - movementQuantity;
    if (newQuantity < 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Stock out cannot make inventory negative'
      });
    }

    const result = await client.query(`
      UPDATE inventory_items
      SET quantity = $1, last_updated = NOW(), updated_at = NOW()
      WHERE sku = $2
      RETURNING sku, name, quantity
    `, [newQuantity, sku]);

    await logStockMovement(client, {
      sku,
      movement_type: 'STOCK_OUT',
      quantity: movementQuantity,
      previous_quantity: previousQuantity,
      new_quantity: newQuantity,
      reason,
      performed_by: getActor(req),
      source: source || 'manual'
    });

    await client.query('COMMIT');
    broadcastInventoryUpdate({
      action: 'STOCK_OUT',
      sku,
      product: result.rows[0],
      previousQuantity,
      newQuantity,
      adjustmentQuantity: movementQuantity,
      adjustmentType: 'REMOVE',
      updatedBy: getActorInfo(req)
    });

    return res.json({
      success: true,
      message: `Removed ${movementQuantity} units from ${sku}`,
      product: result.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error removing stock:', { sku, quantity, error: error.message, stack: error.stack });
    return res.status(500).json({
      success: false,
      message: 'Failed to remove stock'
    });
  } finally {
    client.release();
  }
});

// POST /api/inventory - Create new inventory item OR update existing item
router.post('/', optionalVerifyToken, upload.single('image'), async (req, res) => {
  const {
    sku,
    name,
    description,
    category,
    quantity,
    unit_price,
    image_data,
    isUpdate,
    supplier_id,
    uom,
    conversion_qty,
    expirable,
    expiration,
    reorder_level
  } = req.body;

  const isUpdateRequested = isUpdate === 'true' || isUpdate === true;
  const expirableBool = toBoolean(expirable);
  const conversionQty = toNumberOrNull(conversion_qty);
  const supplierId = toNumberOrNull(supplier_id);
  const uomValue = !uom || (typeof uom === 'string' && uom.trim() === '') ? null : uom;
  const expirationDate = expiration === '' || typeof expiration === 'undefined' || expiration === null ? null : expiration;
  const reorderLevel = Math.max(0, Number(toNumberOrNull(reorder_level) || 0));
  const productQuantity = Math.max(0, Number(toNumberOrNull(quantity) || 0));
  const unitPrice = Number(toNumberOrNull(unit_price) || 0);

  console.log('Inventory POST request:', { sku, isUpdate: isUpdateRequested, name, category });

  if (!name || !category) {
    return res.status(400).json({
      success: false,
      message: 'Product name and category are required'
    });
  }

  const client = await pool.connect();
  try {
    await ensureInventorySchema(client);
    await client.query('BEGIN');

    let imageBuffer = null;
    if (req.file) {
      imageBuffer = req.file.buffer;
    } else if (image_data) {
      imageBuffer = Buffer.from(image_data.replace(/^data:image\/[a-z]+;base64,/, ''), 'base64');
    }

    if (isUpdateRequested) {
      if (!sku) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: 'SKU is required for updates'
        });
      }

      const existingItem = await client.query('SELECT sku, quantity FROM inventory_items WHERE sku = $1 AND is_active = true FOR UPDATE', [sku]);
      if (existingItem.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          message: 'Item not found for update'
        });
      }

      const previousQuantity = Number(existingItem.rows[0].quantity || 0);
      const result = await client.query(`
        UPDATE inventory_items
        SET name = $1,
            description = $2,
            category = $3,
            unit_price = $4,
            image_data = COALESCE($5, image_data),
            supplier_id = $6,
            uom = $7,
            conversion_qty = $8,
            expirable = $9,
            expiration = $10,
            reorder_level = $11,
            barcode_value = sku,
            qr_value = sku,
            last_updated = NOW(),
            updated_at = NOW()
        WHERE sku = $12
        RETURNING sku, name, description, category, quantity, unit_price, supplier_id, uom, conversion_qty, expirable, expiration, barcode_value, qr_value, reorder_level, created_at, updated_at
      `, [name, description, category, unitPrice, imageBuffer, supplierId, uomValue, conversionQty, expirableBool, expirationDate, reorderLevel, sku]);

      await logStockMovement(client, {
        sku,
        movement_type: 'PRODUCT_UPDATED',
        quantity: 0,
        previous_quantity: previousQuantity,
        new_quantity: previousQuantity,
        reason: 'Product details updated',
        performed_by: getActor(req)
      });

      await client.query('COMMIT');

      broadcastInventoryUpdate({
        action: 'PRODUCT_UPDATED',
        sku,
        product: result.rows[0],
        previousQuantity,
        newQuantity: previousQuantity,
        adjustmentQuantity: 0,
        adjustmentType: 'DETAILS',
        updatedBy: getActorInfo(req)
      });

      return res.json({
        success: true,
        message: 'Item updated successfully',
        product: result.rows[0]
      });
    }

    await client.query(`SELECT pg_advisory_xact_lock(hashtext('inventory_sku_generation'))`);
    const generatedSku = await generateSku(category, client);
    const existingItem = await client.query('SELECT sku FROM inventory_items WHERE sku = $1', [generatedSku]);
    if (existingItem.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        success: false,
        message: 'Generated SKU already exists. Please try saving again.'
      });
    }

    const result = await client.query(
      `INSERT INTO inventory_items (
        sku,
        name,
        description,
        category,
        quantity,
        unit_price,
        image_data,
        supplier_id,
        uom,
        conversion_qty,
        expirable,
        expiration,
        barcode_value,
        qr_value,
        reorder_level,
        is_active,
        created_at,
        updated_at,
        last_updated
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $14, $15, $13, true, NOW(), NOW(), NOW())
      RETURNING sku, name, description, category, quantity, unit_price, supplier_id, uom, conversion_qty, expirable, expiration, barcode_value, qr_value, reorder_level, created_at, updated_at
    `, [generatedSku, name, description, category, productQuantity, unitPrice, imageBuffer, supplierId, uomValue, conversionQty, expirableBool, expirationDate, reorderLevel, generatedSku, generatedSku]);

    await logStockMovement(client, {
      sku: generatedSku,
      movement_type: 'PRODUCT_CREATED',
      quantity: productQuantity,
      previous_quantity: 0,
      new_quantity: productQuantity,
      reason: 'Product created',
      performed_by: getActor(req)
    });

    await client.query('COMMIT');

    broadcastInventoryCreated({
      sku: generatedSku,
      product: result.rows[0],
      updatedBy: getActorInfo(req)
    });

    return res.status(201).json({
      success: true,
      message: 'Item created successfully',
      product: result.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error in inventory POST:', { sku, error: error.message, stack: error.stack });
    return res.status(500).json({
      success: false,
      message: 'Failed to process item'
    });
  } finally {
    client.release();
  }
});

// PUT /api/inventory/:sku - Update inventory item
router.put('/:sku', optionalVerifyToken, async (req, res) => {
  const { sku } = req.params;
  const { name, description, category, quantity, unit_price, image_data, supplier_id, uom, conversion_qty, expirable, expiration, reorder_level } = req.body;

  // Convert expirable to boolean
  const expirableBool = typeof expirable === 'undefined' ? null : toBoolean(expirable);

  // Handle empty string conversion_qty - convert to null for database
  const conversionQty = conversion_qty === '' || conversion_qty === null ? null : Number(conversion_qty);
  // Sanitize optional fields
  const supplierId = supplier_id === '' || supplier_id === null || typeof supplier_id === 'undefined' ? null : Number(supplier_id);
  const uomValue = !uom || (typeof uom === 'string' && uom.trim() === '') ? null : uom;
  const expirationDate = expiration === '' || typeof expiration === 'undefined' || expiration === null ? null : expiration;
  const reorderLevel = typeof reorder_level === 'undefined' ? null : Math.max(0, Number(reorder_level || 0));

  try {
    await ensureInventorySchema();
    // Check if item exists and is active
    const existingItem = await pool.query('SELECT sku, quantity FROM inventory_items WHERE sku = $1 AND is_active = true', [sku]);
    if (existingItem.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }
    const previousQuantity = Number(existingItem.rows[0].quantity || 0);

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
            reorder_level = COALESCE($12, reorder_level),
            barcode_value = sku,
            qr_value = sku,
            last_updated = NOW(),
            updated_at = NOW()
        WHERE sku = $13
        RETURNING sku, name, description, category, quantity, unit_price, supplier_id, uom, conversion_qty, expirable, expiration, barcode_value, qr_value, reorder_level, created_at, updated_at
      `, [name, description, category, quantity, unit_price, imageBuffer, supplierId, uomValue, conversionQty, expirableBool, expirationDate, reorderLevel, sku]);
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
            reorder_level = COALESCE($10, reorder_level),
            barcode_value = sku,
            qr_value = sku,
            last_updated = NOW(),
            updated_at = NOW()
        WHERE sku = $11
        RETURNING sku, name, description, category, quantity, unit_price, supplier_id, uom, conversion_qty, barcode_value, qr_value, reorder_level, created_at, updated_at
      `, [name, description, category, quantity, unit_price, imageBuffer, supplierId, uomValue, conversionQty, reorderLevel, sku]);
    }

    const newQuantity = Number(result.rows[0].quantity || 0);
    broadcastInventoryUpdate({
      action: newQuantity !== previousQuantity ? 'STOCK_ADJUSTED' : 'PRODUCT_UPDATED',
      sku,
      product: result.rows[0],
      previousQuantity,
      newQuantity,
      adjustmentQuantity: newQuantity - previousQuantity,
      adjustmentType: newQuantity === previousQuantity ? 'DETAILS' : (newQuantity > previousQuantity ? 'ADD' : 'REMOVE'),
      updatedBy: getActorInfo(req)
    });

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
router.delete('/:sku', optionalVerifyToken, async (req, res) => {
  const { sku } = req.params;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const existingItem = await client.query('SELECT sku, name, is_active FROM inventory_items WHERE sku = $1', [sku]);
    if (existingItem.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }

    const item = existingItem.rows[0];
    if (!item.is_active) {
      await client.query('COMMIT');
      return res.json({
        success: true,
        alreadyArchived: true,
        message: 'Item is already archived'
      });
    }

    await client.query('UPDATE inventory_items SET is_active = false, last_updated = NOW() WHERE sku = $1', [sku]);
    await client.query(`CREATE TABLE IF NOT EXISTS public.available_inventory (
      category TEXT NOT NULL,
      sku TEXT NOT NULL REFERENCES public.inventory_items(sku) ON DELETE CASCADE,
      created_by UUID NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (category, sku)
    )`);
    await client.query('DELETE FROM public.available_inventory WHERE sku = $1', [sku]);
    await client.query('COMMIT');

    broadcastInventoryArchived({ sku: item.sku, product: { sku: item.sku, name: item.name }, updatedBy: getActorInfo(req) });

    return res.json({
      success: true,
      archived: true,
      message: 'Item archived successfully',
      product: {
        sku: item.sku,
        name: item.name
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error deleting inventory item:', { sku, error: error.message, stack: error.stack });
    return res.status(500).json({
      success: false,
      message: 'Failed to archive item'
    });
  } finally {
    client.release();
  }
});

// PATCH /api/inventory/:sku/restore - Restore soft-deleted inventory item
router.patch('/:sku/restore', optionalVerifyToken, async (req, res) => {
  const { sku } = req.params;

  try {
    // Check if item exists (including inactive ones)
    const existingItem = await pool.query('SELECT sku, name FROM inventory_items WHERE sku = $1', [sku]);
    if (existingItem.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }

    // Restore item (set is_active to true)
    await pool.query('UPDATE inventory_items SET is_active = true, last_updated = NOW() WHERE sku = $1', [sku]);

    broadcastInventoryRestored({
      sku,
      product: { sku, name: existingItem.rows[0].name },
      updatedBy: getActorInfo(req)
    });

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
