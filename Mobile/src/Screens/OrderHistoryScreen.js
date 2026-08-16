import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import Header from "../Components/Header";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { customerOrderAPI } from "../services/api";
import { useTheme } from "../Context/ThemeContext";
import { SkeletonCard } from "../Components/Skeleton/Skeleton";

// `field: 'status'` filters use the order's own status (the Pending/To Be Packed/
// Ready for Delivery/Cancelled Kanban stages). `field: 'delivery_status'` filters
// use the separate delivery_status column (e.g. Awaiting Pick-up), since that
// value never appears on the order's own status.
const STATUS_FILTERS = [
  { key: 'all', label: 'All', field: 'status' },
  { key: 'pending', label: 'Pending', field: 'status' },
  { key: 'tobepacked', label: 'To Be Packed', field: 'status' },
  { key: 'readyfordelivery', label: 'Ready for Delivery', field: 'status' },
  { key: 'awaitingpickup', label: 'Awaiting for Pickup', field: 'delivery_status' },
  { key: 'cancelled', label: 'Cancelled', field: 'status' },
];

// Buckets the order's own status (not delivery_status) into one of the filters above.
const normalizeOrderStatus = (status) => {
  const normalized = (status || '').toLowerCase().replace(/\s+/g, '').replace(/-/g, '');
  if (normalized === 'pending' || normalized === 'orderplaced') return 'pending';
  if (normalized === 'tobepacked' || normalized === 'tobepack') return 'tobepacked';
  if (normalized === 'readyfordelivery' || normalized === 'confirmed') return 'readyfordelivery';
  if (normalized === 'cancelled') return 'cancelled';
  return normalized;
};

const normalizeDeliveryStatus = (status) => (
  (status || '').toLowerCase().replace(/\s+/g, '').replace(/-/g, '')
);

export default function OrderHistoryScreen({ navigation }) {
  const { darkMode } = useTheme();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  useEffect(() => {
    fetchMyOrders();
  }, []);

  const fetchMyOrders = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const data = await customerOrderAPI.getMyOrders();
      setOrders(Array.isArray(data) ? data : (data.orders || []));
    } catch (error) {
      console.error("Error loading deliveries:", error);
      if (error.response?.status === 401) {
        setErrorMessage("Your session has expired. Please log in again.");
      } else if (!error.response) {
        setErrorMessage("Couldn't reach the server. Check your connection and try again.");
      } else {
        setErrorMessage("We couldn't load your deliveries right now. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchMyOrders();
    } catch (error) {
      console.error("Error refreshing deliveries:", error);
    } finally {
      setRefreshing(false);
    }
  };

  // Delivery status (not order status) is what the customer cares about most
  // of the time — reuses the same `delivery_status` field the website's
  // DeliveryTracking page shows. But delivery_status has no "To Be Packed"
  // state (that only exists on the order's own status), so once staff move
  // an order to To Be Packed, show that instead of the stale "Pending"
  // delivery_status.
  const getDisplayStatus = (item) => {
    if (normalizeOrderStatus(item.status) === 'tobepacked') return 'To Be Packed';
    return item.delivery_status || 'Pending';
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return '#FFA726';
      case 'to be packed':
        return '#FFCA28';
      case 'preparing':
      case 'ready for delivery':
        return '#42A5F5';
      case 'awaiting pick-up':
      case 'out for delivery':
        return '#AB47BC';
      case 'sent / shipped':
        return '#66BB6A';
      case 'delivered':
      case 'picked up':
        return '#4CAF50';
      case 'failed delivery':
      case 'cancelled':
        return '#EF5350';
      default:
        return darkMode ? '#B0B3B8' : '#6B6593';
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return 'clock-outline';
      case 'to be packed':
        return 'package-variant';
      case 'preparing':
      case 'ready for delivery':
        return 'package-variant-closed';
      case 'awaiting pick-up':
        return 'account-clock-outline';
      case 'out for delivery':
      case 'sent / shipped':
        return 'truck-outline';
      case 'delivered':
      case 'picked up':
        return 'check-circle';
      case 'failed delivery':
      case 'cancelled':
        return 'close-circle-outline';
      default:
        return 'help-circle-outline';
    }
  };

  const filteredOrders = statusFilter === 'all'
    ? orders
    : orders.filter((order) => (
        STATUS_FILTERS.find((f) => f.key === statusFilter)?.field === 'delivery_status'
          ? normalizeDeliveryStatus(order.delivery_status) === statusFilter
          : normalizeOrderStatus(order.status) === statusFilter
      ));

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderOrderItem = ({ item }) => {
    const displayStatus = getDisplayStatus(item);
    return (
    <TouchableOpacity
      style={[
        styles.orderCard,
        {
          backgroundColor: darkMode ? "#242526" : "#fff",
          borderColor: darkMode ? "#393A3B" : "#EDECF3",
        }
      ]}
      onPress={() => navigation.navigate("OrderTracking", { orderId: item.order_id || item.id })}
    >
      <View style={styles.orderHeader}>
        <View style={styles.orderInfo}>
          <Text style={[styles.orderId, { color: darkMode ? "#E4E6EB" : "#222" }]}>
            Order #{item.order_id || item.id}
          </Text>
          <Text style={[styles.orderDate, { color: darkMode ? "#B0B3B8" : "#6B6593" }]}>
            {formatDate(item.order_date || item.created_at)}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(displayStatus) }]}>
          <Text style={styles.statusText}>
            {displayStatus.toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={styles.orderItems}>
        <Text style={[styles.itemsLabel, { color: darkMode ? "#B0B3B8" : "#6B6593" }]}>
          Items ({item.products?.length || 0}):
        </Text>
        {item.products?.slice(0, 2).map((orderItem, index) => (
          <Text key={index} style={[styles.itemName, { color: darkMode ? "#E4E6EB" : "#222" }]}>
            • {orderItem.name} (Qty: {orderItem.quantity})
          </Text>
        ))}
        {item.products?.length > 2 && (
          <Text style={[styles.moreItems, { color: darkMode ? "#B0B3B8" : "#6B6593" }]}>
            +{item.products.length - 2} more items
          </Text>
        )}
        {item.courier_name ? (
          <Text style={[styles.itemName, { color: darkMode ? "#B0B3B8" : "#6B6593", marginTop: 4 }]}>
            Courier: {item.courier_name}{item.tracking_number ? ` · ${item.tracking_number}` : ""}
          </Text>
        ) : null}
      </View>

      <View style={styles.orderFooter}>
        <View style={styles.totalContainer}>
          <Text style={[styles.totalLabel, { color: darkMode ? "#B0B3B8" : "#6B6593" }]}>
            Total:
          </Text>
          <Text style={[styles.totalAmount, { color: darkMode ? "#fff" : "#222" }]}>
            ₱{parseFloat(item.total_cost || 0).toFixed(2)}
          </Text>
        </View>
        <View style={styles.statusIcon}>
          <MaterialCommunityIcons
            name={getStatusIcon(displayStatus)}
            size={20}
            color={getStatusColor(displayStatus)}
          />
        </View>
      </View>
    </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <MaterialCommunityIcons
        name="truck-outline"
        size={64}
        color={darkMode ? "#B0B3B8" : "#6B6593"}
      />
      <Text style={[styles.emptyText, { color: darkMode ? "#B0B3B8" : "#6B6593" }]}>
        No deliveries yet
      </Text>
      <TouchableOpacity
        style={[styles.shopButton, { backgroundColor: darkMode ? "#393A3B" : "#6B6593" }]}
        onPress={() => navigation.navigate("Home")}
      >
        <Text style={styles.shopButtonText}>Start Shopping</Text>
      </TouchableOpacity>
    </View>
  );

  const renderErrorState = () => (
    <View style={styles.emptyContainer}>
      <MaterialCommunityIcons
        name="alert-circle-outline"
        size={64}
        color={darkMode ? "#B0B3B8" : "#6B6593"}
      />
      <Text style={[styles.emptyText, { color: darkMode ? "#B0B3B8" : "#6B6593" }]}>
        {errorMessage}
      </Text>
      <TouchableOpacity
        style={[styles.shopButton, { backgroundColor: darkMode ? "#393A3B" : "#6B6593" }]}
        onPress={fetchMyOrders}
      >
        <Text style={styles.shopButtonText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );

  const activeFilterLabel = STATUS_FILTERS.find((f) => f.key === statusFilter)?.label || 'All';

  return (
    <View style={[styles.container, { backgroundColor: darkMode ? "#18191A" : "#F5F4FA" }]}>
      <Header
        showBack
        logoType="image"
        onBackPress={() => navigation.goBack()}
        darkMode={darkMode}
        title="My Deliveries"
        rightComponent={
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => setShowFilterMenu((prev) => !prev)}
            accessibilityLabel="Filter deliveries"
          >
            <MaterialCommunityIcons
              name={statusFilter !== 'all' ? 'filter' : 'filter-outline'}
              size={22}
              color="#fff"
            />
          </TouchableOpacity>
        }
      />

      {showFilterMenu && (
        <>
          <TouchableOpacity
            style={styles.filterBackdrop}
            activeOpacity={1}
            onPress={() => setShowFilterMenu(false)}
          />
          <View style={[styles.filterDropdown, { backgroundColor: darkMode ? "#242526" : "#fff" }]}>
            {STATUS_FILTERS.map((filter) => (
              <TouchableOpacity
                key={filter.key}
                style={[
                  styles.filterOption,
                  statusFilter === filter.key && { backgroundColor: darkMode ? "#393A3B" : "#F5F4FA" },
                ]}
                onPress={() => {
                  setStatusFilter(filter.key);
                  setShowFilterMenu(false);
                }}
              >
                <Text
                  style={[
                    styles.filterOptionText,
                    { color: darkMode ? "#E4E6EB" : "#222" },
                    statusFilter === filter.key && { fontWeight: 'bold', color: "#6B6593" },
                  ]}
                >
                  {filter.label}
                </Text>
                {statusFilter === filter.key && (
                  <MaterialCommunityIcons name="check" size={18} color="#6B6593" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      {statusFilter !== 'all' && (
        <View style={styles.activeFilterBanner}>
          <Text style={[styles.activeFilterText, { color: darkMode ? "#B0B3B8" : "#6B6593" }]}>
            Showing: {activeFilterLabel}
          </Text>
          <TouchableOpacity onPress={() => setStatusFilter('all')}>
            <Text style={styles.clearFilterText}>Clear</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Deliveries List */}
      {loading && orders.length === 0 ? (
        <View style={styles.ordersList}>
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} withImage={false} lines={3} style={{ marginBottom: 16, borderRadius: 12 }} />
          ))}
        </View>
      ) : errorMessage && orders.length === 0 ? (
        renderErrorState()
      ) : filteredOrders.length > 0 ? (
        <FlatList
          data={filteredOrders}
          renderItem={renderOrderItem}
          keyExtractor={(item) => item.order_id || item.id}
          contentContainerStyle={styles.ordersList}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        />
      ) : orders.length > 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons
            name="filter-remove-outline"
            size={64}
            color={darkMode ? "#B0B3B8" : "#6B6593"}
          />
          <Text style={[styles.emptyText, { color: darkMode ? "#B0B3B8" : "#6B6593" }]}>
            No deliveries match this filter
          </Text>
          <TouchableOpacity
            style={[styles.shopButton, { backgroundColor: darkMode ? "#393A3B" : "#6B6593" }]}
            onPress={() => setStatusFilter('all')}
          >
            <Text style={styles.shopButtonText}>Clear Filter</Text>
          </TouchableOpacity>
        </View>
      ) : (
        renderEmptyState()
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  iconButton: {
    padding: 8,
  },
  filterBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
  },
  filterDropdown: {
    position: 'absolute',
    top: 56,
    right: 16,
    zIndex: 20,
    borderRadius: 10,
    paddingVertical: 6,
    minWidth: 190,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  filterOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  filterOptionText: {
    fontSize: 14,
    fontFamily: 'serif',
  },
  activeFilterBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
  },
  activeFilterText: {
    fontSize: 13,
    fontFamily: 'serif',
  },
  clearFilterText: {
    fontSize: 13,
    fontFamily: 'serif',
    fontWeight: 'bold',
    color: '#6B6593',
  },
  filterContainer: {
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 8,
    paddingVertical: 8,
  },
  filterList: {
    paddingHorizontal: 8,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 4,
    borderRadius: 16,
  },
  filterTabActive: {
    backgroundColor: "#fff",
  },
  filterTabText: {
    fontSize: 12,
    fontFamily: 'serif',
    fontWeight: '500',
  },
  filterTabTextActive: {
    fontWeight: 'bold',
    color: "#6B6593",
  },
  ordersList: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  orderCard: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
    fontSize: 16,
    fontFamily: 'serif',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 12,
    fontFamily: 'serif',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 10,
    fontFamily: 'serif',
    fontWeight: 'bold',
  },
  orderItems: {
    marginBottom: 12,
  },
  itemsLabel: {
    fontSize: 12,
    fontFamily: 'serif',
    marginBottom: 4,
  },
  itemName: {
    fontSize: 12,
    fontFamily: 'serif',
    marginBottom: 2,
  },
  moreItems: {
    fontSize: 12,
    fontFamily: 'serif',
    fontStyle: 'italic',
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalContainer: {
    flex: 1,
  },
  totalLabel: {
    fontSize: 12,
    fontFamily: 'serif',
  },
  totalAmount: {
    fontSize: 16,
    fontFamily: 'serif',
    fontWeight: 'bold',
  },
  statusIcon: {
    marginLeft: 12,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'serif',
    marginTop: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  shopButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  shopButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'serif',
    fontWeight: 'bold',
  },
});