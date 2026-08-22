import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import {
  getInvoiceEmailSubject,
  openGmailComposeForInvoice,
  openInvoicePdf,
  sendInvoiceEmailAutomatically,
} from './invoicePdf';

const CONFIRM_PHRASE = 'Send it';

export default function EmailInvoiceModal({ invoice, onClose }) {
  const [mode, setMode] = useState('choose');
  const [confirmText, setConfirmText] = useState('');
  const [sending, setSending] = useState(false);
  const confirmInputRef = useRef(null);

  useEffect(() => {
    if (mode === 'automatic' && confirmInputRef.current) {
      confirmInputRef.current.focus();
    }
  }, [mode]);

  if (!invoice) return null;

  const handleOpenGmail = () => {
    openInvoicePdf(invoice);
    openGmailComposeForInvoice(invoice);
    onClose();
  };

  const handleConfirmSend = async () => {
    if (confirmText.trim().toLowerCase() !== CONFIRM_PHRASE.toLowerCase()) return;
    setSending(true);
    try {
      const result = await sendInvoiceEmailAutomatically(invoice);
      toast.success(result?.message || 'Invoice emailed to client.');
      onClose();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to send invoice email.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="invoice-modal-backdrop">
      <div className="invoice-modal" style={{ maxWidth: 420 }}>
        <div className="invoice-modal-header">
          <div>
            <h2>Email Invoice</h2>
            <div className="invoice-number">{invoice.invoice_number}</div>
          </div>
          <button className="invoice-btn" onClick={onClose} disabled={sending}>Close</button>
        </div>
        <div className="invoice-modal-body">
          {mode === 'choose' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button className="invoice-btn primary" onClick={() => setMode('automatic')}>
                Automatic Send
              </button>
              <button className="invoice-btn" onClick={handleOpenGmail}>
                Open Gmail and Send
              </button>
            </div>
          )}
          {mode === 'automatic' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <p>
                This will immediately send the invoice PDF to{' '}
                <strong>{invoice.customer_email || invoice.order?.customer_email || 'the client'}</strong>{' '}
                with subject "<strong>{getInvoiceEmailSubject(invoice)}</strong>".
              </p>
              <p>Type <strong>{CONFIRM_PHRASE}</strong> below to confirm and prevent accidental duplicate sends.</p>
              <input
                ref={confirmInputRef}
                type="text"
                name="invoice-email-confirm-phrase"
                autoComplete="off"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
                placeholder={CONFIRM_PHRASE}
                disabled={sending}
                style={{
                  border: 'none',
                  padding: '12px 14px',
                  fontSize: 16,
                  borderRadius: 6,
                  background: '#f0f0f0',
                }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="invoice-btn" onClick={() => setMode('choose')} disabled={sending}>
                  Back
                </button>
                <button
                  className="invoice-btn primary"
                  onClick={handleConfirmSend}
                  disabled={sending || confirmText.trim().toLowerCase() !== CONFIRM_PHRASE.toLowerCase()}
                >
                  {sending ? 'Sending...' : 'Confirm Send'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
