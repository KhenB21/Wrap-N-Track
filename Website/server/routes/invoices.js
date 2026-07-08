const express = require('express');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const pool = require('../config/db');
const verifyJwt = require('../middleware/verifyJwt');
const requireRole = require('../middleware/requireRole');

const router = express.Router();
const proofUploadDir = path.join(__dirname, '..', 'uploads', 'invoice-proofs');
fs.mkdirSync(proofUploadDir, { recursive: true });

const proofUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, proofUploadDir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname || '').toLowerCase();
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error('Proof of payment must be a JPG, PNG, WebP, or PDF file'));
    }
    cb(null, true);
  },
});

const STAFF_INVOICE_ROLES = ['operations_manager', 'sales_manager', 'super_admin', 'admin'];
const ACTIVE_STATUSES = ['DRAFT', 'ISSUED', 'UNPAID', 'PAID'];
const INVOICE_TYPES = {
  DOWN_PAYMENT: { code: 'DP', title: 'DOWN PAYMENT INVOICE' },
  REMAINING_BALANCE: { code: 'RB', title: 'REMAINING BALANCE INVOICE' },
};
const DOWN_PAYMENT_RATE = 0.7;

let schemaReady = false;

const toMoney = (value) => {
  const amount = Number(String(value ?? '').replace(/,/g, ''));
  return Number.isFinite(amount) ? Math.round(amount * 100) / 100 : 0;
};

const formatMoney = (value) => `PHP ${toMoney(value).toLocaleString('en-PH', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})}`;

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString('en-PH');
};

async function ensureInvoiceSchema() {
  if (schemaReady) return;

  await pool.query(`
    CREATE TABLE IF NOT EXISTS invoices (
      id BIGSERIAL PRIMARY KEY,
      invoice_number VARCHAR(40) UNIQUE NOT NULL,
      order_id VARCHAR(50) NOT NULL,
      customer_id INTEGER,
      invoice_type VARCHAR(30) NOT NULL CHECK (invoice_type IN ('DOWN_PAYMENT', 'REMAINING_BALANCE')),
      status VARCHAR(20) NOT NULL DEFAULT 'UNPAID' CHECK (status IN ('DRAFT', 'ISSUED', 'UNPAID', 'PAID', 'CANCELLED')),
      subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
      delivery_fee NUMERIC(12,2) NOT NULL DEFAULT 0,
      additional_fee NUMERIC(12,2) NOT NULL DEFAULT 0,
      total_order_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
      down_payment_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
      remaining_balance_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
      amount_due NUMERIC(12,2) NOT NULL DEFAULT 0,
      amount_paid NUMERIC(12,2) NOT NULL DEFAULT 0,
      payment_method VARCHAR(100),
      payment_provider VARCHAR(100),
      payment_reference VARCHAR(150),
      payment_notes TEXT,
      payment_proof_path TEXT,
      payment_proof_original_name TEXT,
      payment_proof_mime_type VARCHAR(100),
      issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      due_date DATE,
      paid_at TIMESTAMPTZ,
      cancelled_at TIMESTAMPTZ,
      created_by INTEGER,
      updated_by INTEGER,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    ALTER TABLE invoices
      ADD COLUMN IF NOT EXISTS customer_id INTEGER,
      ADD COLUMN IF NOT EXISTS delivery_fee NUMERIC(12,2) NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS additional_fee NUMERIC(12,2) NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS payment_method VARCHAR(100),
      ADD COLUMN IF NOT EXISTS payment_provider VARCHAR(100),
      ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(150),
      ADD COLUMN IF NOT EXISTS payment_notes TEXT,
      ADD COLUMN IF NOT EXISTS payment_proof_path TEXT,
      ADD COLUMN IF NOT EXISTS payment_proof_original_name TEXT,
      ADD COLUMN IF NOT EXISTS payment_proof_mime_type VARCHAR(100),
      ADD COLUMN IF NOT EXISTS due_date DATE,
      ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS created_by INTEGER,
      ADD COLUMN IF NOT EXISTS updated_by INTEGER,
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
  `);

  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_one_active_per_order_type
      ON invoices(order_id, invoice_type)
      WHERE status <> 'CANCELLED';
  `);
  await pool.query('CREATE INDEX IF NOT EXISTS idx_invoices_order_id ON invoices(order_id);');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_invoices_type ON invoices(invoice_type);');

  schemaReady = true;
}

router.use(verifyJwt());
router.use(async (req, res, next) => {
  try {
    await ensureInvoiceSchema();
    next();
  } catch (error) {
    console.error('Failed to prepare invoice schema:', error);
    res.status(500).json({ success: false, message: 'Failed to prepare invoice module' });
  }
});

function staffOnly(req, res, next) {
  return requireRole(STAFF_INVOICE_ROLES)(req, res, next);
}

async function getOrderWithItems(orderId) {
  const activeOrder = await pool.query('SELECT *, false as archived FROM orders WHERE order_id = $1', [orderId]);
  let order = activeOrder.rows[0];
  let itemsResult;

  if (order) {
    itemsResult = await pool.query(`
      SELECT
        op.sku,
        op.quantity,
        op.profit_margin,
        COALESCE(ii.name, op.sku) AS product_name,
        COALESCE(ii.unit_price, 0) AS unit_price,
        COALESCE(ii.unit_price, 0) * COALESCE(op.quantity, 0) AS line_total
      FROM order_products op
      LEFT JOIN inventory_items ii ON op.sku = ii.sku
      WHERE op.order_id = $1
      ORDER BY op.line_id NULLS LAST, op.sku
    `, [orderId]);
  } else {
    const historyOrder = await pool.query('SELECT *, true as archived FROM order_history WHERE order_id = $1', [orderId]);
    order = historyOrder.rows[0];
    if (!order) return null;
    itemsResult = await pool.query(`
      SELECT
        ohp.sku,
        ohp.quantity,
        COALESCE(ii.name, ohp.sku) AS product_name,
        COALESCE(ohp.unit_price, ii.unit_price, 0) AS unit_price,
        COALESCE(ohp.unit_price, ii.unit_price, 0) * COALESCE(ohp.quantity, 0) AS line_total
      FROM order_history_products ohp
      LEFT JOIN inventory_items ii ON ohp.sku = ii.sku
      WHERE ohp.order_id = $1
      ORDER BY ohp.sku
    `, [orderId]);
  }

  const items = itemsResult.rows.map((item) => ({
    ...item,
    quantity: Number(item.quantity || 0),
    unit_price: toMoney(item.unit_price),
    line_total: toMoney(item.line_total),
  }));
  const subtotal = toMoney(items.reduce((sum, item) => sum + item.line_total, 0));
  const totalOrderAmount = toMoney(order.total_cost || subtotal);

  return {
    ...order,
    customer_name: order.customer_name || order.name || order.shipped_to || 'Customer',
    customer_email: order.email_address || null,
    customer_contact: order.cellphone || order.telephone || null,
    delivery_address: order.shipping_address || order.shipped_to || 'Unknown Address',
    subtotal,
    delivery_fee: 0,
    additional_fee: Math.max(0, toMoney(totalOrderAmount - subtotal)),
    total_order_amount: totalOrderAmount,
    items,
  };
}

async function getInvoiceWithDetails(invoiceId) {
  const invoiceResult = await pool.query(`
    SELECT i.*, u.name AS created_by_name, uu.name AS updated_by_name
    FROM invoices i
    LEFT JOIN users u ON i.created_by = u.user_id
    LEFT JOIN users uu ON i.updated_by = uu.user_id
    WHERE i.id = $1
  `, [invoiceId]);

  const invoice = invoiceResult.rows[0];
  if (!invoice) return null;

  const order = await getOrderWithItems(invoice.order_id);
  return {
    ...invoice,
    subtotal: toMoney(invoice.subtotal),
    delivery_fee: toMoney(invoice.delivery_fee),
    additional_fee: toMoney(invoice.additional_fee),
    total_order_amount: toMoney(invoice.total_order_amount),
    down_payment_amount: toMoney(invoice.down_payment_amount),
    remaining_balance_amount: toMoney(invoice.remaining_balance_amount),
    amount_due: toMoney(invoice.amount_due),
    amount_paid: toMoney(invoice.amount_paid),
    order,
  };
}

async function generateInvoiceNumber(client, invoiceType) {
  const meta = INVOICE_TYPES[invoiceType];
  if (!meta) throw new Error('Invalid invoice type');

  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const dateKey = `${y}${m}${d}`;
  const prefix = `WNT-${meta.code}-${dateKey}-`;

  const result = await client.query(`
    SELECT invoice_number
    FROM invoices
    WHERE invoice_number LIKE $1
    ORDER BY invoice_number DESC
    LIMIT 1
  `, [`${prefix}%`]);

  const lastSequence = result.rows[0]?.invoice_number
    ? Number(result.rows[0].invoice_number.slice(prefix.length))
    : 0;
  return `${prefix}${String(lastSequence + 1).padStart(4, '0')}`;
}

async function getActiveInvoice(orderId, invoiceType, client = pool) {
  const result = await client.query(`
    SELECT *
    FROM invoices
    WHERE order_id = $1 AND invoice_type = $2 AND status <> 'CANCELLED'
    ORDER BY created_at DESC
    LIMIT 1
  `, [orderId, invoiceType]);
  return result.rows[0] || null;
}

async function createInvoice(req, res, invoiceType) {
  const { orderId } = req.params;
  const body = req.body || {};
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`invoice:${orderId}:${invoiceType}`]);

    const existing = await getActiveInvoice(orderId, invoiceType, client);
    if (existing) {
      await client.query('COMMIT');
      return res.status(200).json({ success: true, invoice: existing, existing: true });
    }

    const order = await getOrderWithItems(orderId);
    if (!order) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const totalOrderAmount = toMoney(order.total_order_amount);
    if (totalOrderAmount <= 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Order total is required before generating an invoice' });
    }

    let downPaymentAmount = 0;
    let remainingBalanceAmount = 0;
    let amountDue = 0;
    let status = 'UNPAID';

    if (invoiceType === 'DOWN_PAYMENT') {
      downPaymentAmount = toMoney(totalOrderAmount * DOWN_PAYMENT_RATE);
      downPaymentAmount = Math.min(downPaymentAmount, totalOrderAmount);
      remainingBalanceAmount = Math.max(0, toMoney(totalOrderAmount - downPaymentAmount));
      amountDue = downPaymentAmount;
    } else {
      const paidDownPaymentResult = await client.query(`
        SELECT
          COALESCE(SUM(amount_paid), 0) AS paid,
          COALESCE(SUM(down_payment_amount), 0) AS expected_down_payment
        FROM invoices
        WHERE order_id = $1 AND invoice_type = 'DOWN_PAYMENT' AND status = 'PAID'
      `, [orderId]);
      if (toMoney(paidDownPaymentResult.rows[0]?.paid) <= 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: 'Down payment invoice must be paid before generating the remaining balance invoice',
        });
      }
      downPaymentAmount = toMoney(paidDownPaymentResult.rows[0]?.expected_down_payment || totalOrderAmount * DOWN_PAYMENT_RATE);
      remainingBalanceAmount = Math.max(0, toMoney(totalOrderAmount - downPaymentAmount));
      amountDue = remainingBalanceAmount;
      if (amountDue === 0) status = 'PAID';
    }

    const invoiceNumber = await generateInvoiceNumber(client, invoiceType);
    const dueDate = body.due_date || null;
    const createdBy = req.user?.user_id || null;

    const result = await client.query(`
      INSERT INTO invoices (
        invoice_number, order_id, customer_id, invoice_type, status,
        subtotal, delivery_fee, additional_fee, total_order_amount,
        down_payment_amount, remaining_balance_amount, amount_due, amount_paid,
        issued_at, due_date, paid_at, created_by, updated_by
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NOW(),$14,$15,$16,$16)
      RETURNING *
    `, [
      invoiceNumber,
      orderId,
      order.customer_id || null,
      invoiceType,
      status,
      order.subtotal,
      order.delivery_fee,
      order.additional_fee,
      totalOrderAmount,
      downPaymentAmount,
      remainingBalanceAmount,
      amountDue,
      status === 'PAID' ? 0 : 0,
      dueDate,
      status === 'PAID' ? new Date() : null,
      createdBy,
    ]);

    await client.query('COMMIT');
    res.status(201).json({ success: true, invoice: result.rows[0], existing: false });
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.code === '23505') {
      const existing = await getActiveInvoice(orderId, invoiceType);
      return res.status(200).json({ success: true, invoice: existing, existing: true });
    }
    console.error('Error creating invoice:', error);
    res.status(500).json({ success: false, message: 'Failed to generate invoice' });
  } finally {
    client.release();
  }
}

router.get('/invoices', staffOnly, async (req, res) => {
  try {
    const { invoice_type, status, customer, order, date_from, date_to } = req.query;
    const clauses = [];
    const params = [];
    let index = 1;

    if (invoice_type) {
      clauses.push(`i.invoice_type = $${index++}`);
      params.push(invoice_type);
    }
    if (status) {
      clauses.push(`i.status = $${index++}`);
      params.push(status);
    }
    if (order) {
      clauses.push(`i.order_id ILIKE $${index++}`);
      params.push(`%${order}%`);
    }
    if (customer) {
      clauses.push(`(o.name ILIKE $${index} OR oh.name ILIKE $${index} OR cd.name ILIKE $${index})`);
      params.push(`%${customer}%`);
      index++;
    }
    if (date_from) {
      clauses.push(`i.issued_at::date >= $${index++}`);
      params.push(date_from);
    }
    if (date_to) {
      clauses.push(`i.issued_at::date <= $${index++}`);
      params.push(date_to);
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const result = await pool.query(`
      SELECT
        i.*,
        COALESCE(o.name, oh.name, cd.name) AS customer_name,
        COALESCE(o.email_address, oh.email_address, cd.email_address) AS customer_email,
        COALESCE(o.order_date, oh.order_date) AS order_date,
        COALESCE(o.expected_delivery, oh.expected_delivery) AS expected_delivery
      FROM invoices i
      LEFT JOIN orders o ON i.order_id = o.order_id
      LEFT JOIN order_history oh ON i.order_id = oh.order_id
      LEFT JOIN customer_details cd ON i.customer_id = cd.customer_id
      ${where}
      ORDER BY i.issued_at DESC, i.id DESC
      LIMIT 200
    `, params);

    res.json({ success: true, invoices: result.rows });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch invoices' });
  }
});

router.get('/invoices/:id', staffOnly, async (req, res) => {
  try {
    const invoice = await getInvoiceWithDetails(req.params.id);
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
    res.json({ success: true, invoice });
  } catch (error) {
    console.error('Error fetching invoice:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch invoice' });
  }
});

router.get('/orders/:orderId/invoices', staffOnly, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT *
      FROM invoices
      WHERE order_id = $1
      ORDER BY issued_at DESC, id DESC
    `, [req.params.orderId]);
    res.json({ success: true, invoices: result.rows });
  } catch (error) {
    console.error('Error fetching order invoices:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch order invoices' });
  }
});

router.post('/orders/:orderId/invoices/down-payment', staffOnly, (req, res) => {
  createInvoice(req, res, 'DOWN_PAYMENT');
});

router.post('/orders/:orderId/invoices/remaining-balance', staffOnly, (req, res) => {
  createInvoice(req, res, 'REMAINING_BALANCE');
});

router.patch('/invoices/:id/status', staffOnly, async (req, res) => {
  try {
    const { status } = req.body || {};
    if (!['DRAFT', 'ISSUED', 'UNPAID', 'CANCELLED'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status update' });
    }

    const result = await pool.query(`
      UPDATE invoices
      SET status = $1::varchar,
          cancelled_at = CASE WHEN $1::varchar = 'CANCELLED' THEN NOW() ELSE cancelled_at END,
          updated_by = $2,
          updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `, [status, req.user?.user_id || null, req.params.id]);

    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Invoice not found' });
    res.json({ success: true, invoice: result.rows[0] });
  } catch (error) {
    console.error('Error updating invoice status:', error);
    res.status(500).json({ success: false, message: 'Failed to update invoice status' });
  }
});

router.patch('/invoices/:id/mark-paid', staffOnly, proofUpload.single('payment_proof'), async (req, res) => {
  try {
    const {
      amount_paid,
      payment_method,
      payment_provider,
      payment_reference,
      payment_notes,
    } = req.body || {};
    const invoice = await getInvoiceWithDetails(req.params.id);
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
    if (invoice.status === 'CANCELLED') {
      return res.status(400).json({ success: false, message: 'Cancelled invoices cannot be marked as paid' });
    }

    const amountPaid = toMoney(amount_paid);
    if (invoice.amount_due > 0 && amountPaid < invoice.amount_due) {
      return res.status(400).json({ success: false, message: 'Amount paid must be at least the amount due' });
    }
    if (invoice.amount_due > 0 && !payment_method) {
      return res.status(400).json({ success: false, message: 'Payment method is required' });
    }

    const result = await pool.query(`
      UPDATE invoices
      SET status = 'PAID',
          amount_paid = $1,
          payment_method = $2,
          payment_reference = $3,
          payment_notes = $4,
          paid_at = NOW(),
          updated_by = $5,
          payment_provider = $6,
          payment_proof_path = COALESCE($7, payment_proof_path),
          payment_proof_original_name = COALESCE($8, payment_proof_original_name),
          payment_proof_mime_type = COALESCE($9, payment_proof_mime_type),
          updated_at = NOW()
      WHERE id = $10
      RETURNING *
    `, [
      amountPaid,
      payment_method || null,
      payment_reference || null,
      payment_notes || null,
      req.user?.user_id || null,
      payment_provider || null,
      req.file ? path.join('uploads', 'invoice-proofs', req.file.filename).replace(/\\/g, '/') : null,
      req.file?.originalname || null,
      req.file?.mimetype || null,
      req.params.id,
    ]);

    res.json({ success: true, invoice: result.rows[0] });
  } catch (error) {
    console.error('Error marking invoice paid:', error);
    res.status(500).json({ success: false, message: 'Failed to mark invoice as paid' });
  }
});

router.get('/invoices/:id/payment-proof', staffOnly, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT payment_proof_path, payment_proof_original_name FROM invoices WHERE id = $1',
      [req.params.id]
    );
    const proof = result.rows[0];
    if (!proof?.payment_proof_path) {
      return res.status(404).json({ success: false, message: 'Payment proof not found' });
    }

    const absolutePath = path.resolve(__dirname, '..', proof.payment_proof_path);
    if (!absolutePath.startsWith(path.resolve(proofUploadDir))) {
      return res.status(400).json({ success: false, message: 'Invalid proof file path' });
    }
    res.download(absolutePath, proof.payment_proof_original_name || path.basename(absolutePath));
  } catch (error) {
    console.error('Error downloading payment proof:', error);
    res.status(500).json({ success: false, message: 'Failed to download payment proof' });
  }
});

function writeKeyValue(doc, key, value, x, y) {
  doc.font('Helvetica-Bold').fontSize(9).fillColor('#333').text(key, x, y, { continued: true });
  doc.font('Helvetica').fillColor('#111').text(` ${value || '-'}`);
}

function drawInvoicePdf(doc, invoice) {
  const order = invoice.order || {};
  const title = INVOICE_TYPES[invoice.invoice_type]?.title || 'INVOICE';
  let y = 48;

  doc.font('Helvetica-Bold').fontSize(18).fillColor('#2c3e50').text('Pensee Gifting Studio', 50, y);
  doc.font('Helvetica').fontSize(10).fillColor('#555').text("Wrap N' Track", 50, y + 24);
  doc.font('Helvetica-Bold').fontSize(17).fillColor('#111').text(title, 320, y, { align: 'right' });
  doc.font('Helvetica').fontSize(10).fillColor('#555').text(invoice.invoice_number, 320, y + 24, { align: 'right' });

  y += 64;
  doc.moveTo(50, y).lineTo(545, y).strokeColor('#dddddd').stroke();
  y += 18;

  writeKeyValue(doc, 'Status:', invoice.status, 50, y);
  writeKeyValue(doc, 'Issued:', formatDate(invoice.issued_at), 210, y);
  writeKeyValue(doc, 'Due:', formatDate(invoice.due_date), 370, y);
  y += 34;

  doc.font('Helvetica-Bold').fontSize(11).fillColor('#2c3e50').text('Customer Details', 50, y);
  doc.font('Helvetica-Bold').fontSize(11).text('Order Details', 320, y);
  y += 18;
  doc.font('Helvetica').fontSize(9).fillColor('#111');
  doc.text(order.customer_name || 'Customer', 50, y);
  doc.text(order.customer_email || '-', 50, y + 14);
  doc.text(order.customer_contact || '-', 50, y + 28);
  doc.text(order.delivery_address || '-', 50, y + 42, { width: 220 });
  doc.text(`Order No: ${invoice.order_id}`, 320, y);
  doc.text(`Order Date: ${formatDate(order.order_date)}`, 320, y + 14);
  doc.text(`Expected Delivery: ${formatDate(order.expected_delivery)}`, 320, y + 28);
  const paymentLabel = [invoice.payment_method || order.payment_method || 'Manual payment outside system', invoice.payment_provider]
    .filter(Boolean)
    .join(' - ');
  doc.text(`Payment Method: ${paymentLabel}`, 320, y + 42, { width: 210 });

  y += 92;
  doc.font('Helvetica-Bold').fontSize(11).fillColor('#2c3e50').text('Order Items', 50, y);
  y += 20;
  doc.rect(50, y, 495, 22).fillAndStroke('#f3f5f7', '#dddddd');
  doc.fillColor('#111').font('Helvetica-Bold').fontSize(9);
  doc.text('Item', 58, y + 7, { width: 225 });
  doc.text('Qty', 300, y + 7, { width: 45, align: 'right' });
  doc.text('Unit Price', 358, y + 7, { width: 80, align: 'right' });
  doc.text('Line Total', 455, y + 7, { width: 80, align: 'right' });
  y += 22;

  const items = order.items && order.items.length ? order.items : [];
  doc.font('Helvetica').fontSize(9).fillColor('#111');
  if (!items.length) {
    doc.text('No itemized products recorded for this order.', 58, y + 8);
    y += 28;
  } else {
    for (const item of items) {
      if (y > 690) {
        doc.addPage();
        y = 50;
      }
      doc.rect(50, y, 495, 24).strokeColor('#eeeeee').stroke();
      doc.text(item.product_name || item.name || item.sku, 58, y + 7, { width: 225 });
      doc.text(String(item.quantity || 0), 300, y + 7, { width: 45, align: 'right' });
      doc.text(formatMoney(item.unit_price), 358, y + 7, { width: 80, align: 'right' });
      doc.text(formatMoney(item.line_total), 455, y + 7, { width: 80, align: 'right' });
      y += 24;
    }
  }

  y += 18;
  const summaryX = 330;
  const summaryRows = [
    ['Subtotal', invoice.subtotal],
    ['Delivery Fee', invoice.delivery_fee],
    ['Additional Fee', invoice.additional_fee],
    ['Total Order Amount', invoice.total_order_amount],
    ['Down Payment', invoice.down_payment_amount],
    ['Remaining Balance', invoice.remaining_balance_amount],
    ['Amount Due', invoice.amount_due],
    ['Amount Paid', invoice.amount_paid],
  ];
  for (const [label, value] of summaryRows) {
    doc.font(label === 'Amount Due' ? 'Helvetica-Bold' : 'Helvetica').fontSize(9).fillColor('#111');
    doc.text(label, summaryX, y, { width: 115 });
    doc.text(formatMoney(value), 445, y, { width: 90, align: 'right' });
    y += 16;
  }

  y += 12;
  doc.font('Helvetica-Bold').fontSize(10).fillColor('#2c3e50').text('Payment Note', 50, y);
  y += 16;
  doc.font('Helvetica').fontSize(9).fillColor('#111')
    .text('Payments are handled outside Wrap N Track. Staff manually records the payment status after bank transfer, e-wallet, or other agreed payment is confirmed.', 50, y, { width: 495 });
  y += 42;
  if (invoice.payment_reference || invoice.paid_at) {
    doc.text(`Payment Reference: ${invoice.payment_reference || '-'}`, 50, y);
    doc.text(`Paid Date: ${formatDate(invoice.paid_at)}`, 320, y);
    y += 16;
  }
  if (invoice.payment_proof_original_name) {
    doc.text(`Proof of Payment: ${invoice.payment_proof_original_name}`, 50, y, { width: 495 });
    y += 16;
  }
  if (invoice.payment_notes) {
    doc.text(`Notes: ${invoice.payment_notes}`, 50, y, { width: 495 });
    y += 18;
  }
  if (order.remarks) {
    doc.font('Helvetica-Bold').text('Order Remarks', 50, y);
    doc.font('Helvetica').text(order.remarks, 50, y + 14, { width: 495 });
  }

  doc.font('Helvetica').fontSize(8).fillColor('#666')
    .text(`Generated ${new Date().toLocaleString('en-PH')} by ${invoice.created_by_name || 'Wrap N Track'}`, 50, 755, { align: 'center', width: 495 });
}

router.get('/invoices/:id/pdf', staffOnly, async (req, res) => {
  try {
    const invoice = await getInvoiceWithDetails(req.params.id);
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });

    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const fileName = `${invoice.invoice_number}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);

    doc.pipe(res);
    drawInvoicePdf(doc, invoice);
    doc.end();
  } catch (error) {
    console.error('Error generating invoice PDF:', error);
    res.status(500).json({ success: false, message: 'Failed to generate invoice PDF' });
  }
});

module.exports = router;
