import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import TopbarCustomer from '../../Components/TopbarCustomer';
import { BundleCard } from '../CustomerPOV/CustomerPOV';
import api from '../../api';
import '../CustomerCorporate/CustomerCorporate.css';

const introText = `Pensée prides itself in curating thoughtful and purposeful gifts for all occasions. We believe the one-box-fits-all concept is a myth. No two gifts are alike. Each box we send out carries a story of the sender, recipient, and the brands who poured their hearts into their craft.\n\nWe promote the essence of gift giving amidst the fast-paced, technologically-savvy world we are in. It's an expression of love. It strengthens relationships. To us, it's extending a part of yourself and saying, "I thought about you while buying this".\n\nSo if the words, "local", "artisanal", "customized", and "handwritten" speak to you, then you're in the right place.`;

export default function CustomerBespoke() {
  const navigate = useNavigate();
  const [bundles, setBundles]   = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    api.get('/api/showcase?category=bespoke')
      .then(res => setBundles(res.data.bundles || []))
      .catch(() => setBundles([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="customerpov-container">
      <TopbarCustomer />

      {/* Hero */}
      <section
        className="customerpov-hero"
        style={{
          backgroundImage:   "url('/Assets/Images/Background/bespokeBackground.png')",
          backgroundPosition: 'center',
          backgroundRepeat:  'no-repeat',
          backgroundSize:    'cover',
          backgroundColor:   '#f1f0e2',
        }}
      >
        <div className="customerpov-hero-centerbox">
          <span className="customerpov-hero-title">BESPOKE</span>
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
        <p style={{ whiteSpace: 'pre-line' }}>{introText}</p>
      </div>

      {/* Dynamic bundle grid */}
      {loading ? (
        <div className="customerpov-grid-loading">Loading gallery…</div>
      ) : bundles.length === 0 ? (
        <div className="customerpov-grid-empty">No bespoke bundles available yet.</div>
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
