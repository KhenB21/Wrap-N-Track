/**
 * StockAdjustScannerScreen
 *
 * Full barcode-scan workflow for stock adjustments.
 * Phase 1 — Setup:   choose Add/Remove, enter quantity, optional reason
 * Phase 2 — Scan:    CameraView (reuses InventoryScannerScreen patterns)
 * Phase 3 — Confirm: product details + before→after preview; explicit Apply button
 * Phase 4 — Success: result summary; "Scan Another" shortcut
 */
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  Vibration,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { useTheme } from '../../Context/ThemeContext';
import { useAuth } from '../../Context/AuthContext';
import { useInventory } from '../../Context/InventoryContext';
import { inventoryAPI } from '../../services/api';

const MANAGER_ROLES = ['operations_manager', 'sales_manager', 'admin', 'super_admin', 'director'];

// ─── helpers ─────────────────────────────────────────────────────────────────

const formatQty = (n) => new Intl.NumberFormat('en-PH').format(Number(n ?? 0));

function validateQty(raw, action, currentStock) {
  const n = parseInt(raw, 10);
  if (!raw || raw.trim() === '') return 'Quantity is required.';
  if (!/^\d+$/.test(raw.trim())) return 'Quantity must be a positive whole number.';
  if (n <= 0) return 'Quantity must be greater than zero.';
  if (action === 'STOCK_OUT' && currentStock !== undefined && n > Number(currentStock)) {
    return `Cannot remove ${n} units. Only ${formatQty(currentStock)} ${Number(currentStock) === 1 ? 'unit is' : 'units are'} currently available.`;
  }
  return null;
}

// ─── component ───────────────────────────────────────────────────────────────

export default function StockAdjustScannerScreen({ navigation }) {
  const theme = useTheme();
  const { user, userType } = useAuth();
  const { fetchInventory } = useInventory();
  const isFocused = useIsFocused();
  const [permission, requestPermission] = useCameraPermissions();

  // Authorization
  const canAdjust =
    userType === 'employee' &&
    MANAGER_ROLES.includes(String(user?.role || '').toLowerCase());

  // ── phase state ────────────────────────────────────────────────────────────
  const [phase, setPhase] = useState('setup'); // setup | scanning | confirming | applying | success

  // ── setup inputs ───────────────────────────────────────────────────────────
  const [action, setAction] = useState('STOCK_IN');
  const [qtyInput, setQtyInput] = useState('');
  const [reason, setReason] = useState('');
  const [qtyError, setQtyError] = useState('');

  // ── scan state ─────────────────────────────────────────────────────────────
  const [scanned, setScanned] = useState(false);
  const [scanLoading, setScanLoading] = useState(false);
  const [scanError, setScanError] = useState('');

  // ── confirming state ───────────────────────────────────────────────────────
  const [product, setProduct] = useState(null);

  // ── apply state ────────────────────────────────────────────────────────────
  const applyingRef = useRef(false); // prevent double-submit
  const [applyError, setApplyError] = useState('');

  // ── success state ──────────────────────────────────────────────────────────
  const [result, setResult] = useState(null); // { previousQty, adjustQty, newQty, name, sku }

  // ── camera layout ──────────────────────────────────────────────────────────
  const [layout, setLayout] = useState({ width: 0, height: 0 });

  // ── AUTH GUARD ─────────────────────────────────────────────────────────────
  if (!canAdjust) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <MaterialCommunityIcons name="lock-alert" size={64} color="#D32F2F" />
        <Text style={[styles.h2, { color: theme.colors.onSurface }]}>Not Authorized</Text>
        <Text style={[styles.sub, { color: theme.colors.onSurfaceVariant }]}>
          You do not have permission to adjust stock.
        </Text>
        <TouchableOpacity style={styles.btnSecondary} onPress={() => navigation.goBack()}>
          <Text style={styles.btnSecondaryText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── HANDLERS ───────────────────────────────────────────────────────────────

  const handleStartScan = () => {
    const err = validateQty(qtyInput, action, undefined);
    if (err) { setQtyError(err); return; }
    setQtyError('');
    setScanError('');
    setScanned(false);
    setPhase('scanning');
  };

  const handleBarcodeScanned = async ({ data }) => {
    if (scanned || scanLoading) return;
    setScanned(true);
    setScanLoading(true);
    setScanError('');
    Vibration.vibrate(120);

    try {
      const response = await inventoryAPI.scanInventoryCode(data);
      const found = response?.item || response?.product || response?.data;

      if (!found) {
        setScanError('Product not found. Please scan a registered inventory product.');
        setScanned(false);
        setScanLoading(false);
        return;
      }

      // Re-validate qty now that we know current stock
      const err = validateQty(qtyInput, action, found.quantity);
      if (err) {
        setScanError(err);
        setScanned(false);
        setScanLoading(false);
        return;
      }

      setProduct(found);
      setPhase('confirming');
    } catch (error) {
      const msg =
        error.response?.status === 404
          ? 'Product not found. Please scan a registered inventory product.'
          : error.response?.data?.message || 'Failed to look up this code. Please try again.';
      setScanError(msg);
      setScanned(false);
    } finally {
      setScanLoading(false);
    }
  };

  const handleApply = async () => {
    if (applyingRef.current) return; // prevent double-submit
    applyingRef.current = true;
    setApplyError('');
    setPhase('applying');

    const qty = parseInt(qtyInput, 10);

    // Final server-side validation — server also validates, but show a friendly local error first
    const err = validateQty(qtyInput, action, product?.quantity);
    if (err) {
      setApplyError(err);
      setPhase('confirming');
      applyingRef.current = false;
      return;
    }

    try {
      const apiCall =
        action === 'STOCK_IN'
          ? inventoryAPI.stockIn(product.sku, qty, reason || 'Stock In via Barcode Scan', 'barcode_scan')
          : inventoryAPI.stockOut(product.sku, qty, reason || 'Stock Out via Barcode Scan', 'barcode_scan');

      await apiCall;

      setResult({
        name: product.name,
        sku: product.sku,
        previousQty: Number(product.quantity),
        adjustQty: qty,
        newQty: action === 'STOCK_IN'
          ? Number(product.quantity) + qty
          : Number(product.quantity) - qty,
        action,
      });

      // Refresh global inventory context so the list reflects the update
      fetchInventory?.();
      setPhase('success');
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        'Failed to update stock. Please try again.';
      setApplyError(msg);
      setPhase('confirming');
    } finally {
      applyingRef.current = false;
    }
  };

  const handleScanAnother = () => {
    setProduct(null);
    setResult(null);
    setApplyError('');
    setScanError('');
    setScanned(false);
    setQtyInput('');
    setReason('');
    setQtyError('');
    setAction('STOCK_IN');
    setPhase('setup');
  };

  const handleRescan = () => {
    setProduct(null);
    setScanError('');
    setScanned(false);
    setApplyError('');
    setPhase('scanning');
  };

  // ── PHASE: SETUP ──────────────────────────────────────────────────────────
  if (phase === 'setup') {
    return (
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <StatusBar barStyle={theme.dark ? 'light-content' : 'dark-content'} />
        <ScrollView
          style={{ flex: 1, backgroundColor: theme.colors.background }}
          contentContainerStyle={styles.setupScroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={[styles.setupHeader, { borderBottomColor: theme.colors.outline }]}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <MaterialCommunityIcons name="arrow-left" size={24} color={theme.colors.onSurface} />
            </TouchableOpacity>
            <Text style={[styles.setupTitle, { color: theme.colors.onSurface }]}>
              Adjust Stock via Scan
            </Text>
            <View style={{ width: 40 }} />
          </View>

          <View style={styles.setupBody}>
            {/* Step 1 — Action */}
            <Text style={[styles.stepLabel, { color: theme.colors.onSurfaceVariant }]}>
              Step 1 — Choose Action
            </Text>
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[
                  styles.actionCard,
                  { borderColor: action === 'STOCK_IN' ? '#22C55E' : theme.colors.outline },
                  action === 'STOCK_IN' && styles.actionCardActiveGreen,
                ]}
                onPress={() => setAction('STOCK_IN')}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons
                  name="package-up"
                  size={36}
                  color={action === 'STOCK_IN' ? '#22C55E' : theme.colors.onSurfaceVariant}
                />
                <Text style={[
                  styles.actionCardLabel,
                  { color: action === 'STOCK_IN' ? '#22C55E' : theme.colors.onSurface }
                ]}>
                  Add Stock
                </Text>
                <Text style={[styles.actionCardSub, { color: theme.colors.onSurfaceVariant }]}>
                  Increase quantity
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.actionCard,
                  { borderColor: action === 'STOCK_OUT' ? '#EF4444' : theme.colors.outline },
                  action === 'STOCK_OUT' && styles.actionCardActiveRed,
                ]}
                onPress={() => setAction('STOCK_OUT')}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons
                  name="package-down"
                  size={36}
                  color={action === 'STOCK_OUT' ? '#EF4444' : theme.colors.onSurfaceVariant}
                />
                <Text style={[
                  styles.actionCardLabel,
                  { color: action === 'STOCK_OUT' ? '#EF4444' : theme.colors.onSurface }
                ]}>
                  Remove Stock
                </Text>
                <Text style={[styles.actionCardSub, { color: theme.colors.onSurfaceVariant }]}>
                  Decrease quantity
                </Text>
              </TouchableOpacity>
            </View>

            {/* Step 2 — Quantity */}
            <Text style={[styles.stepLabel, { color: theme.colors.onSurfaceVariant, marginTop: 24 }]}>
              Step 2 — Enter Quantity
            </Text>
            <View style={[
              styles.inputWrap,
              { borderColor: qtyError ? '#EF4444' : theme.colors.outline, backgroundColor: theme.colors.surface },
            ]}>
              <MaterialCommunityIcons name="numeric" size={20} color={theme.colors.onSurfaceVariant} style={{ marginRight: 8 }} />
              <TextInput
                style={[styles.textInput, { color: theme.colors.onSurface }]}
                placeholder="Quantity (e.g. 10)"
                placeholderTextColor={theme.colors.onSurfaceVariant}
                keyboardType="number-pad"
                value={qtyInput}
                onChangeText={(v) => { setQtyInput(v); if (qtyError) setQtyError(''); }}
                returnKeyType="done"
              />
            </View>
            {qtyError ? (
              <Text style={styles.errorText}>{qtyError}</Text>
            ) : null}

            {/* Reason */}
            <TextInput
              style={[styles.reasonInput, {
                borderColor: theme.colors.outline,
                backgroundColor: theme.colors.surface,
                color: theme.colors.onSurface,
              }]}
              placeholder="Reason (optional)"
              placeholderTextColor={theme.colors.onSurfaceVariant}
              value={reason}
              onChangeText={setReason}
              multiline
              numberOfLines={2}
            />

            {/* Step 3 — Scan */}
            <Text style={[styles.stepLabel, { color: theme.colors.onSurfaceVariant, marginTop: 24 }]}>
              Step 3 — Scan Product
            </Text>
            <TouchableOpacity
              style={[
                styles.scanBtn,
                { backgroundColor: action === 'STOCK_IN' ? '#22C55E' : '#EF4444' },
              ]}
              onPress={handleStartScan}
              activeOpacity={0.85}
            >
              <MaterialCommunityIcons name="barcode-scan" size={22} color="#fff" />
              <Text style={styles.scanBtnText}>Start Scanning</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ── PHASE: SCANNING ───────────────────────────────────────────────────────
  if (phase === 'scanning') {
    if (!permission) {
      return (
        <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      );
    }
    if (!permission.granted) {
      return (
        <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
          <MaterialCommunityIcons name="camera-off" size={64} color={theme.colors.outline} />
          <Text style={[styles.h2, { color: theme.colors.onSurface }]}>Camera Permission Needed</Text>
          <TouchableOpacity
            style={[styles.btnPrimary, { backgroundColor: theme.colors.primary }]}
            onPress={requestPermission}
          >
            <Text style={styles.btnPrimaryText}>Allow Camera</Text>
          </TouchableOpacity>
        </View>
      );
    }

    const boxSize = layout.width > 0 ? Math.min(layout.width * 0.7, 280) : 260;

    return (
      <View
        style={styles.cameraContainer}
        collapsable={false}
        onLayout={(e) => setLayout({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}
      >
        <StatusBar barStyle="light-content" />
        <CameraView
          style={styles.camera}
          facing="back"
          active={isFocused}
          barcodeScannerSettings={{ barcodeTypes: ['qr', 'code128', 'code39', 'ean13', 'ean8', 'upc_a', 'upc_e'] }}
          onBarcodeScanned={!scanned ? handleBarcodeScanned : undefined}
          onCameraReady={() => console.log('[StockAdjustScanner] camera ready')}
          onMountError={(e) => console.log('[StockAdjustScanner] camera mount error:', e?.message)}
        />

        {/* Dim overlay */}
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.18)' }]} pointerEvents="none" />

        {/* Top bar */}
        <View style={styles.camTop}>
          <TouchableOpacity style={styles.camIconBtn} onPress={() => setPhase('setup')}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
          </TouchableOpacity>
          <View>
            <Text style={styles.camTitle}>Scan Product</Text>
            <Text style={styles.camSub}>
              {action === 'STOCK_IN' ? '＋' : '－'} {qtyInput} units — {action === 'STOCK_IN' ? 'Add Stock' : 'Remove Stock'}
            </Text>
          </View>
          <View style={{ width: 44 }} />
        </View>

        {/* Scan frame */}
        {layout.width > 0 && (
          <View
            style={[styles.scanFrame, {
              width: boxSize, height: boxSize,
              left: (layout.width - boxSize) / 2,
              top: (layout.height - boxSize) / 2,
            }]}
            pointerEvents="none"
          >
            <View style={[styles.corner, styles.tl]} />
            <View style={[styles.corner, styles.tr]} />
            <View style={[styles.corner, styles.bl]} />
            <View style={[styles.corner, styles.br]} />
            <MaterialCommunityIcons name="barcode-scan" size={42} color="rgba(255,255,255,0.75)" />
            <Text style={styles.frameText}>Align barcode inside box</Text>
          </View>
        )}

        {/* Bottom */}
        <View style={styles.camBottom}>
          {scanLoading ? (
            <View style={styles.row}>
              <ActivityIndicator color="#fff" />
              <Text style={styles.camHint}>Looking up product…</Text>
            </View>
          ) : scanError ? (
            <>
              <MaterialCommunityIcons name="alert-circle" size={22} color="#FCA5A5" />
              <Text style={[styles.camHint, { color: '#FCA5A5' }]}>{scanError}</Text>
              <TouchableOpacity
                style={styles.scanAgainBtn}
                onPress={() => { setScanError(''); setScanned(false); }}
              >
                <MaterialCommunityIcons name="barcode-scan" size={16} color="#fff" />
                <Text style={styles.scanAgainText}>Scan Again</Text>
              </TouchableOpacity>
            </>
          ) : (
            <Text style={styles.camHint}>Point the camera at the product barcode or QR code.</Text>
          )}

          <TouchableOpacity
            style={styles.manualBtn}
            onPress={() => setPhase('setup')}
          >
            <Text style={styles.manualBtnText}>← Change Action / Quantity</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── PHASE: CONFIRMING ─────────────────────────────────────────────────────
  if (phase === 'confirming' || phase === 'applying') {
    const qty = parseInt(qtyInput, 10) || 0;
    const currentStock = Number(product?.quantity ?? 0);
    const newStock = action === 'STOCK_IN' ? currentStock + qty : currentStock - qty;
    const isRemove = action === 'STOCK_OUT';

    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: theme.colors.background }}
        contentContainerStyle={styles.confirmScroll}
        keyboardShouldPersistTaps="handled"
      >
        <StatusBar barStyle={theme.dark ? 'light-content' : 'dark-content'} />

        {/* Header */}
        <View style={[styles.setupHeader, { borderBottomColor: theme.colors.outline }]}>
          <TouchableOpacity onPress={handleRescan} style={styles.backBtn} disabled={phase === 'applying'}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={theme.colors.onSurface} />
          </TouchableOpacity>
          <Text style={[styles.setupTitle, { color: theme.colors.onSurface }]}>
            Verify Adjustment
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.confirmBody}>
          {/* Product card */}
          <View style={[styles.productCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
            <Text style={[styles.productLabel, { color: theme.colors.onSurfaceVariant }]}>Product</Text>
            <Text style={[styles.productName, { color: theme.colors.onSurface }]}>{product?.name}</Text>
            <Text style={[styles.productSku, { color: theme.colors.onSurfaceVariant }]}>SKU: {product?.sku}</Text>
            <View style={[styles.divider, { backgroundColor: theme.colors.outline }]} />
            <View style={styles.stockRow}>
              <Text style={[styles.stockLabel, { color: theme.colors.onSurfaceVariant }]}>Current Stock</Text>
              <Text style={[styles.stockVal, { color: theme.colors.onSurface }]}>{formatQty(currentStock)} {product?.uom || 'units'}</Text>
            </View>
          </View>

          {/* Adjustment summary */}
          <View style={[styles.adjustCard, {
            backgroundColor: isRemove ? '#FEF2F2' : '#F0FDF4',
            borderColor: isRemove ? '#FCA5A5' : '#86EFAC',
          }]}>
            <Text style={[styles.adjustCardTitle, { color: isRemove ? '#991B1B' : '#166534' }]}>
              {isRemove ? 'Remove Stock' : 'Add Stock'}
            </Text>

            <View style={styles.adjustRow}>
              <Text style={[styles.adjustRowLabel, { color: isRemove ? '#7F1D1D' : '#14532D' }]}>Current</Text>
              <Text style={[styles.adjustRowVal, { color: isRemove ? '#991B1B' : '#166534' }]}>{formatQty(currentStock)}</Text>
            </View>
            <View style={styles.adjustRow}>
              <Text style={[styles.adjustRowLabel, { color: isRemove ? '#7F1D1D' : '#14532D' }]}>
                {isRemove ? '− Remove' : '＋ Add'}
              </Text>
              <Text style={[styles.adjustRowVal, { color: isRemove ? '#DC2626' : '#16A34A', fontWeight: '800' }]}>
                {isRemove ? `-${formatQty(qty)}` : `+${formatQty(qty)}`}
              </Text>
            </View>
            <View style={[styles.divider, { backgroundColor: isRemove ? '#FCA5A5' : '#86EFAC' }]} />
            <View style={styles.adjustRow}>
              <Text style={[styles.adjustRowLabel, { color: isRemove ? '#7F1D1D' : '#14532D', fontWeight: '700' }]}>New Stock</Text>
              <Text style={[styles.adjustRowVal, { color: isRemove ? '#991B1B' : '#166534', fontWeight: '900', fontSize: 20 }]}>
                {formatQty(newStock)}
              </Text>
            </View>

            {reason ? (
              <Text style={[styles.reasonPreview, { color: isRemove ? '#7F1D1D' : '#14532D' }]}>
                Reason: {reason}
              </Text>
            ) : null}
          </View>

          {/* Remove warning */}
          {isRemove && (
            <View style={styles.warningBanner}>
              <MaterialCommunityIcons name="alert" size={18} color="#92400E" />
              <Text style={styles.warningText}>
                This will permanently decrease the stock of{' '}
                <Text style={{ fontWeight: '800' }}>{product?.name}</Text>{' '}
                from {formatQty(currentStock)} to {formatQty(newStock)} units.
              </Text>
            </View>
          )}

          {/* Apply error */}
          {applyError ? (
            <View style={styles.errorBanner}>
              <MaterialCommunityIcons name="alert-circle" size={18} color="#991B1B" />
              <Text style={styles.errorBannerText}>{applyError}</Text>
            </View>
          ) : null}

          {/* Action buttons */}
          <View style={styles.confirmActions}>
            <TouchableOpacity
              style={[styles.btnOutline, { borderColor: theme.colors.outline }]}
              onPress={handleRescan}
              disabled={phase === 'applying'}
            >
              <MaterialCommunityIcons name="barcode-scan" size={18} color={theme.colors.onSurface} />
              <Text style={[styles.btnOutlineText, { color: theme.colors.onSurface }]}>Cancel / Rescan</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.applyBtn, {
                backgroundColor: isRemove ? '#DC2626' : '#16A34A',
                opacity: phase === 'applying' ? 0.7 : 1,
              }]}
              onPress={handleApply}
              disabled={phase === 'applying'}
            >
              {phase === 'applying' ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <MaterialCommunityIcons name="check-circle" size={18} color="#fff" />
              )}
              <Text style={styles.applyBtnText}>
                {phase === 'applying' ? 'Applying…' : 'Apply Adjustment'}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.confirmNote, { color: theme.colors.onSurfaceVariant }]}>
            {isRemove
              ? `This will decrease ${product?.name} from ${formatQty(currentStock)} → ${formatQty(newStock)} units.`
              : `This will increase ${product?.name} from ${formatQty(currentStock)} → ${formatQty(newStock)} units.`}
          </Text>
        </View>
      </ScrollView>
    );
  }

  // ── PHASE: SUCCESS ────────────────────────────────────────────────────────
  if (phase === 'success' && result) {
    const isRemove = result.action === 'STOCK_OUT';
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <StatusBar barStyle={theme.dark ? 'light-content' : 'dark-content'} />

        <View style={[styles.successIcon, { backgroundColor: isRemove ? '#FEF2F2' : '#F0FDF4' }]}>
          <MaterialCommunityIcons
            name="check-circle"
            size={56}
            color={isRemove ? '#DC2626' : '#16A34A'}
          />
        </View>

        <Text style={[styles.successTitle, { color: theme.colors.onSurface }]}>
          Stock Updated Successfully
        </Text>
        <Text style={[styles.successProductName, { color: theme.colors.onSurface }]}>
          {result.name}
        </Text>
        <Text style={[styles.successSku, { color: theme.colors.onSurfaceVariant }]}>
          SKU: {result.sku}
        </Text>

        <View style={[styles.successCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
          <View style={styles.successRow}>
            <Text style={[styles.successRowLabel, { color: theme.colors.onSurfaceVariant }]}>Previous Stock</Text>
            <Text style={[styles.successRowVal, { color: theme.colors.onSurface }]}>{formatQty(result.previousQty)}</Text>
          </View>
          <View style={styles.successRow}>
            <Text style={[styles.successRowLabel, { color: theme.colors.onSurfaceVariant }]}>
              {isRemove ? 'Removed' : 'Added'}
            </Text>
            <Text style={[styles.successRowVal, { color: isRemove ? '#DC2626' : '#16A34A', fontWeight: '800' }]}>
              {isRemove ? `−${formatQty(result.adjustQty)}` : `+${formatQty(result.adjustQty)}`}
            </Text>
          </View>
          <View style={[styles.divider, { backgroundColor: theme.colors.outline }]} />
          <View style={styles.successRow}>
            <Text style={[styles.successRowLabel, { color: theme.colors.onSurface, fontWeight: '700' }]}>New Stock</Text>
            <Text style={[styles.successRowVal, { color: isRemove ? '#DC2626' : '#16A34A', fontWeight: '900', fontSize: 20 }]}>
              {formatQty(result.newQty)}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.btnPrimary, { backgroundColor: theme.colors.primary, marginTop: 28 }]}
          onPress={handleScanAnother}
        >
          <MaterialCommunityIcons name="barcode-scan" size={18} color="#fff" />
          <Text style={styles.btnPrimaryText}>Scan Another Product</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btnOutline, { borderColor: theme.colors.outline, marginTop: 12 }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={[styles.btnOutlineText, { color: theme.colors.onSurface }]}>Done</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return null;
}

// ─── styles ───────────────────────────────────────────────────────────────────

const CORNER_SIZE = 26;
const CORNER_THICK = 5;
const CORNER_COLOR = '#22C55E';

const styles = StyleSheet.create({
  // ── shared ──────────────────────────────────────────────────────────────────
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  h2: { fontSize: 22, fontWeight: '800', marginTop: 16, textAlign: 'center' },
  sub: { fontSize: 14, textAlign: 'center', lineHeight: 22, marginTop: 6, marginBottom: 20 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  divider: { height: 1, marginVertical: 10 },

  // ── buttons ─────────────────────────────────────────────────────────────────
  btnPrimary: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 22, paddingVertical: 13, borderRadius: 10 },
  btnPrimaryText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  btnSecondary: { backgroundColor: '#696a8f', paddingHorizontal: 22, paddingVertical: 12, borderRadius: 10, marginTop: 12 },
  btnSecondaryText: { color: '#fff', fontWeight: '700' },
  btnOutline: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 10, borderWidth: 1.5 },
  btnOutlineText: { fontWeight: '700', fontSize: 14 },

  // ── setup phase ─────────────────────────────────────────────────────────────
  setupScroll: { flexGrow: 1 },
  setupHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 52, paddingHorizontal: 16, paddingBottom: 14,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 4 },
  setupTitle: { fontSize: 18, fontWeight: '800' },
  setupBody: { padding: 20 },

  stepLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },

  actionRow: { flexDirection: 'row', gap: 12 },
  actionCard: {
    flex: 1, borderWidth: 2, borderRadius: 14, padding: 16,
    alignItems: 'center', gap: 6,
  },
  actionCardActiveGreen: { backgroundColor: '#F0FDF4' },
  actionCardActiveRed: { backgroundColor: '#FEF2F2' },
  actionCardLabel: { fontSize: 15, fontWeight: '800' },
  actionCardSub: { fontSize: 12, textAlign: 'center' },

  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 12,
    marginBottom: 4,
  },
  textInput: { flex: 1, fontSize: 16, fontWeight: '600' },
  errorText: { color: '#DC2626', fontSize: 13, marginBottom: 8, marginLeft: 4 },
  reasonInput: {
    borderWidth: 1.5, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, marginTop: 10,
    textAlignVertical: 'top',
  },
  scanBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    paddingVertical: 16, borderRadius: 14, marginTop: 10,
  },
  scanBtnText: { color: '#fff', fontSize: 17, fontWeight: '800' },

  // ── camera phase ─────────────────────────────────────────────────────────────
  cameraContainer: { flex: 1, backgroundColor: '#000' },
  camera: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  camTop: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 30,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 48, paddingHorizontal: 16, paddingBottom: 14,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  camIconBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.4)' },
  camTitle: { color: '#fff', fontSize: 17, fontWeight: '800', textAlign: 'center' },
  camSub: { color: 'rgba(255,255,255,0.8)', fontSize: 13, textAlign: 'center', marginTop: 2 },

  scanFrame: {
    position: 'absolute', zIndex: 50,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.04)',
  },
  corner: { position: 'absolute', width: CORNER_SIZE, height: CORNER_SIZE, borderColor: CORNER_COLOR },
  tl: { top: 0, left: 0, borderTopWidth: CORNER_THICK, borderLeftWidth: CORNER_THICK, borderTopLeftRadius: 18 },
  tr: { top: 0, right: 0, borderTopWidth: CORNER_THICK, borderRightWidth: CORNER_THICK, borderTopRightRadius: 18 },
  bl: { bottom: 0, left: 0, borderBottomWidth: CORNER_THICK, borderLeftWidth: CORNER_THICK, borderBottomLeftRadius: 18 },
  br: { bottom: 0, right: 0, borderBottomWidth: CORNER_THICK, borderRightWidth: CORNER_THICK, borderBottomRightRadius: 18 },
  frameText: { color: '#fff', fontSize: 12, fontWeight: '800', marginTop: 10, backgroundColor: 'rgba(0,0,0,0.35)', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999 },

  camBottom: {
    position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 20,
    paddingHorizontal: 20, paddingTop: 14, paddingBottom: 28,
    backgroundColor: 'rgba(0,0,0,0.72)', alignItems: 'center', gap: 8,
  },
  camHint: { color: '#fff', fontSize: 13, textAlign: 'center' },
  scanAgainBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#2E7D32', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999, marginTop: 4 },
  scanAgainText: { color: '#fff', fontWeight: '800' },
  manualBtn: { marginTop: 4, paddingHorizontal: 16, paddingVertical: 6 },
  manualBtnText: { color: '#fff', fontWeight: '700', textDecorationLine: 'underline', fontSize: 13 },

  // ── confirming phase ──────────────────────────────────────────────────────────
  confirmScroll: { flexGrow: 1 },
  confirmBody: { padding: 20 },

  productCard: { borderWidth: 1, borderRadius: 14, padding: 16, marginBottom: 14 },
  productLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 4 },
  productName: { fontSize: 20, fontWeight: '800', marginBottom: 2 },
  productSku: { fontSize: 13, marginBottom: 10 },
  stockRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stockLabel: { fontSize: 14 },
  stockVal: { fontSize: 16, fontWeight: '700' },

  adjustCard: { borderWidth: 1.5, borderRadius: 14, padding: 16, marginBottom: 14 },
  adjustCardTitle: { fontSize: 15, fontWeight: '800', marginBottom: 12 },
  adjustRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  adjustRowLabel: { fontSize: 14 },
  adjustRowVal: { fontSize: 16, fontWeight: '700' },
  reasonPreview: { fontSize: 12, marginTop: 10, fontStyle: 'italic' },

  warningBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#FEF3C7', borderRadius: 10, padding: 12, marginBottom: 14 },
  warningText: { flex: 1, color: '#92400E', fontSize: 13, lineHeight: 20 },

  errorBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#FEE2E2', borderRadius: 10, padding: 12, marginBottom: 14 },
  errorBannerText: { flex: 1, color: '#991B1B', fontSize: 13 },

  confirmActions: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  applyBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 10 },
  applyBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  confirmNote: { fontSize: 12, textAlign: 'center', lineHeight: 18 },

  // ── success phase ──────────────────────────────────────────────────────────────
  successIcon: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  successTitle: { fontSize: 22, fontWeight: '900', marginBottom: 6 },
  successProductName: { fontSize: 17, fontWeight: '700', marginBottom: 2 },
  successSku: { fontSize: 13, marginBottom: 20 },
  successCard: { width: '100%', borderWidth: 1, borderRadius: 14, padding: 16 },
  successRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5 },
  successRowLabel: { fontSize: 14 },
  successRowVal: { fontSize: 16, fontWeight: '700' },
});
