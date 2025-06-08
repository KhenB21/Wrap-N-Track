import express from "express";
import { Pool } from "pg";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

const dbUser = process.env.DB_USER;
const dbHost = process.env.DB_HOST || "localhost";
const dbName = process.env.DB_NAME;
const dbPort = process.env.DB_PORT;
console.log("Database User:", dbUser || "Not set (will use PG defaults)");
console.log("Database Host:", dbHost);
console.log("Database Name:", dbName || "Not set (will use PG defaults)");
console.log("Database Port:", dbPort || "Not set (will use 5432)");

// Note: Connection might fail if DB_USER, DB_NAME, or DB_PASSWORD are not fully set depending on PG configuration
if (!dbUser || !dbName || !process.env.DB_PASSWORD) {
  console.warn(
    "Database connection environment variables (DB_USER, DB_NAME, DB_PASSWORD) are not fully set. Connection might fail depending on PostgreSQL configuration."
  );
}

const pool = new Pool({
  user: dbUser,
  host: dbHost,
  database: dbName,
  password: process.env.DB_PASSWORD,
  port: dbPort ? parseInt(dbPort) : 5432,
});

// Test the connection immediately
pool
  .connect()
  .then((client) => {
    console.log("Successfully connected to PostgreSQL database");
    client.release();
  })
  .catch((err) => {
    console.error("Error connecting to PostgreSQL database:", err);
    process.exit(1); // Exit if database connection fails
  });

// Middleware to log incoming requests
app.use((req, res, next) => {
  console.log(`📥 Received request: ${req.method} ${req.url}`);
  next();
});

// --- AUTH ROUTES ---

// Endpoint to check if username exists
app.get("/api/auth/check-username", async (req, res) => {
  const { username } = req.query;
  if (!username) {
    return res.status(400).json({ success: false, message: "Username is required" });
  }
  try {
    const result = await pool.query("SELECT 1 FROM users WHERE name = $1", [username.trim()]);
    const exists = result.rowCount > 0;
    res.json({ exists });
  } catch (error) {
    console.error("Username check error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// Endpoint to check if email exists
app.get("/api/auth/check-email", async (req, res) => {
  const { email } = req.query;
  if (!email) {
    return res.status(400).json({ success: false, message: "Email is required" });
  }
  try {
    const trimmedEmail = email.trim().toLowerCase();
    const result = await pool.query("SELECT 1 FROM users WHERE email = $1", [trimmedEmail]);
    const exists = result.rowCount > 0;
    res.json({ exists });
  } catch (error) {
    console.error("Email check error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// Registration endpoint
app.post("/api/auth/register", async (req, res) => {
  const {
    firstName,
    lastName,
    username,
    email,
    password,
    address,
    region,
    province,
    city,
    barangay,
    postal,
  } = req.body;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Check if email exists
    const emailCheck = await client.query("SELECT 1 FROM users WHERE email = $1", [email]);
    if (emailCheck.rowCount > 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ success: false, message: "Email already registered" });
    }

    // Check if username exists
    const usernameCheck = await client.query("SELECT 1 FROM users WHERE name = $1", [username.trim()]);
    if (usernameCheck.rowCount > 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ success: false, message: "Username already taken" });
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Generate verification code (if needed for email verification)
    const verificationCode = crypto.randomInt(100000, 999999).toString();

    // Concatenate name and address
    const fullName = `${firstName} ${lastName}`.trim();
    const fullAddress = `${address}, ${region}, ${province}, ${city}, ${barangay}, ${postal}`.trim();

    // Insert into users table
    const userResult = await client.query(
      `INSERT INTO users (name, email, password_hash, role, is_active, is_verified, verification_code) VALUES ($1, $2, $3, $4, true, false, $5) RETURNING user_id`,
      [username.trim(), email, passwordHash, "customer", verificationCode]
    );
    const userId = userResult.rows[0].user_id;

    // Insert into customer_details table (assuming you have one, if not, remove this)
    await client.query(
      `INSERT INTO customer_details (name, email_address, password_hash, full_address, is_active, is_verified, verification_code) VALUES ($1, $2, $3, $4, true, false, $5) RETURNING user_id`,
      [fullName, email, passwordHash, fullAddress, verificationCode] // Note: password_hash might not be needed in customer_details, adjust as per your schema
    );

    // Send verification email (if you have Nodemailer set up)
    if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD,
        },
      });

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Verify your email",
        text: `Hi ${firstName},\n\nYour verification code is: ${verificationCode}\n\nThank you!`,
      };

      await transporter.sendMail(mailOptions);
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId, email, role: "customer" },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "1h" }
    );

    await client.query("COMMIT");

    res.status(201).json({
      success: true,
      message: "Registration successful. Please verify your email.",
      user: {
        user_id: userId,
        name: username.trim(),
        email: email,
        role: "customer",
      },
      token,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Registration error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  } finally {
    client.release();
  }
});

// Login endpoint
app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body;
  console.log("Login attempt with username:", username);

  try {
    const result = await pool.query("SELECT * FROM users WHERE name = $1", [username.trim()]);
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid username or password" });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      return res.status(401).json({ success: false, message: "Invalid username or password" });
    }

    // Create JWT token
    const token = jwt.sign(
      {
        user_id: user.user_id,
        name: user.name,
        role: user.role,
      },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "24h" }
    );

    // Return success response
    res.json({
      success: true,
      token,
      user: {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// Get user data endpoint (requires JWT in Authorization header: Bearer <token>)
app.get("/api/auth/user", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ success: false, message: "No token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key");
    
    const result = await pool.query(
      "SELECT user_id, name, email, role FROM users WHERE user_id = $1",
      [decoded.user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.json({
      success: true,
      user: result.rows[0]
    });
  } catch (error) {
    console.error("Error fetching user data:", error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ success: false, message: "Invalid token" });
    }
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// --- INVENTORY ROUTES ---

// Get all inventory items
app.get("/api/inventory/items", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM inventory_items ORDER BY last_updated DESC");
    res.json({ success: true, items: result.rows });
  } catch (error) {
    console.error("Error fetching inventory items:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// Add new inventory item
app.post("/api/inventory/add", async (req, res) => {
  const { SKU, name, description, quantity, unit_price, category, image_url, additional_images, variant, weight_volume, date_added } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO inventory_items (SKU, name, description, quantity, unit_price, category, last_updated, image_url, additional_images, variant, weight_volume, date_added) VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7, $8, $9, $10, $11) RETURNING *`,
      [SKU, name, description, quantity, unit_price, category, image_url, additional_images, variant, weight_volume, date_added]
    );
    res.status(201).json({ success: true, item: result.rows[0] });
  } catch (err) {
    console.error("Error during item addition:", err);
    res.status(500).json({ error: "Internal Server Error", details: err.message });
  }
});

// Check if SKU exists
app.get("/api/inventory/check-sku/:sku", async (req, res) => {
  const { sku } = req.params;
  try {
    const result = await pool.query("SELECT COUNT(*) FROM inventory_items WHERE SKU = $1", [sku]);
    const exists = parseInt(result.rows[0].count) > 0;
    res.json({ exists });
  } catch (err) {
    console.error("Error checking SKU:", err);
    res.status(500).json({ error: "Internal Server Error", details: err.message });
  }
});

// --- SALES ROUTES ---

// Get all sales
app.get("/api/sales/items", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM sales ORDER BY created_at DESC");
    res.json({ success: true, items: result.rows });
  } catch (error) {
    console.error("Error fetching sales:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// Add new sale
app.post("/api/sales/add", async (req, res) => {
  const { customer_name, total_items, total_amount, status } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO sales (customer_name, total_items, total_amount, status, created_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING *`,
      [customer_name, total_items, total_amount, status]
    );
    res.status(201).json({ success: true, sale: result.rows[0] });
  } catch (err) {
    console.error("Error adding sale:", err);
    res.status(500).json({ error: "Internal Server Error", details: err.message });
  }
});

// --- START SERVER ---
const port = process.env.PORT || 3000;
app.listen(port, "0.0.0.0", () => {
  console.log(`Server is running at http://localhost:${port}`);
});
