import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Sidebar from '../../Components/Sidebar/Sidebar';
import TopBar from '../../Components/TopBar';
import withEmployeeAuth from '../../Components/withEmployeeAuth';
import usePermissions from '../../hooks/usePermissions';
import api from '../../api';
import { useConfirm } from '../../Context/ConfirmContext';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './Invoices.css';
import { downloadPaymentProof, openInvoicePdf } from './invoicePdf';
import PaymentModal from './PaymentModal';
import EmailInvoiceModal from './EmailInvoiceModal';

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

const invoiceAmountLabel = (invoice) => (
  invoice?.invoice_type === 'DOWN_PAYMENT' ? 'Down Payment Invoice' : 'Remaining Balance Invoice'
);

function InvoicePreviewModal({ invoice, onClose, onMarkPaid, onCancel }) {
  const [showEmailModal, setShowEmailModal] = useState(false);

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
            <div><span>{invoiceAmountLabel(invoice)}</span><strong>{peso(invoice.invoice_amount)}</strong></div>
            <div><span>Total Verified Payments</span><strong>{peso(invoice.total_verified_payments)}</strong></div>
            <div className="invoice-balance-highlight"><span>Remaining Balance</span><strong>{peso(invoice.remaining_balance_amount)}</strong></div>
            <div><span>Payment Status</span><strong>{invoice.payment_status || '-'}</strong></div>
            <div><span>Amount Paid</span><strong>{peso(invoice.amount_paid)}</strong></div>
            <div><span>Issued Date</span><strong>{formatDate(invoice.issued_at)}</strong></div>
            {/* <div><span>Due Date</span><strong>{formatDate(invoice.due_date)}</strong></div> */}
            <div><span>Paid Date</span><strong>{formatDate(invoice.paid_at)}</strong></div>
            <div><span>Payment Method</span><strong>{invoice.payment_method || '-'}</strong></div>
            <div><span>Bank / E-Wallet</span><strong>{invoice.payment_provider || '-'}</strong></div>
            <div><span>Payment Reference</span><strong>{invoice.payment_reference || '-'}</strong></div>
            <div><span>Proof of Payment</span><strong>{invoice.payment_proof_original_name || '-'}</strong></div>
          </div>
        </div>
        <div className="invoice-modal-footer">
          <button className="invoice-btn" onClick={() => openInvoicePdf(invoice)}>Download PDF</button>
          <button
            className="invoice-btn"
            onClick={() => openInvoicePdf(invoice, true)}
            disabled={invoice.status !== 'PAID'}
            title={invoice.status !== 'PAID' ? 'Mark this invoice as paid before printing it.' : undefined}
          >
            Print Invoice
          </button>
          <button
            className="invoice-btn"
            onClick={() => setShowEmailModal(true)}
            disabled={invoice.status !== 'PAID'}
            title={invoice.status !== 'PAID' ? 'Mark this invoice as paid before emailing it to the client.' : undefined}
          >
            Email to Client
          </button>
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
      {showEmailModal && (
        <EmailInvoiceModal invoice={invoice} onClose={() => setShowEmailModal(false)} />
      )}
    </div>
  );
}

function Invoices() {
  const { checkPermission } = usePermissions();
  const confirm = useConfirm();
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
      toast.error(error.response?.data?.message || 'Failed to fetch invoices.');
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
    if (!(await confirm({ message: `Cancel invoice ${invoice.invoice_number}?`, danger: true }))) return;
    try {
      await api.patch(`/api/invoices/${invoice.id}/status`, { status: 'CANCELLED' });
      setSelectedInvoice(null);
      await fetchInvoices();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to cancel invoice.');
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
                  <th>Invoice Amount</th>
                  <th>Remaining Balance</th>
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
                    <td className="invoice-number" data-label="Invoice Number">{invoice.invoice_number}</td>
                    <td data-label="Type">{typeLabel(invoice.invoice_type)}</td>
                    <td data-label="Order Number">{invoice.order_id}</td>
                    <td data-label="Customer">{invoice.customer_name || 'Customer'}</td>
                    <td data-label="Total Order">{peso(invoice.total_order_amount)}</td>
                    <td data-label="Invoice Amount">{peso(invoice.invoice_amount)}</td>
                    <td className="invoice-balance-cell" data-label="Remaining Balance">{peso(invoice.remaining_balance_amount)}</td>
                    <td data-label="Amount Paid">{peso(invoice.amount_paid)}</td>
                    <td data-label="Status"><StatusBadge status={invoice.status} /></td>
                    <td data-label="Issued">{formatDate(invoice.issued_at)}</td>
                    <td data-label="Due">{formatDate(invoice.due_date)}</td>
                    <td data-label="Actions">
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
                    <td colSpan="12">{loading ? 'Loading invoices...' : 'No invoices found.'}</td>
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
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} newestOnTop />
    </div>
  );
}

export default withEmployeeAuth(Invoices);
