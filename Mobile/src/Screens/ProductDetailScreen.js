import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  Alert,
} from "react-native";
import Header from "../Components/Header";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useCart } from "../Context/CartContext";
import { useTheme } from "../Context/ThemeContext";

const { width } = Dimensions.get("window");

export default function ProductDetailScreen({ navigation, route }) {
  const { product } = route.params;
  const { addToCart } = useCart();
  const { darkMode } = useTheme();
  const [quantity, setQuantity] = useState(1);

  const handleAddToCart = async () => {
    try {
      const productWithQuantity = { ...product, quantity };
      await addToCart(productWithQuantity);
      Alert.alert("Success", "Product added to cart!");
    } catch (error) {
      Alert.alert("Error", "Failed to add product to cart. Please try again.");
    }
  };

  const handleQuantityChange = (change) => {
    const newQuantity = quantity + change;
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
        onCartPress={() => navigation.navigate("MyCart")}
        darkMode={darkMode}
      />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={[styles.imageContainer, { backgroundColor: darkMode ? "#242526" : "#fff" }]}>
          {product.image_data ? (
            <Image
              source={{ uri: `data:image/png;base64,${product.image_data}` }}
              style={styles.productImage}
              resizeMode="contain"
            />
          ) : (
            <View style={[styles.placeholderImage, { backgroundColor: darkMode ? "#393A3B" : "#EDECF3" }]}>
              <MaterialCommunityIcons name="image" size={64} color={darkMode ? "#B0B3B8" : "#6B6593"} />
            </View>
          )}
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
        <TouchableOpacity
          style={[styles.addToCartButton, { backgroundColor: darkMode ? "#393A3B" : "#6B6593" }]}
          onPress={handleAddToCart}
        >
          <MaterialCommunityIcons name="cart-plus" size={20} color="#fff" />
          <Text style={styles.addToCartText}>Add to Cart</Text>
        </TouchableOpacity>
      </View>
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
  imageContainer: {
    margin: 16,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  productImage: {
    width: width - 64,
    height: 200,
  },
  placeholderImage: {
    width: width - 64,
    height: 200,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailsContainer: {
    margin: 16,
    marginTop: 0,
    padding: 20,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  productName: {
    fontSize: 24,
    fontFamily: 'serif',
    fontWeight: 'bold',
    marginBottom: 16,
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