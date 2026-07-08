import React, { useMemo, useState } from 'react';
import api from '../../api';
import './Invoices.css';

const paymentProviders = {
  'Bank Transfer': ['BPI', 'BDO', 'Metrobank', 'UnionBank', 'Security Bank', 'RCBC', 'PNB', 'Landbank', 'China Bank', 'Other Bank'],
  'E-Wallet': ['GCash', 'Maya', 'ShopeePay', 'GrabPay', 'Other E-Wallet'],
  Cash: ['Cash'],
  Other: ['Other'],
};

const peso = (value) => `PHP ${Number(value || 0).toLocaleString('en-PH', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})}`;

const moneyValue = (value) => {
  const amount = Number(value || 0);
  return Number.isFinite(amount) ? Math.round(amount * 100) / 100 : 0;
};

export default function PaymentModal({ invoice, onClose, onSaved }) {
  const amountOptions = useMemo(() => {
    if (!invoice) return [];
    const options = [
      {
        key: 'amount_due',
        label: `Invoice Amount Due (${peso(invoice.amount_due)})`,
        value: moneyValue(invoice.amount_due),
      },
    ];

    if (moneyValue(invoice.remaining_balance_amount) > 0) {
      options.push({
        key: 'remaining_balance',
        label: `Customer Remaining Balance (${peso(invoice.remaining_balance_amount)})`,
        value: moneyValue(invoice.remaining_balance_amount),
      });
    }

    if (moneyValue(invoice.down_payment_amount) > 0) {
      options.push({
        key: 'down_payment',
        label: `Down Payment Amount (${peso(invoice.down_payment_amount)})`,
        value: moneyValue(invoice.down_payment_amount),
      });
    }

    return options.filter((option, index, all) => (
      index === all.findIndex((candidate) => candidate.value === option.value)
    ));
  }, [invoice]);

  const [form, setForm] = useState({
    amount_paid: invoice?.amount_due || 0,
    amount_choice: 'amount_due',
    payment_method: invoice?.payment_method || 'Bank Transfer',
    payment_provider: invoice?.payment_provider || 'BPI',
    payment_reference: invoice?.payment_reference || '',
    payment_notes: invoice?.payment_notes || '',
  });
  const [proofFile, setProofFile] = useState(null);
  const [saving, setSaving] = useState(false);

  const providers = useMemo(() => paymentProviders[form.payment_method] || paymentProviders.Other, [form.payment_method]);

  const updateAmountChoice = (choice) => {
    const selected = amountOptions.find((option) => option.key === choice);
    setForm({
      ...form,
      amount_choice: choice,
      amount_paid: selected ? selected.value : '',
    });
  };

  const updateMethod = (method) => {
    const nextProviders = paymentProviders[method] || paymentProviders.Other;
    setForm({
      ...form,
      payment_method: method,
      payment_provider: nextProviders[0],
    });
  };

  const save = async () => {
    const amountPaid = Number(String(form.amount_paid).replace(/,/g, ''));
    if (!Number.isFinite(amountPaid) || amountPaid < Number(invoice.amount_due || 0)) {
      alert('Amount paid must be at least the invoice amount due.');
      return;
    }
    if (Number(invoice.amount_due || 0) > 0 && !form.payment_method) {
      alert('Payment method is required.');
      return;
    }

    const payload = new FormData();
    payload.append('amount_paid', amountPaid);
    payload.append('payment_method', form.payment_method);
    payload.append('payment_provider', form.payment_provider);
    payload.append('payment_reference', form.payment_reference);
    payload.append('payment_notes', form.payment_notes);
    if (proofFile) payload.append('payment_proof', proofFile);

    setSaving(true);
    try {
      await api.patch(`/api/invoices/${invoice.id}/mark-paid`, payload);
      onSaved();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to mark invoice as paid.');
    } finally {
      setSaving(false);
    }
  };

  if (!invoice) return null;

  return (
    <div className="invoice-modal-backdrop">
      <div className="invoice-modal">
        <div className="invoice-modal-header">
          <div>
            <h2>Mark as Paid</h2>
            <div className="invoice-number">{invoice.invoice_number}</div>
          </div>
          <button className="invoice-btn" onClick={onClose}>Close</button>
        </div>
        <div className="invoice-modal-body">
          <div className="invoice-form-grid">
            <label>
              Amount
              <select
                value={form.amount_choice}
                onChange={(e) => updateAmountChoice(e.target.value)}
              >
                {amountOptions.map((option) => (
                  <option key={option.key} value={option.key}>{option.label}</option>
                ))}
                <option value="custom">Custom Amount</option>
              </select>
            </label>
            {form.amount_choice === 'custom' && (
            <label>
              Custom Amount Paid
              <input
                type="text"
                inputMode="decimal"
                value={form.amount_paid}
                onChange={(e) => setForm({ ...form, amount_paid: e.target.value })}
                placeholder="0.00"
              />
            </label>
            )}
            <label>
              Payment Method
              <select value={form.payment_method} onChange={(e) => updateMethod(e.target.value)}>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="E-Wallet">E-Wallet</option>
                <option value="Cash">Cash</option>
                <option value="Other">Other</option>
              </select>
            </label>
            <label>
              Bank / E-Wallet
              <select
                value={form.payment_provider}
                onChange={(e) => setForm({ ...form, payment_provider: e.target.value })}
              >
                {providers.map((provider) => (
                  <option key={provider} value={provider}>{provider}</option>
                ))}
              </select>
            </label>
            <label>
              Reference Number
              <input
                value={form.payment_reference}
                onChange={(e) => setForm({ ...form, payment_reference: e.target.value })}
                placeholder="Transaction or receipt number"
              />
            </label>
            <label className="full">
              Proof of Payment
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,application/pdf"
                onChange={(e) => setProofFile(e.target.files?.[0] || null)}
              />
            </label>
            <label className="full">
              Payment Notes
              <textarea
                rows="3"
                value={form.payment_notes}
                onChange={(e) => setForm({ ...form, payment_notes: e.target.value })}
                placeholder="Optional notes, sender name, account name, or verification remarks"
              />
            </label>
          </div>
        </div>
        <div className="invoice-modal-footer">
          <button className="invoice-btn" onClick={onClose}>Cancel</button>
          <button className="invoice-btn success" onClick={save} disabled={saving}>
            Save Payment
          </button>
        </div>
      </div>
    </div>
  );
}
