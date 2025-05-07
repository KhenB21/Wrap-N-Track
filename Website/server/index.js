const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001; // Changed to match frontend

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    // Accept images only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
      return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
  }
});

// CORS configuration
app.use(cors({
  origin: 'http://localhost:3000', // Your React app's URL
  methods: ['GET', 'POST'],
  credentials: true
}));
app.use(express.json());

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// PostgreSQL connection configuration
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
});

// Test database connection
pool.connect((err, client, release) => {
  if (err) {
    console.error('Error acquiring client', err.stack);
    console.error('Database connection details:', {
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT || 5432,
      // Not logging password for security
    });
    process.exit(1); // Exit if we can't connect to the database
  }
  console.log('Successfully connected to PostgreSQL database');
  release();
});

// Add error handler for pool
pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({
      success: false,
      message: 'No token provided'
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
};

// Registration endpoint with file upload
app.post('/api/auth/register', upload.single('profilePicture'), async (req, res) => {
  const { name, email, password, role } = req.body;
  const profilePicturePath = req.file ? `/uploads/${req.file.filename}` : null;

  try {
    // Check if email already exists
    const emailCheck = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (emailCheck.rows.length > 0) {
      // If registration fails and a file was uploaded, delete it
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Insert new user with profile picture
    const result = await pool.query(
      'INSERT INTO users (name, email, password_hash, role, profile_picture_path) VALUES ($1, $2, $3, $4, $5) RETURNING user_id, name, email, role, profile_picture_path',
      [name, email, passwordHash, role, profilePicturePath]
    );

    const newUser = result.rows[0];

    // Create JWT token
    const token = jwt.sign(
      { 
        user_id: newUser.user_id,
        name: newUser.name,
        role: newUser.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Return success response
    res.status(201).json({
      success: true,
      token,
      user: {
        user_id: newUser.user_id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        profile_picture_path: newUser.profile_picture_path
      }
    });

  } catch (error) {
    // If registration fails and a file was uploaded, delete it
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    // Get user from database
    const result = await pool.query(
      'SELECT * FROM users WHERE name = $1',
      [username]
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password'
      });
    }

    // Compare password
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password'
      });
    }

    // Create JWT token
    const token = jwt.sign(
      { 
        user_id: user.user_id,
        name: user.name,
        role: user.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Return success response
    res.json({
      success: true,
      token,
      user: {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// User details endpoint
app.get('/api/user/details', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT user_id, name, email, role, created_at, profile_picture_path FROM users WHERE user_id = $1',
      [req.user.user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching user details:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Upload or change profile picture endpoint
app.post('/api/user/profile-picture', verifyToken, upload.single('profilePicture'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }
  const profilePicturePath = `/uploads/${req.file.filename}`;
  try {
    // Get the old profile picture path to delete the old file if needed
    const userResult = await pool.query(
      'SELECT profile_picture_path FROM users WHERE user_id = $1',
      [req.user.user_id]
    );
    const oldPath = userResult.rows[0]?.profile_picture_path;
    // Update the user's profile picture path in the database
    await pool.query(
      'UPDATE users SET profile_picture_path = $1 WHERE user_id = $2',
      [profilePicturePath, req.user.user_id]
    );
    // Optionally delete the old file (if it exists and is not null)
    if (oldPath && oldPath !== profilePicturePath) {
      const oldFile = path.join(__dirname, oldPath);
      if (fs.existsSync(oldFile)) {
        fs.unlinkSync(oldFile);
      }
    }
    res.json({ success: true, profile_picture_path: profilePicturePath });
  } catch (error) {
    // If upload fails, delete the new file
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    console.error('Profile picture upload error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Basic test route
app.get('/api/test', (req, res) => {
  res.json({ message: 'Server is running!' });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
}); 