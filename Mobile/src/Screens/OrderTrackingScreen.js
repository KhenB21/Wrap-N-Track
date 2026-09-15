import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Image,
  Linking,
} from "react-native";
import Header from "../Components/Header";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { customerOrderAPI, BASE_URL } from "../services/api";
import { useTheme } from "../Context/ThemeContext";
import { SkeletonText, SkeletonCard } from "../Components/Skeleton/Skeleton";
import ProductImage from "../Components/ProductImage";
import { peso } from "../constants/boutique";

const STEP_ICONS = {
  // Server tracking step ids
  'order-placed': 'clipboard-text-outline',
  'order-paid': 'credit-card-outline',
  'order-shipped': 'truck-outline',
  'order-received': 'home-outline',
  // Website journey stages (used when the tracking endpoint is unavailable)
  placed: 'clipboard-text-outline',
  paid: 'credit-card-outline',
  preparing: 'package-variant-closed',
  shipped: 'truck-outline',
  received: 'home-outline',
};

/* Customer journey — mirrors the Website order tracker
   (Website/client/src/Pages/CustomerPOV/CustomerCartWithOrders.js). */
const STATUS_ALIASES = {
  pending: 'placed',
  orderplaced: 'placed',
  orderpaid: 'paid',
  tobepack: 'preparing',
  tobepacked: 'preparing',
  inprogress: 'preparing',
  readyfordeliver: 'shipped',
  readyfordelivery: 'shipped',
  ordershippedout: 'shipped',
  enroute: 'shipped',
  orderreceived: 'received',
  completed: 'received',
  cancelled: 'cancelled',
};

const STAGES = [
  { key: 'placed', label: 'Order Placed', hint: 'We have your order' },
  { key: 'paid', label: 'Payment Received', hint: 'Deposit confirmed' },
  { key: 'preparing', label: 'Being Prepared', hint: 'Your boxes are being made' },
  { key: 'shipped', label: 'Out for Delivery', hint: 'On its way to you' },
  { key: 'received', label: 'Received', hint: 'Delivered' },
];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const normalize = (s) => (typeof s === 'string' ? s.toLowerCase().replace(/\s+/g, '').replace(/-/g, '') : '');
const stageKeyFor = (status) => STATUS_ALIASES[normalize(status)] || 'placed';
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

// Read a plain date field-by-field so the phone's timezone cannot shift it.
const parseDate = (raw) => {
  if (!raw) return null;
  const text = String(raw).trim();
  const plain = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (plain) return new Date(Number(plain[1]), Number(plain[2]) - 1, Number(plain[3]));
  const d = new Date(text);
  return Number.isNaN(d.getTime()) ? null : startOfDay(d);
};

const fmtDate = (raw, withYear = true) => {
  const d = parseDate(raw);
  if (!d) return null;
  return `${MONTHS[d.getMonth()]} ${d.getDate()}${withYear ? `, ${d.getFullYear()}` : ''}`;
};

// Everything the screen needs to describe one order's progress.
const trackOrder = (order) => {
  // Only the customer's own "Order Received" finishes an order. One staff marked
  // Completed (receipt_confirmed === false) stays on Out for Delivery at 80% until
  // the customer confirms.
  const rawStageKey = stageKeyFor(order.status);
  const awaitingConfirmation = rawStageKey === 'received' && order.receipt_confirmed === false;
  const stageKey = awaitingConfirmation ? 'shipped' : rawStageKey;
  const cancelled = stageKey === 'cancelled';
  const index = STAGES.findIndex((s) => s.key === stageKey);
  const currentIndex = index < 0 ? 0 : index;
  // The current stage counts as reached, so a fresh order reads 20% rather than 0%.
  const percent = cancelled ? 0 : Math.round(((currentIndex + 1) / STAGES.length) * 100);

  const due = parseDate(order.expected_delivery);
  let etaLabel = 'To be scheduled';
  let etaNote = '';
  let late = false;

  if (due) {
    const days = Math.round((due - startOfDay(new Date())) / 86400000);
    etaLabel = fmtDate(order.expected_delivery);
    if (stageKey === 'received') etaNote = 'Delivered';
    else if (days < 0) {
      etaNote = `${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} overdue`;
      late = true;
    } else if (days === 0) etaNote = 'Arriving today';
    else if (days === 1) etaNote = 'Tomorrow';
    else etaNote = `${days} days to go`;
  }

  if (awaitingConfirmation) {
    etaNote = 'Waiting for your confirmation';
    late = false;
  }

  return { stageKey, cancelled, currentIndex, percent, etaLabel, etaNote, late, awaitingConfirmation };
};

// A readable name for an order: the chosen styling/package, else its contents.
const orderTitle = (order) => {
  const pkg = (order.package_name || '').trim();
  if (pkg && pkg.toLowerCase() !== 'handpick') return `${pkg} Gift Boxes`;
  const items = order.products || [];
  if (items.length === 1) return items[0].name;
  if (items.length > 1) return `${items[0].name} + ${items.length - 1} more`;
  return 'Custom Gift Boxes';
};

// The order-details endpoint names product fields differently from the orders list.
const normalizeProducts = (products) =>
  (products || []).map((p) => ({
    sku: p.sku,
    name: p.name || p.product_name,
    quantity: p.quantity,
    image_version: p.image_version || null,
    has_image: p.has_image ?? (p.image_data ? true : undefined),
  }));

const withProducts = (order) => (order ? { ...order, products: normalizeProducts(order.products) } : null);

// Proof photos are stored as server-relative paths.
const resolveAsset = (url) => {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  const host = BASE_URL.replace(/\/api\/?$/, '');
  return `${host}${url.startsWith('/') ? '' : '/'}${url}`;
};

export default function OrderTrackingScreen({ navigation, route }) {
  const { orderId, order: initialOrder } = route.params || {};
  const { darkMode } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [tracking, setTracking] = useState(null);
  const [order, setOrder] = useState(() => withProducts(initialOrder));
  const [loaded, setLoaded] = useState(false);
  const [confirmingReceipt, setConfirmingReceipt] = useState(false);
  const [proofFailed, setProofFailed] = useState(false);

  // Tracking steps come from /tracking; products, payment and delivery details come from
  // the same orders list the Website tracker reads, falling back to the order-details endpoint.
  const loadTracking = useCallback(async () => {
    if (!orderId) return;
    const [trackingResult, ordersResult] = await Promise.allSettled([
      customerOrderAPI.getOrderTracking(orderId),
      customerOrderAPI.getMyOrders({ limit: 100 }),
    ]);

    if (trackingResult.status === 'fulfilled') {
      setTracking(trackingResult.value?.tracking || trackingResult.value);
    }

    let found = null;
    if (ordersResult.status === 'fulfilled') {
      const value = ordersResult.value;
      const list = Array.isArray(value) ? value : value?.orders || [];
      found = list.find((o) => String(o.order_id) === String(orderId)) || null;
    }
    if (!found) {
      try {
        const detail = await customerOrderAPI.getMyOrder(orderId);
        found = detail?.order || detail?.data || (detail?.order_id ? detail : null);
      } catch (error) {
        console.error('Error loading order details:', error);
      }
    }
    if (found) setOrder(withProducts(found));

    if (trackingResult.status === 'rejected' && !found) {
      console.error('Error loading tracking:', trackingResult.reason);
      Alert.alert('Error', 'Failed to load order tracking');
    }
    setLoaded(true);
  }, [orderId]);

  useEffect(() => {
    loadTracking();
  }, [loadTracking]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadTracking();
    } finally {
      setRefreshing(false);
    }
  };

  const confirmReceived = () => {
    Alert.alert(
      "Order Received",
      "Confirming marks this order as completed. Have you received it?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Yes, mark as received",
          onPress: async () => {
            setConfirmingReceipt(true);
            try {
              await customerOrderAPI.markOrderReceived(orderId);
              await loadTracking();
            } catch (error) {
              console.error("Error marking order as received:", error);
              Alert.alert(
                "Error",
                error?.response?.data?.message || "Failed to mark order as received. Please try again."
              );
            } finally {
              setConfirmingReceipt(false);
            }
          },
        },
      ]
    );
  };

  const getStepColor = (completed) => completed ? '#6B6593' : (darkMode ? '#393A3B' : '#EDECF3');
  const getStepIconColor = (completed) => completed ? '#fff' : (darkMode ? '#B0B3B8' : '#6B6593');

  const bg = darkMode ? "#18191A" : "#F5F4FA";
  const card = darkMode ? "#242526" : "#fff";
  const text = darkMode ? "#E4E6EB" : "#222";
  const sub = darkMode ? "#B0B3B8" : "#6B6593";
  const divider = darkMode ? "#393A3B" : "#EDECF3";
  const noteBg = darkMode ? "#2F2E3D" : "#F0EFF8";
  const danger = darkMode ? "#E57373" : "#C0392B";
  const success = darkMode ? "#81C784" : "#2E7D32";

  const header = (
    <Header showBack showCart logoType="image" onBackPress={() => navigation.goBack()} onCartPress={() => navigation.navigate("CustomerTabs", { screen: "Cart" })} darkMode={darkMode} />
  );

  if (!tracking && !order) {
    return (
      <View style={[styles.container, { backgroundColor: bg }]}>
        {header}
        {loaded ? (
          <View style={[styles.section, styles.centered, { backgroundColor: card }]}>
            <MaterialCommunityIcons name="package-variant" size={40} color={sub} />
            <Text style={[styles.emptyText, { color: text }]}>We couldn't load this order right now.</Text>
            <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
              <Text style={styles.retryButtonText}>Try again</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.scrollView}>
            <View style={[styles.section, { backgroundColor: card }]}>
              <SkeletonText width="60%" height={20} style={{ marginBottom: 10 }} />
              <SkeletonText width="40%" height={13} />
            </View>
            <View style={[styles.section, { backgroundColor: card }]}>
              <SkeletonText width="45%" height={16} style={{ marginBottom: 16 }} />
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonCard key={i} lines={1} style={{ marginBottom: 12 }} />
              ))}
            </View>
          </View>
        )}
      </View>
    );
  }

  const t = order ? trackOrder(order) : null;
  const currentStage = tracking?.currentStage;
  const items = order?.products || [];
  const boxes = order ? Number(order.total_boxes ?? order.order_quantity ?? 0) : 0;
  const balance = Number(order?.remaining_balance || 0);
  const deliveryStatus = tracking?.deliveryStatus || order?.delivery_status;
  const shippingAddress = tracking?.shippingAddress || order?.shipping_address;
  const totalCost = order?.total_cost ?? tracking?.totalCost;
  const cancelled = Boolean(t?.cancelled);

  const statusLabel = t
    ? cancelled ? 'Cancelled' : STAGES[t.currentIndex].label
    : (currentStage || '').replace(/-/g, ' ');
  const statusColor = cancelled ? danger : t?.stageKey === 'received' ? success : '#6B6593';

  // Prefer the server's timestamped steps; otherwise draw the Website's five stages.
  const steps = tracking?.steps?.length
    ? tracking.steps
    : t
    ? STAGES.map((stage, i) => ({
        id: stage.key,
        title: stage.label,
        description: i === t.currentIndex ? stage.hint : '',
        completed: i <= t.currentIndex,
        status: i === t.currentIndex ? 'current' : '',
      }))
    : [];

  const trackingUnavailable =
    order &&
    !cancelled &&
    !(order.tracking_link_available && order.tracking_link) &&
    order.delivery_type !== 'PICKUP' &&
    order.delivery_method !== 'Customer Pick-up' &&
    (order.tracking_unavailable_message || '');

  const showDelivery =
    order &&
    !cancelled &&
    (order.delivery_method || order.courier_name || order.tracking_number || order.delivery_remarks || order.proof_image_url);

  // The server decides: a shipped/delivered live order, or an order staff completed
  // that the customer hasn't confirmed. Older servers without the flag keep the old rule.
  const serverCanConfirm = tracking?.canConfirmReceipt ?? order?.can_confirm_receipt;
  const canConfirmReceipt =
    serverCanConfirm !== undefined
      ? Boolean(serverCanConfirm)
      : deliveryStatus === 'Sent / Shipped' && currentStage !== 'Order Received' && t?.stageKey !== 'received';

  const subLine = [
    items.length > 0 && `${items.length} item${items.length === 1 ? '' : 's'}`,
    boxes > 0 && `${boxes} box${boxes === 1 ? '' : 'es'}`,
    order?.order_date && `Placed ${fmtDate(order.order_date, false)}`,
  ]
    .filter(Boolean)
    .join(' · ');

  const renderFact = (label, value, valueColor) => (
    <View style={[styles.factRow, { borderBottomColor: divider }]}>
      <Text style={[styles.factLabel, { color: sub }]}>{label}</Text>
      <Text style={[styles.factValue, { color: valueColor || text }]}>{value}</Text>
    </View>
  );

  const renderNote = (message, icon = 'information-outline') => (
    <View style={[styles.note, { backgroundColor: noteBg }]}>
      <MaterialCommunityIcons name={icon} size={16} color={sub} />
      <Text style={[styles.noteText, { color: text }]}>{message}</Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      {header}

      <ScrollView style={styles.scrollView} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {/* Order Header */}
        <View style={[styles.section, { backgroundColor: card }]}>
          <View style={styles.orderHeader}>
            <Text style={[styles.orderId, { color: text }]} numberOfLines={2}>
              {order ? orderTitle(order) : `Order ${tracking?.orderId || orderId}`}
            </Text>
            {!!statusLabel && (
              <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
                <Text style={styles.statusText}>{statusLabel.toUpperCase()}</Text>
              </View>
            )}
          </View>
          {!!subLine && <Text style={[styles.orderDate, { color: sub }]}>{subLine}</Text>}
          {order && <Text style={[styles.orderRef, { color: sub }]}>Order {order.order_id}</Text>}

          {t && !cancelled && (
            <View style={[styles.progressBlock, { borderTopColor: divider }]}>
              <View style={styles.progressTop}>
                <View>
                  <Text style={[styles.blockLabel, { color: sub }]}>PROGRESS</Text>
                  <Text style={[styles.percent, { color: text }]}>{t.percent}%</Text>
                </View>
                <View style={styles.etaBlock}>
                  <Text style={[styles.blockLabel, { color: sub }]}>
                    {t.stageKey === 'received' ? 'DELIVERED' : 'EXPECTED DELIVERY'}
                  </Text>
                  <Text style={[styles.etaValue, { color: text }]}>{t.etaLabel}</Text>
                  {!!t.etaNote && (
                    <Text style={[styles.etaNote, { color: t.late ? danger : sub }]}>{t.etaNote}</Text>
                  )}
                </View>
              </View>
              <View style={[styles.progressTrack, { backgroundColor: divider }]}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${t.percent}%`, backgroundColor: t.stageKey === 'received' ? success : '#6B6593' },
                  ]}
                />
              </View>
            </View>
          )}

          {!!shippingAddress && (
            <Text style={[styles.orderDate, { color: sub, marginTop: 10 }]}>To: {shippingAddress}</Text>
          )}
        </View>

        {cancelled && (
          <View style={[styles.section, { backgroundColor: card }]}>
            {renderNote(
              'This order was cancelled. Nothing will be delivered and any payment made is being handled by our team.',
              'close-circle-outline'
            )}
          </View>
        )}

        {/* Status Timeline */}
        {!cancelled && steps.length > 0 && (
          <View style={[styles.section, { backgroundColor: card }]}>
            <Text style={[styles.sectionTitle, { color: text }]}>Order Tracking</Text>
            <View style={styles.timeline}>
              {steps.map((step, index) => (
                <View key={step.id} style={styles.timelineItem}>
                  <View style={[styles.timelineIcon, { backgroundColor: getStepColor(step.completed), borderColor: getStepColor(step.completed) }]}>
                    <MaterialCommunityIcons
                      name={STEP_ICONS[step.id] || 'circle-outline'}
                      size={16}
                      color={getStepIconColor(step.completed)}
                    />
                  </View>
                  <View style={styles.timelineContent}>
                    <Text style={[styles.timelineStatus, { color: step.completed ? text : sub, fontWeight: step.status === 'current' ? 'bold' : 'normal' }]}>
                      {step.title}
                    </Text>
                    {step.description ? (
                      <Text style={[styles.timelineDescription, { color: sub }]}>{step.description}</Text>
                    ) : null}
                    {step.timestamp ? (
                      <Text style={[styles.timelineDescription, { color: sub }]}>
                        {new Date(step.timestamp).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    ) : null}
                  </View>
                  {index < steps.length - 1 && (
                    <View style={[styles.timelineLine, { backgroundColor: step.completed ? '#6B6593' : divider }]} />
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Products ordered */}
        {order && (
          <View style={[styles.section, { backgroundColor: card }]}>
            <Text style={[styles.sectionTitle, { color: text }]}>What's in your box</Text>
            {items.length === 0 ? (
              <Text style={[styles.orderDate, { color: sub }]}>Our team is still finalising the contents of this order.</Text>
            ) : (
              items.map((p, i) => (
                <View
                  key={`${p.sku}-${i}`}
                  style={[styles.productRow, i < items.length - 1 && { borderBottomWidth: 1, borderBottomColor: divider }]}
                >
                  <ProductImage
                    sku={p.has_image === false ? null : p.sku}
                    version={p.image_version}
                    style={styles.productThumb}
                    colors={{ wash: divider, textMute: sub }}
                    iconSize={20}
                    showLabel={false}
                  />
                  <Text style={[styles.productName, { color: text }]} numberOfLines={2}>
                    {p.name || p.sku}
                  </Text>
                  <Text style={[styles.productQty, { color: sub }]}>×{p.quantity}</Text>
                </View>
              ))
            )}
          </View>
        )}

        {/* Payment */}
        {order && !cancelled ? (
          <View style={[styles.section, { backgroundColor: card }]}>
            <Text style={[styles.sectionTitle, { color: text }]}>Payment</Text>
            {renderFact('Order total', peso(totalCost))}
            {renderFact('Status', order.payment_status || order.payment_method || 'Pending')}
            {renderFact('Balance due', balance > 0 ? peso(balance) : 'Fully paid', balance > 0 ? danger : success)}
            {balance > 0 &&
              renderNote(
                `${peso(balance)} is still outstanding. This needs to be settled before your boxes are sent out — our team will coordinate the payment with you.`
              )}
          </View>
        ) : (
          !order &&
          totalCost != null && (
            <View style={[styles.section, { backgroundColor: card }]}>
              <View style={styles.totalRow}>
                <Text style={[styles.totalLabel, { color: text }]}>Order Total:</Text>
                <Text style={[styles.totalValue, { color: text }]}>{peso(totalCost)}</Text>
              </View>
            </View>
          )
        )}

        {/* Delivery */}
        {showDelivery && (
          <View style={[styles.section, { backgroundColor: card }]}>
            <Text style={[styles.sectionTitle, { color: text }]}>Delivery</Text>
            {renderFact('Method', order.delivery_method || 'Being arranged')}
            {!!order.courier_name && renderFact('Courier', order.courier_name)}
            {!!order.tracking_number && renderFact('Tracking no.', order.tracking_number)}

            {order.tracking_link_available && !!order.tracking_link && (
              <TouchableOpacity
                style={styles.trackLink}
                onPress={() =>
                  Linking.openURL(order.tracking_link).catch(() => Alert.alert('Error', 'Could not open the tracking link.'))
                }
              >
                <Text style={styles.trackLinkText}>Track my delivery →</Text>
              </TouchableOpacity>
            )}

            {!!trackingUnavailable && renderNote(trackingUnavailable)}
            {!!order.delivery_remarks && renderNote(order.delivery_remarks)}

            {!!order.proof_image_url && !proofFailed && (
              <View style={styles.proofBlock}>
                <Text style={[styles.blockLabel, { color: sub }]}>PROOF OF DELIVERY</Text>
                <Image
                  source={{ uri: resolveAsset(order.proof_image_url) }}
                  style={[styles.proofImage, { backgroundColor: divider }]}
                  resizeMode="cover"
                  onError={() => setProofFailed(true)}
                />
              </View>
            )}
          </View>
        )}

        {canConfirmReceipt && (
          <View style={[styles.section, { backgroundColor: card }]}>
            <View style={{ marginTop: -12, marginBottom: 12 }}>
              {renderNote(
                t?.awaitingConfirmation
                  ? 'Our team has marked this order as complete. Tap Order Received once your boxes are with you.'
                  : 'Your order is on its way. Tap Order Received once your boxes are with you.',
                'hand-okay'
              )}
            </View>
            <TouchableOpacity
              style={[styles.receivedButton, { opacity: confirmingReceipt ? 0.6 : 1 }]}
              onPress={confirmReceived}
              disabled={confirmingReceipt}
            >
              <MaterialCommunityIcons name="check-circle-outline" size={20} color="#fff" />
              <Text style={styles.receivedButtonText}>
                {confirmingReceipt ? "Confirming…" : "Order Received"}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  centered: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 15,
    fontFamily: 'serif',
    marginTop: 12,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: '#6B6593',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  section: {
    margin: 16,
    marginBottom: 0,
    padding: 20,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  orderHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    rowGap: 8,
    columnGap: 8,
    marginBottom: 8,
  },
  orderId: {
    flexShrink: 1,
    fontSize: 17,
    fontFamily: 'serif',
    fontWeight: 'bold',
  },
  orderRef: {
    fontSize: 11,
    fontFamily: 'serif',
    marginTop: 2,
  },
  statusBadge: {
    flexShrink: 0,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    color: '#fff',
    fontSize: 11,
    fontFamily: 'serif',
    fontWeight: 'bold',
  },
  orderDate: {
    fontSize: 14,
    fontFamily: 'serif',
  },
  progressBlock: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
  },
  progressTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 10,
  },
  blockLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  percent: {
    fontSize: 28,
    fontFamily: 'serif',
    fontWeight: 'bold',
  },
  etaBlock: {
    alignItems: 'flex-end',
    flexShrink: 1,
    marginLeft: 12,
  },
  etaValue: {
    fontSize: 15,
    fontFamily: 'serif',
    fontWeight: 'bold',
    marginTop: 2,
  },
  etaNote: {
    fontSize: 12,
    fontFamily: 'serif',
    marginTop: 2,
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'serif',
    fontWeight: 'bold',
    marginBottom: 16,
  },
  timeline: {
    paddingLeft: 8,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  timelineIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    marginRight: 16,
  },
  timelineContent: {
    flex: 1,
    paddingTop: 4,
  },
  timelineStatus: {
    fontSize: 14,
    fontFamily: 'serif',
  },
  timelineDescription: {
    fontSize: 12,
    fontFamily: 'serif',
    marginTop: 2,
  },
  timelineLine: {
    position: 'absolute',
    left: 15,
    top: 32,
    width: 2,
    height: 16,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  productThumb: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  productName: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'serif',
    fontWeight: 'bold',
    marginHorizontal: 12,
  },
  productQty: {
    fontSize: 14,
    fontFamily: 'serif',
    fontWeight: 'bold',
  },
  factRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  factLabel: {
    fontSize: 13,
    fontFamily: 'serif',
  },
  factValue: {
    fontSize: 14,
    fontFamily: 'serif',
    fontWeight: 'bold',
    flexShrink: 1,
    textAlign: 'right',
    marginLeft: 12,
  },
  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  noteText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'serif',
    lineHeight: 19,
  },
  trackLink: {
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  trackLinkText: {
    color: '#6B6593',
    fontSize: 14,
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
  proofBlock: {
    marginTop: 16,
  },
  proofImage: {
    width: '100%',
    height: 220,
    borderRadius: 10,
    marginTop: 8,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 16,
    fontFamily: 'serif',
    fontWeight: 'bold',
  },
  totalValue: {
    fontSize: 18,
    fontFamily: 'serif',
    fontWeight: 'bold',
  },
  receivedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    borderRadius: 10,
    paddingVertical: 14,
    gap: 8,
  },
  receivedButtonText: {
    color: '#fff',
    fontSize: 15,
    fontFamily: 'serif',
    fontWeight: 'bold',
  },
});
