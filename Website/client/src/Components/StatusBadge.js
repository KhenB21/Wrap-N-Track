import React from 'react';
import './StatusBadge.css';

const TONE_MAP = {
  active: 'success',
  completed: 'success',
  healthy: 'success',
  verified: 'success',
  paid: 'success',
  delivered: 'success',
  inactive: 'warning',
  pending: 'warning',
  issued: 'warning',
  'to-be-packed': 'warning',
  'reorder-recommended': 'warning',
  archived: 'neutral',
  cancelled: 'danger',
  'out-of-stock': 'danger',
  unpaid: 'danger',
  overdue: 'danger',
  processing: 'info',
  'ready-to-ship': 'info',
  shipped: 'info'
};

const normalize = (status) => String(status || '').toLowerCase().replace(/\s+/g, '-');

/**
 * Unified pastel-pill status badge (matches the convention already dominant
 * in Customers/AccountManagement/OrderDetails). Pass either a known status
 * string (auto-mapped to a tone) or an explicit `tone` prop to override.
 */
export default function StatusBadge({ status, label, tone, icon }) {
  const resolvedTone = tone || TONE_MAP[normalize(status)] || 'neutral';
  return (
    <span className={`status-badge-ui tone-${resolvedTone}`}>
      {icon && <span aria-hidden="true">{icon}</span>}
      {label || status}
    </span>
  );
}
