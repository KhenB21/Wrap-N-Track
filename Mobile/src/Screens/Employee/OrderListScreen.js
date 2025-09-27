import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
  Modal,
  Dimensions,
  TextInput
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Button } from 'react-native-paper';
import { useTheme } from '../../Context/ThemeContext';
import { useOrders } from '../../Context/OrdersContext';
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');

// Custom Chip component
const CustomChip = ({ icon, children, style, iconColor = '#fff' }) => (
  <View style={[styles.customChip, style]}>
    {icon && <MaterialCommunityIcons name={icon} size={16} color={iconColor} style={styles.chipIcon} />}
    <Text style={[styles.chipText, { color: iconColor }]}>{children}</Text>
  </View>
);

export default function OrderListScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const {
    orders,
    loading,
    error,
    loadOrders,
    clearError
  } = useOrders();

  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({ status: 'all' });
  const [filteredOrders, setFilteredOrders] = useState([]);

  useEffect(() => {
    loadOrders();
  }, []);

  // Filter orders based on search query and filters
  useEffect(() => {
    if (!orders) return;
    
    let filtered = [...orders];
    
    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(order => 
        order.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.order_id?.toString().includes(searchQuery)
      );
    }
    
    // Apply status filter
    if (filters.status && filters.status !== 'all') {
      filtered = filtered.filter(order => 
        (order?.status || '').toLowerCase().replace(' ', '_') === filters.status
      );
    }
    
    setFilteredOrders(filtered);
  }, [orders, searchQuery, filters]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadOrders();
    setRefreshing(false);
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
  };

  const handleFilter = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  const getStatusColor = (status) => {
    const statusColors = {
      'Order Placed': '#17a2b8',
      'Order Paid': '#28a745',
      'To Be Packed': '#ffc107',
      'Order Shipped Out': '#007bff',
      'Ready for Delivery': '#6f42c1',
      'Order Received': '#20c997',
      'Completed': '#28a745',
      'Cancelled': '#dc3545'
    };
    return statusColors[status] || '#6c757d';
  };

  const getStatusIcon = (status) => {
    const statusIcons = {
      'Order Placed': 'clipboard-text',
      'Order Paid': 'credit-card',
      'To Be Packed': 'package-variant-closed',
      'Order Shipped Out': 'truck-delivery',
      'Ready for Delivery': 'truck',
      'Order Received': 'check-circle',
      'Completed': 'check-circle',
      'Cancelled': 'close-circle'
    };
    return statusIcons[status] || 'help-circle';
  };

  const handleOrderPress = (order) => {
    navigation.navigate('OrderDetail', { order });
  };

  const handleStatusUpdate = (order) => {
    navigation.navigate('OrderStatusUpdate', { order });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const renderOrderItem = ({ item }) => {
    if (!item) return null;
    
    const status = item?.status || 'Unknown';
    const statusColor = getStatusColor(status);
    const statusIcon = getStatusIcon(status);

    return (
      <TouchableOpacity
        style={[styles.orderCard, { backgroundColor: theme.colors.surface }]}
        onPress={() => handleOrderPress(item)}
      >
        <View style={styles.orderHeader}>
          <View style={styles.orderInfo}>
            <Text style={[styles.orderId, { color: theme.colors.primary }]}>
              #{item.order_id}
            </Text>
            <Text style={[styles.customerName, { color: theme.colors.onSurface }]}>
              {item.customer_name}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <MaterialCommunityIcons name={statusIcon} size={16} color="#fff" />
            <Text style={styles.statusText}>{status}</Text>
          </View>
        </View>

        <View style={styles.orderDetails}>
          <View style={styles.detailRow}>
            <MaterialCommunityIcons name="calendar" size={16} color={theme.colors.onSurfaceVariant} />
            <Text style={[styles.detailText, { color: theme.colors.onSurfaceVariant }]}>
              {formatDate(item.order_date)}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <MaterialCommunityIcons name="currency-usd" size={16} color={theme.colors.onSurfaceVariant} />
            <Text style={[styles.detailText, { color: theme.colors.onSurfaceVariant }]}>
              {formatCurrency(item.total_cost)}
            </Text>
          </View>
          {item.payment_method && (
            <View style={styles.detailRow}>
              <MaterialCommunityIcons name="credit-card" size={16} color={theme.colors.onSurfaceVariant} />
              <Text style={[styles.detailText, { color: theme.colors.onSurfaceVariant }]}>
                {item.payment_method}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.orderActions}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => handleOrderPress(item)}
          >
            <MaterialCommunityIcons name="eye" size={16} color="#fff" />
            <Text style={styles.actionButtonText}>View</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#FF9800' }]}
            onPress={() => handleStatusUpdate(item)}
          >
            <MaterialCommunityIcons name="pencil" size={16} color="#fff" />
            <Text style={styles.actionButtonText}>Update</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderFilterModal = () => (
    <Modal
      visible={showFilters}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowFilters(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.colors.onSurface }]}>
              Filter Orders
            </Text>
            <TouchableOpacity onPress={() => setShowFilters(false)}>
              <MaterialCommunityIcons name="close" size={24} color={theme.colors.onSurface} />
            </TouchableOpacity>
          </View>

          <View style={styles.filterSection}>
            <Text style={[styles.filterSectionTitle, { color: theme.colors.onSurface }]}>
              Status
            </Text>
            <View style={styles.chipContainer}>
              {[
                'All Orders', 'Order Placed', 'Order Paid', 'To Be Packed',
                'Order Shipped Out', 'Ready for Delivery', 'Order Received', 'Completed', 'Cancelled'
              ].map((status) => (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.filterChip,
                    { 
                      backgroundColor: filters.status === status.toLowerCase().replace(' ', '_') 
                        ? theme.colors.primary 
                        : theme.colors.surface,
                      borderColor: theme.colors.outline,
                      borderWidth: 1
                    }
                  ]}
                  onPress={() => handleFilter('status', status === 'All Orders' ? 'all' : status)}
                >
                  <Text style={[
                    styles.filterChipText,
                    { 
                      color: filters.status === status.toLowerCase().replace(' ', '_') 
                        ? '#fff' 
                        : theme.colors.onSurface 
                    }
                  ]}>
                    {status}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.filterSection}>
            <Text style={[styles.filterSectionTitle, { color: theme.colors.onSurface }]}>
              Date Range
            </Text>
            <View style={styles.dateFilterContainer}>
              <Button
                mode="outlined"
                onPress={() => handleFilter('dateRange', 'today')}
                style={styles.dateButton}
              >
                Today
              </Button>
              <Button
                mode="outlined"
                onPress={() => handleFilter('dateRange', 'week')}
                style={styles.dateButton}
              >
                This Week
              </Button>
              <Button
                mode="outlined"
                onPress={() => handleFilter('dateRange', 'month')}
                style={styles.dateButton}
              >
                This Month
              </Button>
            </View>
          </View>

          <View style={styles.modalActions}>
            <Button
              mode="outlined"
              onPress={() => {
                filterOrders('status', 'all');
                filterOrders('dateRange', 'all');
                setShowFilters(false);
              }}
              style={styles.clearButton}
            >
              Clear All
            </Button>
            <Button
              mode="contained"
              onPress={() => setShowFilters(false)}
              style={styles.applyButton}
            >
              Apply Filters
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialCommunityIcons name="shopping" size={64} color={theme.colors.outline} />
      <Text style={[styles.emptyTitle, { color: theme.colors.onSurface }]}>
        No Orders Found
      </Text>
      <Text style={[styles.emptySubtitle, { color: theme.colors.onSurfaceVariant }]}>
        {searchQuery || filters.status !== 'all' 
          ? 'Try adjusting your search or filters'
          : 'No orders have been placed yet'
        }
      </Text>
    </View>
  );

  const renderStats = () => {
    const ordersList = orders || [];
    const stats = {
      total: ordersList.length,
      placed: ordersList.filter(o => (o?.status || '') === 'Order Placed').length,
      paid: ordersList.filter(o => (o?.status || '') === 'Order Paid').length,
      packed: ordersList.filter(o => (o?.status || '') === 'To Be Packed').length,
      shipped: ordersList.filter(o => (o?.status || '') === 'Order Shipped Out').length,
      delivered: ordersList.filter(o => (o?.status || '') === 'Ready for Delivery').length,
      completed: ordersList.filter(o => (o?.status || '') === 'Completed').length,
      cancelled: ordersList.filter(o => (o?.status || '') === 'Cancelled').length
    };

    return (
      <View style={styles.statsContainer}>
        <CustomChip icon="shopping" style={styles.statChip}>
          Total: {stats.total}
        </CustomChip>
        <CustomChip icon="clipboard-text" style={[styles.statChip, { backgroundColor: '#17a2b8' }]}>
          Placed: {stats.placed}
        </CustomChip>
        <CustomChip icon="credit-card" style={[styles.statChip, { backgroundColor: '#28a745' }]}>
          Paid: {stats.paid}
        </CustomChip>
        <CustomChip icon="package-variant-closed" style={[styles.statChip, { backgroundColor: '#ffc107' }]}>
          Packed: {stats.packed}
        </CustomChip>
        <CustomChip icon="truck-delivery" style={[styles.statChip, { backgroundColor: '#007bff' }]}>
          Shipped: {stats.shipped}
        </CustomChip>
        <CustomChip icon="check-circle" style={[styles.statChip, { backgroundColor: '#20c997' }]}>
          Completed: {stats.completed}
        </CustomChip>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
        <TextInput
          placeholder="Search orders..."
          onChangeText={handleSearch}
          value={searchQuery}
          style={[styles.searchBar, { backgroundColor: theme.colors.surface, color: theme.colors.onSurface }]}
          placeholderTextColor={theme.colors.placeholder}
        />
        <TouchableOpacity
          style={[styles.filterButton, { backgroundColor: theme.colors.primary }]}
          onPress={() => setShowFilters(true)}
        >
          <MaterialCommunityIcons name="filter" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Stats */}
      {renderStats()}

      {/* Order List */}
      <FlatList
        data={filteredOrders || []}
        renderItem={renderOrderItem}
        keyExtractor={(item) => item?.order_id?.toString() || Math.random().toString()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />

      {/* Filter Modal */}
      {renderFilterModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  searchBar: {
    flex: 1,
    marginRight: 12,
  },
  filterButton: {
    padding: 12,
    borderRadius: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 8,
  },
  statChip: {
    marginRight: 8,
    marginBottom: 8,
  },
  customChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#696a8f',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  chipIcon: {
    marginRight: 4,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 80,
  },
  orderCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderInfo: {
    flex: 1,
  },
  orderId: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '500',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  orderDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailText: {
    fontSize: 14,
    marginLeft: 8,
  },
  orderActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  filterSection: {
    marginBottom: 20,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    marginRight: 8,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  dateFilterContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  dateButton: {
    flex: 1,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  clearButton: {
    flex: 1,
    marginRight: 8,
  },
  applyButton: {
    flex: 1,
    marginLeft: 8,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
});
