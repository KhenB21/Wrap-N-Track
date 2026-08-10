import React, { useState, useEffect, useMemo } from 'react';
import api from '../../api';
import PortalModal from '../../Components/Modal/PortalModal';
import { defaultProductNames } from '../CustomerPOV/CarloPreview.js';
import './AddOrderModal.css';

// "Carlo" is the one pre-existing preset package convention already used elsewhere in
// the app (see CarloPreview.js / the Edit Order product table's package_name === 'Carlo'
// filter). Package Order stays convention-based for this pass rather than introducing a
// normalized packages/package_items table, per the approved implementation plan.
const PACKAGE_PRESETS = ['Carlo'];
const ORDER_STATUSES = ['Pending', 'To Be Pack', 'Ready to ship', 'En Route', 'Completed', 'Invoice', 'Cancelled'];
const PAYMENT_METHODS = ['Cash', 'Online Banking', 'E-Wallet', 'Bank Transfer'];

function generateOrderId() {
  const now = Date.now();
  const rand = Math.floor(Math.random() * 900) + 100;
  return `#CO${now}${rand}`;
}

const formatCurrency = (value) => {
  const amount = Number(value) || 0;
  return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const emptyFields = () => ({
  order_id: generateOrderId(),
  account_name: '',
  email_address: '',
  telephone: '',
  cellphone: '',
  shipped_to: '',
  shipping_address: '',
  order_date: new Date().toISOString().slice(0, 10),
  expected_delivery: '',
  status: 'Pending',
  payment_method: 'Cash',
  remarks: '',
  order_quantity: 1
});

export default function AddOrderModal({ isOpen, onClose, inventory, onCreated }) {
  const [orderType, setOrderType] = useState('custom'); // 'package' | 'custom'
  const [packageName, setPackageName] = useState('');

  const [customerMode, setCustomerMode] = useState('existing'); // 'existing' | 'new'
  const [customers, setCustomers] = useState([]);
  const [customerQuery, setCustomerQuery] = useState('');
  const [showCustomerResults, setShowCustomerResults] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const [fields, setFields] = useState(emptyFields);
  const [productSearch, setProductSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setOrderType('custom');
    setPackageName('');
    setCustomerMode('existing');
    setCustomerQuery('');
    setSelectedCustomer(null);
    setFields(emptyFields());
    setProductSearch('');
    setCategoryFilter('all');
    setSelectedProducts([]);
    setFormError('');
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    api.get('/api/customers')
      .then((res) => { if (!cancelled) setCustomers(Array.isArray(res.data) ? res.data : []); })
      .catch((err) => console.error('Error fetching customers for Add Order:', err));
    return () => { cancelled = true; };
  }, [isOpen]);

  // Package Order: auto-load the preset's product list. Products already on the list
  // that were manually added stay; defaults are only added once per package selection.
  useEffect(() => {
    if (orderType !== 'package' || !packageName || packageName !== 'Carlo') return;
    const matches = (inventory || []).filter((item) =>
      defaultProductNames.some((presetName) =>
        (item.name || '').toLowerCase().includes(presetName.toLowerCase()) ||
        presetName.toLowerCase().includes((item.name || '').toLowerCase())
      )
    );
    setSelectedProducts(matches.map((item) => ({
      sku: item.sku,
      name: item.name,
      unit_price: Number(item.unit_price) || 0,
      quantity: 1,
      image_data: item.image_data,
      isPackageDefault: true,
      availableQty: Number(item.quantity) || 0
    })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderType, packageName]);

  const filteredCustomers = useMemo(() => {
    if (!customerQuery.trim()) return customers.slice(0, 8);
    const term = customerQuery.toLowerCase();
    return customers.filter((c) =>
      (c.name || '').toLowerCase().includes(term) ||
      (c.email_address || '').toLowerCase().includes(term) ||
      (c.cellphone || c.phone_number || '').includes(term)
    ).slice(0, 8);
  }, [customers, customerQuery]);

  const categories = useMemo(() => {
    const set = new Set();
    (inventory || []).forEach((item) => { if (item.category) set.add(item.category); });
    return Array.from(set).sort();
  }, [inventory]);

  const selectedSkus = useMemo(() => new Set(selectedProducts.map((p) => p.sku)), [selectedProducts]);

  const availableProducts = useMemo(() => {
    let list = inventory || [];
    if (categoryFilter !== 'all') list = list.filter((item) => item.category === categoryFilter);
    if (productSearch.trim()) {
      const term = productSearch.toLowerCase();
      list = list.filter((item) =>
        (item.name || '').toLowerCase().includes(term) ||
        (item.sku || '').toLowerCase().includes(term)
      );
    }
    return list;
  }, [inventory, categoryFilter, productSearch]);

  const totalCost = useMemo(() => selectedProducts.reduce(
    (sum, p) => sum + (Number(p.unit_price) || 0) * (Number(p.quantity) || 0), 0
  ), [selectedProducts]);
  const downPayment = Math.round(totalCost * 0.7 * 100) / 100;
  const remainingBalance = Math.round((totalCost - downPayment) * 100) / 100;

  const handleFieldChange = (e) => {
    const { name, value } = e.target;
    setFields((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectCustomer = (customer) => {
    setSelectedCustomer(customer);
    setCustomerQuery(customer.name || '');
    setShowCustomerResults(false);
    setFields((prev) => ({
      ...prev,
      account_name: customer.name || prev.account_name,
      email_address: customer.email_address || prev.email_address,
      cellphone: customer.cellphone || customer.phone_number || prev.cellphone,
      telephone: customer.telephone || prev.telephone,
      shipped_to: prev.shipped_to || customer.name || '',
      shipping_address: prev.shipping_address || customer.address || ''
    }));
  };

  const handleClearCustomer = () => {
    setSelectedCustomer(null);
    setCustomerQuery('');
  };

  const handleAddProduct = (item) => {
    if (selectedSkus.has(item.sku)) return;
    const availableQty = Number(item.quantity) || 0;
    if (availableQty <= 0) return;
    setSelectedProducts((prev) => [...prev, {
      sku: item.sku,
      name: item.name,
      unit_price: Number(item.unit_price) || 0,
      quantity: 1,
      image_data: item.image_data,
      isPackageDefault: false,
      availableQty
    }]);
  };

  const handleRemoveProduct = (sku) => {
    setSelectedProducts((prev) => prev.filter((p) => p.sku !== sku));
  };

  const handleQuantityStep = (sku, delta) => {
    setSelectedProducts((prev) => prev.map((p) => {
      if (p.sku !== sku) return p;
      const cap = p.availableQty > 0 ? p.availableQty : 1;
      const next = Math.max(1, Math.min(cap, (Number(p.quantity) || 1) + delta));
      return { ...p, quantity: next };
    }));
  };

  const handleClose = () => {
    if (submitting) return;
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!fields.account_name.trim()) {
      setFormError('Customer / account name is required.');
      return;
    }
    if (!fields.email_address.trim() && !fields.cellphone.trim()) {
      setFormError('Provide at least an email address or cellphone number for the customer.');
      return;
    }
    if (!fields.order_date || !fields.expected_delivery) {
      setFormError('Order date and expected delivery date are required.');
      return;
    }
    if (orderType === 'package' && !packageName) {
      setFormError('Select a package.');
      return;
    }
    if (!fields.shipping_address.trim()) {
      setFormError('Shipping address is required.');
      return;
    }
    if (selectedProducts.length === 0) {
      setFormError('Add at least one product to the order.');
      return;
    }
    const boxCount = Number(fields.order_quantity);
    if (!Number.isInteger(boxCount) || boxCount < 0) {
      setFormError('Total boxes must be a non-negative whole number.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        account_name: fields.account_name,
        name: fields.account_name,
        order_date: fields.order_date,
        expected_delivery: fields.expected_delivery,
        status: fields.status,
        package_name: orderType === 'package' ? packageName : 'Custom',
        payment_method: fields.payment_method,
        shipped_to: fields.shipped_to || fields.account_name,
        shipping_address: fields.shipping_address,
        remarks: fields.remarks,
        telephone: fields.telephone,
        cellphone: fields.cellphone,
        email_address: fields.email_address,
        order_quantity: boxCount,
        customer_id: selectedCustomer?.customer_id,
        products: selectedProducts.map((p) => ({ sku: p.sku, quantity: Number(p.quantity) || 0 }))
      };
      await api.post('/api/orders', payload);
      if (onCreated) await onCreated();
      onClose();
    } catch (err) {
      console.error('Error creating order:', err);
      setFormError(err.response?.data?.error || 'Failed to create order.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <PortalModal onClose={handleClose}>
      <form className="add-order-modal" onSubmit={handleSubmit}>
        <div className="aom-header">
          <h2>Add Order</h2>
          <button type="button" className="aom-close" onClick={handleClose} title="Close" aria-label="Close">&times;</button>
        </div>

        {formError && <div className="aom-error" role="alert">{formError}</div>}

        <div className="aom-body">
          {/* LEFT PANEL */}
          <div className="aom-left">
            <div className="aom-field-group">
              <label className="aom-label">Order Type</label>
              <div className="aom-segmented" role="group" aria-label="Order type">
                <button
                  type="button"
                  className={`aom-segment ${orderType === 'package' ? 'active' : ''}`}
                  onClick={() => setOrderType('package')}
                >
                  📦 Package Order
                </button>
                <button
                  type="button"
                  className={`aom-segment ${orderType === 'custom' ? 'active' : ''}`}
                  onClick={() => setOrderType('custom')}
                >
                  🛠️ Non-Package / Custom
                </button>
              </div>
            </div>

            {orderType === 'package' && (
              <div className="aom-field-group">
                <label className="aom-label" htmlFor="aom-package">Package</label>
                <select id="aom-package" className="aom-input" value={packageName} onChange={(e) => setPackageName(e.target.value)}>
                  <option value="">Select a package…</option>
                  {PACKAGE_PRESETS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
                {packageName && (
                  <p className="aom-hint">Package defaults were loaded into the product list on the right — marked "Package default". You can still add or remove items.</p>
                )}
              </div>
            )}

            <div className="aom-field-group">
              <label className="aom-label">Customer</label>
              <div className="aom-segmented aom-segmented-sm" role="group" aria-label="Customer mode">
                <button type="button" className={`aom-segment ${customerMode === 'existing' ? 'active' : ''}`} onClick={() => setCustomerMode('existing')}>Existing Customer</button>
                <button type="button" className={`aom-segment ${customerMode === 'new' ? 'active' : ''}`} onClick={() => { setCustomerMode('new'); handleClearCustomer(); }}>Walk-in / Social Media</button>
              </div>

              {customerMode === 'existing' && (
                <div className="aom-customer-search">
                  <input
                    type="text"
                    className="aom-input"
                    placeholder="Search customer by name, email, or phone…"
                    value={customerQuery}
                    onChange={(e) => { setCustomerQuery(e.target.value); setShowCustomerResults(true); if (selectedCustomer) setSelectedCustomer(null); }}
                    onFocus={() => setShowCustomerResults(true)}
                  />
                  {selectedCustomer && (
                    <div className="aom-selected-customer">
                      Selected: <strong>{selectedCustomer.name}</strong>
                      <button type="button" className="aom-link-btn" onClick={handleClearCustomer}>Change</button>
                    </div>
                  )}
                  {showCustomerResults && !selectedCustomer && (
                    <div className="aom-customer-results">
                      {filteredCustomers.length === 0 ? (
                        <div className="aom-customer-result-empty">No matching customers. Switch to "Walk-in / Social Media" to enter details manually.</div>
                      ) : filteredCustomers.map((c) => (
                        <button type="button" key={c.customer_id} className="aom-customer-result" onClick={() => handleSelectCustomer(c)}>
                          <span className="aom-customer-result-name">{c.name}</span>
                          <span className="aom-customer-result-meta">{c.email_address || c.cellphone || c.phone_number || ''}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="aom-field-group">
              <label className="aom-label">Receiver / Contact Information</label>
              <div className="aom-grid-2">
                <div>
                  <label className="aom-sublabel" htmlFor="aom-account_name">Account / Customer Name *</label>
                  <input id="aom-account_name" className="aom-input" name="account_name" value={fields.account_name} onChange={handleFieldChange} required />
                </div>
                <div>
                  <label className="aom-sublabel" htmlFor="aom-shipped_to">Receiver Name</label>
                  <input id="aom-shipped_to" className="aom-input" name="shipped_to" value={fields.shipped_to} onChange={handleFieldChange} placeholder="Defaults to account name" />
                </div>
                <div>
                  <label className="aom-sublabel" htmlFor="aom-email">Email Address</label>
                  <input id="aom-email" type="email" className="aom-input" name="email_address" value={fields.email_address} onChange={handleFieldChange} />
                </div>
                <div>
                  <label className="aom-sublabel" htmlFor="aom-cellphone">Cellphone</label>
                  <input id="aom-cellphone" className="aom-input" name="cellphone" value={fields.cellphone} onChange={handleFieldChange} placeholder="09171234567" />
                </div>
                <div>
                  <label className="aom-sublabel" htmlFor="aom-telephone">Telephone</label>
                  <input id="aom-telephone" className="aom-input" name="telephone" value={fields.telephone} onChange={handleFieldChange} />
                </div>
                <div>
                  <label className="aom-sublabel" htmlFor="aom-status">Order Status</label>
                  <select id="aom-status" className="aom-input" name="status" value={fields.status} onChange={handleFieldChange}>
                    {ORDER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <label className="aom-sublabel" htmlFor="aom-shipping_address">Shipping Address *</label>
              <textarea id="aom-shipping_address" className="aom-input" name="shipping_address" rows={2} value={fields.shipping_address} onChange={handleFieldChange} required />
            </div>

            <div className="aom-field-group">
              <div className="aom-grid-2">
                <div>
                  <label className="aom-sublabel" htmlFor="aom-order_date">Order Date *</label>
                  <input id="aom-order_date" type="date" className="aom-input" name="order_date" value={fields.order_date} onChange={handleFieldChange} required />
                </div>
                <div>
                  <label className="aom-sublabel" htmlFor="aom-expected_delivery">Expected Delivery *</label>
                  <input id="aom-expected_delivery" type="date" className="aom-input" name="expected_delivery" value={fields.expected_delivery} onChange={handleFieldChange} required />
                </div>
              </div>
            </div>

            <div className="aom-field-group">
              <label className="aom-sublabel" htmlFor="aom-remarks">Remarks</label>
              <textarea id="aom-remarks" className="aom-input" name="remarks" rows={3} value={fields.remarks} onChange={handleFieldChange} placeholder="Optional notes for this order" />
            </div>
          </div>

          {/* RIGHT PANEL */}
          <div className="aom-right">
            <div className="aom-product-browser">
              <div className="aom-product-browser-controls">
                <input
                  type="text"
                  className="aom-input"
                  placeholder="Search products by name or SKU…"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                />
                {categories.length > 0 && (
                  <select className="aom-input aom-category-select" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                    <option value="all">All Categories</option>
                    {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                )}
              </div>
              <div className="aom-product-grid">
                {availableProducts.length === 0 ? (
                  <p className="aom-empty">No products match your search.</p>
                ) : availableProducts.map((item) => {
                  const already = selectedSkus.has(item.sku);
                  const outOfStock = Number(item.quantity || 0) <= 0;
                  return (
                    <button
                      type="button"
                      key={item.sku}
                      className={`aom-product-card ${already ? 'added' : ''} ${outOfStock ? 'disabled' : ''}`}
                      onClick={() => handleAddProduct(item)}
                      disabled={already || outOfStock}
                      title={outOfStock ? 'Out of stock' : already ? 'Already added' : `Add ${item.name}`}
                    >
                      <span className="aom-product-name">{item.name}</span>
                      <span className="aom-product-meta">{item.sku} · {formatCurrency(item.unit_price)}</span>
                      <span className={`aom-product-stock ${outOfStock ? 'out' : ''}`}>
                        {outOfStock ? 'Out of stock' : `${Number(item.quantity).toLocaleString()} available`}
                      </span>
                      {already && <span className="aom-product-badge">Added</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="aom-selected-panel">
              <h3 className="aom-section-title">Selected Products ({selectedProducts.length})</h3>
              {selectedProducts.length === 0 ? (
                <p className="aom-empty">No products selected yet. Choose from the list above.</p>
              ) : (
                <div className="aom-selected-list">
                  {selectedProducts.map((p) => (
                    <div className="aom-selected-row" key={p.sku}>
                      <div className="aom-selected-info">
                        <span className="aom-selected-name">
                          {p.name}
                          {p.isPackageDefault && <span className="aom-default-badge">Package default</span>}
                        </span>
                        <span className="aom-selected-meta">{p.sku} · {formatCurrency(p.unit_price)} each</span>
                        {Number(p.quantity) > (p.availableQty || 0) && (
                          <span className="aom-stock-warning">Only {p.availableQty} in stock</span>
                        )}
                      </div>
                      <div className="aom-qty-stepper">
                        <button type="button" onClick={() => handleQuantityStep(p.sku, -1)} disabled={p.quantity <= 1}>−</button>
                        <span>{p.quantity}</span>
                        <button type="button" onClick={() => handleQuantityStep(p.sku, 1)} disabled={p.quantity >= (p.availableQty || 1)}>+</button>
                      </div>
                      <div className="aom-line-total">{formatCurrency(p.unit_price * p.quantity)}</div>
                      <button type="button" className="aom-remove-btn" onClick={() => handleRemoveProduct(p.sku)} title="Remove" aria-label={`Remove ${p.name}`}>&times;</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="aom-summary">
              <div className="aom-field-group">
                <label className="aom-sublabel" htmlFor="aom-boxes">Total Boxes *</label>
                <div className="aom-qty-stepper aom-boxes-stepper">
                  <button type="button" onClick={() => setFields((prev) => ({ ...prev, order_quantity: Math.max(0, Number(prev.order_quantity || 0) - 1) }))}>−</button>
                  <input
                    id="aom-boxes"
                    type="number"
                    min="0"
                    step="1"
                    className="aom-input aom-boxes-input"
                    name="order_quantity"
                    value={fields.order_quantity}
                    onChange={(e) => setFields((prev) => ({ ...prev, order_quantity: e.target.value.replace(/[^0-9]/g, '') }))}
                  />
                  <button type="button" onClick={() => setFields((prev) => ({ ...prev, order_quantity: Number(prev.order_quantity || 0) + 1 }))}>+</button>
                </div>
                <p className="aom-hint">The actual number of physical boxes in this shipment — not the product count.</p>
              </div>

              <div className="aom-field-group">
                <label className="aom-sublabel" htmlFor="aom-payment-method">Payment Method</label>
                <select id="aom-payment-method" className="aom-input" name="payment_method" value={fields.payment_method} onChange={handleFieldChange}>
                  {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>

              <div className="aom-totals">
                <div className="aom-total-row">
                  <span>Total Cost</span>
                  <strong>{formatCurrency(totalCost)}</strong>
                </div>
                <div className="aom-total-row muted">
                  <span>Down Payment (70%)</span>
                  <span>{formatCurrency(downPayment)}</span>
                </div>
                <div className="aom-total-row muted">
                  <span>Remaining Balance (30%)</span>
                  <span>{formatCurrency(remainingBalance)}</span>
                </div>
                <p className="aom-hint">Total Cost is read-only and calculated from the selected products; the server recalculates and validates it on save.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="aom-footer">
          <button type="button" className="aom-btn aom-btn-secondary" onClick={handleClose} disabled={submitting}>Cancel</button>
          <button type="submit" className="aom-btn aom-btn-primary" disabled={submitting}>
            {submitting ? 'Creating…' : 'Create Order'}
          </button>
        </div>
      </form>
    </PortalModal>
  );
}
