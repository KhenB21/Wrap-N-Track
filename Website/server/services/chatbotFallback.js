// Answers chatbot messages straight from the catalogue, with no AI call.
//
// Used in two places (routes/chatbot.js):
//   1. The preset buttons ("Wedding giveaways", …): instant, and they don't
//      spend any of the free Gemini quota.
//   2. When every Gemini model has failed: the customer still gets real
//      suggestions instead of an error.
//
// Returns the same shape Gemini does — { reply, recommendations[{kind, ref,
// reason}], suggested_replies } — so the route resolves the cards the same way.

// Bundle occasions (showcase_bundles.category) and the words that point to them.
// English plus common Filipino/Taglish terms.
const OCCASIONS = {
  wedding: {
    label: 'wedding',
    words: ['wedding', 'kasal', 'bride', 'groom', 'bridal', 'bridesmaid', 'ninang', 'ninong',
      'giveaway', 'giveaways', 'souvenir', 'souvenirs', 'engagement', 'reception', 'debut'],
  },
  corporate: {
    label: 'corporate',
    words: ['corporate', 'company', 'office', 'client', 'clients', 'employee', 'employees',
      'staff', 'team', 'business', 'partner', 'partners', 'conference', 'seminar', 'event'],
  },
  bespoke: {
    label: 'personal',
    words: ['birthday', 'bday', 'kaarawan', 'anniversary', 'bespoke', 'custom', 'personal',
      'mom', 'mother', 'nanay', 'dad', 'father', 'tatay', 'friend', 'girlfriend', 'boyfriend',
      'wife', 'husband', 'graduation', 'christmas', 'pasko', 'valentine', 'valentines', 'thank'],
  },
};

// Product groups (available_inventory.category) for "do you have candles?" style asks.
const PRODUCT_GROUPS = {
  beverages: ['coffee', 'tea', 'wine', 'drink', 'drinks', 'beverage', 'beverages', 'spirits', 'liquor'],
  food: ['food', 'sweets', 'chocolate', 'chocolates', 'cookies', 'snack', 'snacks', 'pantry', 'jam'],
  kitchenware: ['glass', 'glasses', 'mug', 'mugs', 'kitchen', 'kitchenware', 'plate', 'serving'],
  homeDecor: ['candle', 'candles', 'diffuser', 'scent', 'decor', 'home'],
  faceAndBody: ['soap', 'soaps', 'balm', 'bath', 'lotion', 'skincare', 'body'],
  clothing: ['robe', 'robes', 'headband', 'clothing', 'accessories', 'shirt'],
  packaging: ['box', 'boxes', 'packaging', 'wrap', 'wrapping', 'bag', 'bags', 'ribbon'],
};

const GROUP_LABELS = {
  beverages: 'beverage',
  food: 'food',
  kitchenware: 'kitchenware',
  homeDecor: 'home decor',
  faceAndBody: 'face & body',
  clothing: 'clothing & accessories',
  packaging: 'packaging',
};

// The preset buttons shown in both chat widgets (mobile ChatbotWidget.js and
// website GeminiChatbotWidget.js). Keep in sync with their GREETING.suggestions.
const PRESETS = {
  'wedding giveaways': 'wedding',
  'corporate gifts': 'corporate',
  'birthday gift wrap': 'bespoke',
};

const PRESET_BUTTONS = ['Wedding giveaways', 'Corporate gifts', 'Birthday gift wrap'];

const normalize = (text) => String(text || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
const wordsOf = (text) => new Set(normalize(text).split(' '));

function findOccasion(text) {
  const words = wordsOf(text);
  for (const [key, { words: keys }] of Object.entries(OCCASIONS)) {
    if (keys.some((w) => words.has(w))) return key;
  }
  return null;
}

function findProductGroup(text) {
  const words = wordsOf(text);
  for (const [group, keys] of Object.entries(PRODUCT_GROUPS)) {
    if (keys.some((w) => words.has(w))) return group;
  }
  return null;
}

/** The occasion key if `message` is exactly one of the preset buttons, else null. */
function matchPreset(message) {
  return PRESETS[normalize(message)] || null;
}

const bundleRec = (bundle, reason) => ({ kind: 'bundle', ref: String(bundle.id), reason });
const productRec = (product, reason) => ({ kind: 'product', ref: String(product.sku), reason });

/**
 * @param {object} args
 * @param {string} args.message
 * @param {Array}  args.history  [{ role, text }] — earlier customer messages help
 *                               when the latest one has no keyword ("a bundled one").
 * @param {object} args.catalog  { products, bundles } from getCatalog()
 * @param {'preset'|'offline'} args.mode
 */
function buildCatalogReply({ message, history = [], catalog, mode }) {
  const { products = [], bundles = [] } = catalog || {};
  const offline = mode === 'offline';

  // Latest message first, then earlier customer messages (newest first).
  const customerTexts = [
    message,
    ...history.filter((t) => t.role === 'user').map((t) => t.text).reverse(),
  ];
  const occasion = matchPreset(message) || customerTexts.map(findOccasion).find(Boolean) || null;
  const productGroup = findProductGroup(message);

  const note = offline
    ? "My smart suggestions are taking a short break, so here's what I can show you straight from our catalogue. "
    : '';
  const followUps = PRESET_BUTTONS.filter((b) => PRESETS[normalize(b)] !== occasion);

  // 1. They asked for a kind of product ("candles", "wine").
  if (productGroup && !matchPreset(message)) {
    const matches = products.filter((p) => p.storefront_category === productGroup).slice(0, 3);
    if (matches.length) {
      return {
        reply: `${note}Here are some of our ${GROUP_LABELS[productGroup]} picks. Tap a card to see the current price.`,
        recommendations: matches.map((p) => productRec(p, 'Matches what you asked about.')),
        suggested_replies: ['Show me bundles', ...followUps].slice(0, 3),
      };
    }
  }

  // 2. We know the occasion: lead with ready-made bundles for it.
  if (occasion) {
    const label = OCCASIONS[occasion].label;
    const occasionBundles = bundles.filter((b) => b.category === occasion).slice(0, 2);
    if (occasionBundles.length) {
      return {
        reply: `${note}Here ${occasionBundles.length === 1 ? 'is our' : 'are our'} ${label} ${occasionBundles.length === 1 ? 'bundle' : 'bundles'} — a ready-made set you can order in one go. Tap a card to see what's inside and the current price.`,
        recommendations: occasionBundles.map((b) => bundleRec(b, `A ready-made ${label} set, so you don't have to pick items one by one.`)),
        suggested_replies: ['What else do you have?', ...followUps].slice(0, 3),
      };
    }
    // No bundle for it: suggest packaging to build their own.
    const packaging = products.filter((p) => p.storefront_category === 'packaging').slice(0, 3);
    if (packaging.length) {
      return {
        reply: `${note}We don't have a ready-made ${label} bundle right now, but you can build your own starting with one of these boxes. Tap a card to see the current price.`,
        recommendations: packaging.map((p) => productRec(p, 'A good base to build your own gift set.')),
        suggested_replies: followUps.slice(0, 3),
      };
    }
  }

  // 3. Nothing to go on: show one bundle per occasion and ask what it's for.
  const sampler = Object.keys(OCCASIONS)
    .map((key) => bundles.find((b) => b.category === key))
    .filter(Boolean)
    .slice(0, 3);
  if (sampler.length) {
    return {
      reply: `${note}What's the occasion? Meanwhile, here are a few of our ready-made bundles to give you ideas.`,
      recommendations: sampler.map((b) => bundleRec(b, `One of our ready-made ${OCCASIONS[b.category].label} sets.`)),
      suggested_replies: PRESET_BUTTONS,
    };
  }

  return {
    reply: `${note}What's the occasion — a wedding, a corporate event, or a personal gift? Tell me and I'll point you to the right items.`,
    recommendations: [],
    suggested_replies: PRESET_BUTTONS,
  };
}

module.exports = { buildCatalogReply, matchPreset, PRESET_BUTTONS };
