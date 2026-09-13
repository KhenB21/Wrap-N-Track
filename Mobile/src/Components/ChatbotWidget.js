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
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import api from '../services/api';
import { useTheme } from '../Context/ThemeContext';

// Native chat against our own Gemini-backed endpoint (Website/server/routes/chatbot.js).
//
// This used to be a WebView hosting the Zapier embed, which needed a spoofed
// `baseUrl` of https://wrapntrack.xyz purely to satisfy Zapier's origin check.
// Our own API has no origin restriction, so the WebView — and that workaround —
// are gone. It also means recommendations arrive as data we can deep-link into
// the app's own BundleDetail / ProductDetail screens.

const GUEST_ID_KEY = 'wnt_chat_guest_id';
const MAX_CHARS = 500;

const GREETING = {
  role: 'model',
  text: "Hi! I'm the Wrap N' Track assistant. Tell me what you're celebrating and I'll suggest what works best.",
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
    async (rawText) => {
      const text = String(rawText || '').trim();
      if (!text || sending || needsAuth) return;

      // Snapshot before appending — the server adds the new message itself.
      const history = messages
        .filter((m) => !m.isError && !m.isGate)
        .slice(-10)
        .map((m) => ({ role: m.role, text: m.text }));

      setMessages((prev) => [...prev, { role: 'user', text, recommendations: [], suggestions: [] }]);
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
      <TouchableOpacity
        style={styles.bubble}
        activeOpacity={0.85}
        onPress={() => setVisible(true)}
        accessibilityLabel="Open the Wrap N' Track assistant"
      >
        <MaterialCommunityIcons name="chat-processing" size={28} color="#fff" />
      </TouchableOpacity>

      <Modal visible={visible} animationType="slide" onRequestClose={() => setVisible(false)}>
        <SafeAreaView style={[styles.modal, { backgroundColor: c.bg }]}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>Wrap N&apos; Track Assistant</Text>
              <Text style={styles.headerSub}>Gift &amp; packaging recommendations</Text>
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
                  <ActivityIndicator size="small" color="#696a8f" />
                  <Text style={[styles.typingText, { color: c.muted }]}>Thinking...</Text>
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
  bubble: {
    position: 'absolute',
    right: 20,
    bottom: 90,
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
    zIndex: 999,
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

  messages: { flex: 1 },
  messagesContent: { padding: 16, gap: 12 },

  msgRow: { maxWidth: '88%', gap: 8 },
  msgRowUser: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  msgRowBot: { alignSelf: 'flex-start' },

  bubbleText: { paddingHorizontal: 13, paddingVertical: 10, borderRadius: 12 },
  bubbleUser: { backgroundColor: '#4a4a6a', borderBottomRightRadius: 3 },
  bubbleBot: { borderWidth: 1, borderBottomLeftRadius: 3 },
  bubbleError: { backgroundColor: '#fdf2f2', borderColor: '#f0c9c9' },
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
