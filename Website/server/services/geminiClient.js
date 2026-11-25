// Thin wrapper over the Gemini REST API.
//
// Deliberately uses axios (already a dependency) over @google/genai so the
// chatbot adds no new packages to install or audit.
//
// The API key lives only here, server-side. It must never reach the browser —
// anything in a REACT_APP_* var is compiled into the public JS bundle.
const axios = require('axios');
const logger = require('../utils/logger');
const claude = require('./claudeClient');

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
const endpointFor = (model) => `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

// Backup models, tried in this order when the main one is overloaded (5xx),
// rate limited (429), slow, or retired (404). All "lite" models on purpose:
// fast, and the free plan gives them the most generous limits — each model has
// its OWN quota, so rotating between them also spreads the free usage.
// Comma-separated in GEMINI_FALLBACK_MODELS; set it to "none" to disable.
// A name this key can't use just 404s once and is then skipped for hours.
const FALLBACK_MODELS = [
  ...new Set(
    (process.env.GEMINI_FALLBACK_MODELS ?? 'gemini-flash-lite-latest,gemini-2.5-flash-lite')
      .split(',')
      .map((m) => m.trim())
      .filter((m) => m && m.toLowerCase() !== 'none' && m !== MODEL)
  ),
];
const ALL_MODELS = [MODEL, ...FALLBACK_MODELS];

// ─── Model health ─────────────────────────────────────────────────────────────
// Remembers which models failed recently so the next customer doesn't wait on a
// model that is known to be down: a failing model "cools down" and is moved to
// the back of the line until its cooldown ends. In memory, per server instance.
const COOLDOWN_MS = {
  overloaded: 60 * 1000,      // 5xx / timeout: Google usually recovers within a minute
  rateLimited: 60 * 1000,     // 429: free-plan per-minute limits reset each minute
  retired: 6 * 60 * 60 * 1000, // 404: this key can't use the model; check again later
};
const modelHealth = new Map(); // model -> { until, reason }

function coolDown(model, err) {
  const status = err?.response?.status;
  let reason = null;
  if (status === 404) reason = 'retired';
  else if (status === 429) reason = 'rateLimited';
  else if (!err?.response || status >= 500) reason = 'overloaded';
  if (!reason) return; // 400/401/403: a problem with the request or key, not the model
  modelHealth.set(model, { until: Date.now() + COOLDOWN_MS[reason], reason });
  logger.warn('chatbot_gemini_model_cooling', { model, reason, status, seconds: COOLDOWN_MS[reason] / 1000 });
}

function isCooling(model) {
  const h = modelHealth.get(model);
  if (!h) return false;
  if (Date.now() >= h.until) {
    modelHealth.delete(model);
    return false;
  }
  return true;
}

// Healthy models first, in priority order; cooling ones last (soonest to
// recover first) — still worth a try if every model is cooling.
function modelsInOrder() {
  const healthy = ALL_MODELS.filter((m) => !isCooling(m));
  const cooling = ALL_MODELS.filter((m) => isCooling(m)).sort(
    (a, b) => modelHealth.get(a).until - modelHealth.get(b).until
  );
  return [...healthy, ...cooling];
}

// The mobile app gives up after 30s, so every attempt together must finish
// well inside that. Each attempt gets at most PER_ATTEMPT_MS of the remainder.
const TOTAL_BUDGET_MS = Number(process.env.GEMINI_TOTAL_BUDGET_MS) || 25000;
// When Claude is set up as the backup, Gemini only gets this much of the
// budget so Claude still has ~10s left to answer if Gemini fails.
const GEMINI_SHARE_WITH_BACKUP_MS = 14000;
// Lite models normally answer in 1-3s, so a model that hasn't answered in 8s is
// stuck — better to move on to the next model than keep waiting.
const PER_ATTEMPT_MS = 8000;
const MIN_ATTEMPT_MS = 3000; // not worth starting an attempt with less than this left
const RETRY_DELAY_MS = 700;  // brief pause before retrying the same model

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Failures worth another try: Google overloaded/erroring, rate limits, timeouts,
// dropped connections. A bad key (401/403) or bad request (400) won't fix itself.
function isRetryable(err) {
  const status = err?.response?.status;
  if (!err?.response) return true; // timeout or network error
  return status >= 500 || status === 429;
}

// The ordered list of attempts: the first healthy model, one quick retry of it
// (most 503 "overloaded" errors clear within a second), then every other model.
function buildAttempts() {
  const [first, ...rest] = modelsInOrder();
  const attempts = [{ model: first }];
  // Only retry a model that was healthy — a cooling one already failed recently.
  if (!isCooling(first)) attempts.push({ model: first, delay: RETRY_DELAY_MS, sameModelRetry: true });
  return [...attempts, ...rest.map((model) => ({ model }))];
}

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

function isGeminiConfigured() {
  return Boolean(process.env.GEMINI_API_KEY);
}

// The chatbot is available if either Gemini (main) or Claude (backup) has a key.
function isConfigured() {
  return isGeminiConfigured() || claude.isConfigured();
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

// Gemini only: the main model, one retry, then any backup Gemini models,
// all within budgetMs.
async function generateGeminiReply({ systemPrompt, history = [], message, budgetMs }) {
  const contents = [
    ...history.map((turn) => ({
      role: turn.role === 'model' ? 'model' : 'user',
      parts: [{ text: String(turn.text || '').slice(0, 2000) }],
    })),
    { role: 'user', parts: [{ text: message }] },
  ];

  const body = {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents,
    generationConfig: {
      temperature: 0.7,
      // A 2-4 sentence reply plus up to 3 short recommendations fits easily;
      // a lower cap uses less of the free token quota per message.
      maxOutputTokens: 800,
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA,
    },
    // Wrapping/gifting talk is benign; keep the defaults rather than
    // loosening anything.
  };

  const started = Date.now();
  let data = null;
  let usedModel = MODEL;
  let lastErr = null;

  for (const attempt of buildAttempts()) {
    // A 429 is a quota on that model — retrying the same one immediately won't help.
    if (attempt.sameModelRetry && lastErr?.response?.status === 429) continue;
    // A retired/unknown model (404) won't come back on a retry either.
    if (attempt.sameModelRetry && lastErr?.response?.status === 404) continue;

    if (attempt.delay) await sleep(attempt.delay);
    const remaining = budgetMs - (Date.now() - started);
    if (remaining < MIN_ATTEMPT_MS) break;

    try {
      const res = await axios.post(endpointFor(attempt.model), body, {
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': process.env.GEMINI_API_KEY,
        },
        timeout: Math.min(PER_ATTEMPT_MS, remaining),
      });
      data = res.data;
      usedModel = attempt.model;
      modelHealth.delete(attempt.model); // it works again — back to the front of the line
      if (lastErr) {
        logger.warn('chatbot_gemini_recovered', {
          model: attempt.model,
          afterStatus: lastErr?.response?.status,
          ms: Date.now() - started,
        });
      }
      break;
    } catch (err) {
      const status = err?.response?.status;
      // Report the most telling failure: a backup model 404ing shouldn't hide
      // that the real problem was the main model being overloaded.
      if (!lastErr || status !== 404) lastErr = err;
      coolDown(attempt.model, err);
      logger.warn('chatbot_gemini_attempt_failed', {
        model: attempt.model,
        status,
        code: err?.code,
        upstream: err?.response?.data?.error?.message,
      });
      // 404 means this model is gone for this key — move on to the backups.
      if (!isRetryable(err) && status !== 404) break;
    }
  }

  try {
    if (!data) throw lastErr || new Error('No Gemini attempt could run within the time budget');

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
      logger.warn('chatbot_gemini_non_json', { model: usedModel });
      return { ok: true, data: { reply: raw.slice(0, 800), recommendations: [], suggested_replies: [] } };
    }

    return { ok: true, data: parsed };
  } catch (err) {
    const failure = describeFailure(err);
    logger.error('chatbot_gemini_failed', {
      code: failure.code,
      status: err?.response?.status,
      model: MODEL,
      fallbacks: FALLBACK_MODELS,
      hint: failure.hint,
      upstream: err?.response?.data?.error?.message,
      err,
    });
    const { hint, ...clientSafe } = failure;
    return { ok: false, ...clientSafe };
  }
}

/**
 * The chatbot's entry point: Gemini first, Claude as the backup.
 *
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

  const started = Date.now();
  const backupReady = claude.isConfigured();
  let geminiResult = null;

  if (isGeminiConfigured()) {
    geminiResult = await generateGeminiReply({
      systemPrompt,
      history,
      message,
      budgetMs: backupReady ? GEMINI_SHARE_WITH_BACKUP_MS : TOTAL_BUDGET_MS,
    });
    // Success, or a deliberate safety decline (Claude shouldn't overrule it).
    if (geminiResult.ok || geminiResult.code === 'blocked' || !backupReady) return geminiResult;
  }

  const remaining = TOTAL_BUDGET_MS - (Date.now() - started);
  if (remaining < MIN_ATTEMPT_MS) return geminiResult;

  logger.warn('chatbot_using_claude_backup', {
    geminiCode: geminiResult?.code || 'gemini_not_configured',
    msLeft: remaining,
  });
  const claudeResult = await claude.generateReply({ systemPrompt, history, message, timeoutMs: remaining });
  if (claudeResult.ok || !geminiResult) return claudeResult;
  // Both failed: Gemini's message describes the original problem best.
  return geminiResult;
}

module.exports = {
  generateReply,
  isConfigured,
  MODEL,
  ALL_MODELS,
  // Test hooks: inspect / reset the cooldown memory between test cases.
  _modelHealth: modelHealth,
  _resetModelHealth: () => modelHealth.clear(),
};
