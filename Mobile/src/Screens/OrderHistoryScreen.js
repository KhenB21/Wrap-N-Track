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

export default function OrderHistoryScreen({ navigation }) {
  const { darkMode } = useTheme();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

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

  // Delivery status (not order status) is what the customer cares about here —
  // reuses the same `delivery_status` field the website's DeliveryTracking page shows.
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return '#FFA726';
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

  const renderOrderItem = ({ item }) => (
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
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.delivery_status) }]}>
          <Text style={styles.statusText}>
            {(item.delivery_status || "Pending").toUpperCase()}
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
            name={getStatusIcon(item.delivery_status)}
            size={20}
            color={getStatusColor(item.delivery_status)}
          />
        </View>
      </View>
    </TouchableOpacity>
  );

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

  return (
    <View style={[styles.container, { backgroundColor: darkMode ? "#18191A" : "#F5F4FA" }]}>
      <Header
        showBack
        showCart
        logoType="image"
        onBackPress={() => navigation.goBack()}
        onCartPress={() => navigation.navigate("MyCart")}
        darkMode={darkMode}
        title="My Deliveries"
      />

      {/* Deliveries List */}
      {loading && orders.length === 0 ? (
        <View style={styles.ordersList}>
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} withImage={false} lines={3} style={{ marginBottom: 16, borderRadius: 12 }} />
          ))}
        </View>
      ) : errorMessage && orders.length === 0 ? (
        renderErrorState()
      ) : orders.length > 0 ? (
        <FlatList
          data={orders}
          renderItem={renderOrderItem}
          keyExtractor={(item) => item.order_id || item.id}
          contentContainerStyle={styles.ordersList}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        />
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