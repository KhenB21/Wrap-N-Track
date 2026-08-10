import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import TopbarCustomer from '../../Components/TopbarCustomer';
import { BundleCard } from '../CustomerPOV/CustomerPOV';
import api from '../../api';
import './CustomerCorporate.css';

const introText = `Professional, personal, and practical but fun—these words describe Pensée's corporate gifts.`;

const details = [
  {
    title: 'Professional',
    paragraph: `Our team ensures that the gift boxes are appropriate to the occasion and are aligned with the company's branding.`,
  },
  {
    title: 'Personal',
    paragraph: `During the design process, we also carefully analyze recipients. Are the gift boxes for clients, VIPs, media, influencers, supervisors or employees? Identifying this allows us to curate boxes tailored to their needs.`,
  },
  {
    title: 'Practical but fun',
    paragraph: `When we hear the words "corporate gifts", branded tumblers, journals, and mugs come to mind. We strive to think outside the box. Local, functional, and unique products that will make the unboxing experience thrilling!`,
  },
];

export default function CustomerCorporate() {
  const navigate = useNavigate();
  const [bundles, setBundles]   = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    api.get('/api/showcase?category=corporate')
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
          backgroundImage:   "url('/Assets/Images/Background/corporateBackground.png')",
          backgroundPosition: 'center',
          backgroundRepeat:  'no-repeat',
          backgroundSize:    'cover',
          backgroundColor:   '#f1f0e2',
        }}
      >
        <div className="customerpov-hero-centerbox">
          <span className="customerpov-hero-title">CORPORATE</span>
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
        <p>{introText}</p>
      </div>

      <div className="customer-corporate-details-grid">
        {details.map((item, i) => (
          <div className="customer-corporate-detail" key={i}>
            <div className="customer-corporate-detail-title">{item.title}</div>
            <div className="customer-corporate-detail-paragraph">{item.paragraph}</div>
          </div>
        ))}
      </div>

      {/* Dynamic bundle grid */}
      {loading ? (
        <div className="customerpov-grid-loading">Loading gallery…</div>
      ) : bundles.length === 0 ? (
        <div className="customerpov-grid-empty">No corporate bundles available yet.</div>
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
