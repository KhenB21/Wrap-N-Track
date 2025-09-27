const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const verifyJwt = require('../middleware/verifyJwt');

// Apply authentication middleware to all routes
router.use(verifyJwt());

// GET /api/cart - Get customer's cart
router.get('/', async (req, res) => {
  try {
    const customerId = req.user.customer_id;
    
    // If user is not a customer (e.g., admin), return empty cart
    if (!customerId) {
      return res.json({
        success: true,
        cart: [],
        totals: {
          itemCount: 0,
          cartTotal: 0
        }
      });
    }

    const result = await pool.query(`
      SELECT 
        cc.cart_id,
        cc.sku,
        ii.name as product_name,
        ii.description,
        ii.unit_price,
        ii.image_data,
        cc.quantity,
        (ii.unit_price * cc.quantity) as total_price,
        cc.added_at,
        cc.updated_at
      FROM customer_cart cc
      JOIN inventory_items ii ON cc.sku = ii.sku
      WHERE cc.customer_id = $1
      ORDER BY cc.added_at DESC
    `, [customerId]);

    // Calculate cart totals
    const cartTotal = result.rows.reduce((sum, item) => sum + parseFloat(item.total_price), 0);
    const itemCount = result.rows.reduce((sum, item) => sum + item.quantity, 0);

    res.json({
      success: true,
      cart: result.rows,
      totals: {
        itemCount,
        cartTotal: parseFloat(cartTotal.toFixed(2))
      }
    });
  } catch (error) {
    console.error('Error fetching cart:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch cart'
    });
  }
});

// POST /api/cart/add - Add item to cart
router.post('/add', async (req, res) => {
  try {
    const { sku, quantity = 1 } = req.body;
    const customerId = req.user.customer_id;

    // If user is not a customer (e.g., admin), return success but don't add to cart
    if (!customerId) {
      return res.json({
        success: true,
        message: 'Cart functionality not available for admin users'
      });
    }

    if (!sku || quantity <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid SKU and quantity are required'
      });
    }

    // Check if product exists and is available
    const productResult = await pool.query(
      'SELECT sku, name, unit_price, quantity as stock_quantity FROM inventory_items WHERE sku = $1',
      [sku]
    );

    if (productResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const product = productResult.rows[0];
    
    if (product.stock_quantity < quantity) {
      return res.status(400).json({
        success: false,
        message: `Only ${product.stock_quantity} items available in stock`
      });
    }

    // Check if item already exists in cart
    const existingItem = await pool.query(
      'SELECT quantity FROM customer_cart WHERE customer_id = $1 AND sku = $2',
      [customerId, sku]
    );

    if (existingItem.rows.length > 0) {
      // Update existing item quantity
      const newQuantity = existingItem.rows[0].quantity + quantity;
      
      if (newQuantity > product.stock_quantity) {
        return res.status(400).json({
          success: false,
          message: `Cannot add ${quantity} items. Only ${product.stock_quantity - existingItem.rows[0].quantity} more available`
        });
      }

      await pool.query(
        'UPDATE customer_cart SET quantity = $1, updated_at = CURRENT_TIMESTAMP WHERE customer_id = $2 AND sku = $3',
        [newQuantity, customerId, sku]
      );
    } else {
      // Add new item to cart
      await pool.query(
        'INSERT INTO customer_cart (customer_id, sku, quantity) VALUES ($1, $2, $3)',
        [customerId, sku, quantity]
      );
    }

    res.json({
      success: true,
      message: 'Item added to cart successfully'
    });
  } catch (error) {
    console.error('Error adding item to cart:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add item to cart'
    });
  }
});

// PUT /api/cart/update - Update item quantity in cart
router.put('/update', async (req, res) => {
  try {
    const { sku, quantity } = req.body;
    const customerId = req.user.customer_id;

    // If user is not a customer (e.g., admin), return success but don't update cart
    if (!customerId) {
      return res.json({
        success: true,
        message: 'Cart functionality not available for admin users'
      });
    }

    if (!sku || quantity < 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid SKU and non-negative quantity are required'
      });
    }

    // Check stock availability
    const productResult = await pool.query(
      'SELECT quantity as stock_quantity FROM inventory_items WHERE sku = $1',
      [sku]
    );

    if (productResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const stockQuantity = productResult.rows[0].stock_quantity;
    
    if (quantity > stockQuantity) {
      return res.status(400).json({
        success: false,
        message: `Only ${stockQuantity} items available in stock`
      });
    }

    if (quantity === 0) {
      // Remove item from cart
      await pool.query(
        'DELETE FROM customer_cart WHERE customer_id = $1 AND sku = $2',
        [customerId, sku]
      );
    } else {
      // Update quantity
      const result = await pool.query(
        'UPDATE customer_cart SET quantity = $1, updated_at = CURRENT_TIMESTAMP WHERE customer_id = $2 AND sku = $3',
        [quantity, customerId, sku]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({
          success: false,
          message: 'Item not found in cart'
        });
      }
    }

    res.json({
      success: true,
      message: 'Cart updated successfully'
    });
  } catch (error) {
    console.error('Error updating cart:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update cart'
    });
  }
});

// DELETE /api/cart/remove - Remove item from cart
router.delete('/remove', async (req, res) => {
  try {
    const { sku } = req.body;
    const customerId = req.user.customer_id;

    // If user is not a customer (e.g., admin), return success but don't remove from cart
    if (!customerId) {
      return res.json({
        success: true,
        message: 'Cart functionality not available for admin users'
      });
    }

    if (!sku) {
      return res.status(400).json({
        success: false,
        message: 'SKU is required'
      });
    }

    const result = await pool.query(
      'DELETE FROM customer_cart WHERE customer_id = $1 AND sku = $2',
      [customerId, sku]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Item not found in cart'
      });
    }

    res.json({
      success: true,
      message: 'Item removed from cart successfully'
    });
  } catch (error) {
    console.error('Error removing item from cart:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove item from cart'
    });
  }
});

// DELETE /api/cart/clear - Clear entire cart
router.delete('/clear', async (req, res) => {
  try {
    const customerId = req.user.customer_id;

    // If user is not a customer (e.g., admin), return success but don't clear cart
    if (!customerId) {
      return res.json({
        success: true,
        message: 'Cart functionality not available for admin users'
      });
    }

    await pool.query(
      'DELETE FROM customer_cart WHERE customer_id = $1',
      [customerId]
    );

    res.json({
      success: true,
      message: 'Cart cleared successfully'
    });
  } catch (error) {
    console.error('Error clearing cart:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear cart'
    });
  }
});

// GET /api/cart/count - Get cart item count
router.get('/count', async (req, res) => {
  try {
    const customerId = req.user.customer_id;

    // If user is not a customer (e.g., admin), return 0 count
    if (!customerId) {
      return res.json({
        success: true,
        itemCount: 0
      });
    }

    const result = await pool.query(
      'SELECT get_cart_item_count($1) as item_count',
      [customerId]
    );

    res.json({
      success: true,
      itemCount: parseInt(result.rows[0].item_count)
    });
  } catch (error) {
    console.error('Error getting cart count:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get cart count'
    });
  }
});

// POST /api/cart/checkout - Convert cart to order
router.post('/checkout', async (req, res) => {
  let client;
  try {
    const customerId = req.user.customer_id;
    const { 
      shipping_address, 
      payment_method, 
      payment_type = 'Online',
      remarks = '',
      expected_delivery 
    } = req.body;

    // If user is not a customer (e.g., admin), return error
    if (!customerId) {
      return res.status(400).json({
        success: false,
        message: 'Checkout functionality not available for admin users'
      });
    }

    if (!shipping_address || !payment_method) {
      return res.status(400).json({
        success: false,
        message: 'Shipping address and payment method are required'
      });
    }

    client = await pool.connect();
    await client.query('BEGIN');

    // Get customer details
    const customerResult = await client.query(
      'SELECT name, email_address, phone_number FROM customer_details WHERE customer_id = $1',
      [customerId]
    );

    if (customerResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    const customer = customerResult.rows[0];

    // Get cart items
    const cartResult = await client.query(`
      SELECT 
        cc.sku,
        ii.name,
        ii.unit_price,
        cc.quantity
      FROM customer_cart cc
      JOIN inventory_items ii ON cc.sku = ii.sku
      WHERE cc.customer_id = $1
    `, [customerId]);

    if (cartResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Cart is empty'
      });
    }

    // Calculate total cost
    const totalCost = cartResult.rows.reduce((sum, item) => 
      sum + (parseFloat(item.unit_price) * item.quantity), 0
    );

    // Generate order ID
    const orderId = `#CO${Date.now()}`;

    // Create order
    await client.query(`
      INSERT INTO orders (
        order_id, name, shipped_to, order_date, expected_delivery,
        status, shipping_address, total_cost, payment_type, payment_method,
        account_name, remarks, telephone, cellphone, email_address,
        customer_id, order_placed_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
    `, [
      orderId, customer.name, customer.name, new Date().toISOString().split('T')[0],
      expected_delivery, 'Order Placed', shipping_address, totalCost,
      payment_type, payment_method, customer.name, remarks,
      customer.phone_number, customer.phone_number, customer.email_address,
      customerId, new Date()
    ]);

    // Add order products
    for (const item of cartResult.rows) {
      await client.query(`
        INSERT INTO order_products (order_id, sku, quantity, profit_margin, profit_estimation)
        VALUES ($1, $2, $3, 0, 0)
      `, [orderId, item.sku, item.quantity]);
    }

    // Clear cart
    await client.query(
      'DELETE FROM customer_cart WHERE customer_id = $1',
      [customerId]
    );

    // Add to status history
    await client.query(`
      INSERT INTO order_status_history (order_id, old_status, new_status, updated_by, notes)
      VALUES ($1, NULL, 'Order Placed', NULL, 'Order created from cart checkout')
    `, [orderId]);

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Order placed successfully',
      orderId,
      totalCost: parseFloat(totalCost.toFixed(2))
    });
  } catch (error) {
    if (client) {
      await client.query('ROLLBACK');
    }
    console.error('Error during checkout:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process checkout'
    });
  } finally {
    if (client) {
      client.release();
    }
  }
});

module.exports = router;
