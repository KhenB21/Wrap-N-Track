import React, { useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ScrollView,
  ToastAndroid,
} from "react-native";
import Header from "../Components/Header";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../Context/ThemeContext";

export default function OrderSummaryScreen({ navigation, route }) {
  const { product } = route.params;
  const [note, setNote] = useState("");
  const [payment, setPayment] = useState("cod");
  const { darkMode } = useTheme();
  const shipping = 49;
  const [quantity, setQuantity] = useState(product.quantity || 1);
  const price = product.price
    ? parseInt(product.price.replace(/[^\d]/g, ""), 10)
    : 0;
  const subtotal = price * quantity;
  const total = subtotal + shipping;

  // Color palette
  const colors = {
    bg: darkMode ? "#18191A" : "#fff",
    card: darkMode ? "#242526" : "#fff",
    text: darkMode ? "#fff" : "#111",
    subText: darkMode ? "#B0B3B8" : "#444",
    border: darkMode ? "#393A3B" : "#C7C5D1",
    accent: darkMode ? "#fff" : "#111",
    inputBg: darkMode ? "#242526" : "#F5F4FA",
    inputText: darkMode ? "#fff" : "#111",
    radio: darkMode ? "#fff" : "#111",
    radioDot: darkMode ? "#fff" : "#111",
    bottomBar: darkMode ? "#242526" : "#6B6593", 
    btn: darkMode ? "#393A3B" : "#A3A3BC",
    btnText: "#fff",
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header
        showBack // Change from showMenu to showBack
        logoType="image"
        showCart
        onBackPress={() => navigation.goBack()} // Add back button handler
        onCartPress={() => navigation.navigate("MyCart")}
        darkMode={darkMode}
      />
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <Text style={[styles.title, { color: colors.text }]}>
          ORDER SUMMARY
        </Text>
        <View
          style={[
            styles.productCard,
            { backgroundColor: colors.card, shadowColor: colors.text },
          ]}
        >
          <Image source={product.image} style={styles.productImage} />
          <View
            style={{ flex: 1, marginLeft: 12, justifyContent: "space-between" }}
          >
            <Text style={[styles.productName, { color: colors.text }]}>
              {product.title}
            </Text>
            <Text style={[styles.productSubtitle, { color: colors.subText }]}>
              {product.subtitle}
            </Text>
            <Text style={[styles.productDesc, { color: colors.subText }]}>
              {product.desc}
            </Text>
            <View style={styles.productBottomRowCard}>
              <Text style={[styles.priceText, { color: colors.text }]}>
                ₱{price.toLocaleString()}
              </Text>
              <View style={styles.quantityBoxCard}>
                <Text style={styles.quantityLabelCard}>QUANTITY</Text>
                <View
                  style={[
                    styles.quantitySelectorCard,
                    { backgroundColor: darkMode ? colors.card : "#6B6593" },
                  ]}
                >
                  <TouchableOpacity
                    onPress={() => setQuantity((q) => (q > 1 ? q - 1 : 1))}
                    style={styles.quantityBtnCard}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.quantityBtnTextCard}>-</Text>
                  </TouchableOpacity>
                  <Text style={styles.quantityValueCard}>{quantity}</Text>
                  <TouchableOpacity
                    onPress={() => setQuantity((q) => q + 1)}
                    style={styles.quantityBtnCard}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.quantityBtnTextCard}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </View>
        <View
          style={[
            styles.section,
            { backgroundColor: colors.card, shadowColor: colors.text },
          ]}
        >
          <View style={styles.row}>
            <MaterialCommunityIcons
              name="map-marker"
              size={20}
              color={colors.text}
            />
            <Text style={[styles.addressText, { color: colors.text }]}>
              123 MENDOZA, CENTRAL VILLAGE, MANILA, PHILIPPINES
            </Text>
          </View>
        </View>
        <View
          style={[
            styles.section,
            { backgroundColor: colors.card, shadowColor: colors.text },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            ORDER SUMMARY
          </Text>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.text }]}>
              SUBTOTAL
            </Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>
              ₱{subtotal.toLocaleString()}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.text }]}>
              SHIPPING
            </Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>
              ₱{shipping}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.text }]}>
              TOTAL
            </Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>
              ₱{total.toLocaleString()}
            </Text>
          </View>
        </View>
        <View
          style={[
            styles.section,
            { backgroundColor: colors.card, shadowColor: colors.text },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            PAYMENT METHOD
          </Text>
          <TouchableOpacity
            style={styles.paymentRow}
            onPress={() => setPayment("cod")}
          >
            <View
              style={[
                styles.radio,
                { borderColor: colors.radio },
                payment === "cod" && { borderColor: colors.accent },
              ]}
            >
              {payment === "cod" && (
                <View
                  style={[
                    styles.radioDot,
                    { backgroundColor: colors.radioDot },
                  ]}
                />
              )}
            </View>
            <Text style={[styles.paymentText, { color: colors.text }]}>
              CASH ON DELIVERY
            </Text>
          </TouchableOpacity>
        </View>
        <View
          style={[
            styles.section,
            { backgroundColor: colors.card, shadowColor: colors.text },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            ADD NOTE
          </Text>
          <TextInput
            style={[
              styles.noteInput,
              {
                backgroundColor: colors.inputBg,
                color: colors.inputText,
                borderColor: colors.border,
              },
            ]}
            placeholder="Add a note..."
            placeholderTextColor={colors.subText}
            value={note}
            onChangeText={setNote}
            multiline
          />
        </View>
      </ScrollView>
      <View
        style={[
          styles.bottomBar,
          { backgroundColor: darkMode ? colors.card : colors.bottomBar },
        ]}
      >
        <Text style={[styles.totalLabel, { color: colors.btnText }]}>
          TOTAL: ₱{total.toLocaleString()}
        </Text>
        <TouchableOpacity
          style={[styles.buyNowBtn, { backgroundColor: colors.btn }]}
          onPress={() => {
            ToastAndroid.show("Order placed successfully!", ToastAndroid.SHORT);
            navigation.navigate("Home"); // Navigate to Home after buying
          }}
        >
          <Text style={[styles.buyNowText, { color: colors.btnText }]}>
            BUY NOW
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    marginVertical: 16,
    fontFamily: "serif",
    letterSpacing: 1,
  },
  productCard: {
    flexDirection: "row",
    borderRadius: 12,
    marginHorizontal: 16,
    padding: 12,
    alignItems: "center",
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 2,
    marginBottom: 12,
  },
  productImage: {
    width: 70,
    height: 70,
    borderRadius: 10,
    backgroundColor: "#EDECF3",
  },
  productName: {
    fontSize: 16,
    fontWeight: "bold",
    fontFamily: "serif",
  },
  productSubtitle: { fontSize: 12, fontFamily: "serif" },
  productDesc: {
    fontSize: 10,
    fontFamily: "serif",
    marginBottom: 4,
  },
  productBottomRowCard: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginTop: 12,
  },
  priceText: {
    fontSize: 16,
    fontWeight: "bold",
    fontFamily: "serif",
  },
  quantityBoxCard: {
    alignItems: "flex-end",
    justifyContent: "flex-end",
    minWidth: 90,
    marginLeft: 12,
  },
  quantityLabelCard: {
    fontSize: 11,
    color: "#888",
    fontFamily: "serif",
    letterSpacing: 1,
    marginBottom: 2,
    textAlign: "right",
    fontWeight: "400",
  },
  quantitySelectorCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    borderRadius: 5,
    backgroundColor: "#6B6593",
    padding: 1,
    width: 70,
    alignSelf: "flex-end",
  },
  quantityBtnCard: {
    backgroundColor: "#fff",
    borderRadius: 5,
    width: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 2,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 2,
  },
  quantityBtnTextCard: {
    color: "#222",
    fontSize: 15,
    fontWeight: "400",
    fontFamily: "serif",
    textAlign: "center",
  },
  quantityValueCard: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "serif",
    textAlign: "center",
    width: 16,
  },
  section: {
    borderRadius: 10,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    shadowOpacity: 0.04,
    shadowRadius: 1,
    elevation: 1,
  },
  row: { flexDirection: "row", alignItems: "center" },
  addressText: {
    marginLeft: 8,
    fontFamily: "serif",
    fontSize: 12,
    flex: 1,
  },
  sectionTitle: {
    fontWeight: "bold",
    fontSize: 13,
    marginBottom: 6,
    fontFamily: "serif",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  summaryLabel: { fontSize: 12, fontFamily: "serif" },
  summaryValue: {
    fontWeight: "bold",
    fontSize: 12,
    fontFamily: "serif",
  },
  paymentRow: { flexDirection: "row", alignItems: "center", marginTop: 8 },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  paymentText: { fontFamily: "serif", fontSize: 13 },
  noteInput: {
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 50,
    padding: 8,
    fontFamily: "serif",
  },
  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  totalLabel: {
    fontWeight: "bold",
    fontSize: 16,
    fontFamily: "serif",
  },
  buyNowBtn: {
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 32,
  },
  buyNowText: {
    fontWeight: "bold",
    fontSize: 15,
    fontFamily: "serif",
  },
});
