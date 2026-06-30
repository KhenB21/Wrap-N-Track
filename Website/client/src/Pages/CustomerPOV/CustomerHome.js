import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import TopbarCustomer from '../../Components/TopbarCustomer';
import EmployeeStatusBanner from '../../Components/EmployeeStatusBanner';
import {
  LuSparkles,
  LuArrowRight,
  LuGift,
  LuLayers,
  LuPenLine,
  LuHeart,
  LuPalette,
  LuUsers,
  LuLeaf,
  LuChevronDown,
  LuStar,
} from 'react-icons/lu';
import './CustomerPOV.css';
import './CustomerHome.css';

const STORY_SECTIONS = [
  {
    id: 'story-thoughtful',
    number: '01',
    heading: <>PENSÉE <em>advocates for</em> THOUGHTFUL GIFTING</>,
    text: 'For us, a one-box-fits-all is a myth. We take you (the sender) and your recipient into account when designing gift boxes. We believe that gift-giving is extending a part of yourself and saying, "I thought about you while buying this."',
    image: '/Assets/Images/Advocate.png',
    alt: 'Thoughtful gifting',
    link: '#contact',
    reverse: false,
  },
  {
    id: 'story-female',
    number: '02',
    heading: <>PENSÉE <em>is</em> FEMALE-OWNED & LED</>,
    text: "We aspire for gender parity in entrepreneurship, and it just so happens that the majority of our brand partners are female-owned, too! It's truly empowering to be breaking the glass ceiling together.",
    image: '/Assets/Images/femaleOwn.png',
    alt: 'Female owned',
    reverse: true,
  },
  {
    id: 'story-filipino',
    number: '03',
    heading: <>PENSÉE <em>highlights</em> FILIPINO BRANDS</>,
    text: 'We believe in the talents of Filipino artisans and entrepreneurs. By shopping small and locally, we not only give them an opportunity to showcase their skills, we also directly contribute to local employment.',
    image: '/Assets/Images/FilipinoBrands.jpg',
    alt: 'Filipino brands',
    reverse: false,
  },
];

const FEATURED_COLLECTIONS = [
  {
    id: 1,
    title: 'Carlo',
    tag: 'Modern Romantic',
    description: 'Thank You Gift Boxes — Wedding Style: Modern Romantic Revelry',
    image: '/Assets/Images/Products/carlo.png',
    path: '/product/1',
  },
  {
    id: 2,
    title: 'Eric & Mariel',
    tag: 'Boho',
    description: "Thank You Boxes for Bride's Entourage — Wedding Style: Boho",
    image: '/Assets/Images/Products/Eric.png',
    path: '/product/2',
  },
  {
    id: 3,
    title: 'Daniel',
    tag: 'Minimalist',
    description: 'Entourage Proposal Gift Boxes — Wedding Style: Modern, Minimalist, & Laid-back',
    image: '/Assets/Images/Products/Daniel.png',
    path: '/product/3',
  },
];

const PROCESS_STEPS = [
  { step: 1, label: 'Choose your packaging', icon: LuGift },
  { step: 2, label: 'Choose the contents', icon: LuLayers },
  { step: 3, label: 'Make it personal', icon: LuPenLine },
];

const BRAND_SHOWCASE = [
  { name: 'Local Artisans', icon: LuPalette },
  { name: 'Female Founders', icon: LuUsers },
  { name: 'Sustainable Craft', icon: LuLeaf },
  { name: 'Made with Heart', icon: LuHeart },
];

const TESTIMONIALS = [
  {
    name: 'TIFFANY GO',
    text: 'Tempus elementum posuere facilisi sapien adipiscing fusce lectus molestie. Tellus aenean quisque laoreet penatibus odio urna nullam neque nibh inceptos maecenas.',
  },
  {
    name: 'KIM NAMJOON',
    text: 'Commodo aliquam adipiscing senectus posuere nunc eros faucibus praesent dis semper ante. Adipiscing nullam massa sem class neque.',
  },
  {
    name: 'AGATHA E.',
    text: 'Conubia vivamus purus maecenas cras est letius fames id. Tortor imperdiet adipiscing felis libero ultricies lorem nulla.',
  },
];

const FAQ_ITEMS = [
  {
    question: 'Do you have ready-to-ship gift boxes?',
    answer: "We currently don't offer pre-curated gift boxes. Please fill out our Order Form and our team will get in touch.",
  },
  {
    question: 'How can I customize my own box?',
    answer: 'We love getting into the smallest details of customized orders. You will find everything you need to know about bespoke orders here.',
  },
  {
    question: 'What is your lead time?',
    answer: 'For single-box orders, please allow us 1-2 weeks. For bulk orders, at least 1 month after payment is settled.',
  },
  {
    question: 'What are your payment terms?',
    answer: 'For single-box orders, payment must be settled in full. For bulk orders, 70% down payment prior to production; the remaining 30% before delivery.',
  },
  {
    question: 'What are your modes of delivery?',
    answer: 'We ship via LBC, Lalamove/Grab Express, or in-house delivery (Metro Manila).',
  },
];

export default function CustomerHome() {
  const [showContactModal, setShowContactModal] = useState(false);
  const [openFaq, setOpenFaq] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const observerOptions = {
      threshold: 0.12,
      rootMargin: '0px 0px -40px 0px',
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
        }
      });
    }, observerOptions);

    const sections = document.querySelectorAll('.animate-on-scroll');
    sections.forEach((section) => observer.observe(section));

    return () => observer.disconnect();
  }, []);

  const scrollToSection = (id) => {
    const section = document.getElementById(id);
    if (section) {
      section.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const openContactModal = () => setShowContactModal(true);
  const closeContactModal = () => setShowContactModal(false);
  const goToOrderPage = () => navigate('/order');
  const goToWedding = () => navigate('/wedding');

  const toggleFaq = (index) => {
    setOpenFaq((prev) => (prev === index ? -1 : index));
  };

  return (
    <div className="customerhome-container lux-home">
      <TopbarCustomer />
      <EmployeeStatusBanner />

      {/* Hero */}
      <section className="lux-hero">
        <div className="lux-hero__media">
          <img
            className="lux-hero__bg"
            src="/Assets/Images/HomeBackground.jpg"
            alt="Curated gift box lifestyle"
          />
          <div className="lux-hero__overlay" />
          <div className="lux-hero__grain" aria-hidden="true" />
        </div>

        <div className="lux-hero__content">
          <div className="lux-hero__badge">
            <LuSparkles className="lux-hero__badge-icon" aria-hidden="true" />
            Premium Gifting Experience
          </div>
          <h1 className="lux-hero__title">Pensée Gifting Studio</h1>
          <p className="lux-hero__subtitle">
            Curating thematic gift boxes for messages you want to send across
          </p>
          <div className="lux-hero__actions">
            <button type="button" className="lux-btn lux-btn--primary" onClick={() => scrollToSection('contact')}>
              <span>Get in Touch</span>
              <LuArrowRight className="lux-btn__icon" aria-hidden="true" />
            </button>
            <button type="button" className="lux-btn lux-btn--ghost" onClick={goToOrderPage}>
              <span>Crate Your Box</span>
              <LuGift className="lux-btn__icon" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="lux-hero__scroll" aria-hidden="true">
          <span>Discover</span>
          <span className="lux-hero__scroll-line" />
        </div>
      </section>

      {/* Brand Story — philosophy sections */}
      <section className="lux-section lux-section--warm">
        <header className="lux-section__header animate-on-scroll" id="story-header">
          <span className="lux-section__eyebrow">Our Philosophy</span>
          <h2 className="lux-section__title">Crafted with Intention</h2>
          <p className="lux-section__lead">
            Every box tells a story — yours, thoughtfully composed and beautifully presented.
          </p>
        </header>

        <div className="lux-story">
          {STORY_SECTIONS.map((section) => (
            <article
              key={section.id}
              id={section.id}
              className={`lux-story__row animate-on-scroll${section.reverse ? ' lux-story__row--reverse' : ''}`}
            >
              <div className="lux-story__content">
                <span className="lux-story__number">{section.number}</span>
                <h3 className="lux-story__heading">{section.heading}</h3>
                <p className="lux-story__text">{section.text}</p>
                {section.link && (
                  <a href={section.link} className="lux-story__link">
                    Get in Touch
                    <LuArrowRight aria-hidden="true" />
                  </a>
                )}
              </div>
              <div className="lux-story__visual">
                <div className="lux-story__accent lux-story__accent--tl" aria-hidden="true" />
                <div className="lux-story__accent lux-story__accent--br" aria-hidden="true" />
                <div className="lux-story__frame">
                  <img src={section.image} alt={section.alt} loading="lazy" />
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Featured Collections */}
      <section className="lux-section lux-section--cream">
        <header className="lux-section__header animate-on-scroll" id="collections-header">
          <span className="lux-section__eyebrow">Signature Work</span>
          <h2 className="lux-section__title">Featured Collections</h2>
          <p className="lux-section__lead">
            Explore curated wedding gift boxes crafted for unforgettable celebrations.
          </p>
        </header>

        <div className="lux-collections">
          {FEATURED_COLLECTIONS.map((collection) => (
            <article
              key={collection.id}
              className="lux-collection animate-on-scroll"
              id={`collection-${collection.id}`}
              onClick={() => navigate(collection.path)}
              onKeyDown={(e) => e.key === 'Enter' && navigate(collection.path)}
              role="button"
              tabIndex={0}
            >
              <div className="lux-collection__image-wrap">
                <img
                  className="lux-collection__image"
                  src={collection.image}
                  alt={collection.title}
                  loading="lazy"
                />
                <span className="lux-collection__tag">{collection.tag}</span>
              </div>
              <div className="lux-collection__body">
                <h3 className="lux-collection__title">{collection.title}</h3>
                <p className="lux-collection__desc">{collection.description}</p>
                <span className="lux-collection__cta">
                  View Collection
                  <LuArrowRight aria-hidden="true" />
                </span>
              </div>
            </article>
          ))}
        </div>

        <div className="lux-section__cta animate-on-scroll">
          <button type="button" className="lux-btn lux-btn--ghost" onClick={goToWedding}>
            <span>View All Wedding Styles</span>
            <LuArrowRight className="lux-btn__icon" aria-hidden="true" />
          </button>
        </div>
      </section>

      {/* Process Timeline */}
      <section className="lux-section lux-section--lavender">
        <header className="lux-section__header animate-on-scroll" id="process-header">
          <span className="lux-section__eyebrow">Your Journey</span>
          <h2 className="lux-section__title">Create your own Gift Box in 3 steps</h2>
          <p className="lux-section__lead">
            A seamless, guided experience from packaging to personal touch.
          </p>
        </header>

        <div className="lux-process animate-on-scroll" id="process">
          <div className="lux-process__rail" aria-hidden="true">
            <div className="lux-process__rail-fill" />
          </div>
          <div className="lux-process__steps">
            {PROCESS_STEPS.map(({ step, label, icon: Icon }) => (
              <div key={step} className="lux-process__step">
                <div className="lux-process__node-wrap">
                  <div className="lux-process__node">
                    <Icon className="lux-process__node-icon" aria-hidden="true" />
                  </div>
                  <span className="lux-process__num">{step}</span>
                </div>
                <p className="lux-process__label">{label}</p>
              </div>
            ))}
          </div>
          <div className="lux-process__cta-wrap">
            <button type="button" className="lux-btn lux-btn--white" onClick={goToOrderPage}>
              <span>Curate your own gift box here</span>
              <LuArrowRight className="lux-btn__icon" aria-hidden="true" />
            </button>
          </div>
        </div>
      </section>

      {/* Brand Showcase */}
      <section className="lux-section lux-section--white">
        <header className="lux-section__header animate-on-scroll" id="brands-header">
          <span className="lux-section__eyebrow">Partners & Values</span>
          <h2 className="lux-section__title">Championing Filipino Excellence</h2>
          <p className="lux-section__lead">
            We partner with artisans and entrepreneurs who share our passion for meaningful gifting.
          </p>
        </header>

        <div className="lux-brands animate-on-scroll" id="brands">
          {BRAND_SHOWCASE.map(({ name, icon: Icon }) => (
            <div key={name} className="lux-brand">
              <div className="lux-brand__icon-wrap">
                <Icon className="lux-brand__icon" aria-hidden="true" />
              </div>
              <span className="lux-brand__name">{name}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="lux-section lux-section--cream">
        <header className="lux-section__header animate-on-scroll" id="testimonials-header">
          <span className="lux-section__eyebrow">Kind Words</span>
          <h2 className="lux-section__title">Client Love</h2>
          <p className="lux-section__lead">
            Stories from couples and clients who trusted us with their special moments.
          </p>
        </header>

        <div className="lux-testimonials">
          {TESTIMONIALS.map((item, index) => (
            <blockquote
              key={item.name}
              className="lux-testimonial animate-on-scroll"
              id={`testimonial-${index}`}
            >
              <span className="lux-testimonial__quote" aria-hidden="true">&ldquo;</span>
              <div className="lux-testimonial__stars" aria-hidden="true">
                {[...Array(5)].map((_, i) => (
                  <LuStar key={i} className="lux-testimonial__star" />
                ))}
              </div>
              <p className="lux-testimonial__text">&ldquo;{item.text}&rdquo;</p>
              <footer className="lux-testimonial__author">{item.name}</footer>
            </blockquote>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="lux-section lux-section--white" id="contact">
        <header className="lux-section__header animate-on-scroll" id="faq-header">
          <span className="lux-section__eyebrow">Questions Answered</span>
          <h2 className="lux-section__title">Frequently Asked Questions</h2>
          <p className="lux-section__lead">
            Everything you need to know before beginning your gifting journey.
          </p>
        </header>

        <div className="lux-faq animate-on-scroll" id="faq">
          {FAQ_ITEMS.map((item, index) => (
            <div
              key={item.question}
              className={`lux-faq__item${openFaq === index ? ' lux-faq__item--open' : ''}`}
            >
              <button
                type="button"
                className="lux-faq__trigger"
                onClick={() => toggleFaq(index)}
                aria-expanded={openFaq === index}
              >
                <span className="lux-faq__question">{item.question}</span>
                <LuChevronDown className="lux-faq__chevron" aria-hidden="true" />
              </button>
              <div className="lux-faq__answer">
                <div className="lux-faq__answer-inner">{item.answer}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="lux-faq__cta animate-on-scroll">
          <span className="lux-faq__cta-text">Still have questions?</span>
          <button type="button" className="lux-btn lux-btn--primary" onClick={openContactModal}>
            <span>Get in Touch</span>
            <LuArrowRight className="lux-btn__icon" aria-hidden="true" />
          </button>
        </div>
      </section>

      {/* Contact Modal */}
      {showContactModal && (
        <div className="modal-overlay" onClick={closeContactModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Get in Touch</h2>
              <button type="button" className="modal-close" onClick={closeContactModal}>&times;</button>
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
                    Monday - Friday: 9:00 AM - 6:00 PM<br />
                    Saturday: 10:00 AM - 4:00 PM<br />
                    Sunday: Closed
                  </p>
                </div>
                <div className="contact-item">
                  <strong>Address:</strong>
                  <p>
                    123 Gift Street, Makati City<br />
                    Metro Manila, Philippines 1234
                  </p>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="pensee-cta-btn" onClick={closeContactModal}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
