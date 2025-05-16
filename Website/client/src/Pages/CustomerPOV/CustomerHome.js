import React from 'react';
import TopbarCustomer from '../../Components/TopbarCustomer';
import './CustomerPOV.css';

export default function CustomerHome() {
  return (
    <div className="customerhome-container">
      <TopbarCustomer />
      <section className="customerhome-hero">
        <div className="customerhome-hero-content">
          <h1 className="customerhome-hero-title">Pensée Gifting Studio</h1>
          <p className="customerhome-hero-subtitle">Curating thematic gift boxes for messages you want to send across</p>
          <button className="customerhome-cta-btn">Get in Touch</button>
        </div>
      </section>
      <section className="customerhome-highlights">
        <div className="customerhome-highlight">
          <h2 className="customerhome-highlight-title">PENSÉE <span>highlights</span> FILIPINO BRANDS</h2>
          <p className="customerhome-highlight-desc">We believe in the talents of Filipino artisans and entrepreneurs. By shopping small and locally, we not only give them an opportunity to showcase their skills, we also directly contribute to local employment.</p>
        </div>
        <div className="customerhome-highlight">
          <h2 className="customerhome-highlight-title">PENSÉE <span>advocates for</span> THOUGHTFUL GIFTING</h2>
          <p className="customerhome-highlight-desc">For us, a one-box-fits-all is a myth. We take you (the sender) and your recipient into account when designing gift boxes. We believe that gift-giving is extending a part of yourself and saying, "I thought about you while buying this."</p>
        </div>
        <div className="customerhome-highlight">
          <h2 className="customerhome-highlight-title">PENSÉE <span>is</span> FEMALE-OWNED & LED</h2>
          <p className="customerhome-highlight-desc">We aspire for gender parity in entrepreneurship, and it just so happens that the majority of our brand partners are female-owned, too! It's truly empowering to be breaking the glass ceiling together.</p>
        </div>
      </section>
    </div>
  );
} 