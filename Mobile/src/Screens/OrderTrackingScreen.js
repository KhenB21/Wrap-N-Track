import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from "react-native";
import Header from "../Components/Header";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useOrders } from "../Context/OrdersContext";
import { useTheme } from "../Context/ThemeContext";

export default function OrderTrackingScreen({ navigation, route }) {
  const { orderId } = route.params || {};
  const { getOrder, orders, loading, error } = useOrders();
  const { darkMode } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [order, setOrder] = useState(null);

  useEffect(() => {
    if (orderId) {
      loadOrder();
    }
  }, [orderId]);

  const loadOrder = async () => {
    try {
      const orderData = await getOrder(orderId);
      setOrder(orderData);
    } catch (error) {
      console.error("Error loading order:", error);
      Alert.alert("Error", "Failed to load order details");
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadOrder();
    } catch (error) {
      console.error("Error refreshing order:", error);
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

  const getStatusSteps = () => {
    const statuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];
    const currentStatus = order?.status?.toLowerCase();
    const currentIndex = statuses.indexOf(currentStatus);
    
    return statuses.map((status, index) => ({
      status,
      completed: index <= currentIndex,
      current: index === currentIndex,
    }));
  };

  if (!order) {
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
        <View style={styles.loadingContainer}>
          <MaterialCommunityIcons name="loading" size={32} color={darkMode ? "#B0B3B8" : "#6B6593"} />
          <Text style={[styles.loadingText, { color: darkMode ? "#B0B3B8" : "#6B6593" }]}>
            Loading order details...
          </Text>
        </View>
      </View>
    );
  }

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
      
      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Order Header */}
        <View style={[styles.section, { backgroundColor: darkMode ? "#242526" : "#fff" }]}>
          <View style={styles.orderHeader}>
            <Text style={[styles.orderId, { color: darkMode ? "#E4E6EB" : "#222" }]}>
              Order #{order.order_id || order.id}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]}>
              <Text style={styles.statusText}>
                {order.status?.toUpperCase()}
              </Text>
            </View>
          </View>
          <Text style={[styles.orderDate, { color: darkMode ? "#B0B3B8" : "#6B6593" }]}>
            Placed on {new Date(order.created_at || order.order_date).toLocaleDateString()}
          </Text>
        </View>

        {/* Status Timeline */}
        <View style={[styles.section, { backgroundColor: darkMode ? "#242526" : "#fff" }]}>
          <Text style={[styles.sectionTitle, { color: darkMode ? "#E4E6EB" : "#222" }]}>
            Order Status
          </Text>
          <View style={styles.timeline}>
            {getStatusSteps().map((step, index) => (
              <View key={step.status} style={styles.timelineItem}>
                <View style={[
                  styles.timelineIcon,
                  { 
                    backgroundColor: step.completed ? getStatusColor(step.status) : (darkMode ? "#393A3B" : "#EDECF3"),
                    borderColor: step.completed ? getStatusColor(step.status) : (darkMode ? "#393A3B" : "#EDECF3"),
                  }
                ]}>
                  <MaterialCommunityIcons 
                    name={getStatusIcon(step.status)} 
                    size={16} 
                    color={step.completed ? "#fff" : (darkMode ? "#B0B3B8" : "#6B6593")} 
                  />
                </View>
                <View style={styles.timelineContent}>
                  <Text style={[
                    styles.timelineStatus,
                    { 
                      color: step.completed ? (darkMode ? "#E4E6EB" : "#222") : (darkMode ? "#B0B3B8" : "#6B6593"),
                      fontWeight: step.current ? 'bold' : 'normal'
                    }
                  ]}>
                    {step.status.charAt(0).toUpperCase() + step.status.slice(1)}
                  </Text>
                  {step.current && (
                    <Text style={[styles.timelineDescription, { color: darkMode ? "#B0B3B8" : "#6B6593" }]}>
                      Current status
                    </Text>
                  )}
                </View>
                {index < getStatusSteps().length - 1 && (
                  <View style={[
                    styles.timelineLine,
                    { 
                      backgroundColor: step.completed ? getStatusColor(step.status) : (darkMode ? "#393A3B" : "#EDECF3")
                    }
                  ]} />
                )}
              </View>
            ))}
          </View>
        </View>

        {/* Order Items */}
        <View style={[styles.section, { backgroundColor: darkMode ? "#242526" : "#fff" }]}>
          <Text style={[styles.sectionTitle, { color: darkMode ? "#E4E6EB" : "#222" }]}>
            Order Items
          </Text>
          {order.items?.map((item, index) => (
            <View key={index} style={styles.orderItem}>
              <View style={styles.itemInfo}>
                <Text style={[styles.itemName, { color: darkMode ? "#E4E6EB" : "#222" }]}>
                  {item.name || item.product_name}
                </Text>
                <Text style={[styles.itemSku, { color: darkMode ? "#B0B3B8" : "#6B6593" }]}>
                  SKU: {item.sku}
                </Text>
              </View>
              <View style={styles.itemDetails}>
                <Text style={[styles.itemQuantity, { color: darkMode ? "#E4E6EB" : "#222" }]}>
                  Qty: {item.quantity}
                </Text>
                <Text style={[styles.itemPrice, { color: darkMode ? "#E4E6EB" : "#222" }]}>
                  ₱{parseFloat(item.unit_price || item.price).toFixed(2)}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Order Summary */}
        <View style={[styles.section, { backgroundColor: darkMode ? "#242526" : "#fff" }]}>
          <Text style={[styles.sectionTitle, { color: darkMode ? "#E4E6EB" : "#222" }]}>
            Order Summary
          </Text>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: darkMode ? "#B0B3B8" : "#6B6593" }]}>
              Subtotal:
            </Text>
            <Text style={[styles.summaryValue, { color: darkMode ? "#E4E6EB" : "#222" }]}>
              ₱{parseFloat(order.subtotal || order.total_amount).toFixed(2)}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: darkMode ? "#B0B3B8" : "#6B6593" }]}>
              Delivery Fee:
            </Text>
            <Text style={[styles.summaryValue, { color: darkMode ? "#E4E6EB" : "#222" }]}>
              ₱{parseFloat(order.delivery_fee || 0).toFixed(2)}
            </Text>
          </View>
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={[styles.totalLabel, { color: darkMode ? "#E4E6EB" : "#222" }]}>
              Total:
            </Text>
            <Text style={[styles.totalValue, { color: darkMode ? "#fff" : "#222" }]}>
              ₱{parseFloat(order.total_amount).toFixed(2)}
            </Text>
          </View>
        </View>

        {/* Customer Information */}
        {order.customer_info && (
          <View style={[styles.section, { backgroundColor: darkMode ? "#242526" : "#fff" }]}>
            <Text style={[styles.sectionTitle, { color: darkMode ? "#E4E6EB" : "#222" }]}>
              Delivery Information
            </Text>
            <View style={styles.customerInfo}>
              <Text style={[styles.customerName, { color: darkMode ? "#E4E6EB" : "#222" }]}>
                {order.customer_info.name}
              </Text>
              <Text style={[styles.customerDetail, { color: darkMode ? "#B0B3B8" : "#6B6593" }]}>
                {order.customer_info.email}
              </Text>
              <Text style={[styles.customerDetail, { color: darkMode ? "#B0B3B8" : "#6B6593" }]}>
                {order.customer_info.phone}
              </Text>
              <Text style={[styles.customerAddress, { color: darkMode ? "#B0B3B8" : "#6B6593" }]}>
                {order.customer_info.address}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'serif',
    marginTop: 16,
  },
  section: {
    margin: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderId: {
    fontSize: 18,
    fontFamily: 'serif',
    fontWeight: 'bold',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'serif',
    fontWeight: 'bold',
  },
  orderDate: {
    fontSize: 14,
    fontFamily: 'serif',
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'serif',
    fontWeight: 'bold',
    marginBottom: 16,
  },
  timeline: {
    paddingLeft: 8,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  timelineIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    marginRight: 16,
  },
  timelineContent: {
    flex: 1,
    paddingTop: 4,
  },
  timelineStatus: {
    fontSize: 14,
    fontFamily: 'serif',
  },
  timelineDescription: {
    fontSize: 12,
    fontFamily: 'serif',
    marginTop: 2,
  },
  timelineLine: {
    position: 'absolute',
    left: 15,
    top: 32,
    width: 2,
    height: 16,
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#EDECF3',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontFamily: 'serif',
    fontWeight: 'bold',
  },
  itemSku: {
    fontSize: 12,
    fontFamily: 'serif',
    marginTop: 2,
  },
  itemDetails: {
    alignItems: 'flex-end',
  },
  itemQuantity: {
    fontSize: 12,
    fontFamily: 'serif',
  },
  itemPrice: {
    fontSize: 14,
    fontFamily: 'serif',
    fontWeight: 'bold',
    marginTop: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    fontFamily: 'serif',
  },
  summaryValue: {
    fontSize: 14,
    fontFamily: 'serif',
  },
  totalRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#EDECF3',
  },
  totalLabel: {
    fontSize: 16,
    fontFamily: 'serif',
    fontWeight: 'bold',
  },
  totalValue: {
    fontSize: 18,
    fontFamily: 'serif',
    fontWeight: 'bold',
  },
  customerInfo: {
    marginTop: 8,
  },
  customerName: {
    fontSize: 16,
    fontFamily: 'serif',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  customerDetail: {
    fontSize: 14,
    fontFamily: 'serif',
    marginBottom: 2,
  },
  customerAddress: {
    fontSize: 14,
    fontFamily: 'serif',
    marginTop: 4,
    lineHeight: 20,
  },
});