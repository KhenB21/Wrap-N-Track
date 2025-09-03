const express = require('express');
const router = express.Router();

// Simple employee-only test endpoint
router.get('/test', (req, res) => {
  res.json({ success: true, message: 'Employee route accessed', user: req.user });
});

module.exports = router;
