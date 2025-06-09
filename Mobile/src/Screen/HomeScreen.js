import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import Header from "../Components/Header";

const { width } = Dimensions.get("window");

// Banner images for carousel
const bannerImages = [
  require("../../assets/Banner/Wedding.png"),
  require("../../assets/Banner/Corporate.png"),
  require("../../assets/Banner/Bespoke.png"),
];

// Map product images
const imageMap = {
  Gian_Becka: require("../../assets/Images/Gian_Becka.png"),
  Eric_Mariel: require("../../assets/Images/Eric_Mariel.png"),
  Carlo_Isabelle: require("../../assets/Images/Carlo_Isabelle.png"),
};

export default function HomeScreen({ navigation }) {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [bannerIndex, setBannerIndex] = useState(0);
  const [showAllWedding, setShowAllWedding] = useState(false);
  const [showAllCorporate, setShowAllCorporate] = useState(false);
  const [showAllBespoke, setShowAllBespoke] = useState(false);
  const scrollRef = useRef();

  useEffect(() => {
    axios
      .get("http://10.0.2.2:5000/api/products")
      .then((res) => setProducts(res.data))
      .catch(() => alert("Failed to load products"))
      .finally(() => setLoading(false));
  }, []);

  // Carousel auto-scroll
  useEffect(() => {
    const interval = setInterval(() => {
      setBannerIndex((prev) => {
        const next = (prev + 1) % bannerImages.length;
        scrollRef.current?.scrollTo({ x: next * width, animated: true });
        return next;
      });
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  // Filter products by search text
  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  // Filter by category and search
  const weddingProducts = filteredProducts.filter(
    (p) => p.category === "Wedding Gift Box"
  );
  const corporateProducts = filteredProducts.filter(
    (p) => p.category === "Corporate Gift box"
  );
  const bespokeProducts = filteredProducts.filter(
    (p) => p.category === "Bespoke Gift box"
  );

  // Chunk arrays for 3-in-a-row display
  const weddingChunks = chunkArray(weddingProducts, 3);
  const corporateChunks = chunkArray(corporateProducts, 3);
  const bespokeChunks = chunkArray(bespokeProducts, 3);

  const renderProduct = (item, idx) => (
    <TouchableOpacity
      key={item.id || idx}
      style={styles.productCard}
      onPress={() => navigation.navigate("ProductDetails", { product: item })}
      activeOpacity={0.8}
    >
      <Image source={imageMap[item.image_url]} style={styles.productImage} />
      <Text style={styles.productTitle}>{item.name.replace(/_/g, " & ")}</Text>
      <Text style={styles.productDesc} numberOfLines={2}>
        {item.description}
      </Text>
    </TouchableOpacity>
  );

  if (loading) return <ActivityIndicator size="large" style={{ flex: 1 }} />;

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      {/* Header should be outside ScrollView */}
      <Header navigation={navigation} />
      <ScrollView style={styles.container}>
        <View style={{ height: 90 }} />
        {/* Welcome Header */}
        <Text style={styles.welcome}>WELCOME TO PENSEE</Text>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search"
            value={search}
            onChangeText={setSearch}
            placeholderTextColor="#b3b3b3"
          />
          <TouchableOpacity style={styles.searchButton}>
            <Ionicons name="search" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Banner Carousel */}
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          style={styles.bannerContainer}
          onMomentumScrollEnd={(e) => {
            const idx = Math.round(e.nativeEvent.contentOffset.x / width);
            setBannerIndex(idx);
          }}
        >
          {bannerImages.map((img, idx) => (
            <Image key={idx} source={img} style={styles.bannerImg} />
          ))}
        </ScrollView>
        {/* Carousel dots */}
        <View style={styles.dotsRow}>
          {bannerImages.map((_, idx) => (
            <View
              key={idx}
              style={[styles.dot, bannerIndex === idx && styles.dotActive]}
            />
          ))}
        </View>

        {/* Steps Section */}
        <View style={styles.stepsSection}>
          <Text style={styles.stepsTitle}>
            CREATE YOUR OWN{"\n"}GIFT IN 3 STEPS
          </Text>
          <View style={styles.stepsRow}>
            <View style={styles.step}>
              <Text style={styles.stepNum}>1</Text>
              <Text style={styles.stepText}>CHOOSE YOUR{"\n"}PACKAGING</Text>
            </View>
            <View style={styles.step}>
              <Text style={styles.stepNum}>2</Text>
              <Text style={styles.stepText}>CHOOSE THE{"\n"}CONTENT</Text>
            </View>
            <View style={styles.step}>
              <Text style={styles.stepNum}>3</Text>
              <Text style={styles.stepText}>MAKE IT{"\n"}PERSONAL</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.createBtn}>
            <Text style={styles.createBtnText}>CREATE MINE</Text>
          </TouchableOpacity>
        </View>

        {/* Wedding Section */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>WEDDING</Text>
          <TouchableOpacity onPress={() => setShowAllWedding((prev) => !prev)}>
            <Text style={styles.seeMore}>
              {showAllWedding ? "SEE LESS ▼" : "SEE MORE ▲"}
            </Text>
          </TouchableOpacity>
        </View>
        {weddingChunks.length > 0 && (
          <View style={styles.weddingRow}>
            {weddingChunks[0].map(renderProduct)}
          </View>
        )}
        {showAllWedding &&
          weddingChunks.slice(1).map((row, idx) => (
            <View style={styles.weddingRow} key={idx}>
              {row.map(renderProduct)}
            </View>
          ))}

        {/* Corporate Section */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>CORPORATE</Text>
          <TouchableOpacity onPress={() => setShowAllCorporate((prev) => !prev)}>
            <Text style={styles.seeMore}>
              {showAllCorporate ? "SEE LESS ▼" : "SEE MORE ▲"}
            </Text>
          </TouchableOpacity>
        </View>
        {corporateChunks.length > 0 && (
          <View style={styles.weddingRow}>
            {corporateChunks[0].map(renderProduct)}
          </View>
        )}
        {showAllCorporate &&
          corporateChunks.slice(1).map((row, idx) => (
            <View style={styles.weddingRow} key={idx}>
              {row.map(renderProduct)}
            </View>
          ))}

        {/* Bespoke Section */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>BESPOKE</Text>
          <TouchableOpacity onPress={() => setShowAllBespoke((prev) => !prev)}>
            <Text style={styles.seeMore}>
              {showAllBespoke ? "SEE LESS ▼" : "SEE MORE ▲"}
            </Text>
          </TouchableOpacity>
        </View>
        {bespokeChunks.length > 0 && (
          <View style={styles.weddingRow}>
            {bespokeChunks[0].map(renderProduct)}
          </View>
        )}
        {showAllBespoke &&
          bespokeChunks.slice(1).map((row, idx) => (
            <View style={styles.weddingRow} key={idx}>
              {row.map(renderProduct)}
            </View>
          ))}
      </ScrollView>
    </View>
  );
}

function chunkArray(array, size) {
  const result = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", paddingHorizontal: 0 },
  welcome: {
    fontSize: 18,
    color: "#a49dbb",
    textAlign: "center",
    marginTop: 10,
    marginBottom: 10,
    letterSpacing: 1,
    fontFamily: "serif",
    fontWeight: "500",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 18,
    marginBottom: 14,
    backgroundColor: "#fff",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#a49dbb",
    paddingHorizontal: 8,
    height: 44,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
    color: "#333",
    backgroundColor: "transparent",
  },
  searchButton: {
    backgroundColor: "#a49dbb",
    borderRadius: 6,
    padding: 8,
    marginLeft: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  bannerContainer: {
    width: "100%",
    height: 170,
  },
  bannerImg: {
    width: width,
    height: 170,
    resizeMode: "cover",
  },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 6,
    marginBottom: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#d1cfd7",
    marginHorizontal: 3,
  },
  dotActive: {
    backgroundColor: "#a49dbb",
  },
  stepsSection: {
    backgroundColor: "#bcb7ce",
    marginHorizontal: 0,
    borderRadius: 0,
    paddingVertical: 18,
    alignItems: "center",
    marginBottom: 18,
  },
  stepsTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 10,
    letterSpacing: 1,
  },
  stepsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    marginBottom: 10,
  },
  step: {
    alignItems: "center",
    flex: 1,
  },
  stepNum: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 2,
  },
  stepText: {
    color: "#fff",
    fontSize: 12,
    textAlign: "center",
    fontWeight: "500",
  },
  createBtn: {
    backgroundColor: "#7d789b",
    borderRadius: 6,
    paddingHorizontal: 22,
    paddingVertical: 7,
    marginTop: 6,
  },
  createBtnText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
    letterSpacing: 1,
  },
  sectionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginHorizontal: 18,
    marginTop: 10,
    marginBottom: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#7d789b",
    letterSpacing: 1,
  },
  seeMore: {
    fontSize: 12,
    color: "#7d789b",
    fontWeight: "bold",
    letterSpacing: 1,
  },
  weddingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: 8,
    marginBottom: 16,
  },
  productCard: {
    width: 110,
    backgroundColor: "#f9f9f9",
    borderRadius: 12,
    marginHorizontal: 4,
    padding: 8,
    alignItems: "center",
    elevation: 1,
  },
  productImage: {
    width: 90,
    height: 70,
    borderRadius: 8,
    marginBottom: 6,
    backgroundColor: "#ddd",
  },
  productTitle: {
    fontWeight: "bold",
    fontSize: 13,
    marginBottom: 2,
    textAlign: "center",
  },
  productDesc: {
    fontSize: 11,
    color: "#6e6e6e",
    textAlign: "center",
  },
});
