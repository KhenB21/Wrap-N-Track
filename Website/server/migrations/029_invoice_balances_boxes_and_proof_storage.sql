-- Invoice balance sync, explicit box count validation, and external proof storage metadata.

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS payment_status VARCHAR(30) NOT NULL DEFAULT 'Unpaid',
  ADD COLUMN IF NOT EXISTS total_verified_payments NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS remaining_balance NUMERIC(12,2) NOT NULL DEFAULT 0;

UPDATE orders
SET order_quantity = 0
WHERE order_quantity IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'orders_order_quantity_non_negative'
  ) THEN
    ALTER TABLE orders
      ADD CONSTRAINT orders_order_quantity_non_negative CHECK (order_quantity IS NULL OR order_quantity >= 0);
  END IF;
END $$;

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS payment_proof_storage_provider VARCHAR(40),
  ADD COLUMN IF NOT EXISTS payment_proof_storage_path TEXT,
  ADD COLUMN IF NOT EXISTS payment_proof_file_size INTEGER,
  ADD COLUMN IF NOT EXISTS payment_proof_uploaded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payment_proof_uploaded_by INTEGER;

CREATE INDEX IF NOT EXISTS idx_invoices_paid_order
  ON invoices(order_id, status)
  WHERE status = 'PAID';
