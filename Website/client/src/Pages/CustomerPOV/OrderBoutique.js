import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import TopbarCustomer from '../../Components/TopbarCustomer';
import EmployeeStatusBanner from '../../Components/EmployeeStatusBanner';
import { useAuth } from '../../Context/AuthContext';
import api from '../../api';
import {
  CATEGORIES,
  PACKAGING_KEY,
  emptyAvailability,
  mapInventoryCategory,
} from './orderCategories';
import './OrderBoutique.css';

/* ===========================================================================
   Order Boutique — the customer-facing gift-box builder at /order
   ---------------------------------------------------------------------------
   Replaces Pages/CustomerPOV/OrderProcess.js (deleted), which walked customers
   through five wizard steps and hid most of the catalogue behind category tabs.
   Here every available product is on one page, grouped under category headings,
   with a persistent basket; only the order details (dates, box count, remarks)
   move into a modal at checkout.

   Server contract is unchanged from the wizard — same /api/inventory,
   /api/available-inventory, /api/otp/* and /api/orders calls, same order
   payload — so nothing downstream had to change when this took over the route.

   Order rules: exactly one box (Packaging is single-select) and at least one
   item inside it. See `readiness`, which gates the basket CTA, the mobile dock
   and the submit handler from one place.

   Staff with a role in STAFF_ROLES also get the "Manage available products"
   picker here, which writes /api/available-inventory — the wizard's staff panel
   moved onto this page rather than being left behind on a dead route.

   One deliberate behavioural difference from the wizard: it let a chosen
   "style" silently REPLACE whatever the customer had hand-picked when building
   productsForOrder. Here the basket is always the source of truth and the style
   is recorded as a label only (package_name).
   =========================================================================== */

const STYLE_OPTIONS = [
  'Modern Romantic',
  'Bohemian Chic',
  'Classic Elegance',
  'Minimalist Modern',
  'Others',
];

// "Others" means the customer wants something outside the four house styles.
// There is no free-text field for it on purpose — the details are worked out
// with a stylist, so choosing it promises a follow-up instead of asking the
// customer to specify a look in a textarea.
const STYLE_OTHERS = 'Others';
const STYLE_OTHERS_NOTICE =
  'One of our staff will coordinate with you about the styling and the other details of your order.';

// Order rules: a gift box has exactly one container and cannot go out empty.
// PACKAGING_KEY (from ./orderCategories) is therefore single-select — choosing
// a second box swaps out the first rather than adding to it — and at least one
// non-packaging item is required before checkout opens.

const MIN_LEAD_DAYS = 14;          // hard block below this
const RECOMMENDED_LEAD_DAYS = 21;  // soft warning between MIN and this
const STAFF_ROLES = ['admin', 'business_developer', 'creatives', 'sales_manager'];

// Product photos come from the binary endpoint rather than the base64 blobs the
// list response can carry: it is ~25% smaller on the wire, is cached for a day
// (Cache-Control on the route), and — with loading="lazy" — is only ever
// requested for cards the customer actually scrolls to. This page asks
// /api/inventory for the slim payload (`?images=none`) so those blobs are not
// serialised, transferred and held in memory for every product at once.
//
// The `v` token is the product's last-updated timestamp. With a 24h
// Cache-Control that token is what makes the cache correct rather than merely
// fast: without it, replacing a product photo leaves customers looking at the
// old one for a day — and any browser that cached a failed response keeps
// serving that failure just as long.
const imageUrlFor = (sku, version) => {
  const base = `${api.defaults.baseURL}/api/inventory/${encodeURIComponent(sku)}/image`;
  return version ? `${base}?v=${encodeURIComponent(version)}` : base;
};

const peso = (value) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(Number(value) || 0);

/* ── Icons (inline, so the page adds no icon dependency) ─────────────────── */
const IconSparkle = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
    <path d="M12 2l1.9 5.7L19.6 9.6l-5.7 1.9L12 17.2l-1.9-5.7L4.4 9.6l5.7-1.9L12 2zM19 15l.9 2.6 2.6.9-2.6.9-.9 2.6-.9-2.6-2.6-.9 2.6-.9L19 15z" />
  </svg>
);
const IconBasket = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
    <path d="M5 8h14l-1.2 11a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8L5 8z" />
    <path d="M9 8V6a3 3 0 0 1 6 0v2" />
  </svg>
);
const IconClose = (props) => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" {...props}>
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
const IconTools = (props) => (
  <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
    <path d="M14.7 6.3a4 4 0 0 0 5.3 5.2l-8 8a2.8 2.8 0 0 1-4-4l8-8z" />
    <path d="M6 18h.01" />
  </svg>
);
const IconAlert = (props) => (
  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" {...props}>
    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

const IconNoImage = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <path d="M21 15l-5-5L5 21" />
    <line x1="3" y1="3" x2="21" y2="21" />
  </svg>
);

/* ── Product image ────────────────────────────────────────────────────────
   Three states, and the failure state costs nothing: a product with no photo
   (the endpoint 404s) or a request that errors renders a drawn placeholder
   rather than chasing a fallback file. The previous fallback pointed at
   /Assets/Images/Products/placeholder.png, which does not exist — so every
   missing photo spent a request to earn a broken-image icon. */
function ProductImage({ sku, version, alt, className = '', eager = false }) {
  const [status, setStatus] = useState('loading');   // loading | ok | failed

  // A different product in the same slot must start its own load.
  useEffect(() => { setStatus('loading'); }, [sku, version]);

  if (status === 'failed') {
    return (
      <div className={`ob-img ob-img-empty ${className}`} role="img" aria-label={`${alt} — no photo available`}>
        <IconNoImage />
        <span>No image available</span>
      </div>
    );
  }

  return (
    <div className={`ob-img ${className}`}>
      {status === 'loading' && <span className="ob-img-loading" aria-hidden="true" />}
      <img
        src={imageUrlFor(sku, version)}
        alt={alt}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        draggable="false"
        onLoad={() => setStatus('ok')}
        onError={() => setStatus('failed')}
        style={status === 'ok' ? undefined : { opacity: 0 }}
      />
    </div>
  );
}

/* ── Scroll-reveal ────────────────────────────────────────────────────────
   Adds `is-in` as elements enter the viewport. Skipped entirely when the
   viewer asks for reduced motion — the CSS already renders the final state,
   so there is nothing to animate and no observer worth paying for. */
function useScrollReveal(deps) {
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return undefined;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;

    const nodes = document.querySelectorAll('.ob-reveal:not(.is-in)');
    if (!nodes.length) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-in');
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.05 }
    );

    nodes.forEach((n) => observer.observe(n));
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/* ── Modal shell ──────────────────────────────────────────────────────────
   Escape to close, background scroll lock, focus moved in on open and
   returned to the trigger on close, and Tab cycled within the dialog. */
function Modal({ onClose, children, size = '', labelledBy, dismissable = true }) {
  const panelRef = useRef(null);
  const restoreRef = useRef(null);

  useEffect(() => {
    restoreRef.current = document.activeElement;
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    const first = panelRef.current?.querySelector(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    (first || panelRef.current)?.focus();

    const onKey = (e) => {
      if (e.key === 'Escape' && dismissable) {
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !panelRef.current) return;

      const focusables = Array.from(
        panelRef.current.querySelectorAll(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => el.offsetParent !== null);
      if (!focusables.length) return;

      const firstEl = focusables[0];
      const lastEl = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    };

    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      if (restoreRef.current instanceof HTMLElement) restoreRef.current.focus();
    };
  }, [onClose, dismissable]);

  return (
    <div
      className="ob-overlay"
      onMouseDown={(e) => {
        if (dismissable && e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`ob-modal ${size}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        ref={panelRef}
        tabIndex={-1}
      >
        {children}
      </div>
    </div>
  );
}

/* ── Product card ─────────────────────────────────────────────────────────
   The whole card opens the detail modal; the basket button stops propagation
   so adding never also opens details. */
function ProductCard({ product, categoryLabel, inBasket, suggested, index, singleChoice, onOpen, onToggle }) {
  const openDetails = () => onOpen(product);

  return (
    /* The reveal class lives on this wrapper, not on the card itself. The
       observer adds `is-in` imperatively with classList.add, and React rewrites
       an element's className attribute whenever the prop value changes — so
       putting both on one element meant adding an item to the basket (which
       appends `is-selected`) silently stripped `is-in` and faded the card back
       to opacity 0, permanently, since the observer had already unobserved it.
       This wrapper's className never changes, so React leaves it alone. */
    <div className="ob-card-wrap ob-reveal" style={{ '--i': index % 8 }}>
      <article
        className={`ob-card${inBasket ? ' is-selected' : ''}${suggested ? ' is-suggested' : ''}`}
        id={`ob-card-${product.sku}`}
        role="button"
        tabIndex={0}
        aria-label={`${product.name}. ${peso(product.price)}. Open details.`}
        onClick={openDetails}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openDetails();
          }
        }}
      >
        <div className="ob-card-media">
          <ProductImage
            sku={product.sku}
            version={product.imageVersion}
            alt={product.description ? `${product.name} — ${product.description}` : product.name}
          />
          <span className="ob-card-tag">{categoryLabel}</span>
          {inBasket && <span className="ob-card-check" aria-hidden="true">✓</span>}
          {suggested && (
            <span className="ob-badge-ai">
              <IconSparkle /> Assistant pick
            </span>
          )}
        </div>

        <div className="ob-card-body">
          <h3 className="ob-card-name">{product.name}</h3>
          <p className="ob-card-desc">{product.description || 'Tap for full details.'}</p>

          <div className="ob-card-foot">
            <span className="ob-price">
              {peso(product.price)}
              <span className="ob-card-hint">per box</span>
            </span>
            <button
              type="button"
              className={`ob-add${inBasket ? ' is-in' : ''}`}
              aria-pressed={inBasket}
              onClick={(e) => {
                e.stopPropagation();   // never open details from the basket button
                onToggle(product);
              }}
            >
              {inBasket ? 'Remove' : singleChoice ? 'Choose this box' : 'Add to basket'}
            </button>
          </div>
        </div>
      </article>
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────────────────────── */
export default function OrderBoutique() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Catalogue
  const [inventoryProducts, setInventoryProducts] = useState([]);
  const [availableSkus, setAvailableSkus] = useState({});
  const [catalogueLoading, setCatalogueLoading] = useState(true);

  // Basket — a Map of sku -> product, so ordering is stable and lookups cheap
  const [basket, setBasket] = useState(() => new Map());
  const [suggestedSkus, setSuggestedSkus] = useState([]);
  const [suggestBannerOpen, setSuggestBannerOpen] = useState(false);

  // Order details
  const [formData, setFormData] = useState({
    weddingDate: '',
    expectedDeliveryDate: '',
    guestCount: '',
    style: '',
    specialRequests: '',
  });
  const [dateErrors, setDateErrors] = useState({ weddingDate: '', expectedDeliveryDate: '' });
  const [dateWarning, setDateWarning] = useState('');

  // UI
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0].key);
  const [detailProduct, setDetailProduct] = useState(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // OTP
  const [otpModalVisible, setOtpModalVisible] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState('');
  const [resendAvailableAt, setResendAvailableAt] = useState(null);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [pendingOrderPayload, setPendingOrderPayload] = useState(null);
  const [postOrderNotice, setPostOrderNotice] = useState(false);
  const resendTimerRef = useRef(null);

  // Staff: which inventory products are published to customers
  const [staffPickerOpen, setStaffPickerOpen] = useState(false);
  const [staffCategory, setStaffCategory] = useState(CATEGORIES[0].key);
  const [staffDraft, setStaffDraft] = useState(null);   // null until the picker opens
  const [staffSaving, setStaffSaving] = useState(false);

  // Address
  const [addressModalVisible, setAddressModalVisible] = useState(false);
  const [addressInput, setAddressInput] = useState('');
  const [addressError, setAddressError] = useState('');
  const [addressSaving, setAddressSaving] = useState(false);
  const [pendingOrderContext, setPendingOrderContext] = useState(null);

  const isStaff = Boolean(user && STAFF_ROLES.includes(user.role));

  // Narrow viewports get a fixed basket dock along the bottom, exactly where
  // the assistant launcher lives. Flag the body so OrderBoutique.css can lift
  // the launcher clear for as long as this page is mounted, and only then.
  useEffect(() => {
    document.body.classList.add('ob-has-dock');
    return () => document.body.classList.remove('ob-has-dock');
  }, []);

  /* ── Load the catalogue ─────────────────────────────────────────────── */
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const [invRes, availRes] = await Promise.all([
          // Slim payload: this page never reads image_data, it loads each photo
          // from /api/inventory/:sku/image on demand.
          api.get('/api/inventory', { params: { images: 'none' } }),
          api.get('/api/available-inventory'),
        ]);
        if (cancelled) return;

        setInventoryProducts(invRes.data?.inventory || invRes.data || []);

        const available = availRes.data?.available || {};
        const skus = emptyAvailability();
        CATEGORIES.forEach(({ key }) => {
          skus[key] = (available[key] || []).map((p) => p.sku);
        });
        setAvailableSkus(skus);
      } catch (err) {
        if (cancelled) return;
        console.error('Failed to load the product catalogue', err);
        toast.error('We could not load the catalogue just now. Please refresh.');
      } finally {
        if (!cancelled) setCatalogueLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, []);

  /* ── Shape the catalogue into per-category product lists ────────────── */
  const catalogue = useMemo(() => {
    const bySku = new Map(inventoryProducts.map((p) => [String(p.sku), p]));

    return CATEGORIES.map((cat) => ({
      ...cat,
      products: (availableSkus[cat.key] || [])
        .map((sku) => {
          const product = bySku.get(String(sku));
          if (!product) return null;
          return {
            id: product.id,
            sku: product.sku,
            name: product.name,
            description: product.description || '',
            // The inventory table's column is unit_price — OrderProcess.js read
            // `product.price`, which is always undefined, but it never showed a
            // price so the bug stayed invisible. This page displays it, so take
            // the real column and keep the others as fallbacks.
            price: product.unit_price ?? product.price ?? product.selling_price ?? 0,
            // Cache key for the product photo — see imageUrlFor.
            imageVersion: product.updated_at || product.last_updated || null,
            categoryKey: cat.key,
            categoryLabel: cat.label,
          };
        })
        .filter(Boolean),
    }));
  }, [inventoryProducts, availableSkus]);

  const visibleCategories = useMemo(
    () => catalogue.filter((c) => c.products.length > 0),
    [catalogue]
  );

  const totalProducts = useMemo(
    () => visibleCategories.reduce((n, c) => n + c.products.length, 0),
    [visibleCategories]
  );

  useScrollReveal([totalProducts, catalogueLoading]);

  /* ── Chatbot hand-off ────────────────────────────────────────────────
     The assistant already resolves each recommendation to a real SKU
     (server/services/chatbotContext.js), so linking it here costs no extra
     model tokens — it is a query string, not another Gemini call.
     /order-new?add=SKU1,SKU2 drops those items straight into the basket and
     flags them so the customer can see what was chosen for them. */
  useEffect(() => {
    const raw = searchParams.get('add');
    if (!raw || !totalProducts) return;

    const wanted = raw.split(',').map((s) => s.trim()).filter(Boolean);
    if (!wanted.length) return;

    const allProducts = visibleCategories.flatMap((c) => c.products);
    const matched = wanted
      .map((sku) => allProducts.find((p) => String(p.sku) === sku))
      .filter(Boolean);

    if (matched.length) {
      setBasket((prev) => {
        const next = new Map(prev);
        matched.forEach((p) => {
          // The assistant can suggest more than one box; the one-box rule still
          // applies, so the last one named wins rather than all of them landing.
          if (p.categoryKey === PACKAGING_KEY) {
            for (const [sku, item] of next) {
              if (item.categoryKey === PACKAGING_KEY) next.delete(sku);
            }
          }
          next.set(String(p.sku), p);
        });
        return next;
      });
      setSuggestedSkus(matched.map((p) => String(p.sku)));
      setSuggestBannerOpen(true);

      // Let the section render before scrolling to the first suggestion.
      window.setTimeout(() => {
        const el = document.getElementById(`ob-card-${matched[0].sku}`);
        el?.scrollIntoView({
          behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
          block: 'center',
        });
      }, 320);
    } else {
      toast.info('That suggestion is not in the current collection — browse the categories below.');
    }

    // Consume the parameter so a refresh does not re-add the items.
    const next = new URLSearchParams(searchParams);
    next.delete('add');
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, totalProducts]);

  /* ── Category rail scroll-spy ────────────────────────────────────────── */
  useEffect(() => {
    if (!visibleCategories.length || typeof IntersectionObserver === 'undefined') return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        const inView = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (inView) setActiveCategory(inView.target.dataset.category);
      },
      { rootMargin: '-25% 0px -65% 0px', threshold: 0 }
    );

    visibleCategories.forEach((c) => {
      const el = document.getElementById(`ob-section-${c.key}`);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [visibleCategories]);

  /* ── Basket ──────────────────────────────────────────────────────────── */
  const basketItems = useMemo(() => Array.from(basket.values()), [basket]);

  const toggleItem = useCallback((product) => {
    const key = String(product.sku);

    if (basket.has(key)) {
      setBasket((prev) => {
        const next = new Map(prev);
        next.delete(key);
        return next;
      });
      return;
    }

    // One box per order: adding a second container replaces the first instead
    // of stacking, so the basket can never describe two boxes. The swap is
    // worked out here rather than inside the updater — React may run an updater
    // during the render phase, and firing a toast from there warns about
    // updating one component while rendering another.
    const isBox = product.categoryKey === PACKAGING_KEY;
    const replaced = isBox
      ? [...basket.values()].find((item) => item.categoryKey === PACKAGING_KEY) || null
      : null;

    setBasket((prev) => {
      const next = new Map(prev);
      if (isBox) {
        for (const [sku, item] of next) {
          if (item.categoryKey === PACKAGING_KEY) next.delete(sku);
        }
      }
      next.set(key, product);
      return next;
    });

    if (replaced) toast.info(`Swapped ${replaced.name} for ${product.name} — one box per order.`);
  }, [basket]);

  const removeItem = useCallback((sku) => {
    setBasket((prev) => {
      const next = new Map(prev);
      next.delete(String(sku));
      return next;
    });
  }, []);

  const guestQty = Math.max(1, parseInt(formData.guestCount, 10) || 1);
  const perBoxTotal = basketItems.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
  const estimatedTotal = perBoxTotal * guestQty;

  const chosenBox = basketItems.find((i) => i.categoryKey === PACKAGING_KEY) || null;
  const contentCount = basketItems.filter((i) => i.categoryKey !== PACKAGING_KEY).length;

  // A single source of truth for "can this order be placed?", so the basket
  // CTA, the mobile dock and the submit handler can never disagree about it.
  const readiness = useMemo(() => {
    if (!chosenBox) return { ok: false, reason: 'Choose a box to continue', detail: 'Every order starts with one box from Packaging.' };
    if (contentCount < 1) return { ok: false, reason: 'Add at least one item', detail: 'Your box needs at least one thing inside it.' };
    return { ok: true, reason: 'Continue to order details', detail: '' };
  }, [chosenBox, contentCount]);

  /* ── Date validation (same rules as the wizard) ──────────────────────── */
  const validateOrderDates = useCallback((weddingDateStr, deliveryDateStr) => {
    const errors = { weddingDate: '', expectedDeliveryDate: '' };
    let warning = '';

    const MS_PER_DAY = 24 * 60 * 60 * 1000;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let daysToWedding = null;
    if (weddingDateStr) {
      const wedding = new Date(`${weddingDateStr}T00:00:00`);
      daysToWedding = Math.round((wedding - today) / MS_PER_DAY);
      if (daysToWedding < 0) {
        errors.weddingDate = 'The wedding date cannot be in the past.';
      } else if (daysToWedding < MIN_LEAD_DAYS) {
        errors.weddingDate = `We need at least ${MIN_LEAD_DAYS} days to prepare. Please choose a later date.`;
      } else if (daysToWedding < RECOMMENDED_LEAD_DAYS) {
        warning = `${daysToWedding} days is tight — ${RECOMMENDED_LEAD_DAYS} days or more gives us room for customisation.`;
      }
    }

    if (deliveryDateStr) {
      const delivery = new Date(`${deliveryDateStr}T00:00:00`);
      const daysToDelivery = Math.round((delivery - today) / MS_PER_DAY);
      if (daysToDelivery < 0) {
        errors.expectedDeliveryDate = 'The delivery date cannot be in the past.';
      } else if (weddingDateStr && !errors.weddingDate) {
        const wedding = new Date(`${weddingDateStr}T00:00:00`);
        if (delivery > wedding) {
          errors.expectedDeliveryDate = 'Delivery must be on or before the wedding date.';
        }
      }
    }

    return { errors, warning };
  }, []);

  const handleFieldChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };
      if (name === 'weddingDate' || name === 'expectedDeliveryDate') {
        const { errors, warning } = validateOrderDates(updated.weddingDate, updated.expectedDeliveryDate);
        setDateErrors(errors);
        setDateWarning(warning);
      }
      return updated;
    });
  };

  /* ── OTP helpers ─────────────────────────────────────────────────────── */
  const sendOtp = useCallback(async (email) => {
    if (!email) {
      setOtpError('Missing email for OTP. Please update your profile.');
      throw new Error('Email missing');
    }
    try {
      const resp = await api.post('/api/otp/send-otp', { email });
      setResendAvailableAt(Date.now() + 30000);
      setResendCountdown(30);
      if (resendTimerRef.current) clearInterval(resendTimerRef.current);
      resendTimerRef.current = setInterval(() => {
        setResendCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(resendTimerRef.current);
            resendTimerRef.current = null;
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      setOtpError('');
      return resp.data;
    } catch (err) {
      const status = err.response?.status;
      const message = err.response?.data?.message;
      if (status === 429) setOtpError(message || 'Please wait before requesting another code.');
      else if (status === 400) setOtpError(message || 'Unable to send the code. Please check your email.');
      else setOtpError('Server error while sending the code. Please try again later.');
      throw err;
    }
  }, []);

  useEffect(() => () => {
    if (resendTimerRef.current) clearInterval(resendTimerRef.current);
  }, []);

  /* ── Order placement ─────────────────────────────────────────────────── */
  const submitOrder = useCallback(async (orderPayload, token, { onError } = {}) => {
    try {
      const response = await api.post('/api/orders', orderPayload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.data) return;

      // Mirror the order into the cart so it shows on the cart page. A failure
      // here must not fail the order itself.
      if (Array.isArray(orderPayload.products)) {
        try {
          for (const product of orderPayload.products) {
            if (product.sku && product.quantity) {
              await api.post(
                '/api/cart/add',
                { sku: product.sku, quantity: product.quantity },
                { headers: { Authorization: `Bearer ${token}` } }
              );
            }
          }
        } catch (cartErr) {
          console.warn('[ORDER] Could not mirror items into the cart:', cartErr);
        }
      }

      toast.success('Order placed successfully');
      setOtpModalVisible(false);
      setOtpCode('');
      setPendingOrderPayload(null);

      // A customer who chose "Others" for styling is owed a heads-up that a
      // stylist will reach out. A toast cannot carry it — the redirect below is
      // a full page load and would wipe it — so hold the redirect until they
      // acknowledge the message. package_name is where the style is recorded.
      if (orderPayload.package_name === STYLE_OTHERS) {
        setPostOrderNotice(true);
        return;
      }

      setTimeout(() => { window.location.href = '/customer-cart'; }, 1000);
    } catch (orderErr) {
      const status = orderErr.response?.status;
      const backendMessage = orderErr.response?.data?.error || orderErr.response?.data?.message;
      const message =
        status === 400 ? (backendMessage || 'Order data invalid. Please review your selections.')
        : status === 401 ? 'Authorisation failed. Please log in again.'
        : 'Server error placing the order. Please try again.';
      if (onError) onError(message);
      else toast.error(message);
    }
  }, []);

  const proceedWithOrder = useCallback(
    async (customerData, token, productsForOrder, quantity) => {
      const orderPayload = {
        name: customerData.name || 'Customer Order',
        account_name: customerData.name || 'Customer Account',
        order_date: new Date().toISOString().split('T')[0],
        expected_delivery: formData.expectedDeliveryDate,
        status: 'Pending',
        payment_type: 'Pending',
        payment_method: 'Pending',
        shipped_to: customerData.name || 'Customer',
        shipping_address: customerData.address,
        total_cost: 0,
        remarks: formData.specialRequests || '',
        telephone: customerData.telephone || customerData.phone_number || 'N/A',
        cellphone: customerData.cellphone || customerData.phone_number || 'N/A',
        email_address: customerData.email,
        order_quantity: quantity,
        // A style is a label on a hand-picked basket here, never a substitute
        // for it — unlike the wizard, which swapped the customer's choices out.
        package_name: formData.style || 'Handpick',
        products: productsForOrder,
      };

      if (customerData.is_verified) {
        await submitOrder(orderPayload, token);
        return;
      }

      setPendingOrderPayload(orderPayload);
      setOtpError('');
      setCheckoutOpen(false);
      setOtpModalVisible(true);

      if (!customerData.email) {
        setOtpError('No email on this account. Please update your profile.');
      } else {
        try {
          await sendOtp(customerData.email);
          toast.info('We sent a confirmation code to your email.');
        } catch {
          setOtpError('Failed to send the code. Use Resend, or check your email.');
        }
      }
    },
    [formData.expectedDeliveryDate, formData.specialRequests, formData.style, sendOtp, submitOrder]
  );

  const handlePlaceOrder = async (e) => {
    e.preventDefault();

    const { errors, warning } = validateOrderDates(formData.weddingDate, formData.expectedDeliveryDate);
    setDateErrors(errors);
    setDateWarning(warning);

    if (!formData.weddingDate) {
      setDateErrors((prev) => ({ ...prev, weddingDate: 'Please choose your wedding date.' }));
      return;
    }
    if (!formData.expectedDeliveryDate) {
      setDateErrors((prev) => ({ ...prev, expectedDeliveryDate: 'Please choose a delivery date.' }));
      return;
    }
    if (errors.weddingDate || errors.expectedDeliveryDate) return;

    const quantity = parseInt(formData.guestCount, 10);
    if (!quantity || quantity < 1) {
      toast.error('Please enter how many boxes you need.');
      return;
    }

    const token = localStorage.getItem('customerToken');
    let customerData = null;
    try {
      customerData = JSON.parse(localStorage.getItem('customer'));
    } catch {
      customerData = null;
    }

    if (!token || !customerData) {
      toast.error('Please log in to place your order.');
      navigate('/customer-login');
      return;
    }

    // Re-check the composition rules here too: the CTA is disabled when they
    // are unmet, but the basket can change while this modal is open.
    if (!readiness.ok) {
      toast.error(readiness.detail || readiness.reason);
      setCheckoutOpen(false);
      return;
    }

    const productsForOrder = basketItems
      .filter((item) => item.sku)
      .map((item) => ({ name: item.name, quantity, sku: item.sku }));

    if (!productsForOrder.length) {
      toast.error('Your basket is empty. Add a few items first.');
      return;
    }

    setLoading(true);
    try {
      // An address is required to ship — pause and collect one if missing.
      if (!customerData.address || !customerData.address.trim()) {
        setPendingOrderContext({ productsForOrder, quantity });
        setAddressError('');
        setAddressInput('');
        setCheckoutOpen(false);
        setAddressModalVisible(true);
        return;
      }
      await proceedWithOrder(customerData, token, productsForOrder, quantity);
    } catch (error) {
      console.error('Error submitting order:', error);
      if (error.response && (error.response.status === 401 || error.response.status === 403)) {
        localStorage.removeItem('customerToken');
        localStorage.removeItem('customer');
        toast.error('Please log in again.');
        navigate('/customer-login');
      } else {
        toast.error(`Failed to submit the order: ${error.response?.data?.message || error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    let customerData = {};
    try { customerData = JSON.parse(localStorage.getItem('customer')) || {}; } catch { /* ignore */ }
    if (!customerData.email) return;
    if (resendAvailableAt && Date.now() < resendAvailableAt) return;
    try {
      await sendOtp(customerData.email);
      toast.info('Code resent to your email.');
    } catch {
      toast.error('Failed to resend the code. Please try again later.');
    }
  };

  const handleVerifyAndPlaceOrder = async () => {
    setOtpError('');
    const token = localStorage.getItem('customerToken');
    let customerData = {};
    try { customerData = JSON.parse(localStorage.getItem('customer')) || {}; } catch { /* ignore */ }

    if (!pendingOrderPayload) { setOtpError('No pending order found.'); return; }
    if (!otpCode || otpCode.trim().length < 6) { setOtpError('Please enter the 6-digit code.'); return; }
    if (!token) { setOtpError('Session expired. Please log in again.'); return; }

    try {
      await api.post('/api/otp/verify-otp', { email: customerData.email, code: otpCode.trim() });
    } catch (err) {
      const status = err.response?.status;
      const message = err.response?.data?.message;
      if (status === 400) setOtpError(message || 'Invalid or expired code.');
      else if (status === 429) setOtpError(message || 'Too many attempts. Request a new code.');
      else setOtpError('Server error verifying the code.');
      return;
    }

    // The code proved the customer controls this email — remember that so
    // future orders skip the step.
    try {
      await api.put('/api/customer/mark-verified', {}, { headers: { Authorization: `Bearer ${token}` } });
      localStorage.setItem('customer', JSON.stringify({ ...customerData, is_verified: true }));
    } catch (markErr) {
      console.warn('[ORDER] Could not persist verified status (order still proceeds):', markErr);
    }

    await submitOrder(pendingOrderPayload, token, { onError: setOtpError });
  };

  const handleSaveAddressAndContinue = async () => {
    setAddressError('');
    if (!addressInput.trim()) {
      setAddressError('Please enter your address.');
      return;
    }
    if (!pendingOrderContext) {
      setAddressError('Your order details were lost — please try again.');
      return;
    }

    const token = localStorage.getItem('customerToken');
    let customerData = {};
    try { customerData = JSON.parse(localStorage.getItem('customer')) || {}; } catch { /* ignore */ }
    if (!token) {
      setAddressError('Session expired. Please log in again.');
      return;
    }

    setAddressSaving(true);
    try {
      const response = await api.put(
        '/api/customer/profile',
        {
          name: customerData.name,
          username: customerData.username,
          email_address: customerData.email,
          address: addressInput.trim(),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const updatedCustomer = { ...customerData, address: addressInput.trim(), ...(response.data?.customer || {}) };
      // The profile endpoint returns email_address, not email — keep the shape
      // the rest of this page and AuthContext expect.
      updatedCustomer.email = updatedCustomer.email || customerData.email;
      localStorage.setItem('customer', JSON.stringify(updatedCustomer));

      setAddressModalVisible(false);
      setAddressSaving(false);
      const { productsForOrder, quantity } = pendingOrderContext;
      setPendingOrderContext(null);
      await proceedWithOrder(updatedCustomer, token, productsForOrder, quantity);
    } catch (err) {
      console.error('Failed to save address:', err);
      setAddressError(err.response?.data?.message || 'Failed to save the address. Please try again.');
      setAddressSaving(false);
    }
  };

  /* ── Staff: manage which products customers can order ────────────────── */

  // Inventory grouped by the page's nine buckets, so each staff tab can list
  // everything it could publish — not just what is already published.
  const inventoryByCategory = useMemo(() => {
    const grouped = emptyAvailability();
    (inventoryProducts || []).forEach((product) => {
      const key = mapInventoryCategory(product.category);
      (grouped[key] = grouped[key] || []).push(product);
    });
    return grouped;
  }, [inventoryProducts]);

  // Edits go to a draft copy so Cancel is a real cancel; only Save writes back.
  const openStaffPicker = () => {
    setStaffDraft({ ...emptyAvailability(), ...availableSkus });
    setStaffCategory(CATEGORIES[0].key);
    setStaffPickerOpen(true);
  };

  const toggleStaffProduct = (sku) => {
    setStaffDraft((prev) => {
      const list = prev[staffCategory] || [];
      return {
        ...prev,
        [staffCategory]: list.includes(sku) ? list.filter((s) => s !== sku) : [...list, sku],
      };
    });
  };

  const saveAvailableInventory = async () => {
    setStaffSaving(true);
    try {
      await api.put('/api/available-inventory', { available: staffDraft });
      setAvailableSkus(staffDraft);
      setStaffPickerOpen(false);
      toast.success('Available products saved — customers see this now.');
    } catch (err) {
      console.error('Failed to save available inventory', err);
      toast.error(err.response?.data?.message || 'Failed to save available products.');
    } finally {
      setStaffSaving(false);
    }
  };

  const staffSelectedTotal = staffDraft
    ? Object.values(staffDraft).reduce((n, list) => n + list.length, 0)
    : 0;

  /* ── Rail navigation ─────────────────────────────────────────────────── */
  const jumpToCategory = (key) => {
    setActiveCategory(key);
    const el = document.getElementById(`ob-section-${key}`);
    el?.scrollIntoView({
      behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'start',
    });
  };

  const basketCountLabel = `${basketItems.length} ${basketItems.length === 1 ? 'item' : 'items'} in your basket`;

  /* ── Basket contents, shared by the aside and the mobile drawer ──────── */
  const basketPanel = (
    <>
      <div className="ob-basket-head">
        <IconBasket width="18" height="18" />
        <h2 className="ob-basket-title">Your Basket</h2>
        {/* One atomic status message, not a bare number (WCAG live-region guidance) */}
        <span className="ob-basket-badge" role="status" aria-atomic="true">
          <span aria-hidden="true">{basketItems.length}</span>
          <span className="sr-only" style={{ position: 'absolute', left: '-9999px' }}>{basketCountLabel}</span>
        </span>
      </div>

      <div className="ob-basket-list">
        {basketItems.length === 0 ? (
          <div className="ob-basket-empty">
            <IconBasket />
            <p style={{ margin: 0 }}>
              Nothing here yet.<br />
              Add pieces from the collection and they will gather here.
            </p>
          </div>
        ) : (
          basketItems.map((item) => (
            <div className="ob-basket-item" key={item.sku}>
              <ProductImage sku={item.sku} version={item.imageVersion} alt={item.name} className="ob-basket-thumb" />
              <div className="ob-basket-text">
                <p className="ob-basket-name" title={item.name}>{item.name}</p>
                <p className="ob-basket-meta">{item.categoryLabel} · {peso(item.price)}</p>
              </div>
              <button
                type="button"
                className="ob-basket-remove"
                onClick={() => removeItem(item.sku)}
                aria-label={`Remove ${item.name} from your basket`}
              >
                <IconClose />
              </button>
            </div>
          ))
        )}
      </div>

      <div className="ob-basket-foot">
        <div className="ob-guest-row">
          <label htmlFor="ob-guest-count">How many boxes?</label>
          <input
            id="ob-guest-count"
            className="ob-guest-input"
            name="guestCount"
            type="number"
            min="1"
            inputMode="numeric"
            placeholder="50"
            value={formData.guestCount}
            onChange={handleFieldChange}
          />
        </div>

        <div className="ob-total-row">
          <span>Estimated total</span>
          <b>{peso(estimatedTotal)}</b>
        </div>

        <p className="ob-total-note">
          {peso(perBoxTotal)} per box × {guestQty}. An estimate only — our team confirms
          the final quotation, including packing and delivery.
        </p>

        {/* The rules are stated before the button is pressed, not as an error
            afterwards — so a disabled CTA always explains itself. */}
        <ul className="ob-rules">
          <li className={chosenBox ? 'is-met' : ''}>
            <span aria-hidden="true">{chosenBox ? '✓' : '○'}</span>
            {chosenBox ? `Box: ${chosenBox.name}` : 'One box from Packaging'}
          </li>
          <li className={contentCount >= 1 ? 'is-met' : ''}>
            <span aria-hidden="true">{contentCount >= 1 ? '✓' : '○'}</span>
            {contentCount >= 1
              ? `${contentCount} item${contentCount === 1 ? '' : 's'} inside`
              : 'At least one item inside'}
          </li>
        </ul>

        <button
          type="button"
          className="ob-cta"
          disabled={!readiness.ok}
          onClick={() => setCheckoutOpen(true)}
        >
          {readiness.reason}
        </button>
      </div>
    </>
  );

  return (
    <>
      <TopbarCustomer />
      <EmployeeStatusBanner />

      <main className="ob-page">
        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <header className="ob-hero">
          <div className="ob-hero-inner">
            <p className="ob-hero-eyebrow">Build your gift box</p>
            <h1 className="ob-hero-title">Everything we offer, on one page</h1>
            <p className="ob-hero-sub">
              Browse the full collection, tap any piece to see its details, and gather your
              favourites in the basket. Tell us the dates at the end — no wizard, no back and forth.
            </p>
            <div className="ob-hero-steps">
              <span className="ob-hero-step"><b>1</b> One box, then its contents</span>
              <span className="ob-hero-step"><b>2</b> Tell us the dates</span>
              <span className="ob-hero-step"><b>3</b> We confirm your quote</span>
            </div>
          </div>
        </header>

        {/* ── Category rail ────────────────────────────────────────────── */}
        {visibleCategories.length > 0 && (
          <nav className="ob-rail" aria-label="Product categories">
            <div className="ob-rail-scroll">
              {visibleCategories.map((cat) => (
                <button
                  key={cat.key}
                  type="button"
                  className={`ob-chip${activeCategory === cat.key ? ' is-active' : ''}`}
                  aria-current={activeCategory === cat.key ? 'true' : undefined}
                  onClick={() => jumpToCategory(cat.key)}
                >
                  {cat.label}
                  <span className="ob-chip-count">{cat.products.length}</span>
                </button>
              ))}
            </div>
          </nav>
        )}

        <div className="ob-body">
          <div>
            {isStaff && (
              <div className="ob-staff">
                <div className="ob-staff-head">
                  <IconTools />
                  <span>
                    <b>Staff</b> — you are seeing the catalogue exactly as customers do.{' '}
                    {totalProducts} product{totalProducts === 1 ? '' : 's'} published.
                  </span>
                  <button type="button" className="ob-staff-btn" onClick={openStaffPicker}>
                    Manage available products
                  </button>
                </div>
              </div>
            )}

            {suggestBannerOpen && suggestedSkus.length > 0 && (
              <div className="ob-suggest-note ob-reveal is-in" role="status">
                <IconSparkle />
                <span>
                  <strong>Added from your chat.</strong>{' '}
                  {suggestedSkus.length === 1 ? 'This piece is' : `These ${suggestedSkus.length} pieces are`}{' '}
                  already in your basket and marked below — remove anything that is not right for you.
                </span>
                <button
                  type="button"
                  className="ob-suggest-dismiss"
                  onClick={() => setSuggestBannerOpen(false)}
                  aria-label="Dismiss this notice"
                >
                  ×
                </button>
              </div>
            )}

            {/* ── Loading skeletons ────────────────────────────────────── */}
            {catalogueLoading && (
              <section className="ob-section" aria-busy="true" aria-label="Loading the collection">
                <div className="ob-section-head">
                  <h2 className="ob-section-title">Loading the collection…</h2>
                </div>
                <div className="ob-grid">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div className="ob-skeleton" key={i}>
                      <div className="ob-skeleton-media" />
                      <div className="ob-skeleton-line" />
                      <div className="ob-skeleton-line short" />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ── Empty catalogue ──────────────────────────────────────── */}
            {!catalogueLoading && visibleCategories.length === 0 && (
              <div className="ob-empty">
                <h2>The collection is being restocked</h2>
                <p>
                  There are no products available to order right now. Please check back shortly,
                  or message us through the assistant and we will help you put something together.
                </p>
              </div>
            )}

            {/* ── Category sections ────────────────────────────────────── */}
            {visibleCategories.map((cat) => (
              <section
                key={cat.key}
                id={`ob-section-${cat.key}`}
                data-category={cat.key}
                className="ob-section"
                aria-labelledby={`ob-heading-${cat.key}`}
              >
                <div className="ob-section-head">
                  <h2 className="ob-section-title" id={`ob-heading-${cat.key}`}>{cat.label}</h2>
                  <span className="ob-section-count">
                    {cat.products.length} {cat.products.length === 1 ? 'piece' : 'pieces'}
                  </span>
                  {cat.key === PACKAGING_KEY && <span className="ob-section-rule">Pick one</span>}
                  <p className="ob-section-blurb">{cat.blurb}</p>
                </div>

                <div className="ob-grid">
                  {cat.products.map((product, i) => (
                    <ProductCard
                      key={product.sku}
                      product={product}
                      categoryLabel={cat.label}
                      index={i}
                      inBasket={basket.has(String(product.sku))}
                      suggested={suggestedSkus.includes(String(product.sku))}
                      singleChoice={cat.key === PACKAGING_KEY}
                      onOpen={setDetailProduct}
                      onToggle={toggleItem}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>

          {/* ── Sticky basket (desktop) ────────────────────────────────── */}
          <aside className="ob-basket" aria-label="Your basket">{basketPanel}</aside>
        </div>
      </main>

      {/* ── Mobile dock ──────────────────────────────────────────────────── */}
      <div className="ob-dock">
        <div className="ob-dock-row">
          <IconBasket width="22" height="22" />
          <div className="ob-dock-text">
            <b>{basketItems.length} {basketItems.length === 1 ? 'item' : 'items'}</b>
            <span>{readiness.ok ? `${peso(estimatedTotal)} estimated` : readiness.reason}</span>
          </div>
          <button
            type="button"
            className="ob-cta"
            disabled={!readiness.ok}
            onClick={() => setCheckoutOpen(true)}
          >
            Review
          </button>
        </div>
      </div>

      {/* ── Product detail modal ─────────────────────────────────────────── */}
      {detailProduct && (
        <Modal onClose={() => setDetailProduct(null)} labelledBy="ob-detail-title">
          <div className="ob-detail">
            <button type="button" className="ob-modal-close" onClick={() => setDetailProduct(null)} aria-label="Close details">
              <IconClose />
            </button>

            <div className="ob-detail-media">
              <ProductImage
                sku={detailProduct.sku}
                version={detailProduct.imageVersion}
                alt={detailProduct.description ? `${detailProduct.name} — ${detailProduct.description}` : detailProduct.name}
                eager
              />
            </div>

            <div className="ob-detail-body">
              <p className="ob-detail-eyebrow">{detailProduct.categoryLabel}</p>
              <h2 className="ob-detail-title" id="ob-detail-title">{detailProduct.name}</h2>
              <p className="ob-detail-price">{peso(detailProduct.price)} <span style={{ fontSize: '0.72rem', fontWeight: 400, color: 'var(--ob-text-mute)' }}>per box</span></p>

              <p className="ob-detail-desc">
                {detailProduct.description || 'No further description has been added for this piece yet — message us through the assistant if you would like to know more.'}
              </p>

              <dl className="ob-detail-specs">
                <div className="ob-spec"><dt>Category</dt><dd>{detailProduct.categoryLabel}</dd></div>
                <div className="ob-spec"><dt>Item code</dt><dd>{detailProduct.sku}</dd></div>
                <div className="ob-spec"><dt>Unit price</dt><dd>{peso(detailProduct.price)}</dd></div>
                <div className="ob-spec">
                  <dt>For {guestQty} {guestQty === 1 ? 'box' : 'boxes'}</dt>
                  <dd>{peso((Number(detailProduct.price) || 0) * guestQty)}</dd>
                </div>
              </dl>

              <div className="ob-detail-actions">
                <button
                  type="button"
                  className={`ob-cta${basket.has(String(detailProduct.sku)) ? ' ob-cta-ghost' : ''}`}
                  onClick={() => toggleItem(detailProduct)}
                >
                  {basket.has(String(detailProduct.sku))
                    ? 'Remove from basket'
                    : detailProduct.categoryKey === PACKAGING_KEY
                      ? 'Choose this box'
                      : 'Add to basket'}
                </button>
                <button type="button" className="ob-cta ob-cta-ghost" onClick={() => setDetailProduct(null)}>
                  Keep browsing
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Checkout modal ───────────────────────────────────────────────── */}
      {checkoutOpen && (
        <Modal onClose={() => setCheckoutOpen(false)} size="ob-modal-md" labelledBy="ob-checkout-title">
          <form onSubmit={handlePlaceOrder} style={{ display: 'contents' }}>
            <div className="ob-form-head">
              <h2 id="ob-checkout-title">Order details</h2>
              <p>Almost there — just the dates and a few notes.</p>
              <button type="button" className="ob-modal-close" onClick={() => setCheckoutOpen(false)} aria-label="Close">
                <IconClose />
              </button>
            </div>

            <div className="ob-form-body">
              <div className="ob-summary">
                <h3>{basketItems.length} {basketItems.length === 1 ? 'piece' : 'pieces'} · {peso(estimatedTotal)} estimated</h3>
                <div className="ob-summary-chips">
                  {basketItems.map((item) => (
                    <span className="ob-summary-chip" key={item.sku}>{item.name}</span>
                  ))}
                </div>
              </div>

              <div className="ob-form-grid">
                <div className={`ob-field${dateErrors.weddingDate ? ' has-error' : ''}`}>
                  <label htmlFor="ob-wedding-date">Wedding date</label>
                  <input
                    id="ob-wedding-date"
                    name="weddingDate"
                    type="date"
                    value={formData.weddingDate}
                    onChange={handleFieldChange}
                    aria-describedby={dateErrors.weddingDate ? 'ob-wedding-error' : 'ob-wedding-help'}
                    required
                  />
                  {dateErrors.weddingDate ? (
                    <p className="ob-error" id="ob-wedding-error"><IconAlert /> {dateErrors.weddingDate}</p>
                  ) : (
                    <p className="ob-help" id="ob-wedding-help">At least {MIN_LEAD_DAYS} days from today.</p>
                  )}
                </div>

                <div className={`ob-field${dateErrors.expectedDeliveryDate ? ' has-error' : ''}`}>
                  <label htmlFor="ob-delivery-date">Delivery date</label>
                  <input
                    id="ob-delivery-date"
                    name="expectedDeliveryDate"
                    type="date"
                    value={formData.expectedDeliveryDate}
                    onChange={handleFieldChange}
                    aria-describedby={dateErrors.expectedDeliveryDate ? 'ob-delivery-error' : 'ob-delivery-help'}
                    required
                  />
                  {dateErrors.expectedDeliveryDate ? (
                    <p className="ob-error" id="ob-delivery-error"><IconAlert /> {dateErrors.expectedDeliveryDate}</p>
                  ) : (
                    <p className="ob-help" id="ob-delivery-help">On or before the wedding day.</p>
                  )}
                </div>
              </div>

              {dateWarning && <p className="ob-warn">{dateWarning}</p>}

              <div className="ob-form-grid">
                <div className="ob-field">
                  <label htmlFor="ob-checkout-guests">Number of boxes</label>
                  <input
                    id="ob-checkout-guests"
                    name="guestCount"
                    type="number"
                    min="1"
                    inputMode="numeric"
                    placeholder="50"
                    value={formData.guestCount}
                    onChange={handleFieldChange}
                    required
                  />
                  <p className="ob-help">Every item in your basket is prepared once per box.</p>
                </div>

                <div className="ob-field">
                  <label htmlFor="ob-style">Styling (optional)</label>
                  <select id="ob-style" name="style" value={formData.style} onChange={handleFieldChange}>
                    <option value="">No preference</option>
                    {STYLE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <p className="ob-help">A direction for our stylists — your picks stay exactly as chosen.</p>
                </div>
              </div>

              {/* Shown the moment "Others" is picked, so the customer knows a
                  conversation is coming rather than wondering why there was
                  nowhere to describe what they wanted. */}
              {formData.style === STYLE_OTHERS && (
                <p className="ob-notice" role="status">
                  <IconSparkle />
                  <span>
                    <strong>We&apos;ll be in touch.</strong> {STYLE_OTHERS_NOTICE} Add anything
                    you already know to the notes below and we&apos;ll start from there.
                  </span>
                </p>
              )}

              <div className="ob-field">
                <label htmlFor="ob-requests">Anything else we should know?</label>
                <textarea
                  id="ob-requests"
                  name="specialRequests"
                  value={formData.specialRequests}
                  onChange={handleFieldChange}
                  placeholder="Colour palette, monogram, dietary notes, delivery instructions…"
                />
              </div>
            </div>

            <div className="ob-form-foot">
              <button type="button" className="ob-cta ob-cta-ghost" onClick={() => setCheckoutOpen(false)}>
                Back to browsing
              </button>
              <button type="submit" className="ob-cta" disabled={loading}>
                {loading ? 'Placing your order…' : 'Place order'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── OTP modal ────────────────────────────────────────────────────── */}
      {otpModalVisible && (
        <Modal onClose={() => setOtpModalVisible(false)} size="ob-modal-sm" labelledBy="ob-otp-title" dismissable={false}>
          <div className="ob-form-head">
            <h2 id="ob-otp-title">Confirm your email</h2>
            <p>We sent a 6-digit code to your inbox. Enter it to finish your order.</p>
          </div>

          <div className="ob-form-body">
            <div className={`ob-field${otpError ? ' has-error' : ''}`}>
              <label htmlFor="ob-otp">Confirmation code</label>
              <input
                id="ob-otp"
                className="ob-otp-input"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                aria-describedby={otpError ? 'ob-otp-error' : undefined}
              />
              {otpError && <p className="ob-error" id="ob-otp-error"><IconAlert /> {otpError}</p>}
            </div>

            <button
              type="button"
              className="ob-link-btn"
              onClick={handleResendOtp}
              disabled={resendCountdown > 0}
            >
              {resendCountdown > 0 ? `Resend code in ${resendCountdown}s` : 'Resend code'}
            </button>
          </div>

          <div className="ob-form-foot">
            <button
              type="button"
              className="ob-cta ob-cta-ghost"
              onClick={() => { setOtpModalVisible(false); setOtpCode(''); setPendingOrderPayload(null); }}
            >
              Cancel
            </button>
            <button type="button" className="ob-cta" onClick={handleVerifyAndPlaceOrder}>
              Verify &amp; place order
            </button>
          </div>
        </Modal>
      )}

      {/* ── Order placed, styling needs a conversation ───────────────────── */}
      {postOrderNotice && (
        <Modal
          onClose={() => { window.location.href = '/customer-cart'; }}
          size="ob-modal-sm"
          labelledBy="ob-placed-title"
          dismissable={false}
        >
          <div className="ob-form-head">
            <h2 id="ob-placed-title">Your order is in</h2>
            <p>Thank you — we have everything we need to get started.</p>
          </div>

          <div className="ob-form-body">
            <p className="ob-notice" role="status">
              <IconSparkle />
              <span>{STYLE_OTHERS_NOTICE}</span>
            </p>
            <p className="ob-help" style={{ margin: 0 }}>
              You chose <strong>Others</strong> for styling, so we will reach out using the
              contact details on your account to agree on the look before we start assembling.
            </p>
          </div>

          <div className="ob-form-foot">
            <button
              type="button"
              className="ob-cta"
              onClick={() => { window.location.href = '/customer-cart'; }}
            >
              Got it — view my order
            </button>
          </div>
        </Modal>
      )}

      {/* ── Staff: available-products picker ─────────────────────────────── */}
      {isStaff && staffPickerOpen && staffDraft && (
        <Modal onClose={() => setStaffPickerOpen(false)} labelledBy="ob-staff-title">
          <div className="ob-form-head">
            <h2 id="ob-staff-title">Manage available products</h2>
            <p>
              Tick the inventory items customers may choose from. Nothing changes for
              them until you press Save.
            </p>
            <button type="button" className="ob-modal-close" onClick={() => setStaffPickerOpen(false)} aria-label="Close">
              <IconClose />
            </button>
          </div>

          {/* Counts sit on the tabs so an empty category is visible without
              clicking through all nine of them. */}
          <div className="ob-staff-tabs" role="tablist" aria-label="Product categories">
            {CATEGORIES.map((cat) => {
              const picked = (staffDraft[cat.key] || []).length;
              const stock = (inventoryByCategory[cat.key] || []).length;
              return (
                <button
                  key={cat.key}
                  type="button"
                  role="tab"
                  aria-selected={staffCategory === cat.key}
                  className={`ob-staff-tab${staffCategory === cat.key ? ' is-active' : ''}`}
                  onClick={() => setStaffCategory(cat.key)}
                >
                  {cat.label}
                  <span className="ob-staff-tab-count">{picked}/{stock}</span>
                </button>
              );
            })}
          </div>

          <div className="ob-form-body">
            {(inventoryByCategory[staffCategory] || []).length === 0 ? (
              <div className="ob-empty">
                <h2>Nothing in inventory here</h2>
                <p>
                  No inventory item maps to {CATEGORIES.find((c) => c.key === staffCategory)?.label}.
                  Add one in Inventory, or check its category spelling — anything unrecognised
                  lands under Others.
                </p>
              </div>
            ) : (
              <div className="ob-staff-grid">
                {(inventoryByCategory[staffCategory] || []).map((product) => {
                  const chosen = (staffDraft[staffCategory] || []).includes(product.sku);
                  return (
                    <label key={product.sku} className={`ob-staff-item${chosen ? ' is-chosen' : ''}`}>
                      <input
                        type="checkbox"
                        checked={chosen}
                        onChange={() => toggleStaffProduct(product.sku)}
                      />
                      <ProductImage sku={product.sku} version={product.updated_at || product.last_updated} alt={product.name} className="ob-staff-thumb" />
                      <span className="ob-staff-item-text">
                        <b>{product.name}</b>
                        <em>{product.sku}</em>
                        <em>{peso(product.unit_price ?? product.price ?? 0)} · {product.category || 'uncategorised'}</em>
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          <div className="ob-form-foot ob-form-foot--staff">
            <span className="ob-staff-total">
              {staffSelectedTotal} product{staffSelectedTotal === 1 ? '' : 's'} published
            </span>
            <button type="button" className="ob-cta ob-cta-ghost" onClick={() => setStaffPickerOpen(false)}>
              Cancel
            </button>
            <button type="button" className="ob-cta" onClick={saveAvailableInventory} disabled={staffSaving}>
              {staffSaving ? 'Saving…' : 'Save available products'}
            </button>
          </div>
        </Modal>
      )}

      {/* ── Address modal ────────────────────────────────────────────────── */}
      {addressModalVisible && (
        <Modal onClose={() => setAddressModalVisible(false)} size="ob-modal-sm" labelledBy="ob-address-title">
          <div className="ob-form-head">
            <h2 id="ob-address-title">Where should we deliver?</h2>
            <p>We do not have an address on file for your account yet.</p>
          </div>

          <div className="ob-form-body">
            <div className={`ob-field${addressError ? ' has-error' : ''}`}>
              <label htmlFor="ob-address">Delivery address</label>
              <textarea
                id="ob-address"
                value={addressInput}
                onChange={(e) => setAddressInput(e.target.value)}
                placeholder="House/unit number, street, barangay, city, province"
                aria-describedby={addressError ? 'ob-address-error' : undefined}
              />
              {addressError && <p className="ob-error" id="ob-address-error"><IconAlert /> {addressError}</p>}
              <p className="ob-help">We will save this to your profile for future orders.</p>
            </div>
          </div>

          <div className="ob-form-foot">
            <button type="button" className="ob-cta ob-cta-ghost" onClick={() => setAddressModalVisible(false)}>
              Cancel
            </button>
            <button type="button" className="ob-cta" onClick={handleSaveAddressAndContinue} disabled={addressSaving}>
              {addressSaving ? 'Saving…' : 'Save & continue'}
            </button>
          </div>
        </Modal>
      )}

      <ToastContainer position="bottom-right" autoClose={4000} newestOnTop theme="light" />
    </>
  );
}
