import React from 'react';
import './Pagination.css';

const getPageNumbers = (page, totalPages, maxButtons = 5) => {
  if (totalPages <= maxButtons) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const half = Math.floor(maxButtons / 2);
  let start = Math.max(1, page - half);
  let end = Math.min(totalPages, start + maxButtons - 1);
  start = Math.max(1, end - maxButtons + 1);
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
};

/**
 * Unified pagination control. Works for both client-side numbered pagination
 * (pass `showNumbers`) and simple server-driven Prev/Next+"Page X of Y"
 * pagination (omit `showNumbers`) — the caller's own pagination *state*
 * (client-side slice vs. server {page,pages,total}) is unchanged; this
 * component only renders the controls.
 */
export default function Pagination({ page, totalPages, onPageChange, showNumbers = false }) {
  if (!totalPages || totalPages <= 1) return null;

  const goTo = (p) => {
    const clamped = Math.max(1, Math.min(totalPages, p));
    if (clamped !== page) onPageChange(clamped);
  };

  return (
    <nav className="pagination-ui" aria-label="Pagination">
      <button
        type="button"
        className="pagination-ui-btn"
        onClick={() => goTo(page - 1)}
        disabled={page <= 1}
      >
        ← Previous
      </button>

      {showNumbers ? (
        <div className="pagination-ui-numbers">
          {getPageNumbers(page, totalPages).map((num) => (
            <button
              key={num}
              type="button"
              className={`pagination-ui-number${num === page ? ' active' : ''}`}
              onClick={() => goTo(num)}
              aria-current={num === page ? 'page' : undefined}
            >
              {num}
            </button>
          ))}
        </div>
      ) : (
        <span className="pagination-ui-info">Page {page} of {totalPages}</span>
      )}

      <button
        type="button"
        className="pagination-ui-btn"
        onClick={() => goTo(page + 1)}
        disabled={page >= totalPages}
      >
        Next →
      </button>
    </nav>
  );
}
