import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import './GeminiChatbotWidget.css';

// Customer assistant popup, powered by Gemini through our own backend
// (Website/server/routes/chatbot.js). Replaces the Zapier Interfaces embed.
//
// Unlike the Zapier widget this is plain React with no third-party script, so
// it inherits the site's fonts and palette, and recommendations arrive as
// structured data we can turn into real links into the catalogue.

const GUEST_ID_KEY = 'wnt_chat_guest_id';
const STORAGE_KEY = 'wnt_chat_session';
const MAX_CHARS = 500;

// Where a product recommendation sends the customer. The order builder
// (Pages/CustomerPOV/OrderBoutique.js) reads `?add=SKU,SKU` on mount and drops
// those items straight into the basket, flagged as assistant picks — so the
// handoff costs no extra model tokens, it just carries SKUs the reply already
// resolved.
const ORDER_PAGE = '/order';

const orderPageUrlFor = (skus) => {
  const list = (Array.isArray(skus) ? skus : [skus]).filter(Boolean);
  return list.length ? `${ORDER_PAGE}?add=${list.map(encodeURIComponent).join(',')}` : ORDER_PAGE;
};

const GREETING = {
  role: 'model',
  text: "Hi! I'm the Wrap N' Track assistant. Tell me what you're celebrating — a wedding, a corporate giveaway, a birthday — and I'll suggest what works best.",
  recommendations: [],
  suggestions: ['Wedding giveaways', 'Corporate gifts', 'Birthday gift wrap'],
};

function getGuestId() {
  try {
    let id = localStorage.getItem(GUEST_ID_KEY);
    if (!id) {
      id = (crypto.randomUUID && crypto.randomUUID()) || `g-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(GUEST_ID_KEY, id);
    }
    return id;
  } catch {
    // Private browsing / storage blocked — the server falls back to IP keying.
    return null;
  }
}

function isLoggedInCustomer() {
  try {
    return Boolean(localStorage.getItem('customerToken'));
  } catch {
    return false;
  }
}

const peso = (value) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(Number(value) || 0);

// ─── Icons (inline so the widget pulls in no icon dependency) ────────────────
const ChatIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
  </svg>
);
const CloseIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
const SendIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

// ─── Recommendation card ─────────────────────────────────────────────────────
function RecommendationCard({ rec, onOpen }) {
  const isBundle = rec.kind === 'bundle';
  return (
    <button type="button" className="gcb-card" onClick={() => onOpen(rec)}>
      <span className={`gcb-card-tag ${isBundle ? 'gcb-tag-bundle' : 'gcb-tag-product'}`}>
        {isBundle ? 'Bundle' : 'Product'}
      </span>
      <p className="gcb-card-title">{isBundle ? rec.title : rec.name}</p>
      <p className="gcb-card-meta">
        <span className="gcb-card-price">{peso(rec.price)}</span>
        {isBundle && rec.itemCount ? ` · ${rec.itemCount} item${rec.itemCount === 1 ? '' : 's'} included` : ''}
        {!isBundle && rec.category ? ` · ${rec.category}` : ''}
      </p>
      {rec.reason && <p className="gcb-card-reason">{rec.reason}</p>}
      {/* A product card now carries its SKU into the order builder, which adds
          it to the basket on arrival — hence "add to my basket" rather than the
          older "find it in the order page", which only dropped the customer on
          the page and left them to hunt for the item. */}
      <span className="gcb-card-cta">{isBundle ? 'View & order this bundle →' : 'Add to my basket →'}</span>
    </button>
  );
}

export default function GeminiChatbotWidget() {
  const navigate = useNavigate();

  const [available, setAvailable] = useState(null); // null = still checking
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([GREETING]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [guestLeft, setGuestLeft] = useState(null);

  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  // Don't render a bubble that cannot work — e.g. the key is not configured in
  // this environment. Silent for customers, but say why in dev: an assistant
  // that renders nothing at all is otherwise indistinguishable from a broken
  // import.
  useEffect(() => {
    let cancelled = false;
    api
      .get('/api/chatbot/health')
      .then((res) => {
        if (cancelled) return;
        const ok = Boolean(res.data?.available);
        setAvailable(ok);
        if (!ok && process.env.NODE_ENV === 'development') {
          console.warn(
            '[chatbot] Assistant hidden: the backend reported available=false. ' +
              'Set GEMINI_API_KEY in Website/server/.env and restart the server.'
          );
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setAvailable(false);
        if (process.env.NODE_ENV === 'development') {
          console.warn(
            `[chatbot] Assistant hidden: could not reach ${api.defaults.baseURL}/api/chatbot/health ` +
              `(${err.message}). Is the backend running?`
          );
        }
      });
    return () => { cancelled = true; };
  }, []);

  // Restore the conversation across page navigations so moving to a product
  // page and back does not lose the thread.
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.messages) && parsed.messages.length) {
          setMessages(parsed.messages);
          setNeedsAuth(Boolean(parsed.needsAuth));
        }
      }
    } catch { /* corrupt or unavailable storage — start fresh */ }
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ messages, needsAuth }));
    } catch { /* quota or private mode — session persistence is a nicety */ }
  }, [messages, needsAuth]);

  // A customer who signs in mid-session gets their allowance back.
  useEffect(() => {
    if (open && isLoggedInCustomer()) {
      setNeedsAuth(false);
      setGuestLeft(null);
    }
  }, [open]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, sending]);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  // Escape closes the panel.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const send = useCallback(
    async (rawText) => {
      const text = String(rawText || '').trim();
      if (!text || sending || needsAuth) return;

      const outgoing = { role: 'user', text, recommendations: [], suggestions: [] };
      // Snapshot BEFORE appending so history excludes the message being sent —
      // the server appends it as the final turn itself.
      const history = messages
        .filter((m) => !m.isError && !m.isGate)
        .slice(-10)
        .map((m) => ({ role: m.role, text: m.text }));

      setMessages((prev) => [...prev, outgoing]);
      setDraft('');
      setSending(true);

      try {
        const { data } = await api.post('/api/chatbot/message', {
          message: text,
          history,
          guestId: getGuestId(),
        });

        setMessages((prev) => [
          ...prev,
          {
            role: 'model',
            text: data.reply,
            recommendations: data.recommendations || [],
            suggestions: data.suggestedReplies || [],
            isGate: Boolean(data.gated),
          },
        ]);

        if (data.requiresAuth) setNeedsAuth(true);
        if (typeof data.guestRepliesUsed === 'number' && typeof data.guestLimit === 'number') {
          setGuestLeft(Math.max(0, data.guestLimit - data.guestRepliesUsed));
        }
      } catch (err) {
        const message =
          err?.response?.data?.message ||
          'I could not reach the assistant just now. Please check your connection and try again.';
        setMessages((prev) => [
          ...prev,
          { role: 'model', text: message, recommendations: [], suggestions: [], isError: true },
        ]);
      } finally {
        setSending(false);
      }
    },
    [messages, sending, needsAuth]
  );

  const openRecommendation = useCallback(
    (rec) => {
      setOpen(false);
      // A bundle has its own page and order flow; a loose product goes to the
      // order builder with its SKU attached so it lands in the basket.
      navigate(rec.kind === 'product' ? orderPageUrlFor(rec.sku) : rec.url);
    },
    [navigate]
  );

  const addAllRecommendations = useCallback(
    (recs) => {
      const skus = recs.filter((r) => r.kind === 'product').map((r) => r.sku);
      if (!skus.length) return;
      setOpen(false);
      navigate(orderPageUrlFor(skus));
    },
    [navigate]
  );

  const goAuth = useCallback(
    (path) => {
      setOpen(false);
      navigate(path);
    },
    [navigate]
  );

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send(draft);
    }
  };

  if (available === false || available === null) return null;
  if (typeof document === 'undefined') return null;

  // Rendered through a portal into <body> rather than in place. This component
  // is mounted inside TopbarCustomer, and `.topbar-customer.scrolled` applies
  // `backdrop-filter: blur(6px)` — which makes the header a containing block for
  // `position: fixed` descendants. Left in the header, the launcher sat
  // correctly at the bottom-right until the first scroll, then snapped upward
  // and tracked the topbar, because `bottom: 24px` had started resolving
  // against the header instead of the viewport. The portal also sidesteps the
  // header's `z-index: 100` stacking context, so the panel layers above page
  // content on its own terms.
  return createPortal(
    <div className="gcb-root">
      {!open && (
        <button
          type="button"
          className="gcb-bubble"
          onClick={() => setOpen(true)}
          aria-label="Open the Wrap N' Track assistant"
        >
          <ChatIcon />
        </button>
      )}

      {open && (
        <div className="gcb-panel" role="dialog" aria-label="Wrap N' Track assistant">
          <div className="gcb-header">
            <div className="gcb-header-text">
              <p className="gcb-header-title">Wrap N&apos; Track Assistant</p>
              <p className="gcb-header-sub">Gift &amp; packaging recommendations</p>
            </div>
            <button type="button" className="gcb-close" onClick={() => setOpen(false)} aria-label="Close assistant">
              <CloseIcon />
            </button>
          </div>

          <div className="gcb-messages" ref={scrollRef}>
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`gcb-msg ${msg.role === 'user' ? 'gcb-msg-user' : 'gcb-msg-bot'} ${
                  msg.isError ? 'gcb-msg-error' : ''
                }`}
              >
                <div className="gcb-bubble-text">{msg.text}</div>

                {msg.recommendations?.length > 0 && (
                  <div className="gcb-cards">
                    {msg.recommendations.map((rec) => (
                      <RecommendationCard
                        key={`${rec.kind}-${rec.kind === 'bundle' ? rec.id : rec.sku}`}
                        rec={rec}
                        onOpen={openRecommendation}
                      />
                    ))}

                    {/* Several loose products in one reply is the common case
                        for "what goes in a wedding box?" — one tap takes the
                        whole set rather than making the customer return here
                        between each pick. */}
                    {msg.recommendations.filter((r) => r.kind === 'product').length > 1 && (
                      <button
                        type="button"
                        className="gcb-add-all"
                        onClick={() => addAllRecommendations(msg.recommendations)}
                      >
                        Add all {msg.recommendations.filter((r) => r.kind === 'product').length} to my basket →
                      </button>
                    )}
                  </div>
                )}

                {msg.suggestions?.length > 0 && !sending && i === messages.length - 1 && !needsAuth && (
                  <div className="gcb-suggestions">
                    {msg.suggestions.map((s) => (
                      <button key={s} type="button" className="gcb-chip" disabled={sending} onClick={() => send(s)}>
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {needsAuth && (
              <div className="gcb-gate">
                <p className="gcb-gate-title">Keep the conversation going</p>
                <p className="gcb-gate-text">
                  Create a free account or log in to keep chatting and get recommendations tailored to you.
                </p>
                <div className="gcb-gate-actions">
                  <button
                    type="button"
                    className="gcb-gate-btn gcb-gate-primary"
                    onClick={() => goAuth('/customer-register')}
                  >
                    Create account
                  </button>
                  <button
                    type="button"
                    className="gcb-gate-btn gcb-gate-secondary"
                    onClick={() => goAuth('/customer-login')}
                  >
                    Log in
                  </button>
                </div>
              </div>
            )}

            {sending && (
              <div className="gcb-msg gcb-msg-bot">
                <div className="gcb-bubble-text gcb-typing" aria-label="Assistant is typing">
                  <span /><span /><span />
                </div>
              </div>
            )}
          </div>

          {guestLeft !== null && guestLeft > 0 && !needsAuth && (
            <p className="gcb-guest-note">
              {guestLeft} free {guestLeft === 1 ? 'reply' : 'replies'} left — log in for unlimited help.
            </p>
          )}

          <div className="gcb-composer">
            <textarea
              ref={inputRef}
              className="gcb-input"
              rows={1}
              maxLength={MAX_CHARS}
              placeholder={needsAuth ? 'Log in to continue chatting' : 'Ask about wrapping, bundles, or gifts...'}
              value={draft}
              disabled={sending || needsAuth}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onKeyDown}
              aria-label="Message the assistant"
            />
            <button
              type="button"
              className="gcb-send"
              onClick={() => send(draft)}
              disabled={sending || needsAuth || !draft.trim()}
              aria-label="Send message"
            >
              <SendIcon />
            </button>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}
