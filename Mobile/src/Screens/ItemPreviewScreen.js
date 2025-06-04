import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  FlatList,
  Alert,
  ToastAndroid,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Header from "../Components/Header";
import AddToCartButton from "../Components/AddToCartButton";
import SideMenu from "../Components/SideMenu";
import { useTheme } from "../Context/ThemeContext";
import { useCart } from "../Context/CartContext";

const { width } = Dimensions.get("window");

export default function ItemPreviewScreen({ navigation, route }) {
  const [menuVisible, setMenuVisible] = useState(false);
  const { darkMode } = useTheme();
  const { cartItems, setCartItems, favoriteItems, toggleFavorite } = useCart();
  const product = route.params?.product || {};
  // Compute the price to display
  const displayedPrice =
    product.price ||
    `₱${Math.floor(Math.random() * 2) === 0 ? "1,499" : "1,900"}`;

  const productWithId = {
    ...product,
    id:
      product.id ||
      `product-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    price: displayedPrice,
  };
  const colors = {
    bg: darkMode ? "#18191A" : "#fff",
    card: darkMode ? "#242526" : "#fff",
    header: darkMode ? "#242526" : "#6B6593",
    menu: darkMode ? "#242526" : "#6B6593",
    text: darkMode ? "#E4E6EB" : "#222",
    subText: darkMode ? "#B0B3B8" : "#6B6593",
    border: darkMode ? "#3A3B3C" : "#C7C5D1",
    accent: "#6B6593",
    button: darkMode ? "#393A3B" : "#6B6593",
    buttonText: "#E4E6EB",
    price: darkMode ? "#6B6593" : "#B6B3C6",
    box: darkMode ? "#242526" : "#F5F4FA",
  };
  // For now, use 4 thumbnails, all the same image
  const thumbnails = [
    product.image,
    product.image,
    product.image,
    product.image,
  ];
  const handleAddToCart = () => {
    let productToAdd = { ...productWithId };
    const exists = cartItems.find((item) => item.id === productToAdd.id);
    if (exists) {
      setCartItems(
        cartItems.map((item) =>
          item.id === productToAdd.id
            ? { ...item, quantity: (item.quantity > 0 ? item.quantity : 1) + 1 }
            : item
        )
      );
    } else {
      setCartItems([...cartItems, { ...productToAdd, quantity: 1 }]);
    }
    ToastAndroid.show("Item added to cart!", ToastAndroid.SHORT);
  };
  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <Header
        showMenu
        showCart
        logoType="image"
        onMenuPress={() => setMenuVisible(true)}
        onCartPress={() => navigation.navigate("MyCart")}
        darkMode={darkMode}
      />
      {/* Custom Back Button */}
      <TouchableOpacity
        style={styles.backRow}
        onPress={() => navigation.goBack()}
      >
        <MaterialCommunityIcons
          name="chevron-left"
          size={20}
          color={colors.text}
        />
        <Text style={[styles.backText, { color: colors.text }]}>BACK</Text>
      </TouchableOpacity>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Main Image */}
        <View style={styles.mainImageWrapper}>
          <Image
            source={product.image}
            style={styles.mainImage}
            resizeMode="cover"
          />
        </View>
        {/* Thumbnails (horizontal scroll) */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.thumbnailScroll}
          contentContainerStyle={styles.thumbnailRow}
        >
          {thumbnails.map((img, idx) => (
            <View key={idx} style={styles.thumbnailWrapper}>
              <Image source={img} style={styles.thumbnail} />
            </View>
          ))}
        </ScrollView>
        {/* Title and Price Section */}
        <View style={[styles.infoBox, { backgroundColor: colors.card }]}>
          <Text style={[styles.productName, { color: colors.text }]}>
            {product.title || "CARLO & ISABELLE"}
          </Text>
          <Text style={[styles.productSubtitle, { color: colors.text }]}>
            {product.subtitle || "Entourage Proposal Gift Boxes"}
          </Text>
          <View style={styles.priceRow}>
            <View style={[styles.priceBox, { backgroundColor: colors.price }]}>
              <Text style={styles.priceText}>{displayedPrice}</Text>
            </View>
            <TouchableOpacity
              style={styles.favoriteBtn}
              onPress={() => {
                toggleFavorite(productWithId);
                ToastAndroid.show(
                  "Item added to favorites!",
                  ToastAndroid.SHORT
                );
              }}
            >
              <Text style={[styles.favoriteText, { color: colors.subText }]}>
                Add to favorite
              </Text>
              <MaterialCommunityIcons
                name={
                  favoriteItems.some(
                    (favItem) => favItem.id === productWithId.id
                  )
                    ? "heart"
                    : "heart-outline"
                }
                size={20}
                color={colors.subText}
              />
            </TouchableOpacity>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.text }]} />
          <Text style={[styles.productDesc, { color: colors.text }]}>
            {(
              product.desc ||
              "Entourage Proposal Gift Boxes\nWedding Style: Modern, Minimalist, & Laid-back"
            ).toUpperCase()}
          </Text>
          <View style={styles.actionRow}>
            <AddToCartButton
              enabled
              style={[styles.actionBtnLeft, { backgroundColor: colors.price }]}
              onPress={handleAddToCart}
            />
            <TouchableOpacity
              style={[
                styles.actionBtnRight,
                { backgroundColor: colors.button },
              ]}
              onPress={() =>
                navigation.navigate("OrderSummary", { product: productWithId })
              }
            >
              <Text
                style={[styles.actionBtnText, { color: colors.buttonText }]}
              >
                BUY NOW
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        {/* Product Specification */}
        <View style={[styles.specBox, { backgroundColor: colors.box }]}>
          <Text
            style={[
              styles.specHeader,
              { backgroundColor: colors.price, color: colors.text },
            ]}
          >
            PRODUCT SPECIFICATION
          </Text>
          <View style={styles.specRow}>
            <Text style={styles.specLabel}>CATEGORY</Text>
            <Text style={styles.specValue}>
              {product.category || "WEDDING"}
            </Text>
          </View>
          <View style={styles.specRow}>
            <Text style={styles.specLabel}>ITEMS INSIDE</Text>
            <Text style={styles.specValue}>{product.itemsInside || "4"}</Text>
          </View>
          <View style={styles.specRow}>
            <Text style={styles.specLabel}>PRICE</Text>
            <Text style={styles.specValue}>
              {product.price || "1,500 - 2,000"}
            </Text>
          </View>
        </View>
        {/* Product Description */}
        <View style={[styles.descBox, { backgroundColor: colors.box }]}>
          <Text
            style={[
              styles.specHeader,
              { backgroundColor: colors.price, color: colors.text },
            ]}
          >
            PRODUCT DESCRIPTION
          </Text>
          <Text style={[styles.longDesc, { color: colors.text }]}>
            {product.longDesc ||
              "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur."}
          </Text>
        </View>
      </ScrollView>
      <SideMenu
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        darkMode={darkMode}
      />
    </View>
  );
}

const IMAGE_SIDE_MARGIN = 18;
const MAIN_IMAGE_WIDTH = width - IMAGE_SIDE_MARGIN * 2;
const MAIN_IMAGE_HEIGHT = MAIN_IMAGE_WIDTH;
const THUMB_SIZE = 60;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#fff",
  },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    marginLeft: 12,
    marginBottom: 2,
  },
  backText: {
    color: "#222",
    fontSize: 15,
    fontWeight: "400",
    marginLeft: 2,
    fontFamily: "serif",
    letterSpacing: 1,
  },
  scrollContent: {
    paddingBottom: 32,
    alignItems: "center",
  },
  mainImageWrapper: {
    width: MAIN_IMAGE_WIDTH,
    height: MAIN_IMAGE_WIDTH,
    borderRadius: 14,
    backgroundColor: "#fff",
    marginHorizontal: IMAGE_SIDE_MARGIN,
    marginTop: 4,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
    overflow: "hidden",
  },
  mainImage: {
    width: "100%",
    height: "100%",
    borderRadius: 14,
  },
  thumbnailScroll: {
    width: MAIN_IMAGE_WIDTH,
    marginBottom: 12,
    marginHorizontal: IMAGE_SIDE_MARGIN,
  },
  thumbnailRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 2,
  },
  thumbnailWrapper: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: 10,
    backgroundColor: "#fff",
    marginRight: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
    overflow: "hidden",
  },
  thumbnail: {
    width: "100%",
    height: "100%",
    borderRadius: 10,
  },
  infoBox: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 18,
    marginHorizontal: 12,
    marginBottom: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 2,
  },
  productName: {
    color: "#222",
    fontSize: 22,
    fontWeight: "bold",
    fontFamily: "serif",
    textAlign: "center",
    marginBottom: 2,
    letterSpacing: 1,
  },
  productSubtitle: {
    color: "#222",
    fontSize: 14,
    fontFamily: "serif",
    textAlign: "center",
    marginBottom: 8,
    letterSpacing: 1,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 8,
  },
  priceBox: {
    backgroundColor: "#B6B3C6",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 24,
  },
  priceText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    fontFamily: "serif",
  },
  favoriteBtn: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 12,
  },
  favoriteText: {
    color: "#6B6593",
    fontSize: 13,
    marginRight: 4,
    fontFamily: "serif",
  },
  divider: {
    width: "100%",
    height: 1,
    backgroundColor: "#222",
    opacity: 0.2,
    marginVertical: 10,
  },
  productDesc: {
    color: "#222",
    fontSize: 12,
    textAlign: "center",
    marginBottom: 12,
    marginTop: 4,
    fontFamily: "serif",
    letterSpacing: 1,
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 8,
  },
  actionBtnLeft: {
    backgroundColor: "#B6B3C6",
    marginRight: 8,
    flex: 1,
  },
  actionBtnRight: {
    backgroundColor: "#6B6593",
    borderRadius: 8,
    paddingVertical: 12,
    flex: 1,
    alignItems: "center",
    marginLeft: 8,
  },
  actionBtnText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
    letterSpacing: 1,
    fontFamily: "serif",
  },
  specBox: {
    backgroundColor: "#F5F4FA",
    borderRadius: 8,
    marginHorizontal: 12,
    marginBottom: 16,
    padding: 0,
    width: "95%",
    alignSelf: "center",
    overflow: "hidden",
  },
  specHeader: {
    backgroundColor: "#B6B3C6",
    color: "#222",
    fontWeight: "bold",
    fontSize: 13,
    paddingVertical: 8,
    textAlign: "center",
    letterSpacing: 1,
    fontFamily: "serif",
  },
  specRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: "#ccc",
  },
  specLabel: {
    color: "#6B6593",
    fontSize: 12,
    fontWeight: "bold",
    fontFamily: "serif",
  },
  specValue: {
    color: "#6B6593",
    fontSize: 12,
    fontFamily: "serif",
  },
  descBox: {
    backgroundColor: "#F5F4FA",
    borderRadius: 8,
    marginHorizontal: 12,
    marginBottom: 24,
    padding: 0,
    width: "95%",
    alignSelf: "center",
    overflow: "hidden",
  },
  longDesc: {
    color: "#222",
    fontSize: 12,
    textAlign: "justify",
    padding: 14,
    fontFamily: "serif",
  },
});
