import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  Vibration,
  SafeAreaView,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { useTheme } from '../../Context/ThemeContext';
import { useAuth } from '../../Context/AuthContext';
import { inventoryAPI } from '../../services/api';

const inventoryManagerRoles = [
  'operations_manager',
  'sales_manager',
  'admin',
  'super_admin',
  'director',
];

export default function InventoryScannerScreen({ navigation }) {
  const theme = useTheme();
  const { user, userType } = useAuth();

  const [permission, requestPermission] = useCameraPermissions();
  const isFocused = useIsFocused();

  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lastCode, setLastCode] = useState('');
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [manualModalVisible, setManualModalVisible] = useState(false);
  const [manualCode, setManualCode] = useState('');

  const [screenLayout, setScreenLayout] = useState({
    width: 0,
    height: 0,
  });

  const canScanInventory =
    userType === 'employee' &&
    inventoryManagerRoles.includes(String(user?.role || '').toLowerCase());

  const scanBoxSize =
    screenLayout.width > 0
      ? Math.min(screenLayout.width * 0.7, 280)
      : 260;

  const scanFrameDynamicStyle = {
    width: scanBoxSize,
    height: scanBoxSize,
    left:
      screenLayout.width > 0
        ? (screenLayout.width - scanBoxSize) / 2
        : 0,
    top:
      screenLayout.height > 0
        ? (screenLayout.height - scanBoxSize) / 2
        : 0,
  };

  const scanBoxDynamicStyle = {
    width: scanBoxSize,
    height: scanBoxSize,
  };

  const playScanFeedback = () => {
    try {
      Vibration.vibrate(120);
    } catch (error) {
      console.log('Scan feedback failed:', error?.message || error);
    }
  };

  const offerAddProduct = (code) => {
    Alert.alert(
      'No Product Found',
      `No product found for this code:\n${code}\n\nAdd it as a new product?`,
      [
        { text: 'Scan Again', style: 'cancel', onPress: () => setScanned(false) },
        {
          text: 'Add Product',
          onPress: () => {
            setScanned(false);
            navigation.navigate('AddProduct', {
              initialData: { barcode: code },
              isEdit: false,
            });
          },
        },
      ],
    );
  };

  const lookupCode = async (rawCode, fromScanner = false) => {
    const code = String(rawCode || '').trim();

    if (scanned || loading || !code) return;

    setScanned(true);
    setLoading(true);
    setLastCode(code);

    if (fromScanner) {
      playScanFeedback();
    }

    try {
      const response = await inventoryAPI.scanInventoryCode(code);
      const product = response.item || response.product || response.data;

      if (!product) {
        offerAddProduct(code);
        return;
      }

      navigation.replace('InventoryDetail', {
        product,
        scannedCode: code,
      });
    } catch (error) {
      if (error.response?.status === 404) {
        offerAddProduct(code);
        return;
      }

      const message =
        error.response?.data?.message ||
        'Unable to scan this code right now.';

      Alert.alert('Scan Failed', message, [
        {
          text: 'Scan Again',
          onPress: () => setScanned(false),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleBarcodeScanned = async ({ data }) => {
    await lookupCode(data, true);
  };

  const handleManualLookup = async () => {
    if (!manualCode.trim()) {
      Alert.alert('Code Required', 'Enter the SKU, barcode value, or QR value.');
      return;
    }

    setManualModalVisible(false);
    await lookupCode(manualCode, false);
  };

  if (!canScanInventory) {
    return (
      <View
        style={[
          styles.centered,
          { backgroundColor: theme.colors.background },
        ]}
      >
        <MaterialCommunityIcons name="lock-alert" size={64} color="#D32F2F" />

        <Text style={[styles.title, { color: theme.colors.onSurface }]}>
          Not Authorized
        </Text>

        <Text
          style={[
            styles.helperText,
            { color: theme.colors.onSurfaceVariant },
          ]}
        >
          You are not authorized to access this feature
        </Text>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.secondaryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!permission) {
    return (
      <View
        style={[
          styles.centered,
          { backgroundColor: theme.colors.background },
        ]}
      >
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View
        style={[
          styles.centered,
          { backgroundColor: theme.colors.background },
        ]}
      >
        <MaterialCommunityIcons
          name="camera-off"
          size={64}
          color={theme.colors.outline}
        />

        <Text style={[styles.title, { color: theme.colors.onSurface }]}>
          Camera Permission Needed
        </Text>

        <Text
          style={[
            styles.helperText,
            { color: theme.colors.onSurfaceVariant },
          ]}
        >
          Allow camera access to scan product barcode and QR labels.
        </Text>

        <TouchableOpacity
          style={[
            styles.primaryButton,
            { backgroundColor: theme.colors.primary },
          ]}
          onPress={requestPermission}
        >
          <Text style={styles.primaryButtonText}>Allow Camera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView
      style={styles.container}
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        setScreenLayout({ width, height });
      }}
    >
      <CameraView
        style={styles.camera}
        facing="back"
        active={isFocused}
        ratio="16:9"
        barcodeScannerSettings={{
          barcodeTypes: [
            'qr',
            'code128',
            'code39',
            'ean13',
            'ean8',
            'upc_a',
            'upc_e',
          ],
        }}
        onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
        onCameraReady={() => {
          setCameraReady(true);
          setCameraError('');
        }}
        onMountError={(event) => {
          const message =
            event?.nativeEvent?.message ||
            event?.message ||
            'Camera preview failed to start.';

          setCameraError(message);
          Alert.alert('Camera Error', message);
        }}
      />

      <View style={styles.overlay}>
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => navigation.goBack()}
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
          </TouchableOpacity>

          <Text style={styles.topTitle}>Scan Product Label</Text>

          <View style={styles.iconButton} />
        </View>

        {screenLayout.width > 0 && screenLayout.height > 0 ? (
          <View
            style={[styles.scanFrameContainer, scanFrameDynamicStyle]}
            pointerEvents="none"
          >
            <View style={[styles.scanBox, scanBoxDynamicStyle]}>
              <View style={[styles.corner, styles.cornerTopLeft]} />
              <View style={[styles.corner, styles.cornerTopRight]} />
              <View style={[styles.corner, styles.cornerBottomLeft]} />
              <View style={[styles.corner, styles.cornerBottomRight]} />

              <MaterialCommunityIcons
                name="barcode-scan"
                size={42}
                color="rgba(255,255,255,0.75)"
              />

              <Text style={styles.scanBoxText}>Align code inside box</Text>
            </View>
          </View>
        ) : null}

        <View style={styles.bottomPanel}>
          <Text style={styles.scanText}>
            {cameraError ||
              (cameraReady
                ? 'Point the camera at the printed barcode or QR code.'
                : 'Starting camera preview...')}
          </Text>

          {lastCode ? (
            <Text style={styles.lastCode}>Last scan: {lastCode}</Text>
          ) : null}

          {!cameraReady && !cameraError ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color="#fff" />
              <Text style={styles.loadingText}>Opening camera...</Text>
            </View>
          ) : loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color="#fff" />
              <Text style={styles.loadingText}>Looking up product...</Text>
            </View>
          ) : scanned ? (
            <TouchableOpacity
              style={styles.scanAgainButton}
              onPress={() => setScanned(false)}
            >
              <MaterialCommunityIcons
                name="barcode-scan"
                size={18}
                color="#fff"
              />
              <Text style={styles.scanAgainText}>Scan Again</Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            style={styles.manualButton}
            onPress={() => {
              setScanned(false);
              setManualModalVisible(true);
            }}
          >
            <Text style={styles.manualButtonText}>Enter Code Manually</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Modal
        visible={manualModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setManualModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.manualModal}>
            <Text style={styles.manualTitle}>Enter Product Code</Text>

            <Text style={styles.manualHelper}>
              Use the SKU/barcode value from the printed label.
            </Text>

            <TextInput
              value={manualCode}
              onChangeText={setManualCode}
              autoCapitalize="characters"
              placeholder="Example: BOX-000001"
              placeholderTextColor="#9CA3AF"
              style={styles.manualInput}
            />

            <View style={styles.manualActions}>
              <TouchableOpacity
                style={styles.cancelManualButton}
                onPress={() => setManualModalVisible(false)}
              >
                <Text style={styles.cancelManualText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.submitManualButton}
                onPress={handleManualLookup}
              >
                <Text style={styles.submitManualText}>Find Product</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },

  camera: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.18)',
  },

  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },

  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },

  helperText: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },

  primaryButton: {
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },

  primaryButtonText: {
    color: '#fff',
    fontWeight: '700',
  },

  secondaryButton: {
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: '#696a8f',
  },

  secondaryButtonText: {
    color: '#fff',
    fontWeight: '700',
  },

  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 48,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },

  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.42)',
  },

  topTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },

  scanFrameContainer: {
    position: 'absolute',
    zIndex: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },

  scanBox: {
    borderWidth: 2,
    borderColor: '#fff',
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    position: 'relative',
    overflow: 'hidden',
  },

  corner: {
    position: 'absolute',
    width: 62,
    height: 62,
    borderColor: '#22C55E',
  },

  cornerTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 6,
    borderLeftWidth: 6,
    borderTopLeftRadius: 18,
  },

  cornerTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 6,
    borderRightWidth: 6,
    borderTopRightRadius: 18,
  },

  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 6,
    borderLeftWidth: 6,
    borderBottomLeftRadius: 18,
  },

  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 6,
    borderRightWidth: 6,
    borderBottomRightRadius: 18,
  },

  scanBoxText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },

  bottomPanel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 20,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    alignItems: 'center',
  },

  scanText: {
    color: '#fff',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 4,
  },

  lastCode: {
    color: '#D1FAE5',
    fontSize: 13,
    marginBottom: 12,
  },

  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },

  loadingText: {
    color: '#fff',
    fontWeight: '700',
  },

  scanAgainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#2E7D32',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    marginTop: 6,
  },

  scanAgainText: {
    color: '#fff',
    fontWeight: '800',
  },

  manualButton: {
    marginTop: 4,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },

  manualButtonText: {
    color: '#fff',
    fontWeight: '800',
    textDecorationLine: 'underline',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },

  manualModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },

  manualTitle: {
    color: '#111827',
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 6,
  },

  manualHelper: {
    color: '#6B7280',
    fontSize: 14,
    marginBottom: 16,
  },

  manualInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: '#111827',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
  },

  manualActions: {
    flexDirection: 'row',
    gap: 10,
  },

  cancelManualButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
  },

  cancelManualText: {
    color: '#374151',
    fontWeight: '800',
  },

  submitManualButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    backgroundColor: '#2E7D32',
    alignItems: 'center',
  },

  submitManualText: {
    color: '#fff',
    fontWeight: '800',
  },
});