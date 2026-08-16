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
  Modal,
} from "react-native";
import Header from "../Components/Header";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useCart } from "../Context/CartContext";
import { useProfile } from "../Context/ProfileContext";
import { useTheme } from "../Context/ThemeContext";

const PAYMENT_METHODS = [
  "Cash on Delivery",
  "GCash",
  "Bank Transfer",
  "Credit Card",
  "PayMaya",
];

const PAYMENT_TYPES = ["Online", "Cash on Delivery"];

export default function CheckoutScreen({ navigation, route }) {
  const { selectedItems } = route.params || {};
  const { cartItems, totalPrice, checkout, clearCart } = useCart();
  const { profile } = useProfile();
  const { darkMode } = useTheme();

  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [shippingAddress, setShippingAddress] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash on Delivery");
  const [paymentType, setPaymentType] = useState("Cash on Delivery");
  const [eventDate, setEventDate] = useState("");
  const [remarks, setRemarks] = useState("");
  const [orderQuantity, setOrderQuantity] = useState("1");
  const [paymentMethodModal, setPaymentMethodModal] = useState(false);

  useEffect(() => {
    if (profile) {
      setShippingAddress(profile.address || "");
      setContactNumber(profile.phone || "");
    }
  }, [profile]);

  const onRefresh = async () => {
    setRefreshing(true);
    setRefreshing(false);
  };

  const validateForm = () => {
    if (!shippingAddress.trim()) {
      Alert.alert("Error", "Please enter your delivery address");
      return false;
    }
    if (!contactNumber.trim()) {
      Alert.alert("Error", "Please enter your contact number");
      return false;
    }
    if (!paymentMethod) {
      Alert.alert("Error", "Please select a payment method");
      return false;
    }
    if (!eventDate.trim()) {
      Alert.alert("Error", "Please enter the event/delivery date (e.g. 2025-12-25)");
      return false;
    }
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(eventDate.trim())) {
      Alert.alert("Error", "Event date must be in YYYY-MM-DD format (e.g. 2025-12-25)");
      return false;
    }
    const qty = parseInt(orderQuantity, 10);
    if (isNaN(qty) || qty < 1) {
      Alert.alert("Error", "Order quantity must be at least 1");
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
      const checkoutData = {
        shipping_address: shippingAddress.trim(),
        payment_method: paymentMethod,
        payment_type: paymentType,
        expected_delivery: eventDate.trim(),
        remarks: remarks.trim(),
        order_quantity: parseInt(orderQuantity, 10),
      };

      const result = await checkout(checkoutData);

      if (result.success) {
        Alert.alert(
          "Order Placed Successfully!",
          `Your order has been placed.\nOrder ID: ${result.orderId}\n\nWe will contact you shortly to confirm your order.`,
          [
            {
              text: "Track Order",
              onPress: () => {
                clearCart();
                navigation.navigate("OrderTracking", { orderId: result.orderId });
              },
            },
            {
              text: "Done",
              onPress: () => {
                clearCart();
                navigation.navigate("CustomerTabs", { screen: "Home" });
              },
            },
          ]
        );
      } else {
        Alert.alert("Error", result.message || "Failed to place order");
      }
    } catch (error) {
      console.error("Checkout error:", error);
      Alert.alert("Error", error.response?.data?.message || "Failed to place order. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const itemsToDisplay = selectedItems || cartItems;
  const subtotal = itemsToDisplay.reduce((sum, item) => {
    return sum + (parseFloat(item.unit_price || 0) * (item.quantity || 0));
  }, 0);

  const bg = darkMode ? "#18191A" : "#F5F4FA";
  const card = darkMode ? "#242526" : "#fff";
  const text = darkMode ? "#E4E6EB" : "#222";
  const sub = darkMode ? "#B0B3B8" : "#6B6593";
  const border = darkMode ? "#393A3B" : "#EDECF3";
  const inputBg = darkMode ? "#393A3B" : "#F5F4FA";

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <Header
        showBack
        showCart
        logoType="image"
        onBackPress={() => navigation.goBack()}
        onCartPress={() => navigation.navigate("MyCart")}
        darkMode={darkMode}
        title="Place Order"
      />

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Order Summary */}
        <View style={[styles.section, { backgroundColor: card }]}>
          <Text style={[styles.sectionTitle, { color: text }]}>Order Summary</Text>
          {itemsToDisplay.map((item) => (
            <View key={item.sku} style={[styles.orderItem, { borderBottomColor: border }]}>
              <View style={styles.itemInfo}>
                <Text style={[styles.itemName, { color: text }]}>{item.name}</Text>
                <Text style={[styles.itemSku, { color: sub }]}>SKU: {item.sku}</Text>
              </View>
              <Text style={[styles.quantityText, { color: sub }]}>×{item.quantity}</Text>
              <Text style={[styles.priceText, { color: text }]}>
                ₱{(parseFloat(item.unit_price || 0) * item.quantity).toFixed(2)}
              </Text>
            </View>
          ))}
          <View style={[styles.totalRow, { borderTopColor: sub }]}>
            <Text style={[styles.totalLabel, { color: text }]}>Total:</Text>
            <Text style={[styles.totalAmount, { color: text }]}>₱{subtotal.toFixed(2)}</Text>
          </View>
        </View>

        {/* Delivery & Contact */}
        <View style={[styles.section, { backgroundColor: card }]}>
          <Text style={[styles.sectionTitle, { color: text }]}>Delivery Information</Text>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: sub }]}>Delivery Address *</Text>
            <TextInput
              style={[styles.textInput, styles.textArea, { backgroundColor: inputBg, color: text, borderColor: border }]}
              value={shippingAddress}
              onChangeText={setShippingAddress}
              placeholder="Enter your delivery address"
              placeholderTextColor={sub}
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: sub }]}>Contact Number *</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: inputBg, color: text, borderColor: border }]}
              value={contactNumber}
              onChangeText={setContactNumber}
              placeholder="e.g. 09171234567"
              placeholderTextColor={sub}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: sub }]}>Event / Delivery Date *</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: inputBg, color: text, borderColor: border }]}
              value={eventDate}
              onChangeText={setEventDate}
              placeholder="YYYY-MM-DD (e.g. 2025-12-25)"
              placeholderTextColor={sub}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: sub }]}>Number of Boxes / Quantity *</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: inputBg, color: text, borderColor: border }]}
              value={orderQuantity}
              onChangeText={setOrderQuantity}
              placeholder="1"
              placeholderTextColor={sub}
              keyboardType="number-pad"
            />
          </View>
        </View>

        {/* Payment */}
        <View style={[styles.section, { backgroundColor: card }]}>
          <Text style={[styles.sectionTitle, { color: text }]}>Payment</Text>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: sub }]}>Payment Method *</Text>
            <TouchableOpacity
              style={[styles.selectorButton, { backgroundColor: inputBg, borderColor: border }]}
              onPress={() => setPaymentMethodModal(true)}
            >
              <Text style={[styles.selectorText, { color: paymentMethod ? text : sub }]}>
                {paymentMethod || "Select payment method"}
              </Text>
              <MaterialCommunityIcons name="chevron-down" size={20} color={sub} />
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: sub }]}>Payment Type</Text>
            <View style={styles.paymentTypeRow}>
              {PAYMENT_TYPES.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.paymentTypeChip,
                    {
                      backgroundColor: paymentType === type ? "#6B6593" : inputBg,
                      borderColor: paymentType === type ? "#6B6593" : border,
                    },
                  ]}
                  onPress={() => setPaymentType(type)}
                >
                  <Text style={[styles.paymentTypeText, { color: paymentType === type ? "#fff" : sub }]}>
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Remarks */}
        <View style={[styles.section, { backgroundColor: card }]}>
          <Text style={[styles.sectionTitle, { color: text }]}>Remarks / Special Instructions</Text>
          <TextInput
            style={[styles.textInput, styles.textArea, { backgroundColor: inputBg, color: text, borderColor: border, height: 100 }]}
            value={remarks}
            onChangeText={setRemarks}
            placeholder="Any special instructions, notes, or requests for your order..."
            placeholderTextColor={sub}
            multiline
            numberOfLines={4}
          />
        </View>
      </ScrollView>

      {/* Place Order Button */}
      <View style={[styles.bottomContainer, { backgroundColor: card, borderTopColor: border }]}>
        <View style={styles.totalSummary}>
          <Text style={[styles.totalSummaryLabel, { color: sub }]}>Order Total</Text>
          <Text style={[styles.totalSummaryAmount, { color: text }]}>₱{subtotal.toFixed(2)}</Text>
        </View>
        <TouchableOpacity
          style={[styles.checkoutButton, { backgroundColor: "#6B6593" }, loading && styles.checkoutButtonDisabled]}
          onPress={handleCheckout}
          disabled={loading}
        >
          <MaterialCommunityIcons name={loading ? "loading" : "package-variant-closed"} size={20} color="#fff" />
          <Text style={styles.checkoutButtonText}>{loading ? "Placing Order..." : "Place Order"}</Text>
        </TouchableOpacity>
      </View>

      {/* Payment Method Modal */}
      <Modal
        visible={paymentMethodModal}
        transparent
        animationType="slide"
        onRequestClose={() => setPaymentMethodModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: card }]}>
            <Text style={[styles.modalTitle, { color: text }]}>Select Payment Method</Text>
            {PAYMENT_METHODS.map((method) => (
              <TouchableOpacity
                key={method}
                style={[
                  styles.modalOption,
                  { borderBottomColor: border },
                  paymentMethod === method && { backgroundColor: darkMode ? "#393A3B" : "#F0EFF8" },
                ]}
                onPress={() => {
                  setPaymentMethod(method);
                  setPaymentMethodModal(false);
                }}
              >
                <Text style={[styles.modalOptionText, { color: text }]}>{method}</Text>
                {paymentMethod === method && (
                  <MaterialCommunityIcons name="check" size={20} color="#6B6593" />
                )}
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[styles.modalCancelButton, { borderTopColor: border }]}
              onPress={() => setPaymentMethodModal(false)}
            >
              <Text style={[styles.modalCancelText, { color: sub }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
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
  sectionTitle: { fontSize: 16, fontWeight: "bold", marginBottom: 16 },
  orderItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 14, fontWeight: "600" },
  itemSku: { fontSize: 12, marginTop: 2 },
  quantityText: { fontSize: 14, marginHorizontal: 12 },
  priceText: { fontSize: 14, fontWeight: "bold", minWidth: 80, textAlign: "right" },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  totalLabel: { fontSize: 16, fontWeight: "bold" },
  totalAmount: { fontSize: 18, fontWeight: "bold" },
  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 13, marginBottom: 6 },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
  },
  textArea: { height: 80, textAlignVertical: "top" },
  selectorButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  selectorText: { fontSize: 15 },
  paymentTypeRow: { flexDirection: "row", gap: 10 },
  paymentTypeChip: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
  },
  paymentTypeText: { fontSize: 13, fontWeight: "600" },
  bottomContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  totalSummary: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  totalSummaryLabel: { fontSize: 14 },
  totalSummaryAmount: { fontSize: 18, fontWeight: "bold" },
  checkoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 8,
    gap: 8,
  },
  checkoutButtonDisabled: { opacity: 0.6 },
  checkoutButtonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: 36,
  },
  modalTitle: { fontSize: 18, fontWeight: "bold", paddingHorizontal: 20, marginBottom: 12 },
  modalOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalOptionText: { fontSize: 16 },
  modalCancelButton: { paddingVertical: 16, alignItems: "center", borderTopWidth: 1, marginTop: 4 },
  modalCancelText: { fontSize: 16 },
});
