import React, { useEffect } from 'react';

// Embeds the Zapier Interfaces chatbot globally when mounted
// Usage: <ZapierChatbotEmbed chatbotId="cmg83d0pp004cmxd6eyag8jfi" isPopup />
export default function ZapierChatbotEmbed({ chatbotId = 'cmg83d0pp004cmxd6eyag8jfi', isPopup = true }) {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const SCRIPT_ID = 'zapier-chatbot-script';
    const BOT_TAG = 'zapier-interfaces-chatbot-embed';

    const ensureScript = () => {
      let script = document.getElementById(SCRIPT_ID);
      if (!script) {
        script = document.createElement('script');
        script.id = SCRIPT_ID;
        script.src = 'https://interfaces.zapier.com/assets/web-components/zapier-interfaces/zapier-interfaces.esm.js';
        script.type = 'module';
        script.async = true;
        document.head.appendChild(script);
      }
      return new Promise((resolve) => {
        if (script?.readyState === 'complete') {
          resolve();
        } else {
          script.addEventListener('load', () => resolve(), { once: true });
          // also resolve after a short delay in case custom element upgrades asynchronously
          setTimeout(() => resolve(), 1500);
        }
      });
    };

    const ensureBot = () => {
      const existing = document.querySelector(BOT_TAG);
      if (existing) return existing;

      const bot = document.createElement(BOT_TAG);
      if (isPopup) bot.setAttribute('is-popup', 'true');
      bot.setAttribute('chatbot-id', chatbotId);
      document.body.appendChild(bot);
      return bot;
    };

    let mounted = true;

    ensureScript().then(() => {
      if (!mounted) return;
      ensureBot();
    });

    return () => {
      mounted = false;
    };
  }, [chatbotId, isPopup]);

  return null;
}
