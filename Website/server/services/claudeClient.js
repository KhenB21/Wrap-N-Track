// Claude as the chatbot's BACKUP model. Gemini stays the main one (see
// geminiClient.js); this only runs when every Gemini attempt has failed, so a
// Gemini outage or free-tier limit doesn't leave customers without an answer.
//
// Returns the same shape as Gemini — { reply, recommendations[{kind, ref, reason}],
// suggested_replies } — so routes/chatbot.js doesn't care which model answered.
//
// Off unless ANTHROPIC_API_KEY is set. The key stays server-side only.
const logger = require('../utils/logger');

// Override with CHATBOT_CLAUDE_MODEL (e.g. claude-haiku-5-5 for a cheaper
// backup). Prefixed CHATBOT_ so tools that set their own CLAUDE_* variables
// can't change the chatbot by accident.
const MODEL = process.env.CHATBOT_CLAUDE_MODEL || 'claude-opus-5-5';
// Short, catalogue-bound chat replies don't need deep reasoning; low effort
// keeps the backup fast and cheap. Override with CHATBOT_CLAUDE_EFFORT.
const EFFORT = process.env.CHATBOT_CLAUDE_EFFORT || 'low';
const MAX_TOKENS = 4000;

// Same fields as Gemini's RESPONSE_SCHEMA. Structured outputs need every
// object closed with additionalProperties: false.
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
          kind: { type: 'string', enum: ['product', 'bundle'] },
          ref: { type: 'string', description: 'Exact sku for a product, or exact numeric id for a bundle.' },
          reason: { type: 'string', description: 'One short sentence on why this fits THIS customer.' },
        },
        required: ['kind', 'ref', 'reason'],
        additionalProperties: false,
      },
    },
    suggested_replies: {
      type: 'array',
      description: 'Up to 3 short tappable replies (max 6 words each) to keep the conversation moving.',
      items: { type: 'string' },
    },
  },
  required: ['reply', 'recommendations', 'suggested_replies'],
  additionalProperties: false,
};

function isConfigured() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

let client = null;
function getClient() {
  if (client) return client;
  // Required lazily so the server still boots if the package isn't installed
  // and no Claude key is configured.
  const sdk = require('@anthropic-ai/sdk');
  const Anthropic = sdk.default || sdk;
  // No SDK-level retries: geminiClient.js owns the overall time budget, and a
  // hidden retry could push the reply past the mobile app's 30s timeout.
  client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, maxRetries: 0 });
  return client;
}

// Gemini history uses role 'model'; Claude uses 'assistant'. The first message
// must be from the user, so leading assistant turns (the canned greeting) go.
function toClaudeMessages(history, message) {
  const turns = history.map((turn) => ({
    role: turn.role === 'model' ? 'assistant' : 'user',
    content: String(turn.text || '').slice(0, 2000),
  }));
  while (turns.length && turns[0].role === 'assistant') turns.shift();
  turns.push({ role: 'user', content: message });
  return turns;
}

/**
 * @param {object} args
 * @param {string} args.systemPrompt
 * @param {Array}  args.history     [{ role: 'user'|'model', text }]
 * @param {string} args.message
 * @param {number} args.timeoutMs   Time left in the overall budget.
 * @returns {Promise<{ok: true, data: object} | {ok: false, code: string, message: string}>}
 */
async function generateReply({ systemPrompt, history = [], message, timeoutMs }) {
  if (!isConfigured()) {
    return { ok: false, code: 'not_configured', message: 'The assistant is not available right now.' };
  }

  const started = Date.now();
  try {
    const response = await getClient().beta.messages.create(
      {
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: systemPrompt,
        messages: toClaudeMessages(history, message),
        output_config: {
          effort: EFFORT,
          format: { type: 'json_schema', schema: RESPONSE_SCHEMA },
        },
        // If Claude's safety filter declines, let the API retry on another
        // Claude model automatically instead of failing the turn.
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
      },
      { timeout: timeoutMs }
    );

    if (response.stop_reason === 'refusal') {
      return {
        ok: false,
        code: 'blocked',
        message: "I can't help with that one — but I'd love to help you find the right wrapping. What's the occasion?",
      };
    }

    const raw = (response.content || [])
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('');
    if (!raw.trim()) {
      return { ok: false, code: 'empty', message: 'Sorry, I did not catch that. Could you rephrase?' };
    }

    logger.warn('chatbot_claude_answered', {
      model: response.model || MODEL,
      ms: Date.now() - started,
      inputTokens: response.usage?.input_tokens,
      outputTokens: response.usage?.output_tokens,
    });

    try {
      return { ok: true, data: JSON.parse(raw) };
    } catch {
      // Only likely if max_tokens cut the JSON short — show the text instead.
      logger.warn('chatbot_claude_non_json', { model: MODEL, stopReason: response.stop_reason });
      return { ok: true, data: { reply: raw.slice(0, 800), recommendations: [], suggested_replies: [] } };
    }
  } catch (err) {
    logger.error('chatbot_claude_failed', {
      model: MODEL,
      status: err?.status,
      name: err?.name,
      message: err?.message,
      ms: Date.now() - started,
    });
    return { ok: false, code: 'backup_failed', message: "Something went wrong on my end. Please try again." };
  }
}

module.exports = { generateReply, isConfigured, MODEL };
