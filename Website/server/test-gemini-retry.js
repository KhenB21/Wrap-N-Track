// Checks services/geminiClient.js retry + backup-model behaviour with axios stubbed.
// Run with: node test-gemini-retry.js   (no Gemini key or network required)
process.env.GEMINI_API_KEY = 'test-key';
process.env.GEMINI_MODEL = 'main-model';
process.env.GEMINI_FALLBACK_MODELS = 'backup-model';
process.env.LOG_LEVEL = 'error';

// Hand geminiClient a fake axios and a fake Anthropic SDK (works even without
// node_modules installed).
const Module = require('module');
const axios = {};
let claudeQueue = [];
let claudeCalls = [];
class FakeAnthropic {
  constructor(opts) { this.opts = opts; }
  get beta() {
    return {
      messages: {
        create: async (params, options) => {
          claudeCalls.push({ params, options });
          const next = claudeQueue.shift();
          if (next === 'ok') {
            return {
              model: params.model,
              stop_reason: 'end_turn',
              usage: { input_tokens: 10, output_tokens: 20 },
              content: [
                { type: 'thinking', thinking: '' },
                { type: 'text', text: JSON.stringify({ reply: 'hi from claude', recommendations: [], suggested_replies: [] }) },
              ],
            };
          }
          if (next === 'refusal') return { model: params.model, stop_reason: 'refusal', content: [] };
          const err = new Error('claude stub failure');
          err.status = next;
          throw err;
        },
      },
    };
  }
}
const realLoad = Module._load;
Module._load = function load(request, ...rest) {
  if (request === 'axios') return axios;
  if (request === '@anthropic-ai/sdk') return { default: FakeAnthropic };
  return realLoad.call(this, request, ...rest);
};

// Each test queues responses per call: a number = HTTP error status,
// 'timeout' = axios timeout, 'ok' = success.
let queue = [];
let calls = [];
axios.post = async (url) => {
  const model = url.match(/models\/([^:]+):/)[1];
  calls.push(model);
  const next = queue.shift();
  if (next === 'ok') {
    return {
      data: {
        candidates: [{
          finishReason: 'STOP',
          content: { parts: [{ text: JSON.stringify({ reply: `hi from ${model}`, recommendations: [], suggested_replies: [] }) }] },
        }],
      },
    };
  }
  const err = new Error('stub failure');
  if (next === 'timeout') { err.code = 'ECONNABORTED'; throw err; }
  err.response = { status: next, data: { error: { message: `stub ${next}` } } };
  throw err;
};

const { generateReply, _resetModelHealth, _modelHealth } = require('./services/geminiClient');

let failures = 0;
const check = (name, cond, extra) => {
  if (cond) console.log(`  PASS  ${name}`);
  else { failures++; console.log(`  FAIL  ${name}`, extra !== undefined ? JSON.stringify(extra) : ''); }
};

// Each case starts with every model healthy unless keepHealth is set (used to
// check that a failure is remembered for the NEXT customer).
async function run(label, responses, claudeResponses = [], history = [], { keepHealth = false } = {}) {
  if (!keepHealth) _resetModelHealth();
  queue = [...responses];
  calls = [];
  claudeQueue = [...claudeResponses];
  claudeCalls = [];
  const result = await generateReply({ systemPrompt: 'sys', history, message: 'hello' });
  return { result, calls: [...calls], claudeCalls: claudeCalls.length, label };
}

(async () => {
  let r;

  r = await run('success first try', ['ok']);
  check('first try succeeds with one call', r.result.ok && r.calls.join() === 'main-model', r);

  r = await run('503 then ok', [503, 'ok']);
  check('503 is retried on the same model', r.result.ok && r.calls.join() === 'main-model,main-model', r);

  r = await run('503 twice then backup ok', [503, 503, 'ok']);
  check('falls back to backup model after two 503s',
    r.result.ok && r.calls.join() === 'main-model,main-model,backup-model'
      && r.result.data.reply === 'hi from backup-model', r);

  r = await run('429 goes straight to backup', [429, 'ok']);
  check('429 skips same-model retry', r.result.ok && r.calls.join() === 'main-model,backup-model', r);

  r = await run('timeout then ok', ['timeout', 'ok']);
  check('timeout is retried', r.result.ok && r.calls.length === 2, r);

  r = await run('404 main model', [404, 'ok']);
  check('retired main model (404) uses backup', r.result.ok && r.calls.join() === 'main-model,backup-model', r);

  r = await run('401 bad key', [401]);
  check('bad key (401) is not retried', !r.result.ok && r.result.code === 'auth' && r.calls.length === 1, r);

  r = await run('400 bad request', [400]);
  check('bad request (400) is not retried', !r.result.ok && r.calls.length === 1, r);

  r = await run('everything down', [503, 503, 503]);
  check('all attempts fail -> upstream error, 3 calls', !r.result.ok && r.result.code === 'upstream' && r.calls.length === 3, r);

  r = await run('503 then backup 404', [503, 503, 404]);
  check('backup 404 still reports the upstream overload', !r.result.ok && r.result.code === 'upstream', r);

  // ── Remembering failing models ────────────────────────────────────────────
  console.log('\nModel rotation (skip models that failed recently)');

  r = await run('main overloaded, backup answers', [503, 503, 'ok']);
  check('main model is marked as cooling after failing', _modelHealth.get('main-model')?.reason === 'overloaded', [..._modelHealth]);
  r = await run('next customer', ['ok'], [], [], { keepHealth: true });
  check('next request goes straight to the backup model (no wait on main)',
    r.result.ok && r.calls.join() === 'backup-model', r);
  check('backup that answered stays healthy', !_modelHealth.has('backup-model'), [..._modelHealth]);

  r = await run('retired main', [404, 'ok']);
  check('retired (404) main model cools down for hours',
    _modelHealth.get('main-model')?.reason === 'retired'
      && _modelHealth.get('main-model').until - Date.now() > 60 * 60 * 1000, [..._modelHealth]);

  r = await run('rate limited main', [429, 'ok']);
  check('rate-limited (429) main model cools down ~1 minute',
    _modelHealth.get('main-model')?.reason === 'rateLimited', [..._modelHealth]);

  r = await run('bad key', [401]);
  check('bad key (401) does not mark the model as failing', !_modelHealth.has('main-model'), [..._modelHealth]);

  _resetModelHealth();
  await run('both overloaded', [503, 503, 503]);
  r = await run('all cooling, still tries', ['ok'], [], [], { keepHealth: true });
  check('when every model is cooling, they are still tried (not an instant error)',
    r.result.ok && r.calls.length === 1, r);

  _resetModelHealth();
  await run('main overloaded', [503, 503, 'ok']);
  r = await run('main recovered', [503, 503, 'ok'], [], [], { keepHealth: true });
  // backup (healthy) goes first and gets its quick retry; both fail, then the
  // cooling main model is tried and works
  check('cooling model that works again is marked healthy',
    r.result.ok && r.calls.join() === 'backup-model,backup-model,main-model' && !_modelHealth.has('main-model'), r);

  r = await run('no Claude key: Claude never called', [503, 503, 503], ['ok']);
  check('without ANTHROPIC_API_KEY Claude is not used', !r.result.ok && r.claudeCalls === 0, r);

  // ── Claude as backup ──────────────────────────────────────────────────────
  console.log('\nClaude backup (ANTHROPIC_API_KEY set)');
  process.env.ANTHROPIC_API_KEY = 'test-claude-key';

  r = await run('gemini ok', ['ok'], ['ok']);
  check('Gemini success -> Claude not called', r.result.ok && r.claudeCalls === 0
    && r.result.data.reply === 'hi from main-model', r);

  r = await run('gemini down, claude ok', [503, 503, 503], ['ok']);
  check('all Gemini attempts fail -> Claude answers', r.result.ok && r.claudeCalls === 1
    && r.result.data.reply === 'hi from claude', r);

  r = await run('gemini bad key, claude ok', [401], ['ok']);
  check('Gemini key problem -> Claude answers', r.result.ok && r.result.data.reply === 'hi from claude', r);

  r = await run('both down', [503, 503, 503], [529]);
  check('both fail -> Gemini upstream message shown', !r.result.ok && r.result.code === 'upstream' && r.claudeCalls === 1, r);

  r = await run('claude refusal', [503, 503, 503], ['refusal']);
  check('Claude refusal -> polite decline, not a crash', !r.result.ok && r.claudeCalls === 1, r);

  // Gemini safety block must not be overruled by Claude.
  const origPost = axios.post;
  axios.post = async () => ({ data: { candidates: [{ finishReason: 'SAFETY', content: { parts: [] } }] } });
  r = await run('gemini safety block', [], ['ok']);
  check('Gemini safety block is respected (Claude not called)', !r.result.ok && r.result.code === 'blocked' && r.claudeCalls === 0, r);
  axios.post = origPost;

  r = await run('history starting with greeting', [503, 503, 503], ['ok'], [
    { role: 'model', text: 'Hello! I am Wrappy.' },
    { role: 'user', text: 'wedding' },
    { role: 'model', text: 'Lovely!' },
  ]);
  const sent = claudeCalls[0]?.params;
  check('Claude request: first message is user, roles mapped, last is new message',
    sent && sent.messages[0].role === 'user' && sent.messages[0].content === 'wedding'
      && sent.messages[1].role === 'assistant' && sent.messages.at(-1).content === 'hello', sent?.messages);
  check('Claude request: structured output + low effort + fallback beta',
    sent && sent.output_config.format.type === 'json_schema' && sent.output_config.effort === 'low'
      && sent.betas.includes('server-side-fallback-2026-07-01') && sent.fallbacks === 'default', sent);
  check('Claude request: timeout fits inside the 25s budget',
    claudeCalls[0]?.options?.timeout > 0 && claudeCalls[0].options.timeout <= 25000, claudeCalls[0]?.options);

  delete process.env.GEMINI_API_KEY;
  r = await run('only claude key', [], ['ok']);
  check('No Gemini key -> Claude handles it alone', r.result.ok && r.calls.length === 0 && r.claudeCalls === 1, r);

  console.log(failures ? `\n${failures} check(s) failed` : '\nAll checks passed');
  process.exit(failures ? 1 : 0);
})();
