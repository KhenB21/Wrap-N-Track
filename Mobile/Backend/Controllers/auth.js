const pool = require("../db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

const generateOTP = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let otp = "";
  for (let i = 0; i < 6; i++) {
    otp += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return otp;
};

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.MAIL_USER, 
    pass: process.env.MAIL_PASS, 
  },
  tls: {
    rejectUnauthorized: false,
  },
});

exports.register = async (req, res) => {
  const { name, email, password, username, phone, address } = req.body;
  try {
    const userCheck = await pool.query("SELECT * FROM users WHERE email=$1", [
      email,
    ]);
    if (userCheck.rows.length > 0)
      return res.status(400).json({ message: "Email already exists" });

    const hash = await bcrypt.hash(password, 10);
    const otp = generateOTP();
    const otp_expires = new Date(Date.now() + 10 * 60000);

    await pool.query(
      "INSERT INTO users (name, email, password, username, phone, address, otp_code, otp_expires) VALUES ($1,$2,$3,$4,$5,$6,$7)",
      [name, email, hash, username, phone, address, otp, otp_expires, ]
    );

    // Send OTP email
    await transporter.sendMail({
      from: process.env.MAIL_USER,
      to: email,
      subject: "Verify your email",
      text: `Your verification code is: ${otp}`,
    });

    res.json({
      message: "Registered. Please check your email for the verification code.",
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.verifyEmail = async (req, res) => {
  const { email, otp } = req.body;
  try {
    const user = await pool.query("SELECT * FROM users WHERE email=$1", [
      email,
    ]);
    if (!user.rows.length)
      return res.status(404).json({ message: "User not found" });
    const u = user.rows[0];
    if (u.is_verified) return res.json({ message: "Already verified" });
    if (u.otp_code !== otp || new Date() > u.otp_expires)
      return res.status(400).json({ message: "Invalid or expired OTP" });

    await pool.query(
      "UPDATE users SET is_verified=true, otp_code=null, otp_expires=null WHERE email=$1",
      [email]
    );
    res.json({ message: "Email verified! You can now login." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await pool.query("SELECT * FROM users WHERE email=$1", [
      email,
    ]);
    if (!user.rows.length)
      return res.status(400).json({ message: "Email not found" });
    const u = user.rows[0];
    if (!u.is_verified)
      return res.status(400).json({ message: "Email not verified" });

    const isMatch = await bcrypt.compare(password, u.password);
    if (!isMatch) return res.status(400).json({ message: "Wrong password" });

    const token = jwt.sign(
      { id: u.id, email: u.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );
    res.json({
      token,
      user: { user_id: u.user_id, email: u.email, username: u.username },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await pool.query("SELECT * FROM users WHERE email=$1", [
      email,
    ]);
    if (!user.rows.length)
      return res.status(400).json({ message: "Email not found" });

    const otp = generateOTP();
    const otp_expires = new Date(Date.now() + 10 * 60000);

    await pool.query(
      "UPDATE users SET otp_code=$1, otp_expires=$2 WHERE email=$3",
      [otp, otp_expires, email]
    );

    // Send OTP email
    await transporter.sendMail({
      from: process.env.MAIL_USER,
      to: email,
      subject: "Password Reset Code",
      text: `Your reset code is: ${otp}`,
    });

    res.json({ message: "Reset code sent to email" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.resetPassword = async (req, res) => {
  const { email, otp, newPassword } = req.body;
  try {
    const user = await pool.query("SELECT * FROM users WHERE email=$1", [
      email,
    ]);
    if (!user.rows.length)
      return res.status(400).json({ message: "Email not found" });

    const u = user.rows[0];
    if (u.otp_code !== otp || new Date() > u.otp_expires)
      return res.status(400).json({ message: "Invalid or expired OTP" });

    const hash = await bcrypt.hash(newPassword, 10);
    await pool.query(
      "UPDATE users SET password=$1, otp_code=null, otp_expires=null WHERE email=$2",
      [hash, email]
    );
    res.json({ message: "Password reset successful. You can now login." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
