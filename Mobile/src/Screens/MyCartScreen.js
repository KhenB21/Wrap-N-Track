import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
  TextInput,
} from "react-native";
import Header from "../Components/Header";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useCart } from "../Context/CartContext";
import { useTheme } from "../Context/ThemeContext";

const { width } = Dimensions.get("window");

export default function MyCartScreen({ navigation }) {
  const {
    cartItems,
    setCartItems,
    favoriteItems,
    setFavoriteItems,
    toggleFavorite,
  } = useCart();
  const [activeTab, setActiveTab] = useState("cart");
  const [selectedIds, setSelectedIds] = useState([]);
  const { darkMode } = useTheme();

  const handleQuantityChange = (id, value, isCart) => {
    if (isCart) {
      setCartItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, quantity: Math.max(1, value) } : item
        )
      );
    } else {
      setFavoriteItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, quantity: Math.max(1, value) } : item
        )
      );
    }
  };

  const handleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]
    );
  };

  // Add a useEffect to clear selected items when switching tabs
  useEffect(() => {
    setSelectedIds([]);
  }, [activeTab]);

  const handleRemoveItem = (id) => {
    Alert.alert("Remove Item", "Do you really want to remove this item?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => {
          setCartItems((prev) => prev.filter((item) => item.id !== id));
          setFavoriteItems((prev) => prev.filter((item) => item.id !== id));
          setSelectedIds((prev) => prev.filter((sid) => sid !== id));
        },
      },
    ]);
  };

  const itemCardBg = darkMode ? "#242526" : "#F5F4FA";
  const accent = darkMode ? "#fff" : "#6B6593";
  const subText = darkMode ? "#B0B3B8" : "#6B6593";
  const border = darkMode ? "#393A3B" : "#B6B3C6";
  const quantityBg = darkMode ? "#242526" : "#F5F4FA";
  const bottomBarBg = darkMode ? "#393A3B" : "#6B6593";
  const buyNowBg = darkMode ? "#393A3B" : "#B6B3C6";
  const radioDot = darkMode ? "#fff" : "#6B6593";
  const removeBtnBg = darkMode ? "#393A3B" : "#ECECF2";
  const removeBtnText = darkMode ? "#fff" : "#6B6593";
  const quantityValueColor = darkMode ? "#fff" : "#6B6593";

  const renderItem = (item, isCart) => (
    <View
      key={item.id}
      style={[
        styles.itemCard,
        { backgroundColor: itemCardBg, borderColor: border },
      ]}
    >
      <TouchableOpacity
        style={[styles.removeBtn, { backgroundColor: removeBtnBg }]}
        onPress={() => handleRemoveItem(item.id)}
        activeOpacity={0.7}
      >
        <Text style={[styles.removeBtnText, { color: removeBtnText }]}>×</Text>
      </TouchableOpacity>
      <View style={styles.itemRow}>
        <TouchableOpacity
          style={[styles.radioCircle, { borderColor: border }]}
          onPress={() => handleSelect(item.id)}
          activeOpacity={0.7}
        >
          {selectedIds.includes(item.id) && (
            <View style={[styles.radioDot, { backgroundColor: radioDot }]} />
          )}
        </TouchableOpacity>
        <Image source={item.image} style={styles.itemImage} />
        <View style={styles.itemInfo}>
          <Text
            style={[styles.itemTitle, { color: darkMode ? "#E4E6EB" : "#222" }]}
          >
            {item.title}
          </Text>
          <Text style={[styles.itemSubtitle, { color: subText }]}>
            {item.subtitle}
          </Text>
          <Text style={[styles.itemDesc, { color: darkMode ? "#B0B3B8" : "#888" }]}>
            {item.desc}
          </Text>
          <Text style={[styles.itemPrice, { color: darkMode ? "#fff" : "#222" }]}>
            {item.price || "₱1,499"}
          </Text>
          {/* Move quantity row here */}
          <View style={styles.quantityBoxRow}>
            <Text style={[styles.quantityLabel, { color: subText }]}>
              QUANTITY
            </Text>
            <TextInput
              style={[
                styles.quantityInputCard,
                {
                  backgroundColor: quantityBg,
                  color: quantityValueColor,
                  borderColor: border,
                  marginLeft: 6,
                },
              ]}
              value={String(item.quantity || 1)}
              onChangeText={(v) => {
                const num = v.replace(/[^0-9]/g, "");
                handleQuantityChange(
                  item.id,
                  num === "" ? 1 : parseInt(num, 10),
                  isCart
                );
              }}
              keyboardType="numeric"
              maxLength={3}
              textAlign="center"
            />
          </View>
        </View>
      </View>
    </View>
  );

  const itemsToShow = activeTab === "cart" ? cartItems : favoriteItems;

  const selectedCartItems = cartItems.filter((item) =>
    selectedIds.includes(item.id)
  );
  const selectedItems =
    activeTab === "cart"
      ? selectedCartItems
      : favoriteItems.filter((item) => selectedIds.includes(item.id));
  const total = selectedItems.reduce((sum, item) => {
    const price = item.price
      ? parseInt(item.price.replace(/[^\d]/g, ""), 10)
      : 0;
    return sum + price * item.quantity;
  }, 0);

  return (
    <View
      style={[
        styles.root,
        { backgroundColor: darkMode ? "#18191A" : "#F5F4FA" },
      ]}
    >
      <Header
        showBack
        showCart
        logoType="image"
        onBackPress={() => navigation.navigate("Home")}
        onCartPress={() => {}}
        darkMode={darkMode}
      />
      <View
        style={[
          styles.tabRow,
          { backgroundColor: darkMode ? "#242526" : "#EDECF3" },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === "cart" && styles.tabActive,
            activeTab === "cart" &&
              (darkMode ? { backgroundColor: "#393A3B" } : styles.tabActive),
          ]}
          onPress={() => setActiveTab("cart")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "cart" && styles.tabTextActive,
              { color: darkMode ? "#E4E6EB" : "#6B6593" },
            ]}
          >
            MY CART
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === "favorite" && styles.tabActive,
            activeTab === "favorite" &&
              (darkMode ? { backgroundColor: "#393A3B" } : styles.tabActive),
          ]}
          onPress={() => setActiveTab("favorite")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "favorite" && styles.tabTextActive,
              { color: darkMode ? "#E4E6EB" : "#6B6593" },
            ]}
          >
            MY FAVORITE
          </Text>
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {itemsToShow.map((item) => renderItem(item, activeTab === "cart"))}
        {activeTab === "cart" &&
          selectedIds.length === 0 &&
          cartItems.length > 0 && (
            <Text
              style={{
                textAlign: "center",
                color: darkMode ? "#B0B3B8" : "#6B6593",
                marginTop: 16,
                fontFamily: "serif",
              }}
            >
              Select items to see total and checkout
            </Text>
          )}
      </ScrollView>
      {selectedIds.length > 0 && (
        <View style={[styles.bottomBar, { backgroundColor: bottomBarBg }]}>
          <Text style={[styles.totalText, { color: "#fff" }]}>
            TOTAL: ₱{total.toLocaleString()}
          </Text>
          <TouchableOpacity
            style={[styles.buyNowBarBtn, { backgroundColor: buyNowBg }]}
          >
            <Text style={[styles.buyNowBarText, { color: "#fff" }]}>
              BUY NOW
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  tabRow: {
    flexDirection: "row",
    marginHorizontal: 10,
    marginTop: 10,
    borderRadius: 8,
    overflow: "hidden",
  },
  tab: {
    flex: 1,
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  tabActive: {
    backgroundColor: "#fff",
  },
  tabText: {
    fontSize: 16,
    color: "#6B6593",
    fontFamily: "serif",
    letterSpacing: 1,
  },
  tabTextActive: {
    fontWeight: "bold",
    color: "#6B6593",
    textDecorationLine: "underline",
  },
  scrollContent: {
    padding: 12,
  },
  itemCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 12,
    marginBottom: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#EDECF3",
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#B6B3C6",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    marginLeft: 2,
  },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#6B6593",
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    marginRight: 18,
    backgroundColor: "#EDECF3",
  },
  itemInfo: {
    flex: 1,
    justifyContent: "center",
  },
  itemTitle: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#222",
    fontFamily: "serif",
    marginBottom: 2,
  },
  itemSubtitle: {
    fontSize: 11,
    color: "#6B6593",
    fontFamily: "serif",
    marginBottom: 0,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  itemDesc: {
    fontSize: 10,
    color: "#888",
    fontFamily: "serif",
    marginBottom: 2,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  itemPrice: {
    fontSize: 15,
    color: "#222",
    fontWeight: "bold",
    fontFamily: "serif",
    marginTop: 4,
  },
  quantityBox: {
    alignItems: "flex-end", // align label and input to the right
    marginLeft: 10,
    justifyContent: "center",
  },
  quantityBoxRow: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-end", // aligns to the right of the card
    marginLeft: 10,
    marginTop: 2,
  },
  quantityLabel: {
    fontSize: 10,
    color: "#6B6593",
    fontFamily: "serif",
    marginBottom: 2,
    // Remove textAlign: "center"
  },
  quantitySelectorRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "transparent", // remove background
    borderRadius: 0,
    borderWidth: 0,
    borderColor: "transparent",
    paddingHorizontal: 0,
    paddingVertical: 0,
    minWidth: 70,
    justifyContent: "space-between",
  },
  quantityBtn: {
    padding: 4,
    borderRadius: 4,
  },
  quantityValue: {
    fontSize: 15,
    color: "#6B6593",
    fontWeight: "bold",
    marginHorizontal: 8,
    minWidth: 18,
    textAlign: "center",
  },
  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  totalText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "serif",
    letterSpacing: 1,
  },
  buyNowBarBtn: {
    backgroundColor: "#B6B3C6",
    borderRadius: 4,
    paddingVertical: 10,
    paddingHorizontal: 32,
  },
  buyNowBarText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "serif",
    letterSpacing: 1,
  },
  removeBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    zIndex: 2,
    backgroundColor: "#ECECF2",
    borderRadius: 16,
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  removeBtnText: {
    color: "#6B6593",
    fontSize: 20,
    fontWeight: "bold",
    lineHeight: 22,
    textAlign: "center",
  },
  quantityInputCard: {
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 8,
    paddingVertical: 2,
    fontSize: 14,
    width: 50,
    textAlign: "center",
    marginTop: 2,
  },
});
