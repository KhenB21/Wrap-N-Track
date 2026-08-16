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
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Header from "../Components/Header";
import { useTheme } from "../Context/ThemeContext";
import { useAuth } from "../Context/AuthContext";
import { useInventory } from "../Context/InventoryContext";
import ProductGrid from "../Components/ProductGrid";
import Toast from "../Components/Toast";
import CustomAlert from "../Components/CustomAlert";
import DatePickerModal from "../Components/DatePickerModal";
import { orderAPI, inventoryAPI } from "../services/api";

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
  const { user } = useAuth();
  const {
    inventory,
    selectedProducts,
    loading,
    error,
    toggleProduct,
    loadInventory,
    addProduct,
    removeProduct,
    lastRealtimeEvent,
  } = useInventory();

  const [step, setStep] = useState(1);
  const [availableSkus, setAvailableSkus] = useState(null);

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Load the full inventory once on mount. Screens must trigger this
  // themselves — InventoryContext doesn't auto-fetch on mount — otherwise
  // every step shows an empty grid until a manual pull-to-refresh.
  useEffect(() => {
    loadInventory();
  }, []);

  // Only show products staff have marked available — same curated set the
  // Website's OrderProcess page and the mobile Catalog use, so "Create Mine"
  // never offers products staff haven't published for customers yet.
  const fetchAvailableSkus = async () => {
    try {
      const data = await inventoryAPI.getAvailableInventory();
      const skus = new Set(
        Object.values(data.available || {}).flat().map(p => p.sku)
      );
      setAvailableSkus(skus);
    } catch (err) {
      console.error("Error fetching available inventory:", err);
      setAvailableSkus(new Set());
    }
  };

  useEffect(() => {
    fetchAvailableSkus();
  }, []);

  // Staff clicking "Save Available Products" on the website broadcasts this
  // over the shared WS connection — refetch immediately instead of only
  // picking up the change on next app reload.
  useEffect(() => {
    if (lastRealtimeEvent?.type === 'available_inventory_updated') {
      fetchAvailableSkus();
    }
  }, [lastRealtimeEvent]);

  // Products for the current step, filtered locally from the already-loaded
  // full inventory. Filtering client-side (instead of round-tripping through
  // context dispatch + a useEffect keyed on `step`) avoids the one-frame lag
  // where the previous category's items were still visible after switching
  // steps.
  const currentStepMeta = GIFT_STEPS.find(s => s.id === step);
  const availableInventory = React.useMemo(() => {
    if (!availableSkus) return [];
    return inventory.filter(item => availableSkus.has(item.sku));
  }, [inventory, availableSkus]);
  const currentStepProducts = React.useMemo(() => {
    if (!currentStepMeta || !currentStepMeta.category) return availableInventory;
    return availableInventory.filter(item => item.category === currentStepMeta.category);
  }, [availableInventory, currentStepMeta?.category]);

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

  // Add "None" option to the current step's products for all steps except packaging
  const getInventoryWithNoneOption = () => {
    const shouldShowNone = currentStepMeta && currentStepMeta.category && step !== 1; // Skip packaging step

    if (shouldShowNone) {
      return [getNoneOption(), ...currentStepProducts];
    }
    return currentStepProducts;
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

  // Animate step change. Kept short so the Next/Back buttons feel immediate
  // rather than requiring a second tap while the fade is still mid-flight.
  const animateStepChange = (nextStep) => {
    setStep(nextStep);
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 180,
      useNativeDriver: true,
    }).start();
  };

  const colors = {
    bg: darkMode ? "#18191A" : "#fff",
    card: darkMode ? "#232323" : "#fff",
    text: darkMode ? "#F5F5F7" : "#111",
    secondaryText: darkMode ? "#B0B0B0" : "#6B6593",
    price: darkMode ? "#4CAF50" : "#27ae60",
    accent: darkMode ? "#444" : "#6B6593", // neutral gray for dark mode accent
    border: darkMode ? "#393A3B" : "#C7C5D1",
    box: darkMode ? "#232323" : "#F5F5F7",
    selected: darkMode ? "#333" : "#B6B3C6", // slightly lighter for selected
    inputBg: darkMode ? "#232323" : "#fff",
    inputBorder: darkMode ? "#393A3B" : "#C7C5D1",
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
          darkMode={darkMode}
          showQuantity={false}
          loading={loading || availableSkus === null}
          title={currentStep.title}
          emptyMessage={`No ${currentStep.category?.toLowerCase() || 'products'} available`}
          onRefresh={() => { loadInventory(); fetchAvailableSkus(); }}
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

  // Review Order step. Every selected product ships at the same quantity —
  // the "Number of Orders" set below — rather than a per-product stepper.
  const renderOrderSummary = () => {
    const orderQuantity = Math.max(1, parseInt(form.quantity, 10) || 1);
    const grandTotal = selectedBoxes.reduce((sum, item) => sum + item.price * orderQuantity, 0);

    const setOrderQuantity = (next) => {
      const clamped = Math.max(1, next);
      setForm((f) => ({ ...f, quantity: String(clamped) }));
      validateForm("quantity", String(clamped));
    };

    return (
      <Animated.View style={{ opacity: fadeAnim, width: "100%", flex: 1 }}>
        <Text style={[styles.stepTitle, { color: colors.text }]}>
          Review Your Order
        </Text>

        <ScrollView style={styles.orderSummary} showsVerticalScrollIndicator={false}>
          <View style={[styles.quantityCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.quantityCardLabel, { color: colors.text }]}>Number of Orders</Text>
              <Text style={[styles.quantityCardHint, { color: colors.secondaryText }]}>
                Applied to every selected product below
              </Text>
            </View>
            <View style={styles.quantityStepper}>
              <TouchableOpacity
                style={[styles.stepperButton, { backgroundColor: colors.accent }]}
                onPress={() => setOrderQuantity(orderQuantity - 1)}
              >
                <Text style={styles.stepperButtonText}>−</Text>
              </TouchableOpacity>
              <TextInput
                style={[styles.stepperInput, { color: colors.text, borderColor: colors.border }]}
                value={form.quantity}
                onChangeText={(v) => {
                  setForm((f) => ({ ...f, quantity: v.replace(/[^0-9]/g, "") }));
                  validateForm("quantity", v);
                }}
                keyboardType="numeric"
                textAlign="center"
              />
              <TouchableOpacity
                style={[styles.stepperButton, { backgroundColor: colors.accent }]}
                onPress={() => setOrderQuantity(orderQuantity + 1)}
              >
                <Text style={styles.stepperButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
          {formErrors.quantity ? (
            <Text style={{ color: "#ff4444", fontSize: 13, marginBottom: 12 }}>{formErrors.quantity}</Text>
          ) : null}

          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Selected Items ({selectedBoxes.length})
          </Text>

          {selectedBoxes.map((item) => (
            <View key={item.id} style={[styles.summaryItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Image source={item.image} style={styles.summaryImage} />
              <View style={styles.summaryDetails}>
                <Text style={[styles.summaryName, { color: colors.text }]} numberOfLines={2}>
                  {item.label}
                </Text>
                <Text style={[styles.summaryQuantity, { color: colors.secondaryText }]}>
                  ₱{item.price.toFixed(2)} × {orderQuantity}
                </Text>
              </View>
              <Text style={[styles.summaryTotal, { color: colors.price }]}>
                ₱{(item.price * orderQuantity).toFixed(2)}
              </Text>
            </View>
          ))}

          <View style={[styles.totalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.totalRow}>
              <Text style={[styles.totalRowLabel, { color: colors.secondaryText }]}>Items</Text>
              <Text style={[styles.totalRowValue, { color: colors.text }]}>{selectedBoxes.length}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={[styles.totalRowLabel, { color: colors.secondaryText }]}>Orders (each product)</Text>
              <Text style={[styles.totalRowValue, { color: colors.text }]}>{orderQuantity}</Text>
            </View>
            <View style={[styles.totalRow, styles.totalRowFinal, { borderTopColor: colors.border }]}>
              <Text style={[styles.totalLabel, { color: colors.text }]}>Total</Text>
              <Text style={[styles.totalLabel, { color: colors.price }]}>₱{grandTotal.toFixed(2)}</Text>
            </View>
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
            onPress={() => animateStepChange(10)}
          >
            <Text style={{ color: "#fff", textAlign: "center" }}>Continue</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  };

  // Get selected products for display. Quantity is uniform across products —
  // set in the Review Order step, not per product.
  const selectedBoxes = selectedProducts.map(product => ({
    id: product.sku,
    label: product.name,
    image: product.image_data ? { uri: `data:image/jpeg;base64,${product.image_data}` } : require("../Images/Item/Eric.png"),
    price: product.unit_price,
  }));

  // Name/email/contact come from the logged-in customer's account — no need
  // to ask again. Shipping location still defaults to the account address
  // but stays editable, since a gift order may ship somewhere else.
  const [form, setForm] = useState({
    quantity: "1",
    shippingLocation: user?.address || "",
    deliveryDate: "",
  });

  const [formErrors, setFormErrors] = useState({});

  const [alert, setAlert] = useState({ visible: false, message: "" });
  const [submitting, setSubmitting] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const showAlert = (msg) => setAlert({ visible: true, message: msg });
  const hideAlert = () => setAlert({ visible: false, message: "" });

  // Mirrors the website's custom-order flow (Website/client/src/Pages/CustomerPOV/OrderProcess.js
  // and BundleDetails.js OrderModal), which both POST to /api/orders with a `products` line-item
  // array — same backend endpoint, same payload shape, just built from the mobile step selections.
  const submitOrder = async () => {
    if (!validateForm()) return;
    if (selectedProducts.length === 0) {
      showAlert("Please select at least one product before submitting.");
      return;
    }

    setSubmitting(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const orderQuantity = Math.max(1, parseInt(form.quantity, 10) || 1);
      const products = selectedProducts.map((product) => ({
        sku: product.sku,
        quantity: orderQuantity,
      }));

      const order = await orderAPI.createOrder({
        account_name: user?.name || "",
        name: user?.name || "",
        shipped_to: user?.name || "",
        order_date: today,
        expected_delivery: form.deliveryDate || today,
        status: "Pending",
        package_name: "Custom Gift Box",
        payment_method: "Cash",
        payment_type: "Full Payment",
        shipping_address: form.shippingLocation.trim(),
        cellphone: user?.phone_number || "",
        email_address: user?.email || "",
        order_quantity: orderQuantity,
        products,
      });

      if (order?.success === false) {
        throw new Error(order.message || "Failed to submit order");
      }

      showAlert("Order submitted! We will contact you soon.");
      setTimeout(() => {
        hideAlert();
        navigation.navigate("CustomerTabs", { screen: "Home" });
      }, 2000);
    } catch (err) {
      console.error("Error submitting custom gift order:", err);
      showAlert(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Unable to submit your order. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const toggleSelect = (selectedArray, setSelectedArray, id) => {
    setSelectedArray((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const validateForm = (field, value) => {
    let errors = { ...formErrors };

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
              <View style={[styles.accountCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.accountCardTitle, { color: colors.text }]}>Ordering as</Text>
                <Text style={[styles.accountCardName, { color: colors.text }]}>{user?.name || "—"}</Text>
                <Text style={[styles.accountCardDetail, { color: colors.secondaryText }]}>{user?.email || "—"}</Text>
                <Text style={[styles.accountCardDetail, { color: colors.secondaryText }]}>{user?.phone_number || "—"}</Text>
                <TouchableOpacity onPress={() => navigation.navigate("CustomerTabs", { screen: "Profile" })}>
                  <Text style={styles.accountCardEdit}>Wrong details? Edit profile</Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={[styles.input, { color: colors.text, backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}
                placeholderTextColor={colors.secondaryText}
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
              <TouchableOpacity
                style={[
                  styles.input,
                  styles.dateInputButton,
                  { backgroundColor: colors.inputBg, borderColor: colors.inputBorder },
                ]}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={{ color: form.deliveryDate ? colors.text : colors.secondaryText, fontSize: 16 }}>
                  {form.deliveryDate || "Select delivery date"}
                </Text>
                <MaterialCommunityIcons name="calendar-outline" size={20} color={colors.secondaryText} />
              </TouchableOpacity>
              {formErrors.deliveryDate ? (
                <Text style={{ color: "red", fontSize: 13 }}>{formErrors.deliveryDate}</Text>
              ) : null}
              <DatePickerModal
                visible={showDatePicker}
                onClose={() => setShowDatePicker(false)}
                selectedDate={form.deliveryDate || null}
                onSelect={(iso) => {
                  setForm((f) => ({ ...f, deliveryDate: iso }));
                  validateForm("deliveryDate", iso);
                }}
                darkMode={darkMode}
              />
              <View style={[styles.contactCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.contactCardText, { color: colors.secondaryText }]}>
                  If you wish to add your own product, contact{' '}
                  <Text style={styles.contactCardEmail}>penseegiftingstudio@gmail.com</Text>
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.box, { backgroundColor: colors.accent, opacity: submitting ? 0.6 : 1 }]}
                onPress={submitOrder}
                disabled={submitting}
              >
                <Text style={{ color: "#fff", textAlign: "center" }}>
                  {submitting ? "Submitting…" : "Submit Order"}
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
          navigation.navigate("CustomerTabs", { screen: "Home" });
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
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    width: "100%",
  },
  dateInputButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  accountCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
  },
  accountCardTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  accountCardName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  accountCardDetail: {
    fontSize: 13,
    marginBottom: 2,
  },
  accountCardEdit: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B6593',
    marginTop: 8,
  },
  contactCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginVertical: 16,
  },
  contactCardText: {
    fontSize: 13,
    lineHeight: 19,
  },
  contactCardEmail: {
    fontWeight: '700',
    color: '#6B6593',
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
    padding: 14,
    marginBottom: 10,
    borderRadius: 14,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  summaryImage: {
    width: 56,
    height: 56,
    borderRadius: 10,
    marginRight: 14,
    backgroundColor: '#EDECF3',
  },
  summaryDetails: {
    flex: 1,
  },
  summaryName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  summaryQuantity: {
    fontSize: 13,
  },
  summaryTotal: {
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 8,
  },
  quantityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  quantityCardLabel: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  quantityCardHint: {
    fontSize: 12,
  },
  quantityStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepperButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 20,
  },
  stepperInput: {
    width: 48,
    height: 36,
    borderWidth: 1,
    borderRadius: 8,
    fontSize: 16,
    fontWeight: '700',
  },
  totalCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginTop: 8,
    marginBottom: 24,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  totalRowLabel: {
    fontSize: 13,
  },
  totalRowValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  totalRowFinal: {
    borderTopWidth: 1,
    marginTop: 4,
    paddingTop: 12,
    marginBottom: 0,
  },
  totalLabel: {
    fontSize: 20,
    fontWeight: '700',
  },
});
