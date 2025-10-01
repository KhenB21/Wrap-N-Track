import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import TopbarCustomer from '../../Components/TopbarCustomer';
import EmployeeStatusBanner from '../../Components/EmployeeStatusBanner';
import './CustomerPOV.css';

export default function CustomerHome() {
  const [showContactModal, setShowContactModal] = useState(false);
  const [isVisible, setIsVisible] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setIsVisible(prev => ({
            ...prev,
            [entry.target.id]: true
          }));
        }
      });
    }, observerOptions);

    const sections = document.querySelectorAll('.animate-on-scroll');
    sections.forEach(section => observer.observe(section));

    return () => observer.disconnect();
  }, []);

  const scrollToFAQ = () => {
    const faqSection = document.getElementById('contact');
    if (faqSection) {
      faqSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const openContactModal = () => {
    setShowContactModal(true);
  };

  const closeContactModal = () => {
    setShowContactModal(false);
  };

  const goToOrderPage = () => {
    navigate('/order');
  };

  return (
    <div className="customerhome-container pensee-home">
      <TopbarCustomer />
      <EmployeeStatusBanner />
      {/* Enhanced Hero Section */}
      <section className="pensee-hero-image-section enhanced">
        <div className="pensee-hero-bg-wrapper">
          <img className="pensee-hero-bg" src="/Assets/Images/HomeBackground.jpg" alt="Gift box background" />
          <div className="pensee-hero-gradient-overlay"></div>
        </div>
        <div className="pensee-hero-overlay enhanced">
          <div className="pensee-hero-badge">✨ Premium Gifting Experience</div>
          <h1 className="pensee-hero-title enhanced">Pensée Gifting Studio</h1>
          <p className="pensee-hero-subtitle enhanced">Curating thematic gift boxes for messages you want to send across</p>
          <div className="pensee-hero-actions">
            <button className="pensee-cta-btn primary" onClick={scrollToFAQ}>
              <span>GET IN TOUCH</span>
              <i className="arrow-icon">→</i>
            </button>
            
          </div>
          
        </div>
      </section>

      {/* Alternating Highlight Sections */}
      <section className="pensee-highlight-section">
        <div className="pensee-highlight-row">
          <div className="pensee-highlight-text">
            <h2>PENSÉE <em>advocates for</em> THOUGHTFUL GIFTING</h2>
            <p>For us, a one-box-fits-all is a myth. We take you (the sender) and your recipient into account when designing gift boxes. We believe that gift-giving is extending a part of yourself and saying, "I thought about you while buying this."</p>
            <a href="#contact" className="pensee-highlight-link">GET IN TOUCH →</a>
          </div>
          <div className="pensee-highlight-image">
            <img src="/Assets/Images/Advocate.png" alt="Thoughtful gifting" />
          </div>
        </div>
        <div className="pensee-highlight-row reverse">
          <div className="pensee-highlight-image">
            <img src="/Assets/Images/femaleOwn.png" alt="Female owned" />
          </div>
          <div className="pensee-highlight-text">
            <h2>PENSÉE <em>is</em> FEMALE-OWNED & LED</h2>
            <p>We aspire for gender parity in entrepreneurship, and it just so happens that the majority of our brand partners are female-owned, too! It's truly empowering to be breaking the glass ceiling together.</p>
          </div>
        </div>
        <div className="pensee-highlight-row">
          <div className="pensee-highlight-text">
            <h2>PENSÉE <em>highlights</em> FILIPINO BRANDS</h2>
            <p>We believe in the talents of Filipino artisans and entrepreneurs. By shopping small and locally, we not only give them an opportunity to showcase their skills, we also directly contribute to local employment.</p>
          </div>
          <div className="pensee-highlight-image">
            <img src="/Assets/Images/FilipinoBrands.jpg" alt="Filipino brands" />
          </div>
        </div>
      </section>

      {/* Steps Section */}
      <section className="pensee-how-it-works pensee-steps-bg">
        <h2 className="pensee-section-title">Curate your own Gift Box in 3 steps</h2>
        <div className="pensee-steps">
          <div className="pensee-step">
            <span className="pensee-step-bgnum">1</span>
            <span className="pensee-step-title">Choose your packaging</span>
          </div>
          <div className="pensee-step">
            <span className="pensee-step-bgnum">2</span>
            <span className="pensee-step-title">Choose the contents</span>
          </div>
          <div className="pensee-step">
            <span className="pensee-step-bgnum">3</span>
            <span className="pensee-step-title">Make it personal</span>
          </div>
        </div>
        <button className="pensee-cta-btn pensee-cta-secondary" onClick={goToOrderPage}>Curate your own gift box here</button>
      </section>

      {/* Testimonials Section */}
      <section className="pensee-testimonials">
        <h2 className="pensee-section-title">Client Love</h2>
        <div className="pensee-testimonial-cards">
          <div className="pensee-testimonial-card">
            <h4>TIFFANY GO</h4>
            <p>"Tempus elementum posuere facilisi sapien adipiscing fusce lectus molestie. Tellus aenean quisque laoreet penatibus odio urna nullam neque nibh inceptos maecenas."</p>
          </div>
          <div className="pensee-testimonial-card">
            <h4>KIM NAMJOON</h4>
            <p>"Commodo aliquam adipiscing senectus posuere nunc eros faucibus praesent dis semper ante. Adipiscing nullam massa sem class neque."</p>
          </div>
          <div className="pensee-testimonial-card">
            <h4>AGATHA E.</h4>
            <p>"Conubia vivamus purus maecenas cras est letius fames id. Tortor imperdiet adipiscing felis libero ultricies lorem nulla."</p>
          </div>
        </div>
      </section>

      {/* FAQ / Contact Section */}
      <section className="pensee-faq-contact" id="contact">
        <h2 className="pensee-section-title">Frequently Asked Questions</h2>
        <ul className="pensee-faq-list">
          <li><b>Do you have ready-to-ship gift boxes?</b> We currently don't offer pre-curated gift boxes. Please fill out our Order Form and our team will get in touch.</li>
          <li><b>How can I customize my own box?</b> We love getting into the smallest details of customized orders. You will find everything you need to know about bespoke orders here.</li>
          <li><b>What is your lead time?</b> For single-box orders, please allow us 1-2 weeks. For bulk orders, at least 1 month after payment is settled.</li>
          <li><b>What are your payment terms?</b> For single-box orders, payment must be settled in full. For bulk orders, 70% down payment prior to production; the remaining 30% before delivery.</li>
          <li><b>What are your modes of delivery?</b> We ship via LBC, Lalamove/Grab Express, or in-house delivery (Metro Manila).</li>
        </ul>
        <div className="pensee-contact-cta">
          <span>Still have questions?</span>
          <button className="pensee-cta-btn" onClick={openContactModal}>Get in Touch</button>
        </div>
      </section>

      {/* Contact Modal */}
      {showContactModal && (
        <div className="modal-overlay" onClick={closeContactModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Get in Touch</h2>
              <button className="modal-close" onClick={closeContactModal}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="contact-info">
                <h3>Contact Information</h3>
                <div className="contact-item">
                  <strong>Email:</strong>
                  <p>hello@penseegifting.com</p>
                </div>
                <div className="contact-item">
                  <strong>Phone:</strong>
                  <p>+63 917 123 4567</p>
                </div>
                <div className="contact-item">
                  <strong>Business Hours:</strong>
                  <p>Monday - Friday: 9:00 AM - 6:00 PM<br />
                  Saturday: 10:00 AM - 4:00 PM<br />
                  Sunday: Closed</p>
                </div>
                <div className="contact-item">
                  <strong>Address:</strong>
                  <p>123 Gift Street, Makati City<br />
                  Metro Manila, Philippines 1234</p>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="pensee-cta-btn" onClick={closeContactModal}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 