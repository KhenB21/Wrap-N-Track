const express = require('express');
const router = express.Router();
const pool = require('../config/db');

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

// Apply authentication middleware to all inventory routes
router.use(verifyToken);

// GET /api/inventory - Get all inventory items
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        sku, 
        name, 
        description,
        category, 
        quantity, 
        unit_price, 
        last_updated,
        CASE 
          WHEN image_data IS NOT NULL THEN encode(image_data, 'base64')
          ELSE NULL 
        END as image_data
      FROM inventory_items 
      ORDER BY name ASC
    `);
    
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
        sku, 
        name, 
        description,
        category, 
        quantity, 
        unit_price, 
        last_updated,
        CASE 
          WHEN image_data IS NOT NULL THEN encode(image_data, 'base64')
          ELSE NULL 
        END as image_data
      FROM inventory_items 
      WHERE sku = $1
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
    // Check if item exists
    const existingItem = await pool.query('SELECT sku, name, quantity FROM inventory_items WHERE sku = $1', [sku]);
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
router.post('/', async (req, res) => {
  const { sku, name, description, category, quantity, unit_price, image_data, isUpdate } = req.body;
  
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
      if (image_data) {
        imageBuffer = Buffer.from(image_data.replace(/^data:image\/[a-z]+;base64,/, ''), 'base64');
      }
      
      const result = await pool.query(`
        UPDATE inventory_items 
        SET name = COALESCE($1, name),
            description = COALESCE($2, description),
            category = COALESCE($3, category),
            unit_price = COALESCE($4, unit_price),
            image_data = COALESCE($5, image_data),
            last_updated = NOW()
        WHERE sku = $6
        RETURNING sku, name, description, category, quantity, unit_price
      `, [name, description, category, unit_price, imageBuffer, sku]);
      
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
      
      // Convert base64 to bytea if image_data is provided
      let imageBuffer = null;
      if (image_data) {
        imageBuffer = Buffer.from(image_data.replace(/^data:image\/[a-z]+;base64,/, ''), 'base64');
      }
      
      const result = await pool.query(`
        INSERT INTO inventory_items (sku, name, description, category, quantity, unit_price, image_data, last_updated)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        RETURNING sku, name, description, category, quantity, unit_price
      `, [sku, name, description, category, quantity || 0, unit_price, imageBuffer]);
      
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
  const { name, description, category, quantity, unit_price, image_data } = req.body;
  
  try {
    // Check if item exists
    const existingItem = await pool.query('SELECT sku FROM inventory_items WHERE sku = $1', [sku]);
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
    
    const result = await pool.query(`
      UPDATE inventory_items 
      SET name = COALESCE($1, name),
          description = COALESCE($2, description),
          category = COALESCE($3, category),
          quantity = COALESCE($4, quantity),
          unit_price = COALESCE($5, unit_price),
          image_data = COALESCE($6, image_data),
          last_updated = NOW()
      WHERE sku = $7
      RETURNING sku, name, description, category, quantity, unit_price
    `, [name, description, category, quantity, unit_price, imageBuffer, sku]);
    
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
    // Check if item exists
    const existingItem = await pool.query('SELECT sku FROM inventory_items WHERE sku = $1', [sku]);
    if (existingItem.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Item not found' 
      });
    }
    
    // Delete item
    await pool.query('DELETE FROM inventory_items WHERE sku = $1', [sku]);
    
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

module.exports = router;
