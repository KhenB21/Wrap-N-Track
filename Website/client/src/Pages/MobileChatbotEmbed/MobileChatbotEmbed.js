import React from 'react';
import ZapierChatbotEmbed from '../../Components/ZapierChatbotEmbed';

// Standalone page (no topbar/nav) that hosts the official Zapier chatbot embed
// inline, full-screen. Loaded by the mobile app's WebView (see
// Mobile/src/Components/ChatbotWidget.js) so the chat session runs on a real
// HTTPS origin instead of an injected about:blank HTML string, which Zapier
// blocks with "access is disabled".
export default function MobileChatbotEmbed() {
  return (
    <div style={{ width: '100vw', height: '100vh', margin: 0, padding: 0 }}>
      <ZapierChatbotEmbed isPopup={false} />
    </div>
  );
}
