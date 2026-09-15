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
import { useAuth } from "../Context/AuthContext";
import { inventoryAPI, otpAPI } from "../services/api";
import { PACKAGING_KEY } from "../constants/boutique";
import DatePickerModal from "../Components/DatePickerModal";
import { formatLongDate } from "../constants/orderBoard";
import { PH_MOBILE_LENGTH, normalizePhMobile, phMobileError, sanitizePhMobileInput } from "../constants/phone";

export default function CheckoutScreen({ navigation, route }) {
  const { selectedItems } = route.params || {};
  const { cartItems, totalPrice, checkout, clearCart } = useCart();
  const { profile } = useProfile();
  const { user } = useAuth();
  const { darkMode } = useTheme();

  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [shippingAddress, setShippingAddress] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  // SKUs staff published under Packaging. null while loading.
  const [packagingSkus, setPackagingSkus] = useState(null);

  useEffect(() => {
    let cancelled = false;
    inventoryAPI
      .getAvailableInventory()
      .then((data) => {
        if (!cancelled) setPackagingSkus(new Set(((data?.available || {})[PACKAGING_KEY] || []).map((p) => String(p.sku))));
      })
      .catch((err) => {
        console.error("Failed to load packaging products", err);
        if (!cancelled) setPackagingSkus(new Set());
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const [remarks, setRemarks] = useState("");
  // Order confirmation by email OTP — same /api/otp endpoints as the Website order page.
  const [otpModalVisible, setOtpModalVisible] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpError, setOtpError] = useState("");
  const [resendCountdown, setResendCountdown] = useState(0);

  const customerEmail = user?.email || user?.email_address || profile?.email || profile?.email_address || "";

  useEffect(() => {
    if (resendCountdown <= 0) return undefined;
    const timer = setTimeout(() => setResendCountdown((prev) => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCountdown]);

  useEffect(() => {
    if (profile) {
      setShippingAddress(profile.address || "");
      setContactNumber(normalizePhMobile(profile.phone || ""));
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
    const contactError = phMobileError(contactNumber, { required: true });
    if (contactError) {
      Alert.alert("Error", `Contact number: ${contactError}`);
      return false;
    }
    if (!eventDate) {
      Alert.alert("Error", "Please select the event/delivery date");
      return false;
    }
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(eventDate.trim())) {
      Alert.alert("Error", "Event date must be in YYYY-MM-DD format (e.g. 2025-12-25)");
      return false;
    }
    return true;
  };

  // Mirrors the Website's sendOtp error handling (OrderBoutique.js).
  const sendOtp = async () => {
    try {
      await otpAPI.sendOtp(customerEmail);
      setResendCountdown(30);
      setOtpError("");
      return true;
    } catch (err) {
      const status = err.response?.status;
      const message = err.response?.data?.message;
      if (status === 429) setOtpError(message || "Please wait before requesting another code.");
      else if (status === 400) setOtpError(message || "Unable to send the code. Please check your email.");
      else setOtpError("Failed to send the code. Use Resend, or check your email.");
      return false;
    }
  };

  const handleCheckout = async () => {
    if (!validateForm()) return;

    const itemsToCheckout = selectedItems || cartItems;
    if (itemsToCheckout.length === 0) {
      Alert.alert("Error", "No items to checkout");
      return;
    }
    if (packagingSkus === null) {
      Alert.alert("Please wait", "We are still checking your order. Try again in a moment.");
      return;
    }
    if (!itemsToCheckout.some((item) => packagingSkus.has(String(item.sku)))) {
      Alert.alert(
        "No box in your order",
        "You are ordering products without a box. Every order must include one box from Packaging. Add a box to your cart before placing the order."
      );
      return;
    }
    if (!customerEmail) {
      Alert.alert("Error", "No email on this account. Please update your profile.");
      return;
    }

    setOtpCode("");
    setOtpError("");
    setOtpModalVisible(true);
    setLoading(true);
    await sendOtp();
    setLoading(false);
  };

  const handleResendOtp = async () => {
    if (resendCountdown > 0 || loading) return;
    setLoading(true);
    await sendOtp();
    setLoading(false);
  };

  const handleVerifyAndPlaceOrder = async () => {
    setOtpError("");
    if (!otpCode || otpCode.trim().length < 6) {
      setOtpError("Please enter the 6-digit code.");
      return;
    }

    setLoading(true);
    try {
      try {
        await otpAPI.verifyOtp(customerEmail, otpCode.trim());
      } catch (err) {
        const status = err.response?.status;
        const message = err.response?.data?.message;
        if (status === 400) setOtpError(message || "Invalid or expired code.");
        else if (status === 429) setOtpError(message || "Too many attempts. Request a new code.");
        else setOtpError("Server error verifying the code.");
        return;
      }

      // Payment is coordinated by the team afterwards, as on the Website.
      const checkoutData = {
        shipping_address: shippingAddress.trim(),
        payment_method: "Pending",
        payment_type: "Pending",
        expected_delivery: eventDate.trim(),
        remarks: remarks.trim(),
      };

      const result = await checkout(checkoutData);

      if (result.success) {
        setOtpModalVisible(false);
        setOtpCode("");
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
        setOtpError(result.message || "Failed to place order");
      }
    } catch (error) {
      console.error("Checkout error:", error);
      setOtpError(error.response?.data?.message || "Failed to place order. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const itemsToDisplay = selectedItems || cartItems;
  const missingBox = packagingSkus !== null && !itemsToDisplay.some((item) => packagingSkus.has(String(item.sku)));
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
        onCartPress={() => navigation.navigate("CustomerTabs", { screen: "Cart" })}
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
          {missingBox && (
            <View
              style={{
                flexDirection: "row",
                gap: 10,
                backgroundColor: darkMode ? "#3A2020" : "#FDECEA",
                borderColor: darkMode ? "#7A3B3B" : "#F5C2BD",
                borderWidth: 1,
                borderRadius: 10,
                padding: 12,
                marginBottom: 12,
              }}
              accessibilityRole="alert"
            >
              <MaterialCommunityIcons name="package-variant-remove" size={22} color={darkMode ? "#EF9A9A" : "#B0413E"} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: darkMode ? "#EF9A9A" : "#B0413E", fontWeight: "700", fontSize: 14 }}>
                  You are ordering without a box
                </Text>
                <Text style={{ color: darkMode ? "#F2C4C4" : "#7A2E2B", fontSize: 13, marginTop: 3, lineHeight: 18 }}>
                  Your cart only has products. Every order must include one box from Packaging, so this order cannot be placed until you add a box.
                </Text>
              </View>
            </View>
          )}
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
              onChangeText={(value) => setContactNumber(sanitizePhMobileInput(value))}
              placeholder="09XXXXXXXXX"
              placeholderTextColor={sub}
              keyboardType="number-pad"
              maxLength={PH_MOBILE_LENGTH}
            />
            {contactNumber.length > 0 && phMobileError(contactNumber) ? (
              <Text style={{ color: "#E53935", fontSize: 12, marginTop: 4 }}>{phMobileError(contactNumber)}</Text>
            ) : (
              <Text style={{ color: sub, fontSize: 12, marginTop: 4 }}>PH mobile number, 11 digits ({contactNumber.length}/11)</Text>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: sub }]}>Event / Delivery Date *</Text>
            <TouchableOpacity
              style={[styles.textInput, { backgroundColor: inputBg, borderColor: border, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }]}
              onPress={() => setDatePickerVisible(true)}
              accessibilityLabel="Select event or delivery date"
            >
              <Text style={{ color: eventDate ? text : sub, fontSize: 15 }}>
                {eventDate ? formatLongDate(eventDate) : "Select a date"}
              </Text>
              <MaterialCommunityIcons name="calendar-month-outline" size={20} color={sub} />
            </TouchableOpacity>
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
          style={[styles.checkoutButton, { backgroundColor: "#6B6593" }, (loading || missingBox) && styles.checkoutButtonDisabled]}
          onPress={handleCheckout}
          disabled={loading || missingBox}
        >
          <MaterialCommunityIcons name={loading ? "loading" : "package-variant-closed"} size={20} color="#fff" />
          <Text style={styles.checkoutButtonText}>{loading ? "Placing Order..." : "Place Order"}</Text>
        </TouchableOpacity>
      </View>

      <DatePickerModal
        visible={datePickerVisible}
        onClose={() => setDatePickerVisible(false)}
        onSelect={(iso) => {
          setEventDate(iso);
          setDatePickerVisible(false);
        }}
        selectedDate={eventDate || undefined}
        darkMode={darkMode}
      />

      {/* Order Confirmation (email OTP) Modal */}
      <Modal
        visible={otpModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => !loading && setOtpModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: card }]}>
            <Text style={[styles.modalTitle, { color: text }]}>Confirm Your Order</Text>
            <View style={{ paddingHorizontal: 20 }}>
              <Text style={[styles.inputLabel, { color: sub }]}>
                We sent a 6-digit confirmation code to {customerEmail}. Enter it below to place your order.
              </Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: inputBg, color: text, borderColor: border, textAlign: "center", letterSpacing: 4 }]}
                value={otpCode}
                onChangeText={(v) => { setOtpCode(v.replace(/[^0-9]/g, "")); setOtpError(""); }}
                placeholder="000000"
                placeholderTextColor={sub}
                keyboardType="number-pad"
                maxLength={6}
              />
              {!!otpError && <Text style={styles.otpErrorText}>{otpError}</Text>}
              <TouchableOpacity
                style={[styles.checkoutButton, { backgroundColor: "#6B6593", marginTop: 16 }, (loading || otpCode.length !== 6) && styles.checkoutButtonDisabled]}
                onPress={handleVerifyAndPlaceOrder}
                disabled={loading || otpCode.length !== 6}
              >
                <Text style={styles.checkoutButtonText}>{loading ? "Please wait..." : "Verify & Place Order"}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleResendOtp} disabled={resendCountdown > 0 || loading} style={{ paddingVertical: 12, alignItems: "center" }}>
                <Text style={{ color: resendCountdown > 0 ? sub : "#6B6593", fontWeight: "600" }}>
                  {resendCountdown > 0 ? `Resend Code (${resendCountdown}s)` : "Resend Code"}
                </Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[styles.modalCancelButton, { borderTopColor: border }]}
              onPress={() => setOtpModalVisible(false)}
              disabled={loading}
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
  otpErrorText: { color: "#D9534F", fontSize: 13, marginTop: 8 },
});
