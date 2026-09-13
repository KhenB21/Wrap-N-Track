import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../Context/ThemeContext';
import { salesReportsAPI } from '../../services/api';
import {
  ChartCard,
  Chips,
  ErrorBanner,
  KpiCard,
  Pill,
  ReportHeader,
  formatDate,
  formatNumber,
  formatPeso,
  reportStyles,
  useMeasuredWidth,
} from '../../Components/Reports/ReportUI';
import { DonutChart, HBarChart, TrendChart } from '../../Components/Reports/ReportCharts';

/* Mobile version of the Website Sales Report (Website/client/src/Pages/SalesReport/SalesReport.js):
   same endpoints, periods and sections — KPIs, Revenue & Orders trend, Orders by Status,
   Top Products, Top Customers and Recent Orders. */

const EMPTY_SALES_DATA = {
  totalRevenue: 0,
  totalOrders: 0,
  avgOrderValue: 0,
  totalProfit: 0,
  completedOrders: 0,
  cancelledOrders: 0,
  pendingOrders: 0,
  paidAmount: 0,
  outstandingAmount: 0,
  ordersByStatus: {},
  revenueTrend: 'stable',
  ordersTrend: 'stable',
  profitTrend: 'stable',
  profitMarginPct: null,
  targetMarginPct: 70,
  estimatedProfitOrders: 0,
};

const PERIODS = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
];
const PERIOD_LABELS = { today: 'Today', week: 'This Week', month: 'This Month' };

const STATUS_COLORS = {
  'Order Placed': '#17a2b8',
  'Order Paid': '#28a745',
  'To Be Packed': '#F59E0B',
  'Order Shipped Out': '#007bff',
  'Ready for Delivery': '#6f42c1',
  'Order Received': '#20c997',
  Completed: '#16A34A',
  Cancelled: '#DC2626',
};
const PAYMENT_COLORS = { 'Fully Paid': '#16A34A', 'Partially Paid': '#F59E0B', Unpaid: '#DC2626', 'N/A': '#6B7280' };
const CUSTOMER_TYPE_COLORS = { New: '#3b82f6', Regular: '#059669', VIP: '#7c3aed' };

// Same local-date ranges as the Website, so both report the same numbers for a period.
const toLocalDateString = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const getDateRange = (period) => {
  const today = new Date();
  const start = new Date();
  if (period === 'week') start.setDate(today.getDate() - 7);
  if (period === 'month') start.setDate(today.getDate() - 30);
  return { startDate: toLocalDateString(start), endDate: toLocalDateString(today) };
};

const settledData = (result) => (result.status === 'fulfilled' && result.value?.success ? result.value.data : undefined);

export default function SalesReportScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation();

  const [period, setPeriod] = useState('month');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [salesData, setSalesData] = useState(EMPTY_SALES_DATA);
  const [trends, setTrends] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [topCustomers, setTopCustomers] = useState([]);
  const [recentSales, setRecentSales] = useState([]);
  const [sectionErrors, setSectionErrors] = useState({});
  const [statusFilter, setStatusFilter] = useState(null);
  const [trendWidth, onTrendLayout] = useMeasuredWidth();

  const fetchAllData = useCallback(async () => {
    const { startDate, endDate } = getDateRange(period);
    const [overviewRes, trendsRes, topProductsRes, customerRes, recentRes] = await Promise.allSettled([
      salesReportsAPI.getOverview(startDate, endDate),
      salesReportsAPI.getTrends(startDate, endDate, 'day'),
      salesReportsAPI.getTopProducts(startDate, endDate, 8),
      salesReportsAPI.getCustomerAnalysis(startDate, endDate),
      salesReportsAPI.getRecent(10),
    ]);

    const errors = {};
    const overview = settledData(overviewRes);
    if (overview) setSalesData({ ...EMPTY_SALES_DATA, ...overview });
    else { errors.overview = true; setSalesData(EMPTY_SALES_DATA); }

    const trendRows = settledData(trendsRes);
    if (trendRows) setTrends(trendRows);
    else { errors.trends = true; setTrends([]); }

    const products = settledData(topProductsRes);
    if (products) setTopProducts(products);
    else { errors.topProducts = true; setTopProducts([]); }

    const customers = settledData(customerRes);
    if (customers) setTopCustomers((customers.customers || []).slice(0, 5));
    else { errors.customers = true; setTopCustomers([]); }

    const recent = settledData(recentRes);
    if (recent) setRecentSales(recent);
    else { errors.recent = true; setRecentSales([]); }

    setSectionErrors(errors);
  }, [period]);

  useEffect(() => {
    setLoading(true);
    setStatusFilter(null);
    fetchAllData().finally(() => setLoading(false));
  }, [fetchAllData]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchAllData();
    } finally {
      setRefreshing(false);
    }
  };

  const retry = () => {
    setLoading(true);
    fetchAllData().finally(() => setLoading(false));
  };

  /* ── Chart data ─────────────────────────────────────────────────────── */
  // The trends endpoint names the count `order_count`; fall back to `orders` just in case.
  const trendData = useMemo(
    () =>
      trends.map((t) => ({
        date: t.period,
        revenue: Number(t.revenue) || 0,
        orders: Number(t.order_count ?? t.orders) || 0,
      })),
    [trends]
  );

  const statusDonutData = useMemo(
    () =>
      Object.entries(salesData.ordersByStatus || {})
        .map(([name, value]) => ({ name, value: Number(value), color: STATUS_COLORS[name] }))
        .filter((d) => d.value > 0)
        .sort((a, b) => b.value - a.value),
    [salesData.ordersByStatus]
  );

  const topProductsChartData = useMemo(
    () => topProducts.map((p) => ({ name: p.name, value: Number(p.sales_value) || 0 })),
    [topProducts]
  );

  const trendTotals = useMemo(
    () => trendData.reduce((acc, d) => ({ revenue: acc.revenue + d.revenue, orders: acc.orders + d.orders }), { revenue: 0, orders: 0 }),
    [trendData]
  );

  const visibleRecent = statusFilter ? recentSales.filter((o) => o.status === statusFilter) : recentSales;
  const hasErrors = Object.keys(sectionErrors).length > 0;

  const openOrder = (order) => {
    navigation.navigate('Orders', {
      screen: 'OrderDetail',
      params: {
        order: {
          order_id: order.order_id,
          name: order.customer_name,
          status: order.status,
          total_cost: order.total_cost,
          order_date: order.order_date,
        },
      },
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <ReportHeader title="Sales Report" subtitle={`${PERIOD_LABELS[period]} performance`} colors={colors} />
        <Chips options={PERIODS} value={period} onChange={setPeriod} colors={colors} />

        {!loading && hasErrors && <ErrorBanner message="Some sections failed to load. Pull down or tap Retry." />}

        {/* ── Hero KPIs ──────────────────────────────────────────────────── */}
        <View style={[reportStyles.section, reportStyles.grid, { paddingTop: 4 }]}>
          <KpiCard colors={colors} tone="#696a8f" label="Total Revenue" value={loading ? '…' : formatPeso(salesData.totalRevenue)} trend={loading ? null : salesData.revenueTrend} sub="From paid invoices" />
          <KpiCard colors={colors} tone="#3b82f6" label="Total Orders" value={loading ? '…' : formatNumber(salesData.totalOrders)} trend={loading ? null : salesData.ordersTrend} />
          <KpiCard colors={colors} tone="#F59E0B" label="Avg Order Value" value={loading ? '…' : formatPeso(salesData.avgOrderValue)} />
          <KpiCard
            colors={colors}
            tone={salesData.profitMarginPct != null && salesData.profitMarginPct < (salesData.targetMarginPct ?? 70) ? '#D97706' : '#16A34A'}
            label="Total Profit"
            value={loading ? '…' : formatPeso(salesData.totalProfit)}
            trend={loading ? null : salesData.profitTrend}
            sub={
              !loading && salesData.profitMarginPct != null
                ? `Margin ${salesData.profitMarginPct}% · Target ${salesData.targetMarginPct ?? 70}%`
                : null
            }
          />
        </View>

        {/* ── Secondary strip ────────────────────────────────────────────── */}
        {!loading && (
          <View style={[styles.strip, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {[
              ['Completed', formatNumber(salesData.completedOrders), '#16A34A'],
              ['Pending', formatNumber(salesData.pendingOrders), '#F59E0B'],
              ['Cancelled', formatNumber(salesData.cancelledOrders), '#DC2626'],
              ['Paid Amount', formatPeso(salesData.paidAmount), colors.text],
              ['Outstanding', formatPeso(salesData.outstandingAmount), '#DC2626'],
            ].map(([label, value, color], i) => (
              <View key={label} style={[styles.stripTile, i < 3 ? styles.stripThird : styles.stripHalf]}>
                <Text style={[styles.stripLabel, { color: colors.subText }]}>{label}</Text>
                <Text style={[styles.stripValue, { color }]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
              </View>
            ))}
          </View>
        )}

        {!loading && salesData.estimatedProfitOrders > 0 && (
          <Text style={[styles.estimateNote, { color: colors.subText }]}>
            Profit for {salesData.estimatedProfitOrders} order{salesData.estimatedProfitOrders === 1 ? '' : 's'} uses the {salesData.targetMarginPct ?? 70}% target because some product costs are missing.
          </Text>
        )}

        {/* ── Revenue & Orders trend ─────────────────────────────────────── */}
        <ChartCard
          title="Revenue & Orders Trend"
          subtitle={!loading && trendData.length ? `${formatPeso(trendTotals.revenue)} revenue · ${formatNumber(trendTotals.orders)} orders` : null}
          colors={colors}
          loading={loading}
          error={sectionErrors.trends}
          onRetry={retry}
          isEmpty={trendData.length === 0}
          emptyMessage="No trend data for this period."
          onLayout={onTrendLayout}
        >
          <TrendChart
            data={trendData}
            width={trendWidth}
            leftKey="revenue"
            rightKey="orders"
            leftLabel="Revenue (₱)"
            rightLabel="Orders"
            leftPrefix="₱"
            leftColor={colors.primary}
            colors={colors}
            gradientId="salesTrendFill"
          />
        </ChartCard>

        {/* ── Orders by status ───────────────────────────────────────────── */}
        <ChartCard
          title="Orders by Status"
          subtitle={statusFilter ? `Filtering recent orders by "${statusFilter}"` : 'Tap a status to filter recent orders'}
          colors={colors}
          loading={loading}
          error={sectionErrors.overview}
          onRetry={retry}
          isEmpty={statusDonutData.length === 0}
          emptyMessage="No orders in this period."
        >
          <DonutChart
            data={statusDonutData}
            colors={colors}
            centerLabel="Orders"
            selected={statusFilter}
            onSelect={(name) => setStatusFilter((prev) => (prev === name ? null : name))}
          />
        </ChartCard>

        {/* ── Top products by revenue ────────────────────────────────────── */}
        <ChartCard
          title="Top Products by Revenue"
          colors={colors}
          loading={loading}
          error={sectionErrors.topProducts}
          onRetry={retry}
          isEmpty={topProductsChartData.length === 0}
          emptyMessage="No product sales in this period."
        >
          <HBarChart data={topProductsChartData} colors={colors} formatValue={formatPeso} />
        </ChartCard>

        {/* ── Top customers ──────────────────────────────────────────────── */}
        <ChartCard
          title="Top Customers"
          colors={colors}
          loading={loading}
          error={sectionErrors.customers}
          onRetry={retry}
          isEmpty={topCustomers.length === 0}
          emptyMessage="No customer sales in this period."
        >
          {topCustomers.map((c, i) => (
            <View key={`${c.name}-${c.email_address}-${i}`} style={[styles.row, i > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}>
              <View style={styles.rowMain}>
                <Text style={[styles.rowTitle, { color: colors.text }]} numberOfLines={1}>{c.name}</Text>
                {!!c.customer_type && <Pill text={c.customer_type} color={CUSTOMER_TYPE_COLORS[c.customer_type] || '#6B7280'} />}
              </View>
              <View style={styles.rowRight}>
                <Text style={[styles.rowAmount, { color: colors.text }]}>{formatPeso(c.total_spent)}</Text>
                <Text style={[styles.rowSub, { color: colors.subText }]}>
                  {formatNumber(c.order_count)} order{Number(c.order_count) === 1 ? '' : 's'}
                </Text>
              </View>
            </View>
          ))}
        </ChartCard>

        {/* ── Top products table ─────────────────────────────────────────── */}
        <ChartCard
          title="Top Products"
          colors={colors}
          loading={loading}
          error={sectionErrors.topProducts}
          onRetry={retry}
          isEmpty={topProducts.length === 0}
          emptyMessage="No product sales in this period."
        >
          {topProducts.map((p, i) => (
            <View key={p.sku} style={[styles.row, i > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}>
              <View style={styles.rowMain}>
                <Text style={[styles.rowTitle, { color: colors.text }]} numberOfLines={1}>{p.name}</Text>
                <Text style={[styles.rowSub, { color: colors.subText }]}>{formatNumber(p.units_sold)} units sold</Text>
              </View>
              <Text style={[styles.rowAmount, { color: colors.text }]}>{formatPeso(p.sales_value)}</Text>
            </View>
          ))}
        </ChartCard>

        {/* ── Recent orders ──────────────────────────────────────────────── */}
        <ChartCard
          title={`Recent Orders${statusFilter ? ` — ${statusFilter}` : ''}`}
          colors={colors}
          loading={loading}
          error={sectionErrors.recent}
          onRetry={retry}
          isEmpty={visibleRecent.length === 0}
          emptyMessage={statusFilter ? `No orders with status "${statusFilter}".` : 'No recent orders found.'}
          right={
            statusFilter ? (
              <TouchableOpacity onPress={() => setStatusFilter(null)}>
                <Text style={[styles.clearFilter, { color: colors.primary }]}>Clear filter</Text>
              </TouchableOpacity>
            ) : null
          }
        >
          {visibleRecent.map((o, i) => (
            <TouchableOpacity
              key={`${o.order_id}-${i}`}
              style={[styles.row, i > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}
              onPress={() => openOrder(o)}
              activeOpacity={0.7}
            >
              <View style={styles.rowMain}>
                <Text style={[styles.orderId, { color: colors.primary }]} numberOfLines={1}>#{o.order_id}</Text>
                <Text style={[styles.rowTitle, { color: colors.text }]} numberOfLines={1}>{o.customer_name}</Text>
                <Text style={[styles.rowSub, { color: colors.subText }]}>{formatDate(o.order_date)}</Text>
                <View style={styles.pillRow}>
                  {!!o.payment_status && <Pill text={o.payment_status} color={PAYMENT_COLORS[o.payment_status] || '#6B7280'} />}
                  {!!o.status && <Pill text={o.status} color={STATUS_COLORS[o.status] || '#6B7280'} />}
                </View>
              </View>
              <Text style={[styles.rowAmount, { color: colors.text }]}>{formatPeso(o.total_cost)}</Text>
            </TouchableOpacity>
          ))}
        </ChartCard>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  strip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: 16,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 6,
  },
  stripTile: { paddingHorizontal: 12, paddingVertical: 6 },
  stripThird: { width: '33.33%' },
  stripHalf: { width: '50%' },
  stripLabel: { fontSize: 11, fontWeight: '600' },
  stripValue: { fontSize: 16, fontWeight: 'bold', marginTop: 2 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 10 },
  rowMain: { flex: 1, gap: 3 },
  rowRight: { alignItems: 'flex-end' },
  rowTitle: { fontSize: 14, fontWeight: '600' },
  rowSub: { fontSize: 12 },
  rowAmount: { fontSize: 14, fontWeight: 'bold' },
  orderId: { fontSize: 13, fontWeight: 'bold' },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 },
  clearFilter: { fontSize: 13, fontWeight: '700' },
  estimateNote: { fontSize: 12, marginHorizontal: 16, marginTop: 10, lineHeight: 17 },
});
