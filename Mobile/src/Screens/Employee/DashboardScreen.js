import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  AppState,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../Context/ThemeContext';
import { useAuth } from '../../Context/AuthContext';
import { analyticsAPI } from '../../services/api';
import { SkeletonStatRow, SkeletonCard, SkeletonText } from '../../Components/Skeleton/Skeleton';

/* Mobile version of the Website staff dashboard (Website/client/src/Pages/Dashboard/Dashboard.js):
   same /api/analytics endpoints, same role rules, same sections — charts are drawn with
   plain Views so no chart library is needed. */

const { width: SCREEN_W } = Dimensions.get('window');
const PAD = 16;
const GAP = 12;
const HALF_W = (SCREEN_W - PAD * 2 - GAP) / 2;
const CHART_W = SCREEN_W - PAD * 2 - 32;

const ACTIVITY_REFRESH_MS = 60000;

const PERIODS = [
  { label: '7d', value: '7d' },
  { label: '30d', value: '30d' },
  { label: '90d', value: '90d' },
  { label: 'MTD', value: 'mtd' },
  { label: 'YTD', value: 'ytd' },
];

const FINANCIAL_ROLES = new Set(['admin', 'super_admin', 'director', 'sales_manager', 'assistant_sales', 'business_developer']);
const MANAGER_ROLES = new Set(['admin', 'super_admin', 'director', 'sales_manager', 'operations_manager']);

const TONES = { brand: '#696a8f', green: '#4CAF50', blue: '#2196F3', orange: '#FF9800', red: '#f44336' };
const SEVERITY_COLORS = { critical: '#f44336', warning: '#FF9800', info: '#696a8f' };

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// ── Formatting ─────────────────────────────────────────────────────────────
const groupDigits = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const formatPeso = (v) => {
  const n = Math.round(Number(v) || 0);
  return `${n < 0 ? '-' : ''}₱${groupDigits(Math.abs(n))}`;
};
const formatNum = (v) => groupDigits(Math.round(Number(v) || 0));
const shortDate = (iso) => {
  const [, m, d] = String(iso || '').slice(0, 10).split('-');
  return m ? `${MONTHS[Number(m) - 1]} ${Number(d)}` : '';
};
const humanize = (s) => String(s || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

function relativeTime(ts) {
  if (!ts) return '';
  const diff = Math.floor((Date.now() - new Date(ts)) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// Build a human sentence from an activity feed row (same wording as the Website).
function buildSentence(item) {
  const actor = item.actorKind === 'customer' ? 'A customer'
    : item.actorKind === 'system' ? 'System'
    : (item.actorName || 'Unknown user');
  const eid = item.entityId ? `#${item.entityId}` : '';
  switch (item.eventType) {
    case 'order_status_change':
      return `${actor} updated order ${eid} to "${item.detail?.new_status || ''}"`;
    case 'order_created':
      return `${actor} placed order ${eid}`;
    case 'order_archived':
      return `${actor} completed/archived order ${eid}`;
    case 'delivery_status_change':
      return `${actor} updated delivery status for ${eid}`;
    case 'invoice_created':
      return `${actor} created invoice ${eid}`;
    case 'invoice_paid':
      return `${actor} marked invoice ${eid} as paid`;
    case 'stock_movement':
      return `${actor} recorded stock movement for ${item.detail?.sku || eid}`;
    case 'login':
      return `${actor} logged in`;
    default:
      return `${actor} performed action on ${item.entityType || 'record'} ${eid}`;
  }
}

// Sum neighbouring values so a long series fits the available bar slots.
const compress = (nums, maxBars) => {
  if (maxBars < 1 || nums.length <= maxBars) return nums;
  const size = Math.ceil(nums.length / maxBars);
  const out = [];
  for (let i = 0; i < nums.length; i += size) {
    out.push(nums.slice(i, i + size).reduce((sum, v) => sum + (Number(v) || 0), 0));
  }
  return out;
};

const settledBody = (result) => (result.status === 'fulfilled' ? result.value : null);
const settledData = (result) => settledBody(result)?.data ?? null;

// ── Data (port of Website hooks/useDashboardData.js) ────────────────────────
function useDashboardData(period, { isFinancial, isManager }) {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [activity, setActivity] = useState(null);
  const [activityLoading, setActivityLoading] = useState(false);
  const [teamPerformance, setTeamPerformance] = useState(null);
  const [myActivity, setMyActivity] = useState(null);

  const fetchMain = useCallback(async () => {
    setLoading(true);
    setError(null);

    const results = await Promise.allSettled([
      analyticsAPI.getKpis(period),
      analyticsAPI.getTimeseries('revenue', period),
      analyticsAPI.getTimeseries('orders', period),
      analyticsAPI.getOperations(period),
      analyticsAPI.getInventoryHealth(),
      analyticsAPI.getWorkQueue(),
      analyticsAPI.getInsights(),
      analyticsAPI.getBreakdown(period, 'product', 10),
      analyticsAPI.getRevenueForecast(30),
    ]);
    const [kpisR, tsRevR, tsOrdR, opsR, invR, wqR, insR, bkR, fcR] = results;

    setData({
      kpis: settledData(kpisR),
      tsRevenue: settledData(tsRevR),
      tsOrders: settledData(tsOrdR),
      operations: settledData(opsR),
      inventoryHealth: settledData(invR),
      workQueue: settledData(wqR),
      insights: settledData(insR),
      breakdown: settledData(bkR),
      forecast: settledData(fcR),
    });

    // KPIs are financial-only on the server, so they only count as critical for financial roles.
    const critical = isFinancial ? [kpisR, opsR, invR] : [opsR, invR];
    if (critical.some((r) => r.status === 'rejected')) {
      setError('Some data could not be loaded. Results may be partial.');
    }
    setLoading(false);
  }, [period, isFinancial]);

  const fetchActivity = useCallback(async (cursor = null, append = false) => {
    setActivityLoading(true);
    const [actR, teamR, myR] = await Promise.allSettled([
      analyticsAPI.getActivity({ before: cursor, limit: 20 }),
      isManager ? analyticsAPI.getTeamPerformance() : Promise.resolve(null),
      isManager ? Promise.resolve(null) : analyticsAPI.getMyActivity(),
    ]);

    const act = settledBody(actR);
    if (act) {
      const items = act.data || [];
      const nextCursor = act.nextCursor || null;
      setActivity((prev) => (append && prev ? { items: [...prev.items, ...items], nextCursor } : { items, nextCursor }));
    } else if (!append) {
      setActivity((prev) => prev || { items: [], nextCursor: null });
    }
    if (isManager) setTeamPerformance(settledData(teamR) || []);
    else setMyActivity(settledData(myR) || {});
    setActivityLoading(false);
  }, [isManager]);

  useEffect(() => {
    fetchMain();
  }, [fetchMain]);

  // Activity loads after the main batch, then refreshes every 60s while the app is in the foreground.
  const loadedOnce = useRef(false);
  useEffect(() => {
    if (loading || loadedOnce.current) return undefined;
    loadedOnce.current = true;
    fetchActivity();
    const timer = setInterval(() => {
      if (AppState.currentState === 'active') fetchActivity();
    }, ACTIVITY_REFRESH_MS);
    return () => clearInterval(timer);
  }, [loading, fetchActivity]);

  return {
    ...data,
    loading,
    error,
    activity,
    activityLoading,
    teamPerformance,
    myActivity,
    refresh: () => Promise.all([fetchMain(), fetchActivity()]),
    loadMoreActivity: () => activity?.nextCursor && fetchActivity(activity.nextCursor, true),
  };
}

// ── Sub-components ─────────────────────────────────────────────────────────
// With onPress the whole card opens its page (rows inside can still open
// their own, more specific page — the innermost touchable wins).
function Card({ title, colors, children, style, onPress, linkLabel = 'View' }) {
  const Wrapper = onPress ? TouchableOpacity : View;
  return (
    <Wrapper
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, style]}
      {...(onPress ? { onPress, activeOpacity: 0.8, accessibilityRole: 'link' } : {})}
    >
      {(!!title || !!onPress) && (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          {!!title && <Text style={[styles.cardTitle, { color: colors.text, flex: 1 }]}>{title}</Text>}
          {!!onPress && <Text style={{ fontSize: 12, fontWeight: '600', color: colors.primary }}>{linkLabel} →</Text>}
        </View>
      )}
      {children}
    </Wrapper>
  );
}

function Empty({ message, colors }) {
  return <Text style={[styles.empty, { color: colors.subText }]}>{message}</Text>;
}

function MiniBars({ values, color, height = 28, width }) {
  const nums = compress(values.map((v) => Number(v) || 0), Math.floor(width / 4));
  if (!nums.length) return null;
  const max = Math.max(...nums, 1);
  const slot = width / nums.length;
  const barW = Math.max(2, slot - 2);
  return (
    <View style={[styles.miniBars, { height }]}>
      {nums.map((v, i) => (
        <View
          key={i}
          style={{
            width: barW,
            marginRight: Math.max(0, slot - barW),
            height: Math.max(2, (v / max) * height),
            backgroundColor: color,
            opacity: 0.35 + 0.65 * (i / Math.max(1, nums.length - 1)),
            borderRadius: 1,
          }}
        />
      ))}
    </View>
  );
}

function KpiCard({ label, value, pct, direction, spark, tone, onPress, colors, note }) {
  const accent = TONES[tone] || TONES.brand;
  const deltaColor = direction === 'up' ? TONES.green : direction === 'down' ? TONES.red : colors.subText;
  return (
    <TouchableOpacity
      activeOpacity={onPress ? 0.75 : 1}
      disabled={!onPress}
      onPress={onPress}
      style={[styles.kpiCard, { backgroundColor: colors.card, borderColor: colors.border, borderLeftColor: accent }]}
    >
      <Text style={[styles.kpiLabel, { color: colors.subText }]} numberOfLines={1}>{label}</Text>
      <Text style={[styles.kpiValue, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      {pct != null && (
        <Text style={[styles.kpiDelta, { color: deltaColor }]}>
          {direction === 'up' ? '↑' : direction === 'down' ? '↓' : '→'} {Math.abs(Number(pct)).toFixed(1)}%
        </Text>
      )}
      {!!note && <Text style={{ fontSize: 11, color: colors.subText, marginTop: 2 }} numberOfLines={2}>{note}</Text>}
      {spark?.length > 0 && <MiniBars values={spark} color={accent} width={HALF_W - 28} />}
    </TouchableOpacity>
  );
}

function TrendChart({ data, lastActualDate, colors, darkMode }) {
  const maxBars = Math.floor(CHART_W / 5);
  const size = Math.max(1, Math.ceil(data.length / maxBars));
  const groups = [];
  for (let i = 0; i < data.length; i += size) {
    const g = data.slice(i, i + size);
    const hasActual = g.some((d) => d.revenue != null);
    groups.push({
      date: g[0].date,
      endDate: g[g.length - 1].date,
      revenue: hasActual ? g.reduce((s, d) => s + (d.revenue || 0), 0) : null,
      forecast: hasActual ? null : g.reduce((s, d) => s + (d.forecastRevenue || 0), 0),
      orders: g.reduce((s, d) => s + (d.orders || 0), 0),
    });
  }

  const REV_H = 130;
  const ORD_H = 40;
  const maxRev = Math.max(...groups.map((g) => g.revenue ?? g.forecast ?? 0), 1);
  const maxOrd = Math.max(...groups.map((g) => g.orders), 1);
  const slot = CHART_W / groups.length;
  const barW = Math.max(2, slot - 2);
  const forecastColor = darkMode ? '#4a4a6a' : '#c5c4dc';
  const totalRevenue = groups.reduce((s, g) => s + (g.revenue || 0), 0);
  const totalOrders = groups.reduce((s, g) => s + g.orders, 0);
  const hasForecast = groups.some((g) => g.forecast != null);

  return (
    <View>
      <View style={styles.trendTotals}>
        <View>
          <Text style={[styles.trendTotalLabel, { color: colors.subText }]}>Revenue</Text>
          <Text style={[styles.trendTotalValue, { color: colors.text }]}>{formatPeso(totalRevenue)}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[styles.trendTotalLabel, { color: colors.subText }]}>Orders</Text>
          <Text style={[styles.trendTotalValue, { color: colors.text }]}>{formatNum(totalOrders)}</Text>
        </View>
      </View>

      <View style={[styles.chartRow, { height: REV_H, alignItems: 'flex-end' }]}>
        {groups.map((g, i) => {
          const isForecast = g.revenue == null;
          const v = isForecast ? g.forecast || 0 : g.revenue;
          return (
            <View
              key={i}
              style={{
                width: barW,
                marginRight: Math.max(0, slot - barW),
                height: v > 0 ? Math.max(2, (v / maxRev) * REV_H) : 0,
                backgroundColor: isForecast ? forecastColor : TONES.brand,
                borderTopLeftRadius: 2,
                borderTopRightRadius: 2,
              }}
            />
          );
        })}
      </View>
      <View style={[styles.chartAxis, { backgroundColor: colors.border }]} />
      <View style={[styles.chartRow, { height: ORD_H, alignItems: 'flex-start' }]}>
        {groups.map((g, i) => (
          <View
            key={i}
            style={{
              width: barW,
              marginRight: Math.max(0, slot - barW),
              height: g.orders > 0 ? Math.max(2, (g.orders / maxOrd) * ORD_H) : 0,
              backgroundColor: TONES.green,
              opacity: 0.8,
              borderBottomLeftRadius: 2,
              borderBottomRightRadius: 2,
            }}
          />
        ))}
      </View>

      <View style={styles.axisLabels}>
        <Text style={[styles.axisLabel, { color: colors.subText }]}>{shortDate(groups[0]?.date)}</Text>
        {hasForecast && !!lastActualDate && (
          <Text style={[styles.axisLabel, { color: colors.subText }]}>Actual to {shortDate(lastActualDate)}</Text>
        )}
        <Text style={[styles.axisLabel, { color: colors.subText }]}>{shortDate(groups[groups.length - 1]?.endDate)}</Text>
      </View>

      <View style={styles.legend}>
        {[
          { label: 'Revenue', color: TONES.brand },
          ...(hasForecast ? [{ label: 'Forecast', color: forecastColor }] : []),
          { label: 'Orders', color: TONES.green },
        ].map((item) => (
          <View key={item.label} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: item.color }]} />
            <Text style={[styles.legendText, { color: colors.subText }]}>{item.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function HBarList({ rows, color, formatValue, colors, onPress }) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return rows.map((row, i) => (
    <TouchableOpacity key={`${row.name}-${i}`} style={styles.hbarRow} disabled={!onPress} onPress={() => onPress?.(row)} activeOpacity={0.7}>
      <View style={styles.hbarHead}>
        <Text style={[styles.hbarName, { color: colors.text }]} numberOfLines={1}>{row.name}</Text>
        <Text style={[styles.hbarValue, { color: colors.subText }]}>
          {formatValue(row.value)}
          {row.extra ? ` · ${row.extra}` : ''}
        </Text>
      </View>
      <View style={[styles.hbarTrack, { backgroundColor: colors.border }]}>
        <View style={[styles.hbarFill, { width: `${Math.max(4, (row.value / max) * 100)}%`, backgroundColor: color }]} />
      </View>
    </TouchableOpacity>
  ));
}

// ── Screen ─────────────────────────────────────────────────────────────────
export default function DashboardScreen({ navigation }) {
  const { colors, darkMode } = useTheme();
  const { user } = useAuth();
  const role = user?.role;
  const isFinancial = FINANCIAL_ROLES.has(role);
  const isManager = MANAGER_ROLES.has(role);

  const [period, setPeriod] = useState('30d');
  const [refreshing, setRefreshing] = useState(false);

  const {
    kpis, tsRevenue, tsOrders, forecast, operations, inventoryHealth, workQueue, insights, breakdown,
    loading, error, activity, activityLoading, teamPerformance, myActivity, refresh, loadMoreActivity,
  } = useDashboardData(period, { isFinancial, isManager });

  // Navigate to a tab (and optionally a screen inside its stack, with params)
  // when that tab exists for this role; otherwise fall back to Orders.
  const go = (name, screen, params, fallback = 'Orders') => {
    let nav = navigation;
    while (nav) {
      if (nav.getState?.()?.routeNames?.includes(name)) {
        navigation.navigate(name, screen ? { screen, params } : undefined);
        return;
      }
      nav = nav.getParent?.();
    }
    navigation.navigate(fallback);
  };
  const goSales = () => go('Reports', 'SalesReport');
  const goInventoryReport = () => go('Reports', 'InventoryReport');
  const goInventory = (params) => go('Inventory', 'InventoryList', params);
  const goOrders = (params) => go('Orders', 'OrderList', params);

  // Each insight opens the screen where it can be acted on.
  const openInsight = (id = '') => {
    if (id.startsWith('stockout-risk:') || id.startsWith('velocity-change:')) return goInventory({ search: id.split(':')[1] });
    switch (id) {
      case 'unverified-payment-proofs': return goOrders({ tab: 'pending' });
      case 'late-deliveries':           return go('Deliveries', undefined, undefined, 'Orders');
      case 'dead-stock-value':          return goInventoryReport();
      default:                          return goSales(); // revenue, cancellations, outstanding AR
    }
  };

  // Activity feed row -> the order / product it is about.
  const openActivity = (item) => {
    if (item.entityType === 'order' && item.entityId) return go('Orders', 'OrderDetail', { order: { order_id: item.entityId } });
    if (item.entityType === 'delivery') return go('Deliveries', undefined, undefined, 'Orders');
    if (item.eventType === 'stock_movement') return goInventory(item.detail?.sku ? { search: item.detail.sku } : undefined);
    return goOrders();
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  };

  // Combined trend: revenue + orders timeseries + forecast points.
  const trendData = useMemo(() => {
    const map = new Map();
    (tsRevenue?.series || []).forEach((d) => {
      const key = d.bucket ? new Date(d.bucket).toISOString().slice(0, 10) : null;
      if (key) map.set(key, { date: key, revenue: Number(d.value || 0) });
    });
    (tsOrders?.series || []).forEach((d) => {
      const key = d.bucket ? new Date(d.bucket).toISOString().slice(0, 10) : null;
      if (!key) return;
      map.set(key, { ...(map.get(key) || { date: key }), orders: Number(d.value || 0) });
    });
    (forecast?.points || []).forEach((p) => {
      map.set(p.date, { ...(map.get(p.date) || { date: p.date }), forecastRevenue: p.predicted });
    });
    return Array.from(map.values()).sort((a, b) => (a.date < b.date ? -1 : 1));
  }, [tsRevenue, tsOrders, forecast]);

  const lastActualDate = useMemo(() => {
    const pts = trendData.filter((d) => d.revenue != null);
    return pts.length ? pts[pts.length - 1].date : null;
  }, [trendData]);

  const topProducts = useMemo(
    () => (breakdown || []).slice(0, 8).map((r) => ({ name: r.label || r.key, sku: r.key, value: Number(r.value || 0) })),
    [breakdown]
  );

  const wq = Array.isArray(workQueue) ? workQueue : [];

  const attentionItems = useMemo(() => {
    const items = [];
    const proofsCount = wq.filter((i) => i.type === 'verify_proof').length;
    const lateCount = wq.filter((i) => i.type === 'dispatch_delivery' && i.severity === 'high').length;
    const reorderCount = wq.filter((i) => i.type === 'reorder_sku' && i.severity === 'high').length;
    const packHigh = wq.filter((i) => i.type === 'pack_order' && i.severity === 'high').length;

    if (proofsCount > 0) items.push({ icon: 'file-document-alert-outline', label: `${proofsCount} payment proof${proofsCount > 1 ? 's' : ''} awaiting verification`, tab: 'Orders', screen: 'OrderList', params: { tab: 'pending' }, severity: proofsCount >= 5 ? 'critical' : 'warning' });
    if (lateCount > 0) items.push({ icon: 'truck-alert-outline', label: `${lateCount} overdue deliver${lateCount > 1 ? 'ies' : 'y'}`, tab: 'Deliveries', severity: lateCount >= 10 ? 'critical' : 'warning' });
    if (reorderCount > 0) items.push({ icon: 'package-variant-remove', label: `${reorderCount} SKU${reorderCount > 1 ? 's' : ''} need urgent reorder`, tab: 'Inventory', screen: 'InventoryList', params: { filter: 'low-stock' }, severity: 'critical' });
    if (packHigh > 0) items.push({ icon: 'package-variant-closed', label: `${packHigh} overdue pack order${packHigh > 1 ? 's' : ''}`, tab: 'Orders', screen: 'OrderList', params: { tab: 'toBePacked' }, severity: 'warning' });
    if (isFinancial && inventoryHealth?.deadStockValue > 20000) {
      items.push({ icon: 'chart-line-variant', label: 'Dead stock above ₱20,000 threshold', value: formatPeso(inventoryHealth.deadStockValue), tab: 'Reports', screen: 'InventoryReport', severity: 'warning' });
    }
    return items;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workQueue, inventoryHealth, isFinancial]);

  const packCount = wq.filter((i) => i.type === 'pack_order').length;
  const dispatchCount = wq.filter((i) => i.type === 'dispatch_delivery').length;
  const stockoutCount = wq.filter((i) => i.type === 'reorder_sku' && i.severity === 'high').length;
  const invH = inventoryHealth || {};
  const teamMembers = Array.isArray(teamPerformance) ? teamPerformance : [];
  const stages = (operations?.stageAges || []).slice(0, 8);

  const firstLoad = loading && !kpis && !operations && !inventoryHealth;

  const sparkOf = (metric) => (kpis?.[metric]?.sparkline || []).map(Number);

  const header = (
    <View style={[styles.header, { backgroundColor: colors.primary }]}>
      <Text style={[styles.headerTitle, { color: colors.onPrimary }]}>Dashboard</Text>
      <Text style={[styles.headerSubtitle, { color: colors.onPrimary }]}>
        {user?.name ? `${user.name} · ` : ''}{humanize(role || 'employee')}
      </Text>
      <View style={styles.periodRow}>
        {PERIODS.map((p) => {
          const active = period === p.value;
          return (
            <TouchableOpacity
              key={p.value}
              onPress={() => setPeriod(p.value)}
              style={[styles.periodBtn, active ? styles.periodBtnActive : null]}
            >
              <Text style={[styles.periodText, { color: active ? colors.primary : colors.onPrimary }]}>{p.label}</Text>
            </TouchableOpacity>
          );
        })}
        {loading && !firstLoad && <ActivityIndicator size="small" color={colors.onPrimary} style={{ marginLeft: 6 }} />}
      </View>
    </View>
  );

  if (firstLoad) {
    return (
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
        {header}
        <View style={styles.section}>
          <SkeletonStatRow count={2} style={{ marginBottom: 12 }} />
          <SkeletonStatRow count={2} />
        </View>
        <View style={styles.section}>
          <SkeletonText width={180} height={18} style={{ marginBottom: 16 }} />
          <SkeletonCard withImage={false} lines={4} />
        </View>
        <View style={styles.section}>
          <SkeletonText width={140} height={18} style={{ marginBottom: 16 }} />
          <SkeletonStatRow count={3} />
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {header}

      {!!error && (
        <View style={styles.errorBanner}>
          <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#B26A00" />
          <Text style={styles.errorBannerText}>{error}</Text>
        </View>
      )}

      {/* ── KPI cards ────────────────────────────────────────────────────── */}
      <View style={[styles.section, styles.kpiGrid]}>
        {isFinancial ? (
          <>
            <KpiCard colors={colors} label="Revenue" value={formatPeso(kpis?.revenue?.value)} pct={kpis?.revenue?.deltaPct} direction={kpis?.revenue?.direction} spark={sparkOf('revenue')} tone="brand" onPress={goSales}
              note={Number(kpis?.cancelledOrderRevenue?.value) > 0 ? `incl. ${formatPeso(kpis.cancelledOrderRevenue.value)} from cancelled orders` : null} />
            <KpiCard colors={colors} label="Orders" value={formatNum(kpis?.orders?.value)} pct={kpis?.orders?.deltaPct} direction={kpis?.orders?.direction} spark={sparkOf('orders')} tone="green" onPress={() => goOrders()} />
            <KpiCard colors={colors} label="Avg Order Value" value={formatPeso(kpis?.aov?.value)} pct={kpis?.aov?.deltaPct} direction={kpis?.aov?.direction} spark={sparkOf('aov')} tone="blue" onPress={goSales} />
            <KpiCard colors={colors} label="Outstanding AR" value={formatPeso(kpis?.outstandingAr?.value)} tone="orange" onPress={goSales} />
            {/* Kept, non-refundable down payments of cancelled orders — already
                inside Revenue; shown separately so the source is clear. */}
            <KpiCard colors={colors} label="From Cancelled Orders" value={formatPeso(kpis?.cancelledOrderRevenue?.value)} pct={kpis?.cancelledOrderRevenue?.deltaPct} direction={kpis?.cancelledOrderRevenue?.direction} tone="red" onPress={goSales}
              note="Kept down payments · counted as revenue & profit" />
          </>
        ) : (
          <>
            <KpiCard colors={colors} label="Orders to Pack" value={formatNum(packCount)} tone="orange" onPress={() => goOrders({ tab: 'toBePacked' })} />
            <KpiCard colors={colors} label="Ready to Dispatch" value={formatNum(dispatchCount)} tone="blue" onPress={() => go('Deliveries', undefined, undefined, 'Orders')} />
            <KpiCard colors={colors} label="Low Stock SKUs" value={formatNum(invH.lowStockCount || 0)} tone="orange" onPress={() => goInventory({ filter: 'low-stock' })} />
            <KpiCard colors={colors} label="Stockout Risks" value={formatNum(stockoutCount)} tone="red" onPress={() => goInventory({ filter: 'low-stock' })} />
          </>
        )}
      </View>

      {/* ── Attention Required ───────────────────────────────────────────── */}
      {attentionItems.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Attention Required</Text>
          <Card colors={colors} style={{ paddingVertical: 4 }}>
            {attentionItems.map((item, i) => {
              const color = SEVERITY_COLORS[item.severity] || SEVERITY_COLORS.warning;
              return (
                <TouchableOpacity
                  key={item.label}
                  style={[styles.attnRow, i > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}
                  onPress={() => go(item.tab, item.screen, item.params)}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons name={item.icon} size={20} color={color} />
                  <Text style={[styles.attnLabel, { color: colors.text }]}>{item.label}</Text>
                  {!!item.value && <Text style={[styles.attnValue, { color }]}>{item.value}</Text>}
                  <MaterialCommunityIcons name="chevron-right" size={18} color={colors.subText} />
                </TouchableOpacity>
              );
            })}
          </Card>
        </View>
      )}

      {/* ── Revenue & Orders Trend ───────────────────────────────────────── */}
      {isFinancial && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Revenue & Orders Trend</Text>
          <Card colors={colors} onPress={goSales} linkLabel="Sales report">
            {trendData.length === 0 ? (
              <Empty colors={colors} message="No trend data available for this period" />
            ) : (
              <TrendChart data={trendData} lastActualDate={lastActualDate} colors={colors} darkMode={darkMode} />
            )}
            {!!forecast && (
              <Text style={[styles.footNote, { color: colors.subText }]}>
                30-day forecast — confidence: <Text style={{ fontWeight: '700' }}>{forecast.confidence}</Text>
                {forecast.dataCompleteness != null ? ` · data completeness: ${Math.round(forecast.dataCompleteness * 100)}%` : ''}
              </Text>
            )}
          </Card>
        </View>
      )}

      {/* ── Order Pipeline ───────────────────────────────────────────────── */}
      <View style={styles.section}>
        <Card colors={colors} title="Order Pipeline" onPress={() => goOrders()}>
          {stages.length === 0 ? (
            <Empty colors={colors} message="No active orders" />
          ) : (
            <HBarList
              colors={colors}
              color={TONES.brand}
              rows={stages.map((s) => ({
                name: s.status,
                value: Number(s.orderCount || 0),
                extra: s.medianAgeDays != null ? `med ${Number(s.medianAgeDays).toFixed(1)}d` : '',
              }))}
              formatValue={formatNum}
              onPress={(row) => goOrders({ status: row.name })}
            />
          )}
        </Card>
      </View>

      {/* ── Top Products ─────────────────────────────────────────────────── */}
      <View style={styles.section}>
        <Card colors={colors} title={`Top Products ${isFinancial ? 'by Revenue' : '(by activity)'}`} onPress={isFinancial ? goSales : () => goInventory()}>
          {topProducts.length === 0 ? (
            <Empty colors={colors} message="No product data for this period" />
          ) : (
            <HBarList
              colors={colors}
              color={TONES.green}
              rows={topProducts}
              formatValue={isFinancial ? formatPeso : formatNum}
              onPress={(row) => goInventory({ search: row.sku || row.name })}
            />
          )}
        </Card>
      </View>

      {/* ── Inventory Health ─────────────────────────────────────────────── */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Inventory Health</Text>
        <View style={styles.tileGrid}>
          {[
            { label: 'Turnover Ratio', value: invH.turnover != null ? Number(invH.turnover).toFixed(2) : '—', tone: 'brand', open: goInventoryReport },
            { label: 'Low Stock', value: formatNum(invH.lowStockCount), tone: 'orange', open: () => goInventory({ filter: 'low-stock' }) },
            { label: 'Out of Stock', value: formatNum(invH.outOfStockCount), tone: 'red', open: () => goInventory({ filter: 'replenishment' }) },
            ...(isFinancial
              ? [
                  { label: 'Stock Value', value: formatPeso(invH.stockValue), tone: 'blue', open: goInventoryReport },
                  { label: 'Dead Stock', value: formatPeso(invH.deadStockValue), tone: 'orange', open: goInventoryReport },
                ]
              : []),
            { label: '< 7-day Supply', value: formatNum(invH.daysOfSupplyDistribution?.under7), tone: 'red', open: () => goInventory({ filter: 'low-stock' }) },
            { label: '7–30-day Supply', value: formatNum(invH.daysOfSupplyDistribution?.d7to30), tone: 'brand', open: goInventoryReport },
            { label: '30–90-day Supply', value: formatNum(invH.daysOfSupplyDistribution?.d30to90), tone: 'green', open: goInventoryReport },
          ].map((tile) => (
            <TouchableOpacity
              key={tile.label}
              onPress={tile.open}
              accessibilityRole="link"
              activeOpacity={0.75}
              style={[styles.tile, { backgroundColor: colors.card, borderColor: colors.border, borderTopColor: TONES[tile.tone] }]}
            >
              <Text style={[styles.tileLabel, { color: colors.subText }]} numberOfLines={1}>{tile.label}</Text>
              <Text style={[styles.tileValue, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit>{tile.value}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── Insights ─────────────────────────────────────────────────────── */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Insights</Text>
        <Card colors={colors}>
          {!Array.isArray(insights) || insights.length === 0 ? (
            <Empty colors={colors} message="No insights at this time — everything looks normal." />
          ) : (
            insights.map((ins, i) => {
              const color = SEVERITY_COLORS[ins.severity] || SEVERITY_COLORS.info;
              return (
                <TouchableOpacity
                  key={ins.id || i}
                  onPress={() => openInsight(ins.id)}
                  activeOpacity={0.75}
                  accessibilityRole="link"
                  style={[styles.insight, { borderLeftColor: color, backgroundColor: `${color}12` }]}
                >
                  <Text style={[styles.insightSeverity, { color }]}>{String(ins.severity || 'info').toUpperCase()}</Text>
                  <Text style={[styles.insightTitle, { color: colors.text }]}>{ins.title}</Text>
                  {!!ins.body && <Text style={[styles.insightBody, { color: colors.subText }]}>{ins.body}</Text>}
                </TouchableOpacity>
              );
            })
          )}
        </Card>
      </View>

      {/* ── Team Activity ────────────────────────────────────────────────── */}
      <View style={styles.section}>
        <Card colors={colors} title="Team Activity">
          {activityLoading && !activity ? (
            <SkeletonCard withImage={false} lines={4} />
          ) : !activity?.items?.length ? (
            <Empty colors={colors} message="No recent activity" />
          ) : (
            <>
              {activity.items.map((item, i) => (
                <TouchableOpacity
                  key={item.entityId ? `${item.entityId}-${i}` : i}
                  onPress={() => openActivity(item)}
                  activeOpacity={0.7}
                  accessibilityRole="link"
                  style={[styles.activityRow, i > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}
                >
                  <MaterialCommunityIcons
                    name={item.actorKind === 'customer' ? 'account-heart-outline' : item.actorKind === 'system' ? 'cog-outline' : 'account-outline'}
                    size={20}
                    color={colors.primary}
                  />
                  <View style={styles.activityBody}>
                    <Text style={[styles.activitySentence, { color: colors.text }]}>{buildSentence(item)}</Text>
                    <Text style={[styles.activityTime, { color: colors.subText }]}>{relativeTime(item.ts)}</Text>
                  </View>
                </TouchableOpacity>
              ))}
              {!!activity.nextCursor && (
                <TouchableOpacity
                  style={[styles.loadMore, { borderColor: colors.border }]}
                  onPress={loadMoreActivity}
                  disabled={activityLoading}
                >
                  <Text style={[styles.loadMoreText, { color: colors.primary }]}>
                    {activityLoading ? 'Loading…' : 'Load more'}
                  </Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </Card>
      </View>

      {/* ── Workload (managers) / My Activity ────────────────────────────── */}
      <View style={styles.section}>
        {isManager ? (
          <Card colors={colors} title="Workload Distribution (7d)" onPress={() => go('Settings', 'AccountManagement', undefined, 'Orders')}>
            {!teamPerformance ? (
              <SkeletonCard withImage={false} lines={3} />
            ) : teamMembers.length === 0 ? (
              <Empty colors={colors} message="No team activity in the last 7 days" />
            ) : (
              <HBarList
                colors={colors}
                color={TONES.blue}
                rows={teamMembers.map((m) => ({ name: m.name, value: Number(m.actionsPerformed || 0) }))}
                formatValue={formatNum}
              />
            )}
          </Card>
        ) : (
          <Card colors={colors} title="My Activity (7d)" onPress={() => goOrders()}>
            {!myActivity ? (
              <SkeletonCard withImage={false} lines={3} />
            ) : (
              <>
                {[
                  { label: 'Actions performed', value: myActivity.actionsPerformed },
                  { label: 'Orders advanced', value: myActivity.ordersAdvanced },
                  { label: 'Deliveries handled', value: myActivity.deliveriesDispatched },
                  { label: 'Proofs verified', value: myActivity.proofsVerified },
                  { label: 'Stock movements', value: myActivity.stockMovementsRecorded },
                ].map((row, i) => (
                  <View key={row.label} style={[styles.myRow, i > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}>
                    <Text style={[styles.myLabel, { color: colors.subText }]}>{row.label}</Text>
                    <Text style={[styles.myValue, { color: colors.text }]}>{formatNum(row.value || 0)}</Text>
                  </View>
                ))}
                {!!myActivity.lastActive && (
                  <Text style={[styles.footNote, { color: colors.subText }]}>Last active {relativeTime(myActivity.lastActive)}</Text>
                )}
              </>
            )}
          </Card>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingTop: 40,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    fontSize: 14,
    opacity: 0.9,
    marginTop: 4,
  },
  periodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    gap: 6,
  },
  periodBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  periodBtnActive: {
    backgroundColor: '#ffffff',
    borderColor: '#ffffff',
  },
  periodText: {
    fontSize: 13,
    fontWeight: '700',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: PAD,
    marginTop: PAD,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#FFF4E0',
  },
  errorBannerText: {
    flex: 1,
    fontSize: 13,
    color: '#B26A00',
  },
  section: {
    paddingHorizontal: PAD,
    paddingTop: PAD,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  empty: {
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 16,
  },
  footNote: {
    fontSize: 12,
    marginTop: 12,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  kpiCard: {
    width: HALF_W,
    borderRadius: 12,
    borderWidth: 1,
    borderLeftWidth: 4,
    padding: 14,
    marginBottom: GAP,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  kpiLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  kpiValue: {
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 6,
  },
  kpiDelta: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  miniBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: 8,
  },
  attnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
  },
  attnLabel: {
    flex: 1,
    fontSize: 14,
  },
  attnValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  trendTotals: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  trendTotalLabel: {
    fontSize: 12,
  },
  trendTotalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 2,
  },
  chartRow: {
    flexDirection: 'row',
    width: CHART_W,
  },
  chartAxis: {
    height: 1,
    width: CHART_W,
  },
  axisLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  axisLabel: {
    fontSize: 11,
  },
  legend: {
    flexDirection: 'row',
    gap: 14,
    marginTop: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
  },
  hbarRow: {
    marginBottom: 12,
  },
  hbarHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 5,
  },
  hbarName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    marginRight: 10,
  },
  hbarValue: {
    fontSize: 12,
  },
  hbarTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  hbarFill: {
    height: '100%',
    borderRadius: 4,
  },
  tileGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  tile: {
    width: HALF_W,
    borderRadius: 10,
    borderWidth: 1,
    borderTopWidth: 3,
    padding: 12,
    marginBottom: GAP,
  },
  tileLabel: {
    fontSize: 12,
  },
  tileValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 4,
  },
  insight: {
    borderLeftWidth: 3,
    borderRadius: 6,
    padding: 12,
    marginBottom: 10,
  },
  insightSeverity: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  insightTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  insightBody: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 10,
  },
  activityBody: {
    flex: 1,
  },
  activitySentence: {
    fontSize: 13,
    lineHeight: 18,
  },
  activityTime: {
    fontSize: 11,
    marginTop: 2,
  },
  loadMore: {
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  loadMoreText: {
    fontSize: 13,
    fontWeight: '700',
  },
  myRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  myLabel: {
    fontSize: 13,
  },
  myValue: {
    fontSize: 15,
    fontWeight: 'bold',
  },
});
