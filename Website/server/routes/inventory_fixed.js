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

module.exports = router;
