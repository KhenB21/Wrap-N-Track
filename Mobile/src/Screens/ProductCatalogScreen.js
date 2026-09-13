import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Dimensions,
} from "react-native";
import Header from "../Components/Header";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useInventory } from "../Context/InventoryContext";
import { useCart } from "../Context/CartContext";
import { useTheme } from "../Context/ThemeContext";
import { SkeletonProductCard } from "../Components/Skeleton/Skeleton";
import Toast from "../Components/Toast";
import ProductImage from "../Components/ProductImage";
import { inventoryAPI } from "../services/api";
import { CATEGORIES, SERIF, peso, getBoutiqueColors } from "../constants/boutique";

// Catalog styled after the Website order page: category chips, photo cards, same palette.
const { width } = Dimensions.get("window");
const H_PAD = 16;
const GRID_GAP = 12;
const CARD_WIDTH = (width - H_PAD * 2 - GRID_GAP) / 2;
const ALL_KEY = "all";

export default function ProductCatalogScreen({ navigation, route }) {
  const { category } = route.params || {};
  const { filteredInventory, loading, searchQuery, setSearchQuery, loadInventory, lastRealtimeEvent } = useInventory();
  const { addToCart } = useCart();
  const { darkMode } = useTheme();
  const c = getBoutiqueColors(darkMode);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: "", id: 0 });
  const addingSkuRef = useRef(null);
  const [addingSku, setAddingSku] = useState(null);
  const [availableSkus, setAvailableSkus] = useState(null); // { categoryKey: [sku] }

  // A category passed in from Home may be a Website category key/label or a raw inventory category.
  const routeCategory = useMemo(
    () =>
      category
        ? CATEGORIES.find((cat) => cat.key === category || cat.label.toLowerCase() === String(category).toLowerCase()) || null
        : null,
    [category]
  );
  const [activeKey, setActiveKey] = useState(routeCategory ? routeCategory.key : ALL_KEY);

  useEffect(() => {
    if (routeCategory) setActiveKey(routeCategory.key);
  }, [routeCategory]);

  const showToast = (message) => setToast({ visible: true, message, id: Date.now() });

  useEffect(() => {
    loadInventory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchAvailableSkus = useCallback(async () => {
    try {
      const data = await inventoryAPI.getAvailableInventory();
      const available = data?.available || {};
      const skus = {};
      CATEGORIES.forEach(({ key }) => {
        skus[key] = (available[key] || []).map((p) => String(p.sku));
      });
      setAvailableSkus(skus);
    } catch (error) {
      console.error("Error fetching available inventory:", error);
      setAvailableSkus({});
    }
  }, []);

  useEffect(() => {
    fetchAvailableSkus();
  }, [fetchAvailableSkus]);

  // Staff clicking "Save Available Products" on the website broadcasts this
  // over the shared WS connection — refetch immediately instead of only
  // picking up the change on next app reload.
  useEffect(() => {
    if (lastRealtimeEvent?.type === "available_inventory_updated") {
      fetchAvailableSkus();
    }
  }, [lastRealtimeEvent, fetchAvailableSkus]);

  // sku -> Website category, from the published (available) product lists
  const skuCategory = useMemo(() => {
    const map = new Map();
    if (availableSkus) {
      CATEGORIES.forEach((cat) => {
        (availableSkus[cat.key] || []).forEach((sku) => {
          if (!map.has(sku)) map.set(sku, cat);
        });
      });
    }
    return map;
  }, [availableSkus]);

  // Only show products staff have marked available (matches Website order page)
  const availableInventory = useMemo(
    () => (availableSkus ? filteredInventory.filter((item) => skuCategory.has(String(item.sku))) : []),
    [availableSkus, filteredInventory, skuCategory]
  );

  const chips = useMemo(() => {
    const counts = {};
    availableInventory.forEach((item) => {
      const key = skuCategory.get(String(item.sku))?.key;
      if (key) counts[key] = (counts[key] || 0) + 1;
    });
    return [
      { key: ALL_KEY, label: "All", count: availableInventory.length },
      ...CATEGORIES.map((cat) => ({ key: cat.key, label: cat.label, count: counts[cat.key] || 0 })).filter(
        (chip) => chip.count > 0 || chip.key === activeKey
      ),
    ];
  }, [availableInventory, skuCategory, activeKey]);

  const products = useMemo(() => {
    if (activeKey !== ALL_KEY) {
      return availableInventory.filter((item) => skuCategory.get(String(item.sku))?.key === activeKey);
    }
    // Older links pass a raw inventory category that isn't one of the Website groups.
    if (category && !routeCategory) {
      return availableInventory.filter((item) => item.category === category);
    }
    return availableInventory;
  }, [activeKey, availableInventory, skuCategory, category, routeCategory]);

  const activeLabel = activeKey === ALL_KEY ? (category && !routeCategory ? category : "All Products") : chips.find((chip) => chip.key === activeKey)?.label;

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([loadInventory(), fetchAvailableSkus()]);
    } catch (error) {
      console.error("Error refreshing inventory:", error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleAddToCart = async (product) => {
    if (addingSkuRef.current === product.sku) return;
    addingSkuRef.current = product.sku;
    setAddingSku(product.sku);
    try {
      await addToCart(product, 1);
      showToast(`${product.name} added to cart`);
    } catch (error) {
      console.error("Error adding to cart:", error);
      showToast(error.message || "Couldn't add item to cart. Please try again.");
    } finally {
      addingSkuRef.current = null;
      setAddingSku(null);
    }
  };

  const renderProduct = ({ item }) => {
    const outOfStock = Number(item.quantity) <= 0;
    const adding = addingSku === item.sku;
    const categoryLabel = skuCategory.get(String(item.sku))?.label || item.category;
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        style={[styles.productCard, { backgroundColor: c.surface, borderColor: c.borderSoft }]}
        onPress={() => navigation.navigate("ProductDetail", { product: item })}
      >
        <View>
          <ProductImage sku={item.sku} version={item.updated_at || item.last_updated} style={styles.productImage} colors={c} />
          {!!categoryLabel && (
            <View style={[styles.cardTag, { backgroundColor: c.tagBg }]}>
              <Text style={[styles.cardTagText, { color: c.textSoft }]} numberOfLines={1}>
                {categoryLabel}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.productInfo}>
          <Text style={[styles.productName, { color: c.text }]} numberOfLines={2}>
            {item.name}
          </Text>
          <Text style={[styles.productDesc, { color: c.textMute }]} numberOfLines={2}>
            {item.description || "Tap for full details."}
          </Text>
          <Text style={[styles.productPrice, { color: c.text }]}>{peso(item.unit_price)}</Text>
          <TouchableOpacity
            style={[
              styles.addToCartButton,
              { backgroundColor: c.accent, borderColor: c.accent },
              (outOfStock || adding) && styles.buttonDisabled,
            ]}
            onPress={() => handleAddToCart(item)}
            disabled={outOfStock || adding}
          >
            <MaterialCommunityIcons name={adding ? "check" : "cart-plus"} size={15} color="#fff" />
            <Text style={styles.addToCartText}>{outOfStock ? "Out of stock" : adding ? "Adding…" : "Add to cart"}</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>
      <Header
        showBack
        showCart
        logoType="image"
        onBackPress={() => navigation.goBack()}
        onCartPress={() => navigation.navigate("MyCart")}
        darkMode={darkMode}
      />

      <View style={[styles.searchContainer, { backgroundColor: c.surface, borderColor: c.border }]}>
        <MaterialCommunityIcons name="magnify" size={20} color={c.textMute} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: c.text }]}
          placeholder="Search the collection..."
          placeholderTextColor={c.textMute}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <MaterialCommunityIcons name="close-circle" size={20} color={c.textMute} />
          </TouchableOpacity>
        )}
      </View>

      <View style={[styles.rail, { borderBottomColor: c.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.railScroll}>
          {chips.map((chip) => {
            const active = activeKey === chip.key;
            return (
              <TouchableOpacity
                key={chip.key}
                onPress={() => setActiveKey(chip.key)}
                style={[styles.chip, { backgroundColor: active ? c.accent : c.surface, borderColor: active ? c.accent : c.border }]}
              >
                <Text style={[styles.chipText, { color: active ? "#fff" : c.textSoft }]}>{chip.label}</Text>
                <View style={[styles.chipCount, { backgroundColor: active ? "rgba(255,255,255,0.22)" : c.accentWash }]}>
                  <Text style={[styles.chipCountText, { color: active ? "#fff" : c.accentText }]}>{chip.count}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.headerContainer}>
        <Text style={[styles.headerTitle, { color: c.text }]}>{activeLabel}</Text>
        <Text style={[styles.productCount, { color: c.textMute }]}>
          {products.length} {products.length === 1 ? "piece" : "pieces"}
        </Text>
      </View>

      {(loading || availableSkus === null) && products.length === 0 ? (
        <View style={[styles.productsList, styles.skeletonGrid]}>
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonProductCard key={i} style={{ width: CARD_WIDTH, marginBottom: GRID_GAP }} />
          ))}
        </View>
      ) : products.length > 0 ? (
        <FlatList
          data={products}
          renderItem={renderProduct}
          keyExtractor={(item) => String(item.sku)}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={styles.productsList}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.accent} colors={[c.accent]} />}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="package-variant" size={56} color={c.textMute} />
          <Text style={[styles.emptyTitle, { color: c.text }]}>
            {searchQuery ? "No products found" : "The collection is being restocked"}
          </Text>
          <Text style={[styles.emptyText, { color: c.textSoft }]}>
            {searchQuery ? "Try a different name or category." : "There are no products available right now. Please check back shortly."}
          </Text>
          {!!searchQuery && (
            <TouchableOpacity style={[styles.clearSearchButton, { backgroundColor: c.accent }]} onPress={() => setSearchQuery("")}>
              <Text style={styles.clearSearchText}>Clear Search</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
      <Toast
        key={toast.id}
        visible={toast.visible}
        message={toast.message}
        onHide={() => setToast((prev) => ({ ...prev, visible: false }))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: H_PAD,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },
  rail: {
    borderBottomWidth: 1,
  },
  railScroll: {
    paddingHorizontal: H_PAD,
    paddingVertical: 10,
    gap: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 6,
    paddingLeft: 14,
    paddingRight: 6,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
  },
  chipCount: {
    marginLeft: 6,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  chipCountText: {
    fontSize: 11,
    fontWeight: "700",
  },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    paddingHorizontal: H_PAD,
    paddingTop: 14,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: SERIF,
    fontWeight: "600",
    flexShrink: 1,
  },
  productCount: {
    fontSize: 12,
    marginLeft: 12,
  },
  productsList: {
    paddingHorizontal: H_PAD,
    paddingBottom: 24,
  },
  skeletonGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  columnWrapper: {
    justifyContent: "space-between",
  },
  productCard: {
    width: CARD_WIDTH,
    marginBottom: GRID_GAP,
    borderRadius: 12,
    borderWidth: 1.5,
    overflow: "hidden",
    shadowColor: "#33373D",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 1,
  },
  productImage: {
    width: "100%",
    height: CARD_WIDTH * 0.82,
  },
  cardTag: {
    position: "absolute",
    top: 8,
    left: 8,
    maxWidth: CARD_WIDTH - 20,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  cardTagText: {
    fontSize: 10,
    fontWeight: "600",
  },
  productInfo: {
    padding: 10,
  },
  productName: {
    fontSize: 16,
    fontFamily: SERIF,
    fontWeight: "600",
    lineHeight: 20,
    minHeight: 40,
  },
  productDesc: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
    minHeight: 32,
  },
  productPrice: {
    fontSize: 15,
    fontWeight: "700",
    marginTop: 8,
  },
  addToCartButton: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1.5,
    borderRadius: 8,
    paddingVertical: 8,
  },
  addToCartText: {
    color: "#fff",
    fontSize: 12.5,
    fontWeight: "700",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: SERIF,
    fontWeight: "600",
    marginTop: 14,
    textAlign: "center",
  },
  emptyText: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
    textAlign: "center",
  },
  clearSearchButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  clearSearchText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
});
