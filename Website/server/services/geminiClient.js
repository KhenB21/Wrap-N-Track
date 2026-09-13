// Thin wrapper over the Gemini REST API.
//
// Deliberately uses axios (already a dependency) over @google/genai so the
// chatbot adds no new packages to install or audit.
//
// The API key lives only here, server-side. It must never reach the browser —
// anything in a REACT_APP_* var is compiled into the public JS bundle.
const axios = require('axios');
const logger = require('../utils/logger');

// Chosen for LATENCY, which dominates here: this is a chat widget, not a
// batch job. Measured against the real key with a representative prompt:
//
//   gemini-3.6-flash                    ~64s  (1121 thinking tokens, 62 out)
//   gemini-3.6-flash + thinkingBudget   ~26s  (thinking off, still slow)
//   gemini-3.5-flash-lite               ~1.4s
//
// The full flash models are reasoning models; they spend far more time thinking
// than this task needs. Recommending from a short, explicit catalogue is not a
// reasoning-heavy problem, and the lite model was checked on the cases that
// matter — right bundle for the occasion, no invented skus, no prices in prose,
// off-topic questions deflected. `thinkingLevel` is not a valid field on this
// API version and `thinkingBudget: 0` is rejected outright, so trimming the
// thinking on a full flash model is not an option here.
//
// Pinned rather than a floating alias like `gemini-flash-latest`: an alias can
// shift under us mid-demo, and that one returned 503 under load while pinned
// models were fine. Google also retires older models for newly issued keys
// (gemini-2.5-flash now 404s with "no longer available to new users"), so if
// this starts 404ing, list the models your key can reach and bump it — see the
// hint in describeFailure() below.
const MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
const TIMEOUT_MS = 20000;

// Gemini returns JSON matching this shape, which keeps parsing deterministic
// instead of scraping product names out of prose.
//
// The model supplies ONLY references and reasoning. Names, prices and URLs are
// filled in server-side from the database — see resolveRecommendations().
const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    reply: {
      type: 'string',
      description: 'Conversational reply to the customer. 2-4 sentences, warm and concise.',
    },
    recommendations: {
      type: 'array',
      description: 'Products or bundles to show as cards. Empty while still gathering requirements.',
      items: {
        type: 'object',
        properties: {
          kind:   { type: 'string', enum: ['product', 'bundle'] },
          ref:    { type: 'string', description: 'Exact sku for a product, or exact numeric id for a bundle.' },
          reason: { type: 'string', description: 'One short sentence on why this fits THIS customer.' },
        },
        required: ['kind', 'ref', 'reason'],
      },
    },
    suggested_replies: {
      type: 'array',
      description: 'Up to 3 short tappable replies (max 6 words each) to keep the conversation moving.',
      items: { type: 'string' },
    },
  },
  required: ['reply', 'recommendations', 'suggested_replies'],
};

function isConfigured() {
  return Boolean(process.env.GEMINI_API_KEY);
}

// Maps a failure to a message that is safe and useful to show a customer.
// A chatbot that dies with a raw stack trace mid-demo is worse than one that
// politely defers.
function describeFailure(err) {
  const status = err?.response?.status;

  if (err.code === 'ECONNABORTED') {
    return { code: 'timeout', message: "Sorry, that took longer than expected. Could you send that again?" };
  }
  if (status === 429) {
    return { code: 'rate_limited', message: "I'm handling a lot of questions right now. Give me a moment and try again?" };
  }
  if (status === 401 || status === 403) {
    return { code: 'auth', message: "The assistant is temporarily unavailable. Please try again shortly." };
  }
  if (status === 404) {
    // Almost always a retired model rather than a bad URL — Google drops older
    // models for newly issued keys. Name the fix in the log so this does not
    // read as a generic outage.
    return {
      code: 'model_unavailable',
      message: 'The assistant is temporarily unavailable. Please try again shortly.',
      hint: `Model "${MODEL}" was rejected with 404. List the models your key can reach and set GEMINI_MODEL in Website/server/.env to one of them.`,
    };
  }
  if (status >= 500) {
    return { code: 'upstream', message: "I'm having trouble thinking right now. Please try again in a moment." };
  }
  return { code: 'unknown', message: "Something went wrong on my end. Please try again." };
}

/**
 * @param {object}   args
 * @param {string}   args.systemPrompt  Persona + catalogue + rules.
 * @param {Array}    args.history       [{ role: 'user'|'model', text }] prior turns.
 * @param {string}   args.message       The customer's new message.
 * @returns {Promise<{ok: true, data: object} | {ok: false, code: string, message: string}>}
 */
async function generateReply({ systemPrompt, history = [], message }) {
  if (!isConfigured()) {
    return { ok: false, code: 'not_configured', message: 'The assistant is not available right now.' };
  }

  const contents = [
    ...history.map((turn) => ({
      role: turn.role === 'model' ? 'model' : 'user',
      parts: [{ text: String(turn.text || '').slice(0, 2000) }],
    })),
    { role: 'user', parts: [{ text: message }] },
  ];

  try {
    const { data } = await axios.post(
      ENDPOINT,
      {
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1200,
          responseMimeType: 'application/json',
          responseSchema: RESPONSE_SCHEMA,
        },
        // Wrapping/gifting talk is benign; keep the defaults rather than
        // loosening anything.
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': process.env.GEMINI_API_KEY,
        },
        timeout: TIMEOUT_MS,
      }
    );

    const candidate = data?.candidates?.[0];
    const finish = candidate?.finishReason;

    if (finish === 'SAFETY' || finish === 'PROHIBITED_CONTENT') {
      return {
        ok: false,
        code: 'blocked',
        message: "I can't help with that one — but I'd love to help you find the right wrapping. What's the occasion?",
      };
    }

    const raw = candidate?.content?.parts?.map((p) => p.text).join('') || '';
    if (!raw.trim()) {
      return { ok: false, code: 'empty', message: 'Sorry, I did not catch that. Could you rephrase?' };
    }

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // responseSchema makes this very unlikely, but a truncated response
      // (maxOutputTokens) can still produce invalid JSON. Degrade to showing
      // the text rather than erroring out.
      logger.warn('chatbot_gemini_non_json', { model: MODEL });
      return { ok: true, data: { reply: raw.slice(0, 800), recommendations: [], suggested_replies: [] } };
    }

    return { ok: true, data: parsed };
  } catch (err) {
    const failure = describeFailure(err);
    logger.error('chatbot_gemini_failed', {
      code: failure.code,
      status: err?.response?.status,
      model: MODEL,
      hint: failure.hint,
      upstream: err?.response?.data?.error?.message,
      err,
    });
    const { hint, ...clientSafe } = failure;
    return { ok: false, ...clientSafe };
  }
}

module.exports = { generateReply, isConfigured, MODEL };
