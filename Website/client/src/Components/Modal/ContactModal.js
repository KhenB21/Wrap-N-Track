import React from 'react';
import './ContactModal.css'

const ContactModal = ({ isOpen, onClose }) => {
  
  return (
    <div className={`modal-overlay ${isOpen ? 'active' : ''}`} onClick={onClose}>
      <div className="contact-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="contact-modal-header">
          <h2>Get in Touch</h2>
        </div>
        <div className="modal-body">
          <div className="contact-info">
            <h3 style={{justifySelf: 'center'}}>Contact Information</h3>
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
        <div className="contact-modal-footer">
          <button className="pensee-cta-btn" id="close" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

export default ContactModal;