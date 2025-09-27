import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from "react-native";
import Header from "../Components/Header";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useOrders } from "../Context/OrdersContext";
import { useTheme } from "../Context/ThemeContext";

export default function OrderHistoryScreen({ navigation }) {
  const { orders, loading, error, loadOrders, getOrdersByStatus } = useOrders();
  const { darkMode } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState("all");

  useEffect(() => {
    loadOrders();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadOrders();
    } catch (error) {
      console.error("Error refreshing orders:", error);
    } finally {
      setRefreshing(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return '#FFA726';
      case 'confirmed':
        return '#42A5F5';
      case 'processing':
        return '#AB47BC';
      case 'shipped':
        return '#66BB6A';
      case 'delivered':
        return '#4CAF50';
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
      case 'confirmed':
        return 'check-circle-outline';
      case 'processing':
        return 'cog-outline';
      case 'shipped':
        return 'truck-outline';
      case 'delivered':
        return 'check-circle';
      case 'cancelled':
        return 'close-circle-outline';
      default:
        return 'help-circle-outline';
    }
  };

  const getFilteredOrders = () => {
    if (selectedFilter === "all") {
      return orders;
    }
    return getOrdersByStatus(selectedFilter);
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
            {formatDate(item.created_at || item.order_date)}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>
            {item.status?.toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={styles.orderItems}>
        <Text style={[styles.itemsLabel, { color: darkMode ? "#B0B3B8" : "#6B6593" }]}>
          Items ({item.items?.length || 0}):
        </Text>
        {item.items?.slice(0, 2).map((orderItem, index) => (
          <Text key={index} style={[styles.itemName, { color: darkMode ? "#E4E6EB" : "#222" }]}>
            • {orderItem.name || orderItem.product_name} (Qty: {orderItem.quantity})
          </Text>
        ))}
        {item.items?.length > 2 && (
          <Text style={[styles.moreItems, { color: darkMode ? "#B0B3B8" : "#6B6593" }]}>
            +{item.items.length - 2} more items
          </Text>
        )}
      </View>

      <View style={styles.orderFooter}>
        <View style={styles.totalContainer}>
          <Text style={[styles.totalLabel, { color: darkMode ? "#B0B3B8" : "#6B6593" }]}>
            Total:
          </Text>
          <Text style={[styles.totalAmount, { color: darkMode ? "#fff" : "#222" }]}>
            ₱{parseFloat(item.total_amount).toFixed(2)}
          </Text>
        </View>
        <View style={styles.statusIcon}>
          <MaterialCommunityIcons 
            name={getStatusIcon(item.status)} 
            size={20} 
            color={getStatusColor(item.status)} 
          />
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <MaterialCommunityIcons 
        name="package-variant" 
        size={64} 
        color={darkMode ? "#B0B3B8" : "#6B6593"} 
      />
      <Text style={[styles.emptyText, { color: darkMode ? "#B0B3B8" : "#6B6593" }]}>
        {selectedFilter === "all" ? "No orders found" : `No ${selectedFilter} orders found`}
      </Text>
      <TouchableOpacity
        style={[styles.shopButton, { backgroundColor: darkMode ? "#393A3B" : "#6B6593" }]}
        onPress={() => navigation.navigate("Home")}
      >
        <Text style={styles.shopButtonText}>Start Shopping</Text>
      </TouchableOpacity>
    </View>
  );

  const filterOptions = [
    { key: "all", label: "All Orders" },
    { key: "pending", label: "Pending" },
    { key: "confirmed", label: "Confirmed" },
    { key: "processing", label: "Processing" },
    { key: "shipped", label: "Shipped" },
    { key: "delivered", label: "Delivered" },
    { key: "cancelled", label: "Cancelled" },
  ];

  const filteredOrders = getFilteredOrders();

  return (
    <View style={[styles.container, { backgroundColor: darkMode ? "#18191A" : "#F5F4FA" }]}>
      <Header
        showBack
        showCart
        logoType="image"
        onBackPress={() => navigation.goBack()}
        onCartPress={() => navigation.navigate("MyCart")}
        darkMode={darkMode}
      />

      {/* Filter Tabs */}
      <View style={[styles.filterContainer, { backgroundColor: darkMode ? "#242526" : "#EDECF3" }]}>
        <FlatList
          data={filterOptions}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.key}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.filterTab,
                selectedFilter === item.key && [
                  styles.filterTabActive,
                  { backgroundColor: darkMode ? "#393A3B" : "#fff" }
                ]
              ]}
              onPress={() => setSelectedFilter(item.key)}
            >
              <Text
                style={[
                  styles.filterTabText,
                  { color: darkMode ? "#E4E6EB" : "#6B6593" },
                  selectedFilter === item.key && styles.filterTabTextActive
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.filterList}
        />
      </View>

      {/* Orders List */}
      {filteredOrders.length > 0 ? (
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