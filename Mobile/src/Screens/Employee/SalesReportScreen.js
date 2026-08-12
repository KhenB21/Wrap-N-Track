import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Dimensions,
  RefreshControl
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Card, Chip } from 'react-native-paper';
import { useTheme } from '../../Context/ThemeContext';
import { salesReportsAPI } from '../../services/api';
import { SkeletonStatRow, SkeletonCard, SkeletonText } from '../../Components/Skeleton/Skeleton';

const { width } = Dimensions.get('window');

const EMPTY_OVERVIEW = {
  totalRevenue: 0,
  totalOrders: 0,
  avgOrderValue: 0,
  totalProfit: 0,
  completedOrders: 0,
  pendingOrders: 0,
  cancelledOrders: 0,
  paidAmount: 0,
  outstandingAmount: 0,
  ordersByStatus: {},
  revenueTrend: 'stable',
  ordersTrend: 'stable'
};

// Same period semantics as Website/client/src/Pages/SalesReport/SalesReport.js
// so Mobile and Web agree on what "This Week/Month" means.
const getDateRange = (period) => {
  const today = new Date();
  const startDate = new Date();
  const endDate = new Date();

  switch (period) {
    case 'today':
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      break;
    case 'week':
      startDate.setDate(today.getDate() - 7);
      break;
    case 'month':
      startDate.setDate(today.getDate() - 30);
      break;
    default:
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
  }

  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0]
  };
};

export default function SalesReportScreen() {
  const theme = useTheme();
  const [selectedPeriod, setSelectedPeriod] = useState('today');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [overview, setOverview] = useState(EMPTY_OVERVIEW);
  const [topProducts, setTopProducts] = useState([]);
  const [recentSales, setRecentSales] = useState([]);
  const [hasError, setHasError] = useState(false);

  const periods = [
    { key: 'today', label: 'Today' },
    { key: 'week', label: 'This Week' },
    { key: 'month', label: 'This Month' }
  ];

  const fetchSalesData = useCallback(async () => {
    const { startDate, endDate } = getDateRange(selectedPeriod);
    try {
      const [overviewRes, topProductsRes, recentRes] = await Promise.all([
        salesReportsAPI.getOverview(startDate, endDate),
        salesReportsAPI.getTopProducts(startDate, endDate, 5),
        salesReportsAPI.getRecent(5)
      ]);

      setOverview(overviewRes.success ? overviewRes.data : EMPTY_OVERVIEW);
      setTopProducts(topProductsRes.success ? topProductsRes.data : []);
      setRecentSales(recentRes.success ? recentRes.data : []);
      setHasError(false);
    } catch (error) {
      console.error('Error fetching sales data:', error);
      setHasError(true);
    }
  }, [selectedPeriod]);

  useEffect(() => {
    setLoading(true);
    fetchSalesData().finally(() => setLoading(false));
  }, [fetchSalesData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchSalesData();
    setRefreshing(false);
  };

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount || 0);
  const formatNumber = (num) => new Intl.NumberFormat('en-PH').format(num || 0);
  const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });

  const trendIcon = (trend) => (trend === 'up' ? 'trending-up' : trend === 'down' ? 'trending-down' : 'trending-neutral');
  const trendColor = (trend) => (trend === 'up' ? '#4CAF50' : trend === 'down' ? '#F44336' : theme.colors.onSurfaceVariant);

  const renderMetricCard = (title, value, icon, color, trend = null) => (
    <Card style={[styles.metricCard, { backgroundColor: theme.colors.surface }]}>
      <Card.Content>
        <View style={styles.metricHeader}>
          <View style={[styles.metricIcon, { backgroundColor: color }]}>
            <MaterialCommunityIcons name={icon} size={20} color="#fff" />
          </View>
          <Text style={[styles.metricTitle, { color: theme.colors.onSurface }]} numberOfLines={1}>
            {title}
          </Text>
        </View>
        <Text style={[styles.metricValue, { color: theme.colors.onSurface }]}>{value}</Text>
        {trend && (
          <View style={styles.trendRow}>
            <MaterialCommunityIcons name={trendIcon(trend)} size={14} color={trendColor(trend)} />
            <Text style={[styles.metricSubtitle, { color: trendColor(trend) }]}>{trend}</Text>
          </View>
        )}
      </Card.Content>
    </Card>
  );

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.header, { backgroundColor: theme.colors.primary }]}>
          <View style={{ width: 160, height: 26, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.25)' }} />
          <View style={{ width: 120, height: 14, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.2)', marginTop: 10 }} />
        </View>
        <View style={styles.section}>
          <SkeletonText width={120} height={18} style={{ marginBottom: 16 }} />
          <SkeletonStatRow count={2} style={{ marginBottom: 12 }} />
          <SkeletonStatRow count={2} style={{ marginBottom: 12 }} />
          <SkeletonStatRow count={2} />
        </View>
        <View style={{ paddingHorizontal: 16 }}>
          <SkeletonCard lines={3} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.colors.primary }]}>
          <Text style={[styles.headerTitle, { color: theme.colors.onPrimary }]}>Sales Overview</Text>
          <Text style={[styles.headerSubtitle, { color: theme.colors.onPrimary }]}>Revenue and order analytics</Text>
        </View>

        {hasError && (
          <View style={[styles.errorBanner, { backgroundColor: '#FEE2E2' }]}>
            <MaterialCommunityIcons name="alert-circle" size={18} color="#991B1B" />
            <Text style={styles.errorBannerText}>Some data failed to load. Pull down to retry.</Text>
          </View>
        )}

        {/* Period Selector */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>Time Period</Text>
          <View style={styles.periodContainer}>
            {periods.map((period) => (
              <Chip
                key={period.key}
                selected={selectedPeriod === period.key}
                onPress={() => setSelectedPeriod(period.key)}
                style={styles.periodChip}
              >
                {period.label}
              </Chip>
            ))}
          </View>
        </View>

        {/* Metrics */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>Key Metrics</Text>
          <View style={styles.metricsGrid}>
            {renderMetricCard('Total Sales', formatCurrency(overview.totalRevenue), 'currency-usd', '#4CAF50', overview.revenueTrend)}
            {renderMetricCard('Total Orders', formatNumber(overview.totalOrders), 'shopping', '#2196F3', overview.ordersTrend)}
            {renderMetricCard('Avg Order Value', formatCurrency(overview.avgOrderValue), 'chart-line', '#FF9800')}
            {renderMetricCard('Completed', formatNumber(overview.completedOrders), 'check-circle', '#10B981')}
            {renderMetricCard('Pending', formatNumber(overview.pendingOrders), 'clock-outline', '#F59E0B')}
            {renderMetricCard('Cancelled', formatNumber(overview.cancelledOrders), 'close-circle', '#EF4444')}
            {renderMetricCard('Paid Amount', formatCurrency(overview.paidAmount), 'check-decagram', '#16A34A')}
            {renderMetricCard('Outstanding', formatCurrency(overview.outstandingAmount), 'timer-sand', '#DC2626')}
          </View>
        </View>

        {/* Top Products */}
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Top Products</Text>
            {topProducts.length === 0 ? (
              <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>No product sales in this period.</Text>
            ) : (
              topProducts.map((product) => (
                <View key={product.sku} style={styles.productItem}>
                  <View style={styles.productInfo}>
                    <Text style={[styles.productName, { color: theme.colors.onSurface }]}>{product.name}</Text>
                    <Text style={[styles.productOrders, { color: theme.colors.onSurfaceVariant }]}>
                      {formatNumber(product.units_sold)} units sold
                    </Text>
                  </View>
                  <Text style={[styles.productRevenue, { color: theme.colors.onSurface }]}>
                    {formatCurrency(product.sales_value)}
                  </Text>
                </View>
              ))
            )}
          </Card.Content>
        </Card>

        {/* Recent Sales */}
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Recent Sales</Text>
            {recentSales.length === 0 ? (
              <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>No recent orders found.</Text>
            ) : (
              recentSales.map((order) => (
                <View key={order.order_id} style={styles.orderItem}>
                  <View style={styles.orderInfo}>
                    <Text style={[styles.orderId, { color: theme.colors.primary }]}>#{order.order_id}</Text>
                    <Text style={[styles.customerName, { color: theme.colors.onSurface }]}>{order.customer_name}</Text>
                    <Text style={[styles.orderDate, { color: theme.colors.onSurfaceVariant }]}>
                      {formatDate(order.order_date)} · {order.payment_status}
                    </Text>
                  </View>
                  <Text style={[styles.orderAmount, { color: theme.colors.onSurface }]}>
                    {formatCurrency(order.total_cost)}
                  </Text>
                </View>
              ))
            )}
          </Card.Content>
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 16, marginTop: 16 },
  scrollView: { flex: 1 },
  header: { padding: 20, paddingTop: 40 },
  headerTitle: { fontSize: 28, fontWeight: 'bold' },
  headerSubtitle: { fontSize: 16, marginTop: 4 },
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 16, marginTop: 12, padding: 12, borderRadius: 8,
  },
  errorBannerText: { color: '#991B1B', fontSize: 13, flex: 1 },
  section: { padding: 16 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  periodContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  periodChip: { marginRight: 8, marginBottom: 8 },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  metricCard: {
    width: (width - 48) / 2,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  metricHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  metricIcon: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  metricTitle: { fontSize: 13, fontWeight: '500', flex: 1 },
  metricValue: { fontSize: 20, fontWeight: 'bold', marginBottom: 4 },
  trendRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metricSubtitle: { fontSize: 12 },
  card: {
    marginHorizontal: 16, marginBottom: 16,
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4,
  },
  emptyText: { fontSize: 13, fontStyle: 'italic', textAlign: 'center', paddingVertical: 12 },
  productItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  productInfo: { flex: 1 },
  productName: { fontSize: 16, fontWeight: '500', marginBottom: 4 },
  productOrders: { fontSize: 12 },
  productRevenue: { fontSize: 16, fontWeight: 'bold' },
  orderItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  orderInfo: { flex: 1 },
  orderId: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  customerName: { fontSize: 14, marginBottom: 2 },
  orderDate: { fontSize: 12 },
  orderAmount: { fontSize: 16, fontWeight: 'bold' },
});
