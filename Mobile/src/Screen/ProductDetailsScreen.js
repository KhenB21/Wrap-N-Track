import React, { useState } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function ProductDetailsScreen({ route, navigation }) {
  const { product } = route.params;

  // For gallery: if you have multiple images, use them; otherwise, repeat the main image
  const images = product.images || [product.image_url];

  const [selectedImage, setSelectedImage] = useState(images[0]);

  return (
    <ScrollView style={{ backgroundColor: "#fff" }}>
      {/* Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#747497" />
          <Text style={styles.backText}>BACK</Text>
        </TouchableOpacity>
      </View>

      {/* Main Image */}
      <Image
        source={
          typeof selectedImage === "string"
            ? { uri: selectedImage }
            : selectedImage
        }
        style={styles.mainImage}
        resizeMode="cover"
      />

      {/* Gallery */}
      <FlatList
        data={images}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(_, idx) => idx.toString()}
        style={styles.galleryList}
        contentContainerStyle={{ paddingHorizontal: 10 }}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => setSelectedImage(item)}>
            <Image
              source={
                typeof item === "string"
                  ? { uri: item }
                  : item
              }
              style={[
                styles.galleryImage,
                item === selectedImage && styles.galleryImageSelected,
              ]}
            />
          </TouchableOpacity>
        )}
      />

      {/* Product Info */}
      <View style={styles.infoSection}>
        <Text style={styles.name}>{product.name}</Text>
        <Text style={styles.subtitle}>{product.subtitle || product.description?.split("\n")[0]}</Text>
        <View style={styles.priceRow}>
          <View style={styles.priceBox}>
            <Text style={styles.priceText}>
              {product.price_range
                ? `₱${product.price_range}`
                : `₱${product.price}`}
            </Text>
          </View>
          <TouchableOpacity style={styles.favRow}>
            <Text style={styles.favText}>Add to Favorite</Text>
            <Ionicons name="heart-outline" size={20} color="#747497" style={{ marginLeft: 6 }} />
          </TouchableOpacity>
        </View>
        <View style={styles.shortDescRow}>
          <Text style={styles.shortDesc}>
            {product.short_description ||
              product.description?.split("\n")[1] ||
              "—"}
          </Text>
        </View>
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionBtn}>
            <Text style={styles.actionBtnText}>ADD TO BAG</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn}>
            <Text style={styles.actionBtnText}>BUY NOW</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Product Specification */}
      <View style={styles.specSection}>
        <Text style={styles.specTitle}>PRODUCT SPECIFICATION</Text>
        <View style={styles.specRow}>
          <View style={styles.specCol}>
            <Text style={styles.specLabel}>CATEGORY</Text>
            <Text style={styles.specValue}>{product.category || "—"}</Text>
          </View>
          <View style={styles.specCol}>
            <Text style={styles.specLabel}>ITEM PRICE</Text>
            <Text style={styles.specValue}>
              {product.price ? `₱${product.price}` : "—"}
            </Text>
          </View>
          <View style={styles.specCol}>
            <Text style={styles.specLabel}>PRICE</Text>
            <Text style={styles.specValue}>
              {product.price_range
                ? `₱${product.price_range}`
                : `₱${product.price}`}
            </Text>
          </View>
        </View>
      </View>

      {/* Product Description */}
      <View style={styles.descSection}>
        <Text style={styles.descTitle}>PRODUCT DESCRIPTION</Text>
        <Text style={styles.descText}>
          {product.full_description || product.description}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 18,
    paddingHorizontal: 10,
    backgroundColor: "#fff",
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
  },
  backText: {
    color: "#747497",
    fontWeight: "bold",
    marginLeft: 4,
    fontSize: 16,
  },
  mainImage: {
    width: "100%",
    height: 210,
    backgroundColor: "#eee",
  },
  galleryList: {
    marginTop: 8,
    marginBottom: 8,
    minHeight: 60,
  },
  galleryImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 2,
    borderColor: "#fff",
    backgroundColor: "#eee",
  },
  galleryImageSelected: {
    borderColor: "#a49dbb",
  },
  infoSection: {
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 18,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e5",
  },
  name: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 6,
    marginBottom: 2,
    textAlign: "center",
    color: "#747497",
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 14,
    color: "#747497",
    marginBottom: 10,
    textAlign: "center",
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    marginBottom: 8,
  },
  priceBox: {
    backgroundColor: "#a49dbb",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 24,
  },
  priceText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 18,
    letterSpacing: 1,
  },
  favRow: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 6,
  },
  favText: {
    color: "#747497",
    fontWeight: "bold",
    fontSize: 14,
  },
  shortDescRow: {
    marginVertical: 8,
    width: "100%",
    alignItems: "center",
  },
  shortDesc: {
    color: "#747497",
    fontSize: 13,
    textAlign: "center",
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 10,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: "#a49dbb",
    borderRadius: 6,
    paddingVertical: 12,
    marginHorizontal: 6,
    alignItems: "center",
  },
  actionBtnText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 15,
    letterSpacing: 1,
  },
  specSection: {
    backgroundColor: "#f5f5f8",
    padding: 14,
    marginTop: 18,
    borderRadius: 10,
    marginHorizontal: 10,
  },
  specTitle: {
    color: "#747497",
    fontWeight: "bold",
    fontSize: 14,
    marginBottom: 10,
    letterSpacing: 1,
  },
  specRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  specCol: {
    flex: 1,
    alignItems: "center",
  },
  specLabel: {
    color: "#b3b3b3",
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 2,
  },
  specValue: {
    color: "#747497",
    fontSize: 13,
    fontWeight: "bold",
    marginBottom: 4,
  },
  descSection: {
    marginTop: 18,
    marginBottom: 30,
    paddingHorizontal: 16,
  },
  descTitle: {
    color: "#747497",
    fontWeight: "bold",
    fontSize: 14,
    marginBottom: 8,
    letterSpacing: 1,
  },
  descText: {
    color: "#444",
    fontSize: 13,
    lineHeight: 20,
    textAlign: "justify",
  },
});
