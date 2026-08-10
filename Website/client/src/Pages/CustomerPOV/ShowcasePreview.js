import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import TopbarCustomer from '../../Components/TopbarCustomer';
import api from '../../api';
import './CustomerPOV.css';
import './ShowcasePreview.css';

export default function ShowcasePreview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [bundle, setBundle]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    api.get(`/api/showcase/${id}`)
      .then(res => setBundle(res.data.bundle))
      .catch(() => setError('Bundle not found.'))
      .finally(() => setLoading(false));
  }, [id]);

  const imgSrc = bundle?.cover_image
    ? `data:${bundle.cover_image_mime || 'image/jpeg'};base64,${bundle.cover_image}`
    : null;

  if (loading) {
    return (
      <div className="customerpov-container">
        <TopbarCustomer />
        <div className="sp-loading">Loading…</div>
      </div>
    );
  }

  if (error || !bundle) {
    return (
      <div className="customerpov-container">
        <TopbarCustomer />
        <div className="sp-error">
          <p>{error || 'Bundle not found.'}</p>
          <button className="sp-back-btn" onClick={() => navigate(-1)}>← Go Back</button>
        </div>
      </div>
    );
  }

  return (
    <div className="customerpov-container">
      <TopbarCustomer />

      {/* Hero / full-width image */}
      <div className="sp-image-wrapper">
        {imgSrc
          ? <img src={imgSrc} alt={bundle.title} className="sp-image" />
          : <div className="sp-image-placeholder">No image available</div>
        }
      </div>

      {/* Title + description */}
      <div className="sp-detail">
        <div className="sp-category-badge">
          {bundle.category.charAt(0).toUpperCase() + bundle.category.slice(1)}
        </div>
        <h1 className="sp-title">{bundle.title}</h1>
        <p className="sp-description">{bundle.description}</p>

        <div className="sp-actions">
          <button className="sp-order-btn" onClick={() => navigate('/order')}>
            Place an Order
          </button>
          <button className="sp-back-btn" onClick={() => navigate(-1)}>
            ← Back to Gallery
          </button>
        </div>
      </div>
    </div>
  );
}
