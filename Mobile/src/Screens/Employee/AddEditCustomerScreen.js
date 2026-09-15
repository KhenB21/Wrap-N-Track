import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRoute } from '@react-navigation/native';
import { useTheme } from '../../Context/ThemeContext';
import { customerAPI } from '../../services/api';
import StatusFeedback from '../../Components/StatusFeedback';
import {
  ActionButton,
  BottomActions,
  FormField,
  FormSection,
  PhoneField,
  ScreenHeader,
  Segmented,
} from '../../Components/FormKit';
import { normalizePhMobile, phMobileError } from '../../constants/phone';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const buildInitialState = (customer) => ({
  name: customer?.name || '',
  email_address: customer?.email_address || '',
  cellphone: normalizePhMobile(customer?.cellphone || customer?.phone_number || ''),
  telephone: customer?.telephone || '',
  address: customer?.address || '',
  status: customer?.status || 'active',
});

const initialsOf = (name) =>
  String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');

const peso = (value) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 2 }).format(Number(value) || 0);

export default function AddEditCustomerScreen({ navigation }) {
  const { colors } = useTheme();
  const route = useRoute();
  const { customer, mode = 'add' } = route.params || {};
  const isEditMode = mode === 'edit';

  const initialState = useMemo(() => buildInitialState(customer), [customer]);
  const [formData, setFormData] = useState(initialState);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null); // { phase: 'updating'|'success'|'error', message }

  const isDirty = useMemo(() => JSON.stringify(formData) !== JSON.stringify(initialState), [formData, initialState]);

  const setField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: null }));
  };

  // Flag a wrong prefix or a complete-but-invalid number as soon as it is typed,
  // instead of waiting for Save.
  const liveCellError = (() => {
    const digits = formData.cellphone;
    if (digits.length >= 2 && !digits.startsWith('09')) return phMobileError(digits);
    return null;
  })();

  const validateForm = () => {
    const next = {};
    if (!formData.name.trim()) next.name = 'Full name is required';
    if (!formData.email_address.trim()) {
      next.email_address = 'Email address is required';
    } else if (!EMAIL_REGEX.test(formData.email_address.trim())) {
      next.email_address = 'Enter a valid email address';
    }
    const cellError = phMobileError(formData.cellphone, { required: true });
    if (cellError) next.cellphone = cellError;
    if (!formData.address.trim()) next.address = 'Shipping address is required';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleCancel = () => {
    if (!isDirty) {
      navigation.goBack();
      return;
    }
    Alert.alert('Discard changes?', 'You have unsaved changes. Leave without saving?', [
      { text: 'Keep Editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => navigation.goBack() },
    ]);
  };

  const handleSubmit = async () => {
    if (loading) return;
    if (!validateForm()) {
      setFeedback({ phase: 'error', message: 'Please fix the highlighted fields before saving.' });
      return;
    }

    const statusChanged = isEditMode && formData.status !== initialState.status;
    const payload = {
      name: formData.name.trim(),
      email_address: formData.email_address.trim(),
      cellphone: formData.cellphone,
      telephone: formData.telephone.trim() || null,
      address: formData.address.trim(),
      status: formData.status,
    };

    setLoading(true);
    setFeedback({ phase: 'updating', message: statusChanged ? 'Updating customer status...' : 'Saving customer...' });
    try {
      if (isEditMode) {
        await customerAPI.updateManagedCustomer(customer.customer_id, payload);
      } else {
        await customerAPI.addCustomer(payload);
      }
      const message = statusChanged
        ? `Customer is now ${formData.status === 'active' ? 'Active' : 'Inactive'}.`
        : isEditMode
          ? 'Customer updated successfully.'
          : 'Customer added successfully.';
      setFeedback({ phase: 'success', message });
      setTimeout(() => {
        setFeedback(null);
        navigation.goBack();
      }, 1200);
    } catch (error) {
      const message =
        error.response?.data?.message ||
        error.response?.data?.error ||
        (error.response ? `Failed to ${isEditMode ? 'update' : 'add'} customer` : 'Network error. Check your connection and try again.');
      setFeedback({ phase: 'error', message });
    } finally {
      setLoading(false);
    }
  };

  const initials = initialsOf(formData.name);
  const isActive = formData.status === 'active';

  return (
    <KeyboardAvoidingView style={styles.flex1} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.flex1, { backgroundColor: colors.background }]}>
        <ScreenHeader
          title={isEditMode ? 'Edit Customer' : 'New Customer'}
          subtitle={isEditMode ? customer?.customer_id && `Customer #${customer.customer_id}` : 'Add a customer to use in orders'}
          onBack={handleCancel}
          colors={colors}
        />

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {/* ── Identity card ─────────────────────────────────────────── */}
          <View style={[styles.identity, { backgroundColor: colors.primary }]}>
            <View style={styles.avatar}>
              {initials ? (
                <Text style={styles.avatarText}>{initials}</Text>
              ) : (
                <MaterialCommunityIcons name="account-plus-outline" size={30} color="#fff" />
              )}
            </View>
            <View style={styles.flex1}>
              <Text style={styles.identityName} numberOfLines={1}>
                {formData.name.trim() || (isEditMode ? 'Customer' : 'New customer')}
              </Text>
              <Text style={styles.identityMeta} numberOfLines={1}>
                {formData.email_address.trim() || 'No email yet'}
              </Text>
              <View style={[styles.statusPill, { backgroundColor: isActive ? 'rgba(76,175,80,0.25)' : 'rgba(255,152,0,0.25)' }]}>
                <View style={[styles.statusDot, { backgroundColor: isActive ? '#81C784' : '#FFB74D' }]} />
                <Text style={styles.statusPillText}>{isActive ? 'Active' : 'Inactive'}</Text>
              </View>
            </View>
          </View>

          {isEditMode && (
            <View style={styles.statsRow}>
              {[
                { label: 'Orders', value: String(customer?.order_count ?? customer?.total_orders ?? 0), icon: 'receipt-text-outline' },
                { label: 'Total spent', value: peso(customer?.total_spent), icon: 'cash-multiple' },
                {
                  label: 'Since',
                  value: customer?.created_at ? new Date(customer.created_at).toLocaleDateString('en-PH', { month: 'short', year: 'numeric' }) : '-',
                  icon: 'calendar-account-outline',
                },
              ].map((stat) => (
                <View key={stat.label} style={[styles.stat, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <MaterialCommunityIcons name={stat.icon} size={18} color={colors.primary} />
                  <Text style={[styles.statValue, { color: colors.text }]} numberOfLines={1}>{stat.value}</Text>
                  <Text style={[styles.statLabel, { color: colors.subText }]}>{stat.label}</Text>
                </View>
              ))}
            </View>
          )}

          {/* ── Contact ───────────────────────────────────────────────── */}
          <FormSection title="Contact details" icon="card-account-details-outline" colors={colors}>
            <FormField
              label="Full name"
              required
              icon="account-outline"
              value={formData.name}
              onChangeText={(v) => setField('name', v)}
              placeholder="Juan Dela Cruz"
              autoCapitalize="words"
              error={errors.name}
              colors={colors}
            />
            <FormField
              label="Email address"
              required
              icon="email-outline"
              value={formData.email_address}
              onChangeText={(v) => setField('email_address', v)}
              placeholder="name@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              error={errors.email_address}
              colors={colors}
            />
            <PhoneField
              label="Mobile number"
              required
              value={formData.cellphone}
              onChangeText={(v) => setField('cellphone', v)}
              error={errors.cellphone || liveCellError}
              colors={colors}
            />
            <FormField
              label="Telephone"
              icon="phone-classic"
              value={formData.telephone}
              onChangeText={(v) => setField('telephone', v.replace(/[^\d\s()-]/g, '').slice(0, 15))}
              placeholder="Optional landline, e.g. (02) 8123 4567"
              keyboardType="phone-pad"
              helper="Optional"
              colors={colors}
              containerStyle={styles.lastField}
            />
          </FormSection>

          {/* ── Delivery ──────────────────────────────────────────────── */}
          <FormSection title="Shipping address" icon="map-marker-outline" description="Used as the default delivery address for this customer's orders." colors={colors}>
            <FormField
              value={formData.address}
              onChangeText={(v) => setField('address', v)}
              placeholder="House no., street, barangay, city, province"
              multiline
              error={errors.address}
              colors={colors}
              containerStyle={styles.lastField}
            />
          </FormSection>

          {/* ── Status ────────────────────────────────────────────────── */}
          <FormSection title="Account status" icon="toggle-switch-outline" description="Inactive customers stay on record and can be reactivated anytime." colors={colors}>
            <Segmented
              value={formData.status}
              onChange={(v) => setField('status', v)}
              colors={colors}
              options={[
                { value: 'active', label: 'Active', icon: 'check-circle-outline', tone: '#2E7D32' },
                { value: 'inactive', label: 'Inactive', icon: 'pause-circle-outline', tone: '#EF6C00' },
              ]}
            />
          </FormSection>
        </ScrollView>

        <BottomActions colors={colors}>
          <ActionButton label="Cancel" variant="outline" onPress={handleCancel} disabled={loading} colors={colors} />
          <ActionButton
            label={isEditMode ? 'Save Changes' : 'Add Customer'}
            icon={isEditMode ? 'content-save-outline' : 'account-plus-outline'}
            onPress={handleSubmit}
            loading={loading}
            disabled={!isDirty}
            colors={colors}
          />
        </BottomActions>
      </View>
      <StatusFeedback phase={feedback?.phase} message={feedback?.message} onDismiss={() => setFeedback(null)} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 22, fontWeight: '700' },
  identityName: { color: '#fff', fontSize: 18, fontWeight: '700' },
  identityMeta: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 2 },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginTop: 8,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusPillText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  stat: { flex: 1, borderWidth: 1, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 8, alignItems: 'center', gap: 2 },
  statValue: { fontSize: 14, fontWeight: '700', marginTop: 2 },
  statLabel: { fontSize: 11 },
  lastField: { marginBottom: 0 },
});
