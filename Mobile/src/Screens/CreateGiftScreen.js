import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  ScrollView,
  Image,
  PanResponder,
} from "react-native";
import Header from "../Components/Header";
import { useTheme } from "../Context/ThemeContext";

const { width, height } = Dimensions.get("window");

const packagingOptions = [
  {
    id: "box1",
    label: "Classic Box",
    image: require("../Images/Item/Eric.png"),
  },
  {
    id: "box2",
    label: "Elegant Box",
    image: require("../Images/Item/Eric.png"),
  },
  {
    id: "box3",
    label: "Minimalist Box",
    image: require("../Images/Item/Eric.png"),
  },
];

const beverageOptions = [
  { id: "bev1", label: "Coffee", image: require("../Images/Item/Eric.png") },
  { id: "bev2", label: "Tea", image: require("../Images/Item/Eric.png") },
  { id: "bev3", label: "Wine", image: require("../Images/Item/Eric.png") },
  { id: "bev4", label: "Juice", image: require("../Images/Item/Eric.png") },
  { id: "bev5", label: "Soda", image: require("../Images/Item/Eric.png") },
  { id: "bev6", label: "Milk", image: require("../Images/Item/Eric.png") },
  { id: "bev7", label: "Champagne", image: require("../Images/Item/Eric.png") },
  { id: "bev8", label: "Whiskey", image: require("../Images/Item/Eric.png") },
  { id: "bev9", label: "Beer", image: require("../Images/Item/Eric.png") },
];

// 3. Food options (7)
const foodOptions = [
  {
    id: "food1",
    label: "Chocolate",
    image: require("../Images/Item/Eric.png"),
  },
  { id: "food2", label: "Cookies", image: require("../Images/Item/Eric.png") },
  { id: "food3", label: "Nuts", image: require("../Images/Item/Eric.png") },
  { id: "food4", label: "Chips", image: require("../Images/Item/Eric.png") },
  { id: "food5", label: "Candy", image: require("../Images/Item/Eric.png") },
  {
    id: "food6",
    label: "Dried Fruit",
    image: require("../Images/Item/Eric.png"),
  },
  {
    id: "food7",
    label: "Granola Bar",
    image: require("../Images/Item/Eric.png"),
  },
];

// 4. Kitchenware options (8)
const kitchenwareOptions = [
  { id: "kit1", label: "Mug", image: require("../Images/Item/Eric.png") },
  { id: "kit2", label: "Plate", image: require("../Images/Item/Eric.png") },
  { id: "kit3", label: "Bowl", image: require("../Images/Item/Eric.png") },
  { id: "kit4", label: "Spoon", image: require("../Images/Item/Eric.png") },
  { id: "kit5", label: "Fork", image: require("../Images/Item/Eric.png") },
  { id: "kit6", label: "Knife", image: require("../Images/Item/Eric.png") },
  { id: "kit7", label: "Tumbler", image: require("../Images/Item/Eric.png") },
  { id: "kit8", label: "Tray", image: require("../Images/Item/Eric.png") },
];

// 5. Home decor (3, vertical)
const homeDecorOptions = [
  { id: "decor1", label: "Candle", image: require("../Images/Item/Eric.png") },
  { id: "decor2", label: "Vase", image: require("../Images/Item/Eric.png") },
  { id: "decor3", label: "Frame", image: require("../Images/Item/Eric.png") },
];

// 6. Face & Body (8)
const faceBodyOptions = [
  { id: "fb1", label: "Soap", image: require("../Images/Item/Eric.png") },
  { id: "fb2", label: "Lotion", image: require("../Images/Item/Eric.png") },
  { id: "fb3", label: "Scrub", image: require("../Images/Item/Eric.png") },
  { id: "fb4", label: "Mask", image: require("../Images/Item/Eric.png") },
  { id: "fb5", label: "Shampoo", image: require("../Images/Item/Eric.png") },
  {
    id: "fb6",
    label: "Conditioner",
    image: require("../Images/Item/Eric.png"),
  },
  { id: "fb7", label: "Lip Balm", image: require("../Images/Item/Eric.png") },
  { id: "fb8", label: "Hand Cream", image: require("../Images/Item/Eric.png") },
];

// 7. Clothing & Accessories (10)
const clothingOptions = [
  { id: "cloth1", label: "Scarf", image: require("../Images/Item/Eric.png") },
  { id: "cloth2", label: "Socks", image: require("../Images/Item/Eric.png") },
  { id: "cloth3", label: "Tie", image: require("../Images/Item/Eric.png") },
  { id: "cloth4", label: "Hat", image: require("../Images/Item/Eric.png") },
  { id: "cloth5", label: "Gloves", image: require("../Images/Item/Eric.png") },
  { id: "cloth6", label: "Belt", image: require("../Images/Item/Eric.png") },
  { id: "cloth7", label: "Wallet", image: require("../Images/Item/Eric.png") },
  { id: "cloth8", label: "Watch", image: require("../Images/Item/Eric.png") },
  { id: "cloth9", label: "Bag", image: require("../Images/Item/Eric.png") },
  {
    id: "cloth10",
    label: "Sunglasses",
    image: require("../Images/Item/Eric.png"),
  },
];

// 8. Leather Products and Desk Essentials (5)
const leatherDeskOptions = [
  { id: "ld1", label: "Notebook", image: require("../Images/Item/Eric.png") },
  { id: "ld2", label: "Pen", image: require("../Images/Item/Eric.png") },
  {
    id: "ld3",
    label: "Card Holder",
    image: require("../Images/Item/Eric.png"),
  },
  { id: "ld4", label: "Keychain", image: require("../Images/Item/Eric.png") },
  { id: "ld5", label: "Desk Mat", image: require("../Images/Item/Eric.png") },
];

export default function CreateGiftScreen({ navigation }) {
  const { darkMode } = useTheme();
  const [step, setStep] = useState(1);
  const [selectedPackaging, setSelectedPackaging] = useState(null);
  const [selectedBeverage, setSelectedBeverage] = useState(null);
  // Add state for each new step
  const [selectedFood, setSelectedFood] = useState(null);
  const [selectedKitchenware, setSelectedKitchenware] = useState(null);
  const [selectedHomeDecor, setSelectedHomeDecor] = useState(null);
  const [selectedFaceBody, setSelectedFaceBody] = useState(null);
  const [selectedClothing, setSelectedClothing] = useState(null);
  const [selectedLeatherDesk, setSelectedLeatherDesk] = useState(null);

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // --- Sliding Up Panel State ---
  const panelHeight = height * 0.6; // 60% of screen height
  const panelAnim = useRef(new Animated.Value(height)).current;
  const [panelOpen, setPanelOpen] = useState(false);

  // PanResponder for drag
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) =>
        Math.abs(gestureState.dy) > 10,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy < 0) {
          // Drag up
          panelAnim.setValue(
            Math.max(height - panelHeight, height + gestureState.dy)
          );
        } else {
          // Drag down
          panelAnim.setValue(
            Math.min(height, height - panelHeight + gestureState.dy)
          );
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy < -50) {
          openPanel();
        } else if (gestureState.dy > 50) {
          closePanel();
        } else {
          panelOpen ? openPanel() : closePanel();
        }
      },
    })
  ).current;

  const openPanel = () => {
    setPanelOpen(true);
    Animated.timing(panelAnim, {
      toValue: panelHeight,
      duration: 250,
      useNativeDriver: false,
    }).start();
  };

  const closePanel = () => {
    setPanelOpen(false);
    Animated.timing(panelAnim, {
      toValue: height,
      duration: 250,
      useNativeDriver: false,
    }).start();
  };

  // Animate step change
  const animateStepChange = (nextStep) => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setStep(nextStep);
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }).start();
    });
  };

  const colors = {
    bg: darkMode ? "#18191A" : "#fff",
    card: darkMode ? "#242526" : "#fff",
    text: darkMode ? "#fff" : "#111",
    accent: darkMode ? "#4F8EF7" : "#6B6593",
    border: darkMode ? "#393A3B" : "#C7C5D1",
    box: darkMode ? "#23243a" : "#F5F5F7",
    selected: darkMode ? "#4F8EF7" : "#B6B3C6",
  };

  // Render packaging step
  const renderPackaging = () => (
    <Animated.View style={{ opacity: fadeAnim, width: "100%" }}>
      <Text style={[styles.stepTitle, { color: colors.text }]}>
        Choose your Packaging
      </Text>
      <View style={styles.verticalBoxList}>
        {packagingOptions.map((option) => (
          <TouchableOpacity
            key={option.id}
            style={[
              styles.box,
              {
                backgroundColor:
                  selectedPackaging === option.id
                    ? colors.selected
                    : colors.box,
                borderColor:
                  selectedPackaging === option.id
                    ? colors.accent
                    : colors.border,
                width: width - 64,
              },
            ]}
            activeOpacity={0.8}
            onPress={() => {
              setSelectedPackaging(option.id);
              animateStepChange(2);
            }}
          >
            <Image source={option.image} style={styles.boxImage} />
            <Text style={[styles.boxLabel, { color: colors.text }]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </Animated.View>
  );

  // Helper for 2-column grid with hidden box if odd
  const renderGridStep = (
    options,
    selected,
    setSelected,
    stepTitle,
    nextStep
  ) => {
    const rows = [];
    for (let i = 0; i < options.length; i += 2) {
      rows.push(options.slice(i, i + 2));
    }
    // If last row is odd, add a dummy
    if (rows.length && rows[rows.length - 1].length === 1) {
      rows[rows.length - 1].push({ id: "hidden", hidden: true });
    }
    return (
      <Animated.View style={{ opacity: fadeAnim, width: "100%" }}>
        <Text style={[styles.stepTitle, { color: colors.text }]}>
          {stepTitle}
        </Text>
        <View style={styles.gridBoxList}>
          {rows.map((row, rowIdx) => (
            <View key={rowIdx} style={styles.beverageRow}>
              {row.map((option) =>
                option.hidden ? (
                  <View
                    key="hidden"
                    style={[
                      styles.box,
                      {
                        backgroundColor: "transparent",
                        borderColor: "transparent",
                        width: (width - 64 - 12) / 2,
                        elevation: 0,
                      },
                    ]}
                  />
                ) : (
                  <TouchableOpacity
                    key={option.id}
                    style={[
                      styles.box,
                      {
                        backgroundColor:
                          selected === option.id ? colors.selected : colors.box,
                        borderColor:
                          selected === option.id
                            ? colors.accent
                            : colors.border,
                        width: (width - 64 - 12) / 2,
                      },
                    ]}
                    activeOpacity={0.8}
                    onPress={() => {
                      setSelected(option.id);
                      animateStepChange(nextStep);
                    }}
                  >
                    <Image source={option.image} style={styles.boxImage} />
                    <Text style={[styles.boxLabel, { color: colors.text }]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                )
              )}
            </View>
          ))}
        </View>
      </Animated.View>
    );
  };

  // Home decor (vertical)
  const renderHomeDecor = () => (
    <Animated.View style={{ opacity: fadeAnim, width: "100%" }}>
      <Text style={[styles.stepTitle, { color: colors.text }]}>
        Choose your Home Decor
      </Text>
      <View style={styles.verticalBoxList}>
        {homeDecorOptions.map((option) => (
          <TouchableOpacity
            key={option.id}
            style={[
              styles.box,
              {
                backgroundColor:
                  selectedHomeDecor === option.id
                    ? colors.selected
                    : colors.box,
                borderColor:
                  selectedHomeDecor === option.id
                    ? colors.accent
                    : colors.border,
                width: width - 64,
              },
            ]}
            activeOpacity={0.8}
            onPress={() => {
              setSelectedHomeDecor(option.id);
              animateStepChange(6);
            }}
          >
            <Image source={option.image} style={styles.boxImage} />
            <Text style={[styles.boxLabel, { color: colors.text }]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </Animated.View>
  );

  // Get selected boxes for panel
  const selectedBoxes = [
    selectedPackaging &&
      packagingOptions.find((b) => b.id === selectedPackaging),
    selectedBeverage && beverageOptions.find((b) => b.id === selectedBeverage),
    selectedFood && foodOptions.find((b) => b.id === selectedFood),
    selectedKitchenware &&
      kitchenwareOptions.find((b) => b.id === selectedKitchenware),
    selectedHomeDecor &&
      homeDecorOptions.find((b) => b.id === selectedHomeDecor),
    selectedFaceBody && faceBodyOptions.find((b) => b.id === selectedFaceBody),
    selectedClothing && clothingOptions.find((b) => b.id === selectedClothing),
    selectedLeatherDesk &&
      leatherDeskOptions.find((b) => b.id === selectedLeatherDesk),
  ].filter(Boolean);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header
        showBack
        logoType="image"
        showCart
        onBackPress={() => navigation.goBack()}
        onCartPress={() => navigation.navigate("MyCart")}
        darkMode={darkMode}
        title="Create Your Own Gift"
      />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {step === 1
          ? renderPackaging()
          : step === 2
          ? renderGridStep(
              beverageOptions,
              selectedBeverage,
              setSelectedBeverage,
              "Choose your Beverage",
              3
            )
          : step === 3
          ? renderGridStep(
              foodOptions,
              selectedFood,
              setSelectedFood,
              "Choose your Food",
              4
            )
          : step === 4
          ? renderGridStep(
              kitchenwareOptions,
              selectedKitchenware,
              setSelectedKitchenware,
              "Choose your Kitchenware",
              5
            )
          : step === 5
          ? renderHomeDecor()
          : step === 6
          ? renderGridStep(
              faceBodyOptions,
              selectedFaceBody,
              setSelectedFaceBody,
              "Choose your Face & Body",
              7
            )
          : step === 7
          ? renderGridStep(
              clothingOptions,
              selectedClothing,
              setSelectedClothing,
              "Choose your Clothing & Accessories",
              8
            )
          : step === 8
          ? renderGridStep(
              leatherDeskOptions,
              selectedLeatherDesk,
              setSelectedLeatherDesk,
              "Choose your Leather Products and Desk Essentials",
              9
            )
          : null}
      </ScrollView>
      {/* Slide Up Panel */}
      <Animated.View
        style={[
          styles.panel,
          {
            backgroundColor: colors.card,
            top: panelAnim,
            borderColor: colors.border,
            height: panelHeight, // Ensure panel fills the bottom
          },
        ]}
        {...panResponder.panHandlers}
      >
        <View style={styles.panelHandle} />
        <Text style={[styles.panelTitle, { color: colors.text }]}>
          Selected Items
        </Text>
        {selectedBoxes.length === 0 ? (
          <Text style={{ color: colors.text, textAlign: "center" }}>
            No items selected yet.
          </Text>
        ) : (
          selectedBoxes.map((item) => (
            <View key={item.id} style={styles.panelItemRow}>
              <Image source={item.image} style={styles.panelItemImage} />
              <Text style={[styles.panelItemLabel, { color: colors.text }]}>
                {item.label}
              </Text>
            </View>
          ))
        )}
      </Animated.View>
      {/* Button to open panel */}
      {!panelOpen && (
        <TouchableOpacity
          style={styles.panelOpenBtn}
          onPress={openPanel}
          activeOpacity={0.7}
        >
          <View style={styles.panelHandleMini} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: 18,
    alignItems: "center",
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 18,
    textAlign: "center",
  },
  verticalBoxList: {
    flexDirection: "column",
    alignItems: "center",
    gap: 18,
  },
  gridBoxList: {
    flexDirection: "column",
    alignItems: "center",
    gap: 18,
  },
  beverageRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 12,
    gap: 12,
    width: "100%",
  },
  box: {
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center",
    padding: 18,
    marginBottom: 0,
    elevation: 2,
  },
  boxImage: {
    width: 60,
    height: 60,
    marginBottom: 10,
    borderRadius: 8,
    backgroundColor: "#EDECF3",
  },
  boxLabel: {
    fontSize: 15,
    fontWeight: "500",
    textAlign: "center",
  },
  // Panel styles
  panel: {
    position: "absolute",
    width: "100%",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: 1,
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: -2 },
    paddingTop: 16,
    paddingHorizontal: 24,
    zIndex: 100,
    bottom: 100,
  },
  panelHandle: {
    width: 48,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#C7C5D1",
    alignSelf: "center",
    marginBottom: 12,
  },
  panelTitle: {
    fontWeight: "bold",
    fontSize: 16,
    marginBottom: 12,
    textAlign: "center",
  },
  panelItemRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 12,
  },
  panelItemImage: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#EDECF3",
  },
  panelItemLabel: {
    fontSize: 15,
    fontWeight: "500",
  },

  panelHandleMini: {
    width: 48,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#C7C5D1",
    marginBottom: 6,
    marginTop: 2,
  },
});
