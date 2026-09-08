-- The supplier add/edit forms have always collected a "barangay" field, but the
-- suppliers table never had a column for it -- routes/suppliers.js silently
-- dropped it on both create and update, and mapSupplier() hardcoded barangay: ''
-- on every response, so the field could never round-trip.

ALTER TABLE suppliers
  ADD COLUMN IF NOT EXISTS barangay VARCHAR(100);
