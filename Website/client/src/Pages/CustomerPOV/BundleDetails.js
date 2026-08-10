import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import TopbarCustomer from '../../Components/TopbarCustomer';
import { useAuth } from '../../Context/AuthContext';
import api from '../../api';
import './CustomerPOV.css';
import './BundleDetails.css';

const LENS_SIZE   = 180;   // px — diameter of the magnifier circle
const ZOOM_FACTOR = 9.8;   // how many times the image is magnified

const TODAY = new Date().toISOString().slice(0, 10);

// ── Order Modal ──────────────────────────────────────────────────────────────
function OrderModal({ bundle, user, onClose, onSuccess }) {
  const overlayRef = useRef(null);
  const [placing, setPlacing] = useState(false);
  const [orderError, setOrderError] = useState('');
  const [form, setForm] = useState({
    name:                  user?.name || '',
    email:                 user?.email || user?.email_address || '',
    cellphone:             user?.cellphone || user?.phone || '',
    shipping_address:      '',
    order_quantity:        1,
    event_date:            '',
    expected_delivery:     '',
    personalized_letter:   '',
    special_instructions:  ''
  });

  // Close on Escape
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleField = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setOrderError('');
  };

  const adjustQty = (delta) => {
    setForm(prev => ({ ...prev, order_quantity: Math.max(1, Number(prev.order_quantity) + delta) }));
  };

  const handleOverlayClick = (e) => {
    if (e.target === overlayRef.current) onClose();
  };

  const handleOrder = async (e) => {
    e.preventDefault();
    if (!form.name.trim())             return setOrderError('Full name is required.');
    if (!form.email.trim())            return setOrderError('Email address is required.');
    if (!form.cellphone.trim())        return setOrderError('Phone number is required.');
    if (!form.event_date)              return setOrderError('Event date is required.');
    if (!form.shipping_address.trim()) return setOrderError('Delivery address is required.');

    const remarkParts = [];
    if (form.personalized_letter.trim())
      remarkParts.push(`Personalized Letter:\n${form.personalized_letter.trim()}`);
    if (form.special_instructions.trim())
      remarkParts.push(`Special Instructions:\n${form.special_instructions.trim()}`);

    setPlacing(true);
    setOrderError('');
    try {
      const res = await api.post('/api/orders', {
        account_name:      form.name.trim(),
        name:              form.name.trim(),
        shipped_to:        form.name.trim(),
        order_date:        TODAY,
        expected_delivery: form.expected_delivery || form.event_date,
        status:            'Pending',
        package_name:      bundle.title,
        payment_method:    'Cash',
        payment_type:      'Full Payment',
        shipping_address:  form.shipping_address.trim(),
        cellphone:         form.cellphone.trim(),
        email_address:     form.email.trim(),
        order_quantity:    Number(form.order_quantity),
        bundle_id:         bundle.id,
        remarks:           remarkParts.join('\n\n') || null
      });
      onSuccess(res.data.order_id || 'placed');
    } catch (err) {
      if (err.response?.status === 401) {
        setOrderError('Please log in to place an order.');
      } else {
        setOrderError(
          err.response?.data?.error ||
          err.response?.data?.message ||
          'Unable to place order. Please try again.'
        );
      }
    } finally {
      setPlacing(false);
    }
  };

  return (
    <div className="bd-modal-overlay" ref={overlayRef} onClick={handleOverlayClick}>
      <div className="bd-modal" role="dialog" aria-modal="true"
        aria-labelledby="bd-modal-title">

        <button className="bd-modal-close" onClick={onClose} aria-label="Close">✕</button>

        <h2 id="bd-modal-title" className="bd-modal-title">Order Bundle</h2>
        <p className="bd-modal-subtitle">{bundle.title}</p>

        <form className="bd-modal-form" onSubmit={handleOrder}>

          {/* Quantity */}
          <div className="bd-modal-field bd-modal-qty-row">
            <label className="bd-modal-label">Quantity</label>
            <div className="bd-qty-wrap">
              <button type="button" className="bd-qty-btn" onClick={() => adjustQty(-1)}
                aria-label="Decrease">−</button>
              <span className="bd-qty-value">{form.order_quantity}</span>
              <button type="button" className="bd-qty-btn" onClick={() => adjustQty(1)}
                aria-label="Increase">+</button>
            </div>
          </div>

          {/* Name */}
          <div className="bd-modal-field">
            <label className="bd-modal-label">
              Full Name <span className="bd-req">*</span>
            </label>
            <input name="name" value={form.name} onChange={handleField}
              className="bd-modal-input" placeholder="Your full name" />
          </div>

          {/* Email + Phone */}
          <div className="bd-modal-two-col">
            <div className="bd-modal-field">
              <label className="bd-modal-label">
                Email <span className="bd-req">*</span>
              </label>
              <input name="email" type="email" value={form.email} onChange={handleField}
                className="bd-modal-input" placeholder="your@email.com" />
            </div>
            <div className="bd-modal-field">
              <label className="bd-modal-label">
                Phone <span className="bd-req">*</span>
              </label>
              <input name="cellphone" value={form.cellphone} onChange={handleField}
                className="bd-modal-input" placeholder="+63 9XX XXX XXXX" />
            </div>
          </div>

          {/* Delivery address */}
          <div className="bd-modal-field">
            <label className="bd-modal-label">
              Delivery Address <span className="bd-req">*</span>
            </label>
            <input name="shipping_address" value={form.shipping_address} onChange={handleField}
              className="bd-modal-input" placeholder="Street, City, Province" />
          </div>

          {/* Event date + Expected delivery */}
          <div className="bd-modal-two-col">
            <div className="bd-modal-field">
              <label className="bd-modal-label">
                Event Date <span className="bd-req">*</span>
              </label>
              <input name="event_date" type="date" value={form.event_date}
                min={TODAY} onChange={handleField} className="bd-modal-input" />
            </div>
            <div className="bd-modal-field">
              <label className="bd-modal-label">
                Expected Delivery
                <span className="bd-optional"> — optional</span>
              </label>
              <input name="expected_delivery" type="date" value={form.expected_delivery}
                min={TODAY} onChange={handleField} className="bd-modal-input" />
            </div>
          </div>

          {/* Personalized letter */}
          <div className="bd-modal-field">
            <label className="bd-modal-label">
              Personalized Letter
              <span className="bd-optional"> — optional</span>
            </label>
            <textarea name="personalized_letter" value={form.personalized_letter}
              onChange={handleField} className="bd-modal-textarea" rows={3}
              placeholder="A personal message to include with the gift…" />
          </div>

          {/* Special instructions */}
          <div className="bd-modal-field">
            <label className="bd-modal-label">
              Special Instructions
              <span className="bd-optional"> — optional</span>
            </label>
            <textarea name="special_instructions" value={form.special_instructions}
              onChange={handleField} className="bd-modal-textarea" rows={2}
              placeholder="Colour preferences, packaging notes…" />
          </div>

          {orderError && (
            <p className="bd-modal-error">{orderError}</p>
          )}

          <div className="bd-modal-actions">
            <button type="submit" className="bd-primary-btn" disabled={placing}>
              {placing ? 'Placing Order…' : 'Place Order'}
            </button>
            <button type="button" className="bd-back-link" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
function BundleDetails() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [bundle, setBundle]               = useState(null);
  const [galleryImages, setGalleryImages] = useState([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState(null);

  const [activeIdx, setActiveIdx]       = useState(0);
  const [imageFading, setImageFading]   = useState(false);

  const [modalOpen, setModalOpen]       = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(null);

  // ── Magnifier state (desktop hover zoom) ──────────────────────────────────
  const imgWrapRef  = useRef(null);
  const [magnifier, setMagnifier] = useState({ visible: false, x: 0, y: 0, bgX: 0, bgY: 0, bgW: 0, bgH: 0 });

  // ── Lightbox state (mobile tap) ───────────────────────────────────────────
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Lock body scroll when modal / lightbox is open
  useEffect(() => {
    document.body.style.overflow = (modalOpen || lightboxOpen) ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [modalOpen, lightboxOpen]);

  // ── Magnifier handlers ────────────────────────────────────────────────────
  const handleMouseMove = useCallback((e) => {
    const wrap = imgWrapRef.current;
    if (!wrap) return;
    const rect = wrap.getBoundingClientRect();
    const curX = e.clientX - rect.left;
    const curY = e.clientY - rect.top;
    // Clamp lens so it never goes outside the container
    const lensX = Math.min(Math.max(curX - LENS_SIZE / 2, 0), rect.width  - LENS_SIZE);
    const lensY = Math.min(Math.max(curY - LENS_SIZE / 2, 0), rect.height - LENS_SIZE);
    // Background size and position for zoomed view
    const bgW = rect.width  * ZOOM_FACTOR;
    const bgH = rect.height * ZOOM_FACTOR;
    const bgX = -(curX * ZOOM_FACTOR - LENS_SIZE / 2);
    const bgY = -(curY * ZOOM_FACTOR - LENS_SIZE / 2);
    setMagnifier({ visible: true, x: lensX, y: lensY, bgX, bgY, bgW, bgH });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setMagnifier(m => ({ ...m, visible: false }));
  }, []);

  // Load bundle + gallery
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      api.get(`/api/showcase/${id}`),
      api.get(`/api/showcase/${id}/gallery`)
    ])
      .then(([br, gr]) => {
        if (cancelled) return;
        if (!br.data.bundle) { setError('Bundle not found.'); return; }
        setBundle(br.data.bundle);
        setGalleryImages(gr.data.images || []);
      })
      .catch(() => { if (!cancelled) setError('Could not load bundle details.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  // All images: cover first, then gallery
  const allImages = [];
  if (bundle?.cover_image) {
    allImages.push({
      src:   `data:${bundle.cover_image_mime || 'image/jpeg'};base64,${bundle.cover_image}`,
      label: bundle.title
    });
  }
  galleryImages.forEach((img, i) => {
    if (img.image_data) {
      allImages.push({
        src:   `data:${img.image_mime || 'image/jpeg'};base64,${img.image_data}`,
        label: `Gallery photo ${i + 1}`
      });
    }
  });

  const switchImage = useCallback((idx) => {
    if (idx === activeIdx) return;
    setImageFading(true);
    setTimeout(() => {
      setActiveIdx(idx);
      setImageFading(false);
    }, 180);
  }, [activeIdx]);

  const handleOrderSuccess = (orderId) => {
    setModalOpen(false);
    setOrderSuccess(orderId);
  };

  // ── Loading skeleton ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="customerpov-container">
        <TopbarCustomer />
        <div className="bd-page bd-page--loading">
          <div className="bd-skeleton-header">
            <div className="bd-skeleton bd-skeleton-badge" />
            <div className="bd-skeleton bd-skeleton-title" />
            <div className="bd-skeleton bd-skeleton-tagline" />
          </div>
          <div className="bd-skeleton bd-skeleton-main-img" />
          <div className="bd-skeleton bd-skeleton-cta-btn" />
        </div>
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (error || !bundle) {
    return (
      <div className="customerpov-container">
        <TopbarCustomer />
        <div className="bd-state-center">
          <p className="bd-state-msg">{error || 'Bundle not found.'}</p>
          <button className="bd-back-link" onClick={() => navigate(-1)}>← Back to Gallery</button>
        </div>
      </div>
    );
  }

  // ── Order success ──────────────────────────────────────────────────────────
  if (orderSuccess) {
    return (
      <div className="customerpov-container">
        <TopbarCustomer />
        <div className="bd-state-center">
          <div className="bd-success-icon">✓</div>
          <h2 className="bd-success-title">Order Received</h2>
          <p className="bd-success-msg">
            Your order for <em>{bundle.title}</em> has been placed.
          </p>
          {orderSuccess !== 'placed' && (
            <p className="bd-success-id">Reference: {orderSuccess}</p>
          )}
          <p className="bd-success-sub">We'll be in touch shortly to confirm the details.</p>
          <div className="bd-success-actions">
            <button className="bd-primary-btn" onClick={() => navigate('/customer-cart')}>
              View My Orders
            </button>
            <button className="bd-back-link" onClick={() => navigate(-1)}>
              ← Back to Gallery
            </button>
          </div>
        </div>
      </div>
    );
  }

  const activeImage = allImages[activeIdx] || null;
  const categoryLabel = bundle.category.charAt(0).toUpperCase() + bundle.category.slice(1);

  return (
    <div className="customerpov-container">
      <TopbarCustomer />

      <div className="bd-page">

        {/* ── Back link ──────────────────────────────────────────────────── */}
        <button className="bd-nav-back" onClick={() => navigate(-1)}>
          ← Back to {categoryLabel}
        </button>

        {/* ── Header: category + name + description ──────────────────────── */}
        <header className="bd-header">
          <span className="bd-category-badge">{categoryLabel}</span>
          <h1 className="bd-title">{bundle.title}</h1>
          {bundle.description && (
            <p className="bd-tagline">{bundle.description}</p>
          )}
        </header>

        {/* ── Image area ─────────────────────────────────────────────────── */}
        <div className="bd-image-area">

          {/* Main large image — desktop: hover to magnify; mobile: tap to lightbox */}
          <div
            className={`bd-main-image-wrap ${activeImage ? 'bd-main-image-wrap--has-image' : ''}`}
            ref={imgWrapRef}
            onMouseMove={activeImage ? handleMouseMove : undefined}
            onMouseLeave={activeImage ? handleMouseLeave : undefined}
            onClick={() => { if (activeImage) setLightboxOpen(true); }}
          >
            {activeImage ? (
              <img
                src={activeImage.src}
                alt={activeImage.label}
                className={`bd-main-image ${imageFading ? 'bd-main-image--fading' : ''}`}
                draggable={false}
              />
            ) : (
              <div className="bd-main-image-placeholder">No image available</div>
            )}

            {/* Magnifier lens — desktop only, shown on hover */}
            {magnifier.visible && activeImage && (
              <div
                className="bd-magnifier"
                style={{
                  left:                magnifier.x,
                  top:                 magnifier.y,
                  backgroundImage:    `url(${activeImage.src})`,
                  backgroundSize:     `${magnifier.bgW}px ${magnifier.bgH}px`,
                  backgroundPosition: `${magnifier.bgX}px ${magnifier.bgY}px`
                }}
              />
            )}
          </div>

          {/* Thumbnail strip — shown only if >1 image */}
          {allImages.length > 1 && (
            <div className="bd-thumbs">
              {allImages.map((img, i) => (
                <button
                  key={i}
                  type="button"
                  className={`bd-thumb ${i === activeIdx ? 'bd-thumb--active' : ''}`}
                  onClick={() => switchImage(i)}
                  aria-label={img.label}
                >
                  <img src={img.src} alt={img.label} className="bd-thumb-img" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── CTA ────────────────────────────────────────────────────────── */}
        <div className="bd-cta-section">
          <button className="bd-primary-btn bd-primary-btn--lg" onClick={() => setModalOpen(true)}>
            Order this Bundle
          </button>
          <p className="bd-cta-note">Free consultation included · Tailored to your event</p>
        </div>

        {/* ── Additional info ─────────────────────────────────────────────── */}
        {(bundle.bundle_items?.length > 0 || allImages.length > 1) && (
          <div className="bd-additional">

            {/* What's Included */}
            {bundle.bundle_items?.length > 0 && (
              <div className="bd-included">
                <h3 className="bd-section-heading">What's Included</h3>
                <ul className="bd-included-list">
                  {bundle.bundle_items.map(item => (
                    <li key={item.sku} className="bd-included-item">
                      <span className="bd-included-dot" />
                      <span className="bd-included-name">{item.item_name}</span>
                      <span className="bd-included-qty">× {item.quantity}</span>
                    </li>
                  ))}
                </ul>
                <p className="bd-included-note">Per bundle ordered</p>
              </div>
            )}

            {/* Gallery grid — if there are multiple images, show all as a grid */}
            {allImages.length > 1 && (
              <div className="bd-gallery-section">
                <h3 className="bd-section-heading">More Photos</h3>
                <div className="bd-gallery-grid">
                  {allImages.map((img, i) => (
                    <button
                      key={i}
                      type="button"
                      className={`bd-gallery-cell ${i === activeIdx ? 'bd-gallery-cell--active' : ''}`}
                      onClick={() => {
                        switchImage(i);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      aria-label={`View ${img.label}`}
                    >
                      <img src={img.src} alt={img.label} className="bd-gallery-img" />
                    </button>
                  ))}
                </div>
                <p className="bd-gallery-hint">Click a photo to view it above</p>
              </div>
            )}
          </div>
        )}

      </div>

      {/* ── Order Modal ─────────────────────────────────────────────────────── */}
      {modalOpen && (
        <OrderModal
          bundle={bundle}
          user={user}
          onClose={() => setModalOpen(false)}
          onSuccess={handleOrderSuccess}
        />
      )}

      {/* ── Lightbox (mobile tap to fullscreen) ─────────────────────────────── */}
      {lightboxOpen && activeImage && (
        <div className="bd-lightbox" onClick={() => setLightboxOpen(false)}>
          <button className="bd-lightbox-close" onClick={() => setLightboxOpen(false)} aria-label="Close">✕</button>
          <img src={activeImage.src} alt={activeImage.label} className="bd-lightbox-img" />
          {allImages.length > 1 && (
            <div className="bd-lightbox-nav">
              <button className="bd-lightbox-arrow" onClick={(e) => { e.stopPropagation(); switchImage((activeIdx - 1 + allImages.length) % allImages.length); }}>‹</button>
              <span className="bd-lightbox-counter">{activeIdx + 1} / {allImages.length}</span>
              <button className="bd-lightbox-arrow" onClick={(e) => { e.stopPropagation(); switchImage((activeIdx + 1) % allImages.length); }}>›</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default BundleDetails;
