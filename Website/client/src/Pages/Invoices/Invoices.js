import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Sidebar from '../../Components/Sidebar/Sidebar';
import TopBar from '../../Components/TopBar';
import withEmployeeAuth from '../../Components/withEmployeeAuth';
import usePermissions from '../../hooks/usePermissions';
import api from '../../api';
import './Invoices.css';
import { downloadPaymentProof, openInvoicePdf } from './invoicePdf';
import PaymentModal from './PaymentModal';

const peso = (value) => `PHP ${Number(value || 0).toLocaleString('en-PH', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})}`;

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString('en-PH');
};

const typeLabel = (type) => (
  type === 'DOWN_PAYMENT' ? 'Down Payment' : 'Remaining Balance'
);

function getProfilePictureUrl() {
  const user = JSON.parse(localStorage.getItem('user'));
  if (!user) return '/placeholder-profile.png';
  if (user.profile_picture_data) return `data:image/png;base64,${user.profile_picture_data}`;
  if (user.profile_picture_path) {
    if (user.profile_picture_path.startsWith('http')) return user.profile_picture_path;
    return `${process.env.REACT_APP_API_URL || ''}${user.profile_picture_path}`;
  }
  return '/placeholder-profile.png';
}

function StatusBadge({ status }) {
  return <span className={`invoice-status ${status || ''}`}>{status || 'UNPAID'}</span>;
}

function InvoicePreviewModal({ invoice, onClose, onMarkPaid, onCancel }) {
  if (!invoice) return null;

  return (
    <div className="invoice-modal-backdrop">
      <div className="invoice-modal">
        <div className="invoice-modal-header">
          <div>
            <h2>{typeLabel(invoice.invoice_type)} Invoice</h2>
            <div className="invoice-number">{invoice.invoice_number}</div>
          </div>
          <button className="invoice-btn" onClick={onClose}>Close</button>
        </div>
        <div className="invoice-modal-body">
          <div className="invoice-preview-grid">
            <div><span>Status</span><strong><StatusBadge status={invoice.status} /></strong></div>
            <div><span>Order Number</span><strong>{invoice.order_id}</strong></div>
            <div><span>Customer</span><strong>{invoice.customer_name || 'Customer'}</strong></div>
            <div><span>Customer Email</span><strong>{invoice.customer_email || '-'}</strong></div>
            <div><span>Total Order Amount</span><strong>{peso(invoice.total_order_amount)}</strong></div>
            <div><span>Amount Due</span><strong>{peso(invoice.amount_due)}</strong></div>
            <div><span>Amount Paid</span><strong>{peso(invoice.amount_paid)}</strong></div>
            <div><span>Issued Date</span><strong>{formatDate(invoice.issued_at)}</strong></div>
            <div><span>Due Date</span><strong>{formatDate(invoice.due_date)}</strong></div>
            <div><span>Paid Date</span><strong>{formatDate(invoice.paid_at)}</strong></div>
            <div><span>Payment Method</span><strong>{invoice.payment_method || '-'}</strong></div>
            <div><span>Bank / E-Wallet</span><strong>{invoice.payment_provider || '-'}</strong></div>
            <div><span>Payment Reference</span><strong>{invoice.payment_reference || '-'}</strong></div>
            <div><span>Proof of Payment</span><strong>{invoice.payment_proof_original_name || '-'}</strong></div>
          </div>
        </div>
        <div className="invoice-modal-footer">
          <button className="invoice-btn" onClick={() => openInvoicePdf(invoice)}>Download PDF</button>
          <button className="invoice-btn" onClick={() => openInvoicePdf(invoice, true)}>Print Invoice</button>
          {invoice.status !== 'PAID' && invoice.status !== 'CANCELLED' && (
            <button className="invoice-btn success" onClick={() => onMarkPaid(invoice)}>Mark as Paid</button>
          )}
          {invoice.payment_proof_original_name && (
            <button className="invoice-btn" onClick={() => downloadPaymentProof(invoice)}>Download Proof</button>
          )}
          {invoice.status !== 'CANCELLED' && (
            <button className="invoice-btn danger" onClick={() => onCancel(invoice)}>Cancel Invoice</button>
          )}
        </div>
      </div>
    </div>
  );
}

function Invoices() {
  const { checkPermission } = usePermissions();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ invoice_type: '', status: '', customer: '', order: '' });
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [paymentInvoice, setPaymentInvoice] = useState(null);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.append(key, value);
    });
    return params.toString();
  }, [filters]);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get(`/api/invoices${queryString ? `?${queryString}` : ''}`);
      setInvoices(response.data?.invoices || []);
    } catch (error) {
      console.error('Failed to fetch invoices:', error);
      alert(error.response?.data?.message || 'Failed to fetch invoices.');
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  }, [queryString]);

  useEffect(() => {
    checkPermission('invoices');
  }, [checkPermission]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const cancelInvoice = async (invoice) => {
    if (!window.confirm(`Cancel invoice ${invoice.invoice_number}?`)) return;
    try {
      await api.patch(`/api/invoices/${invoice.id}/status`, { status: 'CANCELLED' });
      setSelectedInvoice(null);
      await fetchInvoices();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to cancel invoice.');
    }
  };

  return (
    <div className="invoices-page">
      <Sidebar />
      <div className="invoices-main">
        <TopBar avatarUrl={getProfilePictureUrl()} />
        <div className="invoices-content">
          <div className="invoices-header">
            <div>
              <h1>Invoice Generation</h1>
              <p>Generate, track, download, and print order invoices.</p>
            </div>
            <button className="invoice-btn primary" onClick={fetchInvoices} disabled={loading}>
              Refresh
            </button>
          </div>

          <div className="invoice-filters">
            <select value={filters.invoice_type} onChange={(e) => setFilters({ ...filters, invoice_type: e.target.value })}>
              <option value="">All invoice types</option>
              <option value="DOWN_PAYMENT">Down Payment</option>
              <option value="REMAINING_BALANCE">Remaining Balance</option>
            </select>
            <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
              <option value="">All statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="ISSUED">Issued</option>
              <option value="UNPAID">Unpaid</option>
              <option value="PAID">Paid</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
            <input
              value={filters.customer}
              onChange={(e) => setFilters({ ...filters, customer: e.target.value })}
              placeholder="Search customer"
            />
            <input
              value={filters.order}
              onChange={(e) => setFilters({ ...filters, order: e.target.value })}
              placeholder="Search order number"
            />
          </div>

          <div className="invoice-table-wrap">
            <table className="invoice-table">
              <thead>
                <tr>
                  <th>Invoice Number</th>
                  <th>Type</th>
                  <th>Order Number</th>
                  <th>Customer</th>
                  <th>Total Order</th>
                  <th>Amount Due</th>
                  <th>Amount Paid</th>
                  <th>Status</th>
                  <th>Issued</th>
                  <th>Due</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td className="invoice-number">{invoice.invoice_number}</td>
                    <td>{typeLabel(invoice.invoice_type)}</td>
                    <td>{invoice.order_id}</td>
                    <td>{invoice.customer_name || 'Customer'}</td>
                    <td>{peso(invoice.total_order_amount)}</td>
                    <td>{peso(invoice.amount_due)}</td>
                    <td>{peso(invoice.amount_paid)}</td>
                    <td><StatusBadge status={invoice.status} /></td>
                    <td>{formatDate(invoice.issued_at)}</td>
                    <td>{formatDate(invoice.due_date)}</td>
                    <td>
                      <div className="invoice-actions">
                        <button className="invoice-btn" onClick={() => setSelectedInvoice(invoice)}>View</button>
                        <button className="invoice-btn" onClick={() => openInvoicePdf(invoice)}>Download PDF</button>
                        <button className="invoice-btn" onClick={() => openInvoicePdf(invoice, true)}>Print</button>
                        {invoice.status !== 'PAID' && invoice.status !== 'CANCELLED' && (
                          <button className="invoice-btn success" onClick={() => setPaymentInvoice(invoice)}>Mark Paid</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {!invoices.length && (
                  <tr>
                    <td colSpan="11">{loading ? 'Loading invoices...' : 'No invoices found.'}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <InvoicePreviewModal
        invoice={selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
        onMarkPaid={(invoice) => {
          setSelectedInvoice(null);
          setPaymentInvoice(invoice);
        }}
        onCancel={cancelInvoice}
      />
      <PaymentModal
        invoice={paymentInvoice}
        onClose={() => setPaymentInvoice(null)}
        onSaved={async () => {
          setPaymentInvoice(null);
          await fetchInvoices();
        }}
      />
    </div>
  );
}

export default withEmployeeAuth(Invoices);
