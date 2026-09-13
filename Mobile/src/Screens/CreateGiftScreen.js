import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  RefreshControl,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Header from "../Components/Header";
import Toast from "../Components/Toast";
import DatePickerModal from "../Components/DatePickerModal";
import ProductImage from "../Components/ProductImage";
import { SkeletonProductCard } from "../Components/Skeleton/Skeleton";
import { useTheme } from "../Context/ThemeContext";
import { useAuth } from "../Context/AuthContext";
import { useInventory } from "../Context/InventoryContext";
import { orderAPI, inventoryAPI, otpAPI } from "../services/api";
import {
  CATEGORIES,
  PACKAGING_KEY,
  STYLE_OPTIONS,
  STYLE_OTHERS,
  STYLE_OTHERS_NOTICE,
  MIN_LEAD_DAYS,
  RECOMMENDED_LEAD_DAYS,
  SERIF,
  peso,
  getBoutiqueColors,
} from "../constants/boutique";

/* Mobile version of the Website order page (Website/client/src/Pages/CustomerPOV/OrderBoutique.js):
   every published product on one page grouped by category, a basket dock, then order
   details and an email OTP before POST /api/orders — same rules and the same payload.
   Order rules: exactly one box (Packaging is single-select) and at least one item inside. */

const { width } = Dimensions.get("window");
const H_PAD = 16;
const GRID_GAP = 12;
const CARD_WIDTH = (width - H_PAD * 2 - GRID_GAP) / 2;
const BOTTOM_PAD = Platform.OS === "ios" ? 28 : 14;

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};
const addDays = (date, days) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};
const formatDate = (iso) => (iso ? new Date(`${iso}T00:00:00`).toDateString().slice(4) : "");

// Same date rules as the Website order page.
const validateOrderDates = (weddingDateStr, deliveryDateStr) => {
  const errors = { weddingDate: "", expectedDeliveryDate: "" };
  let warning = "";
  const today = startOfToday();

  if (weddingDateStr) {
    const wedding = new Date(`${weddingDateStr}T00:00:00`);
    const daysToWedding = Math.round((wedding - today) / MS_PER_DAY);
    if (daysToWedding < 0) {
      errors.weddingDate = "The wedding date cannot be in the past.";
    } else if (daysToWedding < MIN_LEAD_DAYS) {
      errors.weddingDate = `We need at least ${MIN_LEAD_DAYS} days to prepare. Please choose a later date.`;
    } else if (daysToWedding < RECOMMENDED_LEAD_DAYS) {
      warning = `${daysToWedding} days is tight — ${RECOMMENDED_LEAD_DAYS} days or more gives us room for customisation.`;
    }
  }

  if (deliveryDateStr) {
    const delivery = new Date(`${deliveryDateStr}T00:00:00`);
    const daysToDelivery = Math.round((delivery - today) / MS_PER_DAY);
    if (daysToDelivery < 0) {
      errors.expectedDeliveryDate = "The delivery date cannot be in the past.";
    } else if (weddingDateStr && !errors.weddingDate) {
      if (delivery > new Date(`${weddingDateStr}T00:00:00`)) {
        errors.expectedDeliveryDate = "Delivery must be on or before the wedding date.";
      }
    }
  }

  return { errors, warning };
};

const EMPTY_FORM = { weddingDate: "", expectedDeliveryDate: "", guestCount: "", style: "", specialRequests: "" };

/* The whole card opens the detail sheet; the basket button is its own touchable,
   so adding never also opens details. */
function ProductCard({ product, inBasket, singleChoice, colors: c, onOpen, onToggle }) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => onOpen(product)}
      style={[
        styles.card,
        { backgroundColor: c.surface, borderColor: inBasket ? c.accent : c.borderSoft },
      ]}
    >
      <View>
        <ProductImage sku={product.sku} version={product.imageVersion} style={styles.cardImage} colors={c} />
        <View style={[styles.cardTag, { backgroundColor: c.tagBg }]}>
          <Text style={[styles.cardTagText, { color: c.textSoft }]} numberOfLines={1}>
            {product.categoryLabel}
          </Text>
        </View>
        {inBasket && (
          <View style={[styles.cardCheck, { backgroundColor: c.accent }]}>
            <MaterialCommunityIcons name="check" size={14} color="#fff" />
          </View>
        )}
      </View>

      <View style={styles.cardBody}>
        <Text style={[styles.cardName, { color: c.text }]} numberOfLines={2}>
          {product.name}
        </Text>
        <Text style={[styles.cardDesc, { color: c.textMute }]} numberOfLines={2}>
          {product.description || "Tap for full details."}
        </Text>
        <View style={styles.cardPriceRow}>
          <Text style={[styles.price, { color: c.text }]}>{peso(product.price)}</Text>
          <Text style={[styles.perBox, { color: c.textMute }]}> per box</Text>
        </View>
        <TouchableOpacity
          onPress={() => onToggle(product)}
          style={[
            styles.addBtn,
            inBasket
              ? { backgroundColor: "transparent", borderColor: c.accent }
              : { backgroundColor: c.accent, borderColor: c.accent },
          ]}
        >
          <Text style={[styles.addBtnText, { color: inBasket ? c.accentText : "#fff" }]}>
            {inBasket ? "Remove" : singleChoice ? "Choose this box" : "Add to basket"}
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

export default function CreateGiftScreen({ navigation }) {
  const { darkMode } = useTheme();
  const c = getBoutiqueColors(darkMode);
  const { user } = useAuth();
  const { inventory, loading: inventoryLoading, loadInventory, lastRealtimeEvent } = useInventory();

  // Catalogue
  const [availableSkus, setAvailableSkus] = useState(null); // { categoryKey: [sku] }
  const [refreshing, setRefreshing] = useState(false);

  // Basket — a Map of sku -> product, so ordering is stable and lookups cheap
  const [basket, setBasket] = useState(() => new Map());

  // Order details
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [address, setAddress] = useState(user?.address || "");
  const [dateErrors, setDateErrors] = useState({ weddingDate: "", expectedDeliveryDate: "" });
  const [dateWarning, setDateWarning] = useState("");
  const [formError, setFormError] = useState("");
  const [datePickerField, setDatePickerField] = useState(null);

  // Bottom sheets: basket | detail | checkout | otp | placed
  const [sheet, setSheet] = useState(null);
  const [detailProduct, setDetailProduct] = useState(null);

  // OTP
  const [otpCode, setOtpCode] = useState("");
  const [otpError, setOtpError] = useState("");
  const [resendCountdown, setResendCountdown] = useState(0);
  const [pendingOrderPayload, setPendingOrderPayload] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [toast, setToast] = useState({ visible: false, message: "", id: 0 });
  const showToast = (message) => setToast({ visible: true, message, id: Date.now() });

  // Category rail + scroll-spy
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0].key);
  const activeRef = useRef(CATEGORIES[0].key);
  const scrollRef = useRef(null);
  const railRef = useRef(null);
  const railHeight = useRef(0);
  const contentY = useRef(0);
  const sectionOffsets = useRef({});
  const chipOffsets = useRef({});

  const customerEmail = user?.email || user?.email_address || "";

  useEffect(() => {
    if (!address && user?.address) setAddress(user.address);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.address]);

  /* ── Load the catalogue ─────────────────────────────────────────────── */
  const fetchAvailableSkus = useCallback(async () => {
    try {
      const data = await inventoryAPI.getAvailableInventory();
      const available = data?.available || {};
      const skus = {};
      CATEGORIES.forEach(({ key }) => {
        skus[key] = (available[key] || []).map((p) => String(p.sku));
      });
      setAvailableSkus(skus);
    } catch (err) {
      console.error("Failed to load the product catalogue", err);
      setAvailableSkus({});
      showToast("We could not load the catalogue just now. Pull down to retry.");
    }
  }, []);

  useEffect(() => {
    loadInventory();
    fetchAvailableSkus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Staff saving available products on the Website broadcasts this over WS.
  useEffect(() => {
    if (lastRealtimeEvent?.type === "available_inventory_updated") fetchAvailableSkus();
  }, [lastRealtimeEvent, fetchAvailableSkus]);

  useEffect(() => {
    if (resendCountdown <= 0) return undefined;
    const timer = setTimeout(() => setResendCountdown((prev) => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCountdown]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([loadInventory(), fetchAvailableSkus()]);
    } finally {
      setRefreshing(false);
    }
  };

  /* ── Shape the catalogue into per-category product lists ────────────── */
  const catalogue = useMemo(() => {
    const bySku = new Map((inventory || []).map((p) => [String(p.sku), p]));
    return CATEGORIES.map((cat) => ({
      ...cat,
      products: ((availableSkus && availableSkus[cat.key]) || [])
        .map((sku) => {
          const product = bySku.get(String(sku));
          if (!product) return null;
          return {
            sku: product.sku,
            name: product.name,
            description: product.description || "",
            price: product.unit_price ?? product.price ?? product.selling_price ?? 0,
            imageVersion: product.updated_at || product.last_updated || null,
            categoryKey: cat.key,
            categoryLabel: cat.label,
          };
        })
        .filter(Boolean),
    }));
  }, [inventory, availableSkus]);

  const visibleCategories = useMemo(() => catalogue.filter((cat) => cat.products.length > 0), [catalogue]);
  const catalogueLoading = availableSkus === null || (inventoryLoading && !(inventory || []).length);

  /* ── Basket ──────────────────────────────────────────────────────────── */
  const basketItems = useMemo(() => Array.from(basket.values()), [basket]);

  const toggleItem = (product) => {
    const key = String(product.sku);
    const next = new Map(basket);

    if (next.has(key)) {
      next.delete(key);
      setBasket(next);
      return;
    }

    // One box per order: a second container replaces the first instead of stacking.
    const isBox = product.categoryKey === PACKAGING_KEY;
    const replaced = isBox ? basketItems.find((item) => item.categoryKey === PACKAGING_KEY) : null;
    if (replaced) next.delete(String(replaced.sku));
    next.set(key, product);
    setBasket(next);

    if (replaced) showToast(`Swapped ${replaced.name} for ${product.name} — one box per order.`);
  };

  const removeItem = (sku) => {
    const next = new Map(basket);
    next.delete(String(sku));
    setBasket(next);
  };

  const guestQty = Math.max(1, parseInt(formData.guestCount, 10) || 1);
  const perBoxTotal = basketItems.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
  const estimatedTotal = perBoxTotal * guestQty;

  const chosenBox = basketItems.find((i) => i.categoryKey === PACKAGING_KEY) || null;
  const contentCount = basketItems.filter((i) => i.categoryKey !== PACKAGING_KEY).length;

  // One source of truth for "can this order be placed?" — dock, basket and submit agree.
  const readiness = useMemo(() => {
    if (!chosenBox) return { ok: false, reason: "Choose a box to continue", detail: "Every order starts with one box from Packaging." };
    if (contentCount < 1) return { ok: false, reason: "Add at least one item", detail: "Your box needs at least one thing inside it." };
    return { ok: true, reason: "Continue to order details", detail: "" };
  }, [chosenBox, contentCount]);

  const handleFieldChange = (name, value) => {
    setFormError("");
    const updated = { ...formData, [name]: value };
    setFormData(updated);
    if (name === "weddingDate" || name === "expectedDeliveryDate") {
      const { errors, warning } = validateOrderDates(updated.weddingDate, updated.expectedDeliveryDate);
      setDateErrors(errors);
      setDateWarning(warning);
    }
  };

  /* ── Rail navigation ─────────────────────────────────────────────────── */
  const jumpToCategory = (key) => {
    activeRef.current = key;
    setActiveCategory(key);
    const top = contentY.current + (sectionOffsets.current[key] || 0) - railHeight.current;
    scrollRef.current?.scrollTo({ y: Math.max(0, top), animated: true });
  };

  const handleScroll = (e) => {
    const y = e.nativeEvent.contentOffset.y + railHeight.current + 24;
    let current = visibleCategories[0]?.key;
    visibleCategories.forEach((cat) => {
      const top = sectionOffsets.current[cat.key];
      if (top != null && contentY.current + top <= y) current = cat.key;
    });
    if (current && current !== activeRef.current) {
      activeRef.current = current;
      setActiveCategory(current);
    }
  };

  useEffect(() => {
    const x = chipOffsets.current[activeCategory];
    if (x != null) railRef.current?.scrollTo({ x: Math.max(0, x - H_PAD), animated: true });
  }, [activeCategory]);

  /* ── Sheets ──────────────────────────────────────────────────────────── */
  const openDetail = (product) => {
    setDetailProduct(product);
    setSheet("detail");
  };

  const goToOrders = () => {
    setSheet(null);
    navigation.navigate("CustomerTabs", { screen: "Orders" });
  };

  const closeSheet = () => {
    // The OTP step is only left through its Cancel button, as on the Website.
    if (sheet === "otp" || submitting) return;
    if (sheet === "placed") {
      goToOrders();
      return;
    }
    setSheet(null);
  };

  /* ── OTP + order placement ───────────────────────────────────────────── */
  const sendOtp = async () => {
    try {
      await otpAPI.sendOtp(customerEmail);
      setResendCountdown(30);
      setOtpError("");
      return true;
    } catch (err) {
      const status = err.response?.status;
      const message = err.response?.data?.message;
      if (status === 429) setOtpError(message || "Please wait before requesting another code.");
      else if (status === 400) setOtpError(message || "Unable to send the code. Please check your email.");
      else setOtpError("Failed to send the code. Use Resend, or check your email.");
      return false;
    }
  };

  const handlePlaceOrder = async () => {
    setFormError("");
    const { errors, warning } = validateOrderDates(formData.weddingDate, formData.expectedDeliveryDate);
    setDateErrors(errors);
    setDateWarning(warning);

    if (!formData.weddingDate) {
      setDateErrors((prev) => ({ ...prev, weddingDate: "Please choose your wedding date." }));
      return;
    }
    if (!formData.expectedDeliveryDate) {
      setDateErrors((prev) => ({ ...prev, expectedDeliveryDate: "Please choose a delivery date." }));
      return;
    }
    if (errors.weddingDate || errors.expectedDeliveryDate) return;

    const quantity = parseInt(formData.guestCount, 10);
    if (!quantity || quantity < 1) {
      setFormError("Please enter how many boxes you need.");
      return;
    }

    if (!user) {
      setSheet(null);
      Alert.alert("Log in required", "Please log in to place your order.", [
        { text: "Cancel", style: "cancel" },
        { text: "Log in", onPress: () => navigation.navigate("Login") },
      ]);
      return;
    }

    // Re-check the rules here too: the basket can change while this sheet is open.
    if (!readiness.ok) {
      setFormError(readiness.detail || readiness.reason);
      return;
    }

    const productsForOrder = basketItems
      .filter((item) => item.sku)
      .map((item) => ({ name: item.name, quantity, sku: item.sku }));
    if (!productsForOrder.length) {
      setFormError("Your basket is empty. Add a few items first.");
      return;
    }
    if (!address.trim()) {
      setFormError("Please enter your delivery address.");
      return;
    }
    if (!customerEmail) {
      setFormError("No email on this account. Please update your profile.");
      return;
    }

    // Same payload as the Website order page.
    const orderPayload = {
      name: user.name || "Customer Order",
      account_name: user.name || "Customer Account",
      order_date: new Date().toISOString().split("T")[0],
      expected_delivery: formData.expectedDeliveryDate,
      status: "Pending",
      payment_type: "Pending",
      payment_method: "Pending",
      shipped_to: user.name || "Customer",
      shipping_address: address.trim(),
      total_cost: 0,
      remarks: formData.specialRequests || "",
      telephone: user.telephone || user.phone_number || "N/A",
      cellphone: user.cellphone || user.phone_number || "N/A",
      email_address: customerEmail,
      order_quantity: quantity,
      package_name: formData.style || "Handpick",
      products: productsForOrder,
    };

    setPendingOrderPayload(orderPayload);
    setOtpCode("");
    setOtpError("");
    setSheet("otp");

    setSubmitting(true);
    if (await sendOtp()) showToast("We sent a confirmation code to your email.");
    setSubmitting(false);
  };

  const handleResendOtp = async () => {
    if (resendCountdown > 0 || submitting) return;
    setSubmitting(true);
    if (await sendOtp()) showToast("Code resent to your email.");
    setSubmitting(false);
  };

  const cancelOtp = () => {
    setOtpCode("");
    setOtpError("");
    setPendingOrderPayload(null);
    setSheet("checkout");
  };

  const handleVerifyAndPlaceOrder = async () => {
    setOtpError("");
    if (!pendingOrderPayload) {
      setOtpError("No pending order found.");
      return;
    }
    if (!otpCode || otpCode.trim().length < 6) {
      setOtpError("Please enter the 6-digit code.");
      return;
    }

    setSubmitting(true);
    try {
      try {
        await otpAPI.verifyOtp(customerEmail, otpCode.trim());
      } catch (err) {
        const status = err.response?.status;
        const message = err.response?.data?.message;
        if (status === 400) setOtpError(message || "Invalid or expired code.");
        else if (status === 429) setOtpError(message || "Too many attempts. Request a new code.");
        else setOtpError("Server error verifying the code.");
        return;
      }

      try {
        await otpAPI.markVerified();
      } catch (markErr) {
        console.warn("[ORDER] Could not persist verified status (order still proceeds):", markErr);
      }

      try {
        const response = await orderAPI.createOrder(pendingOrderPayload);
        if (response?.success === false) throw new Error(response.message || "Failed to place order");
      } catch (orderErr) {
        const status = orderErr.response?.status;
        const backendMessage = orderErr.response?.data?.error || orderErr.response?.data?.message;
        setOtpError(
          status === 400
            ? backendMessage || "Order data invalid. Please review your selections."
            : status === 401
            ? "Authorisation failed. Please log in again."
            : "Server error placing the order. Please try again."
        );
        return;
      }

      const choseOthers = pendingOrderPayload.package_name === STYLE_OTHERS;
      setPendingOrderPayload(null);
      setOtpCode("");
      setBasket(new Map());
      setFormData(EMPTY_FORM);
      setDateErrors({ weddingDate: "", expectedDeliveryDate: "" });
      setDateWarning("");

      // A customer who chose "Others" is owed a heads-up that a stylist will reach out.
      if (choseOthers) {
        setSheet("placed");
        return;
      }
      setSheet(null);
      Alert.alert("Order placed", "Order placed successfully. You can follow it under Deliveries.", [
        { text: "View my order", onPress: goToOrders },
      ]);
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Render helpers ──────────────────────────────────────────────────── */
  const renderSheetHead = (title, subtitle, closable) => (
    <View style={styles.sheetHead}>
      <Text style={[styles.sheetTitle, { color: c.text }]}>{title}</Text>
      {!!subtitle && <Text style={[styles.sheetSubtitle, { color: c.textSoft }]}>{subtitle}</Text>}
      {closable && (
        <TouchableOpacity style={[styles.sheetClose, { backgroundColor: c.wash }]} onPress={closeSheet} accessibilityLabel="Close">
          <MaterialCommunityIcons name="close" size={18} color={c.textSoft} />
        </TouchableOpacity>
      )}
    </View>
  );

  const renderRules = () => (
    <View style={styles.rules}>
      {[
        { met: !!chosenBox, text: chosenBox ? `Box: ${chosenBox.name}` : "One box from Packaging" },
        {
          met: contentCount >= 1,
          text: contentCount >= 1 ? `${contentCount} item${contentCount === 1 ? "" : "s"} inside` : "At least one item inside",
        },
      ].map((rule) => (
        <View key={rule.text} style={styles.ruleRow}>
          <MaterialCommunityIcons
            name={rule.met ? "check-circle" : "circle-outline"}
            size={16}
            color={rule.met ? c.success : c.textMute}
          />
          <Text style={[styles.ruleText, { color: rule.met ? c.success : c.textSoft, fontWeight: rule.met ? "600" : "400" }]}>
            {rule.text}
          </Text>
        </View>
      ))}
    </View>
  );

  const renderBasketSheet = () => (
    <>
      {renderSheetHead("Your Basket", `${basketItems.length} ${basketItems.length === 1 ? "item" : "items"} in your basket`, true)}
      <ScrollView style={styles.sheetBody} contentContainerStyle={styles.sheetBodyContent} keyboardShouldPersistTaps="handled">
        {basketItems.length === 0 ? (
          <View style={styles.basketEmpty}>
            <MaterialCommunityIcons name="basket-outline" size={40} color={c.textMute} />
            <Text style={[styles.basketEmptyText, { color: c.textMute }]}>
              Nothing here yet.{"\n"}Add pieces from the collection and they will gather here.
            </Text>
          </View>
        ) : (
          basketItems.map((item) => (
            <View key={item.sku} style={[styles.basketItem, { borderBottomColor: c.borderSoft }]}>
              <ProductImage
                sku={item.sku}
                version={item.imageVersion}
                style={styles.basketThumb}
                colors={c}
                iconSize={18}
                showLabel={false}
              />
              <View style={styles.basketText}>
                <Text style={[styles.basketName, { color: c.text }]} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={[styles.basketMeta, { color: c.textMute }]}>
                  {item.categoryLabel} · {peso(item.price)}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.iconBtn, { backgroundColor: c.wash }]}
                onPress={() => removeItem(item.sku)}
                accessibilityLabel={`Remove ${item.name} from your basket`}
              >
                <MaterialCommunityIcons name="close" size={16} color={c.textSoft} />
              </TouchableOpacity>
            </View>
          ))
        )}

        <View style={[styles.basketFoot, { borderTopColor: c.border }]}>
          <View style={styles.guestRow}>
            <Text style={[styles.fieldLabel, { color: c.text, marginBottom: 0 }]}>How many boxes?</Text>
            <TextInput
              style={[styles.guestInput, { color: c.text, borderColor: c.border, backgroundColor: c.bg }]}
              value={formData.guestCount}
              onChangeText={(v) => handleFieldChange("guestCount", v.replace(/[^0-9]/g, ""))}
              keyboardType="number-pad"
              placeholder="50"
              placeholderTextColor={c.textMute}
              maxLength={5}
            />
          </View>
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { color: c.textSoft }]}>Estimated total</Text>
            <Text style={[styles.totalValue, { color: c.text }]}>{peso(estimatedTotal)}</Text>
          </View>
          <Text style={[styles.totalNote, { color: c.textMute }]}>
            {peso(perBoxTotal)} per box × {guestQty}. An estimate only — our team confirms the final quotation,
            including packing and delivery.
          </Text>
          {renderRules()}
        </View>
      </ScrollView>
      <View style={[styles.sheetFoot, { borderTopColor: c.border }]}>
        <TouchableOpacity
          style={[styles.cta, { backgroundColor: c.accent, flex: 1 }, !readiness.ok && styles.ctaDisabled]}
          disabled={!readiness.ok}
          onPress={() => setSheet("checkout")}
        >
          <Text style={styles.ctaText}>{readiness.reason}</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  const renderDetailSheet = () => {
    const p = detailProduct;
    if (!p) return null;
    const inBasket = basket.has(String(p.sku));
    return (
      <>
        <ScrollView style={styles.sheetBody} contentContainerStyle={{ paddingBottom: 16 }}>
          <ProductImage sku={p.sku} version={p.imageVersion} style={styles.detailImage} colors={c} iconSize={36} />
          <TouchableOpacity style={[styles.detailClose, { backgroundColor: c.surface }]} onPress={closeSheet} accessibilityLabel="Close details">
            <MaterialCommunityIcons name="close" size={18} color={c.text} />
          </TouchableOpacity>
          <View style={styles.detailBody}>
            <Text style={[styles.eyebrow, { color: c.accentText }]}>{p.categoryLabel.toUpperCase()}</Text>
            <Text style={[styles.detailTitle, { color: c.text }]}>{p.name}</Text>
            <Text style={[styles.detailPrice, { color: c.text }]}>
              {peso(p.price)} <Text style={[styles.perBox, { color: c.textMute }]}>per box</Text>
            </Text>
            <Text style={[styles.detailDesc, { color: c.textSoft }]}>
              {p.description ||
                "No further description has been added for this piece yet — message us if you would like to know more."}
            </Text>
            <View style={[styles.specs, { borderColor: c.border }]}>
              {[
                ["Category", p.categoryLabel],
                ["Item code", p.sku],
                ["Unit price", peso(p.price)],
                [`For ${guestQty} ${guestQty === 1 ? "box" : "boxes"}`, peso((Number(p.price) || 0) * guestQty)],
              ].map(([label, value], i) => (
                <View key={label} style={[styles.specRow, i > 0 && { borderTopWidth: 1, borderTopColor: c.borderSoft }]}>
                  <Text style={[styles.specLabel, { color: c.textMute }]}>{label}</Text>
                  <Text style={[styles.specValue, { color: c.text }]}>{value}</Text>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
        <View style={[styles.sheetFoot, { borderTopColor: c.border }]}>
          <TouchableOpacity style={[styles.ctaGhost, { borderColor: c.border }]} onPress={closeSheet}>
            <Text style={[styles.ctaGhostText, { color: c.textSoft }]}>Keep browsing</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[inBasket ? styles.ctaGhost : styles.cta, inBasket ? { borderColor: c.accent } : { backgroundColor: c.accent }, { flex: 1 }]}
            onPress={() => toggleItem(p)}
          >
            <Text style={inBasket ? [styles.ctaGhostText, { color: c.accentText }] : styles.ctaText}>
              {inBasket ? "Remove from basket" : p.categoryKey === PACKAGING_KEY ? "Choose this box" : "Add to basket"}
            </Text>
          </TouchableOpacity>
        </View>
      </>
    );
  };

  const renderDateField = (name, label, help) => {
    const error = dateErrors[name];
    const value = formData[name];
    return (
      <View style={styles.field}>
        <Text style={[styles.fieldLabel, { color: c.text }]}>{label}</Text>
        <TouchableOpacity
          style={[styles.input, styles.dateInput, { backgroundColor: c.bg, borderColor: error ? c.danger : c.border }]}
          onPress={() => setDatePickerField(name)}
        >
          <Text style={{ color: value ? c.text : c.textMute, fontSize: 15 }}>{value ? formatDate(value) : "Select a date"}</Text>
          <MaterialCommunityIcons name="calendar-outline" size={20} color={c.textMute} />
        </TouchableOpacity>
        {error ? (
          <Text style={[styles.errorText, { color: c.danger }]}>{error}</Text>
        ) : (
          <Text style={[styles.helpText, { color: c.textMute }]}>{help}</Text>
        )}
      </View>
    );
  };

  const renderCheckoutSheet = () => (
    <>
      {renderSheetHead("Order details", "Almost there — just the dates and a few notes.", true)}
      <ScrollView style={styles.sheetBody} contentContainerStyle={styles.sheetBodyContent} keyboardShouldPersistTaps="handled">
        <View style={[styles.summary, { backgroundColor: c.accentWash }]}>
          <Text style={[styles.summaryTitle, { color: c.text }]}>
            {basketItems.length} {basketItems.length === 1 ? "piece" : "pieces"} · {peso(estimatedTotal)} estimated
          </Text>
          <View style={styles.summaryChips}>
            {basketItems.map((item) => (
              <View key={item.sku} style={[styles.summaryChip, { backgroundColor: c.surface, borderColor: c.border }]}>
                <Text style={[styles.summaryChipText, { color: c.textSoft }]} numberOfLines={1}>
                  {item.name}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {renderDateField("weddingDate", "Wedding date", `At least ${MIN_LEAD_DAYS} days from today.`)}
        {renderDateField("expectedDeliveryDate", "Delivery date", "On or before the wedding day.")}
        {!!dateWarning && (
          <View style={[styles.warn, { backgroundColor: c.warnBg }]}>
            <Text style={[styles.warnText, { color: c.warnText }]}>{dateWarning}</Text>
          </View>
        )}

        <View style={styles.field}>
          <Text style={[styles.fieldLabel, { color: c.text }]}>Number of boxes</Text>
          <TextInput
            style={[styles.input, { backgroundColor: c.bg, borderColor: c.border, color: c.text }]}
            value={formData.guestCount}
            onChangeText={(v) => handleFieldChange("guestCount", v.replace(/[^0-9]/g, ""))}
            keyboardType="number-pad"
            placeholder="50"
            placeholderTextColor={c.textMute}
            maxLength={5}
          />
          <Text style={[styles.helpText, { color: c.textMute }]}>Every item in your basket is prepared once per box.</Text>
        </View>

        <View style={styles.field}>
          <Text style={[styles.fieldLabel, { color: c.text }]}>Styling (optional)</Text>
          <View style={styles.styleChips}>
            {["", ...STYLE_OPTIONS].map((option) => {
              const active = formData.style === option;
              return (
                <TouchableOpacity
                  key={option || "none"}
                  onPress={() => handleFieldChange("style", option)}
                  style={[styles.styleChip, { backgroundColor: active ? c.accent : c.surface, borderColor: active ? c.accent : c.border }]}
                >
                  <Text style={[styles.styleChipText, { color: active ? "#fff" : c.textSoft }]}>{option || "No preference"}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={[styles.helpText, { color: c.textMute }]}>
            A direction for our stylists — your picks stay exactly as chosen.
          </Text>
        </View>

        {formData.style === STYLE_OTHERS && (
          <View style={[styles.notice, { backgroundColor: c.accentWash }]}>
            <MaterialCommunityIcons name="star-four-points" size={16} color={c.accentText} />
            <Text style={[styles.noticeText, { color: c.text }]}>
              <Text style={{ fontWeight: "700" }}>We'll be in touch. </Text>
              {STYLE_OTHERS_NOTICE} Add anything you already know to the notes below and we'll start from there.
            </Text>
          </View>
        )}

        <View style={styles.field}>
          <Text style={[styles.fieldLabel, { color: c.text }]}>Delivery address</Text>
          <TextInput
            style={[styles.input, styles.textArea, { backgroundColor: c.bg, borderColor: c.border, color: c.text }]}
            value={address}
            onChangeText={(v) => {
              setAddress(v);
              setFormError("");
            }}
            placeholder="House/unit number, street, barangay, city, province"
            placeholderTextColor={c.textMute}
            multiline
          />
          <Text style={[styles.helpText, { color: c.textMute }]}>
            Taken from your profile — change it if this order ships somewhere else.
          </Text>
        </View>

        <View style={styles.field}>
          <Text style={[styles.fieldLabel, { color: c.text }]}>Anything else we should know?</Text>
          <TextInput
            style={[styles.input, styles.textArea, { backgroundColor: c.bg, borderColor: c.border, color: c.text }]}
            value={formData.specialRequests}
            onChangeText={(v) => handleFieldChange("specialRequests", v)}
            placeholder="Colour palette, monogram, dietary notes, delivery instructions…"
            placeholderTextColor={c.textMute}
            multiline
          />
        </View>

        {!!formError && <Text style={[styles.errorText, { color: c.danger, marginTop: 0 }]}>{formError}</Text>}
      </ScrollView>
      <View style={[styles.sheetFoot, { borderTopColor: c.border }]}>
        <TouchableOpacity style={[styles.ctaGhost, { borderColor: c.border }]} onPress={() => setSheet(null)}>
          <Text style={[styles.ctaGhostText, { color: c.textSoft }]}>Back to browsing</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.cta, { backgroundColor: c.accent, flex: 1 }, submitting && styles.ctaDisabled]}
          onPress={handlePlaceOrder}
          disabled={submitting}
        >
          <Text style={styles.ctaText}>{submitting ? "Placing your order…" : "Place order"}</Text>
        </TouchableOpacity>
      </View>

      <DatePickerModal
        visible={!!datePickerField}
        onClose={() => setDatePickerField(null)}
        selectedDate={datePickerField ? formData[datePickerField] || null : null}
        minDate={datePickerField === "weddingDate" ? addDays(startOfToday(), MIN_LEAD_DAYS) : undefined}
        onSelect={(iso) => {
          if (datePickerField) handleFieldChange(datePickerField, iso);
          setDatePickerField(null);
        }}
        darkMode={darkMode}
      />
    </>
  );

  const renderOtpSheet = () => (
    <>
      {renderSheetHead("Confirm your email", `We sent a 6-digit code to ${customerEmail}. Enter it to finish your order.`, false)}
      <View style={styles.sheetBodyContent}>
        <View style={styles.field}>
          <Text style={[styles.fieldLabel, { color: c.text }]}>Confirmation code</Text>
          <TextInput
            style={[styles.input, styles.otpInput, { backgroundColor: c.bg, borderColor: otpError ? c.danger : c.border, color: c.text }]}
            value={otpCode}
            onChangeText={(v) => {
              setOtpCode(v.replace(/\D/g, ""));
              setOtpError("");
            }}
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="000000"
            placeholderTextColor={c.textMute}
          />
          {!!otpError && <Text style={[styles.errorText, { color: c.danger }]}>{otpError}</Text>}
        </View>
        <TouchableOpacity style={styles.linkBtn} onPress={handleResendOtp} disabled={resendCountdown > 0 || submitting}>
          <Text style={[styles.linkBtnText, { color: resendCountdown > 0 || submitting ? c.textMute : c.accentText }]}>
            {resendCountdown > 0 ? `Resend code in ${resendCountdown}s` : "Resend code"}
          </Text>
        </TouchableOpacity>
      </View>
      <View style={[styles.sheetFoot, { borderTopColor: c.border }]}>
        <TouchableOpacity style={[styles.ctaGhost, { borderColor: c.border }]} onPress={cancelOtp} disabled={submitting}>
          <Text style={[styles.ctaGhostText, { color: c.textSoft }]}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.cta, { backgroundColor: c.accent, flex: 1 }, (submitting || otpCode.length !== 6) && styles.ctaDisabled]}
          onPress={handleVerifyAndPlaceOrder}
          disabled={submitting || otpCode.length !== 6}
        >
          <Text style={styles.ctaText}>{submitting ? "Please wait…" : "Verify & place order"}</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  const renderPlacedSheet = () => (
    <>
      {renderSheetHead("Your order is in", "Thank you — we have everything we need to get started.", false)}
      <View style={styles.sheetBodyContent}>
        <View style={[styles.notice, { backgroundColor: c.accentWash }]}>
          <MaterialCommunityIcons name="star-four-points" size={16} color={c.accentText} />
          <Text style={[styles.noticeText, { color: c.text }]}>{STYLE_OTHERS_NOTICE}</Text>
        </View>
        <Text style={[styles.helpText, { color: c.textSoft, fontSize: 13, lineHeight: 19 }]}>
          You chose <Text style={{ fontWeight: "700" }}>Others</Text> for styling, so we will reach out using the contact
          details on your account to agree on the look before we start assembling.
        </Text>
      </View>
      <View style={[styles.sheetFoot, { borderTopColor: c.border }]}>
        <TouchableOpacity style={[styles.cta, { backgroundColor: c.accent, flex: 1 }]} onPress={goToOrders}>
          <Text style={styles.ctaText}>Got it — view my order</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  const toastElement = (
    <Toast
      key={toast.id}
      visible={toast.visible}
      message={toast.message}
      onHide={() => setToast((prev) => ({ ...prev, visible: false }))}
    />
  );

  const basketCount = basketItems.length;

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>
      <Header
        showBack
        logoType="image"
        showCart
        onBackPress={() => navigation.goBack()}
        onCartPress={() => navigation.navigate("MyCart")}
        darkMode={darkMode}
        title="Create Your Own Gift"
      />

      <ScrollView
        ref={scrollRef}
        stickyHeaderIndices={[1]}
        onScroll={handleScroll}
        scrollEventThrottle={32}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.accent} colors={[c.accent]} />}
      >
        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <View style={[styles.hero, { backgroundColor: c.cream, borderBottomColor: c.border }]}>
          <Text style={[styles.heroEyebrow, { color: c.accentText }]}>BUILD YOUR GIFT BOX</Text>
          <Text style={[styles.heroTitle, { color: c.text }]}>Everything we offer, on one page</Text>
          <Text style={[styles.heroSub, { color: c.textSoft }]}>
            Browse the full collection, tap any piece to see its details, and gather your favourites in the basket.
          </Text>
          <View style={styles.heroSteps}>
            {["One box, then its contents", "Tell us the dates", "We confirm your quote"].map((step, i) => (
              <View key={step} style={[styles.heroStep, { backgroundColor: c.surface, borderColor: c.border }]}>
                <View style={[styles.heroStepNum, { backgroundColor: c.accent }]}>
                  <Text style={styles.heroStepNumText}>{i + 1}</Text>
                </View>
                <Text style={[styles.heroStepText, { color: c.textSoft }]}>{step}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Category rail (sticky) ───────────────────────────────────── */}
        <View
          style={[styles.rail, { backgroundColor: c.bg, borderBottomColor: visibleCategories.length ? c.border : "transparent" }]}
          onLayout={(e) => {
            railHeight.current = e.nativeEvent.layout.height;
          }}
        >
          {visibleCategories.length > 0 && (
            <ScrollView ref={railRef} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.railScroll}>
              {visibleCategories.map((cat) => {
                const active = activeCategory === cat.key;
                return (
                  <TouchableOpacity
                    key={cat.key}
                    onLayout={(e) => {
                      chipOffsets.current[cat.key] = e.nativeEvent.layout.x;
                    }}
                    onPress={() => jumpToCategory(cat.key)}
                    style={[styles.chip, { backgroundColor: active ? c.accent : c.surface, borderColor: active ? c.accent : c.border }]}
                  >
                    <Text style={[styles.chipText, { color: active ? "#fff" : c.textSoft }]}>{cat.label}</Text>
                    <View style={[styles.chipCount, { backgroundColor: active ? "rgba(255,255,255,0.22)" : c.accentWash }]}>
                      <Text style={[styles.chipCountText, { color: active ? "#fff" : c.accentText }]}>{cat.products.length}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* ── Category sections ────────────────────────────────────────── */}
        <View
          style={styles.content}
          onLayout={(e) => {
            contentY.current = e.nativeEvent.layout.y;
          }}
        >
          {catalogueLoading && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: c.text }]}>Loading the collection…</Text>
              <View style={[styles.grid, { marginTop: 12 }]}>
                {Array.from({ length: 4 }).map((_, i) => (
                  <SkeletonProductCard key={i} style={{ width: CARD_WIDTH, marginBottom: GRID_GAP }} />
                ))}
              </View>
            </View>
          )}

          {!catalogueLoading && visibleCategories.length === 0 && (
            <View style={[styles.empty, { backgroundColor: c.surface, borderColor: c.border }]}>
              <MaterialCommunityIcons name="package-variant" size={40} color={c.textMute} />
              <Text style={[styles.emptyTitle, { color: c.text }]}>The collection is being restocked</Text>
              <Text style={[styles.emptyText, { color: c.textSoft }]}>
                There are no products available to order right now. Please check back shortly, or pull down to refresh.
              </Text>
            </View>
          )}

          {!catalogueLoading &&
            visibleCategories.map((cat) => (
              <View
                key={cat.key}
                style={styles.section}
                onLayout={(e) => {
                  sectionOffsets.current[cat.key] = e.nativeEvent.layout.y;
                }}
              >
                <View style={styles.sectionHead}>
                  <Text style={[styles.sectionTitle, { color: c.text }]}>{cat.label}</Text>
                  <Text style={[styles.sectionCount, { color: c.textMute }]}>
                    {cat.products.length} {cat.products.length === 1 ? "piece" : "pieces"}
                  </Text>
                  {cat.key === PACKAGING_KEY && (
                    <View style={[styles.ruleBadge, { backgroundColor: c.accentWash }]}>
                      <Text style={[styles.ruleBadgeText, { color: c.accentText }]}>Pick one</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.sectionBlurb, { color: c.textSoft }]}>{cat.blurb}</Text>
                <View style={styles.grid}>
                  {cat.products.map((product) => (
                    <ProductCard
                      key={product.sku}
                      product={product}
                      colors={c}
                      inBasket={basket.has(String(product.sku))}
                      singleChoice={cat.key === PACKAGING_KEY}
                      onOpen={openDetail}
                      onToggle={toggleItem}
                    />
                  ))}
                </View>
              </View>
            ))}
        </View>
      </ScrollView>

      {/* ── Basket dock ──────────────────────────────────────────────────── */}
      <View style={[styles.dock, { backgroundColor: c.surface, borderTopColor: c.border }]}>
        <TouchableOpacity style={styles.dockInfo} onPress={() => setSheet("basket")} activeOpacity={0.7}>
          <View>
            <MaterialCommunityIcons name="basket-outline" size={28} color={c.accentText} />
            {basketCount > 0 && (
              <View style={[styles.dockBadge, { backgroundColor: c.accent }]}>
                <Text style={styles.dockBadgeText}>{basketCount}</Text>
              </View>
            )}
          </View>
          <View style={styles.dockText}>
            <Text style={[styles.dockTitle, { color: c.text }]}>
              {basketCount} {basketCount === 1 ? "item" : "items"}
            </Text>
            <Text style={[styles.dockSub, { color: readiness.ok ? c.textSoft : c.textMute }]} numberOfLines={1}>
              {readiness.ok ? `${peso(estimatedTotal)} estimated` : readiness.reason}
            </Text>
          </View>
          <MaterialCommunityIcons name="chevron-up" size={20} color={c.textMute} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.cta, { backgroundColor: c.accent }, !readiness.ok && styles.ctaDisabled]}
          disabled={!readiness.ok}
          onPress={() => setSheet("checkout")}
        >
          <Text style={styles.ctaText}>Review</Text>
        </TouchableOpacity>
      </View>

      {/* ── Bottom sheets ────────────────────────────────────────────────── */}
      <Modal visible={sheet !== null} transparent animationType="slide" onRequestClose={closeSheet}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.overlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={closeSheet} />
          <View style={[styles.sheet, { backgroundColor: c.surface }]}>
            <View style={[styles.sheetHandle, { backgroundColor: c.border }]} />
            {sheet === "basket" && renderBasketSheet()}
            {sheet === "detail" && renderDetailSheet()}
            {sheet === "checkout" && renderCheckoutSheet()}
            {sheet === "otp" && renderOtpSheet()}
            {sheet === "placed" && renderPlacedSheet()}
          </View>
          {sheet !== null && toastElement}
        </KeyboardAvoidingView>
      </Modal>

      {sheet === null && toastElement}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Hero
  hero: { paddingHorizontal: H_PAD, paddingTop: 18, paddingBottom: 16, borderBottomWidth: 1 },
  heroEyebrow: { fontSize: 11, fontWeight: "700", letterSpacing: 1.5, marginBottom: 6 },
  heroTitle: { fontFamily: SERIF, fontSize: 24, lineHeight: 30, fontWeight: "600" },
  heroSub: { fontSize: 13, lineHeight: 19, marginTop: 6 },
  heroSteps: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 12 },
  heroStep: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 4,
    paddingLeft: 4,
    paddingRight: 10,
  },
  heroStepNum: { width: 18, height: 18, borderRadius: 9, alignItems: "center", justifyContent: "center", marginRight: 6 },
  heroStepNumText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  heroStepText: { fontSize: 11 },

  // Category rail
  rail: { borderBottomWidth: 1 },
  railScroll: { paddingHorizontal: H_PAD, paddingVertical: 10, gap: 8 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 6,
    paddingLeft: 14,
    paddingRight: 6,
  },
  chipText: { fontSize: 13, fontWeight: "600" },
  chipCount: {
    marginLeft: 6,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  chipCountText: { fontSize: 11, fontWeight: "700" },

  // Sections + cards
  content: { paddingHorizontal: H_PAD, paddingTop: 4 },
  section: { paddingTop: 18 },
  sectionHead: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8 },
  sectionTitle: { fontFamily: SERIF, fontSize: 22, fontWeight: "600" },
  sectionCount: { fontSize: 12 },
  ruleBadge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  ruleBadgeText: { fontSize: 10.5, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  sectionBlurb: { fontSize: 13, marginTop: 2, marginBottom: 12 },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  card: {
    width: CARD_WIDTH,
    marginBottom: GRID_GAP,
    borderRadius: 12,
    borderWidth: 1.5,
    overflow: "hidden",
    shadowColor: "#33373D",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 1,
  },
  cardImage: { width: "100%", height: CARD_WIDTH * 0.82 },
  cardTag: {
    position: "absolute",
    top: 8,
    left: 8,
    maxWidth: CARD_WIDTH - 52,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  cardTagText: { fontSize: 10, fontWeight: "600" },
  cardCheck: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: { padding: 10 },
  cardName: { fontFamily: SERIF, fontSize: 16, fontWeight: "600", lineHeight: 20, minHeight: 40 },
  cardDesc: { fontSize: 12, lineHeight: 16, marginTop: 2, minHeight: 32 },
  cardPriceRow: { flexDirection: "row", alignItems: "baseline", marginTop: 8 },
  price: { fontSize: 15, fontWeight: "700" },
  perBox: { fontSize: 11, fontWeight: "400" },
  addBtn: { marginTop: 8, borderWidth: 1.5, borderRadius: 8, paddingVertical: 8, alignItems: "center" },
  addBtnText: { fontSize: 12.5, fontWeight: "700" },

  empty: { alignItems: "center", borderWidth: 1, borderRadius: 14, padding: 24, marginTop: 20 },
  emptyTitle: { fontFamily: SERIF, fontSize: 20, fontWeight: "600", marginTop: 10, textAlign: "center" },
  emptyText: { fontSize: 13, lineHeight: 19, textAlign: "center", marginTop: 6 },

  // Dock
  dock: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: H_PAD,
    paddingTop: 12,
    paddingBottom: BOTTOM_PAD,
    borderTopWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 12,
  },
  dockInfo: { flex: 1, flexDirection: "row", alignItems: "center", marginRight: 12 },
  dockBadge: {
    position: "absolute",
    top: -4,
    right: -8,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  dockBadgeText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  dockText: { flex: 1, marginLeft: 14 },
  dockTitle: { fontSize: 14, fontWeight: "700" },
  dockSub: { fontSize: 12, marginTop: 1 },

  // Buttons
  cta: { borderRadius: 10, paddingVertical: 13, paddingHorizontal: 22, alignItems: "center", justifyContent: "center" },
  ctaDisabled: { opacity: 0.45 },
  ctaText: { color: "#fff", fontSize: 14.5, fontWeight: "700", textAlign: "center" },
  ctaGhost: {
    borderRadius: 10,
    borderWidth: 1.5,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaGhostText: { fontSize: 14, fontWeight: "700", textAlign: "center" },
  linkBtn: { alignSelf: "flex-start", paddingVertical: 6 },
  linkBtnText: { fontSize: 13.5, fontWeight: "700", textDecorationLine: "underline" },

  // Sheets
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.45)" },
  sheet: { maxHeight: "90%", borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 8, overflow: "hidden" },
  sheetHandle: { width: 44, height: 5, borderRadius: 3, alignSelf: "center", marginBottom: 6 },
  sheetHead: { paddingHorizontal: 20, paddingTop: 6, paddingBottom: 12, paddingRight: 60 },
  sheetTitle: { fontFamily: SERIF, fontSize: 22, fontWeight: "600" },
  sheetSubtitle: { fontSize: 13, lineHeight: 18, marginTop: 2 },
  sheetClose: {
    position: "absolute",
    top: 4,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetBody: { flexShrink: 1 },
  sheetBodyContent: { paddingHorizontal: 20, paddingBottom: 16 },
  sheetFoot: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: BOTTOM_PAD + 2,
    borderTopWidth: 1,
  },

  // Basket sheet
  basketEmpty: { alignItems: "center", paddingVertical: 28 },
  basketEmptyText: { textAlign: "center", fontSize: 13, lineHeight: 19, marginTop: 8 },
  basketItem: { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1 },
  basketThumb: { width: 48, height: 48, borderRadius: 8 },
  basketText: { flex: 1, marginHorizontal: 12 },
  basketName: { fontSize: 14, fontWeight: "600" },
  basketMeta: { fontSize: 12, marginTop: 2 },
  iconBtn: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  basketFoot: { borderTopWidth: 1, marginTop: 8, paddingTop: 14 },
  guestRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  guestInput: {
    width: 90,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    fontSize: 15,
    textAlign: "center",
  },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginTop: 14 },
  totalLabel: { fontSize: 13 },
  totalValue: { fontSize: 20, fontWeight: "700" },
  totalNote: { fontSize: 11.5, lineHeight: 16, marginTop: 4 },
  rules: { marginTop: 12, gap: 6 },
  ruleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  ruleText: { fontSize: 13, flexShrink: 1 },

  // Detail sheet
  detailImage: { width: "100%", height: 240 },
  detailClose: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  detailBody: { paddingHorizontal: 20, paddingTop: 16 },
  eyebrow: { fontSize: 11, fontWeight: "700", letterSpacing: 1.4 },
  detailTitle: { fontFamily: SERIF, fontSize: 26, lineHeight: 32, fontWeight: "600", marginTop: 4 },
  detailPrice: { fontSize: 18, fontWeight: "700", marginTop: 6 },
  detailDesc: { fontSize: 14, lineHeight: 21, marginTop: 10 },
  specs: { marginTop: 16, borderWidth: 1, borderRadius: 10 },
  specRow: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 10 },
  specLabel: { fontSize: 12.5 },
  specValue: { fontSize: 13, fontWeight: "600", flexShrink: 1, textAlign: "right", marginLeft: 12 },

  // Checkout sheet
  summary: { borderRadius: 12, padding: 14, marginBottom: 16 },
  summaryTitle: { fontFamily: SERIF, fontSize: 17, fontWeight: "600" },
  summaryChips: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 },
  summaryChip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, maxWidth: "100%" },
  summaryChipText: { fontSize: 12 },
  field: { marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: "700", marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontSize: 15 },
  dateInput: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  textArea: { minHeight: 84, textAlignVertical: "top" },
  otpInput: { textAlign: "center", letterSpacing: 8, fontSize: 22, fontWeight: "700" },
  helpText: { fontSize: 12, marginTop: 5 },
  errorText: { fontSize: 12.5, marginTop: 5 },
  warn: { borderRadius: 10, padding: 12, marginTop: -4, marginBottom: 16 },
  warnText: { fontSize: 12.5, lineHeight: 18 },
  styleChips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  styleChip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  styleChipText: { fontSize: 13, fontWeight: "600" },
  notice: { flexDirection: "row", alignItems: "flex-start", gap: 10, borderRadius: 10, padding: 12, marginBottom: 16 },
  noticeText: { flex: 1, fontSize: 13, lineHeight: 19 },
});
