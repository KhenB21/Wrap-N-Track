const express = require("express");
const router = express.Router();
const pool = require("../db");


router.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM users ORDER BY user_id ASC");
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ message: "Server error" });
  }
});

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

module.exports = router;
