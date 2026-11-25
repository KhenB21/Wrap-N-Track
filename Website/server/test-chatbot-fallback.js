// Checks services/chatbotFallback.js — the no-AI catalogue answers used for the
// preset buttons and when every Gemini model is down.
// Run with: node test-chatbot-fallback.js   (no database or Gemini key required)
const path = require('path');

// chatbotContext requires the database pool; stub it (not used here).
const dbPath = require.resolve(path.join(__dirname, 'config/db.js'));
require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: { query: async () => ({ rows: [] }) } };

const { buildCatalogReply, matchPreset } = require('./services/chatbotFallback');
const { resolveRecommendations } = require('./services/chatbotContext');

const catalog = {
  products: [
    { storefront_category: 'packaging', sku: 'BOX-1', name: 'Black Box', unit_price: '120.00' },
    { storefront_category: 'packaging', sku: 'BOX-2', name: 'Kraft Box', unit_price: '85.00' },
    { storefront_category: 'homeDecor', sku: 'CAN-1', name: 'Soy Candle', unit_price: '250.00' },
    { storefront_category: 'beverages', sku: 'TEA-1', name: 'Chamomile Tea', unit_price: '180.00' },
  ],
  bundles: [
    { id: 7, category: 'wedding', title: 'Garden Wedding Set', items: [{ name: 'Black Box', quantity: 2 }], bundle_total: '240.00' },
    { id: 8, category: 'wedding', title: 'Classic Wedding Set', items: [], bundle_total: '300.00' },
    { id: 9, category: 'corporate', title: 'Executive Set', items: [], bundle_total: '500.00' },
    { id: 10, category: 'bespoke', title: 'Birthday Treat', items: [], bundle_total: '350.00' },
  ],
};

let failures = 0;
const check = (name, cond, extra) => {
  if (cond) console.log(`  PASS  ${name}`);
  else { failures++; console.log(`  FAIL  ${name}`, extra !== undefined ? JSON.stringify(extra) : ''); }
};
const refs = (out) => out.recommendations.map((r) => `${r.kind}:${r.ref}`).join(',');

console.log('\nPreset buttons');
check('"Wedding giveaways" is a preset', matchPreset('Wedding giveaways') === 'wedding');
check('preset match ignores case/spacing', matchPreset('  corporate GIFTS ') === 'corporate');
check('"Birthday gift wrap" -> bespoke', matchPreset('Birthday gift wrap') === 'bespoke');
check('ordinary message is not a preset', matchPreset('I need wedding giveaways for 100 guests') === null);

let out = buildCatalogReply({ message: 'Wedding giveaways', catalog, mode: 'preset' });
check('wedding preset -> the wedding bundles', refs(out) === 'bundle:7,bundle:8', out);
check('preset reply has no "taking a break" note', !/break/i.test(out.reply), out.reply);
check('suggested replies offer the OTHER presets', !out.suggested_replies.includes('Wedding giveaways'), out.suggested_replies);

out = buildCatalogReply({ message: 'Corporate gifts', catalog, mode: 'preset' });
check('corporate preset -> corporate bundle', refs(out) === 'bundle:9', out);

console.log('\nWhen the AI is down');
out = buildCatalogReply({ message: 'kasal namin next month', catalog, mode: 'offline' });
check('Filipino "kasal" -> wedding bundles', refs(out) === 'bundle:7,bundle:8', out);
check('offline reply says suggestions are on a break', /break/i.test(out.reply), out.reply);

out = buildCatalogReply({
  message: 'A preset one. like bundled one',
  history: [{ role: 'user', text: 'gift for my mom birthday' }, { role: 'model', text: 'Lovely!' }],
  catalog,
  mode: 'offline',
});
check('no keyword in latest message -> uses earlier "birthday" -> bespoke bundle', refs(out) === 'bundle:10', out);

out = buildCatalogReply({ message: 'do you have candles?', catalog, mode: 'offline' });
check('"candles" -> home decor products', refs(out) === 'product:CAN-1', out);

out = buildCatalogReply({ message: 'hello', catalog, mode: 'offline' });
check('no clue at all -> one bundle per occasion + asks the occasion',
  refs(out) === 'bundle:7,bundle:9,bundle:10' && /occasion/i.test(out.reply), out);

out = buildCatalogReply({
  message: 'birthday',
  catalog: { products: catalog.products, bundles: catalog.bundles.filter((b) => b.category !== 'bespoke') },
  mode: 'offline',
});
check('occasion with no bundle -> packaging to build your own', refs(out) === 'product:BOX-1,product:BOX-2', out);

out = buildCatalogReply({ message: 'hello', catalog: { products: [], bundles: [] }, mode: 'offline' });
check('empty catalogue -> polite question, no cards', out.recommendations.length === 0 && out.reply.length > 0, out);

console.log('\nCards resolve against the real catalogue');
out = buildCatalogReply({ message: 'Wedding giveaways', catalog, mode: 'preset' });
const cards = resolveRecommendations(out.recommendations, catalog);
check('every fallback recommendation turns into a real card', cards.length === out.recommendations.length
  && cards[0].title === 'Garden Wedding Set' && cards[0].price === 240, cards);

console.log(failures ? `\n${failures} check(s) failed` : '\nAll checks passed');
process.exit(failures ? 1 : 0);
