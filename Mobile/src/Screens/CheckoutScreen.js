import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
} from "react-native";
import Header from "../Components/Header";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useCart } from "../Context/CartContext";
import { useOrders } from "../Context/OrdersContext";
import { useProfile } from "../Context/ProfileContext";
import { useTheme } from "../Context/ThemeContext";

export default function CheckoutScreen({ navigation, route }) {
  const { selectedItems } = route.params || {};
  const { cartItems, totalPrice, checkout, clearCart } = useCart();
  const { createOrder } = useOrders();
  const { profile, updateProfile } = useProfile();
  const { darkMode } = useTheme();
  
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [customerInfo, setCustomerInfo] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
  });

  useEffect(() => {
    if (profile) {
      setCustomerInfo({
        name: profile.name || "",
        email: profile.email || "",
        phone: profile.phone || "",
        address: profile.address || "",
      });
    }
  }, [profile]);

  const onRefresh = async () => {
    setRefreshing(true);
    // Refresh cart and profile data
    setRefreshing(false);
  };

  const handleInputChange = (field, value) => {
    setCustomerInfo(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateForm = () => {
    const { name, email, phone, address } = customerInfo;
    if (!name.trim()) {
      Alert.alert("Error", "Please enter your name");
      return false;
    }
    if (!email.trim()) {
      Alert.alert("Error", "Please enter your email");
      return false;
    }
    if (!phone.trim()) {
      Alert.alert("Error", "Please enter your phone number");
      return false;
    }
    if (!address.trim()) {
      Alert.alert("Error", "Please enter your address");
      return false;
    }
    return true;
  };

  const handleCheckout = async () => {
    if (!validateForm()) return;

    const itemsToCheckout = selectedItems || cartItems;
    if (itemsToCheckout.length === 0) {
      Alert.alert("Error", "No items to checkout");
      return;
    }

    setLoading(true);
    try {
      const orderData = {
        customerInfo,
        items: itemsToCheckout,
        totalAmount: totalPrice,
        orderType: "customer_order",
      };

      const result = await checkout(orderData);
      
      if (result.success) {
        Alert.alert(
          "Order Placed Successfully!",
          `Your order has been placed. Order ID: ${result.orderId}`,
          [
            {
              text: "OK",
              onPress: () => {
                clearCart();
                navigation.navigate("OrderTracking", { orderId: result.orderId });
              }
            }
          ]
        );
      } else {
        Alert.alert("Error", result.message || "Failed to place order");
      }
    } catch (error) {
      console.error("Checkout error:", error);
      Alert.alert("Error", "Failed to place order. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const itemsToDisplay = selectedItems || cartItems;
  const subtotal = itemsToDisplay.reduce((sum, item) => {
    return sum + (parseFloat(item.unit_price) * item.quantity);
  }, 0);

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
        {/* Order Summary */}
        <View style={[styles.section, { backgroundColor: darkMode ? "#242526" : "#fff" }]}>
          <Text style={[styles.sectionTitle, { color: darkMode ? "#E4E6EB" : "#222" }]}>
            Order Summary
          </Text>
          {itemsToDisplay.map((item, index) => (
            <View key={item.sku} style={styles.orderItem}>
              <View style={styles.itemInfo}>
                <Text style={[styles.itemName, { color: darkMode ? "#E4E6EB" : "#222" }]}>
                  {item.name}
                </Text>
                <Text style={[styles.itemSku, { color: darkMode ? "#B0B3B8" : "#6B6593" }]}>
                  SKU: {item.sku}
                </Text>
              </View>
              <View style={styles.itemQuantity}>
                <Text style={[styles.quantityText, { color: darkMode ? "#E4E6EB" : "#222" }]}>
                  Qty: {item.quantity}
                </Text>
              </View>
              <View style={styles.itemPrice}>
                <Text style={[styles.priceText, { color: darkMode ? "#E4E6EB" : "#222" }]}>
                  ₱{(parseFloat(item.unit_price) * item.quantity).toFixed(2)}
                </Text>
              </View>
            </View>
          ))}
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { color: darkMode ? "#E4E6EB" : "#222" }]}>
              Total:
            </Text>
            <Text style={[styles.totalAmount, { color: darkMode ? "#fff" : "#222" }]}>
              ₱{subtotal.toFixed(2)}
            </Text>
          </View>
        </View>

        {/* Customer Information */}
        <View style={[styles.section, { backgroundColor: darkMode ? "#242526" : "#fff" }]}>
          <Text style={[styles.sectionTitle, { color: darkMode ? "#E4E6EB" : "#222" }]}>
            Customer Information
          </Text>
          
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: darkMode ? "#B0B3B8" : "#6B6593" }]}>
              Full Name *
            </Text>
            <TextInput
              style={[styles.textInput, { 
                backgroundColor: darkMode ? "#393A3B" : "#F5F4FA",
                color: darkMode ? "#E4E6EB" : "#222",
                borderColor: darkMode ? "#393A3B" : "#EDECF3"
              }]}
              value={customerInfo.name}
              onChangeText={(value) => handleInputChange("name", value)}
              placeholder="Enter your full name"
              placeholderTextColor={darkMode ? "#B0B3B8" : "#6B6593"}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: darkMode ? "#B0B3B8" : "#6B6593" }]}>
              Email *
            </Text>
            <TextInput
              style={[styles.textInput, { 
                backgroundColor: darkMode ? "#393A3B" : "#F5F4FA",
                color: darkMode ? "#E4E6EB" : "#222",
                borderColor: darkMode ? "#393A3B" : "#EDECF3"
              }]}
              value={customerInfo.email}
              onChangeText={(value) => handleInputChange("email", value)}
              placeholder="Enter your email"
              placeholderTextColor={darkMode ? "#B0B3B8" : "#6B6593"}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: darkMode ? "#B0B3B8" : "#6B6593" }]}>
              Phone Number *
            </Text>
            <TextInput
              style={[styles.textInput, { 
                backgroundColor: darkMode ? "#393A3B" : "#F5F4FA",
                color: darkMode ? "#E4E6EB" : "#222",
                borderColor: darkMode ? "#393A3B" : "#EDECF3"
              }]}
              value={customerInfo.phone}
              onChangeText={(value) => handleInputChange("phone", value)}
              placeholder="Enter your phone number"
              placeholderTextColor={darkMode ? "#B0B3B8" : "#6B6593"}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: darkMode ? "#B0B3B8" : "#6B6593" }]}>
              Delivery Address *
            </Text>
            <TextInput
              style={[styles.textInput, styles.textArea, { 
                backgroundColor: darkMode ? "#393A3B" : "#F5F4FA",
                color: darkMode ? "#E4E6EB" : "#222",
                borderColor: darkMode ? "#393A3B" : "#EDECF3"
              }]}
              value={customerInfo.address}
              onChangeText={(value) => handleInputChange("address", value)}
              placeholder="Enter your delivery address"
              placeholderTextColor={darkMode ? "#B0B3B8" : "#6B6593"}
              multiline
              numberOfLines={3}
            />
          </View>
        </View>
      </ScrollView>

      {/* Checkout Button */}
      <View style={[styles.bottomContainer, { backgroundColor: darkMode ? "#242526" : "#fff" }]}>
        <TouchableOpacity
          style={[
            styles.checkoutButton, 
            { backgroundColor: darkMode ? "#393A3B" : "#6B6593" },
            loading && styles.checkoutButtonDisabled
          ]}
          onPress={handleCheckout}
          disabled={loading}
        >
          {loading ? (
            <MaterialCommunityIcons name="loading" size={20} color="#fff" />
          ) : (
            <MaterialCommunityIcons name="credit-card" size={20} color="#fff" />
          )}
          <Text style={styles.checkoutButtonText}>
            {loading ? "Processing..." : "Place Order"}
          </Text>
        </TouchableOpacity>
      </View>
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
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'serif',
    fontWeight: 'bold',
    marginBottom: 16,
  },
  orderItem: {
    flexDirection: 'row',
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
  itemQuantity: {
    marginHorizontal: 12,
  },
  quantityText: {
    fontSize: 12,
    fontFamily: 'serif',
  },
  itemPrice: {
    minWidth: 80,
    alignItems: 'flex-end',
  },
  priceText: {
    fontSize: 14,
    fontFamily: 'serif',
    fontWeight: 'bold',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 2,
    borderTopColor: '#6B6593',
  },
  totalLabel: {
    fontSize: 16,
    fontFamily: 'serif',
    fontWeight: 'bold',
  },
  totalAmount: {
    fontSize: 18,
    fontFamily: 'serif',
    fontWeight: 'bold',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontFamily: 'serif',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'serif',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  bottomContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#EDECF3',
  },
  checkoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 8,
  },
  checkoutButtonDisabled: {
    opacity: 0.6,
  },
  checkoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'serif',
    fontWeight: 'bold',
    marginLeft: 8,
  },
});