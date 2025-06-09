const express = require("express");
const router = express.Router();
const pool = require("../db");

router.post("/", async (req, res) => {
  try {
    const {
      name,
      shipped_to,
      expected_delivery,
      status,
      shipping_address,
      total_cost,
      telephone,
      cellphone,
      email_address,
    } = req.body;

    const result = await pool.query(
      `INSERT INTO orders 
      (name, shipped_to, expected_delivery, status, shipping_address, total_cost, telephone, cellphone, email_address)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [
        name,
        shipped_to,
        expected_delivery,
        status,
        shipping_address,
        total_cost,
        telephone,
        cellphone,
        email_address,
      ]
    );

    res.status(201).json({ success: true, order: result.rows[0] });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
