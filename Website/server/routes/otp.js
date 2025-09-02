const express = require('express');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const router = express.Router();

// In-memory store for OTPs: { [email]: { code, expiresAt, attempts, nextAvailableAt } }
const otpStore = new Map();

const DEFAULT_OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes
const RESEND_COOLDOWN_MS = 30 * 1000; // 30 seconds
const MAX_ATTEMPTS = 5;

function generateOtp() {
  return crypto.randomInt(100000, 999999).toString();
}

async function sendEmail(email, subject, text, html) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    // In development, if email isn't configured, just log the OTP to console
    console.log('OTP email skipped (no SMTP config). To:', email);
    console.log('Email subject:', subject);
    console.log('Email text:', text);
    return;
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject,
    text,
    html,
  };

  await transporter.sendMail(mailOptions);
}

// POST /send-otp
router.post('/send-otp', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

  const existing = otpStore.get(email);
  const now = Date.now();
  if (existing && existing.nextAvailableAt && existing.nextAvailableAt > now) {
    const wait = Math.ceil((existing.nextAvailableAt - now) / 1000);
    return res.status(429).json({ success: false, message: `Please wait ${wait}s before resending` });
  }

  const code = generateOtp();
  const expiresAt = new Date(now + DEFAULT_OTP_TTL_MS);

  otpStore.set(email, {
    code,
    expiresAt,
    attempts: 0,
    nextAvailableAt: now + RESEND_COOLDOWN_MS,
  });

  // Send email (best-effort)
  const subject = "Your Wrap N' Track OTP";
  const text = `Your verification code is: ${code}. It expires in 5 minutes.`;
  const html = `<p>Your verification code is: <strong>${code}</strong></p><p>It expires in 5 minutes.</p>`;

  try {
    await sendEmail(email, subject, text, html);
    return res.json({ success: true, message: 'OTP sent' });
  } catch (err) {
    console.error('Error sending OTP email:', err);
    return res.status(500).json({ success: false, message: 'Failed to send OTP email' });
  }
});

// POST /verify-otp
router.post('/verify-otp', (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) return res.status(400).json({ success: false, message: 'Email and code are required' });

  const entry = otpStore.get(email);
  if (!entry) return res.status(400).json({ success: false, message: 'No OTP requested for this email' });

  const now = new Date();
  if (entry.expiresAt < now) {
    otpStore.delete(email);
    return res.status(400).json({ success: false, message: 'OTP expired' });
  }

  if (entry.attempts >= MAX_ATTEMPTS) {
    otpStore.delete(email);
    return res.status(429).json({ success: false, message: 'Too many attempts, please request a new code' });
  }

  if (entry.code === code.toString()) {
    otpStore.delete(email);
    return res.json({ success: true, message: 'OTP verified' });
  }

  // Wrong code
  entry.attempts = (entry.attempts || 0) + 1;
  otpStore.set(email, entry);
  const remaining = MAX_ATTEMPTS - entry.attempts;
  return res.status(400).json({ success: false, message: `Invalid code. ${remaining} attempts left.` });
});

module.exports = router;
