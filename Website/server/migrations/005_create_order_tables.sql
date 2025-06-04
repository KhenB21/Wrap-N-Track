-- Create wedding_orders table
CREATE TABLE IF NOT EXISTS customer_wedding_orders (
    wedding_order_id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customer_details(customer_id),
    wedding_style VARCHAR(100) NOT NULL,
    wedding_date DATE,
    guest_count INTEGER,
    color_scheme VARCHAR(100),
    special_requests TEXT,
    total_cost DECIMAL(10,2),
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create custom_orders table
CREATE TABLE IF NOT EXISTS customer_custom_orders (
    custom_order_id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customer_details(customer_id),
    -- Step 1: Box Selection
    box_style VARCHAR(100) NOT NULL,
    box_size VARCHAR(50),
    box_color VARCHAR(50),
    -- Step 2: Contents
    contents JSONB, -- Store array of selected items
    -- Step 3: Accessories
    accessories JSONB, -- Store array of selected accessories
    -- Step 4: Personalization
    personalization_details JSONB, -- Store personalization options
    -- Order Details
    quantity INTEGER DEFAULT 1,
    total_cost DECIMAL(10,2),
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create wedding_styles table for predefined wedding styles
CREATE TABLE IF NOT EXISTS wedding_styles (
    wedding_style_id SERIAL PRIMARY KEY,
    wedding_style_name VARCHAR(100) NOT NULL,
    description TEXT,
    base_price DECIMAL(10,2),
    image_url VARCHAR(255),
    is_active BOOLEAN DEFAULT true
);

-- Create box_styles table for custom orders
CREATE TABLE IF NOT EXISTS box_styles (
    box_id SERIAL PRIMARY KEY,
    style_name VARCHAR(100) NOT NULL,
    description TEXT,
    image_url VARCHAR(255),
    is_active BOOLEAN DEFAULT true
);

-- Create contents table for custom orders
CREATE TABLE IF NOT EXISTS contents (
    content_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(50),
    image_url VARCHAR(255),
    is_active BOOLEAN DEFAULT true
);

-- Create accessories table for custom orders
CREATE TABLE IF NOT EXISTS accessories (
    accessory_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(50),
    image_url VARCHAR(255),
    is_active BOOLEAN DEFAULT true
);

-- Create personalization_options table for custom orders
CREATE TABLE IF NOT EXISTS personalization_options (
    option_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    type VARCHAR(50), -- e.g., 'text', 'image', 'both'
    max_length INTEGER,
    image_url VARCHAR(255),
    is_active BOOLEAN DEFAULT true
);

-- Add indexes for better query performance
CREATE INDEX idx_customer_wedding_orders_customer_id ON customer_wedding_orders(customer_id);
CREATE INDEX idx_customer_custom_orders_customer_id ON customer_custom_orders(customer_id);
CREATE INDEX idx_wedding_styles_active ON wedding_styles(is_active);
CREATE INDEX idx_box_styles_active ON box_styles(is_active);
CREATE INDEX idx_contents_active ON contents(is_active);
CREATE INDEX idx_accessories_active ON accessories(is_active);
CREATE INDEX idx_personalization_options_active ON personalization_options(is_active);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_wedding_orders_updated_at
    BEFORE UPDATE ON customer_wedding_orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_custom_orders_updated_at
    BEFORE UPDATE ON customer_custom_orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 