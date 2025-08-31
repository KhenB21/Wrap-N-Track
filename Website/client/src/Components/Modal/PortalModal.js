import React from 'react';
import ReactDOM from 'react-dom';
import './PortalModal.css';

export default function PortalModal({ children, onClose }) {
  if (typeof document === 'undefined') return null;

  return ReactDOM.createPortal(
    <div className="portal-modal-backdrop" onClick={onClose} role="presentation">
      <div className="portal-modal-content" onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>,
    document.body
  );
}
