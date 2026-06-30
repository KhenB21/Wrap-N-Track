import React from "react";
import TopbarCustomer from "../../Components/TopbarCustomer";
import "./CustomerCorporate.css";

const introText = `Professional, personal, and practical but fun—these words describe Pensée's corporate gifts.`;

const details = [
  {
    title: "Professional",
    paragraph: `Our team ensures that the gift boxes are appropriate to the occasion and are aligned with the company's branding.`,
  },
  {
    title: "Personal",
    paragraph: `During the design process, we also carefully analyze recipients. Are the gift boxes for clients, VIPs, media, influencers, supervisors or employees? Identifying this allows us to curate boxes tailored to their needs.`,
  },
  {
    title: "Practical but fun",
    paragraph: `When we hear the words "corporate gifts", branded tumblers, journals, and mugs come to mind. We strive to think outside the box. Local, functional, and unique products that will make the unboxing experience thrilling!`,
  },
];

const products = [
  {
    id: 1,
    image: "/Assets/Images/Products/Legion.png",
    title: "LEGION",
    paragraph: "Branded Corporate Gift Box\nFor Team Building Events",
    featured: true,
  },
  {
    id: 2,
    image: "/Assets/Images/Products/Tsokolate.png",
    title: "TSOKOLATE AT BATIROL",
    paragraph: "Local Artisan Gift Box\nFor VIP Clients",
    featured: true,
  },
  {
    id: 3,
    image: "/Assets/Images/Products/Gotouch.png",
    title: "GO TOUCH",
    paragraph: "Functional Tech Gift Box\nFor Employees",
    featured: true,
  },
  {
    id: 4,
    image: "/Assets/Images/Products/Dane.png",
    title: "CORPORATE",
    paragraph: "Branded Corporate Gift Box\nFor Clients",
  },
  {
    id: 5,
    image: "/Assets/Images/Products/Charlie.png",
    title: "CORPORATE",
    paragraph: "Branded Corporate Gift Box\nFor Clients",
  },
  {
    id: 6,
    image: "/Assets/Images/Products/Madman.png",
    title: "CORPORATE",
    paragraph: "Branded Corporate Gift Box\nFor Clients",
  },
  {
    id: 7,
    image: "/Assets/Images/Products/Colourette.png",
    title: "CORPORATE",
    paragraph: "Branded Corporate Gift Box\nFor Clients",
  },
  {
    id: 8,
    image: "/Assets/Images/Products/Sunnies.png",
    title: "CORPORATE",
    paragraph: "Branded Corporate Gift Box\nFor Clients",
  },
];

export default function CustomerCorporate() {
  return (
    <div className="customerpov-container corporate-page">
      <TopbarCustomer />

      <section
        className="corporate-hero customerpov-hero"
        style={{
          backgroundImage: "url('/Assets/Images/Background/corporateBackground.png')",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          backgroundSize: "cover",
          backgroundColor: "#f2efe3",
        }}
      >
        <div className="corporate-hero__overlay" aria-hidden="true" />
        <div className="corporate-hero__content customerpov-hero-centerbox">
          <div>
            <h1 className="corporate-hero__title customerpov-hero-title">CORPORATE</h1>
            <span className="corporate-hero__flourish" aria-hidden="true" />
          </div>
        </div>
      </section>

      <section className="corporate-intro">
        <div className="corporate-intro__inner">
          <div className="corporate-intro__logo customerpov-title-wrapper">
            <img
              src="/Assets/Images/PenseeLogos/pensee-logo-with-name-vertical.png"
              alt="Pensee Logo Vertical"
              className="customerpov-logo-vertical"
            />
          </div>
          <div className="corporate-intro__divider" aria-hidden="true">
            <span className="corporate-intro__divider-line" />
            <span className="corporate-intro__divider-gem" />
            <span className="corporate-intro__divider-line" />
          </div>
          <div className="corporate-intro__tagline customerpov-intro">
            <p>{introText}</p>
          </div>
        </div>
      </section>

      <section className="corporate-pillars">
        <div className="corporate-pillars__grid customer-corporate-details-grid">
          {details.map((item, index) => (
            <article className="corporate-pillar customer-corporate-detail" key={item.title}>
              <span className="corporate-pillar__index" aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h2 className="corporate-pillar__title customer-corporate-detail-title">
                {item.title}
              </h2>
              <p className="corporate-pillar__text customer-corporate-detail-paragraph">
                {item.paragraph}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="corporate-collections">
        <div className="corporate-collections__inner">
          <div className="corporate-collections__grid customerpov-grid">
            {products.map((product) => (
              <article
                key={product.id}
                className={`corporate-collection customerpov-card${product.featured ? " corporate-collection--featured" : ""}`}
                tabIndex={0}
                role="button"
                aria-label={`View details for ${product.title}`}
              >
                <div className="corporate-collection__image-frame">
                  <div className="corporate-collection__image-wrap customerpov-card-image-wrapper">
                    {product.image ? (
                      <>
                        <img
                          src={product.image}
                          alt={product.title}
                          className="corporate-collection__image customerpov-card-image"
                        />
                        <div className="corporate-collection__image-overlay" aria-hidden="true" />
                      </>
                    ) : (
                      <div className="customerpov-card-image-placeholder">Image Here</div>
                    )}
                  </div>
                </div>
                <div className="corporate-collection__body customerpov-card-content">
                  <h3 className="corporate-collection__title customerpov-card-title">
                    {product.title}
                  </h3>
                  <div className="corporate-collection__desc customerpov-card-paragraph">
                    {product.paragraph.split("\n").map((line, i) => (
                      <span key={i} className="corporate-collection__desc-line">
                        {line}
                      </span>
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
