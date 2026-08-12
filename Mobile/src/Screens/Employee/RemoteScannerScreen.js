/**
 * RemoteScannerScreen
 *
 * Turns the phone into a barcode/QR scanner for the web dashboard.
 * Pairs with the same logged-in account via WebSocket.
 *
 * States:
 *   connecting   → registering with server
 *   registered   → waiting for web dashboard to open "Scan with Phone"
 *   web_ready    → web peer is online; show live CameraView
 *   error        → unrecoverable (auth fail, etc.)
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Vibration,
  StatusBar,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../Context/ThemeContext';
import { getWsUrl } from '../../services/api';

// ─── component ───────────────────────────────────────────────────────────────

export default function RemoteScannerScreen({ navigation }) {
  const theme = useTheme();
  const isFocused = useIsFocused();
  const [permission, requestPermission] = useCameraPermissions();

  // 'connecting' | 'registered' | 'web_ready' | 'error'
  const [wsStatus, setWsStatus] = useState('connecting');
  const [errorMsg, setErrorMsg] = useState('');
  const [webOnline, setWebOnline] = useState(false);

  const wsRef = useRef(null);
  const mountedRef = useRef(true);
  const connectingRef = useRef(false);
  const reconnectTimer = useRef(null);
  // Mirrors wsStatus for reads inside setTimeout/WS callbacks — those closures
  // capture wsStatus at the time `connect()` was defined (always 'connecting'
  // on the very first call), so reading the state variable directly there is
  // stale and previously caused the 6s registration-timeout to fire and force
  // -close the socket even after a successful pairing (killing the camera view).
  const wsStatusRef = useRef('connecting');
  const setStatus = (next) => {
    wsStatusRef.current = next;
    setWsStatus(next);
  };

  // ── connect ────────────────────────────────────────────────────────────────
  const connect = async () => {
    if (!mountedRef.current || connectingRef.current) return;
    if (wsRef.current) return;

    connectingRef.current = true;
    setStatus('connecting');

    const token =
      (await AsyncStorage.getItem('token')) ||
      (await AsyncStorage.getItem('authToken')) ||
      '';

    if (!token) {
      setStatus('error');
      setErrorMsg('Not logged in. Please log in and try again.');
      connectingRef.current = false;
      return;
    }

    const url = getWsUrl();
    console.log('[RemoteScanner] Connecting to', url);
    let ws;
    try {
      ws = new WebSocket(url);
    } catch (e) {
      connectingRef.current = false;
      scheduleReconnect();
      return;
    }
    wsRef.current = ws;

    // Registration timeout — if server doesn't ack within 6s, show error.
    // Reads wsStatusRef (not the wsStatus state var) since this callback's
    // closure would otherwise see the value from when connect() was defined.
    const regTimeout = setTimeout(() => {
      if (!mountedRef.current) return;
      if (wsStatusRef.current !== 'registered' && wsStatusRef.current !== 'web_ready') {
        wsRef.current?.close();
        wsRef.current = null;
        setStatus('error');
        setErrorMsg('Could not reach the server. Make sure the server is running and you are on the same network.');
        connectingRef.current = false;
      }
    }, 6000);

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'register', token, clientType: 'mobile' }));
    };

    ws.onmessage = (e) => {
      if (!mountedRef.current) return;
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'registered') {
          clearTimeout(regTimeout);
          connectingRef.current = false;
          setStatus('registered');
        } else if (msg.type === 'register_error') {
          clearTimeout(regTimeout);
          connectingRef.current = false;
          wsRef.current = null;
          setStatus('error');
          setErrorMsg(msg.message || 'Authentication failed. Please log in again.');
        } else if (msg.type === 'peer_connected') {
          setWebOnline(true);
          setStatus('web_ready');
        } else if (msg.type === 'peer_disconnected') {
          setWebOnline(false);
          setStatus('registered');
        } else if (msg.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong' }));
        }
      } catch (_) {}
    };

    ws.onclose = () => {
      clearTimeout(regTimeout);
      wsRef.current = null;
      connectingRef.current = false;
      if (!mountedRef.current) return;
      if (wsStatusRef.current !== 'error') {
        setWebOnline(false);
        scheduleReconnect();
      }
    };

    ws.onerror = () => {
      clearTimeout(regTimeout);
    };
  };

  const scheduleReconnect = () => {
    if (!mountedRef.current) return;
    clearTimeout(reconnectTimer.current);
    reconnectTimer.current = setTimeout(() => {
      if (mountedRef.current) connect();
    }, 3000);
  };

  useEffect(() => {
    mountedRef.current = true;
    connect();
    return () => {
      mountedRef.current = false;
      connectingRef.current = false;
      clearTimeout(reconnectTimer.current);
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []);

  // ── barcode handler ────────────────────────────────────────────────────────
  const handleBarcode = ({ data }) => {
    if (!data || wsRef.current?.readyState !== WebSocket.OPEN) return;
    Vibration.vibrate(120);
    wsRef.current.send(JSON.stringify({ type: 'barcode', barcode: data }));
  };

  // ── camera permission check ────────────────────────────────────────────────
  const cameraReady = permission?.granted;

  // ── render: STATUS SCREEN (not web_ready) ─────────────────────────────────
  if (wsStatus !== 'web_ready') {
    return (
      <View style={[styles.statusContainer, { backgroundColor: theme.colors.background }]}>
        <StatusBar barStyle={theme.dark ? 'light-content' : 'dark-content'} />

        {/* Back button */}
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={theme.colors.onSurface} />
        </TouchableOpacity>

        <View style={styles.statusBody}>
          {wsStatus === 'connecting' && (
            <>
              <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginBottom: 20 }} />
              <Text style={[styles.statusTitle, { color: theme.colors.onSurface }]}>Connecting…</Text>
              <Text style={[styles.statusSub, { color: theme.colors.onSurfaceVariant }]}>
                Reaching the Wrap N' Track server
              </Text>
            </>
          )}

          {wsStatus === 'registered' && (
            <>
              <View style={[styles.statusIconBox, { backgroundColor: '#EFF6FF' }]}>
                <MaterialCommunityIcons name="wifi" size={52} color="#3B82F6" />
              </View>
              <Text style={[styles.statusTitle, { color: theme.colors.onSurface }]}>
                Waiting for Web Dashboard
              </Text>
              <Text style={[styles.statusSub, { color: theme.colors.onSurfaceVariant }]}>
                Open the Inventory page on your computer and click{' '}
                <Text style={{ fontWeight: '800', color: '#696a8f' }}>"Scan with Phone"</Text>{' '}
                to pair.
              </Text>
              <View style={[styles.badge, { backgroundColor: '#D1FAE5' }]}>
                <MaterialCommunityIcons name="check-circle" size={14} color="#065F46" />
                <Text style={[styles.badgeText, { color: '#065F46' }]}>Server Connected</Text>
              </View>
            </>
          )}

          {wsStatus === 'error' && (
            <>
              <View style={[styles.statusIconBox, { backgroundColor: '#FEF2F2' }]}>
                <MaterialCommunityIcons name="wifi-off" size={52} color="#DC2626" />
              </View>
              <Text style={[styles.statusTitle, { color: theme.colors.onSurface }]}>Connection Failed</Text>
              <Text style={[styles.statusSub, { color: theme.colors.onSurfaceVariant }]}>
                {errorMsg || 'Could not connect to the server.'}
              </Text>
              <TouchableOpacity
                style={[styles.retryBtn, { backgroundColor: theme.colors.primary }]}
                onPress={() => {
                  setStatus('connecting');
                  setErrorMsg('');
                  connect();
                }}
              >
                <MaterialCommunityIcons name="refresh" size={18} color="#fff" />
                <Text style={styles.retryBtnText}>Retry</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  }

  // ── render: CAMERA SCREEN (web_ready) ─────────────────────────────────────
  if (!cameraReady) {
    return (
      <View style={[styles.statusContainer, { backgroundColor: theme.colors.background }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={theme.colors.onSurface} />
        </TouchableOpacity>
        <View style={styles.statusBody}>
          <MaterialCommunityIcons name="camera-off" size={64} color={theme.colors.outline} style={{ marginBottom: 16 }} />
          <Text style={[styles.statusTitle, { color: theme.colors.onSurface }]}>Camera Permission Needed</Text>
          <TouchableOpacity
            style={[styles.retryBtn, { backgroundColor: theme.colors.primary }]}
            onPress={requestPermission}
          >
            <Text style={styles.retryBtnText}>Allow Camera</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.cameraContainer} collapsable={false}>
      <StatusBar barStyle="light-content" />

      <CameraView
        style={styles.camera}
        facing="back"
        active={isFocused}
        barcodeScannerSettings={{
          barcodeTypes: ['qr', 'code128', 'code39', 'ean13', 'ean8', 'upc_a', 'upc_e'],
        }}
        onBarcodeScanned={handleBarcode}
        onCameraReady={() => console.log('[RemoteScanner] camera ready')}
        onMountError={(e) => console.log('[RemoteScanner] camera mount error:', e?.message)}
      />

      {/* Dim overlay */}
      <View
        style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.15)' }]}
        pointerEvents="none"
      />

      {/* Top bar */}
      <View style={styles.camTop}>
        <TouchableOpacity style={styles.camIconBtn} onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={styles.camTitle}>Remote Scanner</Text>
          <View style={styles.camBadge}>
            <View style={styles.camBadgeDot} />
            <Text style={styles.camBadgeText}>Web Connected</Text>
          </View>
        </View>
        <View style={{ width: 44 }} />
      </View>

      {/* Scan frame */}
      <View style={styles.frameWrap} pointerEvents="none">
        <View style={styles.scanFrame}>
          <View style={[styles.corner, styles.tl]} />
          <View style={[styles.corner, styles.tr]} />
          <View style={[styles.corner, styles.bl]} />
          <View style={[styles.corner, styles.br]} />
          <MaterialCommunityIcons name="barcode-scan" size={40} color="rgba(255,255,255,0.7)" />
          <Text style={styles.frameHint}>Align barcode inside box</Text>
        </View>
      </View>

      {/* Bottom bar */}
      <View style={styles.camBottom}>
        <Text style={styles.camBottomText}>
          Scan a barcode or QR code — it will appear on the web dashboard.
        </Text>
      </View>
    </View>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────

const CORNER = 26;
const THICK = 5;
const GREEN = '#22C55E';

const styles = StyleSheet.create({
  // status screen
  statusContainer: { flex: 1 },
  backBtn: {
    position: 'absolute',
    top: 52,
    left: 16,
    zIndex: 10,
    padding: 6,
  },
  statusBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  statusIconBox: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  statusTitle: { fontSize: 22, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
  statusSub: { fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 20 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
  },
  badgeText: { fontSize: 13, fontWeight: '700' },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 13,
    borderRadius: 10,
  },
  retryBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },

  // camera screen
  cameraContainer: { flex: 1, backgroundColor: '#000' },
  camera: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  camTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 30,
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 48,
    paddingHorizontal: 14,
    paddingBottom: 14,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  camIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  camTitle: { color: '#fff', fontSize: 17, fontWeight: '800' },
  camBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(34,197,94,0.25)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    marginTop: 4,
  },
  camBadgeDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#22C55E' },
  camBadgeText: { color: '#22C55E', fontSize: 12, fontWeight: '700' },

  frameWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
  },
  scanFrame: {
    width: 260,
    height: 260,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  corner: { position: 'absolute', width: CORNER, height: CORNER, borderColor: GREEN },
  tl: { top: 0, left: 0, borderTopWidth: THICK, borderLeftWidth: THICK, borderTopLeftRadius: 18 },
  tr: { top: 0, right: 0, borderTopWidth: THICK, borderRightWidth: THICK, borderTopRightRadius: 18 },
  bl: { bottom: 0, left: 0, borderBottomWidth: THICK, borderLeftWidth: THICK, borderBottomLeftRadius: 18 },
  br: { bottom: 0, right: 0, borderBottomWidth: THICK, borderRightWidth: THICK, borderBottomRightRadius: 18 },
  frameHint: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 10,
    backgroundColor: 'rgba(0,0,0,0.35)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
  },

  camBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 20,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 32,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
  },
  camBottomText: { color: '#fff', fontSize: 13, textAlign: 'center', lineHeight: 20 },
});
