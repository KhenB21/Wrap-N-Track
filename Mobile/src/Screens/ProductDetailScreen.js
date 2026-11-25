import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  Animated,
} from "react-native";
import Header from "../Components/Header";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useCart } from "../Context/CartContext";
import { useTheme } from "../Context/ThemeContext";
import Toast from "../Components/Toast";
import ProductImage from "../Components/ProductImage";
import ImageViewerModal from "../Components/ImageViewerModal";
import { getProductImageUrl } from "../services/api";

const { width } = Dimensions.get("window");

export default function ProductDetailScreen({ navigation, route }) {
  const { product } = route.params;
  const { addToCart } = useCart();
  const { darkMode } = useTheme();
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: "" });
  const bounceAnim = useState(new Animated.Value(1))[0];
  const [viewerOpen, setViewerOpen] = useState(false);
  const imageVersion = product.updated_at || product.last_updated;
  // Older catalog payloads carried the photo inline as base64; current ones
  // serve it from /inventory/:sku/image.
  const fullImageUri = product.image_data
    ? `data:image/png;base64,${product.image_data}`
    : getProductImageUrl(product.sku, imageVersion);

  const handleAddToCart = async () => {
    if (adding) return;
    setAdding(true);
    try {
      await addToCart(product, quantity);
      Animated.sequence([
        Animated.timing(bounceAnim, { toValue: 1.15, duration: 120, useNativeDriver: true }),
        Animated.spring(bounceAnim, { toValue: 1, friction: 4, useNativeDriver: true }),
      ]).start();
      setToast({ visible: true, message: "Added to cart" });
    } catch (error) {
      // Shows the server's explanation (e.g. "Our team has been notified…" when
      // the quantity is above stock) — never the stock number itself.
      setToast({ visible: true, message: error.message || "Couldn't add this to your cart. Please try again." });
    } finally {
      setAdding(false);
    }
  };

  const handleQuantityChange = (change) => {
    const newQuantity = quantity + change;
    // product.quantity is the available stock, not a cart quantity.
    // No cap at the stock level here: stopping the "+" button at the stock
    // count would reveal it. "Add to Cart" checks with the server instead.
    if (newQuantity >= 1) {
      setQuantity(newQuantity);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: darkMode ? "#18191A" : "#F5F4FA" }]}>
      <Header
        showBack
        showCart
        logoType="image"
        onBackPress={() => navigation.goBack()}
        onCartPress={() => navigation.navigate("CustomerTabs", { screen: "Cart" })}
        darkMode={darkMode}
      />
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.imageContainer, { backgroundColor: darkMode ? "#242526" : "#fff" }]}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setViewerOpen(true)}
            accessibilityRole="imagebutton"
            accessibilityLabel={`Enlarge photo of ${product.name}`}
          >
            {product.image_data ? (
              <Image source={{ uri: fullImageUri }} style={styles.productImage} resizeMode="contain" />
            ) : (
              <ProductImage
                sku={product.sku}
                version={imageVersion}
                style={styles.productImage}
                iconSize={48}
                colors={{ wash: darkMode ? "#393A3B" : "#EDECF3", textMute: darkMode ? "#B0B3B8" : "#6B6593" }}
              />
            )}
            <View style={styles.enlargeBadge} pointerEvents="none">
              <MaterialCommunityIcons name="magnify-plus-outline" size={16} color="#fff" />
              <Text style={styles.enlargeText}>Tap to enlarge</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={[styles.detailsContainer, { backgroundColor: darkMode ? "#242526" : "#fff" }]}>
          <Text style={[styles.productName, { color: darkMode ? "#E4E6EB" : "#222" }]}>
            {product.name}
          </Text>
          
          <View style={styles.skuContainer}>
            <Text style={[styles.skuLabel, { color: darkMode ? "#B0B3B8" : "#6B6593" }]}>
              SKU:
            </Text>
            <Text style={[styles.skuValue, { color: darkMode ? "#E4E6EB" : "#222" }]}>
              {product.sku}
            </Text>
          </View>

          <View style={styles.priceContainer}>
            <Text style={[styles.priceLabel, { color: darkMode ? "#B0B3B8" : "#6B6593" }]}>
              Price:
            </Text>
            <Text style={[styles.priceValue, { color: darkMode ? "#fff" : "#222" }]}>
              ₱{parseFloat(product.unit_price).toFixed(2)}
            </Text>
          </View>

          <View style={styles.categoryContainer}>
            <Text style={[styles.categoryLabel, { color: darkMode ? "#B0B3B8" : "#6B6593" }]}>
              Category:
            </Text>
            <Text style={[styles.categoryValue, { color: darkMode ? "#E4E6EB" : "#222" }]}>
              {product.category}
            </Text>
          </View>

          {product.description && (
            <View style={styles.descriptionContainer}>
              <Text style={[styles.descriptionLabel, { color: darkMode ? "#B0B3B8" : "#6B6593" }]}>
                Description:
              </Text>
              <Text style={[styles.descriptionValue, { color: darkMode ? "#E4E6EB" : "#222" }]}>
                {product.description}
              </Text>
            </View>
          )}

          <View style={styles.quantityContainer}>
            <Text style={[styles.quantityLabel, { color: darkMode ? "#B0B3B8" : "#6B6593" }]}>
              Quantity:
            </Text>
            <View style={[styles.quantitySelector, { backgroundColor: darkMode ? "#393A3B" : "#F5F4FA" }]}>
              <TouchableOpacity
                style={[styles.quantityButton, { backgroundColor: darkMode ? "#393A3B" : "#EDECF3" }]}
                onPress={() => handleQuantityChange(-1)}
              >
                <MaterialCommunityIcons name="minus" size={20} color={darkMode ? "#E4E6EB" : "#6B6593"} />
              </TouchableOpacity>
              <Text style={[styles.quantityValue, { color: darkMode ? "#E4E6EB" : "#222" }]}>
                {quantity}
              </Text>
              <TouchableOpacity
                style={[styles.quantityButton, { backgroundColor: darkMode ? "#393A3B" : "#EDECF3" }]}
                onPress={() => handleQuantityChange(1)}
              >
                <MaterialCommunityIcons name="plus" size={20} color={darkMode ? "#E4E6EB" : "#6B6593"} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.bottomContainer, { backgroundColor: darkMode ? "#242526" : "#fff" }]}>
        <View style={styles.totalContainer}>
          <Text style={[styles.totalLabel, { color: darkMode ? "#B0B3B8" : "#6B6593" }]}>
            Total:
          </Text>
          <Text style={[styles.totalValue, { color: darkMode ? "#fff" : "#222" }]}>
            ₱{(parseFloat(product.unit_price) * quantity).toFixed(2)}
          </Text>
        </View>
        <Animated.View style={{ transform: [{ scale: bounceAnim }] }}>
          <TouchableOpacity
            style={[styles.addToCartButton, { backgroundColor: darkMode ? "#393A3B" : "#6B6593", opacity: adding ? 0.7 : 1 }]}
            onPress={handleAddToCart}
            disabled={adding}
          >
            <MaterialCommunityIcons name={adding ? "check" : "cart-plus"} size={20} color="#fff" />
            <Text style={styles.addToCartText}>{adding ? "Added" : "Add to Cart"}</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
      <ImageViewerModal
        visible={viewerOpen}
        uri={fullImageUri}
        title={product.name}
        onClose={() => setViewerOpen(false)}
      />
      <Toast
        visible={toast.visible}
        message={toast.message}
        onHide={() => setToast({ visible: false, message: "" })}
      />
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
  // Even 12px gaps everywhere; room at the bottom so the floating Wrappy
  // button doesn't sit on top of the quantity controls.
  scrollContent: {
    paddingTop: 12,
    paddingBottom: 88,
  },
  // The photo fills its card edge to edge — no white frame around it.
  imageContainer: {
    marginHorizontal: 12,
    marginBottom: 12,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  productImage: {
    width: width - 24,
    height: 240,
    borderRadius: 12,
    overflow: 'hidden',
  },
  enlargeBadge: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  enlargeText: {
    color: '#fff',
    fontSize: 11,
    marginLeft: 4,
  },
  placeholderImage: {
    width: width - 64,
    height: 200,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailsContainer: {
    marginHorizontal: 12,
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  productName: {
    fontSize: 22,
    fontFamily: 'serif',
    fontWeight: 'bold',
    marginBottom: 12,
  },
  skuContainer: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  skuLabel: {
    fontSize: 14,
    fontFamily: 'serif',
    marginRight: 8,
  },
  skuValue: {
    fontSize: 14,
    fontFamily: 'serif',
    fontWeight: 'bold',
  },
  priceContainer: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  priceLabel: {
    fontSize: 16,
    fontFamily: 'serif',
    marginRight: 8,
  },
  priceValue: {
    fontSize: 20,
    fontFamily: 'serif',
    fontWeight: 'bold',
  },
  categoryContainer: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  categoryLabel: {
    fontSize: 14,
    fontFamily: 'serif',
    marginRight: 8,
  },
  categoryValue: {
    fontSize: 14,
    fontFamily: 'serif',
    fontWeight: 'bold',
  },
  descriptionContainer: {
    marginBottom: 20,
  },
  descriptionLabel: {
    fontSize: 14,
    fontFamily: 'serif',
    marginBottom: 8,
  },
  descriptionValue: {
    fontSize: 14,
    fontFamily: 'serif',
    lineHeight: 20,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quantityLabel: {
    fontSize: 16,
    fontFamily: 'serif',
  },
  quantitySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    padding: 4,
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityValue: {
    fontSize: 18,
    fontFamily: 'serif',
    fontWeight: 'bold',
    marginHorizontal: 16,
    minWidth: 30,
    textAlign: 'center',
  },
  bottomContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#EDECF3',
  },
  totalContainer: {
    flex: 1,
  },
  totalLabel: {
    fontSize: 14,
    fontFamily: 'serif',
  },
  totalValue: {
    fontSize: 20,
    fontFamily: 'serif',
    fontWeight: 'bold',
  },
  addToCartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addToCartText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'serif',
    fontWeight: 'bold',
    marginLeft: 8,
  },
});