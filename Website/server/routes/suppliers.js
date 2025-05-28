const express = require('express');
const { pool } = require('../db');
const multer = require('multer');
const upload = multer();

const router = express.Router();

// Get all suppliers
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM suppliers ORDER BY name');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    res.status(500).json({ error: 'Failed to fetch suppliers' });
  }
});

// Get single supplier
router.get('/:supplier_id', async (req, res) => {
  try {
    const { supplier_id } = req.params;
    const result = await pool.query('SELECT * FROM suppliers WHERE supplier_id = $1', [supplier_id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Supplier not found' });
    }
    res.json(result.rows[0]);
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

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const result = await client.query(`
        INSERT INTO suppliers (
          name, contact_person, telephone, cellphone, email_address, 
          description, province, city_municipality, barangay, street_address, zip_code
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *
      `, [
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
    res.status(500).json({ error: 'Failed to create supplier' });
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

  if (!name.trim() || !email_address.trim() || !cellphone.trim()) {
    return res.status(400).json({ 
      error: 'Missing required fields',
      required: ['name', 'email_address', 'cellphone']
    });
  }

  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const result = await client.query(`
        UPDATE suppliers SET 
          name = $1, 
          contact_person = $2, 
          telephone = $3, 
          cellphone = $4, 
          email_address = $5,
          description = $6,
          province = $7,
          city_municipality = $8,
          barangay = $9,
          street_address = $10,
          zip_code = $11
        WHERE supplier_id = $12 RETURNING *
      `, [
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
        zip_code,
        supplier_id
      ]);

      if (!result.rows || result.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Supplier not found' });
      }

      await client.query('COMMIT');
      return res.json(result.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error updating supplier:', error);
    return res.status(500).json({ error: 'Failed to update supplier' });
  }
});

// Delete supplier
router.delete('/:supplier_id', async (req, res) => {
  try {
    const { supplier_id } = req.params;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Delete from suppliers table
      const result = await client.query(`
        DELETE FROM suppliers WHERE supplier_id = $1 RETURNING *
      `, [supplier_id]);

      if (!result.rows.length) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Supplier not found' });
      }

      await client.query('COMMIT');
      return res.json({ message: 'Supplier deleted successfully' });
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

// Get supplier products
router.get('/:supplierId/products', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT i.*
      FROM inventory_items i
      ORDER BY i.name
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching supplier products:', error);
    res.status(500).json({ error: 'Failed to fetch supplier products' });
  }
});

module.exports = router;
