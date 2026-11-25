import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Linking,
  RefreshControl,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../Context/ThemeContext';
import { useRoute, useFocusEffect } from '@react-navigation/native';
import { customerAPI } from '../../services/api';
import { Skeleton, SkeletonStatRow } from '../../Components/Skeleton/Skeleton';
import { normalizeStatus, statusTone, formatLongDate, peso } from '../../constants/orderBoard';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'ongoing', label: 'Ongoing' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

const isCancelled = (o) => normalizeStatus(o.status) === 'cancelled';
const isCompleted = (o) => ['completed', 'orderreceived', 'delivered'].includes(normalizeStatus(o.status));

const memberSince = (raw) => {
  if (!raw) return '—';
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-PH', { month: 'short', year: 'numeric' });
};

export default function CustomerDetailScreen({ navigation }) {
  const { colors, darkMode } = useTheme();
  const insets = useSafeAreaInsets();
  const route = useRoute();
  const { customer: initialCustomer } = route.params || {};
  const customerId = initialCustomer?.customer_id;

  const [customer, setCustomer] = useState(initialCustomer || null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [ordersError, setOrdersError] = useState(null);
  const [filter, setFilter] = useState('all');

  const load = useCallback(async () => {
    if (!customerId) return;
    setOrdersError(null);
    // Profile and orders load independently: a failure in one still shows the other.
    const [profileRes, ordersRes] = await Promise.allSettled([
      customerAPI.getCustomer(customerId),
      customerAPI.getCustomerOrders(customerId),
    ]);
    if (profileRes.status === 'fulfilled' && profileRes.value) {
      setCustomer((prev) => ({ ...prev, ...profileRes.value }));
    }
    if (ordersRes.status === 'fulfilled') {
      const { ongoing = [], history = [] } = ordersRes.value || {};
      // An order can exist in both tables while being archived — keep one copy.
      const seen = new Set();
      const merged = [...ongoing, ...history].filter((o) => {
        const id = String(o.order_id);
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      });
      merged.sort((a, b) => new Date(b.order_date || 0) - new Date(a.order_date || 0));
      setOrders(merged);
    } else {
      setOrdersError(ordersRes.reason?.message || "Couldn't load this customer's orders.");
    }
  }, [customerId]);

  // Re-fetch on focus so returning from Edit shows the saved state.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        await load();
        if (active) setLoading(false);
      })();
      return () => { active = false; };
    }, [load])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const stats = useMemo(() => {
    const valid = orders.filter((o) => !isCancelled(o));
    return {
      totalOrders: orders.length,
      // Cancelled orders were never paid for, so they don't count as spend.
      totalSpent: valid.reduce((sum, o) => sum + (Number(o.total_cost) || 0), 0),
      lastOrder: orders[0]?.order_date || null,
    };
  }, [orders]);

  const visibleOrders = useMemo(() => {
    switch (filter) {
      case 'ongoing': return orders.filter((o) => !isCancelled(o) && !isCompleted(o));
      case 'completed': return orders.filter(isCompleted);
      case 'cancelled': return orders.filter(isCancelled);
      default: return orders;
    }
  }, [orders, filter]);

  const phone = customer?.cellphone || customer?.phone_number;
  const email = customer?.email_address;
  const address = customer?.address
    || [customer?.house_street_number, customer?.barangay, customer?.city, customer?.region].filter(Boolean).join(', ');
  const isActive = (customer?.status || 'active') === 'active';

  const handleCall = () => {
    if (!phone) return Alert.alert('No Phone Number', "This customer doesn't have a phone number on file.");
    Linking.openURL(`tel:${phone}`).catch(() =>
      Alert.alert('Unable to Call', "This device can't open the phone dialer.")
    );
  };

  const handleEmail = () => {
    if (!email) return Alert.alert('No Email', "This customer doesn't have an email address on file.");
    Linking.openURL(`mailto:${email}`).catch(() =>
      Alert.alert('Unable to Email', 'No email app is available on this device.')
    );
  };

  const handleEdit = () => navigation.navigate('AddEditCustomer', { customer, mode: 'edit' });

  const handleDelete = () => {
    Alert.alert('Delete Customer', `Delete ${customer.name}? This can't be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await customerAPI.deleteCustomer(customer.customer_id);
            Alert.alert('Customer Deleted', `${customer.name} has been removed.`);
            navigation.goBack();
          } catch (error) {
            Alert.alert('Unable to Delete', error.message);
          }
        },
      },
    ]);
  };

  const openOrder = (order) => {
    // Order details live in the Orders tab's stack.
    navigation.getParent()?.navigate('Orders', {
      screen: 'OrderDetail',
      params: { order },
      initial: false,
    });
  };

  const card = { backgroundColor: colors.card, borderColor: colors.border };
  const text = colors.text;
  const sub = colors.subText;

  if (!customer) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <MaterialCommunityIcons name="account-alert-outline" size={48} color={colors.error} />
        <Text style={[styles.emptyTitle, { color: text }]}>Customer not found</Text>
        <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: colors.primary }]} onPress={() => navigation.goBack()}>
          <Text style={styles.primaryBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const initials = (customer.name || '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8, backgroundColor: colors.primary }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn} accessibilityLabel="Back">
          <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Customer Details</Text>
        <TouchableOpacity onPress={handleEdit} style={styles.iconBtn} accessibilityLabel="Edit customer">
          <MaterialCommunityIcons name="pencil-outline" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
      >
        {/* Profile */}
        <View style={[styles.card, card]}>
          <View style={styles.profileRow}>
            <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={[styles.name, { color: text }]} numberOfLines={2}>{customer.name}</Text>
              <View style={styles.badgeRow}>
                <View style={[styles.statusPill, { backgroundColor: isActive ? '#E8F5E9' : '#FFEBEE' }]}>
                  <View style={[styles.dot, { backgroundColor: isActive ? '#2E7D32' : '#C62828' }]} />
                  <Text style={[styles.statusPillText, { color: isActive ? '#2E7D32' : '#C62828' }]}>
                    {isActive ? 'Active' : 'Inactive'}
                  </Text>
                </View>
                <Text style={[styles.idText, { color: sub }]}>ID #{customer.customer_id}</Text>
              </View>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.divider }]} />

          <InfoRow icon="email-outline" label="Email" value={email} colors={colors} />
          <InfoRow icon="phone-outline" label="Phone" value={phone} colors={colors} />
          <InfoRow icon="map-marker-outline" label="Address" value={address} colors={colors} />

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.contactBtn, { backgroundColor: colors.primaryContainer, opacity: phone ? 1 : 0.5 }]}
              onPress={handleCall}
            >
              <MaterialCommunityIcons name="phone" size={18} color={colors.primary} />
              <Text style={[styles.contactBtnText, { color: darkMode ? '#fff' : colors.primary }]}>Call</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.contactBtn, { backgroundColor: colors.primaryContainer, opacity: email ? 1 : 0.5 }]}
              onPress={handleEmail}
            >
              <MaterialCommunityIcons name="email" size={18} color={colors.primary} />
              <Text style={[styles.contactBtnText, { color: darkMode ? '#fff' : colors.primary }]}>Email</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats */}
        {loading ? (
          <SkeletonStatRow count={3} style={{ marginBottom: 16 }} />
        ) : (
          <View style={styles.statsRow}>
            <StatTile icon="receipt" label="Total Orders" value={String(stats.totalOrders)} tone="#696a8f" colors={colors} />
            <StatTile icon="cash-multiple" label="Total Spent" value={peso(stats.totalSpent)} tone="#2E7D32" colors={colors} />
            <StatTile icon="calendar-account" label="Member Since" value={memberSince(customer.created_at)} tone="#F39C12" colors={colors} />
          </View>
        )}

        {/* Order history */}
        <View style={[styles.card, card]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: text }]}>Order History</Text>
            {stats.lastOrder ? (
              <Text style={[styles.sectionMeta, { color: sub }]}>Last order {formatLongDate(stats.lastOrder)}</Text>
            ) : null}
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
            {FILTERS.map((f) => {
              const selected = filter === f.key;
              return (
                <TouchableOpacity
                  key={f.key}
                  onPress={() => setFilter(f.key)}
                  style={[
                    styles.filterChip,
                    { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.primary : 'transparent' },
                  ]}
                >
                  <Text style={{ color: selected ? '#fff' : sub, fontSize: 13, fontWeight: '600' }}>{f.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {loading ? (
            [0, 1, 2].map((i) => (
              <View key={i} style={styles.orderSkeleton}>
                <Skeleton width="40%" height={14} />
                <Skeleton width="60%" height={12} style={{ marginTop: 8 }} />
              </View>
            ))
          ) : ordersError ? (
            <View style={styles.emptyBox}>
              <MaterialCommunityIcons name="cloud-alert" size={36} color={colors.error} />
              <Text style={[styles.emptyText, { color: sub }]}>{ordersError}</Text>
              <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: colors.primary }]} onPress={onRefresh}>
                <Text style={styles.primaryBtnText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          ) : visibleOrders.length === 0 ? (
            <View style={styles.emptyBox}>
              <MaterialCommunityIcons name="package-variant" size={36} color={sub} />
              <Text style={[styles.emptyText, { color: sub }]}>
                {orders.length === 0 ? "This customer hasn't placed any orders yet." : 'No orders in this category.'}
              </Text>
            </View>
          ) : (
            visibleOrders.map((order, i) => {
              const tone = statusTone(order.status);
              return (
                <TouchableOpacity
                  key={String(order.order_id)}
                  onPress={() => openOrder(order)}
                  activeOpacity={0.7}
                  style={[styles.orderRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider }]}
                >
                  <View style={[styles.orderIcon, { backgroundColor: tone + '22' }]}>
                    <MaterialCommunityIcons name="shopping-outline" size={20} color={tone} />
                  </View>
                  <View style={{ flex: 1, marginHorizontal: 12 }}>
                    <Text style={[styles.orderId, { color: text }]} numberOfLines={1}>{order.order_id}</Text>
                    <Text style={[styles.orderDate, { color: sub }]}>{formatLongDate(order.order_date)}</Text>
                    <View style={[styles.statusTag, { backgroundColor: tone + '1F' }]}>
                      <Text style={[styles.statusTagText, { color: tone }]}>{order.status || 'Unknown'}</Text>
                    </View>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text
                      style={[
                        styles.orderTotal,
                        { color: text },
                        isCancelled(order) && { textDecorationLine: 'line-through', color: sub },
                      ]}
                    >
                      {peso(order.total_cost)}
                    </Text>
                    <MaterialCommunityIcons name="chevron-right" size={20} color={sub} style={{ marginTop: 6 }} />
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        <TouchableOpacity style={[styles.deleteBtn, { borderColor: colors.error }]} onPress={handleDelete}>
          <MaterialCommunityIcons name="trash-can-outline" size={18} color={colors.error} />
          <Text style={[styles.deleteText, { color: colors.error }]}>Delete Customer</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function InfoRow({ icon, label, value, colors }) {
  return (
    <View style={styles.infoRow}>
      <MaterialCommunityIcons name={icon} size={20} color={colors.primary} style={{ marginTop: 2 }} />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={[styles.infoLabel, { color: colors.subText }]}>{label}</Text>
        <Text style={[styles.infoValue, { color: value ? colors.text : colors.subText }]}>
          {value || 'Not provided'}
        </Text>
      </View>
    </View>
  );
}

function StatTile({ icon, label, value, tone, colors }) {
  return (
    <View style={[styles.statTile, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.statIcon, { backgroundColor: tone + '22' }]}>
        <MaterialCommunityIcons name={icon} size={18} color={tone} />
      </View>
      <Text style={[styles.statValue, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={[styles.statLabel, { color: colors.subText }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { justifyContent: 'center', alignItems: 'center', padding: 24 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingBottom: 12,
  },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  topTitle: { flex: 1, color: '#fff', fontSize: 18, fontWeight: '700', textAlign: 'center' },
  card: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    marginBottom: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  profileRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 24, fontWeight: '700' },
  name: { fontSize: 20, fontWeight: '700' },
  badgeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, flexWrap: 'wrap' },
  statusPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12, marginRight: 10 },
  dot: { width: 7, height: 7, borderRadius: 4, marginRight: 6 },
  statusPillText: { fontSize: 12, fontWeight: '700' },
  idText: { fontSize: 12 },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 14 },
  infoRow: { flexDirection: 'row', marginBottom: 12 },
  infoLabel: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 },
  infoValue: { fontSize: 15, marginTop: 2 },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  contactBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 10 },
  contactBtnText: { marginLeft: 6, fontSize: 14, fontWeight: '600' },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statTile: { flex: 1, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, padding: 12, alignItems: 'flex-start' },
  statIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  statValue: { fontSize: 17, fontWeight: '700', alignSelf: 'stretch' },
  statLabel: { fontSize: 11, marginTop: 2 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '700' },
  sectionMeta: { fontSize: 12 },
  filterChip: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 6, marginRight: 8 },
  orderSkeleton: { paddingVertical: 12 },
  orderRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  orderIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  orderId: { fontSize: 15, fontWeight: '700' },
  orderDate: { fontSize: 12, marginTop: 2 },
  statusTag: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, marginTop: 6 },
  statusTagText: { fontSize: 11, fontWeight: '700' },
  orderTotal: { fontSize: 15, fontWeight: '700' },
  emptyBox: { alignItems: 'center', paddingVertical: 24 },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginTop: 12, marginBottom: 16 },
  emptyText: { fontSize: 14, textAlign: 'center', marginTop: 8, marginBottom: 12 },
  primaryBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  primaryBtnText: { color: '#fff', fontWeight: '700' },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
  },
  deleteText: { marginLeft: 6, fontWeight: '700', fontSize: 15 },
});
