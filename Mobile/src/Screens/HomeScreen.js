import React, { useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TextInput,
  TouchableOpacity,
  FlatList,
  Dimensions,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import Header from "../Components/Header";
import SideMenu from "../Components/SideMenu";
import { useTheme } from "../Context/ThemeContext";

const bannerImage = require("../Images/Background/background.png");
const logo = require("../Images/Logo/pensee-logo-with-name-horizontal.png");

const weddingProducts = [
  { title: "ERIC & MARIEL", image: require("../Images/Item/Eric.png") },
  { title: "CARLO & ISABELLE", image: require("../Images/Item/carlo.png") },
  { title: "CHARLIE", image: require("../Images/Item/Charlie.png") },
];
const corporateProducts = [
  { title: "LENOVO | AMD", image: require("../Images/Item/Legion.png") },
  { title: "THE SHEEO SOCIETY", image: require("../Images/Item/Jccm.png") },
  {
    title: "MANNERS MAKETH",
    image: require("../Images/Item/Mannersmaketh.png"),
  },
];
const bespokeProducts = [
  { title: "IN FULL BLOOM", image: require("../Images/Item/Fullbloom.png") },
  {
    title: "SPICED SIPS & SAVORIES",
    image: require("../Images/Item/Spiced.png"),
  },
  { title: "TAYLOR SWIFT", image: require("../Images/Item/Taylorswift.png") },
];

const sectionData = [
  { title: "WEDDING", products: weddingProducts },
  { title: "CORPORATE", products: corporateProducts },
  { title: "BESPOKE", products: bespokeProducts },
];

const bannerData = [
  { title: "Wedding", image: require("../Images/Background/background.png") },
  {
    title: "Corporate",
    image: require("../Images/Background/corporateBackground.png"),
  },
  {
    title: "Bespoke",
    image: require("../Images/Background/bespokeBackground.png"),
  },
];

export default function HomeScreen() {
  const scrollRef = useRef();
  const [bannerIndex, setBannerIndex] = useState(0);
  const navigation = useNavigation();
  const [menuVisible, setMenuVisible] = useState(false);
  const { darkMode } = useTheme();

  const colors = {
    bg: darkMode ? "#18191A" : "#fff",
    card: darkMode ? "#242526" : "#fff",
    header: darkMode ? "#242526" : "#6B6593",
    menu: darkMode ? "#242526" : "#6B6593",
    text: darkMode ? "#E4E6EB" : "#6B6593",
    subText: darkMode ? "#B0B3B8" : "#6B6593",
    border: darkMode ? "#3A3B3C" : "#C7C5D1",
    accent: "#6B6593",
    button: darkMode ? "#393A3B" : "#6B6593",
    buttonText: "#E4E6EB",
    steps: darkMode ? "#242526" : "#B6B3C6",
  };

  const handleScroll = (event) => {
    const page = Math.round(event.nativeEvent.contentOffset.x / width);
    setBannerIndex(page);
  };

  const scrollToIndex = (idx) => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ x: idx * width, animated: true });
    }
  };

  // Looping logic for arrows
  const handleLeft = () => {
    const newIndex = (bannerIndex - 1 + bannerData.length) % bannerData.length;
    scrollToIndex(newIndex);
  };
  const handleRight = () => {
    const newIndex = (bannerIndex + 1) % bannerData.length;
    scrollToIndex(newIndex);
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      {/* Header */}
      <Header
        showMenu
        showCart
        logoType="image"
        onMenuPress={() => setMenuVisible(true)}
        onCartPress={() => navigation.navigate("MyCart")}
        darkMode={darkMode}
      />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Welcome and Search */}
        <Text style={[styles.welcome, { color: colors.text }]}>
          WELCOME TO PENSEE
        </Text>
        <View style={styles.searchRow}>
          <TextInput
            style={[
              styles.searchInput,
              {
                backgroundColor: colors.card,
                color: colors.text,
                borderColor: colors.border,
              },
            ]}
            placeholder="Search"
            placeholderTextColor={colors.subText}
          />
          <TouchableOpacity
            style={[styles.searchButton, { backgroundColor: colors.button }]}
          >
            <Ionicons name="search" size={22} color={colors.buttonText} />
          </TouchableOpacity>
        </View>
        {/* Slidable Banner/Carousel */}
        <View style={[styles.bannerContainer, { backgroundColor: colors.bg }]}>
          <TouchableOpacity style={styles.arrowLeft} onPress={handleLeft}>
            <MaterialCommunityIcons
              name="chevron-left"
              size={32}
              color={colors.accent}
            />
          </TouchableOpacity>
          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handleScroll}
            style={{ flex: 1 }}
          >
            {bannerData.map((banner, idx) => (
              <View
                key={banner.title}
                style={{
                  width,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Image
                  source={banner.image}
                  style={styles.bannerImage}
                  resizeMode="cover"
                />
                <View
                  style={[
                    styles.bannerOverlay,
                    { backgroundColor: colors.card },
                  ]}
                >
                  <Text style={[styles.bannerText, { color: colors.text }]}>
                    {banner.title}
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>
          <TouchableOpacity style={styles.arrowRight} onPress={handleRight}>
            <MaterialCommunityIcons
              name="chevron-right"
              size={32}
              color={colors.accent}
            />
          </TouchableOpacity>
        </View>
        {/* 3 Steps Section */}
        <View style={[styles.stepsSection, { backgroundColor: colors.steps }]}>
          <Text style={[styles.stepsTitle, { color: colors.text }]}>
            CREATE YOUR OWN{"\n"}GIFT IN 3 STEPS
          </Text>
          <View style={styles.stepsRow}>
            <View style={styles.stepItem}>
              <Text style={[styles.stepNumber, { color: colors.text }]}>1</Text>
              <Text style={[styles.stepLabel, { color: colors.subText }]}>
                CHOOSE YOUR{"\n"}PACKAGING
              </Text>
            </View>
            <View style={styles.stepItem}>
              <Text style={[styles.stepNumber, { color: colors.text }]}>2</Text>
              <Text style={[styles.stepLabel, { color: colors.subText }]}>
                CHOOSE THE{"\n"}CONTENT
              </Text>
            </View>
            <View style={styles.stepItem}>
              <Text style={[styles.stepNumber, { color: colors.text }]}>3</Text>
              <Text style={[styles.stepLabel, { color: colors.subText }]}>
                MAKE IT{"\n"}PERSONAL
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={[
              styles.createMineButton,
              { backgroundColor: colors.button },
            ]}
          >
            <Text style={[styles.createMineText, { color: colors.buttonText }]}>
              CREATE MINE
            </Text>
          </TouchableOpacity>
        </View>
        {/* Product Sections */}
        {sectionData.map((section, idx) => (
          <View
            key={section.title}
            style={[styles.sectionBlock, { backgroundColor: colors.bg }]}
          >
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {section.title}
              </Text>
              <TouchableOpacity>
                <Text style={[styles.seeMore, { color: colors.accent }]}>
                  SEE MORE ▲
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.productRow}>
              {section.products.map((prod, i) => (
                <TouchableOpacity
                  key={prod.title}
                  style={[
                    styles.productCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                      opacity: 1,
                    },
                  ]}
                  onPress={() =>
                    navigation.navigate("ItemPreview", { product: prod })
                  }
                >
                  <Image
                    source={prod.image}
                    style={[styles.productImage, { opacity: 1 }]}
                    resizeMode="cover"
                  />
                  <Text style={[styles.productName, { color: colors.text }]}>
                    {prod.title}
                  </Text>
                  <Text style={[styles.productDesc, { color: colors.subText }]}>
                    Lorem ipsum dolor sit amet.
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
      <SideMenu
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        darkMode={darkMode}
      />
    </View>
  );
}

const { width } = Dimensions.get("window");

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollContent: {
    paddingBottom: 32,
  },
  welcome: {
    color: "#6B6593",
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 18,
    marginLeft: 0,
    marginBottom: 8,
    letterSpacing: 1,
    textAlign: "center",
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 18,
    marginBottom: 18,
  },
  searchInput: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#C7C5D1",
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 15,
    color: "#6B6593",
  },
  searchButton: {
    backgroundColor: "#6B6593",
    borderRadius: 8,
    marginLeft: 8,
    padding: 8,
  },
  bannerContainer: {
    marginHorizontal: 0,
    marginBottom: 18,
    alignItems: "center",
    position: "relative",
    flexDirection: "row",
    width: width,
  },
  bannerImage: {
    width: width,
    height: 160,
    borderRadius: 0,
  },
  bannerOverlay: {
    position: "absolute",
    top: 60,
    left: width / 2 - 60,
    backgroundColor: "#F5F4FA",
    paddingHorizontal: 18,
    paddingVertical: 6,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  bannerText: {
    color: "#6B6593",
    fontSize: 18,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  arrowLeft: {
    position: "absolute",
    left: 0,
    top: "50%",
    zIndex: 2,
    padding: 8,
    marginTop: -16,
  },
  arrowRight: {
    position: "absolute",
    right: 0,
    top: "50%",
    zIndex: 2,
    padding: 8,
    marginTop: -16,
  },
  stepsSection: {
    backgroundColor: "#B6B3C6",
    marginHorizontal: 0,
    marginBottom: 18,
    paddingVertical: 24,
    alignItems: "center",
  },
  stepsTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
    textAlign: "center",
    letterSpacing: 1,
  },
  stepsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    marginBottom: 12,
  },
  stepItem: {
    alignItems: "center",
    flex: 1,
  },
  stepNumber: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 2,
  },
  stepLabel: {
    color: "#fff",
    fontSize: 12,
    textAlign: "center",
    letterSpacing: 1,
  },
  createMineButton: {
    backgroundColor: "#6B6593",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 32,
    marginTop: 8,
  },
  createMineText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
    letterSpacing: 1,
  },
  sectionBlock: {
    marginTop: 18,
    marginBottom: 8,
    paddingHorizontal: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  sectionTitle: {
    color: "#6B6593",
    fontSize: 16,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  seeMore: {
    color: "#6B6593",
    fontSize: 12,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  productRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  productCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 8,
    alignItems: "center",
    width: (width - 48) / 3,
    marginHorizontal: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 2,
  },
  productImage: {
    width: "100%",
    height: 100,
    borderRadius: 8,
    marginBottom: 6,
  },
  productName: {
    color: "#6B6593",
    fontWeight: "bold",
    fontSize: 12,
    textAlign: "center",
    marginBottom: 2,
  },
  productDesc: {
    color: "#6B6593",
    fontSize: 10,
    textAlign: "center",
  },
});
