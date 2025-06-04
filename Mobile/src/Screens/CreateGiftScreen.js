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
  TextInput,
} from "react-native";
import Header from "../Components/Header";
import { useTheme } from "../Context/ThemeContext";
import CustomAlert from "../Components/CustomAlert";
import * as ImagePicker from "expo-image-picker"; 

const { width, height } = Dimensions.get("window");

const packagingOptions = [
  {
    id: "box1",
    label: "Black Box",
    image: require("../Images/Item/Blank Box.png"),
  },
  {
    id: "box2",
    label: "Signature Box",
    image: require("../Images/Item/Signature Box.png"),
  },
  {
    id: "box3",
    label: "Premium Box",
    image: require("../Images/Item/Premium Box.png"),
  },
];

const beverageOptions = [
  { id: "bev1", label: "Local Coffee", image: require("../Images/Item/Local Coffee.png") },
  { id: "bev2", label: "Loose-Leaf Tea", image: require("../Images/Item/Loose-Leaf Tea.png") },
  { id: "bev3", label: "Bulk Packing", image: require("../Images/Item/Bulk Packaging.png") },
  { id: "bev4", label: "Beer", image: require("../Images/Item/Beer.png") },
  { id: "bev5", label: "Mini Wine", image: require("../Images/Item/Mini Wine.png") },
  { id: "bev6", label: "Mini Whiskey", image: require("../Images/Item/Mini Whiskey.png") },
  { id: "bev7", label: "Full-Sized Wine", image: require("../Images/Item/Full-sized Wine.png") },
  { id: "bev8", label: "Full-Sized Whiskey", image: require("../Images/Item/Full-sized Whiskey.png") },
  { id: "bev9", label: "Tablea De Cacao", image: require("../Images/Item/Tablea de Cacao.png") },
];

// 3. Food options (7)
const foodOptions = [
  {id: "food1", label: "Sweet Pastry & Cookie", image: require("../Images/Item/Sweet Pastry & Cookies.png")},
  { id: "food2", label: "French Macaroons", image: require("../Images/Item/French Macaroons.png")},
  { id: "food3", label: "Arsenal Chocolate Bar", image: require("../Images/Item/Arsenal Chocolate Bar.png")},
  { id: "food4", label: "Custom Sugar Cookies", image: require("../Images/Item/Custom Sugar Cookies.png")},
  { id: "food5", label: "Organic Raw Honey", image: require("../Images/Item/Organic Raw Honey.png")},
  {id: "food6", label: "Infused Salt", image: require("../Images/Item/Infused Salt.png")},
  {id: "food7", label: "Super Seed & Nuts", image: require("../Images/Item/Super seed & nuts.png")},
];

// 4. Kitchenware options (8)
const kitchenwareOptions = [
  { id: "kit1", label: "Cheese Knives", image: require("../Images/Item/Cheese Knives.png") },
  { id: "kit2", label: "Champagne Flute", image: require("../Images/Item/Champagne Flute.png") },
  { id: "kit3", label: "Stemless Wine Glass", image: require("../Images/Item/Stemless wine glass.png") },
  { id: "kit4", label: "Tea Infuser", image: require("../Images/Item/Tea Infuser.png") },
  { id: "kit5", label: "Whiskey Glass", image: require("../Images/Item/Whiskey Glass.png") },
  { id: "kit6", label: "Beer Mug", image: require("../Images/Item/Beer Mug.png") },
  { id: "kit7", label: "Mug Engraving", image: require("../Images/Item/Mug Engraving.png") },
  { id: "kit8", label: "Wooden Coaster", image: require("../Images/Item/Wooden Coaster.png") },
];

// 5. Home decor (3, vertical)
const homeDecorOptions = [
  { id: "decor1", label: "Scented Candle", image: require("../Images/Item/Scented Candle.png") },
  { id: "decor2", label: "Reed Defuser", image: require("../Images/Item/Reed Defuser.png") },
  { id: "decor3", label: "Room & Linen Spray", image: require("../Images/Item/Room & linen spray.png") },
];

// 6. Face & Body (8)
const faceBodyOptions = [
  { id: "fb1", label: "Artisinal Soap", image: require("../Images/Item/Artisinal Soap.png") },
  { id: "fb2", label: "Aromatherapy Hand Soap", image: require("../Images/Item/Aromatherapy hand soap.png") },
  { id: "fb3", label: "Solid Lotion Bar", image: require("../Images/Item/Solid Lotion Bar.png") },
  { id: "fb4", label: "Pomade", image: require("../Images/Item/Pomade.png") },
  { id: "fb5", label: "Aromatherapy Body Wash", image: require("../Images/Item/Aromatherapy body wash.png") },
  { id: "fb6", label: "Floral-Infused Multi-Purpose Body Oil", image: require("../Images/Item/Floral-infused milti-purpose body oil.png")},
  { id: "fb7", label: "Sugar Body Polish", image: require("../Images/Item/Sugar Body Polish.png") },
  { id: "fb8", label: "Bath Soak", image: require("../Images/Item/Bath Soak.png") },
];

// 7. Clothing & Accessories (10)
const clothingOptions = [
  { id: "cloth1", label: "Satin Robe", image: require("../Images/Item/Satin Robe.png") },
  { id: "cloth2", label: "Men's Satin Robe", image: require("../Images/Item/Mens Satin Robe.png") },
  { id: "cloth3", label: "Satin Headband", image: require("../Images/Item/Satin Headband.png") },
  { id: "cloth4", label: "Crystal Stacker", image: require("../Images/Item/Crystal Stacker.png") },
  { id: "cloth5", label: "Custom Clay Earings", image: require("../Images/Item/Custom clay earings.png") },
  { id: "cloth6", label: "Belt", image: require("../Images/Item/Eric.png") },
  { id: "cloth7", label: "Wallet", image: require("../Images/Item/Eric.png") },
  { id: "cloth8", label: "Watch", image: require("../Images/Item/Eric.png") },
  { id: "cloth9", label: "Bag", image: require("../Images/Item/Eric.png") },
  { id: "cloth10", label: "Sunglasses", image: require("../Images/Item/Eric.png")},
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
  const [selectedBeverages, setSelectedBeverages] = useState([]);
  // Add state for each new step
  const [selectedFoods, setSelectedFoods] = useState([]);
  const [selectedKitchenwares, setSelectedKitchenwares] = useState([]);
  const [selectedHomeDecors, setSelectedHomeDecors] = useState([]);
  const [selectedFaceBodies, setSelectedFaceBodies] = useState([]);
  const [selectedClothings, setSelectedClothings] = useState([]);
  const [selectedLeatherDesks, setSelectedLeatherDesks] = useState([]);
  const [customProduct, setCustomProduct] = useState({ name: "", image: null });

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
    card: darkMode ? "#232323" : "#fff",
    text: darkMode ? "#F5F5F7" : "#111",
    accent: darkMode ? "#444" : "#6B6593", // neutral gray for dark mode accent
    border: darkMode ? "#393A3B" : "#C7C5D1",
    box: darkMode ? "#232323" : "#F5F5F7",
    selected: darkMode ? "#333" : "#B6B3C6", // slightly lighter for selected
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
            onPress={() => setSelectedPackaging(option.id)}
          >
            <Image source={option.image} style={styles.boxImage} />
            <Text style={[styles.boxLabel, { color: colors.text }]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "flex-end",
          marginTop: 24,
        }}
      >
        <TouchableOpacity
          style={[
            styles.box,
            {
              backgroundColor: selectedPackaging ? colors.accent : "#ccc",
              flex: 1,
              marginLeft: 8,
            },
          ]}
          onPress={() => selectedPackaging && animateStepChange(2)}
          disabled={!selectedPackaging}
        >
          <Text style={{ color: "#fff", textAlign: "center" }}>Next</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  // Helper for 2-column grid with hidden box if odd
  const renderGridStep = (
    options,
    selectedArray,
    setSelectedArray,
    stepTitle,
    nextStep,
    prevStep
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
                        backgroundColor: selectedArray.includes(option.id)
                          ? colors.selected
                          : colors.box,
                        borderColor: selectedArray.includes(option.id)
                          ? colors.accent
                          : colors.border,
                        width: (width - 64 - 12) / 2,
                      },
                    ]}
                    activeOpacity={0.8}
                    onPress={() => toggleSelect(selectedArray, setSelectedArray, option.id)}
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
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            marginTop: 24,
          }}
        >
          <TouchableOpacity
            style={[
              styles.box,
              { backgroundColor: colors.accent, flex: 1, marginRight: 8 },
            ]}
            onPress={() => animateStepChange(prevStep)}
            disabled={prevStep < 1}
          >
            <Text style={{ color: "#fff", textAlign: "center" }}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.box,
              {
                backgroundColor: selectedArray.length > 0 ? colors.accent : "#ccc",
                flex: 1,
                marginLeft: 8,
              },
            ]}
            onPress={() => selectedArray.length > 0 && animateStepChange(nextStep)}
            disabled={selectedArray.length === 0}
          >
            <Text style={{ color: "#fff", textAlign: "center" }}>Next</Text>
          </TouchableOpacity>
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
            onPress={() => setSelectedHomeDecor(option.id)}
          >
            <Image source={option.image} style={styles.boxImage} />
            <Text style={[styles.boxLabel, { color: colors.text }]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginTop: 24,
        }}
      >
        <TouchableOpacity
          style={[
            styles.box,
            { backgroundColor: colors.accent, flex: 1, marginRight: 8 },
          ]}
          onPress={() => animateStepChange(4)}
        >
          <Text style={{ color: "#fff", textAlign: "center" }}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.box,
            {
              backgroundColor: selectedHomeDecor ? colors.accent : "#ccc",
              flex: 1,
              marginLeft: 8,
            },
          ]}
          onPress={() => selectedHomeDecor && animateStepChange(6)}
          disabled={!selectedHomeDecor}
        >
          <Text style={{ color: "#fff", textAlign: "center" }}>Next</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  const selectedBoxes = [
    selectedPackaging && packagingOptions.find((b) => b.id === selectedPackaging),
    ...selectedBeverages.map((id) => beverageOptions.find((b) => b.id === id)),
    ...selectedFoods.map((id) => foodOptions.find((b) => b.id === id)),
    ...selectedKitchenwares.map((id) => kitchenwareOptions.find((b) => b.id === id)),
    ...selectedHomeDecors.map((id) => homeDecorOptions.find((b) => b.id === id)),
    ...selectedFaceBodies.map((id) => faceBodyOptions.find((b) => b.id === id)),
    ...selectedClothings.map((id) => clothingOptions.find((b) => b.id === id)),
    ...selectedLeatherDesks.map((id) => leatherDeskOptions.find((b) => b.id === id)),
  ].filter(Boolean);

  const [form, setForm] = useState({
    name: "",
    email: "",
    contact: "",
    quantity: "",
    shippingLocation: "",
    deliveryDate: "",
  });

  const [formErrors, setFormErrors] = useState({});

  const [alert, setAlert] = useState({ visible: false, message: "" });
  const showAlert = (msg) => setAlert({ visible: true, message: msg });
  const hideAlert = () => setAlert({ visible: false, message: "" });

  const toggleSelect = (selectedArray, setSelectedArray, id) => {
    setSelectedArray((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const validateForm = (field, value) => {
    let errors = { ...formErrors };

    if (field === "name" || !field) {
      errors.name = form.name.trim() ? "" : "Name is required";
    }
    if (field === "email" || !field) {
      errors.email = /\S+@\S+\.\S+/.test(form.email) ? "" : "Invalid email";
    }
    if (field === "contact" || !field) {
      errors.contact = form.contact.trim().length >= 7 ? "" : "Contact is too short";
    }
    if (field === "quantity" || !field) {
      errors.quantity = Number(form.quantity) > 0 ? "" : "Enter a valid quantity";
    }
    if (field === "shippingLocation" || !field) {
      errors.shippingLocation = form.shippingLocation.trim() ? "" : "Required";
    }
    if (field === "deliveryDate" || !field) {
      errors.deliveryDate = form.deliveryDate.trim() ? "" : "Required";
    }

    setFormErrors(errors);
    // Return true if no errors
    return Object.values(errors).every((e) => !e);
  };

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
        {step === 1 ? (
          renderPackaging()
        ) : step === 2 ? (
          renderGridStep(
            beverageOptions,
            selectedBeverages,
            setSelectedBeverages,
            "Choose your Beverage(s)",
            3,
            1
          )
        ) : step === 3 ? (
          renderGridStep(
            foodOptions,
            selectedFoods,
            setSelectedFoods,
            "Choose your Food",
            4,
            2
          )
        ) : step === 4 ? (
          renderGridStep(
            kitchenwareOptions,
            selectedKitchenwares,
            setSelectedKitchenwares,
            "Choose your Kitchenware",
            5,
            3
          )
        ) : step === 5 ? (
          renderGridStep(
            homeDecorOptions,
            selectedHomeDecors,
            setSelectedHomeDecors,
            "Choose your Home Decor",
            6,
            4
          )
        ) : step === 6 ? (
          renderGridStep(
            faceBodyOptions,
            selectedFaceBodies,
            setSelectedFaceBodies,
            "Choose your Face & Body",
            7,
            5
          )
        ) : step === 7 ? (
          renderGridStep(
            clothingOptions,
            selectedClothings,
            setSelectedClothings,
            "Choose your Clothing & Accessories",
            8,
            6
          )
        ) : step === 8 ? (
          renderGridStep(
            leatherDeskOptions,
            selectedLeatherDesks,
            setSelectedLeatherDesks,
            "Choose your Leather Products and Desk Essentials",
            9,
            7
          )
        ) : step === 9 ? (
          <Animated.View style={{ opacity: fadeAnim, width: "100%" }}>
            <Text style={[styles.stepTitle, { color: colors.text }]}>
              Complete Your Order
            </Text>
            <View style={{ gap: 14 }}>
              <TextInput
                style={styles.input}
                placeholder="Name"
                value={form.name}
                onChangeText={(v) => {
                  setForm((f) => ({ ...f, name: v }));
                  validateForm("name", v);
                }}
                onBlur={() => validateForm("name")}
              />
              {formErrors.name ? (
                <Text style={{ color: "red", fontSize: 13 }}>{formErrors.name}</Text>
              ) : null}
              <TextInput
                style={styles.input}
                placeholder="Email"
                value={form.email}
                onChangeText={(v) => {
                  setForm((f) => ({ ...f, email: v }));
                  validateForm("email", v);
                }}
                onBlur={() => validateForm("email")}
              />
              {formErrors.email ? (
                <Text style={{ color: "red", fontSize: 13 }}>{formErrors.email}</Text>
              ) : null}
              <TextInput
                style={styles.input}
                placeholder="Contact Number"
                value={form.contact}
                onChangeText={(v) => {
                  setForm((f) => ({ ...f, contact: v }));
                  validateForm("contact", v);
                }}
                onBlur={() => validateForm("contact")}
                keyboardType="phone-pad"
              />
              {formErrors.contact ? (
                <Text style={{ color: "red", fontSize: 13 }}>{formErrors.contact}</Text>
              ) : null}
              <TextInput
                style={styles.input}
                placeholder="Order Quantity"
                value={form.quantity}
                onChangeText={(v) => {
                  setForm((f) => ({ ...f, quantity: v }));
                  validateForm("quantity", v);
                }}
                onBlur={() => validateForm("quantity")}
                keyboardType="numeric"
              />
              {formErrors.quantity ? (
                <Text style={{ color: "red", fontSize: 13 }}>{formErrors.quantity}</Text>
              ) : null}
              <TextInput
                style={styles.input}
                placeholder="Shipping Location"
                value={form.shippingLocation}
                onChangeText={(v) => {
                  setForm((f) => ({ ...f, shippingLocation: v }));
                  validateForm("shippingLocation", v);
                }}
                onBlur={() => validateForm("shippingLocation")}
              />
              {formErrors.shippingLocation ? (
                <Text style={{ color: "red", fontSize: 13 }}>{formErrors.shippingLocation}</Text>
              ) : null}
              <TextInput
                style={styles.input}
                placeholder="Date of Delivery"
                value={form.deliveryDate}
                onChangeText={(v) => {
                  setForm((f) => ({ ...f, deliveryDate: v }));
                  validateForm("deliveryDate", v);
                }}
                onBlur={() => validateForm("deliveryDate")}
              />
              {formErrors.deliveryDate ? (
                <Text style={{ color: "red", fontSize: 13 }}>{formErrors.deliveryDate}</Text>
              ) : null}
              {/* Add My Own Product section here */}
              <View style={{ marginVertical: 16 }}>
                <Text
                  style={{ fontWeight: "bold", fontSize: 16, marginBottom: 8 }}
                >
                  Add My Own Product
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="Product Name"
                  value={customProduct.name}
                  onChangeText={(v) => setCustomProduct((p) => ({ ...p, name: v }))}
                />
                <TouchableOpacity
                  style={[
                    styles.box,
                    { backgroundColor: colors.box, alignItems: "center", marginTop: 8 },
                  ]}
                  onPress={async () => {
                    let result = await ImagePicker.launchImageLibraryAsync({
                      mediaTypes: ImagePicker.MediaTypeOptions.Images,
                      allowsEditing: true,
                      aspect: [1, 1],
                      quality: 0.5,
                    });
                    if (!result.canceled) {
                      setCustomProduct((p) => ({
                        ...p,
                        image: result.assets[0].uri,
                      }));
                    }
                  }}
                >
                  <Text style={{ color: colors.text }}>
                    {customProduct.image ? "Change Image" : "Add Image"}
                  </Text>
                  {customProduct.image && (
                    <Image
                      source={{ uri: customProduct.image }}
                      style={{
                        width: 60,
                        height: 60,
                        marginTop: 8,
                        borderRadius: 8,
                      }}
                    />
                  )}
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={[styles.box, { backgroundColor: colors.accent }]}
                onPress={() => {
                  if (validateForm()) {
                    showAlert("Order submitted! we will contact you soon.");
                    setTimeout(() => {
                      hideAlert();
                      navigation.navigate("Home");
                    }, 2000);
                  }
                }}
              >
                <Text style={{ color: "#fff", textAlign: "center" }}>
                  Submit Order
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        ) : null}
      </ScrollView>
      {/* Slide Up Panel */}
      <Animated.View
        style={[
          styles.panel,
          {
            backgroundColor: colors.card,
            top: panelAnim,
            borderColor: colors.border,
            height: panelHeight,
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
          <ScrollView>
            {(() => {
              // Group selectedBoxes into rows of 2
              const rows = [];
              for (let i = 0; i < selectedBoxes.length; i += 2) {
                rows.push(selectedBoxes.slice(i, i + 2));
              }
              // If odd, add a dummy for alignment
              if (rows.length && rows[rows.length - 1].length === 1) {
                rows[rows.length - 1].push({ id: "dummy", dummy: true });
              }
              return rows.map((row, idx) => (
                <View
                  key={idx}
                  style={{ flexDirection: "row", marginBottom: 10, gap: 12 }}
                >
                  {row.map((item) =>
                    item.dummy ? (
                      <View key="dummy" style={{ flex: 1 }} />
                    ) : (
                      <View
                        key={item.id}
                        style={[styles.panelItemRow, { flex: 1 }]}
                      >
                        <Image
                          source={item.image}
                          style={styles.panelItemImage}
                        />
                        <Text
                          style={[
                            styles.panelItemLabel,
                            { color: colors.text },
                          ]}
                        >
                          {item.label}
                        </Text>
                      </View>
                    )
                  )}
                </View>
              ));
            })()}
          </ScrollView>
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
      <CustomAlert
        visible={alert.visible}
        message={alert.message}
        onClose={() => {
          hideAlert();
          navigation.navigate("Home");
        }}
      />
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
  input: {
    borderWidth: 1,
    borderColor: "#C7C5D1",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#111",
    r: "#fff",
    backgroundColor: "#fff",
    width: "100%",
  },
});
