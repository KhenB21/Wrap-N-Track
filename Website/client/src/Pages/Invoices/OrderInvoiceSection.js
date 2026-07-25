import React, { useEffect, useState, useCallback } from 'react';
import api from '../../api';
import './Invoices.css';
import { downloadPaymentProof, openInvoicePdf } from './invoicePdf';
import PaymentModal from './PaymentModal';

const peso = (value) => `PHP ${Number(value || 0).toLocaleString('en-PH', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})}`;
const DOWN_PAYMENT_RATE = 0.7;

const labelForType = (type) => (
  type === 'DOWN_PAYMENT' ? 'Down Payment Invoice' : 'Remaining Balance Invoice'
);

const invoiceAmountLabel = (invoice) => (
  invoice?.invoice_type === 'DOWN_PAYMENT' ? 'Down Payment Invoice' : 'Remaining Balance Invoice'
);

function StatusBadge({ status }) {
  return <span className={`invoice-status ${status || ''}`}>{status || 'UNPAID'}</span>;
}

function DownPaymentConfirmModal({ orderTotal, downPayment, remainingBalance, onCancel, onConfirm, loading }) {
  return (
    <div className="invoice-modal-backdrop">
      <div className="invoice-modal">
        <div className="invoice-modal-header">
          <div>
            <h2>Generate Down Payment Invoice</h2>
            <div className="invoice-number">70% down payment, 30% remaining balance</div>
          </div>
          <button className="invoice-btn" onClick={onCancel} disabled={loading}>Close</button>
        </div>
        <div className="invoice-modal-body">
          <div className="invoice-summary-box">
            <div className="invoice-summary-row">
              <span>Order Total</span>
              <strong>{peso(orderTotal)}</strong>
            </div>
            <div className="invoice-summary-row">
              <span>Down Payment Invoice</span>
              <strong>{peso(downPayment)}</strong>
            </div>
            <div className="invoice-summary-row">
              <span>Remaining Balance</span>
              <strong>{peso(remainingBalance)}</strong>
            </div>
          </div>
        </div>
        <div className="invoice-modal-footer">
          <button className="invoice-btn" onClick={onCancel} disabled={loading}>Cancel</button>
          <button className="invoice-btn primary" onClick={onConfirm} disabled={loading}>
            Generate Invoice
          </button>
        </div>
      </div>
    </div>
  );
}

export default function OrderInvoiceSection({ order }) {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [paymentInvoice, setPaymentInvoice] = useState(null);
  const [showDownPaymentModal, setShowDownPaymentModal] = useState(false);

  const orderId = order?.order_id;
  const downPayment = invoices.find((invoice) => invoice.invoice_type === 'DOWN_PAYMENT' && invoice.status !== 'CANCELLED');
  const remainingBalance = invoices.find((invoice) => invoice.invoice_type === 'REMAINING_BALANCE' && invoice.status !== 'CANCELLED');
  const orderTotal = Number(order?.total_cost || 0);
  const computedDownPayment = Math.round(orderTotal * DOWN_PAYMENT_RATE * 100) / 100;
  const computedRemainingBalance = Math.max(0, Math.round((orderTotal - computedDownPayment) * 100) / 100);
  const canGenerateRemainingBalance = orderTotal > 0 && downPayment && downPayment.status === 'PAID';

  const fetchInvoices = useCallback(async () => {
    if (!orderId) return;
    try {
      const response = await api.get(`/api/orders/${encodeURIComponent(orderId)}/invoices`);
      setInvoices(response.data?.invoices || []);
    } catch (error) {
      console.error('Failed to fetch order invoices:', error);
      setInvoices([]);
    }
  }, [orderId]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const generateDownPayment = async () => {
    if (!orderTotal || orderTotal <= 0) {
      alert('Order total is required before generating a down payment invoice.');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post(`/api/orders/${encodeURIComponent(orderId)}/invoices/down-payment`);
      alert(response.data?.existing ? 'Down payment invoice already exists.' : 'Down payment invoice generated.');
      setShowDownPaymentModal(false);
      await fetchInvoices();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to generate down payment invoice.');
    } finally {
      setLoading(false);
    }
  };

  const generateRemainingBalance = async () => {
    if (!orderTotal || orderTotal <= 0) {
      alert('Order total is required before generating a remaining balance invoice.');
      return;
    }
    if (!downPayment || downPayment.status !== 'PAID') {
      alert('The down payment invoice must be paid before generating the remaining balance invoice.');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post(`/api/orders/${encodeURIComponent(orderId)}/invoices/remaining-balance`);
      alert(response.data?.existing ? 'Remaining balance invoice already exists.' : 'Remaining balance invoice generated.');
      await fetchInvoices();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to generate remaining balance invoice.');
    } finally {
      setLoading(false);
    }
  };

  const cancelInvoice = async (invoice) => {
    if (!window.confirm(`Cancel invoice ${invoice.invoice_number}?`)) return;
    setLoading(true);
    try {
      await api.patch(`/api/invoices/${invoice.id}/status`, { status: 'CANCELLED' });
      await fetchInvoices();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to cancel invoice.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="order-invoice-section">
      <h3>Invoice Generation</h3>
      {invoices.length === 0 && (
        <div className="order-invoice-empty">No invoices generated for this order yet.</div>
      )}
      {orderTotal > 0 && (
        <div className="order-invoice-empty">
          Required split: 70% down payment ({peso(computedDownPayment)}) and 30% remaining balance ({peso(computedRemainingBalance)}).
        </div>
      )}

      <div className="order-invoice-list">
        {invoices.map((invoice) => (
          <div className="order-invoice-row" key={invoice.id}>
            <div className="order-invoice-row-top">
              <div>
                <div className="invoice-number">{invoice.invoice_number}</div>
                <div>{labelForType(invoice.invoice_type)}</div>
                <div>{invoiceAmountLabel(invoice)}: <strong>{peso(invoice.invoice_amount)}</strong></div>
                <div className="invoice-balance-cell">Remaining Balance: <strong>{peso(invoice.remaining_balance_amount)}</strong></div>
                <div>Amount Paid: <strong>{peso(invoice.amount_paid)}</strong></div>
                <div>Payment Status: <strong>{invoice.payment_status || '-'}</strong></div>
              </div>
              <StatusBadge status={invoice.status} />
            </div>
            <div className="order-invoice-actions">
              <button className="invoice-btn" onClick={() => openInvoicePdf(invoice)}>Download PDF</button>
              <button className="invoice-btn" onClick={() => openInvoicePdf(invoice, true)}>Print Invoice</button>
              {invoice.status !== 'PAID' && invoice.status !== 'CANCELLED' && (
                <button className="invoice-btn success" onClick={() => setPaymentInvoice(invoice)} disabled={loading}>Mark as Paid</button>
              )}
              {invoice.payment_proof_original_name && (
                <button className="invoice-btn" onClick={() => downloadPaymentProof(invoice)}>Download Proof</button>
              )}
              {invoice.status !== 'CANCELLED' && (
                <button className="invoice-btn danger" onClick={() => cancelInvoice(invoice)} disabled={loading}>Cancel</button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="order-invoice-actions" style={{ marginTop: 12 }}>
        {!downPayment ? (
          <button
            className="invoice-btn primary"
            onClick={() => setShowDownPaymentModal(true)}
            disabled={loading || !orderId || !orderTotal}
          >
            Generate Down Payment Invoice
          </button>
        ) : (
          <button className="invoice-btn" onClick={() => openInvoicePdf(downPayment)}>
            View Down Payment PDF
          </button>
        )}
        {!remainingBalance ? (
          <button className="invoice-btn primary" onClick={generateRemainingBalance} disabled={loading || !orderId || !canGenerateRemainingBalance}>
            Generate Remaining Balance Invoice
          </button>
        ) : (
          <button className="invoice-btn" onClick={() => openInvoicePdf(remainingBalance)}>
            View Remaining Balance PDF
          </button>
        )}
      </div>
      <PaymentModal
        invoice={paymentInvoice}
        onClose={() => setPaymentInvoice(null)}
        onSaved={async () => {
          setPaymentInvoice(null);
          await fetchInvoices();
        }}
      />
      {showDownPaymentModal && (
        <DownPaymentConfirmModal
          orderTotal={orderTotal}
          downPayment={computedDownPayment}
          remainingBalance={computedRemainingBalance}
          loading={loading}
          onCancel={() => setShowDownPaymentModal(false)}
          onConfirm={generateDownPayment}
        />
      )}
    </section>
  );
}
