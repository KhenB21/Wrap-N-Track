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

// Note: Connection might fail if DB_USER, DB_NAME, or DB_PASSWORD are not set depending on PG configuration
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
  port: dbPort ? parseInt(dbPort) : 5432, // Default to 5432 if not set
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
    process.exit(1);
  });

// API Route to Fetch Data
app.get("/data", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM tbl_account");

    if (result.rows.length === 0) {
      return res.json({ message: "No data available" });
    }

    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching data:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body;
  console.log("Login attempt:", username);

  try {
    const result = await pool.query(
      "SELECT * FROM users WHERE name = $1",
      [username.trim()]
    );

    console.log("User lookup result:", result.rows);

    const user = result.rows[0];

    if (!user) {
      console.log("No user found with that username");
      return res
        .status(401)
        .json({ success: false, message: "Invalid username or password" });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    console.log("Password valid?", validPassword);

    if (!validPassword) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid username or password" });
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

app.post("/api/auth/add-sales", async (req, res) => {
  const { SKU, name, description, quantity, unitPrice, category, lastUpdated } =
    req.body;

  try {
    const result = await pool.query(
      "INSERT INTO inventory_items (SKU, name, description, quantity, unit_price, category, last_updated) VALUES ($1, $2, $3, $4, $5, $6, $7)",
      [SKU, name, description, quantity, unitPrice, category, lastUpdated]
    );
  } catch (err) {
    console.error("Error during item addition:", err);
    res
      .status(500)
      .json({ error: "Internal Server Error", details: err.message });
  }
});

app.get("/api/auth/check-sku/:sku", async (req, res) => {
  const { sku } = req.params;

  try {
    const result = await pool.query(
      "SELECT COUNT(*) FROM inventory_items WHERE SKU = $1",
      [sku]
    );

    const exists = parseInt(result.rows[0].count) > 0;
    res.json({ exists });
  } catch (err) {
    console.error("Error checking SKU:", err);
    res
      .status(500)
      .json({ error: "Internal Server Error", details: err.message });
  }
});

// Check if username exists
app.get("/api/auth/check-username", async (req, res) => {
  const { username } = req.query;

  if (!username) {
    return res
      .status(400)
      .json({ success: false, message: "Username is required" });
  }

  try {
    const result = await pool.query("SELECT 1 FROM users WHERE name = $1", [
      username.trim(),
    ]);
    const exists = result.rowCount > 0;
    res.json({ exists });
  } catch (error) {
    console.error("Username check error:", error);
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
    const emailCheck = await client.query(
      "SELECT 1 FROM users WHERE email = $1",
      [email]
    );
    if (emailCheck.rowCount > 0) {
      await client.query("ROLLBACK");
      return res
        .status(400)
        .json({ success: false, message: "Email already registered" });
    }

    // Check if username exists
    const usernameCheck = await client.query(
      "SELECT 1 FROM users WHERE name = $1",
      [username.trim()]
    );
    if (usernameCheck.rowCount > 0) {
      await client.query("ROLLBACK");
      return res
        .status(400)
        .json({ success: false, message: "Username already taken" });
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Generate verification code
    const verificationCode = crypto.randomInt(100000, 999999).toString();

    // Concatenate name and address
    const fullName = `${firstName} ${lastName}`.trim();
    const fullAddress =
      `${address}, ${region}, ${province}, ${city}, ${barangay}, ${postal}`.trim();

    // Insert into users table
    const userResult = await client.query(
      `INSERT INTO users (
        name, email, password_hash, role, is_active, is_verified, verification_code
      ) VALUES ($1, $2, $3, $4, true, false, $5)
      RETURNING user_id`,
      [username.trim(), email, passwordHash, "customer", verificationCode]
    );

    const userId = userResult.rows[0].user_id;

    // Insert into customer_details table
    await client.query(
      `INSERT INTO customer_details (
        name, email_address, password_hash, full_address, is_active, is_verified, verification_code
      ) VALUES ($1, $2, $3, $4, true, false, $5)
      RETURNING user_id`,
      [fullName, email, passwordHash, fullAddress, verificationCode]
    );

    // Send verification email
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

// Check if email exists
app.get("/api/auth/check-email", async (req, res) => {
    const { email } = req.query;
    console.log("Checking email:", email);
  
    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: "Email is required" });
    }
  
    try {
      const trimmedEmail = email.trim().toLowerCase(); // normalize casing
      const result = await pool.query("SELECT 1 FROM users WHERE email = $1", [
        trimmedEmail,
      ]);
      const exists = result.rowCount > 0;
      res.json({ exists });
    } catch (error) {
      console.error("Email check error:", error);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  });

const port = process.env.PORT || 3000;
app.listen(port, "0.0.0.0", () => {
  console.log(`Server is running at http://localhost:${port}`);
});
