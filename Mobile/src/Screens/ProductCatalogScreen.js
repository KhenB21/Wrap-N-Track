import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  TextInput,
  RefreshControl,
  Dimensions,
} from "react-native";
import Header from "../Components/Header";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useInventory } from "../Context/InventoryContext";
import { useCart } from "../Context/CartContext";
import { useTheme } from "../Context/ThemeContext";

const { width } = Dimensions.get("window");
const itemWidth = (width - 60) / 2; // 2 columns with padding

export default function ProductCatalogScreen({ navigation, route }) {
  const { category } = route.params || {};
  const {
    filteredInventory,
    loading,
    searchQuery,
    setSearchQuery,
    loadInventory,
    clearError,
  } = useInventory();
  const { addToCart } = useCart();
  const { darkMode } = useTheme();
  const [refreshing, setRefreshing] = useState(false);

  // Filter products by category if specified
  const products = category 
    ? filteredInventory.filter(item => item.category === category)
    : filteredInventory;

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadInventory();
    } catch (error) {
      console.error("Error refreshing inventory:", error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleAddToCart = async (product) => {
    try {
      await addToCart(product);
      // You could add a success message here
    } catch (error) {
      console.error("Error adding to cart:", error);
    }
  };

  const renderProduct = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.productCard,
        { 
          backgroundColor: darkMode ? "#242526" : "#fff",
          borderColor: darkMode ? "#393A3B" : "#EDECF3",
        }
      ]}
      onPress={() => navigation.navigate("ProductDetail", { product: item })}
    >
      {item.image_data ? (
        <Image
          source={{ uri: `data:image/png;base64,${item.image_data}` }}
          style={styles.productImage}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.productImage, { backgroundColor: darkMode ? "#393A3B" : "#EDECF3", justifyContent: 'center', alignItems: 'center' }]}>
          <MaterialCommunityIcons name="image" size={32} color={darkMode ? "#B0B3B8" : "#6B6593"} />
        </View>
      )}
      <View style={styles.productInfo}>
        <Text style={[styles.productName, { color: darkMode ? "#E4E6EB" : "#222" }]} numberOfLines={2}>
          {item.name}
        </Text>
        <Text style={[styles.productSku, { color: darkMode ? "#B0B3B8" : "#6B6593" }]}>
          SKU: {item.sku}
        </Text>
        <Text style={[styles.productPrice, { color: darkMode ? "#fff" : "#222" }]}>
          ₱{parseFloat(item.unit_price).toFixed(2)}
        </Text>
        <TouchableOpacity
          style={[styles.addToCartButton, { backgroundColor: darkMode ? "#393A3B" : "#6B6593" }]}
          onPress={() => handleAddToCart(item)}
        >
          <MaterialCommunityIcons name="cart-plus" size={16} color="#fff" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

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
      
      <View style={[styles.searchContainer, { backgroundColor: darkMode ? "#242526" : "#EDECF3" }]}>
        <MaterialCommunityIcons 
          name="magnify" 
          size={20} 
          color={darkMode ? "#B0B3B8" : "#6B6593"} 
          style={styles.searchIcon}
        />
        <TextInput
          style={[styles.searchInput, { color: darkMode ? "#E4E6EB" : "#222" }]}
          placeholder="Search products..."
          placeholderTextColor={darkMode ? "#B0B3B8" : "#6B6593"}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <MaterialCommunityIcons 
              name="close-circle" 
              size={20} 
              color={darkMode ? "#B0B3B8" : "#6B6593"} 
            />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.headerContainer}>
        <Text style={[styles.headerTitle, { color: darkMode ? "#E4E6EB" : "#222" }]}>
          {category ? `${category} Products` : "All Products"}
        </Text>
        <Text style={[styles.productCount, { color: darkMode ? "#B0B3B8" : "#6B6593" }]}>
          {products.length} product{products.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {products.length > 0 ? (
        <FlatList
          data={products}
          renderItem={renderProduct}
          keyExtractor={(item) => item.sku}
          numColumns={2}
          contentContainerStyle={styles.productsList}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons 
            name="package-variant" 
            size={64} 
            color={darkMode ? "#B0B3B8" : "#6B6593"} 
          />
          <Text style={[styles.emptyText, { color: darkMode ? "#B0B3B8" : "#6B6593" }]}>
            {searchQuery ? "No products found" : "No products available"}
          </Text>
          {searchQuery && (
            <TouchableOpacity
              style={[styles.clearSearchButton, { backgroundColor: darkMode ? "#393A3B" : "#6B6593" }]}
              onPress={() => setSearchQuery("")}
            >
              <Text style={styles.clearSearchText}>Clear Search</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'serif',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'serif',
    fontWeight: 'bold',
  },
  productCount: {
    fontSize: 14,
    fontFamily: 'serif',
  },
  productsList: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  productCard: {
    width: itemWidth,
    marginRight: 12,
    marginBottom: 16,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  productImage: {
    width: '100%',
    height: 120,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  productInfo: {
    padding: 12,
  },
  productName: {
    fontSize: 14,
    fontFamily: 'serif',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  productSku: {
    fontSize: 10,
    fontFamily: 'serif',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 16,
    fontFamily: 'serif',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  addToCartButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'serif',
    marginTop: 16,
    textAlign: 'center',
  },
  clearSearchButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  clearSearchText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'serif',
    fontWeight: 'bold',
  },
});