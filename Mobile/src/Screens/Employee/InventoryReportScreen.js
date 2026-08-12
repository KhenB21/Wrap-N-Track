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
import { Card } from 'react-native-paper';
import { useTheme } from '../../Context/ThemeContext';
import { inventoryReportsAPI } from '../../services/api';
import { SkeletonStatRow, SkeletonCard, SkeletonText } from '../../Components/Skeleton/Skeleton';

const { width } = Dimensions.get('window');

export default function InventoryReportScreen() {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [summary, setSummary] = useState({
    total_skus: 0,
    total_value: 0,
    avg_item_value: 0,
    low_stock_count: 0,
    expiring_count: 0
  });
  const [categoryBreakdown, setCategoryBreakdown] = useState([]);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [outOfStockCount, setOutOfStockCount] = useState(0);

  const fetchInventoryReport = useCallback(async () => {
    try {
      const [summaryRes, categoryRes, lowStockRes] = await Promise.all([
        inventoryReportsAPI.getSummary(),
        inventoryReportsAPI.getCategoryBreakdown(),
        inventoryReportsAPI.getLowStock()
      ]);

      setSummary(summaryRes.success ? summaryRes.data : summary);
      setCategoryBreakdown(categoryRes.success ? categoryRes.data.slice(0, 5) : []);

      // The /low-stock endpoint lumps zero-quantity items in with low-stock
      // (same semantics as the reorder_level comparison it uses), so split
      // out-of-stock out here for an accurate distinct KPI — same approach as
      // the Web Inventory Report's outOfStockItems fix.
      const allLowStock = lowStockRes.success ? lowStockRes.data : [];
      setOutOfStockCount(allLowStock.filter(p => Number(p.quantity) <= 0).length);
      setLowStockProducts(allLowStock.slice(0, 8));
      setHasError(false);
    } catch (error) {
      console.error('Error loading inventory report:', error);
      setHasError(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchInventoryReport().finally(() => setLoading(false));
  }, [fetchInventoryReport]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchInventoryReport();
    setRefreshing(false);
  };

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount || 0);
  const formatNumber = (num) => new Intl.NumberFormat('en-PH').format(num || 0);

  const getStockLevelColor = (current, reorder) => {
    if (current <= 0) return '#F44336';
    if (current <= reorder * 0.5) return '#FF9800';
    return '#FFC107';
  };

  const getStockLevelText = (current) => (current <= 0 ? 'Out of Stock' : 'Low Stock');

  const renderMetricCard = (title, value, icon, color, subtitle = null) => (
    <Card style={[styles.metricCard, { backgroundColor: theme.colors.surface }]}>
      <Card.Content>
        <View style={styles.metricHeader}>
          <View style={[styles.metricIcon, { backgroundColor: color }]}>
            <MaterialCommunityIcons name={icon} size={22} color="#fff" />
          </View>
          <Text style={[styles.metricTitle, { color: theme.colors.onSurface }]} numberOfLines={1}>{title}</Text>
        </View>
        <Text style={[styles.metricValue, { color: theme.colors.onSurface }]}>{value}</Text>
        {subtitle && <Text style={[styles.metricSubtitle, { color: theme.colors.onSurfaceVariant }]}>{subtitle}</Text>}
      </Card.Content>
    </Card>
  );

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.section}>
          <SkeletonText width={140} height={18} style={{ marginBottom: 16 }} />
          <SkeletonStatRow count={2} style={{ marginBottom: 12 }} />
          <SkeletonStatRow count={2} style={{ marginBottom: 12 }} />
          <SkeletonStatRow count={1} />
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
          <Text style={[styles.headerTitle, { color: theme.colors.onPrimary }]}>Inventory Report</Text>
          <Text style={[styles.headerSubtitle, { color: theme.colors.onPrimary }]}>Stock levels and category breakdown</Text>
        </View>

        {hasError && (
          <View style={styles.errorBanner}>
            <MaterialCommunityIcons name="alert-circle" size={18} color="#991B1B" />
            <Text style={styles.errorBannerText}>Some data failed to load. Pull down to retry.</Text>
          </View>
        )}

        {/* Metrics */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>Key Metrics</Text>
          <View style={styles.metricsGrid}>
            {renderMetricCard('Total Products', formatNumber(summary.total_skus), 'package-variant', '#2196F3', 'Items in inventory')}
            {renderMetricCard('Total Value', formatCurrency(summary.total_value), 'currency-usd', '#4CAF50', 'Inventory worth')}
            {renderMetricCard('Low Stock', formatNumber(Math.max(0, summary.low_stock_count - outOfStockCount)), 'alert-circle', '#FF9800', 'Need restocking')}
            {renderMetricCard('Out of Stock', formatNumber(outOfStockCount), 'alert', '#F44336', 'Unavailable now')}
            {renderMetricCard('Expiring Soon', formatNumber(summary.expiring_count), 'clock-alert', '#9C27B0', 'Within 30 days')}
          </View>
        </View>

        {/* Category Breakdown */}
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Top Categories</Text>
            {categoryBreakdown.length === 0 ? (
              <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>No category data available.</Text>
            ) : (
              categoryBreakdown.map((category) => (
                <View key={category.category} style={styles.categoryItem}>
                  <View style={styles.categoryInfo}>
                    <Text style={[styles.categoryName, { color: theme.colors.onSurface }]}>{category.category}</Text>
                    <Text style={[styles.categoryCount, { color: theme.colors.onSurfaceVariant }]}>
                      {formatNumber(category.item_count)} products
                    </Text>
                  </View>
                  <Text style={[styles.categoryValue, { color: theme.colors.onSurface }]}>
                    {formatCurrency(category.total_value)}
                  </Text>
                </View>
              ))
            )}
          </Card.Content>
        </Card>

        {/* Low Stock / Out of Stock Products */}
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Low Stock &amp; Out of Stock</Text>
            {lowStockProducts.length === 0 ? (
              <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>All products are sufficiently stocked.</Text>
            ) : (
              lowStockProducts.map((product) => {
                const current = Number(product.quantity) || 0;
                const reorder = Number(product.calculated_reorder_level) || 1;
                const stockColor = getStockLevelColor(current, reorder);
                const stockText = getStockLevelText(current);
                return (
                  <View key={product.sku} style={styles.productItem}>
                    <View style={styles.productInfo}>
                      <Text style={[styles.productName, { color: theme.colors.onSurface }]}>{product.name}</Text>
                      <Text style={[styles.productSku, { color: theme.colors.onSurfaceVariant }]}>SKU: {product.sku}</Text>
                      <Text style={[styles.productStock, { color: stockColor }]}>
                        {formatNumber(current)} / {formatNumber(reorder)} units
                      </Text>
                    </View>
                    <View style={[styles.stockBadge, { backgroundColor: stockColor }]}>
                      <Text style={styles.stockBadgeText}>{stockText}</Text>
                    </View>
                  </View>
                );
              })
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
    marginHorizontal: 16, marginTop: 12, padding: 12, borderRadius: 8, backgroundColor: '#FEE2E2',
  },
  errorBannerText: { color: '#991B1B', fontSize: 13, flex: 1 },
  section: { padding: 16 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
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
  metricSubtitle: { fontSize: 12 },
  card: {
    marginHorizontal: 16, marginBottom: 16,
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4,
  },
  emptyText: { fontSize: 13, fontStyle: 'italic', textAlign: 'center', paddingVertical: 12 },
  categoryItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  categoryInfo: { flex: 1 },
  categoryName: { fontSize: 16, fontWeight: '500', marginBottom: 4 },
  categoryCount: { fontSize: 12 },
  categoryValue: { fontSize: 16, fontWeight: 'bold' },
  productItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  productInfo: { flex: 1 },
  productName: { fontSize: 16, fontWeight: '500', marginBottom: 4 },
  productSku: { fontSize: 12, marginBottom: 2 },
  productStock: { fontSize: 14, fontWeight: '500' },
  stockBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  stockBadgeText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
});
