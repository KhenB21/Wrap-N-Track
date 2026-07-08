const TRACKING_UNAVAILABLE_MESSAGE = 'Delivery tracking link is not available. Please contact pensee@gmail.com.';

const DELIVERY_STATUSES = [
  'Pending',
  'Preparing',
  'Ready for Delivery',
  'Awaiting Pick-up',
  'Out for Delivery',
  'Sent / Shipped',
  'Delivered',
  'Picked Up',
  'Failed Delivery',
  'Rescheduled',
  'Cancelled',
];

const DELIVERY_MODE_SEEDS = [
  ['LBC', 'COURIER', true, true, true],
  ['J&T Express', 'COURIER', true, true, true],
  ['Lalamove', 'SAME_DAY', false, true, true],
  ['GrabExpress', 'SAME_DAY', false, true, true],
  ['Ninja Van', 'COURIER', true, true, true],
  ['Flash Express', 'COURIER', true, true, true],
  ['GoGo Xpress', 'COURIER', true, true, true],
  ['JRS Express', 'COURIER', true, true, true],
  ['2GO Express', 'COURIER', true, true, true],
  ['DHL', 'COURIER', true, true, true],
  ['FedEx', 'COURIER', true, true, true],
  ['Transportify', 'SAME_DAY', false, true, true],
  ['Customer Pick-up', 'PICKUP', false, false, true],
  ['Other / Manual', 'OTHER', false, true, true],
];

let deliverySchemaReady = false;

async function ensureDeliverySchema(db) {
  if (deliverySchemaReady) return;

  await db.query(`
    ALTER TABLE orders
      ADD COLUMN IF NOT EXISTS delivery_status VARCHAR(40) NOT NULL DEFAULT 'Pending',
      ADD COLUMN IF NOT EXISTS delivery_method VARCHAR(100),
      ADD COLUMN IF NOT EXISTS delivery_mode_id INTEGER,
      ADD COLUMN IF NOT EXISTS delivery_type VARCHAR(30),
      ADD COLUMN IF NOT EXISTS courier_name VARCHAR(120),
      ADD COLUMN IF NOT EXISTS tracking_number VARCHAR(150),
      ADD COLUMN IF NOT EXISTS tracking_link TEXT,
      ADD COLUMN IF NOT EXISTS tracking_link_available BOOLEAN,
      ADD COLUMN IF NOT EXISTS tracking_unavailable_message TEXT,
      ADD COLUMN IF NOT EXISTS proof_image_url TEXT,
      ADD COLUMN IF NOT EXISTS proof_uploaded_by INTEGER,
      ADD COLUMN IF NOT EXISTS proof_uploaded_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS picked_up_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS delivery_remarks TEXT,
      ADD COLUMN IF NOT EXISTS delivery_updated_by INTEGER,
      ADD COLUMN IF NOT EXISTS delivery_updated_at TIMESTAMPTZ;
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS delivery_modes (
      id SERIAL PRIMARY KEY,
      name VARCHAR(120) NOT NULL UNIQUE,
      type VARCHAR(30) NOT NULL,
      is_active BOOLEAN NOT NULL DEFAULT true,
      requires_tracking_number BOOLEAN NOT NULL DEFAULT false,
      allows_tracking_link BOOLEAN NOT NULL DEFAULT true,
      allows_proof_upload BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS delivery_status_history (
      id BIGSERIAL PRIMARY KEY,
      order_id VARCHAR(50) NOT NULL,
      status VARCHAR(40) NOT NULL,
      remarks TEXT,
      delivery_method VARCHAR(100),
      delivery_mode_id INTEGER,
      delivery_type VARCHAR(30),
      courier_name VARCHAR(120),
      tracking_number VARCHAR(150),
      tracking_link TEXT,
      proof_image_url TEXT,
      updated_by INTEGER,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await db.query(`
    ALTER TABLE delivery_status_history
      ADD COLUMN IF NOT EXISTS delivery_mode_id INTEGER,
      ADD COLUMN IF NOT EXISTS delivery_type VARCHAR(30),
      ADD COLUMN IF NOT EXISTS proof_image_url TEXT;
  `);

  await db.query('CREATE INDEX IF NOT EXISTS idx_delivery_history_order_id ON delivery_status_history(order_id);');
  await db.query('CREATE INDEX IF NOT EXISTS idx_orders_delivery_status ON orders(delivery_status);');

  for (const seed of DELIVERY_MODE_SEEDS) {
    await db.query(`
      INSERT INTO delivery_modes (
        name, type, requires_tracking_number, allows_tracking_link, allows_proof_upload
      ) VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (name) DO UPDATE SET
        type = EXCLUDED.type,
        requires_tracking_number = EXCLUDED.requires_tracking_number,
        allows_tracking_link = EXCLUDED.allows_tracking_link,
        allows_proof_upload = EXCLUDED.allows_proof_upload,
        updated_at = NOW()
    `, seed);
  }

  deliverySchemaReady = true;
}

async function initializeDeliveryForReadyOrder(db, orderId, updatedBy = null, remarks = null) {
  await ensureDeliverySchema(db);

  const updateResult = await db.query(`
    UPDATE orders
    SET delivery_status = CASE
          WHEN COALESCE(delivery_status, 'Pending') = 'Pending' THEN 'Ready for Delivery'
          ELSE delivery_status
        END,
        delivery_updated_by = COALESCE(delivery_updated_by, $2),
        delivery_updated_at = COALESCE(delivery_updated_at, NOW())
    WHERE order_id = $1
      AND status::text = 'Ready for Delivery'
    RETURNING order_id, delivery_status
  `, [orderId, updatedBy]);

  if (!updateResult.rows.length) return null;

  const existingHistory = await db.query(`
    SELECT 1
    FROM delivery_status_history
    WHERE order_id = $1 AND status = 'Ready for Delivery'
    LIMIT 1
  `, [orderId]);

  if (!existingHistory.rows.length) {
    await db.query(`
      INSERT INTO delivery_status_history (order_id, status, remarks, updated_by)
      VALUES ($1, 'Ready for Delivery', $2, $3)
    `, [orderId, remarks || 'Order marked as Ready for Delivery', updatedBy]);
  }

  return updateResult.rows[0];
}

module.exports = {
  DELIVERY_STATUSES,
  TRACKING_UNAVAILABLE_MESSAGE,
  ensureDeliverySchema,
  initializeDeliveryForReadyOrder,
};
