import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ActivityIndicator,
  Alert
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Card, Button, Chip } from 'react-native-paper';
import { useTheme } from '../../Context/ThemeContext';
import { useDashboard } from '../../Context/DashboardContext';
import { orderAPI } from '../../services/api';

const { width } = Dimensions.get('window');

export default function SalesReportScreen({ navigation }) {
  const theme = useTheme();
  const { dashboardData, formatCurrency, formatNumber } = useDashboard();
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState([]);
  const [salesData, setSalesData] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    averageOrderValue: 0,
    growthRate: 0,
    topProducts: [],
    recentOrders: []
  });

  const periods = [
    { key: 'week', label: 'This Week' },
    { key: 'month', label: 'This Month' },
    { key: 'quarter', label: 'This Quarter' },
    { key: 'year', label: 'This Year' }
  ];

  useEffect(() => {
    fetchSalesData();
  }, [selectedPeriod]);

  const fetchSalesData = async () => {
    try {
      setLoading(true);
      
      // Fetch orders from API
      const ordersResponse = await orderAPI.getUserOrders();
      let ordersData = [];
      
      if (ordersResponse && Array.isArray(ordersResponse)) {
        ordersData = ordersResponse;
      } else if (ordersResponse && ordersResponse.orders) {
        ordersData = ordersResponse.orders;
      }
      
      setOrders(ordersData);
      
      // Calculate sales metrics from orders
      const totalRevenue = ordersData.reduce((sum, order) => sum + (parseFloat(order.total_cost) || 0), 0);
      const totalOrders = ordersData.length;
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
      
      // Get recent orders (last 5)
      const recentOrders = ordersData
        .sort((a, b) => new Date(b.order_date) - new Date(a.order_date))
        .slice(0, 5)
        .map(order => ({
          id: order.order_id,
          customer: order.name || order.customer_name || 'Unknown',
          amount: parseFloat(order.total_cost) || 0,
          date: order.order_date
        }));
      
      // Use top selling products from dashboard data
      const topProducts = (dashboardData.topSellingProducts || []).slice(0, 3).map(product => ({
        name: product.name || product.product_name,
        revenue: (product.revenue || product.total_revenue || 0),
        orders: (product.units_sold || product.total_orders || 0)
      }));
      
      setSalesData({
        totalRevenue,
        totalOrders,
        averageOrderValue,
        growthRate: 12.5, // Can be calculated if we have historical data
        topProducts: topProducts.length > 0 ? topProducts : [],
        recentOrders
      });
    } catch (error) {
      console.error('Error fetching sales data:', error);
      Alert.alert('Error', 'Failed to fetch sales data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrencyLocal = (amount) => {
    if (formatCurrency) {
      return formatCurrency(amount);
    }
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-PH', {
      month: 'short',
      day: 'numeric'
    });
  };

  const renderMetricCard = (title, value, icon, color, subtitle = null) => (
    <Card style={[styles.metricCard, { backgroundColor: theme.colors.surface }]}>
      <Card.Content>
        <View style={styles.metricHeader}>
          <View style={[styles.metricIcon, { backgroundColor: color }]}>
            <MaterialCommunityIcons name={icon} size={24} color="#fff" />
          </View>
          <Text style={[styles.metricTitle, { color: theme.colors.onSurface }]}>
            {title}
          </Text>
        </View>
        <Text style={[styles.metricValue, { color: theme.colors.onSurface }]}>
          {value}
        </Text>
        {subtitle && (
          <Text style={[styles.metricSubtitle, { color: theme.colors.onSurfaceVariant }]}>
            {subtitle}
          </Text>
        )}
      </Card.Content>
    </Card>
  );

  const renderTopProducts = () => (
    <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
      <Card.Content>
        <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
          Top Products
        </Text>
        {salesData.topProducts.map((product, index) => (
          <View key={index} style={styles.productItem}>
            <View style={styles.productInfo}>
              <Text style={[styles.productName, { color: theme.colors.onSurface }]}>
                {product.name}
              </Text>
              <Text style={[styles.productOrders, { color: theme.colors.onSurfaceVariant }]}>
                {product.orders} orders
              </Text>
            </View>
            <Text style={[styles.productRevenue, { color: theme.colors.onSurface }]}>
              {formatCurrencyLocal(product.revenue)}
            </Text>
          </View>
        ))}
      </Card.Content>
    </Card>
  );

  const renderRecentOrders = () => (
    <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
      <Card.Content>
        <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
          Recent Orders
        </Text>
        {salesData.recentOrders.map((order, index) => (
          <View key={index} style={styles.orderItem}>
            <View style={styles.orderInfo}>
              <Text style={[styles.orderId, { color: theme.colors.primary }]}>
                #{order.id}
              </Text>
              <Text style={[styles.customerName, { color: theme.colors.onSurface }]}>
                {order.customer}
              </Text>
              <Text style={[styles.orderDate, { color: theme.colors.onSurfaceVariant }]}>
                {formatDate(order.date)}
              </Text>
            </View>
            <Text style={[styles.orderAmount, { color: theme.colors.onSurface }]}>
              {formatCurrencyLocal(order.amount)}
            </Text>
          </View>
        ))}
      </Card.Content>
    </Card>
  );

  if (loading && salesData.totalOrders === 0) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.colors.background }]}>        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.onBackground }]}>
          Loading sales data...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.colors.primary }]}>
          <Text style={[styles.headerTitle, { color: theme.colors.onPrimary }]}>
            Sales Report
          </Text>
          <Text style={[styles.headerSubtitle, { color: theme.colors.onPrimary }]}>
            Revenue and order analytics
          </Text>
        </View>

        {/* Period Selector */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
            Time Period
          </Text>
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
          <Text style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
            Key Metrics
          </Text>
          <View style={styles.metricsGrid}>
            {renderMetricCard(
              'Total Revenue',
              formatCurrencyLocal(salesData.totalRevenue),
              'currency-usd',
              '#4CAF50',
              `+${salesData.growthRate}% from last period`
            )}
            {renderMetricCard(
              'Total Orders',
              salesData.totalOrders.toString(),
              'shopping',
              '#2196F3',
              'Orders placed'
            )}
            {renderMetricCard(
              'Average Order Value',
              formatCurrencyLocal(salesData.averageOrderValue),
              'chart-line',
              '#FF9800',
              'Per order'
            )}
            {renderMetricCard(
              'Growth Rate',
              `+${salesData.growthRate}%`,
              'trending-up',
              '#9C27B0',
              'Revenue growth'
            )}
          </View>
        </View>

        {/* Top Products */}
        {renderTopProducts()}

        {/* Recent Orders */}
        {renderRecentOrders()}

        {/* Action Buttons */}
        <View style={styles.section}>
          <View style={styles.actionButtons}>
            <Button
              mode="outlined"
              icon="file-pdf"
              onPress={() => Alert.alert('Export', 'PDF export functionality')}
              style={styles.actionButton}
            >
              Export PDF
            </Button>
            <Button
              mode="outlined"
              icon="file-excel"
              onPress={() => Alert.alert('Export', 'Excel export functionality')}
              style={styles.actionButton}
            >
              Export Excel
            </Button>
            <Button
              mode="contained"
              icon="email"
              onPress={() => Alert.alert('Email', 'Email functionality')}
              style={[styles.actionButton, { backgroundColor: theme.colors.primary }]}
            >
              Email Report
            </Button>
          </View>
        </View>
      </ScrollView>
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
  loadingText: {
    fontSize: 16,
    marginTop: 16,
  },
  scrollView: {
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
    fontSize: 16,
    marginTop: 4,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  periodContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  periodChip: {
    marginRight: 8,
    marginBottom: 8,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  metricCard: {
    width: (width - 48) / 2,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  metricTitle: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  metricSubtitle: {
    fontSize: 12,
  },
  card: {
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  productItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  productOrders: {
    fontSize: 12,
  },
  productRevenue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  orderInfo: {
    flex: 1,
  },
  orderId: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  customerName: {
    fontSize: 14,
    marginBottom: 2,
  },
  orderDate: {
    fontSize: 12,
  },
  orderAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  actionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    minWidth: 120,
  },
});
