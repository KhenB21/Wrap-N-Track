// Checks that asking for more than is in stock (cart add/update) never shows the
// customer the stock number, and notifies every employee instead.
// Run with: node test-cart-overstock.js   (no database required — the pool is stubbed)
const path = require('path');

process.env.JWT_SECRET = 'test-secret';

// ── Stub the pg pool ─────────────────────────────────────────────────────────
const STOCK = 78;
const queries = [];
let notifications = [];
const dbPath = require.resolve(path.join(__dirname, 'config/db.js'));
require.cache[dbPath] = {
  id: dbPath, filename: dbPath, loaded: true,
  exports: {
    query: async (sql, params = []) => {
      queries.push(sql);
      if (/FROM inventory_items WHERE sku/.test(sql)) {
        return { rows: [{ sku: 'OS-000002', name: 'Black Box', unit_price: '210.00', stock_quantity: STOCK }] };
      }
      if (/SELECT quantity FROM customer_cart/.test(sql)) return { rows: [{ quantity: 70 }] };
      if (/SELECT user_id FROM users/.test(sql)) return { rows: [{ user_id: 1 }, { user_id: 2 }] };
      if (/SELECT name FROM customer_details/.test(sql)) return { rows: [{ name: 'Kathlene Fernandez' }] };
      if (/SELECT id FROM notifications/.test(sql)) return { rows: [] };
      if (/INSERT INTO notifications/.test(sql)) {
        const row = { user_id: params[0], title: params[1], message: params[2], type: params[3], category: params[5] };
        notifications.push(row);
        return { rows: [row] };
      }
      return { rows: [], rowCount: 1 };
    },
  },
};

const express = require('express');
const jwt = require('jsonwebtoken');
// Quiet the middleware's request logging.
const origLog = console.log;
console.log = (...a) => (String(a[0]).startsWith('[verifyJwt]') ? undefined : origLog(...a));
const cartRouter = require('./routes/cart');

const app = express();
app.use(express.json());
app.use('/api/cart', cartRouter);

let failures = 0;
const check = (name, cond, extra) => {
  if (cond) origLog(`  PASS  ${name}`);
  else { failures++; origLog(`  FAIL  ${name}`, extra !== undefined ? JSON.stringify(extra) : ''); }
};

const server = app.listen(0, async () => {
  const base = `http://127.0.0.1:${server.address().port}/api/cart`;
  const token = jwt.sign({ customer_id: 42, role: 'customer' }, process.env.JWT_SECRET);
  const call = (method, route, body) =>
    fetch(`${base}${route}`, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    }).then(async (r) => ({ status: r.status, body: await r.json() }));

  origLog('\nCart: changing quantity above stock');
  notifications = [];
  let r = await call('PUT', '/update', { sku: 'OS-000002', quantity: 780 });
  check('rejected with 400 + insufficient_stock code', r.status === 400 && r.body.code === 'insufficient_stock', r);
  check('customer message does NOT contain the stock number', !r.body.message.includes(String(STOCK)), r.body.message);
  check('customer is told the team was notified', /team has been notified/i.test(r.body.message), r.body.message);
  check('every employee gets a notification', notifications.length === 2, notifications);
  check('notification names the customer, product, requested qty and stock',
    /Kathlene Fernandez/.test(notifications[0]?.message) && /Black Box/.test(notifications[0]?.message)
      && /780/.test(notifications[0]?.message) && /78 are in stock/.test(notifications[0]?.message), notifications[0]);
  check('one notification thread per product (category has the sku)', notifications[0]?.category === 'over_stock:OS-000002', notifications[0]);

  origLog('\nCart: quantity within stock');
  notifications = [];
  r = await call('PUT', '/update', { sku: 'OS-000002', quantity: 5 });
  check('accepted', r.status === 200 && r.body.success, r);
  check('no notification sent', notifications.length === 0, notifications);

  origLog('\nCart: adding more on top of what is already in the cart');
  notifications = [];
  r = await call('POST', '/add', { sku: 'OS-000002', quantity: 20 });
  check('rejected (70 in cart + 20 > 78)', r.status === 400 && r.body.code === 'insufficient_stock', r);
  check('no "more available" number leaked', !/\d+ more available/.test(r.body.message) && !r.body.message.includes('8'), r.body.message);
  check('employees notified with the total requested (90)', /90/.test(notifications[0]?.message || ''), notifications[0]);

  origLog(failures ? `\n${failures} check(s) failed` : '\nAll checks passed');
  server.close();
  process.exit(failures ? 1 : 0);
});
