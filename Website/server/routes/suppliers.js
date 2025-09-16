const express = require('express');
const pool = require('../config/db');
const multer = require('multer');
const upload = multer();

const router = express.Router();

// Get all suppliers
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM suppliers ORDER BY name');
    
    // Map database fields to frontend format
    const suppliers = result.rows.map(supplier => ({
      supplier_id: supplier.supplier_id,
      name: supplier.name,
      contact_person: supplier.contact_person,
      telephone: supplier.phone, // Map phone to telephone
      cellphone: supplier.phone, // Map phone to cellphone
      email_address: supplier.email,
      description: supplier.notes,
      province: supplier.state,
      city_municipality: supplier.city,
      barangay: '', // Not in current schema
      street_address: supplier.address,
      zip_code: supplier.postal_code,
      created_at: supplier.created_at,
      updated_at: supplier.updated_at
    }));
    
    res.json(suppliers);
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
    
    const supplier = result.rows[0];
    // Map database fields to frontend format
    const mappedSupplier = {
      supplier_id: supplier.supplier_id,
      name: supplier.name,
      contact_person: supplier.contact_person,
      telephone: supplier.phone,
      cellphone: supplier.phone,
      email_address: supplier.email,
      description: supplier.notes,
      province: supplier.state,
      city_municipality: supplier.city,
      barangay: '',
      street_address: supplier.address,
      zip_code: supplier.postal_code,
      created_at: supplier.created_at,
      updated_at: supplier.updated_at
    };
    
    res.json(mappedSupplier);
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
    if (!name || !email_address) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['name', 'email_address']
      });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Map frontend fields to database fields
      const result = await client.query(`
        INSERT INTO suppliers (
          name, contact_person, phone, email, address, city, state, postal_code, country, notes, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *
      `, [
        name,
        contact_person || name, // Use name as contact_person if not provided
        cellphone || telephone || '', // Use cellphone first, then telephone
        email_address,
        street_address || '', // Map street_address to address
        city_municipality || '', // Map city_municipality to city
        province || '', // Map province to state
        zip_code || '', // Map zip_code to postal_code
        'Philippines', // Default country
        description || '', // Map description to notes
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

  if (!name.trim() || !email_address.trim()) {
    return res.status(400).json({ 
      error: 'Missing required fields',
      required: ['name', 'email_address']
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
          phone = $3, 
          email = $4,
          address = $5,
          city = $6,
          state = $7,
          postal_code = $8,
          notes = $9
        WHERE supplier_id = $10 RETURNING *
      `, [
        name,
        contact_person || name,
        cellphone || telephone || '',
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

      // Map response back to frontend format
      const supplier = result.rows[0];
      const mappedSupplier = {
        supplier_id: supplier.supplier_id,
        name: supplier.name,
        contact_person: supplier.contact_person,
        telephone: supplier.phone,
        cellphone: supplier.phone,
        email_address: supplier.email,
        description: supplier.notes,
        province: supplier.state,
        city_municipality: supplier.city,
        barangay: '',
        street_address: supplier.address,
        zip_code: supplier.postal_code,
        created_at: supplier.created_at,
        updated_at: supplier.updated_at
      };

      await client.query('COMMIT');
      return res.json(mappedSupplier);
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

module.exports = router;
