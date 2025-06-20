-- Migration: Create inventory_movements table for tracking inventory changes
CREATE TABLE IF NOT EXISTS inventory_movements (
    id SERIAL PRIMARY KEY,
    sku VARCHAR(50) NOT NULL,
    change_type VARCHAR(10) NOT NULL, -- 'in' or 'out'
    quantity INTEGER NOT NULL,
    movement_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    description TEXT
);
-- Optionally, add an index for faster queries by date/sku
CREATE INDEX IF NOT EXISTS idx_inventory_movements_date ON inventory_movements(movement_date);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_sku ON inventory_movements(sku); 