import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../Context/ThemeContext';
import { customerAPI, inventoryAPI, orderAPI, showcaseAPI } from '../../services/api';
import DatePickerModal from '../../Components/DatePickerModal';
import ProductImage from '../../Components/ProductImage';
import {
  ActionButton,
  BottomActions,
  ChipGroup,
  FieldLabel,
  FormField,
  FormSection,
  PhoneField,
  ScreenHeader,
  Segmented,
  Stepper,
} from '../../Components/FormKit';
import { normalizePhMobile, phMobileError } from '../../constants/phone';
import { formatLongDate, peso } from '../../constants/orderBoard';

/* Mobile version of Website/client/src/Pages/OrderDetails/AddOrderModal.js: the same fields,
   the same POST /orders payload, and the same rule that every order ships in at least one box. */

const SHOWCASE_CATEGORIES = [
  { key: 'wedding', label: 'Wedding' },
  { key: 'corporate', label: 'Corporate' },
  { key: 'bespoke', label: 'Bespoke' },
];
const ORDER_STATUSES = ['Pending', 'Order Placed', 'Order Paid', 'To Be Packed', 'Order Shipped Out', 'Ready for Delivery', 'Order Received', 'Completed', 'Cancelled'];
const PAYMENT_METHODS = ['Cash', 'Online Banking', 'E-Wallet', 'Bank Transfer'];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PRODUCT_RESULTS_LIMIT = 40;
const DANGER = '#E53935';

const toISODate = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

// Endpoints answer with either a bare array or an object wrapping one.
const firstArray = (data) => (Array.isArray(data) ? data : Object.values(data || {}).find(Array.isArray) || []);

function DateButton({ label, required, value, onPress, error, colors }) {
  return (
    <View style={styles.flex1}>
      <FieldLabel label={label} required={required} colors={colors} />
      <TouchableOpacity
        onPress={onPress}
        style={[styles.dateBtn, { borderColor: error ? DANGER : colors.border, backgroundColor: colors.inputBackground }]}
      >
        <MaterialCommunityIcons name="calendar-month-outline" size={18} color={error ? DANGER : colors.subText} />
        <Text style={[styles.dateText, { color: value ? colors.text : colors.placeholder }]} numberOfLines={1}>
          {value ? formatLongDate(value) : 'Select date'}
        </Text>
      </TouchableOpacity>
      {!!error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

export default function AddOrderScreen({ navigation }) {
  const { colors, darkMode } = useTheme();

  const [orderType, setOrderType] = useState('custom'); // 'package' | 'custom'
  const [packages, setPackages] = useState([]);
  const [packageName, setPackageName] = useState('');
  const [packageLoading, setPackageLoading] = useState(false);
  const [packagePickerOpen, setPackagePickerOpen] = useState(false);

  const [customerMode, setCustomerMode] = useState('existing'); // 'existing' | 'new'
  const [customers, setCustomers] = useState([]);
  const [customerQuery, setCustomerQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const [fields, setFields] = useState({
    account_name: '',
    shipped_to: '',
    email_address: '',
    cellphone: '',
    telephone: '',
    shipping_address: '',
    order_date: toISODate(new Date()),
    expected_delivery: '',
    status: 'Pending',
    payment_method: 'Cash',
    remarks: '',
    order_quantity: 1,
  });
  const [datePicker, setDatePicker] = useState(null); // 'order_date' | 'expected_delivery'

  const [inventory, setInventory] = useState([]);
  const [inventoryLoading, setInventoryLoading] = useState(true);
  const [productSearch, setProductSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedProducts, setSelectedProducts] = useState([]);

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    customerAPI
      .getCustomers()
      .then((data) => !cancelled && setCustomers(firstArray(data)))
      .catch((error) => console.error('Error fetching customers for Add Order:', error));
    inventoryAPI
      .getInventory()
      .then((data) => !cancelled && setInventory(firstArray(data)))
      .catch((error) => console.error('Error fetching inventory for Add Order:', error))
      .finally(() => !cancelled && setInventoryLoading(false));
    Promise.all(
      SHOWCASE_CATEGORIES.map(({ key }) =>
        showcaseAPI
          .getBundles(key)
          .then((data) => (data?.bundles || []).map((bundle) => ({ ...bundle, category: key })))
          .catch(() => [])
      )
    ).then((groups) => !cancelled && setPackages(groups.flat()));
    return () => {
      cancelled = true;
    };
  }, []);

  const setField = (key, value) => {
    setFields((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => (prev[key] || (prev.contact && ['email_address', 'cellphone'].includes(key)) ? { ...prev, [key]: null, contact: null } : prev));
  };

  /* ── Package ─────────────────────────────────────────────────────────── */
  const choosePackage = async (bundle) => {
    setPackagePickerOpen(false);
    setPackageName(bundle.title || '');
    setErrors((prev) => ({ ...prev, package: null, products: null }));
    setPackageLoading(true);
    try {
      const data = await showcaseAPI.getBundle(bundle.id);
      const items = data?.bundle?.bundle_items || [];
      setSelectedProducts(
        items.map((item) => {
          const stock = inventory.find((inv) => inv.sku === item.sku);
          return {
            sku: item.sku,
            name: item.item_name,
            unit_price: Number(item.unit_price) || 0,
            quantity: Number(item.quantity) || 1,
            isPackageDefault: true,
            availableQty: Number(stock?.quantity) || 0,
          };
        })
      );
    } catch (error) {
      console.error('Error loading package contents:', error);
      Alert.alert('Error', "Couldn't load that package's products. Please try again.");
    } finally {
      setPackageLoading(false);
    }
  };

  /* ── Customer ────────────────────────────────────────────────────────── */
  const filteredCustomers = useMemo(() => {
    const term = customerQuery.trim().toLowerCase();
    if (!term) return customers.slice(0, 6);
    return customers
      .filter((c) => [c.name, c.email_address, c.cellphone, c.phone_number].some((v) => String(v || '').toLowerCase().includes(term)))
      .slice(0, 8);
  }, [customers, customerQuery]);

  const selectCustomer = (customer) => {
    setSelectedCustomer(customer);
    setCustomerQuery('');
    setFields((prev) => ({
      ...prev,
      account_name: customer.name || prev.account_name,
      email_address: customer.email_address || prev.email_address,
      cellphone: normalizePhMobile(customer.cellphone || customer.phone_number || prev.cellphone),
      telephone: customer.telephone || prev.telephone,
      shipped_to: prev.shipped_to || customer.name || '',
      shipping_address: prev.shipping_address || customer.address || '',
    }));
    setErrors({});
  };

  /* ── Products ────────────────────────────────────────────────────────── */
  const categories = useMemo(
    () => Array.from(new Set(inventory.map((item) => item.category).filter(Boolean))).sort(),
    [inventory]
  );
  const selectedSkus = useMemo(() => new Set(selectedProducts.map((p) => p.sku)), [selectedProducts]);
  const matchingProducts = useMemo(() => {
    let list = inventory;
    if (categoryFilter !== 'all') list = list.filter((item) => item.category === categoryFilter);
    const term = productSearch.trim().toLowerCase();
    if (term) list = list.filter((item) => `${item.name || ''} ${item.sku || ''}`.toLowerCase().includes(term));
    return list;
  }, [inventory, categoryFilter, productSearch]);

  const addProduct = (item) => {
    const availableQty = Number(item.quantity) || 0;
    if (selectedSkus.has(item.sku) || availableQty <= 0) return;
    setSelectedProducts((prev) => [
      ...prev,
      { sku: item.sku, name: item.name, unit_price: Number(item.unit_price) || 0, quantity: 1, isPackageDefault: false, availableQty },
    ]);
    setErrors((prev) => ({ ...prev, products: null }));
  };

  const removeProduct = (sku) => setSelectedProducts((prev) => prev.filter((p) => p.sku !== sku));

  // One order = one box design: every box holds each selected product at its
  // per-box quantity (1 for custom, the bundle's quantity for a package). Only
  // the box count scales the order — same rule as the web Add Order modal.
  const productsCost = selectedProducts.reduce((sum, p) => sum + (Number(p.unit_price) || 0) * (Number(p.quantity) || 0), 0);
  const boxes = Number(fields.order_quantity) || 0;
  const totalCost = productsCost * boxes;
  // Most boxes the current stock can fill — the scarcest product decides.
  const maxBoxes = selectedProducts.length === 0
    ? 9999
    : Math.max(1, Math.min(9999, ...selectedProducts.map((p) => Math.floor((p.availableQty || 0) / (Number(p.quantity) || 1)))));
  const downPayment = Math.round(totalCost * 0.7 * 100) / 100;
  const remainingBalance = Math.round((totalCost - downPayment) * 100) / 100;

  /* ── Submit ──────────────────────────────────────────────────────────── */
  const validate = () => {
    const next = {};
    if (orderType === 'package' && !packageName) next.package = 'Select a package';
    if (!fields.account_name.trim()) next.account_name = 'Customer / account name is required';
    const email = fields.email_address.trim();
    if (!email && !fields.cellphone) next.contact = 'Provide at least an email address or a mobile number';
    if (email && !EMAIL_REGEX.test(email)) next.email_address = 'Enter a valid email address';
    const cellError = phMobileError(fields.cellphone);
    if (cellError) next.cellphone = cellError;
    if (!fields.shipping_address.trim()) next.shipping_address = 'Shipping address is required';
    if (!fields.order_date) next.order_date = 'Order date is required';
    if (!fields.expected_delivery) next.expected_delivery = 'Expected delivery is required';
    if (selectedProducts.length === 0) next.products = 'Add at least one product to the order';
    const boxCount = Number(fields.order_quantity);
    if (!Number.isInteger(boxCount) || boxCount < 1) next.order_quantity = 'Total boxes is required. Every order needs at least 1 box.';
    else {
      const short = selectedProducts.find((p) => (Number(p.quantity) || 1) * boxCount > (p.availableQty || 0));
      if (short) next.products = `Not enough stock of "${short.name}" for ${boxCount} box${boxCount === 1 ? '' : 'es'} — only ${short.availableQty} available.`;
    }
    const found = Object.fromEntries(Object.entries(next).filter(([, v]) => v));
    setErrors(found);
    return found;
  };

  const submit = async () => {
    if (submitting) return;
    const found = validate();
    const messages = Object.values(found);
    if (messages.length) {
      Alert.alert('Check the order', messages.join('\n'));
      return;
    }

    setSubmitting(true);
    try {
      const accountName = fields.account_name.trim();
      await orderAPI.createOrder({
        account_name: accountName,
        name: accountName,
        order_date: fields.order_date,
        expected_delivery: fields.expected_delivery,
        status: fields.status,
        package_name: orderType === 'package' ? packageName : 'Custom',
        payment_method: fields.payment_method,
        shipped_to: fields.shipped_to.trim() || accountName,
        shipping_address: fields.shipping_address.trim(),
        remarks: fields.remarks.trim(),
        telephone: fields.telephone.trim(),
        cellphone: fields.cellphone,
        email_address: fields.email_address.trim(),
        order_quantity: Number(fields.order_quantity),
        customer_id: selectedCustomer?.customer_id,
        // Each box carries every product, so a line ships perBox × boxes units.
        products: selectedProducts.map((p) => ({ sku: p.sku, quantity: (Number(p.quantity) || 1) * Number(fields.order_quantity) })),
      });
      Alert.alert('Order created', `The order for ${accountName} was created.`, [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (error) {
      console.error('Error creating order:', error);
      Alert.alert('Error', error.response?.data?.error || error.response?.data?.message || 'Failed to create order.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = () => {
    const touched = selectedProducts.length > 0 || fields.account_name.trim() || fields.shipping_address.trim();
    if (!touched || submitting) {
      navigation.goBack();
      return;
    }
    Alert.alert('Discard this order?', 'The details you entered will be lost.', [
      { text: 'Keep Editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => navigation.goBack() },
    ]);
  };

  const shownProducts = matchingProducts.slice(0, PRODUCT_RESULTS_LIMIT);

  return (
    <KeyboardAvoidingView style={styles.flex1} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.flex1, { backgroundColor: colors.background }]}>
        <ScreenHeader title="New Order" subtitle="Same order form as the website" onBack={handleBack} colors={colors} />

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {/* ── Order type ───────────────────────────────────────────── */}
          <FormSection title="Order type" icon="shape-outline" colors={colors}>
            <Segmented
              value={orderType}
              onChange={(value) => {
                setOrderType(value);
                if (value === 'custom') setPackageName('');
              }}
              colors={colors}
              options={[
                { value: 'package', label: 'Package', icon: 'gift-outline' },
                { value: 'custom', label: 'Custom', icon: 'tools' },
              ]}
            />
            {orderType === 'package' && (
              <View style={styles.topGap}>
                <FieldLabel label="Package" required colors={colors} />
                <TouchableOpacity
                  onPress={() => setPackagePickerOpen(true)}
                  style={[styles.dateBtn, { borderColor: errors.package ? DANGER : colors.border, backgroundColor: colors.inputBackground }]}
                >
                  <MaterialCommunityIcons name="package-variant" size={18} color={colors.subText} />
                  <Text style={[styles.dateText, { color: packageName ? colors.text : colors.placeholder }]} numberOfLines={1}>
                    {packageName || 'Select a package'}
                  </Text>
                  {packageLoading ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <MaterialCommunityIcons name="chevron-down" size={20} color={colors.subText} />
                  )}
                </TouchableOpacity>
                {errors.package ? (
                  <Text style={styles.errorText}>{errors.package}</Text>
                ) : (
                  !!packageName && (
                    <Text style={[styles.hint, { color: colors.subText }]}>
                      Package items were added below as defaults. You can still add or remove products.
                    </Text>
                  )
                )}
              </View>
            )}
          </FormSection>

          {/* ── Customer ─────────────────────────────────────────────── */}
          <FormSection title="Customer" icon="account-search-outline" colors={colors}>
            <Segmented
              value={customerMode}
              onChange={(value) => {
                setCustomerMode(value);
                if (value === 'new') setSelectedCustomer(null);
              }}
              colors={colors}
              options={[
                { value: 'existing', label: 'Existing customer' },
                { value: 'new', label: 'Walk-in / Social' },
              ]}
            />
            {customerMode === 'existing' && (
              <View style={styles.topGap}>
                {selectedCustomer ? (
                  <View style={[styles.selectedCustomer, { borderColor: colors.primary, backgroundColor: colors.primaryContainer }]}>
                    <MaterialCommunityIcons name="account-check" size={22} color={colors.primary} />
                    <View style={styles.flex1}>
                      <Text style={[styles.customerName, { color: colors.text }]}>{selectedCustomer.name}</Text>
                      <Text style={[styles.customerMeta, { color: colors.subText }]} numberOfLines={1}>
                        {selectedCustomer.email_address || selectedCustomer.cellphone || selectedCustomer.phone_number || ''}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => setSelectedCustomer(null)}>
                      <Text style={[styles.link, { color: colors.primary }]}>Change</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <>
                    <FormField
                      icon="magnify"
                      value={customerQuery}
                      onChangeText={setCustomerQuery}
                      placeholder="Search by name, email, or phone"
                      autoCapitalize="none"
                      colors={colors}
                      containerStyle={styles.noGap}
                    />
                    <View style={styles.topGapSm}>
                      {filteredCustomers.length === 0 ? (
                        <Text style={[styles.hint, { color: colors.subText }]}>
                          No matching customers. Switch to "Walk-in / Social" to enter details manually.
                        </Text>
                      ) : (
                        filteredCustomers.map((customer) => (
                          <TouchableOpacity
                            key={customer.customer_id}
                            onPress={() => selectCustomer(customer)}
                            style={[styles.customerRow, { borderColor: colors.border }]}
                          >
                            <View style={[styles.customerAvatar, { backgroundColor: colors.primaryContainer }]}>
                              <Text style={[styles.customerInitial, { color: colors.primary }]}>
                                {String(customer.name || '?').trim().charAt(0).toUpperCase()}
                              </Text>
                            </View>
                            <View style={styles.flex1}>
                              <Text style={[styles.customerName, { color: colors.text }]} numberOfLines={1}>{customer.name}</Text>
                              <Text style={[styles.customerMeta, { color: colors.subText }]} numberOfLines={1}>
                                {customer.email_address || customer.cellphone || customer.phone_number || ''}
                              </Text>
                            </View>
                            <MaterialCommunityIcons name="chevron-right" size={20} color={colors.subText} />
                          </TouchableOpacity>
                        ))
                      )}
                    </View>
                  </>
                )}
              </View>
            )}
          </FormSection>

          {/* ── Contact & delivery ───────────────────────────────────── */}
          <FormSection title="Receiver & contact" icon="card-account-phone-outline" colors={colors}>
            <FormField
              label="Account / customer name"
              required
              icon="account-outline"
              value={fields.account_name}
              onChangeText={(v) => setField('account_name', v)}
              autoCapitalize="words"
              error={errors.account_name}
              colors={colors}
            />
            <FormField
              label="Receiver name"
              icon="account-arrow-right-outline"
              value={fields.shipped_to}
              onChangeText={(v) => setField('shipped_to', v)}
              placeholder="Defaults to the account name"
              autoCapitalize="words"
              colors={colors}
            />
            <FormField
              label="Email address"
              icon="email-outline"
              value={fields.email_address}
              onChangeText={(v) => setField('email_address', v)}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              error={errors.email_address}
              colors={colors}
            />
            <PhoneField value={fields.cellphone} onChangeText={(v) => setField('cellphone', v)} error={errors.cellphone} colors={colors} />
            {!!errors.contact && <Text style={[styles.errorText, styles.contactError]}>{errors.contact}</Text>}
            <FormField
              label="Telephone"
              icon="phone-classic"
              value={fields.telephone}
              onChangeText={(v) => setField('telephone', v.replace(/[^\d\s()-]/g, '').slice(0, 15))}
              keyboardType="phone-pad"
              placeholder="Optional"
              colors={colors}
            />
            <FormField
              label="Shipping address"
              required
              value={fields.shipping_address}
              onChangeText={(v) => setField('shipping_address', v)}
              placeholder="House no., street, barangay, city, province"
              multiline
              error={errors.shipping_address}
              colors={colors}
              containerStyle={styles.noGap}
            />
          </FormSection>

          {/* ── Schedule & status ────────────────────────────────────── */}
          <FormSection title="Schedule & status" icon="calendar-clock-outline" colors={colors}>
            <View style={styles.row}>
              <DateButton label="Order date" required value={fields.order_date} onPress={() => setDatePicker('order_date')} error={errors.order_date} colors={colors} />
              <DateButton
                label="Expected delivery"
                required
                value={fields.expected_delivery}
                onPress={() => setDatePicker('expected_delivery')}
                error={errors.expected_delivery}
                colors={colors}
              />
            </View>
            <View style={styles.topGap}>
              <FieldLabel label="Order status" colors={colors} />
              <ChipGroup options={ORDER_STATUSES} value={fields.status} onChange={(v) => setField('status', v)} colors={colors} />
            </View>
          </FormSection>

          {/* ── Products ─────────────────────────────────────────────── */}
          <FormSection
            title="Products"
            icon="gift-outline"
            description={errors.products || undefined}
            colors={colors}
            right={
              <View style={[styles.countBadge, { backgroundColor: colors.primaryContainer }]}>
                <Text style={[styles.countText, { color: colors.primary }]}>{selectedProducts.length} selected</Text>
              </View>
            }
          >
            {!!errors.products && <Text style={[styles.errorText, styles.productsError]}>{errors.products}</Text>}

            {selectedProducts.map((p) => {
              const overStock = Number(p.quantity) * boxes > (p.availableQty || 0);
              return (
                <View key={p.sku} style={[styles.selectedRow, { borderColor: colors.border }]}>
                  <ProductImage sku={p.sku} style={styles.thumb} colors={{ wash: colors.inputBackground, textMute: colors.subText }} iconSize={18} showLabel={false} />
                  <View style={styles.flex1}>
                    <Text style={[styles.productName, { color: colors.text }]} numberOfLines={2}>{p.name}</Text>
                    <Text style={[styles.productMeta, { color: colors.subText }]}>
                      {peso(p.unit_price)} each{p.isPackageDefault ? ' · Package default' : ''}
                    </Text>
                    {overStock && <Text style={styles.stockWarn}>Only {p.availableQty} in stock</Text>}
                    <View style={styles.selectedControls}>
                      <Text style={[styles.productMeta, { color: colors.subText }]}>
                        {p.quantity} per box × {boxes} = {(Number(p.quantity) || 0) * boxes} pcs
                      </Text>
                      <Text style={[styles.lineTotal, { color: colors.text }]}>{peso((Number(p.unit_price) || 0) * (Number(p.quantity) || 0) * boxes)}</Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => removeProduct(p.sku)} style={styles.removeBtn} accessibilityLabel={`Remove ${p.name}`}>
                    <MaterialCommunityIcons name="close" size={20} color={DANGER} />
                  </TouchableOpacity>
                </View>
              );
            })}

            <View style={[styles.browser, { borderTopColor: colors.border }, selectedProducts.length === 0 && styles.browserFirst]}>
              <FormField
                icon="magnify"
                value={productSearch}
                onChangeText={setProductSearch}
                placeholder="Search products by name or SKU"
                autoCapitalize="none"
                colors={colors}
                containerStyle={styles.noGap}
              />
              {categories.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
                  {['all', ...categories].map((category) => {
                    const active = categoryFilter === category;
                    return (
                      <TouchableOpacity
                        key={category}
                        onPress={() => setCategoryFilter(category)}
                        style={[styles.categoryChip, { borderColor: active ? colors.primary : colors.border, backgroundColor: active ? colors.primary : colors.card }]}
                      >
                        <Text style={[styles.categoryText, { color: active ? '#fff' : colors.text }]}>{category === 'all' ? 'All' : category}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}

              {inventoryLoading ? (
                <ActivityIndicator color={colors.primary} style={styles.topGap} />
              ) : shownProducts.length === 0 ? (
                <Text style={[styles.hint, styles.topGap, { color: colors.subText }]}>No products match your search.</Text>
              ) : (
                shownProducts.map((item) => {
                  const added = selectedSkus.has(item.sku);
                  const out = Number(item.quantity || 0) <= 0;
                  return (
                    <TouchableOpacity
                      key={item.sku}
                      onPress={() => addProduct(item)}
                      disabled={added || out}
                      style={[styles.productRow, { borderColor: colors.border, opacity: out ? 0.5 : 1 }]}
                    >
                      <ProductImage sku={item.sku} version={item.updated_at} style={styles.thumb} colors={{ wash: colors.inputBackground, textMute: colors.subText }} iconSize={18} showLabel={false} />
                      <View style={styles.flex1}>
                        <Text style={[styles.productName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
                        <Text style={[styles.productMeta, { color: colors.subText }]} numberOfLines={1}>
                          {item.sku} · {peso(item.unit_price)}
                        </Text>
                        <Text style={[styles.productMeta, { color: out ? DANGER : '#2E7D32' }]}>
                          {out ? 'Out of stock' : `${Number(item.quantity).toLocaleString()} available`}
                        </Text>
                      </View>
                      <MaterialCommunityIcons
                        name={added ? 'check-circle' : 'plus-circle-outline'}
                        size={24}
                        color={added ? '#2E7D32' : out ? colors.border : colors.primary}
                      />
                    </TouchableOpacity>
                  );
                })
              )}
              {matchingProducts.length > PRODUCT_RESULTS_LIMIT && (
                <Text style={[styles.hint, styles.topGapSm, { color: colors.subText }]}>
                  Showing {PRODUCT_RESULTS_LIMIT} of {matchingProducts.length}. Search to narrow the list.
                </Text>
              )}
            </View>
          </FormSection>

          {/* ── Boxes, payment, totals ───────────────────────────────── */}
          <FormSection title="Boxes & payment" icon="package-variant-closed" colors={colors}>
            <FieldLabel label="Total boxes" required colors={colors} />
            <Stepper value={fields.order_quantity} onChange={(v) => setField('order_quantity', v)} min={1} max={maxBoxes} colors={colors} />
            {errors.order_quantity ? (
              <Text style={styles.errorText}>{errors.order_quantity}</Text>
            ) : (
              <Text style={[styles.hint, styles.topGapSm, { color: colors.subText }]}>
                Each box contains every selected product. Increase the boxes to scale the order — product quantities follow automatically.
              </Text>
            )}

            <View style={styles.topGap}>
              <FieldLabel label="Payment method" colors={colors} />
              <ChipGroup options={PAYMENT_METHODS} value={fields.payment_method} onChange={(v) => setField('payment_method', v)} colors={colors} />
            </View>

            <View style={[styles.totals, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
              <View style={styles.totalRow}>
                <Text style={[styles.totalLabel, { color: colors.text }]}>Total cost</Text>
                <Text style={[styles.totalValue, { color: colors.text }]}>{peso(totalCost)}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={[styles.totalMuted, { color: colors.subText }]}>Down payment (70%)</Text>
                <Text style={[styles.totalMuted, { color: colors.subText }]}>{peso(downPayment)}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={[styles.totalMuted, { color: colors.subText }]}>Remaining balance (30%)</Text>
                <Text style={[styles.totalMuted, { color: colors.subText }]}>{peso(remainingBalance)}</Text>
              </View>
              <Text style={[styles.hint, styles.topGapSm, { color: colors.subText }]}>
                {peso(productsCost)} per box × {boxes || 0} box{boxes === 1 ? '' : 'es'}. The server recalculates this on save.
              </Text>
            </View>
          </FormSection>

          <FormSection title="Remarks" icon="note-text-outline" colors={colors}>
            <FormField
              value={fields.remarks}
              onChangeText={(v) => setField('remarks', v)}
              placeholder="Optional notes for this order"
              multiline
              colors={colors}
              containerStyle={styles.noGap}
            />
          </FormSection>
        </ScrollView>

        <BottomActions colors={colors}>
          <ActionButton label="Cancel" variant="outline" onPress={handleBack} disabled={submitting} colors={colors} />
          <ActionButton label="Create Order" icon="check" onPress={submit} loading={submitting} colors={colors} />
        </BottomActions>
      </View>

      <DatePickerModal
        visible={!!datePicker}
        onClose={() => setDatePicker(null)}
        onSelect={(iso) => {
          setField(datePicker, iso);
          setDatePicker(null);
        }}
        selectedDate={datePicker ? fields[datePicker] || undefined : undefined}
        minDate={datePicker === 'expected_delivery' ? fields.order_date || undefined : '2020-01-01'}
        darkMode={darkMode}
      />

      <Modal visible={packagePickerOpen} transparent animationType="slide" onRequestClose={() => setPackagePickerOpen(false)}>
        <View style={styles.sheetOverlay}>
          <View style={[styles.sheet, { backgroundColor: colors.card }]}>
            <View style={styles.sheetHead}>
              <Text style={[styles.sheetTitle, { color: colors.text }]}>Select a package</Text>
              <TouchableOpacity onPress={() => setPackagePickerOpen(false)} accessibilityLabel="Close">
                <MaterialCommunityIcons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {packages.length === 0 ? (
                <Text style={[styles.hint, { color: colors.subText }]}>No packages found. Packages are managed in the website's Showcase Gallery.</Text>
              ) : (
                SHOWCASE_CATEGORIES.map(({ key, label }) => {
                  const group = packages.filter((p) => p.category === key);
                  if (group.length === 0) return null;
                  return (
                    <View key={key} style={styles.topGapSm}>
                      <Text style={[styles.groupLabel, { color: colors.subText }]}>{label}</Text>
                      {group.map((bundle) => (
                        <TouchableOpacity
                          key={bundle.id}
                          onPress={() => choosePackage(bundle)}
                          style={[styles.customerRow, { borderColor: packageName === bundle.title ? colors.primary : colors.border }]}
                        >
                          <MaterialCommunityIcons name="gift-outline" size={20} color={colors.primary} />
                          <Text style={[styles.customerName, styles.flex1, { color: colors.text }]}>{bundle.title}</Text>
                          {packageName === bundle.title && <MaterialCommunityIcons name="check" size={20} color={colors.primary} />}
                        </TouchableOpacity>
                      ))}
                    </View>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  row: { flexDirection: 'row', gap: 10 },
  topGap: { marginTop: 14 },
  topGapSm: { marginTop: 8 },
  noGap: { marginBottom: 0 },
  hint: { fontSize: 12, lineHeight: 17 },
  link: { fontSize: 14, fontWeight: '700' },
  errorText: { color: DANGER, fontSize: 12, marginTop: 5 },
  contactError: { marginTop: -8, marginBottom: 12 },
  productsError: { marginTop: -6, marginBottom: 10 },
  dateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    minHeight: 46,
  },
  dateText: { flex: 1, fontSize: 14, fontWeight: '600' },
  selectedCustomer: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1.5, borderRadius: 12, padding: 12 },
  customerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 10, padding: 10, marginBottom: 8 },
  customerAvatar: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  customerInitial: { fontSize: 15, fontWeight: '700' },
  customerName: { fontSize: 15, fontWeight: '600' },
  customerMeta: { fontSize: 12, marginTop: 1 },
  countBadge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
  countText: { fontSize: 12, fontWeight: '700' },
  selectedRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderWidth: 1, borderRadius: 12, padding: 10, marginBottom: 10 },
  selectedControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  thumb: { width: 46, height: 46, borderRadius: 8 },
  productName: { fontSize: 14, fontWeight: '700' },
  productMeta: { fontSize: 12, marginTop: 2 },
  stockWarn: { color: '#EF6C00', fontSize: 12, fontWeight: '600', marginTop: 2 },
  lineTotal: { fontSize: 14, fontWeight: '700' },
  removeBtn: { padding: 4 },
  browser: { borderTopWidth: 1, paddingTop: 14, marginTop: 4 },
  browserFirst: { borderTopWidth: 0, paddingTop: 0, marginTop: 0 },
  categoryRow: { gap: 8, paddingVertical: 10 },
  categoryChip: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  categoryText: { fontSize: 12, fontWeight: '600' },
  productRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 10, padding: 8, marginBottom: 8 },
  totals: { borderWidth: 1, borderRadius: 12, padding: 12, marginTop: 16 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  totalLabel: { fontSize: 15, fontWeight: '700' },
  totalValue: { fontSize: 18, fontWeight: '800' },
  totalMuted: { fontSize: 13 },
  sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { maxHeight: '75%', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 18, paddingBottom: Platform.OS === 'ios' ? 30 : 18 },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  sheetTitle: { fontSize: 18, fontWeight: '700' },
  groupLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
});
