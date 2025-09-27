import React, { useState, useRef, useEffect } from "react";
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
  RefreshControl,
} from "react-native";
import Header from "../Components/Header";
import { useTheme } from "../Context/ThemeContext";
import { useInventory } from "../Context/InventoryContext";
import ProductGrid from "../Components/ProductGrid";
import Toast from "../Components/Toast";
import CustomAlert from "../Components/CustomAlert";
import * as ImagePicker from "expo-image-picker";

const { width, height } = Dimensions.get("window");

// Step configuration for the gift creation process
const GIFT_STEPS = [
  { id: 1, title: "Choose your Packaging", category: "Office Supplies" },
  { id: 2, title: "Choose your Beverage(s)", category: "Beverages" },
  { id: 3, title: "Choose your Food", category: "Food" },
  { id: 4, title: "Choose your Kitchenware", category: "Kitchenware" },
  { id: 5, title: "Choose your Home Decor", category: "Home Decor" },
  { id: 6, title: "Choose your Face & Body", category: "Face & Body" },
  { id: 7, title: "Choose your Clothing & Accessories", category: "Clothing & Accessories" },
  { id: 8, title: "Choose your Customization Items", category: "Customization" },
  { id: 9, title: "Choose your Electronics", category: "Electronics" },
  { id: 10, title: "Choose your Cosmetics", category: "Cosmetics" },
  { id: 11, title: "Choose your Health & Wellness", category: "Health & Wellness" },
  { id: 12, title: "Complete Your Order", category: null },
];

export default function CreateGiftScreen({ navigation }) {
  const { darkMode } = useTheme();
  const { 
    filteredInventory, 
    selectedProducts, 
    quantities,
    loading, 
    error,
    toggleProduct, 
    updateQuantity,
    setCategoryFilter,
    loadInventory,
    getTotalSelectedItems,
    getTotalPrice,
    addProduct,
    removeProduct
  } = useInventory();
  
  const [step, setStep] = useState(1);
  const [customProduct, setCustomProduct] = useState({ name: "", image: null });

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Filter inventory by category when step changes
  useEffect(() => {
    const currentStep = GIFT_STEPS.find(s => s.id === step);
    if (currentStep && currentStep.category) {
      setCategoryFilter(currentStep.category);
    } else {
      setCategoryFilter(null);
    }
  }, [step]); // Remove setCategoryFilter from dependencies to prevent infinite loop

  // Debug: Log inventory state changes
  useEffect(() => {
    console.log('Inventory state changed:', {
      loading,
      error,
      inventoryCount: filteredInventory.length,
      selectedCount: selectedProducts.length
    });
  }, [loading, error, filteredInventory.length, selectedProducts.length]);

  // Create "None" option for all steps except packaging (step 1)
  const getNoneOption = () => ({
    sku: 'NONE_OPTION',
    name: 'None',
    description: 'Skip this category',
    quantity: 1,
    unit_price: 0,
    category: 'None',
    image_data: null,
    isNoneOption: true
  });

  // Add "None" option to filtered inventory for all steps except packaging
  const getInventoryWithNoneOption = () => {
    const currentStep = GIFT_STEPS.find(s => s.id === step);
    const shouldShowNone = currentStep && currentStep.category && step !== 1; // Skip packaging step
    
    if (shouldShowNone) {
      return [getNoneOption(), ...filteredInventory];
    }
    return filteredInventory;
  };

  // Custom toggle function to handle "None" option
  const handleProductToggle = (product) => {
    if (product.isNoneOption) {
      // If "None" is selected, just clear all products from current category
      // Don't add "None" to selected products - it's just a skip option
      const currentStep = GIFT_STEPS.find(s => s.id === step);
      if (currentStep && currentStep.category) {
        // Remove all products from the current category
        const productsToRemove = selectedProducts.filter(p => p.category === currentStep.category);
        productsToRemove.forEach(p => removeProduct(p.sku));
      }
    } else {
      // Normal product toggle
      toggleProduct(product);
    }
  };

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

  // Render product selection step
  const renderProductStep = (stepNumber) => {
    const currentStep = GIFT_STEPS.find(s => s.id === stepNumber);
    if (!currentStep) return null;

    return (
      <Animated.View style={{ opacity: fadeAnim, width: "100%", flex: 1 }}>
        <Text style={[styles.stepTitle, { color: colors.text }]}>
          {currentStep.title}
        </Text>
        
        {error && (
          <View style={styles.errorContainer}>
            <Text style={[styles.errorText, { color: '#ff4444' }]}>
              {error}
            </Text>
            <Text style={[styles.errorText, { color: '#ff4444', fontSize: 12, marginTop: 4 }]}>
              Check if server is running on localhost:3001
            </Text>
            <TouchableOpacity
              style={[styles.retryButton, { backgroundColor: colors.accent }]}
              onPress={loadInventory}
            >
              <Text style={{ color: '#fff', textAlign: 'center' }}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        <ProductGrid
          products={getInventoryWithNoneOption()}
          onProductSelect={handleProductToggle}
          selectedProducts={selectedProducts}
          quantities={quantities}
          onQuantityChange={updateQuantity}
          darkMode={darkMode}
          showQuantity={true}
          loading={loading}
          title={currentStep.title}
          emptyMessage={`No ${currentStep.category?.toLowerCase() || 'products'} available`}
          onRefresh={loadInventory}
          currentCategory={currentStep.category}
        />

        <View style={styles.navigationButtons}>
          <TouchableOpacity
            style={[
              styles.navButton,
              { backgroundColor: colors.accent, flex: 1, marginRight: 8 },
            ]}
            onPress={() => animateStepChange(stepNumber - 1)}
            disabled={stepNumber <= 1}
          >
            <Text style={{ color: "#fff", textAlign: "center" }}>Back</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.navButton,
              {
                backgroundColor: selectedProducts.length > 0 ? colors.accent : "#ccc",
                flex: 1,
                marginLeft: 8,
              },
            ]}
            onPress={() => selectedProducts.length > 0 && animateStepChange(stepNumber + 1)}
            disabled={selectedProducts.length === 0}
          >
            <Text style={{ color: "#fff", textAlign: "center" }}>
              {stepNumber === 8 ? "Review Order" : "Next"}
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  };

  // Render order summary step
  const renderOrderSummary = () => (
    <Animated.View style={{ opacity: fadeAnim, width: "100%", flex: 1 }}>
      <Text style={[styles.stepTitle, { color: colors.text }]}>
        Review Your Order
      </Text>
      
      <ScrollView style={styles.orderSummary}>
        <View style={styles.summarySection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Selected Items ({getTotalSelectedItems()})
          </Text>
          {selectedBoxes.map((item, index) => (
            <View key={item.id} style={[styles.summaryItem, { backgroundColor: colors.card }]}>
              <Image source={item.image} style={styles.summaryImage} />
              <View style={styles.summaryDetails}>
                <Text style={[styles.summaryName, { color: colors.text }]}>
                  {item.label}
                </Text>
                <Text style={[styles.summaryQuantity, { color: colors.secondaryText }]}>
                  Quantity: {item.quantity}
                </Text>
                <Text style={[styles.summaryPrice, { color: colors.price }]}>
                  ₱{item.price} each
                </Text>
              </View>
              <Text style={[styles.summaryTotal, { color: colors.price }]}>
                ₱{(item.price * item.quantity).toFixed(2)}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.totalSection}>
          <Text style={[styles.totalLabel, { color: colors.text }]}>
            Total: ₱{getTotalPrice().toFixed(2)}
          </Text>
        </View>
      </ScrollView>

      <View style={styles.navigationButtons}>
        <TouchableOpacity
          style={[
            styles.navButton,
            { backgroundColor: colors.accent, flex: 1, marginRight: 8 },
          ]}
          onPress={() => animateStepChange(8)}
        >
          <Text style={{ color: "#fff", textAlign: "center" }}>Back</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.navButton,
            { backgroundColor: colors.accent, flex: 1, marginLeft: 8 },
          ]}
          onPress={() => animateStepChange(9)}
        >
          <Text style={{ color: "#fff", textAlign: "center" }}>Continue</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  // Get selected products for display
  const selectedBoxes = selectedProducts.map(product => ({
    id: product.sku,
    label: product.name,
    image: product.image_data ? { uri: `data:image/jpeg;base64,${product.image_data}` } : require("../Images/Item/Eric.png"),
    quantity: quantities[product.sku] || 1,
    price: product.unit_price,
  }));

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
      <View style={styles.container}>
        {step >= 1 && step <= 8 ? (
          renderProductStep(step)
        ) : step === 9 ? (
          renderOrderSummary()
        ) : step === 10 ? (
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
      </View>
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
  container: {
    flex: 1,
  },
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
  // New styles for inventory integration
  errorContainer: {
    padding: 16,
    marginBottom: 16,
    borderRadius: 8,
    backgroundColor: '#ffebee',
    borderWidth: 1,
    borderColor: '#ffcdd2',
  },
  errorText: {
    fontSize: 14,
    marginBottom: 8,
    textAlign: 'center',
  },
  retryButton: {
    padding: 8,
    borderRadius: 4,
  },
  navigationButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
    paddingHorizontal: 16,
  },
  navButton: {
    borderRadius: 8,
    padding: 12,
    elevation: 2,
  },
  orderSummary: {
    flex: 1,
    padding: 16,
  },
  summarySection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
    elevation: 1,
  },
  summaryImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  summaryDetails: {
    flex: 1,
  },
  summaryName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  summaryQuantity: {
    fontSize: 14,
    marginBottom: 2,
  },
  summaryPrice: {
    fontSize: 14,
    fontWeight: '600',
  },
  summaryTotal: {
    fontSize: 16,
    fontWeight: '700',
  },
  totalSection: {
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingTop: 16,
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 20,
    fontWeight: '700',
  },
});
