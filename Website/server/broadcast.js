/**
 * broadcast.js
 * Shared module so route files can push real-time events to WS clients
 * without creating a circular dependency with index.js.
 *
 * index.js calls setWss(wss) once after the server starts.
 * Route files import { broadcastInventoryUpdate } and call it after mutations.
 */

const WebSocket = require('ws');

let _wss = null;

const setWss = (wss) => { _wss = wss; };

/**
 * Send an inventory event to every connected client (web AND mobile) so any
 * employee viewing the Inventory page — on either platform — sees the change
 * without a manual refresh. Only ever call this AFTER the DB write commits.
 */
const broadcastInventoryEvent = (type, payload = {}) => {
  if (!_wss) return;
  const msg = JSON.stringify({ type, ...payload, ts: Date.now() });
  _wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN && (client.clientType === 'web' || client.clientType === 'mobile')) {
      try { client.send(msg); } catch (_) {}
    }
  });
};

// Back-compat name — quantity change (stock in/out/adjustment) event.
// Kept as 'inventory_update' since that's the message `type` existing/older
// listeners would filter on.
const broadcastInventoryUpdate = (payload = {}) => broadcastInventoryEvent('inventory_update', payload);
const broadcastInventoryCreated = (payload = {}) => broadcastInventoryEvent('inventory_created', payload);
const broadcastInventoryArchived = (payload = {}) => broadcastInventoryEvent('inventory_archived', payload);
const broadcastInventoryRestored = (payload = {}) => broadcastInventoryEvent('inventory_restored', payload);

// Fired when staff save the "available products" selection (Website
// OrderProcess page), so any customer-facing screen — mobile Catalog,
// mobile "Create Mine", the website order page itself — refetches the
// curated availability list instead of showing a stale set until reload.
const broadcastAvailableInventoryUpdate = (payload = {}) => broadcastInventoryEvent('available_inventory_updated', payload);

/**
 * Route a barcode scan to the web peer of a given userId only.
 */
const routeBarcodeToWeb = (userId, barcode) => {
  if (!_wss) return;
  _wss.clients.forEach((client) => {
    if (
      client.readyState === WebSocket.OPEN &&
      client.userId === userId &&
      client.clientType === 'web'
    ) {
      try { client.send(JSON.stringify({ type: 'barcode_scanned', barcode })); } catch (_) {}
    }
  });
};

/**
 * Whether the opposite-type peer for this userId is currently connected —
 * used right after a client registers, so a client that connects SECOND
 * still finds out the first side is already there (notifyPeer alone only
 * tells whichever side was already connected when the OTHER one joins; the
 * newly-connecting client itself never learns the counterpart's state).
 */
const isPeerOnline = (userId, requesterType) => {
  if (!_wss) return false;
  const peerType = requesterType === 'web' ? 'mobile' : 'web';
  let found = false;
  _wss.clients.forEach((client) => {
    if (
      client.readyState === WebSocket.OPEN &&
      client.userId === userId &&
      client.clientType === peerType
    ) {
      found = true;
    }
  });
  return found;
};

/**
 * Notify the opposite-type peer of the sender (peer_connected / peer_disconnected).
 */
const notifyPeer = (userId, senderType, eventType) => {
  if (!_wss) return;
  const peerType = senderType === 'web' ? 'mobile' : 'web';
  _wss.clients.forEach((client) => {
    if (
      client.readyState === WebSocket.OPEN &&
      client.userId === userId &&
      client.clientType === peerType
    ) {
      try { client.send(JSON.stringify({ type: eventType })); } catch (_) {}
    }
  });
};

module.exports = {
  setWss,
  broadcastInventoryUpdate,
  broadcastInventoryCreated,
  broadcastInventoryArchived,
  broadcastInventoryRestored,
  broadcastAvailableInventoryUpdate,
  routeBarcodeToWeb,
  notifyPeer,
  isPeerOnline
};
