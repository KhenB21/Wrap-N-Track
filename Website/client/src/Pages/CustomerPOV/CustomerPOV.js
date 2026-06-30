import React from 'react';
import { useNavigate, Routes, Route } from 'react-router-dom';
import TopbarCustomer from '../../Components/TopbarCustomer';
import './CustomerPOV.css';
import './CustomerPOV.wedding.css';
import CarloPreview from './CarloPreview';
import EricMarielPreview from './EricMarielPreview';
import DanielPreview from './DanielPreview';

const introText = `Whether you're a "Type A" kind of couple who likes to oversee and cover every angle of the wedding, or the chill type who wholeheartedly trusts suppliers, you can be certain of one thing: you can let your hair down with us.\n\nWe do more than just sourcing, arranging, and delivering gift boxes—there's artistry involved. From packaging to personalized letter cards, we leave no stone unturned.\n\nNicholas Sparks once said, "Every great love starts with a great story." Allow us to weave yours into curated gift boxes.`;

const products = [
  {
    id: 1,
    image: '/Assets/Images/Products/carlo.png',
    title: 'Carlo',
    paragraph: 'Thank You Gift Boxes\nWedding Style: Modern Romantic Revelry',
  },
  {
    id: 2,
    image: '/Assets/Images/Products/Eric.png',
    title: 'ERIC & MARIEL',
    paragraph: "Thank You Boxes for Bride's Entourage\nWedding Style: Boho",
  },
  {
    id: 3,
    image: '/Assets/Images/Products/Daniel.png',
    title: 'Daniel',
    paragraph: 'Entourage Proposal Gift Boxes\nWedding Style: Modern, Minimalist, & Laid-back',
  },
];

export default function CustomerPOV() {
  const navigate = useNavigate();

  return (
    <div className="customerpov-container wedding-page">
      <TopbarCustomer />
      <Routes>
        <Route path="/product/1" element={<CarloPreview />} />
        <Route path="/product/2" element={<EricMarielPreview />} />
        <Route path="/product/3" element={<DanielPreview />} />
      </Routes>

      <section
        className="wedding-hero customerpov-hero"
        style={{
          backgroundImage: "url('/Assets/Images/Background/background.png')",
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundSize: 'cover',
          backgroundColor: '#f2efe3',
        }}
      >
        <div className="wedding-hero__overlay" aria-hidden="true" />
        <div className="wedding-hero__content customerpov-hero-centerbox">
          <div>
            <h1 className="wedding-hero__title customerpov-hero-title">WEDDING</h1>
            <span className="wedding-hero__flourish" aria-hidden="true" />
          </div>
        </div>
      </section>

      <section className="wedding-intro">
        <div className="wedding-intro__inner">
          <div className="wedding-intro__logo customerpov-title-wrapper">
            <img
              src="/Assets/Images/PenseeLogos/pensee-logo-with-name-vertical.png"
              alt="Pensee Logo Vertical"
              className="customerpov-logo-vertical"
            />
          </div>
          <div className="wedding-intro__divider" aria-hidden="true">
            <span className="wedding-intro__divider-line" />
            <span className="wedding-intro__divider-gem" />
            <span className="wedding-intro__divider-line" />
          </div>
          <div className="wedding-intro__text customerpov-intro">
            {introText.split('\n').map((line, i) => (
              <p key={i}>{line}</p>
            ))}
          </div>
        </div>
      </section>

      <section className="wedding-collections">
        <div className="wedding-collections__inner">
          <div className="wedding-collections__grid customerpov-grid">
            {products.map((product) => (
              <article
                key={product.id}
                className="wedding-collection customerpov-card"
                onClick={() => navigate(`/product/${product.id}`)}
                onKeyDown={(e) => e.key === 'Enter' && navigate(`/product/${product.id}`)}
                tabIndex={0}
                role="button"
                aria-label={`View details for ${product.title}`}
              >
                <div className="wedding-collection__image-frame">
                  <div className="wedding-collection__image-wrap customerpov-card-image-wrapper">
                    {product.image ? (
                      <>
                        <img
                          src={product.image}
                          alt={product.title}
                          className="wedding-collection__image customerpov-card-image"
                        />
                        <div className="wedding-collection__image-overlay" aria-hidden="true" />
                        <span className="wedding-collection__view">View Collection</span>
                      </>
                    ) : (
                      <div className="customerpov-card-image-placeholder">Image Here</div>
                    )}
                  </div>
                </div>
                <div className="wedding-collection__body customerpov-card-content">
                  <h2 className="wedding-collection__title customerpov-card-title">{product.title}</h2>
                  <div className="wedding-collection__desc customerpov-card-paragraph">
                    {product.paragraph.split('\n').map((line, i) => (
                      <span key={i} className="wedding-collection__desc-line">{line}</span>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
