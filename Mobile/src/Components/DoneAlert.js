import React, { useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  FlatList,
  Dimensions,
  Animated,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import Header from "../Components/Header";
import DoneAlert from "../Components/DoneAlert"; // Update path if needed

const { width, height } = Dimensions.get("window");

const steps = [
  {
    label: "Choose your Packaging",
    key: "packaging",
    items: [
      { name: "Blanc Box", desc: "white mailer", image: require("../../assets/Images/Dane.png") },
      { name: "Signature Box", desc: "wooden box with acrylic cover", image: require("../../assets/Images/Dane.png") },
      { name: "Premium Box", desc: "wooden box with wooden cover", image: require("../../assets/Images/Dane.png") },
    ],
  },
  {
    label: "Choose your Beverage",
    key: "beverage",
    items: [
      { name: "Local Coffee", image: require("../../assets/Images/Dane.png") },
      { name: "Loose-leaf Tea", image: require("../../assets/Images/Dane.png") },
      { name: "Beer", image: require("../../assets/Images/Dane.png") },
      { name: "Mini Wine", image: require("../../assets/Images/Dane.png") },
      { name: "Mini Whiskey", image: require("../../assets/Images/Dane.png") },
      { name: "Full-sized Wine", image: require("../../assets/Images/Dane.png") },
      { name: "Full-sized Spirits/Liquor", image: require("../../assets/Images/Dane.png") },
      { name: "Tablea de Cacao", image: require("../../assets/Images/Dane.png") },
    ],
  },
  {
    label: "Choose your Food",
    key: "food",
    items: [
      { name: "Sweet Pastries & Cookies", desc: "MOQ: 6 sets", image: require("../../assets/Images/Dane.png") },
      { name: "French Macarons", desc: "MOQ: 6pcs", image: require("../../assets/Images/Dane.png") },
      { name: "Artisanal Chocolate Bar", image: require("../../assets/Images/Dane.png") },
      { name: "Custom Sugar Cookies", desc: "MOQ: 12pcs/design", image: require("../../assets/Images/Dane.png") },
      { name: "Organic Raw Honey", image: require("../../assets/Images/Dane.png") },
      { name: "Infused Salt (Set)", image: require("../../assets/Images/Dane.png") },
      { name: "Super Seeds & Nuts", image: require("../../assets/Images/Dane.png") },
    ],
  },
  {
    label: "Choose your Kitchenware",
    key: "kitchenware",
    items: [
      { name: "Cheese Knives (Set)", image: require("../../assets/Images/Dane.png") },
      { name: "Champagne Flute", image: require("../../assets/Images/Dane.png") },
      { name: "Stemless Wine Glass", desc: "customizable", image: require("../../assets/Images/Dane.png") },
      { name: "Tea Infuser", image: require("../../assets/Images/Dane.png") },
      { name: "Whiskey Glass", image: require("../../assets/Images/Dane.png") },
      { name: "Beer Mug", image: require("../../assets/Images/Dane.png") },
      { name: "Mug", desc: "customizable", image: require("../../assets/Images/Dane.png") },
      { name: "Wooden Coaster", desc: "customizable", image: require("../../assets/Images/Dane.png") },
    ],
  },
  {
    label: "Choose your Home Decor",
    key: "home_decor",
    items: [
      { name: "Scented Candle", image: require("../../assets/Images/Dane.png") },
      { name: "Reed Diffuser", image: require("../../assets/Images/Dane.png") },
      { name: "Room & Linen Spray", image: require("../../assets/Images/Dane.png") },
    ],
  },
  {
    label: "Choose contents - Face and Body",
    key: "face_body",
    items: [
      { name: "Artisanal Soap", image: require("../../assets/Images/Dane.png") },
      { name: "Aromatherapy Hand Wash", image: require("../../assets/Images/Dane.png") },
      { name: "Solid Lotion Bar", image: require("../../assets/Images/Dane.png") },
      { name: "Pomade", image: require("../../assets/Images/Dane.png") },
      { name: "Aromatherapy Body Wash", image: require("../../assets/Images/Dane.png") },
      { name: "Floral-Infused Body Oil", image: require("../../assets/Images/Dane.png") },
      { name: "Sugar Body Polish", image: require("../../assets/Images/Dane.png") },
      { name: "Bath Soak", image: require("../../assets/Images/Dane.png") },
    ],
  },
  {
    label: "Choose contents - Clothing and Accessories",
    key: "clothing",
    items: [
      { name: "Satin Robe", desc: "customizable", image: require("../../assets/Images/Dane.png") },
      { name: "Men’s Satin Robe", image: require("../../assets/Images/Dane.png") },
      { name: "Satin Headband", image: require("../../assets/Images/Dane.png") },
      { name: "Crystal Stacker", image: require("../../assets/Images/Dane.png") },
      { name: "Custom Clay Earrings", image: require("../../assets/Images/Dane.png") },
    ],
  },
  {
    label: "Choose contents - Leather Products and Desk Essentials",
    key: "leather_desk",
    items: [
      { name: "Bullet Pen", image: require("../../assets/Images/Dane.png") },
      { name: "Key Holder", image: require("../../assets/Images/Dane.png") },
      { name: "Card Holder with Money Clip", image: require("../../assets/Images/Dane.png") },
      { name: "Luggage Tag", image: require("../../assets/Images/Dane.png") },
      { name: "Vanity Pouch", image: require("../../assets/Images/Dane.png") },
    ],
  },
];

const howItWorksSteps = [
  "Choose your package",
  "Choose the content",
  "Make it personal",
  "Fill out order form",
  "Design approval",
  "Payment & assembly"
];

export default function CreateGiftScreen({ navigation }) {
  const [started, setStarted] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [selected, setSelected] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    contact: "",
    address: "",
    date: "",
    budget: "",
  });
  const [alert, setAlert] = useState({ visible: false, message: "" });

  // Panel Animation Setup
  const panelHeight = height * 0.45;
  const panelAnim = useRef(new Animated.Value(0)).current; // 0: closed, 1: open
  const [panelOpen, setPanelOpen] = useState(false);

  const togglePanel = () => {
    setPanelOpen((open) => {
      Animated.timing(panelAnim, {
        toValue: open ? 0 : 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
      return !open;
    });
  };

  const allPicked = steps.every((s) => selected[s.key]);

  function handleSelect(item) {
    const currentStep = steps[stepIndex];
    setSelected({ ...selected, [currentStep.key]: item });
    if (stepIndex < steps.length - 1) setStepIndex(stepIndex + 1);
  }

  // "How it Works" intro first
  if (!started) {
    return (
      <View style={styles.introContainer}>
        <Header navigation={navigation} />
        <Text style={styles.title}>How it Works</Text>
        <View style={styles.stepsRow}>
          {howItWorksSteps.map((step, idx) => (
            <View style={styles.introStep} key={idx}>
              <Text style={styles.introNum}>0{idx + 1}</Text>
              <Text style={styles.introText}>{step.toUpperCase()}</Text>
            </View>
          ))}
        </View>
        <TouchableOpacity
          style={styles.getStartedBtn}
          onPress={() => setStarted(true)}
        >
          <Text style={styles.getStartedText}>GET STARTED</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Step-by-step grid
  const step = steps[stepIndex];
  return (
    <View style={{ flex: 1, backgroundColor: "#faf8ea" }}>
      <Header navigation={navigation} />
      <View style={styles.screenContent}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Step {stepIndex + 1} of {steps.length}</Text>
        </View>
        <Text style={styles.label}>{step.label}</Text>
        <FlatList
          data={step.items}
          numColumns={2}
          contentContainerStyle={styles.listContainer}
          keyExtractor={(_, i) => String(i)}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} onPress={() => handleSelect(item)}>
              <Image source={item.image} style={styles.image} />
              <Text style={styles.itemName}>{item.name}</Text>
              {item.desc && <Text style={styles.itemDesc}>{item.desc}</Text>}
            </TouchableOpacity>
          )}
        />
      </View>
      {/* Custom swipe-up panel */}
      <Animated.View
        style={[
          styles.bottomPanel,
          {
            height: panelHeight,
            transform: [
              {
                translateY: panelAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [panelHeight - 30, 0], // tab always visible
                }),
              },
            ],
          },
        ]}
        pointerEvents="box-none"
      >
        {/* Tab */}
        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.panelTab}
          onPress={togglePanel}
        >
          <View style={styles.panelTabBar}>
            <Text style={{ fontSize: 23, color: "#474554" }}>⌃</Text>
          </View>
        </TouchableOpacity>
        {/* Panel Content */}
        <KeyboardAvoidingView
          style={styles.panelContent}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <Text style={styles.summaryTitle}>Your Gift Box</Text>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {Object.keys(selected).length === 0 ? (
              <Text style={{
                color: "#bcb7ce",
                textAlign: "center",
                marginTop: 40,
                fontStyle: "italic",
                fontSize: 16,
              }}>
                No items selected yet.
              </Text>
            ) : allPicked && !showForm ? (
              <>
                {steps.map((s) =>
                  selected[s.key] ? (
                    <View key={s.key} style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>{s.label}:</Text>
                      <Text style={styles.summaryValue}>
                        {selected[s.key]?.name}
                      </Text>
                    </View>
                  ) : null
                )}
                <TouchableOpacity
                  style={styles.submitBtn}
                  onPress={() => setShowForm(true)}
                >
                  <Text style={styles.submitBtnText}>PROCEED TO ORDER</Text>
                </TouchableOpacity>
              </>
            ) : allPicked && showForm ? (
              <>
                <TextInput
                  style={styles.input}
                  placeholder="Full Name"
                  placeholderTextColor="#a49dbb"
                  value={form.name}
                  onChangeText={(v) => setForm({ ...form, name: v })}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Contact Number"
                  placeholderTextColor="#a49dbb"
                  value={form.contact}
                  onChangeText={(v) => setForm({ ...form, contact: v })}
                  keyboardType="phone-pad"
                />
                <TextInput
                  style={styles.input}
                  placeholder="Delivery Address"
                  placeholderTextColor="#a49dbb"
                  value={form.address}
                  onChangeText={(v) => setForm({ ...form, address: v })}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Expected Delivery Date"
                  placeholderTextColor="#a49dbb"
                  value={form.date}
                  onChangeText={(v) => setForm({ ...form, date: v })}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Estimated Budget"
                  placeholderTextColor="#a49dbb"
                  value={form.budget}
                  onChangeText={(v) => setForm({ ...form, budget: v })}
                  keyboardType="numeric"
                />
                <TouchableOpacity
                  style={styles.submitBtn}
                  onPress={() => {
                    if (
                      !form.name ||
                      !form.contact ||
                      !form.address ||
                      !form.date ||
                      !form.budget
                    ) {
                      setAlert({ visible: true, message: "Please fill out all fields!" });
                      return;
                    }
                    setAlert({ visible: true, message: "Order received!" });
                    setShowForm(false);
                    setForm({ name: "", contact: "", address: "", date: "", budget: "" });
                  }}
                >
                  <Text style={styles.submitBtnText}>SUBMIT ORDER</Text>
                </TouchableOpacity>
              </>
            ) : (
              steps.map((s) =>
                selected[s.key] ? (
                  <View key={s.key} style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>{s.label}:</Text>
                    <Text style={styles.summaryValue}>
                      {selected[s.key]?.name}
                    </Text>
                  </View>
                ) : null
              )
            )}
          </ScrollView>
        </KeyboardAvoidingView>
        <DoneAlert
          visible={alert.visible}
          message={alert.message}
          onDone={() => setAlert({ visible: false, message: "" })}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  introContainer: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "#faf8ea",
    paddingHorizontal: 10,
    justifyContent: "center",
  },
  stepsRow: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-around",
    marginVertical: 18,
    paddingHorizontal: 8,
  },
  introStep: {
    alignItems: "center",
    marginBottom: 18,
    minWidth: "28%",
    maxWidth: "32%",
    padding: 6,
  },
  introNum: {
    color: "#bcb7ce",
    fontSize: 22,
    fontWeight: "bold",
  },
  introText: {
    color: "#7d789b",
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 5,
    letterSpacing: 1,
  },
  getStartedBtn: {
    backgroundColor: "#7d789b",
    borderRadius: 6,
    paddingVertical: 12,
    paddingHorizontal: 38,
    marginTop: 40,
    alignSelf: "center",
  },
  getStartedText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
    letterSpacing: 1,
  },
  screenContent: {
    flex: 1,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
    marginBottom: 3,
  },
  title: {
    fontSize: 18,
    color: "#7d789b",
    fontWeight: "bold",
    letterSpacing: 1,
  },
  label: {
    fontSize: 20,
    color: "#7d789b",
    textAlign: "center",
    marginVertical: 16,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  listContainer: {
    paddingHorizontal: 18,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 10,
    margin: 10,
    alignItems: "center",
    flex: 1,
    elevation: 2,
    minWidth: width * 0.4,
    maxWidth: width * 0.44,
  },
  image: {
    width: width * 0.34,
    height: width * 0.23,
    borderRadius: 10,
    marginBottom: 8,
    backgroundColor: "#ddd",
    resizeMode: "cover",
  },
  itemName: {
    fontSize: 15,
    color: "#4c4867",
    fontWeight: "600",
    textAlign: "center",
  },
  itemDesc: {
    fontSize: 12,
    color: "#7d789b",
    textAlign: "center",
    fontStyle: "italic",
  },
  // --- Panel styles ---
  bottomPanel: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
    elevation: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.13,
    shadowRadius: 8,
    backgroundColor: "transparent",
  },
  panelTab: {
    alignItems: "center",
    marginBottom: -8,
    zIndex: 2,
  },
  panelTabBar: {
    backgroundColor: "#bcb7ce",
    width: 70,
    height: 30,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    marginBottom: 0,
  },
  panelContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 18,
    paddingTop: 18,
    flex: 1,
    minHeight: 60,
  },
  summaryTitle: {
    fontWeight: "bold",
    fontSize: 17,
    color: "#7d789b",
    textAlign: "center",
    marginBottom: 10,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  summaryLabel: {
    fontWeight: "600",
    color: "#4c4867",
    flex: 2,
    fontSize: 13,
  },
  summaryValue: {
    color: "#7d789b",
    fontWeight: "bold",
    marginLeft: 8,
    textAlign: "right",
    flex: 3,
    fontSize: 13,
  },
  input: {
    borderWidth: 1,
    borderColor: "#bcb7ce",
    borderRadius: 10,
    padding: 10,
    fontSize: 15,
    marginVertical: 7,
    color: "#3d3959",
    backgroundColor: "#f7f6fb",
  },
  submitBtn: {
    backgroundColor: "#7d789b",
    borderRadius: 8,
    marginTop: 15,
    alignItems: "center",
    paddingVertical: 12,
  },
  submitBtnText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
    letterSpacing: 1,
  },
});
