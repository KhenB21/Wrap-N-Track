import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Linking,
  Modal,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import { useTheme } from '../../Context/ThemeContext';
import { useAuth } from '../../Context/AuthContext';
import { invoiceAPI, orderAPI } from '../../services/api';
import ProductImage from '../../Components/ProductImage';
import { SkeletonCard, SkeletonText } from '../../Components/Skeleton/Skeleton';
import MarkPaidModal from '../../Components/Invoices/MarkPaidModal';
import EmailInvoiceModal from '../../Components/Invoices/EmailInvoiceModal';
import {
  URGENCY_COLORS,
  boardTabFor,
  deliveryInfoComplete,
  deliveryMeta,
  formatLongDate,
  isCancellable,
  isPickupOrder,
  normalizeStatus,
  orderTotal,
  peso,
  statusTone,
  stockWasDeducted,
} from '../../constants/orderBoard';

/* Mobile version of the Website staff order details (Website/client/src/Pages/OrderDetails/OrderDetails.js):
   customer + order information, what's inside, invoices (generate, mark paid, email, cancel), Edit Order,
   and the same guided actions — Confirm Order -> Confirm Delivery -> Complete Order, with a typed CONFIRM
   and the same gates. */

const INVOICE_ROLES = ['operations_manager', 'sales_manager', 'super_admin', 'admin'];
// Same roles that get the Deliveries tab (navigation/SimpleEmployeeNavigator.js).
const DELIVERY_ROLES = ['operations_manager', 'sales_manager', 'social_media_manager', 'super_admin', 'admin'];

const INVOICE_TYPE_LABELS = {
  DOWN_PAYMENT: 'Down Payment Invoice',
  REMAINING_BALANCE: 'Remaining Balance Invoice',
};
const DOWN_PAYMENT_RATE = 0.7;
const CHALLENGE_TEXT = 'CONFIRM';

const invoiceStatusColor = (status) =>
  status === 'PAID' ? '#2E7D32' : status === 'CANCELLED' ? '#757575' : '#FB8C00';

// The list endpoint names products `name` (with unit_price/profit_margin); the
// single-order endpoint names them `product_name`. Keep whichever details we have.
const mergeProducts = (fresh, previous) => {
  const prevBySku = new Map((previous || []).map((p) => [p.sku, p]));
  const source = fresh && fresh.length ? fresh : previous || [];
  return source.map((p) => {
    const prev = prevBySku.get(p.sku) || {};
    return { ...prev, ...p, name: p.name || p.product_name || prev.name, quantity: Number(p.quantity) || 0 };
  });
};

export default function OrderDetailScreen({ navigation }) {
  const { colors } = useTheme();
  const route = useRoute();
  const { order: initialOrder } = route.params || {};
  const { user } = useAuth();
  const role = user?.role;
  const canDownloadInvoices = INVOICE_ROLES.includes(role);
  const canOpenDelivery = DELIVERY_ROLES.includes(role);

  const [order, setOrder] = useState(
    initialOrder ? { ...initialOrder, products: mergeProducts(initialOrder.products) } : null
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [invoices, setInvoices] = useState([]);
  const [paymentSummary, setPaymentSummary] = useState(null);
  const [invoicesLoaded, setInvoicesLoaded] = useState(false);
  const [invoicesError, setInvoicesError] = useState('');
  const [downloadingId, setDownloadingId] = useState(null);
  const [challenge, setChallenge] = useState(null);
  const [challengeInput, setChallengeInput] = useState('');
  const [working, setWorking] = useState(false);
  const [invoiceBusy, setInvoiceBusy] = useState(false);
  const [paymentInvoice, setPaymentInvoice] = useState(null);
  const [emailInvoice, setEmailInvoice] = useState(null);

  const orderId = initialOrder?.order_id;

  const loadOrder = useCallback(async () => {
    if (!orderId) return;
    try {
      const response = await orderAPI.getOrder(orderId);
      const fresh = response?.order;
      if (fresh) {
        setOrder((prev) => ({
          ...(prev || {}),
          ...fresh,
          // Archived rows come from order_history; keep that flag from the list.
          archived: prev?.archived || fresh.archived,
          products: mergeProducts(fresh.products, prev?.products),
        }));
      }
    } catch (error) {
      console.error('Error fetching order details:', error);
    }
  }, [orderId]);

  const loadInvoices = useCallback(async () => {
    if (!orderId) return;
    try {
      const data = await invoiceAPI.getOrderInvoices(orderId);
      setInvoices(Array.isArray(data) ? data : data?.invoices || []);
      setPaymentSummary(data?.payment_summary || null);
      setInvoicesError('');
    } catch (error) {
      console.error('Error loading invoices:', error);
      setInvoices([]);
      setPaymentSummary(null);
      setInvoicesError("Couldn't load invoices for this order.");
    } finally {
      setInvoicesLoaded(true);
    }
  }, [orderId]);

  // Reload on focus so returning from Edit Order or Delivery Tracking shows the saved values.
  useFocusEffect(
    useCallback(() => {
      Promise.all([loadOrder(), loadInvoices()]).finally(() => setLoading(false));
    }, [loadOrder, loadInvoices])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([loadOrder(), loadInvoices()]);
    } finally {
      setRefreshing(false);
    }
  };

  if (!order) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        {loading ? (
          <View style={{ padding: 16, alignSelf: 'stretch' }}>
            <SkeletonText width="50%" height={20} style={{ marginBottom: 12 }} />
            <SkeletonCard lines={4} />
          </View>
        ) : (
          <>
            <MaterialCommunityIcons name="alert-circle" size={48} color={colors.error} />
            <Text style={[styles.errorText, { color: colors.error }]}>Order not found</Text>
            <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: colors.primary, marginTop: 16 }]} onPress={() => navigation.goBack()}>
              <Text style={styles.primaryBtnText}>Go Back</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    );
  }

  /* ── Derived state (same rules as the Website) ─────────────────────────── */
  const status = normalizeStatus(order.status);
  const isArchived = order.archived === true || boardTabFor(order.status) === 'history';
  const isPendingLike = ['pending', 'orderplaced', 'orderpaid'].includes(status);
  const isToBePacked = ['tobepacked', 'tobepack'].includes(status);
  const isReady = ['readyfordelivery', 'readyfordeliver', 'confirmed'].includes(status);

  const downPaymentInvoice = invoices.find((i) => i.invoice_type === 'DOWN_PAYMENT' && i.status !== 'CANCELLED');
  const remainingBalanceInvoice = invoices.find((i) => i.invoice_type === 'REMAINING_BALANCE' && i.status !== 'CANCELLED');
  const invoicesReady = !!downPaymentInvoice && downPaymentInvoice.status === 'PAID';
  const outstanding = paymentSummary ? Number(paymentSummary.remaining_balance) || 0 : null;
  const awaitingPayment = outstanding !== null && outstanding > 0.004;
  // Fully paid orders can't be cancelled; a paid down payment is kept on cancel
  // (Website/server/services/orderCancellation.js).
  const fullyPaid = paymentSummary?.payment_status === 'Fully Paid';
  const paidSoFar = Number(paymentSummary?.total_verified_payments) || 0;

  const total = orderTotal(order);
  const downPaymentAmount = Math.round(total * DOWN_PAYMENT_RATE * 100) / 100;
  const remainingAmount = Math.max(0, Math.round((total - downPaymentAmount) * 100) / 100);

  const meta = deliveryMeta(order);
  const urgency = URGENCY_COLORS[meta.bucket];
  const tone = statusTone(order.status);
  const products = order.products || [];
  const phone = order.cellphone || order.telephone;
  const address =
    (order.shipping_address && String(order.shipping_address).trim()) ||
    (order.address && String(order.address).trim()) ||
    'Unknown Address';

  let primary = null;
  if (!isArchived) {
    if (isPendingLike) {
      primary = {
        label: 'Confirm Order',
        nextStatus: 'To Be Packed',
        blocked: invoicesLoaded && !invoicesReady,
        reason:
          'Generate the 70% down payment invoice and mark it paid before moving this order to To Be Packed. The 30% balance can be settled later.',
      };
    } else if (isToBePacked) {
      primary = {
        label: 'Confirm Delivery',
        nextStatus: 'Ready for Delivery',
        blocked: !deliveryInfoComplete(order),
        reason: `Delivery tracking info is not filled out yet. Go to Delivery Tracking and set the delivery mode${
          isPickupOrder(order) ? '' : ', courier, and tracking number/link'
        } before confirming.`,
      };
    } else if (isReady) {
      primary = {
        label: awaitingPayment ? `Awaiting ${peso(outstanding)} balance` : 'Complete Order',
        nextStatus: 'Completed',
        blocked: awaitingPayment,
        reason: `${peso(outstanding)} is still unpaid. The remaining 30% must be paid before the items are sent out.`,
      };
    }
  }

  /* ── Actions ───────────────────────────────────────────────────────────── */
  const submitStatus = async (nextStatus, payload, successMessage) => {
    setWorking(true);
    try {
      await orderAPI.updateOrder(order.order_id, payload);
      setChallenge(null);
      Alert.alert('Order updated', successMessage || `Order ${order.order_id} status updated to ${nextStatus}.`, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert(
        'Error',
        `Failed to update order status. ${error.response?.data?.error || error.response?.data?.message || error.message}`
      );
    } finally {
      setWorking(false);
    }
  };

  // Same lightweight product payload the Website sends with a status change.
  const loadPayloadProducts = async () => {
    try {
      const response = await orderAPI.getOrderProducts(order.order_id);
      return (response?.products || []).map((p) => ({
        sku: p.sku,
        quantity: Number(p.quantity),
        name: p.name,
        profit_margin: p.profit_margin,
      }));
    } catch (error) {
      console.error('Error loading order products:', error);
      Alert.alert('Error', "Could not load this order's products. Please try again.");
      return null;
    }
  };

  const handlePrimary = async () => {
    if (!primary || working) return;
    if (!invoicesLoaded && isPendingLike) return;
    if (primary.blocked) {
      Alert.alert(primary.label, primary.reason);
      return;
    }

    if (primary.nextStatus === 'Completed') {
      Alert.alert('Complete Order', 'Mark this order as Completed? It will move to Order History.', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          onPress: () => submitStatus('Completed', { status: 'Completed' }, 'Order completed and moved to Order History.'),
        },
      ]);
      return;
    }

    setWorking(true);
    const payloadProducts = await loadPayloadProducts();
    setWorking(false);
    if (!payloadProducts) return;

    let payload = { products: payloadProducts };
    let message;
    if (primary.nextStatus === 'Ready for Delivery') {
      payload.status = 'Ready for Delivery';
      message = 'This order will be marked as Ready for Delivery. Proceed?';
    } else {
      message =
        'Are you sure you want to confirm this order? This will finalize the details and prepare it for processing.';
      payload = {
        ...payload,
        account_name: order.account_name,
        name: order.name,
        order_date: order.order_date,
        expected_delivery: order.expected_delivery,
        status: 'To Be Packed',
        package_name: order.package_name,
        payment_method: order.payment_method,
        payment_type: order.payment_type,
        shipped_to: order.shipped_to,
        shipping_address: order.shipping_address,
        remarks: order.remarks,
        telephone: order.telephone,
        cellphone: order.cellphone,
        email_address: order.email_address,
        order_quantity: order.order_quantity,
      };
    }

    setChallengeInput('');
    setChallenge({
      title: primary.nextStatus === 'To Be Packed' ? 'Confirm Order' : 'Confirm Delivery',
      message,
      nextStatus: primary.nextStatus,
      payload,
    });
  };

  const confirmChallenge = () => {
    if (!challenge) return;
    if (challengeInput.trim().toUpperCase() !== CHALLENGE_TEXT) {
      Alert.alert('Confirmation required', `Please type ${CHALLENGE_TEXT} to continue.`);
      return;
    }
    submitStatus(challenge.nextStatus, challenge.payload);
  };

  const handleCancelOrder = () => {
    if (!isCancellable(order.status)) {
      Alert.alert('Cannot cancel', `An order that is "${order.status}" can no longer be cancelled — it has already left.`);
      return;
    }
    if (fullyPaid) {
      Alert.alert('Cannot cancel', 'This order is already paid in full and can no longer be cancelled. Only unpaid or partially paid orders can be cancelled.');
      return;
    }
    const restock = stockWasDeducted(order.status);
    Alert.alert(
      'Cancel Order',
      `Are you sure you want to cancel order ${order.order_id}?` +
        (restock ? ' Its products will be returned to inventory.' : ' No inventory change — this order had not been packed yet.') +
        (paidSoFar > 0 ? ` The ${peso(paidSoFar)} down payment is non-refundable — it will be kept and recorded as revenue from a cancelled order.` : '') +
        ' Any unpaid invoices will be voided.',
      [
        { text: 'Keep Order', style: 'cancel' },
        {
          text: 'Cancel Order',
          style: 'destructive',
          onPress: async () => {
            setWorking(true);
            try {
              const result = await orderAPI.cancelOrder(order.order_id);
              const retained = Number(result?.retained_deposit ?? result?.data?.retained_deposit) || 0;
              Alert.alert(
                'Order cancelled',
                `Order ${order.order_id} cancelled successfully.${restock ? ' Products have been restocked.' : ''}` +
                  (retained > 0 ? ` The ${peso(retained)} down payment was kept as revenue from a cancelled order.` : ''),
                [{ text: 'OK', onPress: () => navigation.goBack() }]
              );
            } catch (error) {
              Alert.alert('Error', `Failed to cancel order. ${error.response?.data?.message || 'Please try again.'}`);
            } finally {
              setWorking(false);
            }
          },
        },
      ]
    );
  };

  const openDeliveryTracking = () => {
    navigation.navigate('Deliveries', { screen: 'EmployeeDeliveryUpdate', params: { orderId: order.order_id } });
  };

  const downloadInvoice = async (invoice) => {
    setDownloadingId(invoice.id);
    try {
      const label = INVOICE_TYPE_LABELS[invoice.invoice_type] || invoice.invoice_type;
      await invoiceAPI.downloadInvoicePdf(invoice.id, `${label} - ${invoice.invoice_number}`);
    } catch (error) {
      console.error('Error downloading invoice:', error);
      Alert.alert('Error', 'Failed to download invoice PDF. Please try again.');
    } finally {
      setDownloadingId(null);
    }
  };

  const generateInvoice = async (type) => {
    setInvoiceBusy(true);
    try {
      const result =
        type === 'DOWN_PAYMENT'
          ? await invoiceAPI.generateDownPayment(order.order_id)
          : await invoiceAPI.generateRemainingBalance(order.order_id);
      await loadInvoices();
      Alert.alert('Invoice ready', result?.existing ? 'This invoice already exists.' : `${INVOICE_TYPE_LABELS[type]} generated.`);
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to generate invoice.');
    } finally {
      setInvoiceBusy(false);
    }
  };

  const confirmGenerateDownPayment = () => {
    if (total <= 0) {
      Alert.alert('Order total required', 'This order needs a total before an invoice can be generated.');
      return;
    }
    Alert.alert(
      'Generate Down Payment Invoice',
      `Order total: ${peso(total)}\nDown payment (70%): ${peso(downPaymentAmount)}\nRemaining balance (30%): ${peso(remainingAmount)}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Generate', onPress: () => generateInvoice('DOWN_PAYMENT') },
      ]
    );
  };

  const handleGenerateRemaining = () => {
    if (!downPaymentInvoice || downPaymentInvoice.status !== 'PAID') {
      Alert.alert('Down payment unpaid', 'Mark the down payment invoice as paid before generating the remaining balance invoice.');
      return;
    }
    generateInvoice('REMAINING_BALANCE');
  };

  const handleCancelInvoice = (invoice) => {
    Alert.alert('Cancel invoice', `Cancel invoice ${invoice.invoice_number}?`, [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Cancel Invoice',
        style: 'destructive',
        onPress: async () => {
          setInvoiceBusy(true);
          try {
            await invoiceAPI.cancelInvoice(invoice.id);
            await loadInvoices();
          } catch (error) {
            Alert.alert('Error', error.response?.data?.message || 'Failed to cancel invoice.');
          } finally {
            setInvoiceBusy(false);
          }
        },
      },
    ]);
  };

  const openLink = (url, failMessage) => {
    Linking.openURL(url).catch(() => Alert.alert('Error', failMessage));
  };

  /* ── Render helpers ────────────────────────────────────────────────────── */
  const Section = ({ title, badge, children }) => (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.sectionHead}>
        <Text style={[styles.sectionTitle, { color: colors.primary }]}>{title}</Text>
        {!!badge && (
          <View style={[styles.countBadge, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
            <Text style={[styles.countBadgeText, { color: colors.subText }]}>{badge}</Text>
          </View>
        )}
      </View>
      {children}
    </View>
  );

  const Field = ({ label, value, muted, onPress, icon }) => (
    <TouchableOpacity style={styles.field} disabled={!onPress} onPress={onPress} activeOpacity={0.7}>
      <Text style={[styles.fieldLabel, { color: colors.subText }]}>{label}</Text>
      <View style={styles.fieldValueRow}>
        <Text style={[styles.fieldValue, { color: muted ? colors.subText : onPress ? colors.primary : colors.text }]}>
          {value}
        </Text>
        {!!icon && <MaterialCommunityIcons name={icon} size={16} color={colors.primary} />}
      </View>
    </TouchableOpacity>
  );

  const Stat = ({ label, value, color }) => (
    <View style={styles.stat}>
      <Text style={[styles.statLabel, { color: colors.subText }]}>{label}</Text>
      <Text style={[styles.statValue, { color: color || colors.text }]}>{value}</Text>
    </View>
  );

  const showBottomBar = !isArchived;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.headRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: colors.text }]}>Order Details</Text>
              <Text style={[styles.orderId, { color: colors.subText }]}>{order.order_id}</Text>
            </View>
            <View style={[styles.statusPill, { backgroundColor: `${tone}1F` }]}>
              <Text style={[styles.statusPillText, { color: tone }]}>{(order.status || '-').toUpperCase()}</Text>
            </View>
          </View>
          {!isArchived && (
            <View style={[styles.dueRow, { borderTopColor: colors.border }]}>
              <MaterialCommunityIcons name="calendar-clock" size={18} color={urgency} />
              <Text style={[styles.dueText, { color: colors.text }]}>{meta.full}</Text>
              <View style={[styles.dueChip, { backgroundColor: `${urgency}1F` }]}>
                <Text style={[styles.dueChipText, { color: urgency }]}>{meta.chip}</Text>
              </View>
            </View>
          )}
        </View>

        {!!primary?.blocked && (
          <View style={[styles.notice, { backgroundColor: '#FFF4E0' }]}>
            <MaterialCommunityIcons name="information-outline" size={18} color="#B26A00" />
            <Text style={styles.noticeText}>{primary.reason}</Text>
          </View>
        )}

        {/* ── Customer ───────────────────────────────────────────────────── */}
        <Section title="CUSTOMER INFORMATION">
          <Field label="Name" value={order.name || order.customer_name || '-'} />
          <Field
            label="Contact Number"
            value={phone || '-'}
            icon={phone ? 'phone' : null}
            onPress={phone ? () => openLink(`tel:${phone}`, 'Unable to open the phone dialer on this device') : null}
          />
          <Field
            label="Email Address"
            value={order.email_address || '-'}
            icon={order.email_address ? 'email-outline' : null}
            onPress={order.email_address ? () => openLink(`mailto:${order.email_address}`, 'No email app is available on this device') : null}
          />
        </Section>

        {/* ── Order ──────────────────────────────────────────────────────── */}
        <Section title="ORDER INFORMATION">
          <View style={styles.fieldGrid}>
            <View style={styles.fieldHalf}>
              <Field label="Total Number of Boxes" value={String(order.order_quantity ?? order.total_boxes ?? '-')} />
            </View>
            <View style={styles.fieldHalf}>
              <Field label="Order Total" value={peso(total)} />
            </View>
            <View style={styles.fieldHalf}>
              <Field label="Date of Event" value={formatLongDate(order.expected_delivery)} />
            </View>
            <View style={styles.fieldHalf}>
              <Field label="Date Ordered" value={formatLongDate(order.order_date)} />
            </View>
          </View>
          {!!order.package_name && <Field label="Package / Styling" value={order.package_name} />}
          {!!order.shipped_to && <Field label="Receiver" value={order.shipped_to} />}
          <Field label="Shipping Location" value={address} muted={address === 'Unknown Address'} />
          {!!order.remarks && <Field label="Remarks" value={order.remarks} />}
        </Section>

        {/* ── What's inside ──────────────────────────────────────────────── */}
        <Section title="WHAT'S INSIDE" badge={products.length ? `${products.length} item${products.length === 1 ? '' : 's'}` : null}>
          {products.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.subText }]}>No products added to this order yet.</Text>
          ) : (
            products.map((p, i) => (
              <View key={`${p.sku}-${i}`} style={[styles.productRow, { borderColor: colors.border }]}>
                <ProductImage
                  sku={p.sku}
                  style={styles.productThumb}
                  colors={{ wash: colors.inputBackground, textMute: colors.subText }}
                  iconSize={20}
                  showLabel={false}
                />
                <View style={styles.productInfo}>
                  <Text style={[styles.productName, { color: colors.text }]} numberOfLines={2}>
                    {p.name || p.sku}
                  </Text>
                  <View style={[styles.qtyChip, { backgroundColor: colors.primaryContainer }]}>
                    <Text style={[styles.qtyChipText, { color: colors.primary }]}>QTY {p.quantity}</Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </Section>

        {/* ── Payment & invoices ─────────────────────────────────────────── */}
        <Section title="PAYMENT & INVOICES">
          {total > 0 && (
            <Text style={[styles.splitNote, { color: colors.subText }]}>
              Required split: 70% down payment ({peso(downPaymentAmount)}) and 30% remaining balance ({peso(remainingAmount)}).
            </Text>
          )}
          {!!paymentSummary && (
            <View style={[styles.statGrid, { borderColor: colors.border }]}>
              <Stat label="Total Paid" value={peso(paymentSummary.total_verified_payments)} />
              <Stat
                label="Remaining Balance"
                value={peso(paymentSummary.remaining_balance)}
                color={awaitingPayment ? '#C62828' : '#2E7D32'}
              />
              <Stat label="Payment Status" value={paymentSummary.payment_status || '-'} />
            </View>
          )}
          {!invoicesLoaded ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: 12 }} />
          ) : invoicesError ? (
            <Text style={[styles.emptyText, { color: colors.error }]}>{invoicesError}</Text>
          ) : invoices.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.subText }]}>
              No invoices generated for this order yet.
            </Text>
          ) : (
            invoices.map((invoice) => {
              const badgeColor = invoiceStatusColor(invoice.status);
              return (
                <View key={invoice.id} style={[styles.invoiceRow, { borderColor: colors.border }]}>
                  <View style={styles.invoiceTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.invoiceNumber, { color: colors.text }]}>{invoice.invoice_number}</Text>
                      <Text style={[styles.invoiceType, { color: colors.subText }]}>
                        {INVOICE_TYPE_LABELS[invoice.invoice_type] || invoice.invoice_type}
                      </Text>
                    </View>
                    <View style={[styles.invoiceBadge, { backgroundColor: `${badgeColor}1F` }]}>
                      <Text style={[styles.invoiceBadgeText, { color: badgeColor }]}>{invoice.status || 'UNPAID'}</Text>
                    </View>
                  </View>
                  <View style={styles.invoiceStats}>
                    <Stat label="Invoice Amount" value={peso(invoice.invoice_amount)} />
                    <Stat label="Amount Paid" value={peso(invoice.amount_paid)} />
                    <Stat label="Remaining" value={peso(invoice.remaining_balance_amount)} />
                    <Stat label="Payment Status" value={invoice.payment_status || '-'} />
                  </View>
                  {canDownloadInvoices && (
                    <View style={styles.invoiceActions}>
                      <TouchableOpacity
                        style={[styles.smallBtn, { borderColor: colors.primary }]}
                        onPress={() => downloadInvoice(invoice)}
                        disabled={downloadingId === invoice.id}
                      >
                        {downloadingId === invoice.id ? (
                          <ActivityIndicator size="small" color={colors.primary} />
                        ) : (
                          <>
                            <MaterialCommunityIcons name="file-download-outline" size={15} color={colors.primary} />
                            <Text style={[styles.smallBtnText, { color: colors.primary }]}>PDF</Text>
                          </>
                        )}
                      </TouchableOpacity>
                      {invoice.status !== 'PAID' && invoice.status !== 'CANCELLED' && !isArchived && (
                        <TouchableOpacity
                          style={[styles.smallBtn, { borderColor: '#2E7D32', backgroundColor: '#2E7D32' }]}
                          onPress={() => setPaymentInvoice(invoice)}
                          disabled={invoiceBusy}
                        >
                          <MaterialCommunityIcons name="cash-check" size={15} color="#fff" />
                          <Text style={[styles.smallBtnText, { color: '#fff' }]}>Mark as Paid</Text>
                        </TouchableOpacity>
                      )}
                      {invoice.status === 'PAID' && (
                        <TouchableOpacity style={[styles.smallBtn, { borderColor: colors.primary }]} onPress={() => setEmailInvoice(invoice)}>
                          <MaterialCommunityIcons name="email-outline" size={15} color={colors.primary} />
                          <Text style={[styles.smallBtnText, { color: colors.primary }]}>Email</Text>
                        </TouchableOpacity>
                      )}
                      {invoice.status !== 'CANCELLED' && !isArchived && (
                        <TouchableOpacity
                          style={[styles.smallBtn, { borderColor: '#C62828' }]}
                          onPress={() => handleCancelInvoice(invoice)}
                          disabled={invoiceBusy}
                        >
                          <MaterialCommunityIcons name="close-circle-outline" size={15} color="#C62828" />
                          <Text style={[styles.smallBtnText, { color: '#C62828' }]}>Cancel</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </View>
              );
            })
          )}
          {canDownloadInvoices && !isArchived && invoicesLoaded && !invoicesError && (!downPaymentInvoice || !remainingBalanceInvoice) && (
            <View style={styles.invoiceGenerate}>
              {!downPaymentInvoice ? (
                <TouchableOpacity
                  style={[styles.primaryBtn, { backgroundColor: colors.primary }, (invoiceBusy || total <= 0) && { opacity: 0.6 }]}
                  onPress={confirmGenerateDownPayment}
                  disabled={invoiceBusy}
                >
                  {invoiceBusy ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <MaterialCommunityIcons name="file-document-plus-outline" size={18} color="#fff" />
                      <Text style={styles.primaryBtnText}>Generate Down Payment Invoice</Text>
                    </>
                  )}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.primaryBtn,
                    { backgroundColor: colors.primary },
                    (invoiceBusy || downPaymentInvoice.status !== 'PAID') && { opacity: 0.6 },
                  ]}
                  onPress={handleGenerateRemaining}
                  disabled={invoiceBusy}
                >
                  {invoiceBusy ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <MaterialCommunityIcons name="file-document-plus-outline" size={18} color="#fff" />
                      <Text style={styles.primaryBtnText}>Generate Remaining Balance Invoice</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          )}
          {!canDownloadInvoices && !isArchived && invoices.length === 0 && invoicesLoaded && (
            <Text style={[styles.emptyText, { color: colors.subText }]}>
              Ask an Operations Manager, Sales Manager or Admin to generate the invoice.
            </Text>
          )}
        </Section>

        {/* ── Delivery ───────────────────────────────────────────────────── */}
        <Section title="DELIVERY">
          <View style={styles.fieldGrid}>
            <View style={styles.fieldHalf}>
              <Field label="Delivery Status" value={order.delivery_status || 'Pending'} />
            </View>
            <View style={styles.fieldHalf}>
              <Field label="Method" value={order.delivery_method || 'Not set'} muted={!order.delivery_method} />
            </View>
            {!!order.courier_name && (
              <View style={styles.fieldHalf}>
                <Field label="Courier" value={order.courier_name} />
              </View>
            )}
            {!!order.tracking_number && (
              <View style={styles.fieldHalf}>
                <Field label="Tracking No." value={order.tracking_number} />
              </View>
            )}
          </View>
          {order.tracking_link_available && !!order.tracking_link && (
            <Field
              label="Tracking Link"
              value="Open tracking link"
              icon="open-in-new"
              onPress={() => openLink(order.tracking_link, 'Could not open the tracking link.')}
            />
          )}
          {!!order.delivery_remarks && <Field label="Delivery Remarks" value={order.delivery_remarks} />}
        </Section>
      </ScrollView>

      {/* ── Actions ──────────────────────────────────────────────────────── */}
      {showBottomBar && (
        <View style={[styles.bottomBar, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
          <View style={styles.secondaryRow}>
            <TouchableOpacity
              style={[styles.outlineBtn, styles.flex1, { borderColor: colors.primary }]}
              onPress={() => navigation.navigate('EditOrder', { order })}
              disabled={working}
            >
              <MaterialCommunityIcons name="pencil-outline" size={16} color={colors.primary} />
              <Text style={[styles.outlineBtnText, { color: colors.primary }]}>Edit</Text>
            </TouchableOpacity>
            {isCancellable(order.status) && !fullyPaid && (
              <TouchableOpacity style={[styles.outlineBtn, styles.flex1, { borderColor: '#C62828' }]} onPress={handleCancelOrder} disabled={working}>
                <MaterialCommunityIcons name="close-circle-outline" size={16} color="#C62828" />
                <Text style={[styles.outlineBtnText, { color: '#C62828' }]}>Cancel Order</Text>
              </TouchableOpacity>
            )}
            {canOpenDelivery && (
              <TouchableOpacity style={[styles.outlineBtn, styles.flex1, { borderColor: colors.primary }]} onPress={openDeliveryTracking} disabled={working}>
                <MaterialCommunityIcons name="truck-delivery-outline" size={16} color={colors.primary} />
                <Text style={[styles.outlineBtnText, { color: colors.primary }]}>Delivery Tracking</Text>
              </TouchableOpacity>
            )}
          </View>
          {!!primary && (
            <TouchableOpacity
              style={[
                styles.primaryBtn,
                { backgroundColor: primary.blocked ? '#A5D6B7' : '#2E7D32' },
                (working || (!invoicesLoaded && isPendingLike)) && { opacity: 0.6 },
              ]}
              onPress={handlePrimary}
              disabled={working}
            >
              {working ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <MaterialCommunityIcons name={primary.blocked ? 'lock-outline' : 'check-circle-outline'} size={18} color="#fff" />
                  <Text style={styles.primaryBtnText}>{primary.label}</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      )}

      {!!paymentInvoice && (
        <MarkPaidModal
          invoice={paymentInvoice}
          colors={colors}
          onClose={() => setPaymentInvoice(null)}
          onSaved={async () => {
            setPaymentInvoice(null);
            await loadInvoices();
            Alert.alert('Payment saved', 'The invoice is now marked as paid.');
          }}
        />
      )}
      {!!emailInvoice && (
        <EmailInvoiceModal
          invoice={emailInvoice}
          recipientEmail={order.email_address}
          colors={colors}
          onClose={() => setEmailInvoice(null)}
        />
      )}

      {/* ── Typed CONFIRM, same as the Website ─────────────────────────────── */}
      <Modal visible={!!challenge} transparent animationType="fade" onRequestClose={() => !working && setChallenge(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{challenge?.title}</Text>
            <Text style={[styles.modalMessage, { color: colors.subText }]}>{challenge?.message}</Text>
            <Text style={[styles.modalPrompt, { color: colors.text }]}>
              Type <Text style={styles.bold}>{CHALLENGE_TEXT}</Text> to continue.
            </Text>
            <TextInput
              style={[styles.modalInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBackground }]}
              value={challengeInput}
              onChangeText={setChallengeInput}
              placeholder={CHALLENGE_TEXT}
              placeholderTextColor={colors.placeholder}
              autoCapitalize="characters"
              autoCorrect={false}
              autoFocus
            />
            <Text style={[styles.modalMeta, { color: colors.subText }]}>
              Order ID: {order.order_id} | New status: {challenge?.nextStatus}
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.outlineBtn, styles.flex1, { borderColor: colors.border }]}
                onPress={() => setChallenge(null)}
                disabled={working}
              >
                <Text style={[styles.outlineBtnText, { color: colors.subText }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.primaryBtn,
                  styles.flex1,
                  { backgroundColor: challengeInput.trim().toUpperCase() === CHALLENGE_TEXT ? '#1F9D55' : '#94A3B8' },
                ]}
                onPress={confirmChallenge}
                disabled={working || challengeInput.trim().toUpperCase() !== CHALLENGE_TEXT}
              >
                {working ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Confirm</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  headRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' }),
  },
  orderId: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  dueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  dueText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  dueChip: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  dueChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  noticeText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: '#8A5300',
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  countBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  field: {
    paddingVertical: 7,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  fieldValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  fieldValue: {
    flexShrink: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  fieldGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  fieldHalf: {
    width: '50%',
    paddingRight: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 10,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  productThumb: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  productInfo: {
    flex: 1,
    marginLeft: 12,
  },
  productName: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  qtyChip: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  qtyChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  splitNote: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 10,
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 12,
  },
  stat: {
    width: '50%',
    paddingVertical: 6,
    paddingRight: 8,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  invoiceRow: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  invoiceTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  invoiceNumber: {
    fontSize: 15,
    fontWeight: '700',
  },
  invoiceType: {
    fontSize: 12,
    marginTop: 2,
  },
  invoiceBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  invoiceBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  invoiceStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  invoiceActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  smallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1.5,
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 10,
  },
  smallBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  invoiceGenerate: {
    marginTop: 6,
    gap: 8,
  },
  bottomBar: {
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 26 : 12,
    gap: 8,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  secondaryRow: {
    flexDirection: 'row',
    gap: 8,
  },
  flex1: {
    flex: 1,
  },
  outlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 4,
  },
  outlineBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 10,
    paddingVertical: 13,
    paddingHorizontal: 16,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    borderRadius: 14,
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalMessage: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
  },
  modalPrompt: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 14,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 2,
    marginTop: 8,
  },
  modalMeta: {
    fontSize: 12,
    marginTop: 10,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  bold: {
    fontWeight: '700',
  },
});
