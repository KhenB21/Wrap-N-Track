// OrderSummaryScreen.jsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";

export default function OrderSummaryScreen({ route, navigation }) {
  const { productId, userId } = route.params;
  const [product, setProduct] = useState(null);
  const [user, setUser] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [expectedDelivery, setExpectedDelivery] = useState(
    new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );

  const shippingFee = 49;

  // Defensive: prevent crash if params are missing
  if (!productId || !userId) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Error: Missing product or user ID.</Text>
      </View>
    );
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [productRes, userRes] = await Promise.all([
          axios.get(`http://10.0.2.2:5000/api/products/${productId}`),
          axios.get(`http://10.0.2.2:5000/api/users/${userId}`),
        ]);

        setProduct(productRes.data);
        setUser(userRes.data);
        setLoading(false);
      } catch (err) {
        console.error(err);
      }
    };
    fetchData();
  }, [productId, userId]);

  const subtotal = product ? product.price * quantity : 0;
  const total = subtotal + shippingFee;

  const handleBuyNow = async () => {
    try {
      const response = await axios.post("http://10.0.2.2:5000/api/orders", {
        name: product.name,
        shipped_to: user.name,
        expected_delivery: expectedDelivery,
        status: "Pending",
        shipping_address: user.address,
        total_cost: total,
        telephone: user.telephone || "",
        cellphone: user.cellphone,
        email_address: user.email,
      });
      Alert.alert("Success", "Your order has been placed!");
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to place the order.");
    }
  };

  if (loading || !product || !user) {
    return (
      <ActivityIndicator size="large" color="#000" style={{ marginTop: 50 }} />
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>ORDER SUMMARY</Text>

      <View style={styles.card}>
        <Image
          source={{ uri: product.image_url }}
          style={styles.productImage}
        />
        <View style={styles.details}>
          <Text style={styles.name}>{product.name}</Text>
          <Text style={styles.subtitle}>{product.description}</Text>
          <Text style={styles.price}>₱{product.price}</Text>

          <View style={styles.quantityRow}>
            <Text style={styles.qtyLabel}>QUANTITY</Text>
            <View style={styles.qtyControl}>
              <TouchableOpacity
                onPress={() => quantity > 1 && setQuantity(quantity - 1)}
              >
                <Ionicons name="remove-circle-outline" size={24} color="#000" />
              </TouchableOpacity>
              <Text style={styles.qtyValue}>{quantity}</Text>
              <TouchableOpacity onPress={() => setQuantity(quantity + 1)}>
                <Ionicons name="add-circle-outline" size={24} color="#000" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.addressCard}>
        <Text style={styles.addressTitle}>{user.name}</Text>
        <Text style={styles.addressText}>📍 {user.address}</Text>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Expected Delivery</Text>
        <TextInput
          value={expectedDelivery}
          onChangeText={setExpectedDelivery}
          style={styles.input}
          placeholder="YYYY-MM-DD"
        />
      </View>

      <View style={styles.summaryBox}>
        <Text style={styles.summaryTitle}>ORDER SUMMARY</Text>
        <View style={styles.summaryRow}>
          <Text>Subtotal</Text>
          <Text>₱{subtotal}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text>Shipping</Text>
          <Text>₱{shippingFee}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={{ fontWeight: "bold" }}>Total</Text>
          <Text style={{ fontWeight: "bold" }}>₱{total}</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.actionBtn} onPress={handleBuyNow}>
        <Text style={styles.actionBtnText}>BUY NOW</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 16 },
  title: {
    textAlign: "center",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 12,
  },
  card: {
    flexDirection: "row",
    backgroundColor: "#f9f9f9",
    borderRadius: 10,
    padding: 10,
  },
  productImage: { width: 100, height: 100, borderRadius: 10 },
  details: { flex: 1, marginLeft: 10 },
  name: { fontSize: 16, fontWeight: "bold" },
  subtitle: { fontSize: 12, color: "#555", marginBottom: 4 },
  price: { fontSize: 16, color: "#000", fontWeight: "bold" },
  quantityRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
  },
  qtyLabel: { fontSize: 12 },
  qtyControl: { flexDirection: "row", alignItems: "center", gap: 10 },
  qtyValue: { fontSize: 16, paddingHorizontal: 8 },
  addressCard: {
    marginTop: 20,
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    padding: 12,
  },
  addressTitle: { fontWeight: "bold", fontSize: 14 },
  addressText: { fontSize: 13, color: "#555", marginTop: 4 },
  inputGroup: { marginTop: 16 },
  inputLabel: { fontSize: 13, marginBottom: 6, color: "#444" },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 6, padding: 10 },
  summaryBox: {
    marginTop: 24,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#f9f9f9",
    borderTopWidth: 1,
    borderColor: "#ccc",
  },
  summaryTitle: {
    fontWeight: "bold",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 10,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  actionBtn: {
    backgroundColor: "#a49dbb",
    borderRadius: 6,
    paddingVertical: 14,
    marginTop: 20,
    alignItems: "center",
  },
  actionBtnText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 15,
    letterSpacing: 1,
  },
});
