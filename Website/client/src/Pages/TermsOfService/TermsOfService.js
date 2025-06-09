import React from "react";
import TopbarCustomer from "../../Components/TopbarCustomer";
import "./TermsOfService.css";

function TermsOfService() {
  return (
    <div className="tos-container">
      <TopbarCustomer />
      <div className="tos-content">
        <div className="tos-div">
          <h1 className="tos-title">Terms of Service</h1>
          <p style={{ fontSize: "10px", fontWeight: "bold" }}>
            Last Updated: June 9, 2025
          </p>
          <hr />

          <h4 style={{ marginTop: "10px" }}>Introduction</h4>
          <p className="tos-p">
            Welcome to the Pensée Gifting Studio website. By accessing or using
            our platform as an individual or a representative of a company, you
            agree to be bound by these Terms of Service. If you do not agree
            with any part of the terms, you must refrain from using our
            services.
          </p>

          <h4>Use of the Site</h4>
          <p className="tos-p">
            You must be at least 18 years old or have permission from a legal
            guardian to use our services. You agree not to misuse our platform
            for any illegal or unauthorized purpose.
          </p>

          <h4>Business Accounts and Representatives</h4>
          <p className="tos-p">
            If you are using our services on behalf of a company, organization,
            or other legal entity, you represent and warrant that you are
            authorized to bind that entity to these Terms. Business accounts are
            responsible for all activity conducted through their organization’s
            account, including actions by their employees, contractors, or
            agents.
          </p>

          <h4>Account Information</h4>
          <p className="tos-p">
            When you create an account with us, you must provide accurate,
            current, and complete information. You are responsible for
            maintaining the confidentiality of your account credentials.
          </p>

          <h4>Orders and Payment</h4>
          <p className="tos-p">
            All orders are subject to availability. We reserve the right to
            cancel any order for any reason. Payment must be made in full before
            the order is processed. For bulk or corporate orders, payment terms
            may be arranged separately upon agreement.
          </p>

          <h4>Returns and Refunds</h4>
          <p className="tos-p">
            Due to the nature of our custom gifting products, all sales are
            final. Refunds or exchanges will only be processed for defective or
            incorrect items delivered.
          </p>

          <h4>Limitation of Liability</h4>
          <p className="tos-p">
            Pensée shall not be liable for any indirect, incidental, or
            consequential damages arising from the use of our services.
          </p>

          <h4>Changes to Terms</h4>
          <p className="tos-p">
            We reserve the right to modify these Terms of Service at any time.
            Changes will be posted on this page with an updated effective date.
          </p>
        </div>
        <div className="privacy-div">
          <h2 className="privacy-title">Privacy Policy</h2>
          <hr />

          <h4 style={{ marginTop: "10px" }}>Introduction</h4>
          <p className="tos-p">
            At Pensée Gifting Studio, we value your trust and are committed to
            protecting your personal and business-related information. This
            Privacy Policy explains how we collect, use, and safeguard your data
            when you visit our website or use our services, whether as an
            individual or a corporate client.
          </p>

          <ul className="tos-p">
            <li>
              Personal details (name, email, phone number, delivery address)
            </li>
            <li>
              Business details (company name, tax identification, billing
              address)
            </li>
            <li>Account information (login credentials, preferences)</li>
            <li>Order history and payment details</li>
            <li>Browser and usage data via cookies and analytics tools</li>
          </ul>

          <ul className="tos-p">
            <li>Process and deliver your personal or business orders</li>
            <li>Improve your shopping and account experience</li>
            <li>Respond to your inquiries and provide support</li>
            <li>
              Send account updates, offers, or business proposals (where
              permitted)
            </li>
          </ul>

          <h4>Data Sharing and Security</h4>
          <p className="tos-p">
            We do not sell or rent your personal data. We may share data with
            trusted third-party service providers (such as payment processors
            and delivery services) solely to fulfill your orders. All data is
            protected with appropriate security measures, and we only store
            information as long as necessary.
          </p>

          <h4>Your Rights</h4>
          <p className="tos-p">
            You have the right to access, update, or delete your personal
            information at any time. Simply contact us at{" "}
            <a href="mailto:inquiries@penseegiftingstudio.com">
              inquiries@penseegiftingstudio.com
            </a>{" "}
            to make a request.
          </p>

          <h4>Cookies</h4>
          <p className="tos-p">
            We use cookies to enhance your browsing experience and understand
            user behavior. You can manage cookie preferences through your
            browser settings.
          </p>

          <h4>Policy Updates</h4>
          <p className="tos-p">
            We may update this Privacy Policy from time to time. Changes will be
            posted on this page with the updated date.
          </p>

          <h4>Contact Us</h4>
          <p className="tos-p">
            For any questions regarding our Terms of Service or Privacy Policy,
            please contact us at{" "}
            <a href="mailto:inquiries@penseegiftingstudio.com">
              inquiries@penseegiftingstudio.com
            </a>
            .
          </p>

          <h4>Third-Party Disclosure for Corporate Clients</h4>
          <p className="tos-p">
            When handling corporate orders, we may coordinate with business
            partners or fulfillment agents. Your company information may be
            shared with these third parties solely to facilitate large-scale
            gifting and logistics. We ensure such third parties maintain the
            same data protection standards.
          </p>
        </div>
      </div>
    </div>
  );
}

export default TermsOfService;
