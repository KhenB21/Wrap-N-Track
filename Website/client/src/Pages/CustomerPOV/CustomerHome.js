import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import TopbarCustomer from "../../Components/TopbarCustomer";
import EmployeeStatusBanner from "../../Components/EmployeeStatusBanner";
import { FaFacebookF, FaInstagram, FaTiktok, FaEnvelope } from "react-icons/fa";
import "./CustomerPOV.css";
import "./CustomerHome.css";

const HERO_SLIDES = [
  {
    webp: "/Assets/Images/HomeBackground.webp",
    src: "/Assets/Images/HomeBackground.jpg",
    alt: "Curated wedding gift box",
  },
  {
    src: "/Assets/Images/Background/background.png",
    alt: "Bridesmaid gift box styling",
  },
  {
    src: "/Assets/Images/Background/corporateBackground.png",
    alt: "Corporate gifting styling",
  },
  {
    src: "/Assets/Images/Background/bespokeBackground.png",
    alt: "Bespoke gift box styling",
  },
];

export default function CustomerHome() {
  const [showContactModal, setShowContactModal] = useState(false);
  const [isVisible, setIsVisible] = useState({});
  const [heroSlide, setHeroSlide] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setInterval(() => {
      setHeroSlide((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const observerOptions = {
      threshold: 0.15,
      rootMargin: "0px 0px -60px 0px",
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setIsVisible((prev) => ({
            ...prev,
            [entry.target.id]: true,
          }));
        }
      });
    }, observerOptions);

    const sections = document.querySelectorAll(".wt-home-reveal");
    sections.forEach((section) => observer.observe(section));

    return () => observer.disconnect();
  }, []);

  const scrollToFAQ = () => {
    const faqSection = document.getElementById("contact");
    if (faqSection) {
      faqSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  const openContactModal = () => setShowContactModal(true);
  const closeContactModal = () => setShowContactModal(false);
  const goToOrderPage = () => navigate("/order");

  const revealClass = (id) =>
    `wt-home-reveal${isVisible[id] ? " wt-home-visible" : ""}`;

  return (
    <div className="customerhome-container wt-home">
      <TopbarCustomer />
      <EmployeeStatusBanner />

      {/* Hero */}
      <section className="wt-home-hero">
        <div className="wt-home-hero-bg">
          {HERO_SLIDES.map((slide, i) => (
            <picture
              key={slide.src}
              className={`wt-home-hero-slide${i === heroSlide ? " active" : ""}`}
            >
              {slide.webp && <source srcSet={slide.webp} type="image/webp" />}
              <img
                src={slide.src}
                alt={slide.alt}
                fetchpriority={i === 0 ? "high" : "low"}
              />
            </picture>
          ))}
          <div className="wt-home-hero-gradient" />
        </div>
        <div className="wt-home-hero-dots">
          {HERO_SLIDES.map((slide, i) => (
            <button
              key={slide.src}
              className={`wt-home-hero-dot${i === heroSlide ? " active" : ""}`}
              aria-label={`Show slide ${i + 1}`}
              onClick={() => setHeroSlide(i)}
            />
          ))}
        </div>
        <div className="wt-home-hero-copy">
          <span
            className="wt-home-badge wt-home-anim"
            style={{ animationDelay: "0.05s" }}
          >
            ✨ Premium Gifting Experience
          </span>
          <h1
            className="wt-home-hero-title wt-home-anim"
            style={{ animationDelay: "0.15s" }}
          >
            Pensée Gifting Studio
          </h1>
          <p
            className="wt-home-hero-subtitle wt-home-anim"
            style={{ animationDelay: "0.25s" }}
          >
            Curating thematic gift boxes for messages you want to send across
          </p>
          <div
            className="wt-home-hero-actions wt-home-anim"
            style={{ animationDelay: "0.35s" }}
          >
            <button
              className="wt-home-btn wt-home-btn-primary"
              onClick={scrollToFAQ}
            >
              <span>GET IN TOUCH</span>
              <span className="wt-home-btn-arrow">→</span>
            </button>
            <button
              className="wt-home-btn wt-home-btn-secondary"
              onClick={goToOrderPage}
            >
              CURATE YOUR OWN BOX
            </button>
          </div>
        </div>
        <button
          className="wt-home-scroll-cue"
          onClick={() =>
            document
              .getElementById("wt-home-story")
              ?.scrollIntoView({ behavior: "smooth" })
          }
          aria-label="Scroll to learn more"
        >
          <span />
        </button>
      </section>

      {/* Story / highlight rows */}
      <section
        className={`wt-home-story wt-home-reveal ${isVisible["wt-home-story"] ? "wt-home-visible" : ""}`}
        id="wt-home-story"
      >
        <div id="story-1" className={`wt-home-row ${revealClass("story-1")}`}>
          <div className="wt-home-row-text">
            <span className="wt-home-eyebrow">Our Philosophy</span>
            <h2>
              PENSÉE <em>advocates for</em> thoughtful gifting
            </h2>
            <p>
              For us, a one-box-fits-all is a myth. We take you (the sender) and
              your recipient into account when designing gift boxes. We believe
              that gift-giving is extending a part of yourself and saying, "I
              thought about you while buying this."
            </p>
            <a href="#contact" className="wt-home-link">
              GET IN TOUCH →
            </a>
          </div>
          <div className="wt-home-row-image">
            <picture>
              <source srcSet="/Assets/Images/Advocate.webp" type="image/webp" />
              <img
                src="/Assets/Images/Advocate.png"
                alt="Thoughtful gifting"
                loading="lazy"
              />
            </picture>
          </div>
        </div>

        <div
          id="story-2"
          className={`wt-home-row reverse ${revealClass("story-2")}`}
        >
          <div className="wt-home-row-image">
            <picture>
              <source
                srcSet="/Assets/Images/femaleOwn.webp"
                type="image/webp"
              />
              <img
                src="/Assets/Images/femaleOwn.png"
                alt="Female owned"
                loading="lazy"
              />
            </picture>
          </div>
          <div className="wt-home-row-text">
            <span className="wt-home-eyebrow">Who We Are</span>
            <h2>
              PENSÉE <em>is</em> female-owned &amp; led
            </h2>
            <p>
              We aspire for gender parity in entrepreneurship, and it just so
              happens that the majority of our brand partners are female-owned,
              too! It's truly empowering to be breaking the glass ceiling
              together.
            </p>
          </div>
        </div>

        <div id="story-3" className={`wt-home-row ${revealClass("story-3")}`}>
          <div className="wt-home-row-text">
            <span className="wt-home-eyebrow">Local &amp; Proud</span>
            <h2>
              PENSÉE <em>highlights</em> Filipino brands
            </h2>
            <p>
              We believe in the talents of Filipino artisans and entrepreneurs.
              By shopping small and locally, we not only give them an
              opportunity to showcase their skills, we also directly contribute
              to local employment.
            </p>
          </div>
          <div className="wt-home-row-image">
            <picture>
              <source
                srcSet="/Assets/Images/FilipinoBrands.webp"
                type="image/webp"
              />
              <img
                src="/Assets/Images/FilipinoBrands.jpg"
                alt="Filipino brands"
                loading="lazy"
              />
            </picture>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section
        id="stats"
        className={`wt-home-stats wt-home-reveal ${isVisible["stats"] ? "wt-home-visible" : ""}`}
      >
        <div className="wt-home-stats-grid">
          <div className="wt-home-stat">
            <span className="wt-home-stat-num">500+</span>
            <span className="wt-home-stat-label">Gift boxes curated</span>
          </div>
          <div className="wt-home-stat">
            <span className="wt-home-stat-num">50+</span>
            <span className="wt-home-stat-label">Local brand partners</span>
          </div>
          <div className="wt-home-stat">
            <span className="wt-home-stat-num">100%</span>
            <span className="wt-home-stat-label">
              Handpicked &amp; personal
            </span>
          </div>
          <div className="wt-home-stat">
            <span className="wt-home-stat-num">3</span>
            <span className="wt-home-stat-label">
              Occasions — Wedding, Corporate &amp; Bespoke
            </span>
          </div>
        </div>
      </section>

      {/* Steps */}
      <section
        id="steps"
        className={`wt-home-steps wt-home-reveal ${isVisible["steps"] ? "wt-home-visible" : ""}`}
      >
        <h2 className="wt-home-section-title">
          Curate your own Gift Box in 3 steps
        </h2>
        <div className="wt-home-steps-grid">
          <div className="wt-home-step">
            <div className="wt-home-step-img">
              <img
                src="/Assets/Images/HomeBackground.jpg"
                alt="Choosing gift packaging"
                loading="lazy"
              />
            </div>
            <span className="wt-home-step-num">01</span>
            <span className="wt-home-step-title">Choose your packaging</span>
          </div>
          <div className="wt-home-step">
            <div className="wt-home-step-img">
              <img
                src="/Assets/Images/Products/Fullbloom.png"
                alt="Choosing gift contents"
                loading="lazy"
              />
            </div>
            <span className="wt-home-step-num">02</span>
            <span className="wt-home-step-title">Choose the contents</span>
          </div>
          <div className="wt-home-step">
            <div className="wt-home-step-img">
              <img
                src="/Assets/Images/Advocate.png"
                alt="Personalized signature touch"
                loading="lazy"
              />
            </div>
            <span className="wt-home-step-num">03</span>
            <span className="wt-home-step-title">Make it personal</span>
          </div>
        </div>
        <button className="wt-home-btn wt-home-btn-cta" onClick={goToOrderPage}>
          <span>Curate Your Own Gift Box Here</span>
          <span className="wt-home-btn-arrow">→</span>
        </button>
      </section>

      {/* Testimonials + FAQ */}
      <section className="wt-home-split">
        <div
          id="testimonials"
          className={`wt-home-testimonials wt-home-reveal ${isVisible["testimonials"] ? "wt-home-visible" : ""}`}
        >
          <h2 className="wt-home-section-title">Client Love</h2>
          <div className="wt-home-testimonial-grid">
            <div className="wt-home-testimonial-card">
              <img className="wt-home-testimonial-avatar" src="https://i.pravatar.cc/112?img=47" alt="Tiffany Go" loading="lazy" />
              <div className="wt-home-testimonial-body">
                <h4>TIFFANY GO</h4>
                <p>
                  "I ordered bridesmaid boxes for my wedding and honestly cried
                  opening the sample. Every little detail felt so personal, down
                  to the handwritten notes. My girls still talk about it."
                </p>
              </div>
            </div>
            <div className="wt-home-testimonial-card">
              <img className="wt-home-testimonial-avatar" src="https://i.pravatar.cc/112?img=12" alt="Marco Reyes" loading="lazy" />
              <div className="wt-home-testimonial-body">
                <h4>MARCO REYES</h4>
                <p>
                  "We needed 80 corporate gift boxes on a tight deadline and the
                  team delivered ahead of schedule, fully branded and beautifully
                  packed. Our clients keep asking where we got them."
                </p>
              </div>
            </div>
            <div className="wt-home-testimonial-card">
              <img className="wt-home-testimonial-avatar" src="https://i.pravatar.cc/112?img=45" alt="Agatha E." loading="lazy" />
              <div className="wt-home-testimonial-body">
                <h4>AGATHA E.</h4>
                <p>
                  "I wanted something bespoke for my mom's 60th and had zero idea
                  where to start. They asked the right questions and the final
                  box felt like it was made just for her."
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="wt-home-faq" id="contact">
          <div
            id="faq"
            className={`wt-home-reveal ${isVisible["faq"] ? "wt-home-visible" : ""}`}
          >
            <h2 className="wt-home-section-title">
              Frequently Asked Questions
            </h2>
            <ul className="wt-home-faq-list">
              <li>
                <b>Do you have ready-to-ship gift boxes?</b> We currently don't
                offer pre-curated gift boxes. Please fill out our Order Form and
                our team will get in touch.
              </li>
              <li>
                <b>How can I customize my own box?</b> We love getting into the
                smallest details of customized orders. You will find everything
                you need to know about bespoke orders here.
              </li>
              <li>
                <b>What is your lead time?</b> For single-box orders, please
                allow us 1-2 weeks. For bulk orders, at least 1 month after
                payment is settled.
              </li>
              <li>
                <b>What are your payment terms?</b> For single-box orders,
                payment must be settled in full. For bulk orders, 70% down
                payment prior to production; the remaining 30% before delivery.
              </li>
              <li>
                <b>What are your modes of delivery?</b> We ship via LBC,
                Lalamove/Grab Express, or in-house delivery (Metro Manila).
              </li>
            </ul>
            <div className="wt-home-contact-cta">
              <span>Still have questions?</span>
              <button
                className="wt-home-btn wt-home-btn-primary"
                onClick={openContactModal}
              >
                Get in Touch
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="wt-home-footer">
        <div className="wt-home-footer-inner">
          <div className="wt-home-footer-brand">
            <span className="wt-home-footer-logo">Pensée</span>
            <p>
              Thoughtfully curated gift boxes for weddings, corporate gifting,
              and every bespoke occasion.
            </p>
          </div>
          <div className="wt-home-footer-contact">
            <span className="wt-home-footer-heading">Get in Touch</span>
            <a
              href="mailto:hello@penseegifting.com"
              className="wt-home-footer-link"
            >
              <FaEnvelope /> inquiries@penseegiftingstudio.com
            </a>
          </div>
          <div className="wt-home-footer-social">
            <span className="wt-home-footer-heading">Follow Us</span>
            <div className="wt-home-footer-social-icons">
              <a
                href="https://www.facebook.com/sayitwithPensee"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
              >
                <FaFacebookF />
              </a>
              <a
                href="https://www.instagram.com/pensee.mnl/?hl=en"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
              >
                <FaInstagram />
              </a>
              <a
                href="https://www.tiktok.com/@pensee.mnl"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="TikTok"
              >
                <FaTiktok />
              </a>
            </div>
          </div>
        </div>
        <div className="wt-home-footer-bottom">
          <span>
            © {new Date().getFullYear()} Pensée Gifting Studio. All rights
            reserved.
          </span>
        </div>
      </footer>

      {/* Contact Modal */}
      {showContactModal && (
        <div className="modal-overlay" onClick={closeContactModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Get in Touch</h2>
              <button className="modal-close" onClick={closeContactModal}>
                &times;
              </button>
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
                  <p>
                    Monday - Friday: 9:00 AM - 6:00 PM
                    <br />
                    Saturday: 10:00 AM - 4:00 PM
                    <br />
                    Sunday: Closed
                  </p>
                </div>
                <div className="contact-item">
                  <strong>Address:</strong>
                  <p>
                    123 Gift Street, Makati City
                    <br />
                    Metro Manila, Philippines 1234
                  </p>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="pensee-cta-btn" onClick={closeContactModal}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
