import React from 'react';
import './EmptyState.css';

/**
 * Unified icon + heading + helper-text empty state (matches the convention
 * already used in Customers/SupplierDetails/AccountManagement).
 */
export default function EmptyState({ icon = '📭', title, message, action }) {
  return (
    <div className="empty-state-ui">
      <span className="empty-state-ui-icon" aria-hidden="true">{icon}</span>
      {title && <h3 className="empty-state-ui-title">{title}</h3>}
      {message && <p className="empty-state-ui-message">{message}</p>}
      {action && <div className="empty-state-ui-action">{action}</div>}
    </div>
  );
}
