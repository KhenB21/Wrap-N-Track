import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Easing,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import api from '../services/api';
import { useTheme } from '../Context/ThemeContext';
import WrappyFace from './WrappyFace';

// Native chat against our own Gemini-backed endpoint (Website/server/routes/chatbot.js).
//
// This used to be a WebView hosting the Zapier embed, which needed a spoofed
// `baseUrl` of https://wrapntrack.xyz purely to satisfy Zapier's origin check.
// Our own API has no origin restriction, so the WebView — and that workaround —
// are gone. It also means recommendations arrive as data we can deep-link into
// the app's own BundleDetail / ProductDetail screens.

// Typed out next to the floating button when the app opens.
const HELLO_TEXT = "Hello! I'm Wrappy. I'm here to assist you!";
const TYPE_MS = 35;

const GUEST_ID_KEY ='wnt_chat_guest_id';
const MAX_CHARS = 500;

const GREETING = {
  role: 'model',
  text: "Hello! I'm Wrappy, your Wrap N' Track assistant. Tell me what you're celebrating and I'll suggest what works best.",
  recommendations: [],
  suggestions: ['Wedding giveaways', 'Corporate gifts', 'Birthday gift wrap'],
};

async function getGuestId() {
  try {
    let id = await AsyncStorage.getItem(GUEST_ID_KEY);
    if (!id) {
      id = `g-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      await AsyncStorage.setItem(GUEST_ID_KEY, id);
    }
    return id;
  } catch {
    return null;
  }
}

const peso = (value) =>
  `PHP ${Number(value || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function ChatbotWidget() {
  const navigation = useNavigation();
  const { darkMode } = useTheme();

  const [available, setAvailable] = useState(null);
  const [visible, setVisible] = useState(false);
  const [messages, setMessages] = useState([GREETING]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [guestLeft, setGuestLeft] = useState(null);

  const scrollRef = useRef(null);

  // Greeting bubble beside the floating button: pops in, types itself out
  // while Wrappy "talks", then tucks away after a few seconds.
  const [helloShown, setHelloShown] = useState(false);
  const [helloTyped, setHelloTyped] = useState('');
  const helloAnim = useRef(new Animated.Value(0)).current;
  const wiggle = useRef(new Animated.Value(0)).current;
  const greetedRef = useRef(false);

  const hideHello = useCallback(() => {
    Animated.timing(helloAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() =>
      setHelloShown(false)
    );
  }, [helloAnim]);

  useEffect(() => {
    if (available !== true || greetedRef.current) return undefined;
    greetedRef.current = true;
    const timeouts = [];
    let typer = null;
    timeouts.push(
      setTimeout(() => {
        setHelloShown(true);
        setHelloTyped('');
        Animated.spring(helloAnim, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }).start();
        // A little "wave" of the button as Wrappy says hello.
        Animated.sequence(
          [1, -1, 1, -1, 0].map((v) =>
            Animated.timing(wiggle, { toValue: v, duration: 110, easing: Easing.inOut(Easing.quad), useNativeDriver: true })
          )
        ).start();
        let i = 0;
        typer = setInterval(() => {
          i += 1;
          setHelloTyped(HELLO_TEXT.slice(0, i));
          if (i >= HELLO_TEXT.length) clearInterval(typer);
        }, TYPE_MS);
      }, 900)
    );
    timeouts.push(setTimeout(hideHello, 900 + HELLO_TEXT.length * TYPE_MS + 4500));
    return () => {
      timeouts.forEach(clearTimeout);
      if (typer) clearInterval(typer);
    };
  }, [available, helloAnim, wiggle, hideHello]);

  const openChat = () => {
    if (helloShown) hideHello();
    setVisible(true);
  };

  const helloTalking = helloShown && helloTyped.length < HELLO_TEXT.length;

  const c = palette(darkMode);

  // Hide the bubble entirely if the assistant is not configured on the backend.
  useEffect(() => {
    let cancelled = false;
    api
      .get('/chatbot/health')
      .then((res) => { if (!cancelled) setAvailable(Boolean(res.data?.available)); })
      .catch(() => { if (!cancelled) setAvailable(false); });
    return () => { cancelled = true; };
  }, []);

  // Signing in mid-session restores the allowance.
  useEffect(() => {
    if (!visible) return;
    AsyncStorage.getItem('authToken').then((token) => {
      if (token) {
        setNeedsAuth(false);
        setGuestLeft(null);
      }
    });
  }, [visible]);

  const send = useCallback(
    async (rawText, { retry = false } = {}) => {
      const text = String(rawText || '').trim();
      if (!text || sending || needsAuth) return;

      // Snapshot before appending — the server adds the new message itself.
      let base = messages.filter((m) => !m.isError && !m.isGate);
      // On a retry the user's message is already on screen; leave it out of the
      // history so the server doesn't see it twice.
      if (retry && base.length && base[base.length - 1].role === 'user') base = base.slice(0, -1);
      const history = base.slice(-10).map((m) => ({ role: m.role, text: m.text }));

      if (retry) {
        // Drop the error bubble; the user's original message stays.
        setMessages((prev) => prev.filter((m) => !(m.isError && m.retryText === text)));
      } else {
        setMessages((prev) => [...prev, { role: 'user', text, recommendations: [], suggestions: [] }]);
      }
      setDraft('');
      setSending(true);

      try {
        const guestId = await getGuestId();
        const { data } = await api.post('/chatbot/message', { message: text, history, guestId });

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
          // retryText lets the "Try again" button resend the same prompt.
          { role: 'model', text: message, recommendations: [], suggestions: [], isError: true, retryText: text },
        ]);
      } finally {
        setSending(false);
      }
    },
    [messages, sending, needsAuth]
  );

  const openRecommendation = useCallback(
    (rec) => {
      setVisible(false);
      if (rec.kind === 'bundle') {
        navigation.navigate('BundleDetail', { bundleId: rec.id });
      } else {
        // ProductDetailScreen takes a whole product object; the fields it reads
        // are sku / name / unit_price / category (image and description are
        // optional and fall back to placeholders).
        navigation.navigate('ProductDetail', {
          product: {
            sku: rec.sku,
            name: rec.name,
            unit_price: rec.price,
            category: rec.category,
          },
        });
      }
    },
    [navigation]
  );

  // The guest gate is effectively unreachable on mobile today: AppNavigator only
  // mounts this widget inside CustomerStackNavigator, which requires an
  // authenticated customer. That same stack therefore has no Login/SignUp route,
  // so guard the navigation rather than letting it silently dead-end if the
  // widget is ever mounted in MainStackNavigator too.
  const goAuth = useCallback(
    (screen) => {
      setVisible(false);
      try {
        navigation.navigate(screen);
      } catch {
        /* route not present in this navigator — closing the sheet is the best we can do */
      }
    },
    [navigation]
  );

  if (available !== true) return null;

  return (
    <>
      {helloShown && (
        <Animated.View
          style={[
            styles.hello,
            { backgroundColor: c.surface, borderColor: c.line },
            {
              opacity: helloAnim,
              transform: [
                { translateX: helloAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) },
                { scale: helloAnim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) },
              ],
            },
          ]}
        >
          <TouchableOpacity activeOpacity={0.8} onPress={openChat} style={{ flex: 1 }}>
            <Text style={styles.helloName}>Wrappy</Text>
            <Text style={[styles.helloText, { color: c.ink }]}>
              {helloTyped}
              {helloTalking ? <Text style={{ color: '#8A84B8' }}>|</Text> : null}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={hideHello}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel="Dismiss greeting"
          >
            <MaterialCommunityIcons name="close" size={14} color={c.muted} />
          </TouchableOpacity>
          <View style={[styles.helloTail, { backgroundColor: c.surface, borderColor: c.line }]} />
        </Animated.View>
      )}

      <Animated.View
        style={[
          styles.bubbleWrap,
          { transform: [{ rotate: wiggle.interpolate({ inputRange: [-1, 1], outputRange: ['-14deg', '14deg'] }) }] },
        ]}
      >
        <TouchableOpacity
          style={styles.bubble}
          activeOpacity={0.85}
          onPress={openChat}
          accessibilityLabel="Chat with Wrappy, the Wrap N' Track assistant"
        >
          <WrappyFace size={42} talking={helloTalking} />
        </TouchableOpacity>
      </Animated.View>

      <Modal visible={visible} animationType="slide" onRequestClose={() => setVisible(false)}>
        <SafeAreaView style={[styles.modal, { backgroundColor: c.bg }]}>
          <View style={styles.header}>
            <View style={styles.headerAvatar}>
              <WrappyFace size={36} talking={sending} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>Wrappy</Text>
              <Text style={styles.headerSub}>
                {sending ? 'Typing…' : "Your Wrap N' Track gift assistant"}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setVisible(false)} style={styles.closeBtn} accessibilityLabel="Close assistant">
              <MaterialCommunityIcons name="close" size={22} color="#fff" />
            </TouchableOpacity>
          </View>

          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
          >
            <ScrollView
              ref={scrollRef}
              style={[styles.messages, { backgroundColor: c.bg }]}
              contentContainerStyle={styles.messagesContent}
              onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
              keyboardShouldPersistTaps="handled"
            >
              {messages.map((msg, i) => {
                const isUser = msg.role === 'user';
                return (
                  <View key={i} style={[styles.msgRow, isUser ? styles.msgRowUser : styles.msgRowBot]}>
                    {!isUser && (
                      <View style={styles.botLabelRow}>
                        <WrappyFace size={22} animated={false} />
                        <Text style={[styles.botLabel, { color: c.muted }]}>Wrappy</Text>
                      </View>
                    )}
                    <View
                      style={[
                        styles.bubbleText,
                        isUser
                          ? styles.bubbleUser
                          : [styles.bubbleBot, { backgroundColor: c.surface, borderColor: c.line }],
                        msg.isError && styles.bubbleError,
                      ]}
                    >
                      <Text style={[styles.msgText, { color: isUser ? '#fff' : msg.isError ? '#9b3b38' : c.ink }]}>
                        {msg.text}
                      </Text>
                    </View>

                    {msg.isError && msg.retryText && i === messages.length - 1 && !sending && (
                      <View style={[styles.retryBox, { backgroundColor: c.surface, borderColor: c.line }]}>
                        <WrappyFace size={30} />
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.retryAsk, { color: c.ink }]}>
                            Oops, I got a little tangled in my ribbon! 🎀 Do you want to try again?
                          </Text>
                          <TouchableOpacity
                            style={styles.retryBtn}
                            activeOpacity={0.85}
                            onPress={() => send(msg.retryText, { retry: true })}
                            accessibilityLabel="Try sending your message again"
                          >
                            <MaterialCommunityIcons name="refresh" size={16} color="#fff" />
                            <Text style={styles.retryBtnText}>Yes, try again!</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}

                    {msg.recommendations?.map((rec) => (
                      <TouchableOpacity
                        key={`${rec.kind}-${rec.kind === 'bundle' ? rec.id : rec.sku}`}
                        style={[styles.card, { backgroundColor: c.surface, borderColor: c.line }]}
                        activeOpacity={0.85}
                        onPress={() => openRecommendation(rec)}
                      >
                        <View
                          style={[
                            styles.tag,
                            { backgroundColor: rec.kind === 'bundle' ? '#ece9f5' : '#eef2f6' },
                          ]}
                        >
                          <Text style={[styles.tagText, { color: rec.kind === 'bundle' ? '#5a4b8a' : '#4a6180' }]}>
                            {rec.kind === 'bundle' ? 'BUNDLE' : 'PRODUCT'}
                          </Text>
                        </View>
                        <Text style={[styles.cardTitle, { color: c.ink }]}>
                          {rec.kind === 'bundle' ? rec.title : rec.name}
                        </Text>
                        <Text style={styles.cardMeta}>
                          <Text style={styles.cardPrice}>{peso(rec.price)}</Text>
                          {rec.kind === 'bundle' && rec.itemCount
                            ? `  ·  ${rec.itemCount} item${rec.itemCount === 1 ? '' : 's'}`
                            : ''}
                        </Text>
                        {!!rec.reason && <Text style={[styles.cardReason, { color: c.muted }]}>{rec.reason}</Text>}
                        <Text style={styles.cardCta}>
                          {rec.kind === 'bundle' ? 'View & order this bundle →' : 'View product →'}
                        </Text>
                      </TouchableOpacity>
                    ))}

                    {!isUser &&
                      !sending &&
                      !needsAuth &&
                      i === messages.length - 1 &&
                      msg.suggestions?.length > 0 && (
                        <View style={styles.chips}>
                          {msg.suggestions.map((s) => (
                            <TouchableOpacity key={s} style={styles.chip} onPress={() => send(s)}>
                              <Text style={styles.chipText}>{s}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                  </View>
                );
              })}

              {needsAuth && (
                <View style={[styles.gate, { backgroundColor: c.surface, borderColor: c.line }]}>
                  <Text style={[styles.gateTitle, { color: c.ink }]}>Keep the conversation going</Text>
                  <Text style={[styles.gateText, { color: c.muted }]}>
                    Create a free account or log in to keep chatting and get recommendations tailored to you.
                  </Text>
                  <View style={styles.gateActions}>
                    <TouchableOpacity style={[styles.gateBtn, styles.gatePrimary]} onPress={() => goAuth('SignUp')}>
                      <Text style={styles.gatePrimaryText}>Create account</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.gateBtn, styles.gateSecondary]} onPress={() => goAuth('Login')}>
                      <Text style={styles.gateSecondaryText}>Log in</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {sending && (
                <View style={styles.typing}>
                  <WrappyFace size={28} talking />
                  <Text style={[styles.typingText, { color: c.muted }]}>Wrappy is thinking…</Text>
                </View>
              )}
            </ScrollView>

            {guestLeft !== null && guestLeft > 0 && !needsAuth && (
              <Text style={[styles.guestNote, { color: c.muted, backgroundColor: c.surface }]}>
                {guestLeft} free {guestLeft === 1 ? 'reply' : 'replies'} left — log in for unlimited help.
              </Text>
            )}

            <View style={[styles.composer, { backgroundColor: c.surface, borderTopColor: c.line }]}>
              <TextInput
                style={[styles.input, { color: c.ink, borderColor: c.line, backgroundColor: c.bg }]}
                placeholder={needsAuth ? 'Log in to continue chatting' : 'Ask about wrapping, bundles, or gifts...'}
                placeholderTextColor={c.muted}
                value={draft}
                onChangeText={setDraft}
                editable={!sending && !needsAuth}
                maxLength={MAX_CHARS}
                multiline
                onSubmitEditing={() => send(draft)}
              />
              <TouchableOpacity
                style={[styles.send, (sending || needsAuth || !draft.trim()) && styles.sendDisabled]}
                onPress={() => send(draft)}
                disabled={sending || needsAuth || !draft.trim()}
                accessibilityLabel="Send message"
              >
                <MaterialCommunityIcons name="send" size={19} color="#fff" />
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </>
  );
}

const palette = (darkMode) => ({
  bg: darkMode ? '#18191A' : '#F5F4FA',
  surface: darkMode ? '#242526' : '#ffffff',
  ink: darkMode ? '#E4E6EB' : '#2c3e50',
  muted: darkMode ? '#9aa0a6' : '#6c757d',
  line: darkMode ? '#3A3B3C' : '#e2e8f0',
});

const styles = StyleSheet.create({
  bubbleWrap: {
    position: 'absolute',
    right: 20,
    bottom: 90,
    zIndex: 999,
    elevation: 6,
  },
  hello: {
    position: 'absolute',
    right: 88,
    bottom: 96,
    maxWidth: 220,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 14,
    borderBottomRightRadius: 4,
    borderWidth: 1,
    zIndex: 999,
    elevation: 7,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  helloName: { fontSize: 11, fontWeight: '800', color: '#6B6593', marginBottom: 2 },
  helloText: { fontSize: 13, lineHeight: 18 },
  helloTail: {
    position: 'absolute',
    right: -6,
    bottom: 10,
    width: 12,
    height: 12,
    borderRightWidth: 1,
    borderTopWidth: 1,
    transform: [{ rotate: '45deg' }],
  },
  bubble: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4a4a6a',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.28,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    borderWidth: 2,
    borderColor: '#fff',
  },
  modal: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    backgroundColor: '#4a4a6a',
  },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  headerSub: { color: 'rgba(255,255,255,0.82)', fontSize: 11, marginTop: 2 },
  closeBtn: { padding: 6 },
  headerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  botLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: -2 },
  botLabel: { fontSize: 11, fontWeight: '700' },

  messages: { flex: 1 },
  messagesContent: { padding: 16, gap: 12 },

  msgRow: { maxWidth: '88%', gap: 8 },
  msgRowUser: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  msgRowBot: { alignSelf: 'flex-start' },

  bubbleText: { paddingHorizontal: 13, paddingVertical: 10, borderRadius: 12 },
  bubbleUser: { backgroundColor: '#4a4a6a', borderBottomRightRadius: 3 },
  bubbleBot: { borderWidth: 1, borderBottomLeftRadius: 3 },
  bubbleError: { backgroundColor: '#fdf2f2', borderColor: '#f0c9c9' },
  retryBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
  },
  retryAsk: { fontSize: 13, lineHeight: 18, marginBottom: 8 },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: '#4a4a6a',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
  },
  retryBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  msgText: { fontSize: 14, lineHeight: 20 },

  card: { borderWidth: 1, borderRadius: 10, padding: 12 },
  tag: { alignSelf: 'flex-start', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 3, marginBottom: 6 },
  tagText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.9 },
  cardTitle: { fontSize: 15, fontWeight: '700', marginBottom: 3 },
  cardMeta: { fontSize: 12, marginBottom: 5, color: '#6c757d' },
  cardPrice: { fontWeight: '700', color: '#4a4a6a' },
  cardReason: { fontSize: 12, lineHeight: 17, fontStyle: 'italic' },
  cardCta: { marginTop: 8, fontSize: 12, fontWeight: '700', color: '#4a4a6a' },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { borderWidth: 1, borderColor: '#696a8f', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6 },
  chipText: { color: '#696a8f', fontSize: 12 },

  gate: { borderWidth: 1, borderRadius: 10, padding: 14, alignItems: 'center' },
  gateTitle: { fontSize: 15, fontWeight: '700', marginBottom: 5 },
  gateText: { fontSize: 12.5, lineHeight: 18, textAlign: 'center', marginBottom: 12 },
  gateActions: { flexDirection: 'row', gap: 8, alignSelf: 'stretch' },
  gateBtn: { flex: 1, paddingVertical: 10, borderRadius: 5, alignItems: 'center', borderWidth: 1, borderColor: '#4a4a6a' },
  gatePrimary: { backgroundColor: '#4a4a6a' },
  gatePrimaryText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  gateSecondary: { backgroundColor: 'transparent' },
  gateSecondaryText: { color: '#4a4a6a', fontWeight: '700', fontSize: 13 },

  typing: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  typingText: { fontSize: 13 },

  guestNote: { fontSize: 11, textAlign: 'center', paddingHorizontal: 12, paddingTop: 8 },

  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 9,
    paddingHorizontal: 11,
    paddingVertical: 9,
    fontSize: 14,
    maxHeight: 96,
  },
  send: {
    width: 38,
    height: 38,
    borderRadius: 9,
    backgroundColor: '#4a4a6a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: { opacity: 0.45 },
});
