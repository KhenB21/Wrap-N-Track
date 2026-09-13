/* Order-board rules for the employee Orders screens, ported from the Website
   (Website/client/src/Pages/OrderDetails/OrderBoard.js and OrderDetails.js). */

export const normalizeStatus = (status) =>
  typeof status === 'string' ? status.toLowerCase().replace(/\s+/g, '').replace(/-/g, '') : '';

// The Website board's three columns, plus History for finished orders.
export const BOARD_TABS = [
  { key: 'pending', label: 'Pending', tone: '#F39C12', statuses: ['pending', 'orderplaced', 'orderpaid'] },
  { key: 'toBePacked', label: 'To Be Packed', tone: '#696a8f', statuses: ['tobepacked', 'tobepack'] },
  { key: 'ready', label: 'Ready for Delivery', tone: '#2E7D32', statuses: ['readyfordelivery', 'readyfordeliver', 'confirmed'] },
  { key: 'history', label: 'History', tone: '#757575', statuses: ['completed', 'cancelled'] },
];

export const boardTabFor = (status) => {
  const normalized = normalizeStatus(status);
  const tab = BOARD_TABS.find((t) => t.statuses.includes(normalized));
  return tab ? tab.key : null;
};

export const statusTone = (status) => {
  const normalized = normalizeStatus(status);
  if (normalized === 'cancelled') return '#C62828';
  if (normalized === 'completed') return '#2E7D32';
  return BOARD_TABS.find((t) => t.statuses.includes(normalized))?.tone || '#757575';
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_MS = 24 * 60 * 60 * 1000;

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/* A DATE column can arrive as "2026-09-19" or as a UTC instant for the previous
   evening. A plain YYYY-MM-DD is read field-by-field so the timezone cannot shift it. */
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

export const formatLongDate = (raw) => {
  const d = parseDeliveryDate(raw);
  return d ? `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}` : '-';
};

const formatBoardDate = (d) => {
  const base = `${WEEKDAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;
  return d.getFullYear() === new Date().getFullYear() ? base : `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

export const URGENCY_COLORS = {
  overdue: '#E53935',
  today: '#FB8C00',
  tomorrow: '#FB8C00',
  soon: '#1E88E5',
  later: '#43A047',
  unscheduled: '#9E9E9E',
};

// Urgency drives the card accent, its chip and the sort order. Negative days = overdue.
export const deliveryMeta = (order) => {
  const date = parseDeliveryDate(order?.expected_delivery);
  if (!date) return { date: null, days: null, bucket: 'unscheduled', chip: 'No date set', full: 'Not scheduled' };

  const days = Math.round((date - startOfDay(new Date())) / DAY_MS);
  const full = formatBoardDate(date);
  if (days < 0) {
    const late = Math.abs(days);
    return { date, days, bucket: 'overdue', chip: `${late} day${late === 1 ? '' : 's'} late`, full };
  }
  if (days === 0) return { date, days, bucket: 'today', chip: 'Due today', full };
  if (days === 1) return { date, days, bucket: 'tomorrow', chip: 'Due tomorrow', full };
  if (days <= 7) return { date, days, bucket: 'soon', chip: `In ${days} days`, full };
  return { date, days, bucket: 'later', chip: `In ${days} days`, full };
};

// Soonest first; orders with no date sort last in both directions.
export const byDelivery = (direction) => (a, b) => {
  const da = parseDeliveryDate(a.expected_delivery);
  const db = parseDeliveryDate(b.expected_delivery);
  if (!da && !db) return 0;
  if (!da) return 1;
  if (!db) return -1;
  const diff = da - db;
  if (diff !== 0) return direction === 'asc' ? diff : -diff;
  const oa = parseDeliveryDate(a.order_date);
  const ob = parseDeliveryDate(b.order_date);
  if (oa && ob && oa - ob !== 0) return oa - ob;
  return String(a.order_id || '').localeCompare(String(b.order_id || ''));
};

export const WINDOWS = [
  { key: 'all', label: 'All' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'Next 7 days' },
  { key: 'unscheduled', label: 'No date' },
];

export const inWindow = (order, windowKey) => {
  if (windowKey === 'all') return true;
  const { bucket, days } = deliveryMeta(order);
  switch (windowKey) {
    case 'overdue': return bucket === 'overdue';
    case 'today': return bucket === 'today';
    case 'week': return days !== null && days >= 0 && days <= 7;
    case 'unscheduled': return bucket === 'unscheduled';
    default: return true;
  }
};

export const peso = (value) => {
  const amount = Number(value) || 0;
  const [whole, cents] = Math.abs(amount).toFixed(2).split('.');
  return `${amount < 0 ? '-' : ''}₱${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${cents}`;
};

const calculateOrderTotal = (order) =>
  (order?.products || []).reduce(
    (sum, p) => sum + (parseFloat(p.unit_price) || 0) * (parseInt(p.quantity, 10) || 0),
    0
  );

export const orderTotal = (order) =>
  order?.total_cost && Number(order.total_cost) > 0 ? Number(order.total_cost) : calculateOrderTotal(order);

// Mirrors CANCELLABLE_STATUSES in Website/server/services/orderStock.js.
const CANCELLABLE = ['pending', 'orderplaced', 'orderpaid', 'tobepack', 'tobepacked', 'readyfordeliver', 'readyfordelivery'];
const STOCK_DEDUCTED = ['tobepack', 'tobepacked', 'readyfordeliver', 'readyfordelivery'];

export const isCancellable = (status) => CANCELLABLE.includes(normalizeStatus(status));
export const stockWasDeducted = (status) => STOCK_DEDUCTED.includes(normalizeStatus(status));

export const isPickupOrder = (order) =>
  order?.delivery_type === 'PICKUP' || order?.delivery_method === 'Customer Pick-up';

// Same check the Website runs (and the server enforces) before To Be Packed -> Ready for Delivery.
export const deliveryInfoComplete = (order) => {
  const hasDeliveryMethod = !!order?.delivery_method;
  const hasCourierInfo =
    !!order?.courier_name &&
    (!!order?.tracking_number ||
      (order?.tracking_link_available && !!order?.tracking_link) ||
      !!order?.tracking_unavailable_message);
  return hasDeliveryMethod && (isPickupOrder(order) || hasCourierInfo);
};
