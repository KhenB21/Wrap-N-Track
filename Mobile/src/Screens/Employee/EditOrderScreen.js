import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRoute } from '@react-navigation/native';
import { useTheme } from '../../Context/ThemeContext';
import { orderAPI } from '../../services/api';
import DatePickerModal from '../../Components/DatePickerModal';
import {
  ActionButton,
  BottomActions,
  ChipGroup,
  FieldLabel,
  FormField,
  FormSection,
  PhoneField,
  ScreenHeader,
  Stepper,
} from '../../Components/FormKit';
import { normalizePhMobile, phMobileError } from '../../constants/phone';
import { formatLongDate, orderTotal, parseDeliveryDate, peso, statusTone } from '../../constants/orderBoard';

/* Mobile version of the Website "Edit Order" modal (Website/client/src/Pages/OrderDetails/OrderDetails.js).
   Saves only the order-detail columns through PUT /orders/:order_id — no status and no products, so
   no payment gate or stock movement is triggered — plus the box count, which must stay at least 1. */

const EDITABLE_ORDER_FIELDS = [
  'account_name', 'name', 'package_name', 'payment_method', 'payment_type',
  'shipped_to', 'shipping_address', 'remarks', 'telephone', 'cellphone', 'email_address',
];
const PACKAGE_OPTIONS = ['Carlo', 'Custom'];
const PAYMENT_TYPES = ['50% paid', '70% paid', '100% Paid'];
const PAYMENT_METHODS = ['Cash', 'Online Banking', 'E-Wallet', 'Bank Transfer'];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DANGER = '#E53935';

// Keep an order's stored value selectable even when it is not a preset option.
const withCurrentOption = (options, current) => (current && !options.includes(current) ? [current, ...options] : options);

const toISODate = (raw) => {
  const d = parseDeliveryDate(raw);
  if (!d) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const buildForm = (order) => {
  const form = {
    order_date: toISODate(order?.order_date),
    expected_delivery: toISODate(order?.expected_delivery),
    order_quantity: Number(order?.order_quantity) >= 1 ? Number(order.order_quantity) : 1,
  };
  EDITABLE_ORDER_FIELDS.forEach((field) => {
    form[field] = order?.[field] ?? '';
  });
  form.cellphone = normalizePhMobile(form.cellphone);
  return form;
};

function DateButton({ label, value, onPress, error, colors }) {
  return (
    <View style={styles.flex1}>
      <FieldLabel label={label} required colors={colors} />
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

export default function EditOrderScreen({ navigation }) {
  const { colors, darkMode } = useTheme();
  const { order } = useRoute().params || {};

  const initialForm = useMemo(() => buildForm(order), [order]);
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [datePicker, setDatePicker] = useState(null);
  const [saving, setSaving] = useState(false);

  const isDirty = JSON.stringify(form) !== JSON.stringify(initialForm);
  const tone = statusTone(order?.status);

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => (prev[key] || prev.contact ? { ...prev, [key]: null, contact: null } : prev));
  };

  const validate = () => {
    const next = {};
    if (!String(form.name).trim()) next.name = 'Name is required';
    if (!String(form.shipped_to).trim()) next.shipped_to = 'Receiver name is required';
    if (!String(form.shipping_address).trim()) next.shipping_address = 'Shipping address is required';
    if (!form.order_date) next.order_date = 'Order date is required';
    if (!form.expected_delivery) next.expected_delivery = 'Expected delivery is required';
    const email = String(form.email_address).trim();
    if (!email && !form.cellphone) next.contact = 'Provide at least an email address or a mobile number';
    if (email && !EMAIL_REGEX.test(email)) next.email_address = 'Enter a valid email address';
    const cellError = phMobileError(form.cellphone);
    if (cellError) next.cellphone = cellError;
    const boxCount = Number(form.order_quantity);
    if (!Number.isInteger(boxCount) || boxCount < 1) next.order_quantity = 'Total boxes is required. Every order needs at least 1 box.';
    setErrors(next);
    return next;
  };

  const save = async () => {
    const found = Object.values(validate());
    if (found.length) {
      Alert.alert('Check the order', found.join('\n'));
      return;
    }
    const payload = {
      order_date: form.order_date,
      expected_delivery: form.expected_delivery,
      order_quantity: Number(form.order_quantity),
    };
    EDITABLE_ORDER_FIELDS.forEach((field) => {
      const value = form[field];
      payload[field] = typeof value === 'string' ? value.trim() : value;
    });

    setSaving(true);
    try {
      await orderAPI.updateOrder(order.order_id, payload);
      Alert.alert('Order updated', `Order ${order.order_id} was updated.`, [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (error) {
      Alert.alert('Error', `Failed to update order. ${error.response?.data?.error || error.response?.data?.message || error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    if (!isDirty || saving) {
      navigation.goBack();
      return;
    }
    Alert.alert('Discard changes?', 'You have unsaved changes to this order.', [
      { text: 'Keep Editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => navigation.goBack() },
    ]);
  };

  if (!order) {
    return (
      <View style={[styles.flex1, styles.centered, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text }}>Order not found.</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.flex1} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.flex1, { backgroundColor: colors.background }]}>
        <ScreenHeader title="Edit Order" subtitle={order.order_id} onBack={handleBack} colors={colors} />

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={[styles.summary, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.flex1}>
              <Text style={[styles.summaryLabel, { color: colors.subText }]}>Order total</Text>
              <Text style={[styles.summaryValue, { color: colors.text }]}>{peso(orderTotal(order))}</Text>
            </View>
            <View style={[styles.statusPill, { backgroundColor: `${tone}1F` }]}>
              <Text style={[styles.statusText, { color: tone }]}>{(order.status || '-').toUpperCase()}</Text>
            </View>
          </View>
          <Text style={[styles.hint, { color: colors.subText }]}>
            Status changes go through Confirm Order, Confirm Delivery, Complete Order or Cancel Order on the order screen.
          </Text>

          <FormSection title="Customer & receiver" icon="account-outline" colors={colors}>
            <FormField label="Name" required icon="account-outline" value={form.name} onChangeText={(v) => setField('name', v)} error={errors.name} colors={colors} />
            <FormField label="Account name" icon="card-account-details-outline" value={form.account_name} onChangeText={(v) => setField('account_name', v)} colors={colors} />
            <FormField label="Receiver name" required icon="account-arrow-right-outline" value={form.shipped_to} onChangeText={(v) => setField('shipped_to', v)} error={errors.shipped_to} colors={colors} />
            <FormField
              label="Email address"
              icon="email-outline"
              value={form.email_address}
              onChangeText={(v) => setField('email_address', v)}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              error={errors.email_address}
              colors={colors}
            />
            <PhoneField value={form.cellphone} onChangeText={(v) => setField('cellphone', v)} error={errors.cellphone} colors={colors} />
            {!!errors.contact && <Text style={[styles.errorText, styles.contactError]}>{errors.contact}</Text>}
            <FormField
              label="Telephone"
              icon="phone-classic"
              value={form.telephone}
              onChangeText={(v) => setField('telephone', v.replace(/[^\d\s()-]/g, '').slice(0, 15))}
              keyboardType="phone-pad"
              placeholder="Optional"
              colors={colors}
            />
            <FormField
              label="Shipping address"
              required
              value={form.shipping_address}
              onChangeText={(v) => setField('shipping_address', v)}
              multiline
              error={errors.shipping_address}
              colors={colors}
              containerStyle={styles.noGap}
            />
          </FormSection>

          <FormSection title="Order" icon="clipboard-text-outline" colors={colors}>
            <View style={styles.row}>
              <DateButton label="Order date" value={form.order_date} onPress={() => setDatePicker('order_date')} error={errors.order_date} colors={colors} />
              <DateButton label="Expected delivery" value={form.expected_delivery} onPress={() => setDatePicker('expected_delivery')} error={errors.expected_delivery} colors={colors} />
            </View>

            <View style={styles.topGap}>
              <FieldLabel label="Total boxes" required colors={colors} />
              <Stepper value={form.order_quantity} onChange={(v) => setField('order_quantity', v)} min={1} max={9999} colors={colors} />
              {errors.order_quantity ? (
                <Text style={styles.errorText}>{errors.order_quantity}</Text>
              ) : (
                <Text style={[styles.hint, styles.topGapSm, { color: colors.subText }]}>Physical boxes in this shipment. At least 1.</Text>
              )}
            </View>

            <View style={styles.topGap}>
              <FieldLabel label="Package" colors={colors} />
              <ChipGroup options={withCurrentOption(PACKAGE_OPTIONS, form.package_name)} value={form.package_name} onChange={(v) => setField('package_name', v)} colors={colors} />
            </View>
          </FormSection>

          <FormSection title="Payment" icon="cash-multiple" colors={colors}>
            <FieldLabel label="Payment type" colors={colors} />
            <ChipGroup options={withCurrentOption(PAYMENT_TYPES, form.payment_type)} value={form.payment_type} onChange={(v) => setField('payment_type', v)} colors={colors} />
            <View style={styles.topGap}>
              <FieldLabel label="Payment method" colors={colors} />
              <ChipGroup options={withCurrentOption(PAYMENT_METHODS, form.payment_method)} value={form.payment_method} onChange={(v) => setField('payment_method', v)} colors={colors} />
            </View>
          </FormSection>

          <FormSection title="Remarks" icon="note-text-outline" colors={colors}>
            <FormField value={form.remarks} onChangeText={(v) => setField('remarks', v)} placeholder="Optional notes" multiline colors={colors} containerStyle={styles.noGap} />
          </FormSection>
        </ScrollView>

        <BottomActions colors={colors}>
          <ActionButton label="Cancel" variant="outline" onPress={handleBack} disabled={saving} colors={colors} />
          <ActionButton label="Save" icon="content-save-outline" onPress={save} loading={saving} disabled={!isDirty} colors={colors} />
        </BottomActions>
      </View>

      <DatePickerModal
        visible={!!datePicker}
        onClose={() => setDatePicker(null)}
        onSelect={(iso) => {
          setField(datePicker, iso);
          setDatePicker(null);
        }}
        selectedDate={datePicker ? form[datePicker] || undefined : undefined}
        minDate="2020-01-01"
        darkMode={darkMode}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  centered: { alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, paddingBottom: 32 },
  row: { flexDirection: 'row', gap: 10 },
  topGap: { marginTop: 14 },
  topGapSm: { marginTop: 6 },
  noGap: { marginBottom: 0 },
  hint: { fontSize: 12, lineHeight: 17, marginBottom: 14 },
  errorText: { color: DANGER, fontSize: 12, marginTop: 5 },
  contactError: { marginTop: -8, marginBottom: 12 },
  summary: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 8 },
  summaryLabel: { fontSize: 12, fontWeight: '600' },
  summaryValue: { fontSize: 20, fontWeight: '800', marginTop: 2 },
  statusPill: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  statusText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.4 },
  dateBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, minHeight: 46 },
  dateText: { flex: 1, fontSize: 14, fontWeight: '600' },
});
