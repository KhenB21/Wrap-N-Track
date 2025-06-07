const express = require("express");
const router = express.Router();
const auth = require("../Controllers/auth");

router.post("/register", auth.register);
router.post("/verify-email", auth.verifyEmail);
router.post("/login", auth.login);
router.post("/forgot-password", auth.forgotPassword);
router.post("/reset-password", auth.resetPassword);

module.exports = router;
