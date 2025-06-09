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
import Header from "../Components/Header";

export default function ProductDetailsScreen({ route, navigation }) {
  const { product } = route.params;
  const images = product.images || [product.image_url];
  const [selectedImage, setSelectedImage] = useState(images[0]);

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <Header navigation={navigation} />
      <ScrollView style={{ flex: 1, backgroundColor: "#fff" }}>
        <View style={{ height: 90 }} /> 
        {/* Main Image with Back Button overlay */}
        <View>
          <Image
            source={
              typeof selectedImage === "string"
                ? { uri: selectedImage }
                : selectedImage
            }
            style={styles.mainImage}
            resizeMode="cover"
          />
          <TouchableOpacity
            style={styles.backBtnOverlay}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={22} color="#747497" />
            <Text style={styles.backText}>BACK</Text>
          </TouchableOpacity>
        </View>
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
                source={typeof item === "string" ? { uri: item } : item}
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
          <Text style={styles.subtitle}>
            {product.subtitle || product.description?.split("\n")[0]}
          </Text>
          <View style={styles.priceRow}>
            <View style={styles.priceBox}>
              <Text style={styles.priceText}>
                {product.price_range
                  ? `₱${product.price_range}`
                  : `₱${product.price}`}
              </Text>
            </View>
            <TouchableOpacity style={styles.favRow}>
              <Text style={styles.favText}>Add to favorite</Text>
              <Ionicons
                name="heart-outline"
                size={20}
                color="#747497"
                style={{ marginLeft: 6 }}
              />
            </TouchableOpacity>
          </View>
          <View style={styles.divider} />
          <Text style={styles.shortDesc}>
            {product.short_description ||
              product.description?.split("\n")[1] ||
              "—"}
          </Text>
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
              <Text style={styles.specLabel}>ITEMS INSIDE</Text>
              <Text style={styles.specValue}>
                {product.items_inside || "—"}
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
          <View style={styles.descBox}>
            <Text style={styles.descText}>
              {product.full_description || product.description}
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  backBtnOverlay: {
    position: "absolute",
    top: 18,
    left: 10,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.85)",
    borderRadius: 18,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    marginLeft: 10,
    marginBottom: 6,
  },
  backText: {
    color: "#747497",
    fontWeight: "bold",
    marginLeft: 2,
    fontSize: 15,
  },
  mainImage: {
    width: "100%",
    height: 270, // Increased for premium look
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
    marginHorizontal: 10,
    marginTop: 8,
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
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
  divider: {
    width: "100%",
    height: 1,
    backgroundColor: "#e5e5e5",
    marginVertical: 10,
  },
  shortDesc: {
    color: "#747497",
    fontSize: 13,
    textAlign: "center",
    marginBottom: 10,
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
    padding: 0,
    marginTop: 18,
    borderRadius: 10,
    marginHorizontal: 10,
    borderWidth: 1,
    borderColor: "#e5e5e5",
    overflow: "hidden",
  },
  specTitle: {
    color: "#747497",
    fontWeight: "bold",
    fontSize: 13,
    paddingVertical: 8,
    backgroundColor: "#ececf2",
    textAlign: "center",
    letterSpacing: 1,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e5",
  },
  specRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#f5f5f8",
    paddingVertical: 10,
    paddingHorizontal: 6,
  },
  specCol: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  specLabel: {
    color: "#b3b3b3",
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 2,
    textAlign: "center",
  },
  specValue: {
    color: "#747497",
    fontSize: 13,
    fontWeight: "bold",
    marginBottom: 4,
    textAlign: "center",
  },
  descSection: {
    marginTop: 18,
    marginBottom: 30,
    paddingHorizontal: 10,
  },
  descTitle: {
    color: "#747497",
    fontWeight: "bold",
    fontSize: 13,
    paddingVertical: 8,
    backgroundColor: "#ececf2",
    textAlign: "center",
    letterSpacing: 1,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    overflow: "hidden",
  },
  descBox: {
    backgroundColor: "#f5f5f8",
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e5e5e5",
    borderTopWidth: 0,
  },
  descText: {
    color: "#444",
    fontSize: 13,
    lineHeight: 20,
    textAlign: "justify",
  },
});
