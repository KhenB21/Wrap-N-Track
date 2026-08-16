const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const pool = require('../config/db');
const verifyJwt = require('../middleware/verifyJwt');
const requireRole = require('../middleware/requireRole');
const {
  DELIVERY_STATUSES,
  TRACKING_UNAVAILABLE_MESSAGE,
  ensureDeliverySchema,
} = require('../services/deliveryService');

const router = express.Router();

const STAFF_DELIVERY_ROLES = ['operations_manager', 'sales_manager', 'social_media_manager', 'super_admin', 'admin'];
const uploadDir = path.join(__dirname, '..', 'uploads', 'delivery-proofs');

fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
      const safeOrder = String(req.params.orderId || 'order').replace(/[^a-zA-Z0-9_-]/g, '');
      const ext = path.extname(file.originalname || '').toLowerCase();
      cb(null, `${safeOrder}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error('Proof must be a JPG, PNG, or WEBP image'));
    }
    cb(null, true);
  },
});

const isValidUrl = (value) => {
  if (!value) return false;
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol);
  } catch (_error) {
    return false;
  }
};

async function syncReadyDeliveryRows() {
  await pool.query(`
    UPDATE orders
    SET delivery_status = 'Ready for Delivery',
        delivery_updated_at = COALESCE(delivery_updated_at, NOW())
    WHERE status::text = 'Ready for Delivery'
      AND COALESCE(delivery_status, 'Pending') = 'Pending'
  `);

  await pool.query(`
    INSERT INTO delivery_status_history (order_id, status, remarks)
    SELECT o.order_id, 'Ready for Delivery', 'Order marked as Ready for Delivery'
    FROM orders o
    WHERE o.status::text = 'Ready for Delivery'
      AND NOT EXISTS (
        SELECT 1
        FROM delivery_status_history dsh
        WHERE dsh.order_id = o.order_id
          AND dsh.status = 'Ready for Delivery'
      )
  `);
}

function mapProofUrl(fileName) {
  return `/uploads/delivery-proofs/${fileName}`;
}

router.use(verifyJwt());
router.use(async (req, res, next) => {
  try {
    await ensureDeliverySchema(pool);
    next();
  } catch (error) {
    console.error('Error preparing delivery schema:', error);
    res.status(500).json({ success: false, message: 'Failed to prepare delivery module' });
  }
});
router.use(requireRole(STAFF_DELIVERY_ROLES));

router.get('/modes', async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, name, type, is_active, requires_tracking_number, allows_tracking_link, allows_proof_upload
      FROM delivery_modes
      WHERE is_active = true
      ORDER BY
        CASE type WHEN 'COURIER' THEN 1 WHEN 'SAME_DAY' THEN 2 WHEN 'PICKUP' THEN 3 ELSE 4 END,
        name
    `);
    res.json({ success: true, modes: result.rows });
  } catch (error) {
    console.error('Error fetching delivery modes:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch delivery modes' });
  }
});

router.get('/', async (req, res) => {
  try {
    await syncReadyDeliveryRows();

    const { status, search, expected_date, delivery_mode, courier } = req.query;
    // Every order should be visible here — from freshly placed through
    // archived/completed — so staff can set up delivery info at any stage.
    // Cancelled is the only status excluded.
    const clauses = [`d.order_status != 'Cancelled'`];
    const params = [];
    let index = 1;

    if (status && status !== 'all') {
      clauses.push(`d.delivery_status = $${index++}`);
      params.push(status);
    }

    if (delivery_mode && delivery_mode !== 'all') {
      clauses.push(`COALESCE(d.delivery_method, '') = $${index++}`);
      params.push(delivery_mode);
    }

    if (courier) {
      clauses.push(`COALESCE(d.courier_name, '') ILIKE $${index++}`);
      params.push(`%${courier}%`);
    }

    if (expected_date) {
      clauses.push(`d.expected_delivery = $${index++}`);
      params.push(expected_date);
    }

    if (search) {
      clauses.push(`(
        d.order_id ILIKE $${index}
        OR d.customer_name ILIKE $${index}
        OR d.shipped_to ILIKE $${index}
        OR d.shipping_address ILIKE $${index}
        OR COALESCE(d.tracking_number, '') ILIKE $${index}
        OR COALESCE(d.courier_name, '') ILIKE $${index}
      )`);
      params.push(`%${search}%`);
      index++;
    }

    const result = await pool.query(`
      SELECT * FROM (
        SELECT
          o.order_id,
          o.customer_id,
          o.name AS customer_name,
          o.shipped_to,
          o.shipping_address,
          o.cellphone,
          o.telephone,
          o.email_address,
          o.order_date,
          o.expected_delivery,
          o.status::text AS order_status,
          o.total_cost,
          COALESCE(o.order_quantity, 0) AS total_boxes,
          COALESCE(o.delivery_status, 'Pending') AS delivery_status,
          o.delivery_method,
          o.delivery_mode_id,
          o.delivery_type,
          o.courier_name,
          o.tracking_number,
          o.tracking_link,
          o.tracking_link_available,
          COALESCE(o.tracking_unavailable_message, $${index}) AS tracking_unavailable_message,
          o.proof_image_url,
          o.proof_uploaded_at,
          o.sent_at,
          o.picked_up_at,
          o.delivered_at,
          o.delivery_remarks,
          o.delivery_updated_at,
          u.name AS delivery_updated_by_name,
          false AS archived
        FROM orders o
        LEFT JOIN users u ON o.delivery_updated_by = u.user_id

        UNION ALL

        SELECT
          oh.order_id,
          oh.customer_id,
          oh.name AS customer_name,
          oh.shipped_to,
          oh.shipping_address,
          oh.cellphone,
          oh.telephone,
          oh.email_address,
          oh.order_date,
          oh.expected_delivery,
          oh.status::text AS order_status,
          oh.total_cost,
          COALESCE(oh.order_quantity, 0) AS total_boxes,
          COALESCE(oh.delivery_status, 'Pending') AS delivery_status,
          oh.delivery_method,
          oh.delivery_mode_id,
          oh.delivery_type,
          oh.courier_name,
          oh.tracking_number,
          oh.tracking_link,
          oh.tracking_link_available,
          COALESCE(oh.tracking_unavailable_message, $${index}) AS tracking_unavailable_message,
          oh.proof_image_url,
          oh.proof_uploaded_at,
          oh.sent_at,
          oh.picked_up_at,
          oh.delivered_at,
          oh.delivery_remarks,
          oh.delivery_updated_at,
          u2.name AS delivery_updated_by_name,
          true AS archived
        FROM order_history oh
        LEFT JOIN users u2 ON oh.delivery_updated_by = u2.user_id
      ) d
      WHERE ${clauses.join(' AND ')}
      ORDER BY d.expected_delivery ASC NULLS LAST, d.order_date DESC NULLS LAST
      LIMIT 300
    `, [...params, TRACKING_UNAVAILABLE_MESSAGE]);

    res.json({ success: true, deliveries: result.rows });
  } catch (error) {
    console.error('Error fetching deliveries:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch deliveries' });
  }
});

router.get('/:orderId', async (req, res) => {
  try {
    let result = await pool.query(`
      SELECT
        o.*,
        o.status::text AS order_status,
        COALESCE(items.products, '[]'::json) AS products,
        COALESCE(o.order_quantity, 0) AS total_boxes,
        COALESCE(o.tracking_unavailable_message, $2) AS tracking_unavailable_message,
        false AS archived
      FROM orders o
      LEFT JOIN LATERAL (
        SELECT
          COALESCE(json_agg(json_build_object(
            'sku', op.sku,
            'name', i.name,
            'quantity', op.quantity,
            'unit_price', i.unit_price
          )) FILTER (WHERE op.sku IS NOT NULL), '[]'::json) AS products
        FROM order_products op
        LEFT JOIN inventory_items i ON op.sku = i.sku
        WHERE op.order_id = o.order_id
      ) items ON true
      WHERE o.order_id = $1
    `, [req.params.orderId, TRACKING_UNAVAILABLE_MESSAGE]);

    // Order may already be archived (Completed/etc. moved it to order_history) —
    // still viewable here so staff can look up or finish its delivery info.
    if (!result.rows.length) {
      result = await pool.query(`
        SELECT
          oh.*,
          oh.status::text AS order_status,
          COALESCE(items.products, '[]'::json) AS products,
          COALESCE(oh.order_quantity, 0) AS total_boxes,
          COALESCE(oh.tracking_unavailable_message, $2) AS tracking_unavailable_message,
          true AS archived
        FROM order_history oh
        LEFT JOIN LATERAL (
          SELECT
            COALESCE(json_agg(json_build_object(
              'sku', ohp.sku,
              'name', i.name,
              'quantity', ohp.quantity,
              'unit_price', ohp.unit_price
            )) FILTER (WHERE ohp.sku IS NOT NULL), '[]'::json) AS products
          FROM order_history_products ohp
          LEFT JOIN inventory_items i ON ohp.sku = i.sku
          WHERE ohp.order_id = oh.order_id
        ) items ON true
        WHERE oh.order_id = $1
      `, [req.params.orderId, TRACKING_UNAVAILABLE_MESSAGE]);
    }

    if (!result.rows.length) {
      return res.status(404).json({ success: false, message: 'Delivery order not found' });
    }

    res.json({ success: true, delivery: result.rows[0] });
  } catch (error) {
    console.error('Error fetching delivery:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch delivery' });
  }
});

router.get('/:orderId/history', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT dsh.*, u.name AS updated_by_name
      FROM delivery_status_history dsh
      LEFT JOIN users u ON dsh.updated_by = u.user_id
      WHERE dsh.order_id = $1
      ORDER BY dsh.created_at DESC
    `, [req.params.orderId]);

    res.json({ success: true, history: result.rows });
  } catch (error) {
    console.error('Error fetching delivery history:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch delivery history' });
  }
});

router.patch('/:orderId', async (req, res) => {
  const {
    delivery_status,
    delivery_mode_id,
    delivery_method,
    delivery_type,
    courier_name,
    tracking_number,
    tracking_link_available,
    tracking_link,
    delivery_remarks,
  } = req.body || {};

  if (!DELIVERY_STATUSES.includes(delivery_status)) {
    return res.status(400).json({ success: false, message: 'Invalid delivery status' });
  }
  if (!delivery_mode_id && !delivery_method) {
    return res.status(400).json({ success: false, message: 'Delivery mode is required' });
  }
  if (['Failed Delivery', 'Rescheduled'].includes(delivery_status) && !String(delivery_remarks || '').trim()) {
    return res.status(400).json({ success: false, message: 'Remarks are required for failed or rescheduled deliveries' });
  }

  let mode = null;
  if (delivery_mode_id) {
    const modeResult = await pool.query(
      'SELECT * FROM delivery_modes WHERE id = $1 AND is_active = true',
      [delivery_mode_id]
    );
    if (!modeResult.rows.length) {
      return res.status(400).json({ success: false, message: 'Invalid delivery mode' });
    }
    mode = modeResult.rows[0];
  }

  const modeName = mode?.name || delivery_method;
  const modeType = mode?.type || delivery_type || 'OTHER';
  const isPickup = modeType === 'PICKUP' || modeName === 'Customer Pick-up';
  const linkAvailable = !isPickup && (tracking_link_available === true || tracking_link_available === 'true');

  if (linkAvailable && !isValidUrl(tracking_link)) {
    return res.status(400).json({ success: false, message: 'A valid tracking URL is required when tracking link is available' });
  }

  const finalTrackingNumber = isPickup ? null : (tracking_number || null);
  const finalTrackingLink = linkAvailable ? tracking_link : null;
  const finalCourierName = isPickup ? null : (courier_name || modeName || null);
  const finalUnavailableMessage = isPickup || linkAvailable ? null : TRACKING_UNAVAILABLE_MESSAGE;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const updateValues = [
      delivery_status,
      mode?.id || null,
      modeName || null,
      modeType,
      finalCourierName,
      finalTrackingNumber,
      linkAvailable,
      finalTrackingLink,
      finalUnavailableMessage,
      delivery_remarks || null,
      req.user?.user_id || null,
      req.params.orderId,
    ];

    let result = await client.query(`
      UPDATE orders
      SET delivery_status = $1::varchar,
          delivery_mode_id = $2,
          delivery_method = $3,
          delivery_type = $4,
          courier_name = $5,
          tracking_number = $6,
          tracking_link_available = $7,
          tracking_link = $8,
          tracking_unavailable_message = $9,
          delivery_remarks = $10,
          sent_at = CASE WHEN $1::text = 'Sent / Shipped' THEN COALESCE(sent_at, NOW()) ELSE sent_at END,
          picked_up_at = CASE WHEN $1::text = 'Picked Up' THEN COALESCE(picked_up_at, NOW()) ELSE picked_up_at END,
          delivered_at = CASE WHEN $1::text = 'Delivered' THEN COALESCE(delivered_at, NOW()) ELSE delivered_at END,
          delivery_updated_by = $11,
          delivery_updated_at = NOW()
      WHERE order_id = $12
      RETURNING *
    `, updateValues);

    // Order may already be archived — retry against order_history so staff
    // can still finish delivery info for a Completed/etc. order.
    if (!result.rows.length) {
      result = await client.query(`
        UPDATE order_history
        SET delivery_status = $1::varchar,
            delivery_mode_id = $2,
            delivery_method = $3,
            delivery_type = $4,
            courier_name = $5,
            tracking_number = $6,
            tracking_link_available = $7,
            tracking_link = $8,
            tracking_unavailable_message = $9,
            delivery_remarks = $10,
            sent_at = CASE WHEN $1::text = 'Sent / Shipped' THEN COALESCE(sent_at, NOW()) ELSE sent_at END,
            picked_up_at = CASE WHEN $1::text = 'Picked Up' THEN COALESCE(picked_up_at, NOW()) ELSE picked_up_at END,
            delivered_at = CASE WHEN $1::text = 'Delivered' THEN COALESCE(delivered_at, NOW()) ELSE delivered_at END,
            delivery_updated_by = $11,
            delivery_updated_at = NOW()
        WHERE order_id = $12
        RETURNING *
      `, updateValues);
    }

    if (!result.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Delivery order not found' });
    }

    await client.query(`
      INSERT INTO delivery_status_history (
        order_id, status, remarks, delivery_method, delivery_mode_id, delivery_type,
        courier_name, tracking_number, tracking_link, proof_image_url, updated_by
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
    `, [
      req.params.orderId,
      delivery_status,
      delivery_remarks || null,
      modeName || null,
      mode?.id || null,
      modeType,
      finalCourierName,
      finalTrackingNumber,
      finalTrackingLink,
      result.rows[0].proof_image_url || null,
      req.user?.user_id || null,
    ]);

    await client.query('COMMIT');
    res.json({ success: true, delivery: result.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating delivery:', error);
    res.status(500).json({ success: false, message: 'Failed to update delivery' });
  } finally {
    client.release();
  }
});

router.post('/:orderId/proof', (req, res) => {
  upload.single('proof')(req, res, async (uploadError) => {
    if (uploadError) {
      return res.status(400).json({ success: false, message: uploadError.message || 'Invalid proof image' });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Proof image is required' });
    }

    const proofUrl = mapProofUrl(req.file.filename);
    try {
      const result = await pool.query(`
        UPDATE orders
        SET proof_image_url = $1,
            proof_uploaded_by = $2,
            proof_uploaded_at = NOW(),
            delivery_updated_by = $2,
            delivery_updated_at = NOW()
        WHERE order_id = $3
        RETURNING *
      `, [proofUrl, req.user?.user_id || null, req.params.orderId]);

      if (!result.rows.length) {
        return res.status(404).json({ success: false, message: 'Delivery order not found' });
      }

      await pool.query(`
        INSERT INTO delivery_status_history (
          order_id, status, remarks, proof_image_url, updated_by
        ) VALUES ($1, $2, $3, $4, $5)
      `, [
        req.params.orderId,
        result.rows[0].delivery_status || 'Ready for Delivery',
        'Proof of sending uploaded',
        proofUrl,
        req.user?.user_id || null,
      ]);

      res.json({ success: true, proof_image_url: proofUrl, delivery: result.rows[0] });
    } catch (error) {
      console.error('Error uploading proof:', error);
      res.status(500).json({ success: false, message: 'Failed to upload proof image' });
    }
  });
});

module.exports = router;
