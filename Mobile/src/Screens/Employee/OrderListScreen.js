import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  TextInput,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../../Context/ThemeContext';
import { useOrders } from '../../Context/OrdersContext';
import { orderAPI } from '../../services/api';
import { SkeletonCard } from '../../Components/Skeleton/Skeleton';
import {
  BOARD_TABS,
  WINDOWS,
  URGENCY_COLORS,
  boardTabFor,
  byDelivery,
  deliveryMeta,
  formatLongDate,
  inWindow,
  orderTotal,
  peso,
  statusTone,
} from '../../constants/orderBoard';

/* Mobile version of the Website staff Orders board (Website/client/src/Pages/OrderDetails/OrderBoard.js):
   Pending / To Be Packed / Ready for Delivery as tabs, ordered by delivery date, with the same
   delivery-window filters — plus a History tab for completed and cancelled orders. */

export default function OrderListScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const { orders, loading, error, loadOrders } = useOrders();

  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('pending');
  const [windowKey, setWindowKey] = useState('all');
  const [direction, setDirection] = useState('asc'); // asc = soonest first

  const [archived, setArchived] = useState(null);
  const [archivedLoading, setArchivedLoading] = useState(false);
  const [archivedNote, setArchivedNote] = useState('');

  // Dashboard deep links: { tab: 'pending' | 'toBePacked' | 'ready' | 'history' }
  // or { status: 'To Be Packed' } (pipeline stage) opens the matching tab.
  const route = useRoute();
  const deepTab = route.params?.tab || (route.params?.status ? boardTabFor(route.params.status) : null);
  useEffect(() => {
    if (deepTab && BOARD_TABS.some((t) => t.key === deepTab)) setActiveTab(deepTab);
  }, [deepTab]);

  const isHistory = activeTab === 'history';

  // Reload whenever the screen comes back into view, e.g. after confirming or cancelling an order.
  useFocusEffect(
    useCallback(() => {
      loadOrders();
    }, [loadOrders])
  );

  const loadArchived = useCallback(async () => {
    setArchivedLoading(true);
    setArchivedNote('');
    try {
      const data = await orderAPI.getArchivedOrders({ limit: 100 });
      setArchived(Array.isArray(data) ? data : data?.orders || []);
    } catch (err) {
      setArchived([]);
      setArchivedNote(
        err.response?.status === 403
          ? 'Completed orders are not available for your role — showing cancelled orders only.'
          : "Couldn't load completed orders. Pull down to retry."
      );
    } finally {
      setArchivedLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isHistory && archived === null && !archivedLoading) loadArchived();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHistory]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([loadOrders(), isHistory ? loadArchived() : null]);
    } finally {
      setRefreshing(false);
    }
  };

  const matchesSearch = useCallback(
    (order) => {
      const q = searchQuery.trim().toLowerCase();
      if (!q) return true;
      return [order.name, order.customer_name, order.order_id, order.email_address, order.cellphone, order.shipped_to]
        .some((value) => String(value || '').toLowerCase().includes(q));
    },
    [searchQuery]
  );

  const buckets = useMemo(() => {
    const result = { pending: [], toBePacked: [], ready: [], history: [] };
    (orders || []).forEach((order) => {
      const key = boardTabFor(order.status);
      if (key && matchesSearch(order)) result[key].push(order);
    });

    // Completed orders live in order_history; cancelled ones stay in the orders table.
    const seen = new Set(result.history.map((o) => String(o.order_id)));
    (archived || []).forEach((order) => {
      if (!seen.has(String(order.order_id)) && matchesSearch(order)) {
        seen.add(String(order.order_id));
        result.history.push({ ...order, archived: true });
      }
    });
    result.history.sort((a, b) => new Date(b.order_date || 0) - new Date(a.order_date || 0));
    return result;
  }, [orders, archived, matchesSearch]);

  // Window counts come from every active column combined, so switching tabs never hides an overdue order.
  const activeOrders = useMemo(() => [...buckets.pending, ...buckets.toBePacked, ...buckets.ready], [buckets]);
  const windowCounts = useMemo(
    () => WINDOWS.reduce((acc, w) => ({ ...acc, [w.key]: activeOrders.filter((o) => inWindow(o, w.key)).length }), {}),
    [activeOrders]
  );
  const overdueCount = windowCounts.overdue || 0;

  const columnFor = useCallback(
    (key) => buckets[key].filter((o) => inWindow(o, windowKey)).slice().sort(byDelivery(direction)),
    [buckets, windowKey, direction]
  );

  const shown = useMemo(() => (isHistory ? buckets.history : columnFor(activeTab)), [isHistory, buckets, columnFor, activeTab]);
  const next = !isHistory && shown.length ? deliveryMeta(shown[0]) : null;

  const tabCount = (key) => (key === 'history' ? buckets.history.length : columnFor(key).length);

  const emptyHint = searchQuery
    ? 'No orders match your search'
    : isHistory
    ? 'No completed or cancelled orders yet'
    : windowKey === 'all'
    ? 'Nothing here right now'
    : 'Nothing in this delivery window';

  const renderCard = ({ item }) => {
    const meta = deliveryMeta(item);
    const urgency = URGENCY_COLORS[meta.bucket];
    const tone = isHistory ? statusTone(item.status) : urgency;
    const boxes = Number(item.order_quantity ?? item.total_boxes ?? 0);
    const itemCount = (item.products || []).length;

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderLeftColor: tone }]}
        onPress={() => navigation.navigate('OrderDetail', { order: item })}
      >
        <View style={styles.cardTop}>
          <Text style={[styles.cardName, { color: colors.text }]} numberOfLines={1}>
            {item.name || item.customer_name || 'Unnamed order'}
          </Text>
          <View style={[styles.chip, { backgroundColor: `${tone}1F` }]}>
            <Text style={[styles.chipText, { color: tone }]}>{isHistory ? item.status : meta.chip}</Text>
          </View>
        </View>

        <Text style={[styles.cardId, { color: colors.subText }]}>{item.order_id}</Text>

        <View style={styles.cardFoot}>
          <View style={styles.footItems}>
            <View style={styles.footItem}>
              <MaterialCommunityIcons name="calendar-blank-outline" size={14} color={colors.subText} />
              <Text style={[styles.footText, { color: colors.subText }]}>
                {isHistory ? formatLongDate(item.order_date) : meta.full}
              </Text>
            </View>
            {boxes > 0 && (
              <View style={styles.footItem}>
                <MaterialCommunityIcons name="package-variant-closed" size={14} color={colors.subText} />
                <Text style={[styles.footText, { color: colors.subText }]}>
                  {boxes} box{boxes === 1 ? '' : 'es'}
                </Text>
              </View>
            )}
            {itemCount > 0 && (
              <View style={styles.footItem}>
                <MaterialCommunityIcons name="gift-outline" size={14} color={colors.subText} />
                <Text style={[styles.footText, { color: colors.subText }]}>
                  {itemCount} item{itemCount === 1 ? '' : 's'}
                </Text>
              </View>
            )}
          </View>
          <Text style={[styles.cardTotal, { color: colors.text }]}>{peso(orderTotal(item))}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const listLoading = isHistory ? archivedLoading && shown.length === 0 : loading && (orders || []).length === 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ── Search + sort ────────────────────────────────────────────────── */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={styles.searchRow}>
          <View style={[styles.searchBox, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
            <MaterialCommunityIcons name="magnify" size={20} color={colors.subText} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search name, order ID, email…"
              placeholderTextColor={colors.placeholder}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {!!searchQuery && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <MaterialCommunityIcons name="close-circle" size={18} color={colors.subText} />
              </TouchableOpacity>
            )}
          </View>
          {!isHistory && (
            <TouchableOpacity
              style={[styles.sortBtn, { borderColor: colors.border }]}
              onPress={() => setDirection((d) => (d === 'asc' ? 'desc' : 'asc'))}
            >
              <MaterialCommunityIcons name="swap-vertical" size={18} color={colors.primary} />
              <Text style={[styles.sortText, { color: colors.primary }]}>{direction === 'asc' ? 'Soonest' : 'Latest'}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Status tabs ────────────────────────────────────────────────── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabRow}>
          {BOARD_TABS.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                style={[
                  styles.tab,
                  { borderColor: active ? tab.tone : colors.border, backgroundColor: active ? tab.tone : colors.card },
                ]}
              >
                <View style={[styles.tabDot, { backgroundColor: active ? '#fff' : tab.tone }]} />
                <Text style={[styles.tabText, { color: active ? '#fff' : colors.text }]}>{tab.label}</Text>
                <View style={[styles.tabCount, { backgroundColor: active ? 'rgba(255,255,255,0.25)' : colors.inputBackground }]}>
                  <Text style={[styles.tabCountText, { color: active ? '#fff' : colors.subText }]}>
                    {tab.key === 'history' && archived === null ? '…' : tabCount(tab.key)}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ── Delivery-window filters ────────────────────────────────────── */}
        {!isHistory && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.windowRow}>
            {WINDOWS.map((w) => {
              const active = windowKey === w.key;
              const alert = w.key === 'overdue' && overdueCount > 0;
              const accent = alert ? URGENCY_COLORS.overdue : colors.primary;
              return (
                <TouchableOpacity
                  key={w.key}
                  onPress={() => setWindowKey(w.key)}
                  style={[
                    styles.windowChip,
                    { borderColor: active || alert ? accent : colors.border, backgroundColor: active ? accent : 'transparent' },
                  ]}
                >
                  <Text style={[styles.windowText, { color: active ? '#fff' : alert ? accent : colors.subText }]}>
                    {w.label} {windowCounts[w.key] ?? 0}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </View>

      {/* ── Context line ─────────────────────────────────────────────────── */}
      <View style={styles.noteRow}>
        <Text style={[styles.noteText, { color: colors.subText }]}>
          {isHistory
            ? `${shown.length} finished order${shown.length === 1 ? '' : 's'}, newest first.`
            : `Showing ${shown.length} order${shown.length === 1 ? '' : 's'}, ordered by delivery date.`}
        </Text>
        {!isHistory && overdueCount > 0 && windowKey !== 'overdue' && (
          <TouchableOpacity onPress={() => setWindowKey('overdue')}>
            <Text style={styles.alertLink}>{overdueCount} past due</Text>
          </TouchableOpacity>
        )}
      </View>
      {!!next && next.date && (
        <Text style={[styles.nextOut, { color: URGENCY_COLORS[next.bucket] }]}>
          Next out: <Text style={styles.bold}>{next.full}</Text> · {next.chip}
        </Text>
      )}
      {isHistory && !!archivedNote && <Text style={[styles.nextOut, { color: colors.subText }]}>{archivedNote}</Text>}
      {!isHistory && !!error && (orders || []).length === 0 && (
        <Text style={[styles.nextOut, { color: colors.error }]}>Couldn't load orders. Pull down to retry.</Text>
      )}

      {/* ── Orders ───────────────────────────────────────────────────────── */}
      {listLoading ? (
        <View style={styles.listContainer}>
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} withImage={false} lines={3} style={{ marginBottom: 12 }} />
          ))}
        </View>
      ) : (
        <FlatList
          data={shown}
          renderItem={renderCard}
          keyExtractor={(item, index) => `${item.order_id || 'order'}-${index}`}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="inbox-outline" size={56} color={colors.outline} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>{emptyHint}</Text>
            </View>
          }
        />
      )}

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => navigation.navigate('AddOrder')}
        accessibilityLabel="Add order"
        activeOpacity={0.85}
      >
        <MaterialCommunityIcons name="plus" size={22} color="#fff" />
        <Text style={styles.fabText}>New Order</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 28,
    paddingHorizontal: 18,
    paddingVertical: 13,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  fabText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  header: {
    paddingTop: 12,
    borderBottomWidth: 1,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 10,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 42,
    gap: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 42,
    gap: 4,
  },
  sortText: {
    fontSize: 13,
    fontWeight: '700',
  },
  tabRow: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 7,
    paddingLeft: 10,
    paddingRight: 6,
    gap: 6,
  },
  tabDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
  },
  tabCount: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabCountText: {
    fontSize: 12,
    fontWeight: '700',
  },
  windowRow: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  windowChip: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  windowText: {
    fontSize: 12,
    fontWeight: '600',
  },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 8,
  },
  noteText: {
    flex: 1,
    fontSize: 12,
  },
  alertLink: {
    color: '#E53935',
    fontSize: 12,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  nextOut: {
    paddingHorizontal: 16,
    paddingTop: 4,
    fontSize: 12,
  },
  bold: {
    fontWeight: '700',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 96,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderLeftWidth: 4,
    padding: 14,
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  cardName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
  },
  chip: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  cardId: {
    fontSize: 12,
    marginTop: 3,
  },
  cardFoot: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 10,
    gap: 10,
  },
  footItems: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 12,
    rowGap: 4,
  },
  footItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footText: {
    fontSize: 12,
  },
  cardTotal: {
    fontSize: 15,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 12,
    textAlign: 'center',
  },
});
