import React from "react";
import TopbarCustomer from "../../Components/TopbarCustomer";
import "../CustomerCorporate/CustomerCorporate.css";

const introText = `Pensée prides itself in curating thoughtful and purposeful gifts for all occasions. We believe the one-box-fits-all concept is a myth. No two gifts are alike. Each box we send out carries a story of the sender, recipient, and the brands who poured their hearts into their craft.\n\nWe promote the essence of gift giving amidst the fast-paced, technologically-savvy world we are in. It's an expression of love. It strengthens relationships. To us, it's extending a part of yourself and saying, "I thought about you while buying this".\n\nSo if the words, "local", "artisanal", "customized", and "handwritten" speak to you, then you're in the right place.`;

const products = [
  {
    id: 1,
    image: "/Assets/Images/Products/Fullbloom.png",
    title: "In Full Bloom",
    paragraph: "Valentine's Day 2023",
  },
  {
    id: 2,
    image: "/Assets/Images/Products/Spiced.png",
    title: "Spiced Sips & Savories",
    paragraph: "Holiday 2023",
  },
  {
    id: 3,
    image: "/Assets/Images/Products/Taylorswift.png",
    title: "Taylor Swift",
    paragraph: "Swiftie's 23rd Birthday Gift Box",
  },
  {
    id: 4,
    image: "/Assets/Images/Products/Christening.png",
    title: "Christening",
    paragraph: "Godparent Proposal Gift Boxes",
  },
  {
    id: 5,
    image: "/Assets/Images/Products/Lovemarie.png",
    title: "Love Marie",
    paragraph: "Pensée's PR Package for Love Marie Escudero",
  },
  {
    id: 6,
    image: "/Assets/Images/Products/Mannersmaketh.png",
    title: "Manners Maketh Man",
    paragraph: "Gentleman's Gift Box",
  },
    {
    id: 7,
    image: "/Assets/Images/Products/Jccm.png",
    title: "JCCM",
    paragraph: "Church Holiday Giveaway",
  },
    {
    id: 9,
    image: "/Assets/Images/Products/Rani.png",
    title: "Rani",
    paragraph: "Birthday Gift Box",
  },
];

export default function CustomerBespoke() {
  return (
    <div className="customerpov-container">
      <TopbarCustomer />
      {/* Hero Section with background image */}
      <section
        className="customerpov-hero"
        style={{
          backgroundImage:
            "url('/Assets/Images/Background/bespokeBackground.png')",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          backgroundSize: "cover",
          backgroundColor: "#fffbe9", // Fallback
        }}
      >
        <div className="customerpov-hero-centerbox">
          <span className="customerpov-hero-title">BESPOKE</span>
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
        <p style={{ whiteSpace: "pre-line" }}>{introText}</p>
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
                <img
                  src={product.image}
                  alt={product.title}
                  className="customerpov-card-image"
                />
              ) : (
                <div className="customerpov-card-image-placeholder">
                  Image Here
                </div>
              )}
            </div>
            <div className="customerpov-card-content">
              <div className="customerpov-card-title">{product.title}</div>
              <div className="customerpov-card-paragraph">
                {product.paragraph}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
