import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import PortalModal from '../Components/Modal/PortalModal';
import './ConfirmDialog.css';

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [dialog, setDialog] = useState(null);
  const resolveRef = useRef(null);

  const confirm = useCallback((options) => {
    const {
      title = 'Please confirm',
      message = 'Are you sure?',
      confirmText = 'Confirm',
      cancelText = 'Cancel',
      danger = false,
    } = typeof options === 'string' ? { message: options } : (options || {});

    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setDialog({ title, message, confirmText, cancelText, danger });
    });
  }, []);

  const settle = useCallback((result) => {
    setDialog(null);
    if (resolveRef.current) {
      resolveRef.current(result);
      resolveRef.current = null;
    }
  }, []);

  const value = useMemo(() => ({ confirm }), [confirm]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      {dialog && (
        <PortalModal onClose={() => settle(false)}>
          <div className="confirm-dialog">
            <h3 className="confirm-dialog-title">{dialog.title}</h3>
            <p className="confirm-dialog-message">{dialog.message}</p>
            <div className="confirm-dialog-actions">
              <button
                type="button"
                className="confirm-dialog-btn confirm-dialog-btn-cancel"
                onClick={() => settle(false)}
              >
                {dialog.cancelText}
              </button>
              <button
                type="button"
                className={`confirm-dialog-btn ${dialog.danger ? 'confirm-dialog-btn-danger' : 'confirm-dialog-btn-confirm'}`}
                onClick={() => settle(true)}
                autoFocus
              >
                {dialog.confirmText}
              </button>
            </div>
          </div>
        </PortalModal>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return ctx.confirm;
}
