// Builds the live catalogue context handed to Gemini on every chatbot turn.
//
// The Zapier bot this replaced answered from a static knowledge base that had to
// be re-uploaded by hand whenever stock changed. This reads the same tables the
// customer-facing pages read, so the moment an item is pulled from
// available_inventory or a bundle is deactivated, the bot stops offering it.
//
// Cached briefly: a chat session fires several turns in a row and the catalogue
// does not meaningfully change between them.
const pool = require('../config/db');

// Customer-facing destinations only. The chatbot is a customer surface, so
// every link it produces must land inside the customer POV — never the employee
// dashboard, inventory, or product-details screens.
const CUSTOMER_PRODUCT_ROUTE = '/order';
const CUSTOMER_BUNDLE_ROUTE = (id) => `/showcase/${id}`;

const CACHE_TTL_MS = 60 * 1000;
let _cache = null;
let _cachedAt = 0;

// Products a customer is actually allowed to buy — mirrors the query in
// routes/available-inventory.js (minus the image blob, which would blow up the
// prompt; images are re-attached server-side when a recommendation is resolved).
async function fetchProducts() {
  const { rows } = await pool.query(`
    SELECT ai.category      AS storefront_category,
           i.sku,
           i.name,
           i.unit_price,
           i.category       AS inventory_category
    FROM public.available_inventory ai
    JOIN public.inventory_items i ON i.sku = ai.sku
    WHERE i.is_active = true
    ORDER BY ai.category, i.name ASC
  `);
  return rows;
}

// Active showcase bundles plus the items inside them, so the bot can pitch a
// ready-made package instead of making the customer assemble one item at a time.
async function fetchBundles() {
  const { rows } = await pool.query(`
    SELECT b.id,
           b.category,
           b.title,
           b.description,
           COALESCE(
             json_agg(
               json_build_object('sku', bi.sku, 'name', ii.name, 'quantity', bi.quantity)
               ORDER BY bi.id
             ) FILTER (WHERE bi.sku IS NOT NULL),
             '[]'
           ) AS items,
           COALESCE(SUM(ii.unit_price * bi.quantity), 0) AS bundle_total
    FROM showcase_bundles b
    LEFT JOIN bundle_items bi     ON bi.bundle_id = b.id
    LEFT JOIN inventory_items ii  ON ii.sku = bi.sku AND ii.is_active = true
    WHERE b.is_active = true
    GROUP BY b.id
    ORDER BY b.created_at DESC
  `);
  return rows;
}

async function getCatalog({ force = false } = {}) {
  const fresh = _cache && Date.now() - _cachedAt < CACHE_TTL_MS;
  if (fresh && !force) return _cache;

  const [products, bundles] = await Promise.all([fetchProducts(), fetchBundles()]);
  _cache = { products, bundles };
  _cachedAt = Date.now();
  return _cache;
}

function invalidateCatalogCache() {
  _cache = null;
  _cachedAt = 0;
}

// Compact, token-frugal rendering. Prices are included so the bot can reason
// about budget, but it is forbidden (see the system prompt) from quoting them —
// the resolved card carries the authoritative price straight from the database.
function renderCatalogForPrompt({ products, bundles }) {
  if (!products.length && !bundles.length) {
    return 'CATALOGUE: (currently empty — tell the customer items are being restocked and offer to take their requirements.)';
  }

  const byCategory = {};
  for (const p of products) {
    (byCategory[p.storefront_category] ||= []).push(p);
  }

  const productLines = Object.entries(byCategory)
    .map(([category, items]) => {
      const rendered = items
        .map((i) => `  - sku=${i.sku} | ${i.name} | PHP ${Number(i.unit_price).toFixed(2)}`)
        .join('\n');
      return `${category}:\n${rendered}`;
    })
    .join('\n');

  const bundleLines = bundles
    .map((b) => {
      const contents = (b.items || [])
        .map((i) => `${i.quantity}x ${i.name}`)
        .join(', ') || 'contents being finalised';
      const desc = (b.description || '').replace(/\s+/g, ' ').slice(0, 200);
      return `  - bundle=${b.id} | ${b.title} | occasion=${b.category} | PHP ${Number(b.bundle_total).toFixed(2)} | contains: ${contents} | ${desc}`;
    })
    .join('\n');

  return [
    'AVAILABLE PRODUCTS (recommend ONLY these skus):',
    productLines || '  (none)',
    '',
    'AVAILABLE BUNDLES (recommend ONLY these bundle ids — always prefer a bundle when it fits the occasion):',
    bundleLines || '  (none)',
  ].join('\n');
}

// Turns the model's bare references into real cards. The model supplies only a
// sku/bundle id and its reasoning; every customer-visible fact — name, price,
// contents, destination URL — is read back out of the catalogue here. A
// hallucinated reference simply gets dropped rather than shown with invented
// details.
function resolveRecommendations(recommendations, catalog) {
  if (!Array.isArray(recommendations)) return [];

  const productBySku = new Map(catalog.products.map((p) => [String(p.sku), p]));
  const bundleById   = new Map(catalog.bundles.map((b) => [String(b.id), b]));

  const seen = new Set();
  const resolved = [];

  for (const rec of recommendations) {
    if (!rec || typeof rec.ref !== 'string') continue;
    const ref = rec.ref.trim();
    const key = `${rec.kind}:${ref}`;
    if (seen.has(key)) continue;

    if (rec.kind === 'bundle') {
      const bundle = bundleById.get(ref);
      if (!bundle) continue;
      seen.add(key);
      resolved.push({
        kind: 'bundle',
        id: bundle.id,
        title: bundle.title,
        category: bundle.category,
        price: Number(bundle.bundle_total),
        itemCount: (bundle.items || []).reduce((n, i) => n + i.quantity, 0),
        items: (bundle.items || []).map((i) => ({ name: i.name, quantity: i.quantity })),
        reason: String(rec.reason || '').slice(0, 200),
        // Pages/CustomerPOV/BundleDetails.js — customer-facing, with its own
        // order flow.
        url: CUSTOMER_BUNDLE_ROUTE(bundle.id),
      });
    } else if (rec.kind === 'product') {
      const product = productBySku.get(ref);
      if (!product) continue;
      seen.add(key);
      resolved.push({
        kind: 'product',
        sku: product.sku,
        name: product.name,
        price: Number(product.unit_price),
        category: product.storefront_category,
        reason: String(rec.reason || '').slice(0, 200),
        // MUST stay a customer-facing route. /product-details/:sku is the
        // EMPLOYEE inventory screen (it renders Sidebar + TopBar and is linked
        // only from Pages/Inventory) — never send a customer there. /order is
        // the customer order builder, which lists every available product.
        // This is the bare route; the widget appends `?add=<sku>` client-side
        // so the recommended item lands in the basket on arrival.
        url: CUSTOMER_PRODUCT_ROUTE,
      });
    }
  }

  // Bundles first: a bundle is one click to a page that can already place the
  // order, where loose products still need assembling in the cart.
  resolved.sort((a, b) => (a.kind === b.kind ? 0 : a.kind === 'bundle' ? -1 : 1));
  return resolved.slice(0, 4);
}

module.exports = {
  getCatalog,
  invalidateCatalogCache,
  renderCatalogForPrompt,
  resolveRecommendations,
};
