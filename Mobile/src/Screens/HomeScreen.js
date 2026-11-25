import React, { useRef, useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  FlatList,
  Dimensions,
  RefreshControl,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import Header from "../Components/Header";
import SideMenu from "../Components/SideMenu";
import { useTheme } from "../Context/ThemeContext";
import { useInventory } from "../Context/InventoryContext";
import { useCart } from "../Context/CartContext";
import { showcaseAPI } from "../services/api";
import { SkeletonProductCard } from "../Components/Skeleton/Skeleton";

const bannerImage = require("../Images/Background/background.png");
const logo = require("../Images/Logo/pensee-logo-with-name-horizontal.png");

// Showcase sections pull live bundles from GET /api/showcase?category=<key> —
// the same source of truth (showcase_bundles table) employees manage on the
// website's Showcase Gallery page. No mobile-only/hardcoded product data.
const sectionData = [
  { title: "WEDDING", category: "wedding" },
  { title: "CORPORATE", category: "corporate" },
  { title: "BESPOKE", category: "bespoke" },
];

const bannerData = [
  {
    title: "Wedding",
    tagline: "Giveaways & keepsakes for your big day",
    image: require("../Images/Background/background.png"),
  },
  {
    title: "Corporate",
    tagline: "Thoughtful gifts for clients & teams",
    image: require("../Images/Background/corporateBackground.png"),
  },
  {
    title: "Bespoke",
    tagline: "Personal gifts, made just for them",
    image: require("../Images/Background/bespokeBackground.png"),
  },
];

const AUTO_ADVANCE_MS = 5000;

export default function HomeScreen() {
  const scrollRef = useRef();
  const [bannerIndex, setBannerIndex] = useState(0);
  const navigation = useNavigation();
  const [menuVisible, setMenuVisible] = useState(false);
  const { darkMode } = useTheme();
  const [expandedSections, setExpandedSections] = useState({});
  const [refreshing, setRefreshing] = useState(false);
  const {
    filteredInventory,
    loading,
    error,
    loadInventory,
    setCategoryFilter
  } = useInventory();
  const { addToCart, totalItems } = useCart();

  const [bundlesByCategory, setBundlesByCategory] = useState({ wedding: [], corporate: [], bespoke: [] });
  const [bundlesLoading, setBundlesLoading] = useState(true);
  const [bundlesError, setBundlesError] = useState(null);

  const loadShowcaseBundles = async () => {
    setBundlesLoading(true);
    setBundlesError(null);
    try {
      const results = await Promise.all(
        sectionData.map((section) => showcaseAPI.getBundles(section.category))
      );
      const next = {};
      sectionData.forEach((section, idx) => {
        next[section.category] = results[idx]?.bundles || [];
      });
      setBundlesByCategory(next);
    } catch (error) {
      console.error("Error loading showcase bundles:", error);
      setBundlesError("Couldn't load the showcase right now.");
    } finally {
      setBundlesLoading(false);
    }
  };

  useEffect(() => {
    loadShowcaseBundles();
  }, []);

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
    const page = Math.round(event.nativeEvent.contentOffset.x / SLIDE_WIDTH);
    setBannerIndex(page);
  };

  const scrollToIndex = (idx) => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ x: idx * SLIDE_WIDTH, animated: true });
    }
    setBannerIndex(idx);
  };

  // Slides move on by themselves every few seconds. Any swipe or tap on an
  // arrow/dot restarts the countdown, so it never jumps while someone is looking.
  const [autoTick, setAutoTick] = useState(0);
  const restartAutoAdvance = () => setAutoTick((t) => t + 1);
  useEffect(() => {
    const timer = setTimeout(() => {
      scrollToIndex((bannerIndex + 1) % bannerData.length);
    }, AUTO_ADVANCE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bannerIndex, autoTick]);

  // Looping logic for arrows
  const handleLeft = () => {
    const newIndex = (bannerIndex - 1 + bannerData.length) % bannerData.length;
    scrollToIndex(newIndex);
    restartAutoAdvance();
  };
  const handleRight = () => {
    const newIndex = (bannerIndex + 1) % bannerData.length;
    scrollToIndex(newIndex);
    restartAutoAdvance();
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadInventory(), loadShowcaseBundles()]);
    setRefreshing(false);
  };

  const handleCategoryPress = (category) => {
    setCategoryFilter(category);
    navigation.navigate('Catalog');
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      {/* Header */}
      <Header
        showMenu
        showCart
        logoType="image"
        onMenuPress={() => setMenuVisible(true)}
        onCartPress={() => navigation.navigate("CustomerTabs", { screen: "Cart" })}
        darkMode={darkMode}
      />
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Welcome */}
        <Text style={[styles.welcome, { color: colors.text }]}>
          WELCOME TO PENSEE
        </Text>

        {/* Collections carousel: rounded photo cards with the name, a short
            tagline and an "Explore" button over a dark fade, plus dots. */}
        <View style={styles.carousel}>
          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScrollBeginDrag={restartAutoAdvance}
            onMomentumScrollEnd={handleScroll}
            style={styles.slider}
          >
            {bannerData.map((banner) => (
              <TouchableOpacity
                key={banner.title}
                activeOpacity={0.9}
                style={styles.slide}
                onPress={() => handleCategoryPress(banner.title.toUpperCase())}
                accessibilityRole="button"
                accessibilityLabel={`Explore ${banner.title} gifts`}
              >
                <Image source={banner.image} style={styles.slideImage} resizeMode="cover" />
                {/* Layered dark bands fake a gradient so the text stays readable. */}
                <View style={styles.fadeTop} pointerEvents="none" />
                <View style={styles.fadeMid} pointerEvents="none" />
                <View style={styles.fadeBottom} pointerEvents="none" />

                <View style={styles.slideText} pointerEvents="none">
                  <Text style={styles.slideEyebrow}>COLLECTION</Text>
                  <Text style={styles.slideTitle}>{banner.title}</Text>
                  <Text style={styles.slideTagline} numberOfLines={1}>{banner.tagline}</Text>
                  <View style={styles.exploreButton}>
                    <Text style={styles.exploreText}>Explore</Text>
                    <MaterialCommunityIcons name="arrow-right" size={14} color="#4A4570" />
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity
            style={[styles.arrowButton, { left: 24 }]}
            onPress={handleLeft}
            accessibilityLabel="Previous collection"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialCommunityIcons name="chevron-left" size={22} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.arrowButton, { right: 24 }]}
            onPress={handleRight}
            accessibilityLabel="Next collection"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialCommunityIcons name="chevron-right" size={22} color="#fff" />
          </TouchableOpacity>

          <View style={styles.dots}>
            {bannerData.map((banner, idx) => (
              <TouchableOpacity
                key={banner.title}
                onPress={() => { scrollToIndex(idx); restartAutoAdvance(); }}
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                accessibilityLabel={`Show ${banner.title}`}
              >
                <View
                  style={[
                    styles.dot,
                    idx === bannerIndex
                      ? [styles.dotActive, { backgroundColor: colors.accent }]
                      : { backgroundColor: colors.border },
                  ]}
                />
              </TouchableOpacity>
            ))}
          </View>
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
            onPress={() => navigation.navigate("CreateGift")}
          >
            <Text style={[styles.createMineText, { color: colors.buttonText }]}>
              CREATE MINE
            </Text>
          </TouchableOpacity>
        </View>
        {/* Showcase Sections (Wedding / Corporate / Bespoke) — live from GET /api/showcase */}
        {bundlesLoading ? (
          sectionData.map((section) => (
            <View key={section.title} style={[styles.sectionBlock, { backgroundColor: colors.bg }]}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>{section.title}</Text>
              </View>
              <View style={styles.productRow}>
                {Array.from({ length: 3 }).map((_, i) => (
                  <SkeletonProductCard key={i} style={{ width: (width - 48) / 3, marginHorizontal: 2 }} />
                ))}
              </View>
            </View>
          ))
        ) : bundlesError ? (
          <View style={styles.noProductsContainer}>
            <MaterialCommunityIcons name="alert-circle-outline" size={32} color={colors.subText} />
            <Text style={[styles.noProductsText, { color: colors.subText }]}>{bundlesError}</Text>
            <TouchableOpacity
              style={[styles.addToCartButton, { backgroundColor: colors.accent, position: 'relative', marginTop: 10, paddingHorizontal: 16, width: 'auto', height: 'auto', paddingVertical: 8, borderRadius: 8 }]}
              onPress={loadShowcaseBundles}
            >
              <Text style={{ color: colors.buttonText, fontWeight: 'bold' }}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : sectionData.map((section) => {
          const bundles = bundlesByCategory[section.category] || [];
          const isExpanded = expandedSections[section.title];
          const showCount = isExpanded ? bundles.length : 3;

          return (
            <View
              key={section.title}
              style={[styles.sectionBlock, { backgroundColor: colors.bg }]}
            >
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  {section.title}
                </Text>
                {bundles.length > 3 && (
                  <TouchableOpacity
                    onPress={() =>
                      setExpandedSections((prev) => ({
                        ...prev,
                        [section.title]: !isExpanded,
                      }))
                    }
                  >
                    <Text style={[styles.seeMore, { color: colors.accent }]}>
                      {isExpanded ? "SEE LESS ▼" : "SEE MORE ▲"}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
              {bundles.length > 0 ? (
                chunkArray(bundles.slice(0, showCount), 3).map((row, rowIdx) => (
                  <View key={rowIdx} style={styles.productRow}>
                    {row.map((bundle) => (
                      <TouchableOpacity
                        key={bundle.id}
                        style={[
                          styles.productCard,
                          {
                            backgroundColor: colors.card,
                            borderColor: colors.border,
                            opacity: 1,
                          },
                        ]}
                        onPress={() =>
                          navigation.navigate("BundleDetail", { bundleId: bundle.id })
                        }
                      >
                        {bundle.cover_image ? (
                          <Image
                            source={{ uri: `data:${bundle.cover_image_mime || 'image/jpeg'};base64,${bundle.cover_image}` }}
                            style={[styles.productImage, { opacity: 1 }]}
                            resizeMode="cover"
                          />
                        ) : (
                          <View style={[styles.productImage, { backgroundColor: colors.border }]}>
                            <MaterialCommunityIcons name="image" size={32} color={colors.subText} />
                          </View>
                        )}
                        <Text style={[styles.productName, { color: colors.text }]} numberOfLines={1}>
                          {bundle.title}
                        </Text>
                        <Text style={[styles.productDesc, { color: colors.subText }]} numberOfLines={2}>
                          {bundle.description || "Tap to view details"}
                        </Text>
                      </TouchableOpacity>
                    ))}
                    {/* Add empty views if row has less than 3 items */}
                    {Array.from({ length: 3 - row.length }).map((_, i) => (
                      <View
                        key={`empty-${i}`}
                        style={[
                          styles.productCard,
                          { backgroundColor: "transparent", borderColor: "transparent", elevation: 0, shadowOpacity: 0 }
                        ]}
                        pointerEvents="none"
                      />
                    ))}
                  </View>
                ))
              ) : (
                <View style={styles.noProductsContainer}>
                  <Text style={[styles.noProductsText, { color: colors.subText }]}>
                    No {section.title.toLowerCase()} sets available yet
                  </Text>
                </View>
              )}
            </View>
          );
        })}
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
const CAROUSEL_INSET = 16;
const SLIDE_WIDTH = width - CAROUSEL_INSET * 2;
const SLIDE_HEIGHT = Math.round(SLIDE_WIDTH * 0.56);

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
  carousel: {
    marginBottom: 20,
  },
  // The slider is inset 16px with rounded corners; each slide is exactly the
  // slider's width so paging lands cleanly on every card.
  slider: {
    marginHorizontal: CAROUSEL_INSET,
    borderRadius: 16,
    overflow: "hidden",
  },
  slide: {
    width: SLIDE_WIDTH,
    height: SLIDE_HEIGHT,
  },
  slideImage: {
    ...StyleSheet.absoluteFillObject,
    width: SLIDE_WIDTH,
    height: SLIDE_HEIGHT,
  },
  fadeTop: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: SLIDE_HEIGHT * 0.45,
    height: SLIDE_HEIGHT * 0.15,
    backgroundColor: "rgba(20,16,40,0.10)",
  },
  fadeMid: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: SLIDE_HEIGHT * 0.25,
    height: SLIDE_HEIGHT * 0.2,
    backgroundColor: "rgba(20,16,40,0.28)",
  },
  fadeBottom: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: SLIDE_HEIGHT * 0.25,
    backgroundColor: "rgba(20,16,40,0.48)",
  },
  slideText: {
    position: "absolute",
    left: 18,
    right: 18,
    bottom: 16,
  },
  slideEyebrow: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2,
  },
  slideTitle: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "bold",
    marginTop: 2,
    textShadowColor: "rgba(0,0,0,0.35)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  slideTagline: {
    color: "rgba(255,255,255,0.92)",
    fontSize: 13,
    marginTop: 2,
    marginBottom: 10,
  },
  exploreButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 4,
    backgroundColor: "#fff",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  exploreText: {
    color: "#4A4570",
    fontSize: 13,
    fontWeight: "700",
  },
  arrowButton: {
    position: "absolute",
    top: SLIDE_HEIGHT / 2 - 18,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.28)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  dotActive: {
    width: 22,
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
  noProductsContainer: {
    padding: 20,
    alignItems: 'center',
  },
  noProductsText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
});

function chunkArray(array, size) {
  const result = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}
