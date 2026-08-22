import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Sidebar from '../../Components/Sidebar/Sidebar';
import TopBar from '../../Components/TopBar';
import withEmployeeAuth from '../../Components/withEmployeeAuth';
import usePermissions from '../../hooks/usePermissions';
import api from '../../api';
import './DeliveryTracking.css';

const STATUSES = [
  'Pending',
  'Preparing',
  'Ready for Delivery',
  'Awaiting Pick-up',
  'Out for Delivery',
  'Sent / Shipped',
  'Delivered',
  'Picked Up',
  'Failed Delivery',
  'Rescheduled',
  'Cancelled',
];

const PICKUP_STATUSES = ['Ready for Delivery', 'Awaiting Pick-up', 'Picked Up', 'Cancelled'];
const TRACKING_UNAVAILABLE_MESSAGE = 'Delivery tracking link is not available. Please contact pensee@gmail.com.';

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString('en-PH');
};

const formatDateTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString('en-PH');
};

const formatPrice = (value) => {
  const amount = Number(value || 0);
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);
};

const resolveAssetUrl = (url) => {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  return `${api.defaults.baseURL}${url.startsWith('/') ? '' : '/'}${url}`;
};

const isValidUrl = (value) => {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol);
  } catch (_error) {
    return false;
  }
};

function DeliveryModal({ delivery, modes, onClose, onSaved }) {
  const initialMode = modes.find((mode) => mode.id === delivery?.delivery_mode_id)
    || modes.find((mode) => mode.name === delivery?.delivery_method)
    || null;

  const [form, setForm] = useState({
    delivery_status: delivery?.delivery_status || 'Ready for Delivery',
    delivery_mode_id: initialMode?.id ? String(initialMode.id) : '',
    courier_name: delivery?.courier_name || '',
    tracking_number: delivery?.tracking_number || '',
    tracking_link_available: delivery?.tracking_link_available ? 'available' : 'not_available',
    tracking_link: delivery?.tracking_link || '',
    delivery_remarks: delivery?.delivery_remarks || '',
  });
  const [proofFile, setProofFile] = useState(null);
  const [history, setHistory] = useState([]);
  const [saving, setSaving] = useState(false);

  const selectedMode = modes.find((mode) => String(mode.id) === String(form.delivery_mode_id));
  const isPickup = selectedMode?.type === 'PICKUP' || selectedMode?.name === 'Customer Pick-up';
  const statusOptions = isPickup ? PICKUP_STATUSES : STATUSES;
  const trackingAvailable = form.tracking_link_available === 'available';

  useEffect(() => {
    const fetchHistory = async () => {
      if (!delivery?.order_id) return;
      try {
        const response = await api.get(`/api/deliveries/${encodeURIComponent(delivery.order_id)}/history`);
        setHistory(response.data?.history || []);
      } catch (_error) {
        setHistory([]);
      }
    };
    fetchHistory();
  }, [delivery]);

  useEffect(() => {
    if (isPickup) {
      setForm((current) => ({
        ...current,
        courier_name: '',
        tracking_number: '',
        tracking_link: '',
        tracking_link_available: 'not_available',
        delivery_status: PICKUP_STATUSES.includes(current.delivery_status) ? current.delivery_status : 'Awaiting Pick-up',
      }));
    }
  }, [isPickup]);

  const save = async () => {
    if (!form.delivery_mode_id) {
      toast.error('Delivery mode is required.');
      return;
    }
    if (!form.delivery_status) {
      toast.error('Delivery status is required.');
      return;
    }
    if (['Failed Delivery', 'Rescheduled'].includes(form.delivery_status) && !form.delivery_remarks.trim()) {
      toast.error('Remarks are required for failed or rescheduled deliveries.');
      return;
    }
    if (!isPickup && trackingAvailable && !isValidUrl(form.tracking_link)) {
      toast.error('Please enter a valid tracking URL.');
      return;
    }
    if (proofFile && !['image/jpeg', 'image/png', 'image/webp'].includes(proofFile.type)) {
      toast.error('Proof must be a JPG, PNG, or WEBP image.');
      return;
    }
    if (proofFile && proofFile.size > 5 * 1024 * 1024) {
      toast.error('Proof image must be 5 MB or smaller.');
      return;
    }

    setSaving(true);
    try {
      await api.patch(`/api/deliveries/${encodeURIComponent(delivery.order_id)}`, {
        delivery_status: form.delivery_status,
        delivery_mode_id: Number(form.delivery_mode_id),
        delivery_method: selectedMode?.name,
        delivery_type: selectedMode?.type,
        courier_name: isPickup ? '' : form.courier_name,
        tracking_number: isPickup ? '' : form.tracking_number,
        tracking_link_available: !isPickup && trackingAvailable,
        tracking_link: !isPickup && trackingAvailable ? form.tracking_link : '',
        delivery_remarks: form.delivery_remarks,
      });

      if (proofFile) {
        const proofData = new FormData();
        proofData.append('proof', proofFile);
        await api.post(`/api/deliveries/${encodeURIComponent(delivery.order_id)}/proof`, proofData);
      }

      onSaved();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update delivery.');
    } finally {
      setSaving(false);
    }
  };

  if (!delivery) return null;

  return (
    <div className="delivery-modal-backdrop">
      <div className="delivery-modal">
        <div className="delivery-modal-header">
          <div>
            <h2>Delivery Details</h2>
            <p>{delivery.order_id} | {delivery.customer_name || delivery.name || 'Customer'}</p>
          </div>
          <button className="delivery-btn" onClick={onClose}>Close</button>
        </div>

        <div className="delivery-modal-body">
          <div className="delivery-info-grid">
            <div><span>Receiver</span><strong>{delivery.shipped_to || delivery.customer_name || '-'}</strong></div>
            <div><span>Contact</span><strong>{delivery.cellphone || delivery.telephone || '-'}</strong></div>
            <div><span>Email</span><strong>{delivery.email_address || '-'}</strong></div>
            <div><span>Expected Delivery</span><strong>{formatDate(delivery.expected_delivery)}</strong></div>
            <div><span>Total Amount</span><strong>{formatPrice(delivery.total_cost)}</strong></div>
            <div><span>Total Boxes</span><strong>{delivery.total_boxes || 0}</strong></div>
            <div className="full"><span>Shipping Address</span><strong>{delivery.shipping_address || '-'}</strong></div>
          </div>

          {delivery.products?.length > 0 && (
            <div className="delivery-items">
              <h3>Order Items</h3>
              {delivery.products.map((item) => (
                <div key={`${item.sku}-${item.name}`} className="delivery-item-row">
                  <span>{item.name || item.sku}</span>
                  <strong>Qty {item.quantity}</strong>
                </div>
              ))}
            </div>
          )}

          <div className="delivery-form-grid">
            <label>
              Delivery Mode
              <select value={form.delivery_mode_id} onChange={(e) => setForm({ ...form, delivery_mode_id: e.target.value })}>
                <option value="">Select delivery mode</option>
                {modes.map((mode) => (
                  <option key={mode.id} value={mode.id}>{mode.name}</option>
                ))}
              </select>
            </label>

            <label>
              Delivery Status
              <select value={form.delivery_status} onChange={(e) => setForm({ ...form, delivery_status: e.target.value })}>
                {statusOptions.map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
            </label>

            {!isPickup && (
              <>
                <label>
                  Courier / Delivery Service
                  <input value={form.courier_name} onChange={(e) => setForm({ ...form, courier_name: e.target.value })} placeholder="Courier or rider name" />
                </label>
                <label>
                  Tracking Number
                  <input value={form.tracking_number} onChange={(e) => setForm({ ...form, tracking_number: e.target.value })} placeholder="Tracking number if available" />
                </label>
                <label>
                  Tracking Link Availability
                  <select value={form.tracking_link_available} onChange={(e) => setForm({ ...form, tracking_link_available: e.target.value, tracking_link: e.target.value === 'available' ? form.tracking_link : '' })}>
                    <option value="available">Available</option>
                    <option value="not_available">Not Available</option>
                  </select>
                </label>
                <label>
                  Tracking URL
                  <input
                    value={form.tracking_link}
                    onChange={(e) => setForm({ ...form, tracking_link: e.target.value })}
                    placeholder="https://courier.example/track/..."
                    disabled={!trackingAvailable}
                  />
                </label>
              </>
            )}

            {!isPickup && !trackingAvailable && (
              <div className="delivery-message full">{TRACKING_UNAVAILABLE_MESSAGE}</div>
            )}

            <label className="full">
              Proof of Sending / Pickup
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setProofFile(e.target.files?.[0] || null)} />
            </label>

            {delivery.proof_image_url && (
              <div className="delivery-proof full">
                <span>Current Proof</span>
                <img src={resolveAssetUrl(delivery.proof_image_url)} alt="Proof of delivery sending" />
              </div>
            )}

            <label className="full">
              Remarks
              <textarea rows="3" value={form.delivery_remarks} onChange={(e) => setForm({ ...form, delivery_remarks: e.target.value })} placeholder="Delivery notes or failed/rescheduled reason" />
            </label>
          </div>

          {delivery.tracking_link && (
            <a className="delivery-track-link" href={delivery.tracking_link} target="_blank" rel="noreferrer">Track Delivery</a>
          )}

          <div className="delivery-timeline">
            <h3>Status Timeline</h3>
            {history.length === 0 ? (
              <p className="delivery-empty">No delivery updates recorded yet.</p>
            ) : history.map((entry) => (
              <div className="timeline-item" key={entry.id}>
                <div className="timeline-dot" />
                <div>
                  <strong>{entry.status}</strong>
                  <p>{formatDateTime(entry.created_at)} | {entry.updated_by_name || 'Staff'}</p>
                  {entry.delivery_method && <p>{entry.delivery_method}</p>}
                  {entry.remarks && <p>{entry.remarks}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="delivery-modal-footer">
          <button className="delivery-btn" onClick={onClose}>Cancel</button>
          <button className="delivery-btn primary" onClick={save} disabled={saving}>
            {saving ? 'Saving...' : 'Save Delivery Update'}
          </button>
        </div>
      </div>
    </div>
  );
}

function DeliveryTracking() {
  const { checkPermission } = usePermissions();
  const location = useLocation();
  const navigate = useNavigate();
  const [deliveries, setDeliveries] = useState([]);
  const [modes, setModes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [modeFilter, setModeFilter] = useState('all');
  const [courierFilter, setCourierFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [selectedDelivery, setSelectedDelivery] = useState(null);

  useEffect(() => {
    checkPermission('deliveryTracking');
  }, [checkPermission]);

  const fetchModes = useCallback(async () => {
    try {
      const response = await api.get('/api/deliveries/modes');
      setModes(response.data?.modes || []);
    } catch (_error) {
      setModes([]);
    }
  }, []);

  const fetchDeliveries = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/api/deliveries', {
        params: {
          status,
          delivery_mode: modeFilter,
          courier: courierFilter || undefined,
          expected_date: dateFilter || undefined,
          search: search || undefined,
        },
      });
      setDeliveries(response.data?.deliveries || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load deliveries.');
    } finally {
      setLoading(false);
    }
  }, [courierFilter, dateFilter, modeFilter, search, status]);

  useEffect(() => {
    fetchModes();
  }, [fetchModes]);

  useEffect(() => {
    fetchDeliveries();
  }, [fetchDeliveries]);

  const filteredDeliveries = useMemo(() => deliveries, [deliveries]);

  const openDelivery = async (delivery) => {
    try {
      const response = await api.get(`/api/deliveries/${encodeURIComponent(delivery.order_id)}`);
      setSelectedDelivery(response.data?.delivery || delivery);
    } catch (_error) {
      setSelectedDelivery(delivery);
    }
  };

  // Deep-link support: Order Details' "Confirm Delivery" / delivery-tracking
  // button navigates here as /delivery-tracking?orderId=..., so that specific
  // order's modal opens automatically instead of staff having to search for it.
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const orderId = params.get('orderId');
    if (orderId) {
      openDelivery({ order_id: orderId });
      navigate('/delivery-tracking', { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  const modeOptions = useMemo(() => {
    const fromRows = deliveries.map((delivery) => delivery.delivery_method).filter(Boolean);
    return Array.from(new Set([...modes.map((mode) => mode.name), ...fromRows])).sort();
  }, [deliveries, modes]);

  return (
    <div className="delivery-page">
      <Sidebar />
      <main className="delivery-main">
        <TopBar />
        <div className="delivery-content">
          <div className="delivery-header">
            <div>
              <h1>Delivery Tracking</h1>
              <p>Monitor ready orders, delivery mode, courier details, proof, and customer tracking visibility.</p>
            </div>
            <button className="delivery-btn primary" onClick={fetchDeliveries}>Refresh</button>
          </div>

          <div className="delivery-controls">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search order, customer, receiver, address, tracking" />
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="all">All statuses</option>
              {STATUSES.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <select value={modeFilter} onChange={(e) => setModeFilter(e.target.value)}>
              <option value="all">All delivery modes</option>
              {modeOptions.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <input value={courierFilter} onChange={(e) => setCourierFilter(e.target.value)} placeholder="Courier" />
            <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
          </div>

          {error && <div className="delivery-error">{error}</div>}

          <div className="delivery-table-wrap">
            <table className="delivery-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Receiver</th>
                  <th>Address</th>
                  <th>Expected</th>
                  <th>Boxes</th>
                  <th>Mode</th>
                  <th>Courier</th>
                  <th>Tracking</th>
                  <th>Status</th>
                  <th>Proof</th>
                  <th>Last Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDeliveries.map((delivery) => (
                  <tr key={delivery.order_id}>
                    <td data-label="Order">{delivery.order_id}</td>
                    <td data-label="Customer">{delivery.customer_name || '-'}</td>
                    <td data-label="Receiver">{delivery.shipped_to || '-'}</td>
                    <td data-label="Address">{delivery.shipping_address || '-'}</td>
                    <td data-label="Expected">{formatDate(delivery.expected_delivery)}</td>
                    <td data-label="Boxes">{delivery.total_boxes || 0}</td>
                    <td data-label="Mode">{delivery.delivery_method || '-'}</td>
                    <td data-label="Courier">{delivery.courier_name || '-'}</td>
                    <td data-label="Tracking">{delivery.tracking_number || '-'}</td>
                    <td data-label="Status"><span className={`delivery-status ${String(delivery.delivery_status || '').replace(/\s+/g, '-')}`}>{delivery.delivery_status || 'Pending'}</span></td>
                    <td data-label="Proof">{delivery.proof_image_url ? 'Uploaded' : 'Not uploaded'}</td>
                    <td data-label="Last Updated">{formatDateTime(delivery.delivery_updated_at)}</td>
                    <td data-label="Actions">
                      <button className="delivery-btn" onClick={() => openDelivery(delivery)}>View / Update</button>
                    </td>
                  </tr>
                ))}
                {!filteredDeliveries.length && (
                  <tr>
                    <td colSpan="13">{loading ? 'Loading deliveries...' : 'No ready delivery orders found.'}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
      <DeliveryModal
        delivery={selectedDelivery}
        modes={modes}
        onClose={() => setSelectedDelivery(null)}
        onSaved={async () => {
          setSelectedDelivery(null);
          await fetchDeliveries();
        }}
      />
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} newestOnTop />
    </div>
  );
}

export default withEmployeeAuth(DeliveryTracking);
