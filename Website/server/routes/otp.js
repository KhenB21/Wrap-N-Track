const express = require('express');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const pool = require('../config/db');

const router = express.Router();

const DEFAULT_OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes
const RESEND_COOLDOWN_MS = 30 * 1000; // 30 seconds
const MAX_ATTEMPTS = 5;

// Cleanup expired OTPs every 10 minutes
setInterval(async () => {
  try {
    const result = await pool.query('DELETE FROM otp_verifications WHERE expires_at < NOW()');
    if (result.rowCount > 0) {
      console.log(`[OTP] Cleaned up ${result.rowCount} expired OTP(s)`);
    }
  } catch (err) {
    console.error('[OTP] Error cleaning up expired OTPs:', err);
  }
}, 10 * 60 * 1000); // 10 minutes

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

  try {
    // Check for existing OTP with cooldown
    const existingResult = await pool.query(
      'SELECT * FROM otp_verifications WHERE email = $1 ORDER BY created_at DESC LIMIT 1',
      [email]
    );

    const now = Date.now();
    if (existingResult.rows.length > 0) {
      const existing = existingResult.rows[0];
      const nextAvailableAt = new Date(existing.next_available_at).getTime();
      
      if (nextAvailableAt && nextAvailableAt > now) {
        const wait = Math.ceil((nextAvailableAt - now) / 1000);
        return res.status(429).json({ success: false, message: `Please wait ${wait}s before resending` });
      }
    }

    const code = generateOtp();
    const expiresAt = new Date(now + DEFAULT_OTP_TTL_MS);
    const nextAvailableAt = new Date(now + RESEND_COOLDOWN_MS);

    // Delete old OTPs for this email
    await pool.query('DELETE FROM otp_verifications WHERE email = $1', [email]);

    // Insert new OTP
    await pool.query(
      'INSERT INTO otp_verifications (email, code, expires_at, attempts, next_available_at) VALUES ($1, $2, $3, $4, $5)',
      [email, code, expiresAt, 0, nextAvailableAt]
    );

    // Send email (best-effort)
    const subject = "Your Wrap N' Track OTP";
    const text = `Your verification code is: ${code}. It expires in 5 minutes.`;
    const html = `<p>Your verification code is: <strong>${code}</strong></p><p>It expires in 5 minutes.</p>`;

    try {
      await sendEmail(email, subject, text, html);
      console.log(`[OTP] Sent OTP to ${email}: ${code}`);
      return res.json({ success: true, message: 'OTP sent' });
    } catch (err) {
      console.error('Error sending OTP email:', err);
      // Still return success since OTP is stored in DB
      console.log(`[OTP] Email failed but OTP stored in DB for ${email}: ${code}`);
      return res.json({ success: true, message: 'OTP sent' });
    }
  } catch (err) {
    console.error('Error in send-otp:', err);
    return res.status(500).json({ success: false, message: 'Failed to generate OTP' });
  }
});

// POST /verify-otp
router.post('/verify-otp', async (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) return res.status(400).json({ success: false, message: 'Email and code are required' });

  try {
    // Get OTP from database
    const result = await pool.query(
      'SELECT * FROM otp_verifications WHERE email = $1 ORDER BY created_at DESC LIMIT 1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ success: false, message: 'No OTP requested for this email' });
    }

    const entry = result.rows[0];
    const now = new Date();

    // Check if expired
    if (new Date(entry.expires_at) < now) {
      await pool.query('DELETE FROM otp_verifications WHERE id = $1', [entry.id]);
      return res.status(400).json({ success: false, message: 'OTP expired' });
    }

    // Check attempts
    if (entry.attempts >= MAX_ATTEMPTS) {
      await pool.query('DELETE FROM otp_verifications WHERE id = $1', [entry.id]);
      return res.status(429).json({ success: false, message: 'Too many attempts, please request a new code' });
    }

    // Verify code
    if (entry.code === code.toString()) {
      await pool.query('DELETE FROM otp_verifications WHERE id = $1', [entry.id]);
      console.log(`[OTP] Successfully verified OTP for ${email}`);
      return res.json({ success: true, message: 'OTP verified' });
    }

    // Wrong code - increment attempts
    const newAttempts = entry.attempts + 1;
    await pool.query(
      'UPDATE otp_verifications SET attempts = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [newAttempts, entry.id]
    );
    
    const remaining = MAX_ATTEMPTS - newAttempts;
    console.log(`[OTP] Invalid code for ${email}. ${remaining} attempts remaining.`);
    return res.status(400).json({ success: false, message: `Invalid code. ${remaining} attempts left.` });
  } catch (err) {
    console.error('Error in verify-otp:', err);
    return res.status(500).json({ success: false, message: 'Failed to verify OTP' });
  }
});

module.exports = router;
