import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../Context/AuthContext';
import TopbarCustomer from '../../Components/TopbarCustomer';
import api from '../../api';
import { useConfirm } from '../../Context/ConfirmContext';
import './OrderTracker.css';

/* ===========================================================================
   My Orders — the customer's order tracker at /customer-cart
   ---------------------------------------------------------------------------
   Collapsed, a card answers three questions at a glance: what did I order, how
   far along is it, when does it arrive. Opening one reveals the journey as a
   horizontal stepper with a completion percentage and days remaining.

   No order ID is shown anywhere. The previous version titled every card
   "Order SEED-20260819-02459" — a string no customer can recognise, recall or
   use. Cards are identified by what they contain and when they were placed.
   =========================================================================== */

const STATUS_ALIASES = {
  // Internal statuses the customer should never be shown verbatim, mapped onto
  // the stage they actually represent. Mirrors getCustomerStatus() in the
  // version this replaces.
  pending: 'placed',
  orderplaced: 'placed',
  orderpaid: 'paid',
  tobepack: 'preparing',
  tobepacked: 'preparing',
  inprogress: 'preparing',
  readyfordeliver: 'shipped',
  readyfordelivery: 'shipped',
  ordershippedout: 'shipped',
  enroute: 'shipped',
  orderreceived: 'received',
  completed: 'received',
  cancelled: 'cancelled',
};

// The journey as a customer experiences it. `key` matches STATUS_ALIASES.
const STAGES = [
  { key: 'placed',    label: 'Order Placed',  hint: 'We have your order' },
  { key: 'paid',      label: 'Payment Received', hint: 'Deposit confirmed' },
  { key: 'preparing', label: 'Being Prepared', hint: 'Your boxes are being made' },
  { key: 'shipped',   label: 'Out for Delivery', hint: 'On its way to you' },
  { key: 'received',  label: 'Received',      hint: 'Delivered' },
];

const normalize = (s) =>
  typeof s === 'string' ? s.toLowerCase().replace(/\s+/g, '').replace(/-/g, '') : '';

const stageKeyFor = (status) => STATUS_ALIASES[normalize(status)] || 'placed';

const peso = (value) =>
  `₱${Number(value || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/* Postgres DATE columns arrive either as "2026-09-19" or as a UTC instant that
   can land on the previous day once parsed. Read a plain date field-by-field so
   the viewer's timezone cannot shift it. */
const parseDate = (raw) => {
  if (!raw) return null;
  const text = String(raw).trim();
  const plain = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (plain) return new Date(Number(plain[1]), Number(plain[2]) - 1, Number(plain[3]));
  const d = new Date(text);
  return Number.isNaN(d.getTime()) ? null : startOfDay(d);
};

const fmtDate = (raw, withYear = true) => {
  const d = parseDate(raw);
  if (!d) return null;
  return d.toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    ...(withYear ? { year: 'numeric' } : {}),
  });
};

/* Everything the UI needs to describe one order's progress. */
const trackOrder = (order) => {
  // Only the customer's own "Order Received" finishes an order. One staff marked
  // Completed (receipt_confirmed === false) stays on Out for Delivery at 80% until
  // the customer confirms.
  const rawStageKey = stageKeyFor(order.status);
  const awaitingConfirmation = rawStageKey === 'received' && order.receipt_confirmed === false;
  const stageKey = awaitingConfirmation ? 'shipped' : rawStageKey;
  const cancelled = stageKey === 'cancelled';
  const index = STAGES.findIndex((s) => s.key === stageKey);
  const currentIndex = index < 0 ? 0 : index;

  // Completion counts the current stage as reached, so a freshly placed order
  // reads 20% rather than 0% — it HAS started.
  const percent = cancelled ? 0 : Math.round(((currentIndex + 1) / STAGES.length) * 100);

  const due = parseDate(order.expected_delivery);
  let etaLabel = 'To be scheduled';
  let etaNote = '';
  let late = false;

  if (due) {
    const days = Math.round((due - startOfDay(new Date())) / 86400000);
    etaLabel = fmtDate(order.expected_delivery);
    if (stageKey === 'received') etaNote = 'Delivered';
    else if (days < 0) { etaNote = `${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} overdue`; late = true; }
    else if (days === 0) etaNote = 'Arriving today';
    else if (days === 1) etaNote = 'Tomorrow';
    else etaNote = `${days} days to go`;
  }

  if (awaitingConfirmation) {
    etaNote = 'Waiting for your confirmation';
    late = false;
  }

  return {
    stageKey,
    cancelled,
    currentIndex,
    percent,
    etaLabel,
    etaNote,
    late,
    awaitingConfirmation,
    canConfirm: order.can_confirm_receipt === true,
  };
};

/* A readable name for an order. Prefers the styling/package the customer
   chose, falls back to the contents, and never exposes the order ID. */
const orderTitle = (order) => {
  const pkg = (order.package_name || '').trim();
  if (pkg && pkg.toLowerCase() !== 'handpick') return `${pkg} Gift Boxes`;

  const items = order.products || [];
  if (items.length === 1) return items[0].name;
  if (items.length > 1) return `${items[0].name} + ${items.length - 1} more`;
  return 'Custom Gift Boxes';
};

/* ── Icons ────────────────────────────────────────────────────────────────── */
const IconCheck = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const IconChevron = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);
const IconBox = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 8l-9-5-9 5 9 5 9-5z" /><path d="M3 8v8l9 5 9-5V8" /><path d="M12 13v8" />
  </svg>
);
const IconInfo = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="11" /><line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);
const IconAlert = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
  </svg>
);
const IconRefresh = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 12a9 9 0 1 1-3-6.7" /><polyline points="21 3 21 9 15 9" />
  </svg>
);

/* ── Product image ────────────────────────────────────────────────────────
   The API sends `sku` and a `has_image` flag, not base64 — the previous
   version read `product.image_data`, which is never present, so every item
   rendered a placeholder. Photos come from the binary inventory endpoint,
   lazily, and a failure draws a placeholder rather than chasing a fallback
   file that does not exist. */
function ItemImage({ sku, hasImage, version, alt }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => { setFailed(false); }, [sku, version]);

  if (!sku || hasImage === false || failed) {
    return (
      <span className="ot-img-empty" role="img" aria-label={`${alt} — no photo`}>
        <IconBox />
      </span>
    );
  }

  // `v` is the product's last-updated stamp. The route caches for 24h, so
  // without it a replaced photo — or a response cached while that route was
  // serving the wrong Content-Type — would be served stale for a full day.
  const src = `${api.defaults.baseURL}/api/inventory/${encodeURIComponent(sku)}/image`
    + (version ? `?v=${encodeURIComponent(version)}` : '');

  return (
    <span className="ot-img">
      <img src={src} alt={alt} loading="lazy" decoding="async" onError={() => setFailed(true)} />
    </span>
  );
}

/* ── Stepper ──────────────────────────────────────────────────────────────── */
function Stepper({ currentIndex }) {
  return (
    <div className="ot-steps" style={{ gridTemplateColumns: `repeat(${STAGES.length}, minmax(0, 1fr))` }}>
      {STAGES.map((stage, i) => {
        const state = i < currentIndex ? 'is-done' : i === currentIndex ? 'is-current' : '';
        return (
          <div className={`ot-step ${state}`} key={stage.key}>
            <span className="ot-dot">{i < currentIndex ? <IconCheck /> : null}</span>
            <span>
              <span className="ot-step-label">{stage.label}</span>
              {i === currentIndex && <span className="ot-step-date">{stage.hint}</span>}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ── Order card ───────────────────────────────────────────────────────────── */
function OrderCard({ order, open, onToggle, onConfirmReceived, confirming }) {
  const t = trackOrder(order);
  const items = order.products || [];
  const boxes = order.total_boxes ?? order.order_quantity ?? 0;
  const balance = Number(order.remaining_balance || 0);
  const title = orderTitle(order);

  const chipClass = t.cancelled ? 'ot-chip-cancel' : t.stageKey === 'received' ? 'ot-chip-done' : 'ot-chip-live';
  const chipText = t.cancelled ? 'Cancelled' : t.awaitingConfirmation ? 'Confirm receipt' : STAGES[t.currentIndex].label;

  const trackingUnavailable = !t.cancelled
    && !(order.tracking_link_available && order.tracking_link)
    && order.delivery_type !== 'PICKUP'
    && order.delivery_method !== 'Customer Pick-up'
    && (order.tracking_unavailable_message || '');

  const resolveAsset = (url) => {
    if (!url) return '';
    if (/^https?:\/\//i.test(url)) return url;
    return `${api.defaults.baseURL}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  return (
    <article className={`ot-card${open ? ' is-open' : ''}`}>
      <button
        type="button"
        className="ot-summary"
        onClick={onToggle}
        aria-expanded={open}
        aria-label={`${title}. ${chipText}. ${t.percent}% complete. ${open ? 'Hide' : 'Show'} details.`}
      >
        <span className="ot-thumbs">
          {items.slice(0, 3).map((p, i) => (
            <span className="ot-thumb" key={`${p.sku}-${i}`}>
              <ItemImage sku={p.sku} hasImage={p.has_image} version={p.image_version} alt={p.name} />
            </span>
          ))}
          {items.length === 0 && <span className="ot-thumb"><span className="ot-img-empty"><IconBox /></span></span>}
          {items.length > 3 && <span className="ot-thumb-more">+{items.length - 3}</span>}
        </span>

        <span className="ot-summary-main">
          <h3 className="ot-card-title">{title}</h3>
          <p className="ot-card-sub">{[
            items.length > 0 && `${items.length} item${items.length === 1 ? '' : 's'}`,
            boxes > 0 && `${boxes} box${boxes === 1 ? '' : 'es'}`,
            order.order_date && `Placed ${fmtDate(order.order_date, false)}`,
          ].filter(Boolean).join(' · ')}</p>
        </span>

        <span className={`ot-chip ${chipClass}`}>{chipText}</span>

        <span className="ot-mini">
          {t.cancelled ? (
            <span className="ot-mini-eta">No longer active</span>
          ) : (
            <>
              <span className="ot-mini-top">
                <span className="ot-mini-pct">{t.percent}%</span>
                <span className="ot-mini-eta">{t.etaNote || t.etaLabel}</span>
              </span>
              <span className={`ot-bar${t.stageKey === 'received' ? ' is-done' : ''}`}>
                <span style={{ width: `${t.percent}%` }} />
              </span>
            </>
          )}
        </span>

        <span className="ot-caret" aria-hidden="true"><IconChevron /></span>
      </button>

      {open && (
        <div className="ot-detail">
          {t.cancelled ? (
            <div className="ot-cancelled">
              <IconAlert />
              <span>This order was cancelled. Nothing will be delivered and any payment made is being handled by our team.</span>
            </div>
          ) : (
            <>
              <div className="ot-detail-head">
                <div>
                  <h3 className="ot-detail-title">{title}</h3>
                  <div className="ot-detail-meta">
                    {boxes > 0 && <span><b>{boxes}</b> box{boxes === 1 ? '' : 'es'} · <b>{items.length}</b> item{items.length === 1 ? '' : 's'} inside</span>}
                    <span>Placed on <b>{fmtDate(order.order_date) || '—'}</b></span>
                  </div>
                </div>

                <div>
                  <p className="ot-block-label">Progress</p>
                  <p className="ot-pct">{t.percent}%</p>
                  <span className={`ot-bar${t.stageKey === 'received' ? ' is-done' : ''}`}>
                    <span style={{ width: `${t.percent}%` }} />
                  </span>
                </div>

                <div className="ot-detail-right">
                  <p className="ot-block-label">{t.stageKey === 'received' ? 'Delivered' : 'Expected Delivery'}</p>
                  <p className="ot-eta-value">{t.etaLabel}</p>
                  {t.etaNote && <p className={`ot-eta-sub${t.late ? ' is-late' : ''}`}>{t.etaNote}</p>}
                </div>
              </div>

              <Stepper currentIndex={t.currentIndex} />

              {t.canConfirm && (
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginTop: 16 }}>
                  <p className="ot-note" style={{ flex: '1 1 260px', margin: 0 }}>
                    <IconInfo />
                    <span>
                      {t.awaitingConfirmation
                        ? 'Our team has marked this order as complete. Tap Order Received once your boxes are with you.'
                        : 'Your order is on its way. Tap Order Received once your boxes are with you.'}
                    </span>
                  </p>
                  <button
                    type="button"
                    className="ot-btn ot-btn-primary"
                    onClick={onConfirmReceived}
                    disabled={confirming}
                  >
                    {confirming ? 'Confirming…' : 'Order Received'}
                  </button>
                </div>
              )}

              <div className="ot-section">
                <h4>What&apos;s in your box</h4>
                <div className="ot-items">
                  {items.map((p, i) => (
                    <div className="ot-item" key={`${p.sku}-${i}`}>
                      <span className="ot-item-thumb">
                        <ItemImage sku={p.sku} hasImage={p.has_image} version={p.image_version} alt={p.name} />
                      </span>
                      <span className="ot-item-name">{p.name}</span>
                      <span className="ot-item-qty">×{p.quantity}</span>
                    </div>
                  ))}
                  {items.length === 0 && (
                    <p className="ot-card-sub">Our team is still finalising the contents of this order.</p>
                  )}
                </div>
              </div>

              <div className="ot-section">
                <h4>Payment</h4>
                <dl className="ot-facts">
                  <div className="ot-fact">
                    <dt>Order total</dt>
                    <p className="ot-meta-value">{peso(order.total_cost)}</p>
                  </div>
                  <div className="ot-fact">
                    <dt>Status</dt>
                    <p className="ot-meta-value">{order.payment_status || order.payment_method || 'Pending'}</p>
                  </div>
                  <div className="ot-fact">
                    <dt>Balance due</dt>
                    <p className={`ot-meta-value ${balance > 0 ? 'is-due' : 'is-clear'}`}>
                      {balance > 0 ? peso(balance) : 'Fully paid'}
                    </p>
                  </div>
                </dl>
                {balance > 0 && (
                  <p className="ot-note">
                    <IconInfo />
                    <span>
                      {peso(balance)} is still outstanding. This needs to be settled before your
                      boxes are sent out — our team will coordinate the payment with you.
                    </span>
                  </p>
                )}
              </div>

              {(order.delivery_method || order.courier_name || order.tracking_number || order.delivery_remarks || order.proof_image_url) && (
                <div className="ot-section">
                  <h4>Delivery</h4>
                  <dl className="ot-facts">
                    <div className="ot-fact">
                      <dt>Method</dt>
                      <p className="ot-meta-value">{order.delivery_method || 'Being arranged'}</p>
                    </div>
                    {order.courier_name && (
                      <div className="ot-fact">
                        <dt>Courier</dt>
                        <p className="ot-meta-value">{order.courier_name}</p>
                      </div>
                    )}
                    {order.tracking_number && (
                      <div className="ot-fact">
                        <dt>Tracking no.</dt>
                        <p className="ot-meta-value">{order.tracking_number}</p>
                      </div>
                    )}
                  </dl>

                  {order.tracking_link_available && order.tracking_link && (
                    <a className="ot-track-link" href={order.tracking_link} target="_blank" rel="noopener noreferrer">
                      Track my delivery →
                    </a>
                  )}

                  {trackingUnavailable && (
                    <p className="ot-note"><IconInfo /><span>{trackingUnavailable}</span></p>
                  )}

                  {order.delivery_remarks && (
                    <p className="ot-note"><IconInfo /><span>{order.delivery_remarks}</span></p>
                  )}

                  {order.proof_image_url && (
                    <div className="ot-proof">
                      <p className="ot-block-label" style={{ marginTop: 14 }}>Proof of delivery</p>
                      <img src={resolveAsset(order.proof_image_url)} alt="Proof of delivery" loading="lazy" />
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </article>
  );
}

/* ── Page ─────────────────────────────────────────────────────────────────── */
export default function CustomerOrders() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const confirm = useConfirm();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openId, setOpenId] = useState(null);   // one order open at a time
  const [sortBy, setSortBy] = useState('newest');
  const [confirmingId, setConfirmingId] = useState(null);

  const isCustomer = Boolean(user && user.source === 'customer');

  const fetchOrders = useCallback(async () => {
    try {
      setError('');
      const response = await api.get('/api/customer-orders/orders');
      setOrders(response.data?.success ? (response.data.orders || []) : []);
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError('We could not load your orders just now.');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isCustomer) { setLoading(false); return undefined; }
    fetchOrders();

    // Keep the tracker fresh while it is on screen. The previous version ran a
    // 30s interval plus focus AND visibilitychange listeners, which fired three
    // overlapping refetches on every tab switch; the interval is paused while
    // the tab is hidden instead.
    const interval = setInterval(() => {
      if (!document.hidden) fetchOrders();
    }, 30000);
    const onFocus = () => { if (!document.hidden) fetchOrders(); };
    window.addEventListener('focus', onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [isCustomer, fetchOrders]);

  const sorted = useMemo(() => {
    const list = [...orders];
    list.sort((a, b) => {
      const da = parseDate(a.order_date) || 0;
      const db = parseDate(b.order_date) || 0;
      return sortBy === 'newest' ? db - da : da - db;
    });
    return list;
  }, [orders, sortBy]);

  const activeCount = useMemo(
    () => orders.filter((o) => !['received', 'cancelled'].includes(trackOrder(o).stageKey)).length,
    [orders]
  );

  // Same endpoint the mobile app's "Order Received" button uses.
  const confirmReceived = async (order) => {
    const ok = await confirm({ message: 'Confirm that you have received this order? This marks it as complete.' });
    if (!ok) return;
    setConfirmingId(order.order_id);
    setError('');
    try {
      await api.patch(`/api/customer-orders/orders/${encodeURIComponent(order.order_id)}/receive`);
      await fetchOrders();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not confirm that you received this order. Please try again.');
    } finally {
      setConfirmingId(null);
    }
  };

  if (!isCustomer && !loading) {
    return (
      <div className="ot-page">
        <TopbarCustomer />
        <div className="ot-shell" style={{ paddingTop: 60 }}>
          <div className="ot-empty">
            <IconBox />
            <h2>Please log in</h2>
            <p>Log in to your customer account to follow your orders from here.</p>
            <button type="button" className="ot-btn ot-btn-primary" onClick={() => navigate('/customer-login')}>
              Log in
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ot-page">
      <TopbarCustomer />

      <header className="ot-header">
        <p className="ot-eyebrow">Your orders</p>
        <h1>Follow your gift boxes</h1>
        <p>Tap an order to see exactly where it is and what is inside.</p>
      </header>

      <div className="ot-shell">
        {error && (
          <div className="ot-error">
            <IconAlert />
            <span>{error}</span>
            <button type="button" className="ot-btn" onClick={fetchOrders}>Try again</button>
          </div>
        )}

        {loading ? (
          [1, 2, 3].map((i) => (
            <div className="ot-skeleton" key={i} aria-hidden="true">
              <span className="ot-sk ot-sk-thumb" />
              <span className="ot-sk-lines">
                <span className="ot-sk ot-sk-line" />
                <span className="ot-sk ot-sk-line" />
              </span>
              <span className="ot-sk ot-sk-bar" />
            </div>
          ))
        ) : orders.length === 0 ? (
          <div className="ot-empty">
            <IconBox />
            <h2>No orders yet</h2>
            <p>
              Once you place an order, this is where you will watch it come together —
              from confirmation all the way to your door.
            </p>
            <button type="button" className="ot-btn ot-btn-primary" onClick={() => navigate('/order')}>
              Start an order
            </button>
          </div>
        ) : (
          <>
            <div className="ot-toolbar">
              <p className="ot-count">
                <strong>{orders.length}</strong> order{orders.length === 1 ? '' : 's'}
                {activeCount > 0 && ` · ${activeCount} in progress`}
              </p>
              <div className="ot-toolbar-right">
                <select
                  className="ot-select"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  aria-label="Sort orders"
                >
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                </select>
                <button type="button" className="ot-btn" onClick={fetchOrders} title="Refresh">
                  <IconRefresh /> Refresh
                </button>
              </div>
            </div>

            {sorted.map((order) => (
              <OrderCard
                key={order.order_id}
                order={order}
                open={openId === order.order_id}
                onToggle={() => setOpenId(openId === order.order_id ? null : order.order_id)}
                confirming={confirmingId === order.order_id}
                onConfirmReceived={() => confirmReceived(order)}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
