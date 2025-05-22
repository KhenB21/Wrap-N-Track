-- Up Migration:
CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(50) CHECK (role IN ('admin', 'business_developer', 'creatives', 'director', 'sales_manager', 'assistant_sales', 'packer')),
    profile_picture_data BYTEA,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    deleted_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS inventory_items (
    sku VARCHAR(20) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    quantity INTEGER DEFAULT 0 NOT NULL,
    unit_price NUMERIC(10,2) NOT NULL,
    category VARCHAR(50),
    image_data BYTEA,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
    order_id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    shipped_to VARCHAR(100),
    order_date DATE NOT NULL,
    expected_delivery DATE,
    status VARCHAR(50) NOT NULL,
    shipping_address TEXT NOT NULL,
    total_cost NUMERIC(10,2) NOT NULL,
    payment_type VARCHAR(50),
    payment_method VARCHAR(50),
    account_name VARCHAR(100),
    remarks TEXT,
    telephone VARCHAR(20) NOT NULL,
    cellphone VARCHAR(20) NOT NULL,
    email_address VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS order_products (
    order_id VARCHAR(50) REFERENCES orders(order_id),
    sku VARCHAR(50) REFERENCES inventory_items(sku),
    quantity INTEGER NOT NULL,
    PRIMARY KEY (order_id, sku)
);

CREATE TABLE IF NOT EXISTS order_history (
    order_id VARCHAR(50) PRIMARY KEY,
    customer_name VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    shipped_to VARCHAR(255) NOT NULL,
    order_date DATE NOT NULL,
    expected_delivery DATE,
    status VARCHAR(50) NOT NULL,
    shipping_address TEXT NOT NULL,
    total_cost NUMERIC(10,2) NOT NULL,
    payment_type VARCHAR(50) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    account_name VARCHAR(255),
    remarks TEXT,
    telephone VARCHAR(20),
    cellphone VARCHAR(20),
    email_address VARCHAR(255),
    archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    archived_by INTEGER REFERENCES users(user_id)
);

CREATE TABLE IF NOT EXISTS order_history_products (
    order_id VARCHAR(50) REFERENCES order_history(order_id),
    sku VARCHAR(50) REFERENCES inventory_items(sku),
    quantity INTEGER NOT NULL,
    unit_price NUMERIC(10,2) NOT NULL,
    PRIMARY KEY (order_id, sku)
);

CREATE TABLE IF NOT EXISTS sales (
    sale_id SERIAL PRIMARY KEY,
    sku VARCHAR(20) REFERENCES inventory_items(sku),
    quantity_sold INTEGER NOT NULL,
    unit_price NUMERIC(10,2) NOT NULL,
    total_amount NUMERIC(10,2) GENERATED ALWAYS AS (quantity_sold * unit_price) STORED,
    sold_by INTEGER REFERENCES users(user_id),
    sale_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS activity_logs (
    log_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id),
    activity TEXT NOT NULL,
    log_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS features (
    feature_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    frame_reference VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS role_feature_access (
    role VARCHAR(50) NOT NULL,
    feature_id INTEGER REFERENCES features(feature_id),
    PRIMARY KEY (role, feature_id)
);

CREATE TABLE IF NOT EXISTS customer_details (
    user_id INTEGER PRIMARY KEY REFERENCES users(user_id),
    name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(20),
    email_address VARCHAR(100),
    CONSTRAINT user_id_length CHECK (user_id >= 1000 AND user_id <= 9999)
);

-- Down Migration:
DROP TABLE IF EXISTS customer_details;
DROP TABLE IF EXISTS role_feature_access;
DROP TABLE IF EXISTS features;
DROP TABLE IF EXISTS activity_logs;
DROP TABLE IF EXISTS sales;
DROP TABLE IF EXISTS order_history_products;
DROP TABLE IF EXISTS order_history;
DROP TABLE IF EXISTS order_products;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS inventory_items;
DROP TABLE IF EXISTS users; 