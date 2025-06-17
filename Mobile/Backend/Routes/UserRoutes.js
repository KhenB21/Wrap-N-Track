const express = require("express");
const router = express.Router();
const pool = require("../db");

// GET all users
router.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM users ORDER BY user_id ASC");
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET user by ID
router.get("/:id", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM users WHERE user_id = $1", [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("User fetch error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// PUT update user profile by ID (INCLUDE avatar)
router.put("/:id", async (req, res) => {
  const { name, age, phone, address, avatar } = req.body;
  const { id } = req.params;
  try {
    await pool.query(
      `UPDATE users SET name = $1, age = $2, phone = $3, address = $4, avatar = $5 WHERE user_id = $6`,
      [name, age, phone, address, avatar, id]
    );
    res.json({ success: true });
  } catch (error) {
    console.error("Update error:", error);
    res.status(500).json({ error: 'Could not update profile' });
  }
});

module.exports = router;
