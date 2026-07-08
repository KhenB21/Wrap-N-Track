const express = require('express');
const pool = require('../config/db');
const multer = require('multer');
const upload = multer();
const verifyJwt = require('../middleware/verifyJwt');
const requireRole = require('../middleware/requireRole');

const router = express.Router();
const STAFF_SUPPLIER_ROLES = ['operations_manager', 'sales_manager', 'super_admin', 'admin', 'director'];

let supplierSchemaReady = false;
let supplierOrdersTableExists = null;

async function ensureSupplierSchema() {
  if (supplierSchemaReady) return;
  await pool.query(`
    ALTER TABLE suppliers
      ADD COLUMN IF NOT EXISTS telephone VARCHAR(30),
      ADD COLUMN IF NOT EXISTS cellphone VARCHAR(30),
      ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
  `);
  await pool.query(`
    UPDATE suppliers
    SET telephone = COALESCE(NULLIF(telephone, ''), phone),
        cellphone = COALESCE(NULLIF(cellphone, ''), phone)
    WHERE phone IS NOT NULL;
  `);
  supplierSchemaReady = true;
}

async function hasSupplierOrdersTable() {
  if (supplierOrdersTableExists !== null) return supplierOrdersTableExists;

  const result = await pool.query(
    `SELECT EXISTS (
       SELECT 1
       FROM information_schema.tables
       WHERE table_schema = 'public'
         AND table_name = 'supplier_orders'
     ) AS exists`
  );
  supplierOrdersTableExists = Boolean(result.rows[0]?.exists);
  return supplierOrdersTableExists;
}

const isValidEmail = (value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const isValidPhilippineMobile = (value) => {
  if (!value) return false;
  const phone = String(value).replace(/[^\d+]/g, '');
  return /^09\d{9}$/.test(phone) || /^\+639\d{9}$/.test(phone) || /^639\d{9}$/.test(phone);
};

const mapSupplier = (supplier) => ({
  supplier_id: supplier.supplier_id,
  name: supplier.name,
  contact_person: supplier.contact_person,
  telephone: supplier.telephone || supplier.phone,
  cellphone: supplier.cellphone || supplier.phone,
  email_address: supplier.email,
  description: supplier.notes,
  province: supplier.state,
  city_municipality: supplier.city,
  barangay: '',
  street_address: supplier.address,
  zip_code: supplier.postal_code,
  status: supplier.is_active === false ? 'inactive' : 'active',
  product_count: Number(supplier.product_count || 0),
  pending_order_count: Number(supplier.pending_order_count || 0),
  created_at: supplier.created_at,
  updated_at: supplier.updated_at
});

router.use(verifyJwt());
router.use(async (req, res, next) => {
  try {
    await ensureSupplierSchema();
    next();
  } catch (error) {
    console.error('Error preparing supplier schema:', error);
    res.status(500).json({ error: 'Failed to prepare supplier module' });
  }
});
router.use(requireRole(STAFF_SUPPLIER_ROLES));

// Get all suppliers
router.get('/', async (req, res) => {
  try {
    const includeSupplierOrders = await hasSupplierOrdersTable();
    const result = await pool.query(`
      SELECT
        s.*,
        COALESCE(products.product_count, 0) AS product_count,
        ${includeSupplierOrders ? 'COALESCE(orders.pending_order_count, 0)' : '0'} AS pending_order_count
      FROM suppliers s
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::int AS product_count
        FROM inventory_items i
        WHERE i.supplier_id = s.supplier_id
      ) products ON true
      ${includeSupplierOrders ? `
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::int AS pending_order_count
        FROM supplier_orders so
        WHERE so.supplier_id = s.supplier_id
      ) orders ON true
      ` : ''}
      WHERE s.is_active IS DISTINCT FROM false
      ORDER BY s.name
    `);
    
    const suppliers = result.rows.map(mapSupplier);
    
    res.json(suppliers);
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    res.status(500).json({ error: 'Failed to fetch suppliers' });
  }
});

router.get('/:supplier_id/products', async (req, res) => {
  try {
    const { supplier_id } = req.params;
    const supplierResult = await pool.query('SELECT supplier_id, name FROM suppliers WHERE supplier_id = $1', [supplier_id]);
    if (!supplierResult.rows.length) {
      return res.status(404).json({ error: 'Supplier not found' });
    }
    const result = await pool.query(`
      SELECT sku, name, category, quantity, unit_price, description
      FROM inventory_items
      WHERE supplier_id = $1
      ORDER BY name
    `, [supplier_id]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching supplier products:', error);
    res.status(500).json({ error: 'Failed to fetch supplier products' });
  }
});

// Get single supplier
router.get('/:supplier_id', async (req, res) => {
  try {
    const { supplier_id } = req.params;
    const result = await pool.query('SELECT * FROM suppliers WHERE supplier_id = $1 AND is_active IS DISTINCT FROM false', [supplier_id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Supplier not found' });
    }
    
    res.json(mapSupplier(result.rows[0]));
  } catch (error) {
    console.error('Error fetching supplier:', error);
    res.status(500).json({ error: 'Failed to fetch supplier' });
  }
});

// Create new supplier
router.post('/', upload.single('image'), async (req, res) => {
  try {
    const { 
      name, 
      contact_person, 
      telephone, 
      cellphone, 
      email_address, 
      description,
      province,
      city_municipality,
      barangay,
      street_address,
      zip_code
    } = req.body;

    // Validate required fields
    if (!name || !contact_person || !email_address || !cellphone) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['name', 'contact_person', 'email_address', 'cellphone']
      });
    }
    if (!isValidEmail(email_address)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }
    if (!isValidPhilippineMobile(cellphone)) {
      return res.status(400).json({ error: 'Cellphone must use Philippine format (+63 or 09)' });
    }
    if (description && description.length > 500) {
      return res.status(400).json({ error: 'Description must be 500 characters or fewer' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const duplicate = await client.query(`
        SELECT supplier_id FROM suppliers
        WHERE is_active IS DISTINCT FROM false
          AND (
            LOWER(email) = LOWER($1)
            OR regexp_replace(COALESCE(cellphone, phone, ''), '[^0-9]', '', 'g') = regexp_replace($2, '[^0-9]', '', 'g')
          )
        LIMIT 1
      `, [email_address, cellphone]);
      if (duplicate.rows.length) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'A supplier with the same email or cellphone already exists' });
      }

      // Map frontend fields to database fields
      const result = await client.query(`
        INSERT INTO suppliers (
          name, contact_person, phone, telephone, cellphone, email, address, city, state, postal_code, country, notes, is_active, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW()) RETURNING *
      `, [
        name,
        contact_person,
        cellphone || telephone || '',
        telephone || '',
        cellphone || '',
        email_address,
        street_address || '', // Map street_address to address
        city_municipality || '', // Map city_municipality to city
        province || '', // Map province to state
        zip_code || '', // Map zip_code to postal_code
        'Philippines', // Default country
        description || '',
        true // is_active
      ]);

      if (!result.rows || result.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(500).json({ error: 'Failed to create supplier' });
      }

      await client.query('COMMIT');
      return res.status(201).json(result.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error creating supplier:', error);
    res.status(500).json({ error: 'Failed to create supplier', details: error.message });
  }
});

// Update supplier
router.put('/:supplier_id', upload.single('image'), async (req, res) => {
  const { supplier_id } = req.params;
  const { 
    name = '', 
    contact_person = '', 
    telephone = '', 
    cellphone = '', 
    email_address = '', 
    description = '',
    province = '',
    city_municipality = '',
    barangay = '',
    street_address = '',
    zip_code = ''
  } = req.body || {};

  if (!name.trim() || !contact_person.trim() || !email_address.trim() || !cellphone.trim()) {
    return res.status(400).json({ 
      error: 'Missing required fields',
      required: ['name', 'contact_person', 'email_address', 'cellphone']
    });
  }
  if (!isValidEmail(email_address)) {
    return res.status(400).json({ error: 'Invalid email address' });
  }
  if (!isValidPhilippineMobile(cellphone)) {
    return res.status(400).json({ error: 'Cellphone must use Philippine format (+63 or 09)' });
  }
  if (description && description.length > 500) {
    return res.status(400).json({ error: 'Description must be 500 characters or fewer' });
  }

  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const duplicate = await client.query(`
        SELECT supplier_id FROM suppliers
        WHERE supplier_id <> $3
          AND is_active IS DISTINCT FROM false
          AND (
            LOWER(email) = LOWER($1)
            OR regexp_replace(COALESCE(cellphone, phone, ''), '[^0-9]', '', 'g') = regexp_replace($2, '[^0-9]', '', 'g')
          )
        LIMIT 1
      `, [email_address, cellphone, supplier_id]);
      if (duplicate.rows.length) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'A supplier with the same email or cellphone already exists' });
      }

      const result = await client.query(`
        UPDATE suppliers SET 
          name = $1, 
          contact_person = $2, 
          phone = $3, 
          telephone = $4,
          cellphone = $5,
          email = $6,
          address = $7,
          city = $8,
          state = $9,
          postal_code = $10,
          notes = $11,
          updated_at = NOW()
        WHERE supplier_id = $12 RETURNING *
      `, [
        name,
        contact_person,
        cellphone || telephone || '',
        telephone || '',
        cellphone || '',
        email_address,
        street_address || '',
        city_municipality || '',
        province || '',
        zip_code || '',
        description || '',
        supplier_id
      ]);

      if (!result.rows || result.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Supplier not found' });
      }

      await client.query('COMMIT');
      return res.json(mapSupplier(result.rows[0]));
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error updating supplier:', error);
    return res.status(500).json({ error: 'Failed to update supplier', details: error.message });
  }
});

// Deactivate supplier
router.delete('/:supplier_id', async (req, res) => {
  try {
    const { supplier_id } = req.params;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const result = await client.query(`
        UPDATE suppliers
        SET is_active = false, updated_at = NOW()
        WHERE supplier_id = $1 RETURNING *
      `, [supplier_id]);

      if (!result.rows.length) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Supplier not found' });
      }

      await client.query('COMMIT');
      return res.json({ message: 'Supplier deactivated successfully', supplier: mapSupplier(result.rows[0]) });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error deleting supplier:', error);
    res.status(500).json({ error: 'Failed to delete supplier' });
  }
});

module.exports = router;
