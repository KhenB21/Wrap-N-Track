import React, { useMemo, useState } from 'react';
import './OrderBoard.css';

/* ===========================================================================
   Order board — the three-column view at /orders
   ---------------------------------------------------------------------------
   Extracted from OrderDetails.js, which carried three near-identical copies of
   the column markup inline. Beyond the visual redesign this adds the thing the
   board was missing: orders are ordered by when they are due to go out, and
   every card shows that date, so the next delivery is always the top card.

   On "delivery date time": orders.expected_delivery is a DATE column — there is
   no time of day stored anywhere in the schema — so ordering is by day, with
   order_date and then order_id as tiebreakers to keep equal-day cards from
   shuffling between renders.
   =========================================================================== */

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/* node-postgres parses a DATE column into a JS Date at the SERVER's local
   midnight, which JSON then serialises as a UTC instant — so the same day can
   arrive as either "2026-09-19" or "2026-09-18T16:00:00.000Z". A plain
   YYYY-MM-DD is read field-by-field so the viewer's timezone cannot shift it;
   anything else is parsed and reduced to its local calendar day. */
export const parseDeliveryDate = (raw) => {
  if (!raw) return null;
  if (raw instanceof Date) return Number.isNaN(raw.getTime()) ? null : startOfDay(raw);

  const text = String(raw).trim();
  if (!text) return null;

  const plain = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (plain) return new Date(Number(plain[1]), Number(plain[2]) - 1, Number(plain[3]));

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : startOfDay(parsed);
};

const DAY_MS = 24 * 60 * 60 * 1000;

const dateFmt = new Intl.DateTimeFormat('en-PH', { weekday: 'short', day: 'numeric', month: 'short' });
const dateFmtWithYear = new Intl.DateTimeFormat('en-PH', { day: 'numeric', month: 'short', year: 'numeric' });

/* Urgency drives the card's accent colour, its chip and the sort order.
   `days` is whole calendar days from today: negative is overdue. */
export const deliveryMeta = (order) => {
  const date = parseDeliveryDate(order?.expected_delivery);
  if (!date) {
    return { date: null, days: null, bucket: 'unscheduled', chip: 'No date set', full: 'Not scheduled' };
  }

  const days = Math.round((date - startOfDay(new Date())) / DAY_MS);
  const sameYear = date.getFullYear() === new Date().getFullYear();
  const full = (sameYear ? dateFmt : dateFmtWithYear).format(date);

  if (days < 0) {
    const late = Math.abs(days);
    return { date, days, bucket: 'overdue', chip: `${late} day${late === 1 ? '' : 's'} late`, full };
  }
  if (days === 0) return { date, days, bucket: 'today', chip: 'Due today', full };
  if (days === 1) return { date, days, bucket: 'tomorrow', chip: 'Due tomorrow', full };
  if (days <= 7) return { date, days, bucket: 'soon', chip: `In ${days} days`, full };
  return { date, days, bucket: 'later', chip: `In ${days} days`, full };
};

/* Soonest first. Unscheduled orders sort last in both directions — an order
   with no date is not "the most urgent thing on the board", which is where a
   plain ascending sort on null would put it. */
const byDelivery = (direction) => (a, b) => {
  const da = parseDeliveryDate(a.expected_delivery);
  const db = parseDeliveryDate(b.expected_delivery);

  if (!da && !db) return 0;
  if (!da) return 1;
  if (!db) return -1;

  const diff = da - db;
  if (diff !== 0) return direction === 'asc' ? diff : -diff;

  // Same delivery day: oldest order first, then a stable id comparison so the
  // list never reshuffles on re-render.
  const oa = parseDeliveryDate(a.order_date);
  const ob = parseDeliveryDate(b.order_date);
  if (oa && ob && oa - ob !== 0) return oa - ob;
  return String(a.order_id || '').localeCompare(String(b.order_id || ''));
};

const WINDOWS = [
  { key: 'all',         label: 'All' },
  { key: 'overdue',     label: 'Overdue' },
  { key: 'today',       label: 'Today' },
  { key: 'week',        label: 'Next 7 days' },
  { key: 'unscheduled', label: 'No date' },
];

const inWindow = (order, windowKey) => {
  if (windowKey === 'all') return true;
  const { bucket, days } = deliveryMeta(order);
  switch (windowKey) {
    case 'overdue':     return bucket === 'overdue';
    case 'today':       return bucket === 'today';
    case 'week':        return days !== null && days >= 0 && days <= 7;
    case 'unscheduled': return bucket === 'unscheduled';
    default:            return true;
  }
};

const peso = (value) =>
  `₱${Number(value || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const IconCalendar = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M3 10h18M8 3v4M16 3v4" />
  </svg>
);
const IconSort = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M7 4v16M7 20l-3.5-3.5M7 20l3.5-3.5M17 20V4M17 4l-3.5 3.5M17 4l3.5 3.5" />
  </svg>
);
const IconInbox = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 13h4l2 3h6l2-3h4" />
    <path d="M5 5h14l2 8v6H3v-6z" />
  </svg>
);

/* ── Card ─────────────────────────────────────────────────────────────────── */
function OrderCard({ order, total, onSelect }) {
  const meta = deliveryMeta(order);

  return (
    <article
      className={`odb-card odb-u-${meta.bucket}`}
      role="button"
      tabIndex={0}
      onClick={() => onSelect(order.order_id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(order.order_id);
        }
      }}
      aria-label={`${order.name || 'Order'}, ${order.order_id}. Delivery ${meta.full}, ${meta.chip}. ${peso(total)}.`}
    >
      <div className="odb-card-top">
        <h4 className="odb-card-name">{order.name || 'Unnamed order'}</h4>
        <span className="odb-chip">{meta.chip}</span>
      </div>

      <p className="odb-card-id">{order.order_id}</p>

      <div className="odb-card-foot">
        <span className="odb-card-date">
          <IconCalendar />
          {meta.full}
        </span>
        <span className="odb-card-total">{peso(total)}</span>
      </div>
    </article>
  );
}

/* ── Column ───────────────────────────────────────────────────────────────── */
function OrderColumn({ title, tone, orders, loading, totalFor, onSelect, emptyHint }) {
  // The column header answers "what is the next thing due here?" without
  // needing to read the cards.
  const next = orders.length ? deliveryMeta(orders[0]) : null;

  return (
    <section className="odb-column" aria-label={title}>
      <header className="odb-column-head">
        <span className={`odb-column-dot odb-tone-${tone}`} aria-hidden="true" />
        <h3 className="odb-column-title">{title}</h3>
        <span className="odb-column-count">{orders.length}</span>
      </header>

      {next && next.date && (
        <p className={`odb-column-next odb-u-${next.bucket}`}>
          Next out: <strong>{next.full}</strong> · {next.chip}
        </p>
      )}

      <div className="odb-list">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div className="odb-card odb-card-skeleton" key={i} aria-hidden="true">
              <span className="odb-sk odb-sk-title" />
              <span className="odb-sk odb-sk-id" />
              <span className="odb-sk odb-sk-foot" />
            </div>
          ))
        ) : orders.length === 0 ? (
          <div className="odb-empty">
            <IconInbox />
            <p>{emptyHint}</p>
          </div>
        ) : (
          orders.map((order) => (
            <OrderCard
              key={order.order_id}
              order={order}
              total={totalFor(order)}
              onSelect={onSelect}
            />
          ))
        )}
      </div>
    </section>
  );
}

/* ── Board ────────────────────────────────────────────────────────────────── */
export default function OrderBoard({
  pending,
  toBePacked,
  readyForDelivery,
  loading,
  searchTerm,
  totalFor,
  onSelectOrder,
  onAddOrder,
}) {
  const [windowKey, setWindowKey] = useState('all');
  const [direction, setDirection] = useState('asc');   // asc = soonest first

  const columns = useMemo(() => {
    const shape = (orders) => orders.filter((o) => inWindow(o, windowKey)).slice().sort(byDelivery(direction));
    return {
      pending: shape(pending),
      toBePacked: shape(toBePacked),
      readyForDelivery: shape(readyForDelivery),
    };
  }, [pending, toBePacked, readyForDelivery, windowKey, direction]);

  // Counts on the filter chips come from every column combined, so switching a
  // filter never hides the fact that something is overdue somewhere else.
  const windowCounts = useMemo(() => {
    const all = [...pending, ...toBePacked, ...readyForDelivery];
    return WINDOWS.reduce((acc, w) => ({ ...acc, [w.key]: all.filter((o) => inWindow(o, w.key)).length }), {});
  }, [pending, toBePacked, readyForDelivery]);

  const overdueCount = windowCounts.overdue || 0;
  const shownCount = columns.pending.length + columns.toBePacked.length + columns.readyForDelivery.length;

  const emptyHint = searchTerm
    ? 'No orders match your search'
    : windowKey === 'all'
      ? 'Nothing here right now'
      : 'Nothing in this delivery window';

  return (
    <>
      <div className="odb-toolbar">
        <div className="odb-toolbar-row">
          <button type="button" className="odb-btn odb-btn-primary" onClick={onAddOrder}>
            + Add Order
          </button>

          <div className="odb-filters" role="group" aria-label="Filter by delivery window">
            {WINDOWS.map((w) => (
              <button
                key={w.key}
                type="button"
                className={`odb-filter${windowKey === w.key ? ' is-active' : ''}${w.key === 'overdue' && overdueCount > 0 ? ' is-alert' : ''}`}
                aria-pressed={windowKey === w.key}
                onClick={() => setWindowKey(w.key)}
              >
                {w.label}
                <span className="odb-filter-count">{windowCounts[w.key] ?? 0}</span>
              </button>
            ))}
          </div>

          <button
            type="button"
            className="odb-btn odb-btn-ghost odb-sort"
            onClick={() => setDirection((d) => (d === 'asc' ? 'desc' : 'asc'))}
            aria-label={`Sort by delivery date, currently ${direction === 'asc' ? 'soonest first' : 'latest first'}. Activate to reverse.`}
          >
            <IconSort />
            {direction === 'asc' ? 'Soonest first' : 'Latest first'}
          </button>
        </div>

        {/* One line of context: what the board is showing, and whether anything
            has already slipped past its delivery date. */}
        <p className="odb-toolbar-note">
          {loading
            ? 'Loading orders…'
            : `Showing ${shownCount} order${shownCount === 1 ? '' : 's'}, ordered by delivery date.`}
          {!loading && overdueCount > 0 && (
            <button type="button" className="odb-alert-link" onClick={() => setWindowKey('overdue')}>
              {overdueCount} past due
            </button>
          )}
        </p>
      </div>

      <div className="odb-columns">
        <OrderColumn
          title="Pending Orders"
          tone="pending"
          orders={columns.pending}
          loading={loading}
          totalFor={totalFor}
          onSelect={onSelectOrder}
          emptyHint={emptyHint}
        />
        <OrderColumn
          title="To Be Packed"
          tone="packing"
          orders={columns.toBePacked}
          loading={loading}
          totalFor={totalFor}
          onSelect={onSelectOrder}
          emptyHint={emptyHint}
        />
        <OrderColumn
          title="Ready for Delivery"
          tone="ready"
          orders={columns.readyForDelivery}
          loading={loading}
          totalFor={totalFor}
          onSelect={onSelectOrder}
          emptyHint={emptyHint}
        />
      </div>
    </>
  );
}
