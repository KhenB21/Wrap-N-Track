// Gemini-powered customer assistant. Replaces the Zapier Interfaces embed that
// previously lived entirely in the frontend (ZapierChatbotEmbed.js).
//
// Why it moved server-side: the Gemini API key must never ship in the browser
// bundle, and grounding the bot in live inventory requires database access.
//
// Access policy (per product decision):
//   - Guests get GUEST_REPLY_LIMIT answers, then must log in or register.
//   - Logged-in customers get a generous hourly cap.
// The Gemini API free tier has a modest daily quota, so an ungated public bot
// could be drained by a single visitor.
const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();

const logger = require('../utils/logger');
const { generateReply, isConfigured } = require('../services/geminiClient');
const {
  getCatalog,
  renderCatalogForPrompt,
  resolveRecommendations,
} = require('../services/chatbotContext');

const GUEST_REPLY_LIMIT   = 2;      // answers before sign-up is required
const GUEST_IP_HOURLY_CAP = 20;     // backstop so one visitor can't drain quota
const CUSTOMER_HOURLY_CAP = 30;
const MAX_MESSAGE_CHARS   = 500;
const MAX_HISTORY_TURNS   = 10;

// ─── Usage tracking ───────────────────────────────────────────────────────────
// In-memory on purpose: no new table, no new dependency. The trade-off is that
// counters reset when the server restarts and are per-instance. For the current
// single-instance deployment that is fine; moving to multiple instances would
// mean backing these with Postgres or Redis.
const guestUsage = new Map();   // guestId -> { replies, firstSeen }
const hourlyUsage = new Map();  // key     -> { count, windowStart }

const HOUR_MS = 60 * 60 * 1000;
const GUEST_TTL_MS = 24 * HOUR_MS;

setInterval(() => {
  const now = Date.now();
  for (const [k, v] of guestUsage)  if (now - v.firstSeen   > GUEST_TTL_MS) guestUsage.delete(k);
  for (const [k, v] of hourlyUsage) if (now - v.windowStart > HOUR_MS)      hourlyUsage.delete(k);
}, 10 * 60 * 1000).unref();

function hitHourlyCap(key, cap) {
  const now = Date.now();
  const entry = hourlyUsage.get(key);
  if (!entry || now - entry.windowStart > HOUR_MS) {
    hourlyUsage.set(key, { count: 1, windowStart: now });
    return false;
  }
  entry.count += 1;
  return entry.count > cap;
}

function clientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length) return fwd.split(',')[0].trim();
  return req.ip || req.connection?.remoteAddress || 'unknown';
}

function guestKey(guestId, ip) {
  return typeof guestId === 'string' && guestId.length <= 64 && guestId.length >= 8
    ? `g:${guestId}`
    : `ip:${ip}`;
}

// Auth is optional here — unlike every other customer route, a guest is a valid
// caller. An invalid or expired token is treated as "not logged in" rather than
// a 401, so an expired session degrades into the guest experience instead of a
// broken widget.
function optionalCustomer(req) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  try {
    const decoded = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);
    return decoded && decoded.customer_id ? decoded : null;
  } catch {
    return null;
  }
}

// ─── Prompt ───────────────────────────────────────────────────────────────────
function buildSystemPrompt({ catalogText, customerName }) {
  const greeting = customerName
    ? `The customer is signed in and their name is ${customerName}. Greet them by name on the first reply only.`
    : 'The customer is browsing as a guest. Do not ask for their name.';

  return [
    "You are the shopping assistant for Wrap N' Track, a Philippine gift-wrapping and packaging business.",
    '',
    'YOUR JOB',
    'Understand what the customer is celebrating, then recommend what to buy from the catalogue below.',
    '',
    greeting,
    '',
    'HOW TO RECOMMEND',
    '1. If you do not yet know the occasion, ask about it first. Keep gathering the essentials - occasion, who it is for, rough budget, and how many - but ask at most ONE question per reply. Never interrogate.',
    '2. As soon as you know the occasion, recommend something. Do not stall for perfect information.',
    '3. ALWAYS prefer a bundle when one matches the occasion. A bundle is a ready-made package the customer can order from a single page, so it saves them assembling items one by one. Lead with the bundle, then offer individual products as extras or alternatives.',
    '4. Recommend 1-3 items. More than that is overwhelming.',
    "5. Every recommendation needs a 'reason' written for THIS customer and THIS occasion - reference what they told you. \"Matches the rustic look you mentioned for a garden wedding\" is good. \"A popular choice\" is useless.",
    '',
    'HARD RULES',
    '- Recommend ONLY items in the catalogue below, referenced by their exact sku or bundle id. Never invent a product, a bundle, or an id.',
    '- NEVER state a price, and never quote totals or discounts. The customer sees exact live prices on the card shown beside your reply. If asked about price, say the card shows the current price.',
    '- Never promise stock levels, delivery dates, or custom work. Offer to connect them with the team instead.',
    '- Stay on topic: gift wrapping, packaging, and gifting occasions. If asked something unrelated, redirect warmly in one sentence.',
    '- If the catalogue has nothing suitable, say so honestly and offer to pass their requirements to the team. Do not force a bad match.',
    '',
    'TONE',
    'Warm, brief, and practical - a helpful shop assistant, not a salesperson. 2-4 sentences per reply.',
    'LANGUAGE: Mirror the customer. Default to English. Reply in Filipino or Taglish ONLY if the customer wrote to you in Filipino or Taglish first. An English message always gets an English reply.',
    '',
    catalogText,
  ].join('\n');
}

// ─── Routes ───────────────────────────────────────────────────────────────────

// GET /api/chatbot/health — lets the widget avoid rendering a bubble that
// cannot work (e.g. key not configured in this environment).
router.get('/health', (req, res) => {
  res.json({ success: true, available: isConfigured(), guestLimit: GUEST_REPLY_LIMIT });
});

// POST /api/chatbot/message
// Body: { message, history?: [{ role, text }], guestId? }
router.post('/message', async (req, res) => {
  try {
    if (!isConfigured()) {
      return res.status(503).json({
        success: false,
        code: 'not_configured',
        message: 'The assistant is not available right now.',
      });
    }

    const { message, history, guestId } = req.body || {};

    if (typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Message is required.' });
    }
    if (message.length > MAX_MESSAGE_CHARS) {
      return res.status(400).json({
        success: false,
        code: 'too_long',
        message: `Please keep it under ${MAX_MESSAGE_CHARS} characters.`,
      });
    }

    const customer = optionalCustomer(req);
    const ip = clientIp(req);
    const gKey = guestKey(guestId, ip);

    // Guest gate — two answers, then sign up.
    if (!customer) {
      const entry = guestUsage.get(gKey);

      if (entry && entry.replies >= GUEST_REPLY_LIMIT) {
        return res.json({
          success: true,
          gated: true,
          requiresAuth: true,
          reply: "I'd love to keep helping — create a free account or log in and we can pick up right where we left off.",
          recommendations: [],
          suggestedReplies: [],
          guestRepliesUsed: entry.replies,
          guestLimit: GUEST_REPLY_LIMIT,
        });
      }

      if (hitHourlyCap(`guest-ip:${ip}`, GUEST_IP_HOURLY_CAP)) {
        return res.status(429).json({
          success: false,
          code: 'rate_limited',
          message: "I'm handling a lot of questions right now. Please try again shortly.",
        });
      }
    } else if (hitHourlyCap(`customer:${customer.customer_id}`, CUSTOMER_HOURLY_CAP)) {
      return res.status(429).json({
        success: false,
        code: 'rate_limited',
        message: "You've reached the hourly limit for the assistant. Please try again in a little while.",
      });
    }

    const catalog = await getCatalog();
    const systemPrompt = buildSystemPrompt({
      catalogText: renderCatalogForPrompt(catalog),
      customerName: customer ? customer.name : null,
    });

    const trimmedHistory = Array.isArray(history)
      ? history
          .filter((t) => t && typeof t.text === 'string' && (t.role === 'user' || t.role === 'model'))
          .slice(-MAX_HISTORY_TURNS)
      : [];

    const result = await generateReply({
      systemPrompt,
      history: trimmedHistory,
      message: message.trim(),
    });

    if (!result.ok) {
      // A failed turn must not consume the guest's allowance.
      const status = result.code === 'rate_limited' ? 429 : 502;
      return res.status(status).json({ success: false, code: result.code, message: result.message });
    }

    const recommendations = resolveRecommendations(result.data.recommendations, catalog);

    // Only a successful answer counts against the guest allowance.
    let guestRepliesUsed = null;
    if (!customer) {
      const entry = guestUsage.get(gKey) || { replies: 0, firstSeen: Date.now() };
      entry.replies += 1;
      guestUsage.set(gKey, entry);
      guestRepliesUsed = entry.replies;
    }

    const suggestedReplies = Array.isArray(result.data.suggested_replies)
      ? result.data.suggested_replies.filter((s) => typeof s === 'string' && s.trim()).slice(0, 3)
      : [];

    return res.json({
      success: true,
      gated: false,
      reply: result.data.reply,
      recommendations,
      suggestedReplies,
      guestRepliesUsed,
      guestLimit: customer ? null : GUEST_REPLY_LIMIT,
      requiresAuth: !customer && guestRepliesUsed >= GUEST_REPLY_LIMIT,
    });
  } catch (err) {
    logger.error('chatbot_message_failed', { err });
    return res.status(500).json({
      success: false,
      code: 'server_error',
      message: 'Something went wrong on my end. Please try again.',
    });
  }
});

module.exports = router;
