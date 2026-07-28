import React, { useState, useEffect } from 'react';
import { useNavigate, Routes, Route } from 'react-router-dom';
import TopbarCustomer from '../../Components/TopbarCustomer';
import api from '../../api';
import './CustomerPOV.css';
import CarloPreview  from './CarloPreview';
import EricMarielPreview from './EricMarielPreview';
import DanielPreview from './DanielPreview';

// You can edit this intro text to match your brand
const introText = `Whether you're a "Type A" kind of couple who likes to oversee and cover every angle of the wedding, or the chill type who wholeheartedly trusts suppliers, you can be certain of one thing: you can let your hair down with us.\n\nWe do more than just sourcing, arranging, and delivering gift boxes—there's artistry involved. From packaging to personalized letter cards, we leave no stone unturned.\n\nNicholas Sparks once said, "Every great love starts with a great story." Allow us to weave yours into curated gift boxes.`;

function getImgSrc(bundle) {
  if (!bundle.cover_image) return null;
  return `data:${bundle.cover_image_mime || 'image/jpeg'};base64,${bundle.cover_image}`;
}

export default function CustomerPOV() {
  const navigate = useNavigate();
  const [bundles, setBundles]   = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    api.get('/api/showcase?category=wedding')
      .then(res => setBundles(res.data.bundles || []))
      .catch(() => setBundles([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="customerpov-container">
      <TopbarCustomer />
      <Routes>
        <Route path="/product/1" element={<CarloPreview />} />
        <Route path="/product/2" element={<EricMarielPreview />} />
        <Route path="/product/3" element={<DanielPreview />} />
      </Routes>

      {/* Hero */}
      <section
        className="customerpov-hero"
        style={{
          backgroundImage:   "url('/Assets/Images/Background/background.png')",
          backgroundPosition: 'center',
          backgroundRepeat:  'no-repeat',
          backgroundSize:    'cover',
          backgroundColor:   '#f1f0e2',
        }}
      >
        <div className="customerpov-hero-centerbox">
          <span className="customerpov-hero-title">WEDDING</span>
        </div>
      </section>

      <div className="customerpov-title-wrapper">
        <img
          src="/Assets/Images/PenseeLogos/pensee-logo-with-name-vertical.png"
          alt="Pensee Logo Vertical"
          className="customerpov-logo-vertical"
        />
      </div>

      <div className="customerpov-intro">
        {introText.split('\n').map((line, i) => <p key={i}>{line}</p>)}
      </div>

      {/* Dynamic bundle grid */}
      {loading ? (
        <div className="customerpov-grid-loading">Loading gallery…</div>
      ) : bundles.length === 0 ? (
        <div className="customerpov-grid-empty">No wedding bundles available yet.</div>
      ) : (
        <div className="customerpov-grid">
          {bundles.map(bundle => (
            <BundleCard key={bundle.id} bundle={bundle} navigate={navigate} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Shared card component ──────────────────────────────────────────────────────
export function BundleCard({ bundle, navigate }) {
  const [hovered, setHovered] = useState(false);
  const imgSrc = getImgSrc(bundle);

  return (
    <div
      className={`customerpov-card${hovered ? ' customerpov-card--hovered' : ''} showcase-card-fadein`}
      onClick={() => navigate(`/showcase/${bundle.id}`)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      tabIndex={0}
      role="button"
      aria-label={`View details for ${bundle.title}`}
      onKeyDown={e => e.key === 'Enter' && navigate(`/showcase/${bundle.id}`)}
    >
      <div className="customerpov-card-image-wrapper">
        {imgSrc
          ? <img
              src={imgSrc}
              alt={bundle.title}
              className={`customerpov-card-image${hovered ? ' customerpov-card-image--zoomed' : ''}`}
            />
          : <div className="customerpov-card-image-placeholder">Image Here</div>
        }
      </div>
      <div className="customerpov-card-content">
        <div className="customerpov-card-title">{bundle.title}</div>
        <div className="customerpov-card-paragraph">{bundle.description}</div>
        <button className="customerpov-view-btn">View Collection</button>
      </div>
    </div>
  );
}
