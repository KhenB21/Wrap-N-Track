import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Alert
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../Context/ThemeContext';
import { useDashboard } from '../../Context/DashboardContext';
import { useInventory } from '../../Context/InventoryContext';
import { useOrders } from '../../Context/OrdersContext';

const { width } = Dimensions.get('window');

export default function DashboardScreen({ navigation }) {
  const theme = useTheme();
  const {
    dashboardData,
    loading,
    error,
    selectedMonth,
    selectedYear,
    fetchDashboardData,
    refreshData,
    clearError,
    formatCurrency,
    formatNumber,
    formatDate,
    formatTime,
    getTrendIndicator,
    getStatusColor
  } = useDashboard();

  const { inventory } = useInventory();
  const { orders } = useOrders();

  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshData();
    setRefreshing(false);
  };

  const handleCardPress = (type) => {
    switch (type) {
      case 'inventory':
        navigation.navigate('Inventory');
        break;
      case 'orders':
        navigation.navigate('Orders');
        break;
      case 'customers':
        navigation.navigate('Customers');
        break;
      case 'suppliers':
        navigation.navigate('Suppliers');
        break;
      case 'reports':
        navigation.navigate('Reports');
        break;
      default:
        break;
    }
  };

  const renderMetricCard = (title, value, icon, color, onPress, subtitle = null) => (
    <TouchableOpacity
      style={[styles.metricCard, { backgroundColor: theme.colors.surface }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.iconContainer, { backgroundColor: color }]}>
          <MaterialCommunityIcons name={icon} size={24} color="#fff" />
        </View>
        <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>
          {title}
        </Text>
      </View>
      <Text style={[styles.cardValue, { color: theme.colors.onSurface }]}>
        {value}
      </Text>
      {subtitle && (
        <Text style={[styles.cardSubtitle, { color: theme.colors.onSurfaceVariant }]}>
          {subtitle}
        </Text>
      )}
    </TouchableOpacity>
  );

  const renderActivityItem = (activity, index) => (
    <View key={index} style={[styles.activityItem, { backgroundColor: theme.colors.surface }]}>
      <View style={styles.activityAvatar}>
        {activity.archived_by_profile_picture ? (
          <MaterialCommunityIcons name="account" size={20} color={theme.colors.primary} />
        ) : (
          <MaterialCommunityIcons name="account-outline" size={20} color={theme.colors.outline} />
        )}
      </View>
      <View style={styles.activityContent}>
        <Text style={[styles.activityText, { color: theme.colors.onSurface }]}>
          <Text style={styles.boldText}>
            {activity.archived_by_name || activity.customer_name || 'Unknown User'}
          </Text>
          {' placed an order: '}
          <Text style={[styles.orderId, { color: theme.colors.primary }]}>
            #{activity.order_id}
          </Text>
        </Text>
        <Text style={[styles.activityTime, { color: theme.colors.onSurfaceVariant }]}>
          {formatTime(activity.order_date)}
        </Text>
      </View>
    </View>
  );

  const renderTopSellingProduct = (product, index) => {
    const colors = ['#4CAF50', '#8BC34A', '#CDDC39', '#FFC107', '#FF9800'];
    const color = colors[index] || '#FF9800';

    return (
      <View key={product.sku} style={[styles.topProductItem, { backgroundColor: theme.colors.surface }]}>
        <View style={[styles.productBar, { backgroundColor: color }]} />
        <View style={styles.productInfo}>
          <Text style={[styles.productName, { color: theme.colors.onSurface }]} numberOfLines={1}>
            {product.name}
          </Text>
          <Text style={[styles.productUnits, { color: theme.colors.onSurfaceVariant }]}>
            {formatNumber(product.units_sold)} units
          </Text>
        </View>
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.colors.background }]}>
        <MaterialCommunityIcons name="loading" size={48} color={theme.colors.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.onBackground }]}>
          Loading dashboard...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.colors.background }]}>
        <MaterialCommunityIcons name="alert-circle" size={48} color={theme.colors.error} />
        <Text style={[styles.errorText, { color: theme.colors.error }]}>
          {error}
        </Text>
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: theme.colors.primary }]}
          onPress={() => {
            clearError();
            fetchDashboardData();
          }}
        >
          <Text style={[styles.retryButtonText, { color: theme.colors.onPrimary }]}>
            Retry
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.primary }]}>
        <Text style={[styles.headerTitle, { color: theme.colors.onPrimary }]}>
          Dashboard
        </Text>
        <Text style={[styles.headerSubtitle, { color: theme.colors.onPrimary }]}>
          {new Date(selectedYear, selectedMonth - 1).toLocaleString('default', { 
            month: 'long', 
            year: 'numeric' 
          })}
        </Text>
      </View>

      {/* Inventory Overview */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
          Inventory Overview
        </Text>
        <View style={styles.metricsGrid}>
          {renderMetricCard(
            'Total Products',
            formatNumber(dashboardData.inventory?.totalProducts || 0),
            'package-variant',
            '#2E7D32',
            () => handleCardPress('inventory')
          )}
          {renderMetricCard(
            'Total Units',
            formatNumber(dashboardData.inventory?.totalUnits || 0),
            'cube-outline',
            '#1976D2',
            () => handleCardPress('inventory')
          )}
          {renderMetricCard(
            'Low Stock',
            formatNumber(dashboardData.inventory?.lowStockProducts || 0),
            'alert-circle',
            '#F57C00',
            () => handleCardPress('inventory')
          )}
          {renderMetricCard(
            'Need Replenishment',
            formatNumber(dashboardData.inventory?.replenishmentPending || 0),
            'alert',
            '#D32F2F',
            () => handleCardPress('inventory')
          )}
        </View>
      </View>

      {/* Sales Overview */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
          Sales Overview
        </Text>
        <View style={styles.metricsGrid}>
          {renderMetricCard(
            'Total Revenue',
            formatCurrency(dashboardData.salesOverview?.totalRevenue || 0),
            'currency-usd',
            '#4CAF50',
            () => handleCardPress('reports')
          )}
          {renderMetricCard(
            'Total Orders',
            formatNumber(dashboardData.salesOverview?.totalOrders || 0),
            'shopping',
            '#2196F3',
            () => handleCardPress('orders')
          )}
          {renderMetricCard(
            'Units Sold',
            formatNumber(dashboardData.salesOverview?.totalUnitsSold || 0),
            'chart-line',
            '#FF9800',
            () => handleCardPress('reports')
          )}
          {renderMetricCard(
            'Total Customers',
            formatNumber(dashboardData.salesOverview?.totalCustomers || 0),
            'account-group',
            '#9C27B0',
            () => handleCardPress('customers')
          )}
        </View>
      </View>

      {/* Sales Activity */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
          Sales Activity
        </Text>
        <View style={styles.activityGrid}>
          <TouchableOpacity
            style={[styles.activityCard, { backgroundColor: '#FFE0B2' }]}
            onPress={() => handleCardPress('orders')}
          >
            <MaterialCommunityIcons name="package-variant-closed" size={32} color="#F57C00" />
            <Text style={styles.activityTitle}>To be Packed</Text>
            <Text style={styles.activityValue}>
              {formatNumber(dashboardData.salesActivity?.toBePack || 0)}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.activityCard, { backgroundColor: '#E3F2FD' }]}
            onPress={() => handleCardPress('orders')}
          >
            <MaterialCommunityIcons name="truck-delivery" size={32} color="#1976D2" />
            <Text style={styles.activityTitle}>To be Shipped</Text>
            <Text style={styles.activityValue}>
              {formatNumber(dashboardData.salesActivity?.toBeShipped || 0)}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.activityCard, { backgroundColor: '#E8F5E8' }]}
            onPress={() => handleCardPress('orders')}
          >
            <MaterialCommunityIcons name="truck" size={32} color="#4CAF50" />
            <Text style={styles.activityTitle}>Out for Delivery</Text>
            <Text style={styles.activityValue}>
              {formatNumber(dashboardData.salesActivity?.outForDelivery || 0)}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Top Selling Products */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
          Top Selling Products
        </Text>
        <View style={[styles.topProductsContainer, { backgroundColor: theme.colors.surface }]}>
          {dashboardData.topSellingProducts?.length > 0 ? (
            dashboardData.topSellingProducts.map((product, index) =>
              renderTopSellingProduct(product, index)
            )
          ) : (
            <Text style={[styles.noDataText, { color: theme.colors.onSurfaceVariant }]}>
              No sales data for this period
            </Text>
          )}
        </View>
      </View>

      {/* Recent Activity */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
          Recent Activity
        </Text>
        <View style={[styles.recentActivityContainer, { backgroundColor: theme.colors.surface }]}>
          {dashboardData.recentActivity?.length > 0 ? (
            dashboardData.recentActivity.map((activity, index) =>
              renderActivityItem(activity, index)
            )
          ) : (
            <Text style={[styles.noDataText, { color: theme.colors.onSurfaceVariant }]}>
              No recent activity found
            </Text>
          )}
        </View>
      </View>
    </ScrollView>
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
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  metricCard: {
    width: (width - 48) / 2,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  cardValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 12,
  },
  activityGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  activityCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  activityTitle: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 8,
    textAlign: 'center',
  },
  activityValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 4,
  },
  topProductsContainer: {
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  topProductItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  productBar: {
    width: 4,
    height: 40,
    borderRadius: 2,
    marginRight: 12,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 14,
    fontWeight: '500',
  },
  productUnits: {
    fontSize: 12,
    marginTop: 2,
  },
  recentActivityContainer: {
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  activityAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    fontSize: 14,
    lineHeight: 20,
  },
  boldText: {
    fontWeight: 'bold',
  },
  orderId: {
    fontWeight: 'bold',
  },
  activityTime: {
    fontSize: 12,
    marginTop: 2,
  },
  noDataText: {
    textAlign: 'center',
    fontSize: 14,
    fontStyle: 'italic',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    marginTop: 16,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});
