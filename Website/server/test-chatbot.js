// Integration check for routes/chatbot.js with the DB and Gemini stubbed out.
// Run with: node test-chatbot.js   (no database or Gemini key required)
const path = require('path');
const Module = require('module');

const SERVER = __dirname;
process.env.JWT_SECRET = 'test-secret';
process.env.GEMINI_API_KEY = 'test-key';
process.env.LOG_LEVEL = 'error';

// ── Stub the pg pool before anything requires it ──────────────────────────────
const dbPath = require.resolve(path.join(SERVER, 'config/db.js'));
require.cache[dbPath] = {
  id: dbPath, filename: dbPath, loaded: true,
  exports: {
    query: async (sql) => {
      if (/FROM public\.available_inventory/.test(sql)) {
        return { rows: [
          { storefront_category: 'wedding',   sku: 'SKU-ROSE', name: 'Rose Wrap', unit_price: '120.00', inventory_category: 'wrap' },
          { storefront_category: 'corporate', sku: 'SKU-KRAFT', name: 'Kraft Box', unit_price: '85.50', inventory_category: 'box' },
        ] };
      }
      if (/FROM showcase_bundles/.test(sql)) {
        return { rows: [
          { id: 7, category: 'wedding', title: 'Garden Wedding Set', description: 'Rustic set',
            items: [{ sku: 'SKU-ROSE', name: 'Rose Wrap', quantity: 2 }], bundle_total: '240.00' },
        ] };
      }
      return { rows: [] };
    },
  },
};

// ── Stub Gemini ───────────────────────────────────────────────────────────────
const geminiPath = require.resolve(path.join(SERVER, 'services/geminiClient.js'));
let nextGemini = null;
let lastPrompt = null;
require.cache[geminiPath] = {
  id: geminiPath, filename: geminiPath, loaded: true,
  exports: {
    isConfigured: () => true,
    MODEL: 'stub',
    generateReply: async ({ systemPrompt }) => {
      lastPrompt = systemPrompt;
      return nextGemini;
    },
  },
};

const express = require('express');
const jwt = require('jsonwebtoken');
const router = require(path.join(SERVER, 'routes/chatbot.js'));

const app = express();
app.use(express.json());
app.use('/api/chatbot', router);

let failures = 0;
function check(name, cond, extra) {
  if (cond) { console.log(`  PASS  ${name}`); }
  else { failures++; console.log(`  FAIL  ${name}`, extra !== undefined ? JSON.stringify(extra) : ''); }
}

const server = app.listen(0, async () => {
  const base = `http://127.0.0.1:${server.address().port}/api/chatbot`;

  const post = (body, token) =>
    fetch(`${base}/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(body),
    }).then(async (r) => ({ status: r.status, body: await r.json() }));

  const ok = (recs) => ({ ok: true, data: { reply: 'Here you go.', recommendations: recs, suggested_replies: ['More like this'] } });

  console.log('\n1. Health');
  const health = await fetch(`${base}/health`).then((r) => r.json());
  check('reports available + guest limit 2', health.available === true && health.guestLimit === 2, health);

  console.log('\n2. Validation');
  check('empty message rejected', (await post({ message: '   ' })).status === 400);
  check('over-long message rejected', (await post({ message: 'x'.repeat(501) })).status === 400);

  console.log('\n3. Catalogue grounding');
  nextGemini = ok([{ kind: 'bundle', ref: '7', reason: 'Fits a garden wedding.' }]);
  const g1 = await post({ message: 'garden wedding', guestId: 'guest-aaaaaaaa' });
  check('bundle resolved with live DB price', g1.body.recommendations[0]?.price === 240, g1.body.recommendations);
  check('bundle deep-links to /showcase/7', g1.body.recommendations[0]?.url === '/showcase/7');
  check('prompt carries catalogue skus', /SKU-ROSE/.test(lastPrompt) && /bundle=7/.test(lastPrompt));
  check('guest reply 1 counted', g1.body.guestRepliesUsed === 1, g1.body);

  console.log('\n4. Hallucinated refs are dropped');
  nextGemini = ok([
    { kind: 'product', ref: 'SKU-DOES-NOT-EXIST', reason: 'Invented.' },
    { kind: 'bundle',  ref: '999',               reason: 'Invented.' },
    { kind: 'product', ref: 'SKU-KRAFT',         reason: 'Real one.' },
  ]);
  const g2 = await post({ message: 'corporate giveaway', guestId: 'guest-aaaaaaaa' });
  check('only the real sku survives', g2.body.recommendations.length === 1 && g2.body.recommendations[0].sku === 'SKU-KRAFT', g2.body.recommendations);
  check('product price from DB', g2.body.recommendations[0]?.price === 85.5);
  check('product links to the CUSTOMER order page', g2.body.recommendations[0]?.url === '/order', g2.body.recommendations[0]?.url);
  check('guest reply 2 counted + auth now required', g2.body.guestRepliesUsed === 2 && g2.body.requiresAuth === true, g2.body);

  console.log('\n5. Guest gate on the 3rd turn');
  const g3 = await post({ message: 'what else?', guestId: 'guest-aaaaaaaa' });
  check('gated, not an error', g3.status === 200 && g3.body.gated === true && g3.body.requiresAuth === true, g3.body);
  check('no recommendations leaked past the gate', g3.body.recommendations.length === 0);

  console.log('\n6. Logged-in customer bypasses the gate');
  const token = jwt.sign({ customer_id: 42, name: 'Ana', role: 'customer' }, process.env.JWT_SECRET);
  nextGemini = ok([{ kind: 'bundle', ref: '7', reason: 'Still fits.' }]);
  const c1 = await post({ message: 'wedding again', guestId: 'guest-aaaaaaaa' }, token);
  check('answered despite exhausted guest id', c1.status === 200 && c1.body.gated === false, c1.body);
  check('no guest counter for customers', c1.body.guestRepliesUsed === null && c1.body.guestLimit === null);
  check('prompt personalised with name', /name is Ana/.test(lastPrompt));

  console.log('\n7. A failed Gemini turn must not burn the allowance');
  nextGemini = { ok: false, code: 'upstream', message: 'Try again.' };
  const f1 = await post({ message: 'hello', guestId: 'guest-bbbbbbbb' });
  check('upstream failure surfaces as 502', f1.status === 502, f1.body);
  nextGemini = ok([]);
  const f2 = await post({ message: 'hello again', guestId: 'guest-bbbbbbbb' });
  check('still on reply 1 after the failure', f2.body.guestRepliesUsed === 1, f2.body);

  console.log('\n8. Bundles are ordered ahead of products');
  nextGemini = ok([
    { kind: 'product', ref: 'SKU-ROSE', reason: 'Nice.' },
    { kind: 'bundle',  ref: '7',        reason: 'Better.' },
  ]);
  const o = await post({ message: 'options please' }, token);
  check('bundle listed first', o.body.recommendations[0]?.kind === 'bundle', o.body.recommendations.map((r) => r.kind));

  console.log('\n9. No recommendation may link into the employee system');
  nextGemini = ok([
    { kind: 'product', ref: 'SKU-ROSE',  reason: 'x' },
    { kind: 'product', ref: 'SKU-KRAFT', reason: 'y' },
    { kind: 'bundle',  ref: '7',         reason: 'z' },
  ]);
  const urls = (await post({ message: 'show me everything' }, token)).body.recommendations.map((r) => r.url);
  const EMPLOYEE_ROUTES = ['/product-details', '/inventory', '/employee-dashboard', '/orders',
                           '/reports', '/user-management', '/account-management', '/supplier'];
  const leaks = urls.filter((u) => EMPLOYEE_ROUTES.some((bad) => u.startsWith(bad)));
  check('no employee route in any recommendation', leaks.length === 0, leaks);
  check('every url is a known customer route',
    urls.every((u) => u === '/order' || /^\/showcase\/\d+$/.test(u)), urls);

  console.log('\n10. Expired/invalid token degrades to guest, not 401');
  const bad = await post({ message: 'hi' }, 'not-a-real-token');
  check('treated as guest', bad.status === 200 && typeof bad.body.guestRepliesUsed === 'number', bad.body);

  console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} check(s) FAILED.`);
  server.close();
  process.exit(failures === 0 ? 0 : 1);
});
