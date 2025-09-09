import React from "react";
import TopbarCustomer from "../../Components/TopbarCustomer";
import EmployeeStatusBanner from "../../Components/EmployeeStatusBanner";
import "./CustomerAboutUs.css";

export default function CustomerAboutUs() {
  return (
    <div className="customeraboutus-container">
      <EmployeeStatusBanner />
      <TopbarCustomer />
      {/* Hero Section with background image */}
      <section
        className="customeraboutus-hero"
        style={{
          backgroundImage:
            "url('/Assets/Images/Background/aboutBackground.png')",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          backgroundSize: "cover",
          backgroundColor: "#f9f7ef", // fallback
        }}
      >
        <div className="customeraboutus-hero-centerbox">
          <span className="customeraboutus-hero-title">ABOUT PENSÉE</span>
        </div>
      </section>
      <div className="customeraboutus-story-section">
        <div className="customeraboutus-script-title">Our Story</div>
        <div className="customeraboutus-section-desc centered">
          Pensée Gifting Studio offers <i>curated</i> and <i>bespoke</i> gift
          boxes
          <br />
          and features <i>local brands</i> and <i>entrepreneurs</i>.
        </div>
        <div className="customeraboutus-story-row exact">
          <div className="customeraboutus-story-illustration left">
            <img
              src={
                process.env.PUBLIC_URL + "/Assets/Images/Illustrations/cafe.png"
              }
              alt="Cafe Illustration"
              className="customeraboutus-img-cafe"
            />
          </div>
          <div className="customeraboutus-story-text exact">
            <p>
              It started on a Tuesday afternoon over coffee, with co-founders,
              Keizelle and Iana, planning to collaborate their own small brands
              into a unique gift concept. It grew with MJ and blossomed into
              creating thematic boxes that convey special messages. For us,
              gift-giving is extending a part of yourself and saying,
            </p>
            <blockquote className="customeraboutus-quote exact">
              <span>“I thought about you while buying this.”</span>
            </blockquote>
          </div>
        </div>
        <div className="customeraboutus-story-row exact">
          <div className="customeraboutus-story-text exact">
            <div className="customeraboutus-story-soul exact">
              The soul of Pensée is thoughtful and purposeful gift-giving.
            </div>
            <div className="customeraboutus-story-support exact">
              We also strongly support Filipino-owned homegrown, start-up, and
              established businesses. We advocate for them, bring them together,
              and highlight their potential.
            </div>
          </div>
          <div className="customeraboutus-story-illustration right">
            <img
              src={
                process.env.PUBLIC_URL +
                "/Assets/Images/Illustrations/giftbox.png"
              }
              alt="Giftbox Illustration"
              className="customeraboutus-img-giftbox"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
