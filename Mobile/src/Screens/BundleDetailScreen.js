import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  TextInput,
  Dimensions,
} from "react-native";
import Header from "../Components/Header";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../Context/ThemeContext";
import { useAuth } from "../Context/AuthContext";
import { showcaseAPI, orderAPI } from "../services/api";
import { SkeletonText, SkeletonCard } from "../Components/Skeleton/Skeleton";

const { width } = Dimensions.get("window");
const TODAY = new Date().toISOString().slice(0, 10);

// Mirrors Website/client/src/Pages/CustomerPOV/BundleDetails.js — same
// GET /api/showcase/:id + POST /api/orders (bundle_id) the website uses, so
// employee-configured bundles and ordering behave identically on mobile.
export default function BundleDetailScreen({ navigation, route }) {
  const { bundleId } = route.params || {};
  const { darkMode } = useTheme();
  const { user } = useAuth();

  const [bundle, setBundle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [ordering, setOrdering] = useState(false);
  const [orderError, setOrderError] = useState("");
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [form, setForm] = useState({
    name: user?.name || "",
    email: user?.email || user?.email_address || "",
    cellphone: user?.cellphone || user?.phone_number || "",
    shipping_address: "",
    order_quantity: "1",
  });

  useEffect(() => {
    loadBundle();
  }, [bundleId]);

  const loadBundle = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await showcaseAPI.getBundle(bundleId);
      if (!data?.bundle) {
        setError("Bundle not found.");
      } else {
        setBundle(data.bundle);
      }
    } catch (err) {
      console.error("Error loading bundle:", err);
      setError("Couldn't load this bundle. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const colors = {
    bg: darkMode ? "#18191A" : "#F5F4FA",
    card: darkMode ? "#242526" : "#fff",
    text: darkMode ? "#E4E6EB" : "#222",
    sub: darkMode ? "#B0B3B8" : "#6B6593",
    border: darkMode ? "#393A3B" : "#EDECF3",
    accent: "#6B6593",
    input: darkMode ? "#393A3B" : "#F5F4FA",
  };

  const handlePlaceOrder = async () => {
    if (!form.name.trim()) return setOrderError("Full name is required.");
    if (!form.email.trim()) return setOrderError("Email address is required.");
    if (!form.cellphone.trim()) return setOrderError("Phone number is required.");
    if (!form.shipping_address.trim()) return setOrderError("Delivery address is required.");

    setOrdering(true);
    setOrderError("");
    try {
      const result = await orderAPI.createOrder({
        account_name: form.name.trim(),
        name: form.name.trim(),
        shipped_to: form.name.trim(),
        order_date: TODAY,
        expected_delivery: TODAY,
        status: "Pending",
        package_name: bundle.title,
        payment_method: "Cash",
        payment_type: "Full Payment",
        shipping_address: form.shipping_address.trim(),
        cellphone: form.cellphone.trim(),
        email_address: form.email.trim(),
        order_quantity: Number(form.order_quantity) || 1,
        bundle_id: bundle.id,
      });
      if (result?.success === false) {
        throw new Error(result.message || "Unable to place order.");
      }
      setOrderSuccess(true);
    } catch (err) {
      console.error("Error placing bundle order:", err);
      setOrderError(
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err.message ||
        "Unable to place order. Please try again."
      );
    } finally {
      setOrdering(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        <Header showBack onBackPress={() => navigation.goBack()} darkMode={darkMode} title="Bundle" />
        <View style={{ padding: 16 }}>
          <SkeletonCard withImage lines={3} style={{ borderRadius: 12 }} />
          <SkeletonText width="60%" height={16} style={{ marginTop: 16 }} />
        </View>
      </View>
    );
  }

  if (error || !bundle) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        <Header showBack onBackPress={() => navigation.goBack()} darkMode={darkMode} title="Bundle" />
        <View style={styles.centerState}>
          <MaterialCommunityIcons name="alert-circle-outline" size={56} color={colors.sub} />
          <Text style={[styles.centerStateText, { color: colors.sub }]}>{error || "Bundle not found."}</Text>
          <TouchableOpacity style={[styles.retryButton, { backgroundColor: colors.accent }]} onPress={loadBundle}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (orderSuccess) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        <Header showBack onBackPress={() => navigation.goBack()} darkMode={darkMode} title="Bundle" />
        <View style={styles.centerState}>
          <MaterialCommunityIcons name="check-circle" size={56} color="#4CAF50" />
          <Text style={[styles.centerStateTitle, { color: colors.text }]}>Order Received</Text>
          <Text style={[styles.centerStateText, { color: colors.sub }]}>
            Your order for {bundle.title} has been placed. We'll be in touch shortly.
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.accent }]}
            onPress={() => navigation.navigate("CustomerTabs", { screen: "Orders" })}
          >
            <Text style={styles.retryButtonText}>View My Deliveries</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const imgSrc = bundle.cover_image
    ? { uri: `data:${bundle.cover_image_mime || "image/jpeg"};base64,${bundle.cover_image}` }
    : null;

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <Header showBack showCart onBackPress={() => navigation.goBack()} onCartPress={() => navigation.navigate("MyCart")} darkMode={darkMode} title={bundle.title} />
      <ScrollView showsVerticalScrollIndicator={false}>
        {imgSrc ? (
          <Image source={imgSrc} style={styles.heroImage} resizeMode="cover" />
        ) : (
          <View style={[styles.heroImage, { backgroundColor: colors.border, alignItems: "center", justifyContent: "center" }]}>
            <MaterialCommunityIcons name="image-off-outline" size={48} color={colors.sub} />
          </View>
        )}

        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <View style={[styles.categoryBadge, { backgroundColor: colors.accent }]}>
            <Text style={styles.categoryBadgeText}>
              {bundle.category.charAt(0).toUpperCase() + bundle.category.slice(1)}
            </Text>
          </View>
          <Text style={[styles.title, { color: colors.text }]}>{bundle.title}</Text>
          {bundle.description ? (
            <Text style={[styles.description, { color: colors.sub }]}>{bundle.description}</Text>
          ) : null}
        </View>

        {bundle.bundle_items?.length > 0 && (
          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>What's Included</Text>
            {bundle.bundle_items.map((item) => (
              <View key={item.id} style={styles.includedRow}>
                <View style={[styles.dot, { backgroundColor: colors.accent }]} />
                <Text style={[styles.includedName, { color: colors.text }]}>{item.item_name}</Text>
                <Text style={[styles.includedQty, { color: colors.sub }]}>× {item.quantity}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Order This Bundle</Text>

          <Text style={[styles.label, { color: colors.text }]}>Full Name</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.input, color: colors.text, borderColor: colors.border }]}
            value={form.name}
            onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
            placeholder="Your full name"
            placeholderTextColor={colors.sub}
          />

          <Text style={[styles.label, { color: colors.text }]}>Email</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.input, color: colors.text, borderColor: colors.border }]}
            value={form.email}
            onChangeText={(v) => setForm((f) => ({ ...f, email: v }))}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder="your@email.com"
            placeholderTextColor={colors.sub}
          />

          <Text style={[styles.label, { color: colors.text }]}>Phone</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.input, color: colors.text, borderColor: colors.border }]}
            value={form.cellphone}
            onChangeText={(v) => setForm((f) => ({ ...f, cellphone: v }))}
            keyboardType="phone-pad"
            placeholder="+63 9XX XXX XXXX"
            placeholderTextColor={colors.sub}
          />

          <Text style={[styles.label, { color: colors.text }]}>Delivery Address</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.input, color: colors.text, borderColor: colors.border }]}
            value={form.shipping_address}
            onChangeText={(v) => setForm((f) => ({ ...f, shipping_address: v }))}
            placeholder="Street, City, Province"
            placeholderTextColor={colors.sub}
          />

          <Text style={[styles.label, { color: colors.text }]}>Quantity</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.input, color: colors.text, borderColor: colors.border }]}
            value={form.order_quantity}
            onChangeText={(v) => setForm((f) => ({ ...f, order_quantity: v.replace(/\D/g, "") }))}
            keyboardType="number-pad"
          />

          {orderError ? <Text style={styles.errorText}>{orderError}</Text> : null}

          <TouchableOpacity
            style={[styles.orderButton, { backgroundColor: colors.accent, opacity: ordering ? 0.7 : 1 }]}
            onPress={handlePlaceOrder}
            disabled={ordering}
          >
            <Text style={styles.orderButtonText}>{ordering ? "Placing Order…" : "Place Order"}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  heroImage: { width, height: 240 },
  section: { margin: 16, marginTop: 0, padding: 18, borderRadius: 12, elevation: 2 },
  categoryBadge: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginTop: 16, marginBottom: 8 },
  categoryBadgeText: { color: "#fff", fontSize: 11, fontWeight: "bold" },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 8 },
  description: { fontSize: 14, lineHeight: 20 },
  sectionTitle: { fontSize: 16, fontWeight: "bold", marginBottom: 12 },
  includedRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  dot: { width: 6, height: 6, borderRadius: 3, marginRight: 10 },
  includedName: { flex: 1, fontSize: 14 },
  includedQty: { fontSize: 13 },
  label: { fontSize: 13, fontWeight: "600", marginTop: 10, marginBottom: 4 },
  input: { borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 14 },
  errorText: { color: "#EF5350", fontSize: 13, marginTop: 10 },
  orderButton: { marginTop: 18, borderRadius: 8, paddingVertical: 12, alignItems: "center" },
  orderButtonText: { color: "#fff", fontWeight: "bold", fontSize: 15 },
  centerState: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  centerStateTitle: { fontSize: 18, fontWeight: "bold", marginTop: 12, marginBottom: 6 },
  centerStateText: { fontSize: 14, textAlign: "center", marginTop: 12 },
  retryButton: { marginTop: 16, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 },
  retryButtonText: { color: "#fff", fontWeight: "bold" },
});
