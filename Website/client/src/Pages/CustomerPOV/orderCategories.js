/* ===========================================================================
   Shared category vocabulary for the customer order builder.

   Two different things are called a "category" in this app:

     • The raw `category` column on an inventory row, which is free-form and
       has accumulated dozens of spellings over time ("bath & body", "barware",
       "Men's Clothing"…).
     • The nine buckets the order page groups products under.

   mapInventoryCategory() collapses the first into the second. Extracted from
   OrderProcess.js when that wizard was replaced by OrderBoutique.js, so the
   mapping survives in one place rather than living inside a page component.
   =========================================================================== */

export const PACKAGING_KEY = 'packaging';

// Order of the sections on the page and of the tabs in the staff picker.
export const CATEGORIES = [
  { key: 'packaging',     label: 'Packaging',              blurb: 'The box itself — start here.' },
  { key: 'beverages',     label: 'Beverages',              blurb: 'Coffee, tea, wine and spirits.' },
  { key: 'food',          label: 'Food',                   blurb: 'Sweets, preserves and pantry treats.' },
  { key: 'kitchenware',   label: 'Kitchenware',            blurb: 'Glassware and serving pieces.' },
  { key: 'homeDecor',     label: 'Home Decor',             blurb: 'Candles, diffusers and room scents.' },
  { key: 'faceAndBody',   label: 'Face & Body',            blurb: 'Soaps, balms and bath rituals.' },
  { key: 'clothing',      label: 'Clothing & Accessories', blurb: 'Robes, headbands and keepsakes.' },
  { key: 'customization', label: 'Customization',          blurb: 'Engraving, ribbons and personal touches.' },
  { key: 'others',        label: 'Others',                 blurb: 'Everything else in the collection.' },
];

export const CATEGORY_KEYS = CATEGORIES.map((c) => c.key);

export const emptyAvailability = () =>
  CATEGORY_KEYS.reduce((acc, key) => ({ ...acc, [key]: [] }), {});

const CATEGORY_MAP = {
  // Packaging
  'packaging': 'packaging',

  // Beverages
  'beverage': 'beverages',
  'beverages': 'beverages',

  // Food
  'food': 'food',
  'fresh produce': 'food',
  'snacks': 'food',
  'canned goods': 'food',
  'bakery': 'food',
  'dairy & eggs': 'food',
  'meat & seafood': 'food',
  'frozen foods': 'food',
  'international foods': 'food',
  'organic & natural': 'food',

  // Kitchenware
  'kitchen': 'kitchenware',
  'kitchenware': 'kitchenware',
  'cookware': 'kitchenware',
  'tableware': 'kitchenware',
  'barware': 'kitchenware',

  // Home decor
  'home': 'homeDecor',
  'decor': 'homeDecor',
  'homedecor': 'homeDecor',
  'home decor': 'homeDecor',
  'home appliances': 'homeDecor',
  'lighting': 'homeDecor',
  'wall art': 'homeDecor',
  'rugs & carpets': 'homeDecor',
  'curtains & blinds': 'homeDecor',
  'bedding': 'homeDecor',
  'office furniture': 'homeDecor',

  // Face & body
  'face': 'faceAndBody',
  'body': 'faceAndBody',
  'faceandbody': 'faceAndBody',
  'face & body': 'faceAndBody',
  'cosmetics': 'faceAndBody',
  'beauty & personal care': 'faceAndBody',
  'health & wellness': 'faceAndBody',
  'perfume & fragrances': 'faceAndBody',
  'hair care': 'faceAndBody',
  'skincare': 'faceAndBody',
  'bath & body': 'faceAndBody',
  'health devices': 'faceAndBody',
  'supplements': 'faceAndBody',
  'vitamins': 'faceAndBody',
  'first aid': 'faceAndBody',
  'personal safety': 'faceAndBody',
  'baby care': 'faceAndBody',
  'maternity': 'faceAndBody',

  // Clothing & accessories
  'clothing': 'clothing',
  'accessories': 'clothing',
  'clothing & accessories': 'clothing',
  "men's clothing": 'clothing',
  "women's clothing": 'clothing',
  "kids' clothing": 'clothing',
  'shoes': 'clothing',
  'accessories (bags, wallets)': 'clothing',
  'jewelry': 'clothing',
  'watches': 'clothing',
  'underwear & sleepwear': 'clothing',
  'activewear': 'clothing',
  'formal wear': 'clothing',
  'jewelry & accessories': 'clothing',
  'watches & wearables': 'clothing',
  'bags & luggage': 'clothing',
  'eyewear': 'clothing',

  // Customization
  'custom': 'customization',
  'customization': 'customization',
  'seasonal': 'customization',
  'gift items': 'customization',
  'souvenirs': 'customization',
  'party supplies': 'customization',

  // Stationery reads as packaging for gifting purposes
  'office supplies': 'packaging',
  'stationery': 'packaging',
  'art supplies': 'packaging',
  'school supplies': 'packaging',

  // Everything else
  'electronics': 'others',
  'toys & games': 'others',
  'sports & outdoors': 'others',
  'automotive': 'others',
  'pet supplies': 'others',
  'pet food': 'others',
  'pet accessories': 'others',
  'gaming consoles': 'others',
  'books': 'others',
  'music': 'others',
  'movies & tv': 'others',
  'others': 'others',
};

// Unrecognised spellings fall into "Others" rather than vanishing — staff can
// still find and publish the product from that tab.
export const mapInventoryCategory = (category) =>
  CATEGORY_MAP[String(category || '').toLowerCase().trim()] || 'others';
