import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  ScrollView,
} from "react-native";
import Header from "../Components/Header";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useOrders } from "../Context/OrdersContext";
import { useTheme } from "../Context/ThemeContext";

export default function OrderManagementScreen({ navigation }) {
  const {
    orders,
    loading,
    error,
    loadOrders,
    updateOrderStatus,
    getOrdersByStatus,
    clearError,
  } = useOrders();
  const { darkMode } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [newStatus, setNewStatus] = useState("");

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

  const handleStatusUpdate = async () => {
    try {
      await updateOrderStatus(selectedOrder.order_id || selectedOrder.id, newStatus);
      setShowStatusModal(false);
      setSelectedOrder(null);
      setNewStatus("");
      Alert.alert("Success", "Order status updated successfully!");
    } catch (error) {
      Alert.alert("Error", "Failed to update order status. Please try again.");
    }
  };

  const openStatusModal = (order) => {
    setSelectedOrder(order);
    setNewStatus(order.status);
    setShowStatusModal(true);
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
      onPress={() => openStatusModal(item)}
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

      <View style={styles.customerInfo}>
        <Text style={[styles.customerName, { color: darkMode ? "#E4E6EB" : "#222" }]}>
          {item.customer_info?.name || item.customer_name || "Unknown Customer"}
        </Text>
        <Text style={[styles.customerContact, { color: darkMode ? "#B0B3B8" : "#6B6593" }]}>
          {item.customer_info?.email || item.customer_email || "No email"}
        </Text>
        <Text style={[styles.customerContact, { color: darkMode ? "#B0B3B8" : "#6B6593" }]}>
          {item.customer_info?.phone || item.customer_phone || "No phone"}
        </Text>
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

  const renderStatusModal = () => (
    <Modal
      visible={showStatusModal}
      animationType="slide"
      transparent={true}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: darkMode ? "#242526" : "#fff" }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: darkMode ? "#E4E6EB" : "#222" }]}>
              Update Order Status
            </Text>
            <TouchableOpacity onPress={() => {
              setShowStatusModal(false);
              setSelectedOrder(null);
              setNewStatus("");
            }}>
              <MaterialCommunityIcons name="close" size={24} color={darkMode ? "#E4E6EB" : "#222"} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <View style={styles.orderSummary}>
              <Text style={[styles.summaryTitle, { color: darkMode ? "#E4E6EB" : "#222" }]}>
                Order #{selectedOrder?.order_id || selectedOrder?.id}
              </Text>
              <Text style={[styles.summaryCustomer, { color: darkMode ? "#B0B3B8" : "#6B6593" }]}>
                Customer: {selectedOrder?.customer_info?.name || selectedOrder?.customer_name || "Unknown"}
              </Text>
              <Text style={[styles.summaryTotal, { color: darkMode ? "#E4E6EB" : "#222" }]}>
                Total: ₱{parseFloat(selectedOrder?.total_amount || 0).toFixed(2)}
              </Text>
            </View>

            <View style={styles.statusOptions}>
              <Text style={[styles.statusLabel, { color: darkMode ? "#B0B3B8" : "#6B6593" }]}>
                Select New Status:
              </Text>
              {['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'].map((status) => (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.statusOption,
                    { backgroundColor: darkMode ? "#393A3B" : "#F5F4FA" },
                    newStatus === status && styles.statusSelected
                  ]}
                  onPress={() => setNewStatus(status)}
                >
                  <View style={styles.statusOptionContent}>
                    <MaterialCommunityIcons 
                      name={getStatusIcon(status)} 
                      size={20} 
                      color={newStatus === status ? "#fff" : (darkMode ? "#E4E6EB" : "#222")} 
                    />
                    <Text style={[
                      styles.statusOptionText,
                      { 
                        color: newStatus === status ? "#fff" : (darkMode ? "#E4E6EB" : "#222")
                      }
                    ]}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.cancelButton, { backgroundColor: darkMode ? "#393A3B" : "#EDECF3" }]}
              onPress={() => {
                setShowStatusModal(false);
                setSelectedOrder(null);
                setNewStatus("");
              }}
            >
              <Text style={[styles.cancelText, { color: darkMode ? "#E4E6EB" : "#222" }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: darkMode ? "#393A3B" : "#6B6593" }]}
              onPress={handleStatusUpdate}
            >
              <Text style={styles.saveText}>Update Status</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
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

      <View style={styles.headerContainer}>
        <Text style={[styles.headerTitle, { color: darkMode ? "#E4E6EB" : "#222" }]}>
          Order Management
        </Text>
        <Text style={[styles.orderCount, { color: darkMode ? "#B0B3B8" : "#6B6593" }]}>
          {filteredOrders.length} order{filteredOrders.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Orders List */}
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

      {renderStatusModal()}
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
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'serif',
    fontWeight: 'bold',
  },
  orderCount: {
    fontSize: 14,
    fontFamily: 'serif',
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
  customerInfo: {
    marginBottom: 12,
  },
  customerName: {
    fontSize: 14,
    fontFamily: 'serif',
    fontWeight: 'bold',
    marginBottom: 2,
  },
  customerContact: {
    fontSize: 12,
    fontFamily: 'serif',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: 12,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'serif',
    fontWeight: 'bold',
  },
  modalBody: {
    maxHeight: 400,
  },
  orderSummary: {
    marginBottom: 20,
    padding: 16,
    backgroundColor: '#F5F4FA',
    borderRadius: 8,
  },
  summaryTitle: {
    fontSize: 16,
    fontFamily: 'serif',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  summaryCustomer: {
    fontSize: 14,
    fontFamily: 'serif',
    marginBottom: 2,
  },
  summaryTotal: {
    fontSize: 14,
    fontFamily: 'serif',
    fontWeight: 'bold',
  },
  statusOptions: {
    marginBottom: 20,
  },
  statusLabel: {
    fontSize: 14,
    fontFamily: 'serif',
    marginBottom: 12,
  },
  statusOption: {
    marginBottom: 8,
    borderRadius: 8,
    padding: 12,
  },
  statusSelected: {
    backgroundColor: '#6B6593',
  },
  statusOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusOptionText: {
    fontSize: 14,
    fontFamily: 'serif',
    marginLeft: 12,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    marginRight: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    fontFamily: 'serif',
    fontWeight: 'bold',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    marginLeft: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'serif',
    fontWeight: 'bold',
  },
});