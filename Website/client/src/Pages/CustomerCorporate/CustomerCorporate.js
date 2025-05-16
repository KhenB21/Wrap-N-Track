import React from 'react';
import { useNavigate } from 'react-router-dom';
import TopbarCustomer from '../../Components/TopbarCustomer';
import './CustomerCorporate.css';

const introText = `Professional, personal, and practical but fun—these words describe Pensée's corporate gifts.`;

const details = [
  {
    title: 'Professional',
    paragraph: `Our team ensures that the gift boxes are appropriate to the occasion and are aligned with the company's branding.`
  },
  {
    title: 'Personal',
    paragraph: `During the design process, we also carefully analyze recipients. Are the gift boxes for clients, VIPs, media, influencers, supervisors or employees? Identifying this allows us to curate boxes tailored to their needs.`
  },
  {
    title: 'Practical but fun',
    paragraph: `When we hear the words "corporate gifts", branded tumblers, journals, and mugs come to mind. We strive to think outside the box. Local, functional, and unique products that will make the unboxing experience thrilling!`
  }
];

const products = [
  {
    id: 1,
    image: '/Assets/Images/Products/corporate1.png',
    title: 'LEGION',
    paragraph: 'Branded Corporate Gift Box\nFor Team Building Events',
  },
  {
    id: 2,
    image: '/Assets/Images/Products/corporate2.png',
    title: 'TSOKOLATE AT BATIROL',
    paragraph: 'Local Artisan Gift Box\nFor VIP Clients',
  },
  {
    id: 3,
    image: '/Assets/Images/Products/corporate3.png',
    title: 'GO TOUCH',
    paragraph: 'Functional Tech Gift Box\nFor Employees',
  },
];

export default function CustomerCorporate() {
  const navigate = useNavigate();
  return (
    <div className="customerpov-container">
      <TopbarCustomer />
      {/* Hero Section with background image */}
      <section
        className="customerpov-hero"
        style={{
          backgroundImage: "url('/Assets/Images/Background/corporateBackground.png')",
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundSize: 'cover',
          backgroundColor: '#ff00ff' // Fallback magenta for debugging
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
      <div className="customerpov-grid">
        {products.map((product) => (
          <div
            key={product.id}
            className="customerpov-card"
            tabIndex={0}
            role="button"
            aria-label={`View details for ${product.title}`}
          >
            <div className="customerpov-card-image-wrapper">
              {product.image ? (
                <img src={product.image} alt={product.title} className="customerpov-card-image" />
              ) : (
                <div className="customerpov-card-image-placeholder">Image Here</div>
              )}
            </div>
            <div className="customerpov-card-content">
              <div className="customerpov-card-title">{product.title}</div>
              <div className="customerpov-card-paragraph">
                {product.paragraph.split('\n').map((line, i) => <div key={i}>{line}</div>)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 