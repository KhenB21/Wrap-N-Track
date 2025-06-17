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
  Modal,
} from "react-native";
import { Ionicons, MaterialIcons, Feather } from "@expo/vector-icons";
import axios from "axios";
import Header from "../Components/Header";
import CustomAlert from "../Components/CustomAlert";
import DoneAlert from "../Components/DoneAlert";

// 1. Local image map (edit as needed)
const imageMap = {
  "Gian_Becka.png": require("../../assets/Images/Gian_Becka.png"),
  "Eric_Mariel.png": require("../../assets/Images/Eric_Mariel.png"),
  "Carlo_Isabelle.png": require("../../assets/Images/Carlo_Isabelle.png"),
  // ...add more mappings as you need!
};

export default function OrderSummaryScreen({ route, navigation }) {
  const { productId, userId } = route.params;
  const [product, setProduct] = useState(null);
  const [user, setUser] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [expectedDelivery, setExpectedDelivery] = useState("");
  const [note, setNote] = useState("");

  // Modal & address state
  const [addressModalVisible, setAddressModalVisible] = useState(false);
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressIdx, setSelectedAddressIdx] = useState(0);

  // Add address input
  const [addingAddress, setAddingAddress] = useState(false);
  const [newAddress, setNewAddress] = useState("");

  const [alertVisible, setAlertVisible] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [doneVisible, setDoneVisible] = useState(false);

  const shippingFee = 49;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [productRes, userRes] = await Promise.all([
          axios.get(`http://10.0.2.2:5000/api/products/${productId}`),
          axios.get(`http://10.0.2.2:5000/api/users/${userId}`),
        ]);
        setProduct(productRes.data);
        setUser(userRes.data);

        setAddresses([
          userRes.data.address,
        ]);
        setSelectedAddressIdx(0);
        setLoading(false);
      } catch (err) {
        console.error(err);
      }
    };
    fetchData();
  }, [productId, userId]);

  if (!productId || !userId) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Error: Missing product or user ID.</Text>
      </View>
    );
  }

  const subtotal = product ? product.price * quantity : 0;
  const total = subtotal + shippingFee;

  const handleBuyNow = async () => {
    if (!expectedDelivery || !/^\d{2}\/\d{2}\/\d{2}$/.test(expectedDelivery)) {
      setAlertMessage(
        "Please enter a valid expected delivery date (MM/DD/YY)."
      );
      setAlertVisible(true);
      return;
    }
    try {
      await axios.post("http://10.0.2.2:5000/api/orders", {
        name: product.name,
        shipped_to: user.name,
        expected_delivery: expectedDelivery,
        status: "Pending",
        shipping_address: addresses[selectedAddressIdx],
        total_cost: total,
        cellphone: user.phone,
        email_address: user.email,
      });
      setDoneVisible(true);
    } catch (err) {
      console.error(err);
      setAlertMessage("Error: Failed to place the order.");
      setAlertVisible(true);
    }
  };

  const handleDateInput = (text) => {
    let cleaned = text.replace(/\D/g, "");
    let formatted = cleaned;
    if (cleaned.length > 2 && cleaned.length <= 4) {
      formatted = cleaned.slice(0, 2) + "/" + cleaned.slice(2);
    } else if (cleaned.length > 4) {
      formatted =
        cleaned.slice(0, 2) +
        "/" +
        cleaned.slice(2, 4) +
        "/" +
        cleaned.slice(4, 6);
    }
    setExpectedDelivery(formatted);
  };

  const handleCartPress = () => {
    navigation.navigate("Cart");
  };

  const handleDone = () => {
    setDoneVisible(false);
    navigation.navigate("Home");
  };

  if (loading || !product || !user) {
    return (
      <ActivityIndicator size="large" color="#000" style={{ marginTop: 50 }} />
    );
  }

  // 2. Decide image source
  let productImageSource;
  if (imageMap[product.image_url]) {
    productImageSource = imageMap[product.image_url];
  } else {
    productImageSource = { uri: product.image_url };
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <Header navigation={navigation} onCartPress={handleCartPress} />

      {/* Address Selector Modal */}
      <Modal
        visible={addressModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAddressModalVisible(false)}
      >
        <View style={styles.modalBackground}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>SELECT DELIVERY ADDRESS</Text>
            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => {
                setAddressModalVisible(false);
                setAddingAddress(false);
                setNewAddress("");
              }}
            >
              <Ionicons name="close" size={22} color="#222" />
            </TouchableOpacity>
            {addresses.map((addr, idx) => (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.modalAddressBtn,
                  idx === selectedAddressIdx && styles.modalAddressBtnSelected,
                ]}
                onPress={() => {
                  setSelectedAddressIdx(idx);
                  setAddressModalVisible(false);
                }}
              >
                {idx === selectedAddressIdx ? (
                  <Text
                    style={{
                      fontSize: 10,
                      color: "#726d8a",
                      textAlign: "center",
                      marginBottom: 2,
                    }}
                  >
                    CURRENT
                  </Text>
                ) : null}
                <Text style={styles.modalAddressText}>{addr}</Text>
              </TouchableOpacity>
            ))}

            {!addingAddress ? (
              <TouchableOpacity
                style={styles.modalAddAddressBtn}
                onPress={() => setAddingAddress(true)}
              >
                <Text style={styles.modalAddAddressText}>ADD ADDRESS</Text>
              </TouchableOpacity>
            ) : (
              <View
                style={{ width: "100%", alignItems: "center", marginTop: 8 }}
              >
                <TextInput
                  style={{
                    backgroundColor: "#fff",
                    borderColor: "#ccc",
                    borderWidth: 1,
                    borderRadius: 8,
                    padding: 10,
                    fontSize: 13,
                    width: "100%",
                  }}
                  value={newAddress}
                  onChangeText={setNewAddress}
                  placeholder="Enter new address"
                  autoFocus
                />
                <View style={{ flexDirection: "row", marginTop: 8 }}>
                  <TouchableOpacity
                    style={{
                      backgroundColor: "#726d8a",
                      paddingVertical: 8,
                      paddingHorizontal: 18,
                      borderRadius: 8,
                      marginRight: 10,
                    }}
                    onPress={() => {
                      if (!newAddress.trim()) {
                        Alert.alert("Please enter an address.");
                        return;
                      }
                      setAddresses((prev) => [newAddress.trim(), ...prev]);
                      setSelectedAddressIdx(0);
                      setAddingAddress(false);
                      setNewAddress("");
                      setAddressModalVisible(false);
                    }}
                  >
                    <Text style={{ color: "#fff", fontWeight: "bold" }}>
                      SAVE
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{
                      backgroundColor: "#dedede",
                      paddingVertical: 8,
                      paddingHorizontal: 18,
                      borderRadius: 8,
                    }}
                    onPress={() => {
                      setAddingAddress(false);
                      setNewAddress("");
                    }}
                  >
                    <Text style={{ color: "#333" }}>CANCEL</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>

      <View style={{ flex: 1, padding: 16, paddingTop: 100 }}>
        <Text style={styles.title}>ORDER SUMMARY</Text>

        {/* Product Card */}
        <View style={styles.card}>
          <Image
            source={productImageSource}
            style={styles.productImage}
            resizeMode="contain"
          />
          <View style={styles.details}>
            <Text style={styles.name}>{product.name}</Text>
            <Text style={styles.subtitle}>{product.description}</Text>
            <View style={styles.rowBetween}>
              <Text style={styles.price}>₱{product.price}</Text>
              <View style={styles.quantityRow}>
                <Text style={styles.qtyLabel}>QUANTITY</Text>
                <View style={styles.qtyControl}>
                  <TouchableOpacity
                    onPress={() => quantity > 1 && setQuantity(quantity - 1)}
                  >
                    <Ionicons
                      name="remove-circle-outline"
                      size={22}
                      color="#a49dbb"
                    />
                  </TouchableOpacity>
                  <TextInput
                    style={styles.qtyValue}
                    value={quantity.toString()}
                    keyboardType="number-pad"
                    onChangeText={(val) => {
                      const num = parseInt(val.replace(/\D/g, ""));
                      setQuantity(isNaN(num) || num < 1 ? 1 : num);
                    }}
                  />
                  <TouchableOpacity onPress={() => setQuantity(quantity + 1)}>
                    <Ionicons
                      name="add-circle-outline"
                      size={22}
                      color="#a49dbb"
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Address Card */}
        <TouchableOpacity onPress={() => setAddressModalVisible(true)}>
          <View style={styles.userCard}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Text style={styles.userName}>{user.name || "No Name"}</Text>
              <Text style={styles.userPhone}>
                {user.phone ? `(+63)${user.phone}` : "No Number"}
              </Text>
            </View>
            <View style={styles.addressRow}>
              <MaterialIcons name="location-on" size={18} color="#a49dbb" />
              <Text style={styles.addressText}>
                {addresses[selectedAddressIdx]}
              </Text>
              <Feather
                name="chevron-right"
                size={20}
                color="#a49dbb"
                style={{ marginLeft: "auto" }}
              />
            </View>
          </View>
        </TouchableOpacity>

        {/* Expected Date to Deliver */}
        <View style={styles.sectionBox}>
          <Text style={styles.sectionLabel}>EXPECTED DATE TO DELIVER</Text>
          <View style={styles.dateRow}>
            <TextInput
              style={styles.dateInput}
              value={expectedDelivery}
              onChangeText={handleDateInput}
              placeholder="MM/DD/YY"
              placeholderTextColor="#888"
              keyboardType="number-pad"
              maxLength={8}
            />
            <Ionicons name="calendar-outline" size={24} color="#222" />
          </View>
        </View>

        {/* Add Note */}
        <View style={styles.sectionBox}>
          <Text style={styles.sectionLabel}>ADD NOTE</Text>
          <TextInput
            style={styles.noteInput}
            value={note}
            onChangeText={setNote}
            placeholder="Type your note here..."
            placeholderTextColor="#888"
            multiline
            numberOfLines={4}
          />
        </View>

        {/* Order Summary */}
        <View style={styles.sectionBox}>
          <Text style={styles.sectionLabel}>ORDER SUMMARY</Text>
          <View style={styles.summaryContent}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryText}>Subtotal</Text>
              <Text style={styles.summaryText}>₱{subtotal}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryText}>Shipping</Text>
              <Text style={styles.summaryText}>₱{shippingFee}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryText, { fontWeight: "bold" }]}>
                Total
              </Text>
              <Text style={[styles.summaryText, { fontWeight: "bold" }]}>
                ₱{total}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerTotalLabel}>TOTAL:</Text>
        <Text style={styles.footerTotalValue}>₱{total}</Text>
        <TouchableOpacity style={styles.footerBtn} onPress={handleBuyNow}>
          <Text style={styles.footerBtnText}>BUY NOW</Text>
        </TouchableOpacity>
      </View>

      {/* Custom Alerts */}
      <CustomAlert
        visible={alertVisible}
        message={alertMessage}
        onClose={() => setAlertVisible(false)}
      />
      <DoneAlert
        visible={doneVisible}
        message={
          "THANK YOU FOR PURCHASING,\nWE WILL CONTACTING YOU SOON\nFOR MORE DETAILS"
        }
        onDone={handleDone}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  modalBackground: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.25)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    backgroundColor: "#f8f8f8",
    borderRadius: 15,
    width: "90%",
    padding: 20,
    alignItems: "center",
    position: "relative",
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: "bold",
    marginBottom: 16,
    letterSpacing: 1,
  },
  modalCloseBtn: {
    position: "absolute",
    right: 12,
    top: 12,
    padding: 6,
    zIndex: 1,
  },
  modalAddressBtn: {
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 10,
    marginVertical: 6,
    padding: 12,
    width: "100%",
    backgroundColor: "#fff",
  },
  modalAddressBtnSelected: {
    borderColor: "#726d8a",
    backgroundColor: "#f0eef7",
  },
  modalAddressText: {
    fontSize: 13,
    textAlign: "center",
    color: "#222",
  },
  modalAddAddressBtn: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    marginVertical: 8,
    padding: 12,
    width: "100%",
    backgroundColor: "#fff",
  },
  modalAddAddressText: {
    fontSize: 13,
    textAlign: "center",
    color: "#888",
  },
  // ... the rest of your styles from before ...
  header: {
    backgroundColor: "#a49dbb",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 40,
    paddingHorizontal: 18,
    paddingBottom: 10,
  },
  logo: { width: 120, height: 36 },
  title: {
    textAlign: "center",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
    fontFamily: "serif",
    letterSpacing: 1,
  },
  card: {
    flexDirection: "row",
    backgroundColor: "#f9f9f9",
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
    alignItems: "center",
  },
  productImage: { width: 110, height: 110, borderRadius: 10 },
  details: { flex: 1, marginLeft: 14 },
  name: {
    fontSize: 17,
    fontWeight: "bold",
    marginBottom: 2,
    fontFamily: "serif",
  },
  subtitle: { fontSize: 12, color: "#555", marginBottom: 8 },
  price: { fontSize: 16, color: "#000", fontWeight: "bold" },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  quantityRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  qtyLabel: {
    fontSize: 12,
    marginRight: 6,
    color: "#888",
  },
  qtyControl: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center", // center the controls
    width: 90, // reduce width to fit inside card
    backgroundColor: "transparent",
    borderRadius: 6,
    borderWidth: 0,
  },
  qtyValue: {
    width: 32, // slightly smaller
    textAlign: "center",
    fontSize: 16,
    borderBottomWidth: 1,
    borderColor: "#a49dbb",
    marginHorizontal: 2, // reduce margin
    paddingVertical: 0,
    paddingHorizontal: 0,
    backgroundColor: "transparent",
  },
  userCard: {
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    marginTop: 6,
  },
  userName: { fontWeight: "bold", fontSize: 14 },
  userPhone: { fontSize: 13, color: "#555" },
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },
  addressText: { fontSize: 13, color: "#555", marginLeft: 4, flex: 1 },
  sectionBox: {
    backgroundColor: "#ededed",
    borderRadius: 8,
    marginBottom: 16,
    padding: 0,
    overflow: "hidden",
  },
  sectionLabel: {
    backgroundColor: "#dedede",
    textAlign: "center",
    fontSize: 15,
    fontFamily: "serif",
    paddingVertical: 6,
    color: "#222",
    letterSpacing: 0.5,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fff",
    borderRadius: 6,
    margin: 10,
    gap: 8,
  },
  dateInput: {
    flex: 1,
    fontSize: 15,
    color: "#222",
    fontFamily: "serif",
    backgroundColor: "transparent",
    borderWidth: 0,
    padding: 0,
  },
  noteInput: {
    backgroundColor: "#fff",
    borderRadius: 6,
    margin: 10,
    minHeight: 90,
    textAlignVertical: "top",
    fontSize: 15,
    fontFamily: "serif",
    padding: 10,
    color: "#222",
  },
  summaryBox: {
    marginTop: 18,
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
    letterSpacing: 1,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  footer: {
    backgroundColor: "#726d8a",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 16,
    justifyContent: "space-between",
  },
  footerTotalLabel: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 15,
    letterSpacing: 1,
  },
  footerTotalValue: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 18,
    marginLeft: 8,
    flex: 1,
  },
  footerBtn: {
    backgroundColor: "#a49dbb",
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 28,
    alignItems: "center",
    marginLeft: 10,
  },
  footerBtnText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 15,
    letterSpacing: 1,
  },
  summaryContent: {
    backgroundColor: "#fff",
    borderRadius: 6,
    margin: 10,
    padding: 10,
  },
  summaryText: {
    fontSize: 15,
    fontFamily: "serif",
    color: "#222",
  },
});
