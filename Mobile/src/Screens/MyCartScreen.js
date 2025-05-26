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
} from "react-native";
import Header from "../Components/Header";
import AddToCartButton from "../Components/AddToCartButton";
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

  const renderItem = (item, isCart) => (
    <View
      key={item.id}
      style={[styles.itemCard, { backgroundColor: itemCardBg }]}
    >
      <TouchableOpacity
        style={styles.removeBtn}
        onPress={() => handleRemoveItem(item.id)}
        activeOpacity={0.7}
      >
        <Text style={styles.removeBtnText}>×</Text>
      </TouchableOpacity>
      <View style={styles.itemRow}>
        <TouchableOpacity
          style={styles.radioCircle}
          onPress={() => handleSelect(item.id)}
          activeOpacity={0.7}
        >
          {selectedIds.includes(item.id) && <View style={styles.radioDot} />}
        </TouchableOpacity>
        <Image source={item.image} style={styles.itemImage} />
        <View style={styles.itemInfo}>
          <Text
            style={[styles.itemTitle, { color: darkMode ? "#E4E6EB" : "#222" }]}
          >
            {item.title}
          </Text>
          <Text
            style={[
              styles.itemSubtitle,
              { color: darkMode ? "#B0B3B8" : "#6B6593" },
            ]}
          >
            {item.subtitle}
          </Text>
          <Text
            style={[styles.itemDesc, { color: darkMode ? "#B0B3B8" : "#888" }]}
          >
            {item.desc}
          </Text>
          <Text
            style={[styles.itemPrice, { color: darkMode ? "#fff" : "#222" }]}
          >
            {item.price || "₱1,499"}
          </Text>
        </View>
        <View style={styles.quantityBox}>
          <Text style={styles.quantityLabel}>QUANTITY</Text>
          <View style={styles.quantitySelectorRow}>
            <TouchableOpacity
              onPress={() =>
                handleQuantityChange(
                  item.id,
                  Math.max(1, (item.quantity || 1) - 1),
                  isCart
                )
              }
              style={styles.quantityBtn}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="minus" size={18} color="#6B6593" />
            </TouchableOpacity>
            <Text style={styles.quantityValue}>{item.quantity || 1}</Text>
            <TouchableOpacity
              onPress={() =>
                handleQuantityChange(item.id, (item.quantity || 1) + 1, isCart)
              }
              style={styles.quantityBtn}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="plus" size={18} color="#6B6593" />
            </TouchableOpacity>
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
        <View
          style={[
            styles.bottomBar,
            { backgroundColor: darkMode ? "#393A3B" : "#6B6593" },
          ]}
        >
          <Text
            style={[styles.totalText, { color: darkMode ? "#fff" : "#fff" }]}
          >
            TOTAL: ₱{total.toLocaleString()}
          </Text>
          <TouchableOpacity
            style={[
              styles.buyNowBarBtn,
              { backgroundColor: darkMode ? "#6B6593" : "#B6B3C6" },
            ]}
          >
            <Text
              style={[
                styles.buyNowBarText,
                { color: darkMode ? "#fff" : "#fff" },
              ]}
            >
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
    alignItems: "center",
    marginLeft: 10,
    justifyContent: "center",
  },
  quantityLabel: {
    fontSize: 10,
    color: "#6B6593",
    fontFamily: "serif",
    marginBottom: 2,
    textAlign: "center",
  },
  quantitySelectorRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F4FA",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#B6B3C6",
    paddingHorizontal: 8,
    paddingVertical: 2,
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
});
