import React from 'react';
import { Link, useNavigate, Routes, Route } from 'react-router-dom';
import TopbarCustomer from '../../Components/TopbarCustomer';
import './CustomerPOV.css';
import CarloPreview from './CarloPreview';
import EricMarielPreview from './EricMarielPreview';
import DanielPreview from './DanielPreview';

const styles = {
  container: {
    minHeight: '100vh',
    background: '#f9f7ef', // soft cream
    fontFamily: '"Cormorant Garamond", serif',
    color: '#444',
    paddingBottom: '60px'
  },
  main: {
    width: '100%',
    overflow: 'auto'
  },
  hero: {
    background: '#f8f9fa',
    padding: '80px 24px',
    textAlign: 'center'
  },
  heroTitle: {
    fontSize: '48px',
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: '24px'
  },
  heroSubtitle: {
    fontSize: '20px',
    color: '#6c757d',
    maxWidth: '800px',
    margin: '0 auto',
    lineHeight: '1.6'
  },
  content: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '60px 24px'
  },
  section: {
    marginBottom: '80px'
  },
  sectionTitle: {
    fontSize: '56px',
    fontWeight: '400',
    color: '#8a8a8a',
    textAlign: 'center',
    margin: '0 auto',
    marginTop: '40px',
    marginBottom: '40px',
    letterSpacing: '0.1em',
    background: '#f6f3e7',
    display: 'inline-block',
    padding: '16px 64px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
    gap: '48px',
    maxWidth: '1200px',
    margin: '0 auto',
    marginTop: '40px'
  },
  card: {
    background: '#fff',
    boxShadow: '0 4px 24px rgba(0,0,0,0.07)',
    overflow: 'hidden',
    cursor: 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s',
    display: 'flex',
    flexDirection: 'column',
    border: '1px solid #f0e9d2',
  },
  cardImage: {
    width: '100%',
    height: '320px',
    objectFit: 'cover',
    background: '#f6f3e7',
  },
  cardContent: {
    padding: '32px 24px 24px 24px',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-start',
  },
  cardTitle: {
    fontFamily: '"Cormorant Garamond", serif',
    fontSize: '32px',
    fontWeight: '500',
    color: '#6d6d6d',
    marginBottom: '12px',
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
  },
  cardParagraph: {
    fontFamily: '"Lora", serif',
    fontSize: '18px',
    color: '#444',
    marginBottom: '0',
    lineHeight: '1.7',
  },
  cta: {
    textAlign: 'center',
    padding: '80px 24px',
    background: '#f8f9fa'
  },
  ctaTitle: {
    fontSize: '36px',
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: '24px'
  },
  button: {
    padding: '12px 32px',
    background: '#4a90e2',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background 0.3s ease',
    textDecoration: 'none',
    display: 'inline-block',
    '&:hover': {
      background: '#357abd'
    }
  }
};

const weddingStyles = [
  {
    title: "Modern Romantic",
    subtitle: "Elegant & Contemporary",
    description: "Perfect for couples who love clean lines and modern aesthetics with a touch of romance.",
    image: "https://images.unsplash.com/photo-1519741497674-611481863552"
  },
  {
    title: "Boho Chic",
    subtitle: "Free-spirited & Natural",
    description: "For the free-spirited couple who loves natural elements and organic textures.",
    image: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc"
  },
  {
    title: "Classic Elegance",
    subtitle: "Timeless & Sophisticated",
    description: "Traditional elegance with a modern twist, perfect for a timeless celebration.",
    image: "https://images.unsplash.com/photo-1519225421980-715cb0215aed"
  },
  {
    title: "Minimalist Modern",
    subtitle: "Clean & Contemporary",
    description: "For couples who appreciate simplicity and clean design in their celebration.",
    image: "https://images.unsplash.com/photo-1519741497674-611481863552"
  }
];

// You can edit this intro text to match your brand
const introText = `Whether you're a "Type A" kind of couple who likes to oversee and cover every angle of the wedding, or the chill type who wholeheartedly trusts suppliers, you can be certain of one thing: you can let your hair down with us.\n\nWe do more than just sourcing, arranging, and delivering gift boxes—there's artistry involved. From packaging to personalized letter cards, we leave no stone unturned.\n\nNicholas Sparks once said, "Every great love starts with a great story." Allow us to weave yours into curated gift boxes.`;

// Placeholder data for cards. Insert your own images and text.
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
  // Add more cards as needed
];

export default function CustomerPOV() {
  const navigate = useNavigate();
  return (
    <div className="customerpov-container">
      <TopbarCustomer />
      <Routes>
        <Route path="/product/1" element={<CarloPreview />} />
        <Route path="/product/2" element={<EricMarielPreview />} />
        <Route path="/product/3" element={<DanielPreview />} />
      </Routes>
      {/* Hero Section with forced background image */}
      <section
        className="customerpov-hero"
        style={{
          backgroundImage: "url('/Assets/Images/Background/background.png')",
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundSize: 'cover',
          backgroundColor: '#ff00ff' // Fallback magenta for debugging
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
        {introText.split('\n').map((line, i) => (
          <p key={i}>{line}</p>
        ))}
      </div>
      <div className="customerpov-grid">
        {products.map((product) => (
          <div
            key={product.id}
            className="customerpov-card"
            onClick={() => navigate(`/product/${product.id}`)}
            tabIndex={0}
            role="button"
            aria-label={`View details for ${product.title}`}
          >
            {/* Insert your image URL in the products array above */}
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