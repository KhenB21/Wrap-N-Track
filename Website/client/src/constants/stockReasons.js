// Stock In / Stock Out rules shared by every web screen that moves stock.
// Keep in sync with Mobile/src/constants/stockReasons.js and the
// requireStockAdjust guard in Website/server/routes/inventory.js.

export const STOCK_ADJUST_ROLES = ['admin', 'super_admin', 'operations_manager'];

export const canAdjustStockRole = (role) => STOCK_ADJUST_ROLES.includes(String(role || '').toLowerCase());

export const STOCK_REASONS = {
  STOCK_IN: ['Supplier Delivery / Restock', 'Customer Return', 'Inventory Count Correction', 'Other'],
  STOCK_OUT: ['Damaged', 'Expired', 'Lost / Missing', 'Inventory Count Correction', 'Internal Use / Sample', 'Other'],
};

// Returns an error message, or null when the reason is complete.
export const validateStockReason = (reason, notes) => {
  if (!reason) return 'Select a reason for this stock adjustment.';
  if (reason === 'Other' && String(notes || '').trim().length < 3) {
    return 'Describe the reason when "Other" is selected.';
  }
  return null;
};

// The single text the server stores in stock_movements.reason.
export const buildStockReason = (reason, notes) => {
  const detail = String(notes || '').trim();
  if (reason === 'Other') return detail;
  return detail ? `${reason} - ${detail}` : reason;
};
