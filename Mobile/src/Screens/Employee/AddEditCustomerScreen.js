import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Button, Card, RadioButton, TextInput } from 'react-native-paper';
import { useTheme } from '../../Context/ThemeContext';
import { useRoute } from '@react-navigation/native';
import { customerAPI } from '../../services/api';
import StatusFeedback from '../../Components/StatusFeedback';

// Matches Website/client/src/Pages/Customers/CustomerModal.js — keep frontend/backend contract in sync.
const PH_MOBILE_REGEX = /^(\+639|639|09)\d{9}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const buildInitialState = (customer) => ({
  name: customer?.name || '',
  email_address: customer?.email_address || '',
  cellphone: customer?.cellphone || customer?.phone_number || '',
  telephone: customer?.telephone || '',
  address: customer?.address || '',
  status: customer?.status || 'active'
});

export default function AddEditCustomerScreen({ navigation }) {
  const theme = useTheme();
  const route = useRoute();
  const { customer, mode = 'add' } = route.params || {};

  const initialState = useMemo(() => buildInitialState(customer), [customer]);
  const [formData, setFormData] = useState(initialState);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [feedback, setFeedback] = useState(null); // { phase: 'updating'|'success'|'error', message }

  const isEditMode = mode === 'edit';
  const isDirty = useMemo(
    () => JSON.stringify(formData) !== JSON.stringify(initialState),
    [formData, initialState]
  );

  useEffect(() => {
    navigation.setOptions({ title: isEditMode ? 'Edit Customer' : 'Add Customer' });
  }, [isEditMode]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) newErrors.name = 'Full name is required';

    if (!formData.email_address.trim()) {
      newErrors.email_address = 'Email address is required';
    } else if (!EMAIL_REGEX.test(formData.email_address.trim())) {
      newErrors.email_address = 'Please enter a valid email address';
    }

    const normalizedCell = formData.cellphone.trim().replace(/[\s-]/g, '');
    if (!normalizedCell) {
      newErrors.cellphone = 'Cellphone number is required';
    } else if (!PH_MOBILE_REGEX.test(normalizedCell)) {
      newErrors.cellphone = 'Use a valid PH mobile number (e.g. 09XXXXXXXXX)';
    }

    if (!formData.address.trim()) {
      newErrors.address = 'Shipping address is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCancel = () => {
    if (!isDirty) {
      navigation.goBack();
      return;
    }
    Alert.alert(
      'Discard changes?',
      'You have unsaved changes. Are you sure you want to leave without saving?',
      [
        { text: 'Keep Editing', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: () => navigation.goBack() }
      ]
    );
  };

  const handleSubmit = async () => {
    if (loading) return;
    if (!validateForm()) {
      // validateForm() re-checks every field, not just the ones the user
      // touched — a pre-existing customer record that no longer matches the
      // current strict format (e.g. an old phone/email format) would
      // otherwise fail here silently, with no API call and no visible error,
      // which reads as "nothing happened / didn't save."
      setFeedback({
        phase: 'error',
        message: 'Please fix the highlighted fields above before saving.'
      });
      return;
    }

    const statusChanged = isEditMode && formData.status !== initialState.status;
    const payload = {
      name: formData.name.trim(),
      email_address: formData.email_address.trim(),
      cellphone: formData.cellphone.trim().replace(/[\s-]/g, ''),
      telephone: formData.telephone.trim() || null,
      address: formData.address.trim(),
      status: formData.status
    };

    setLoading(true);
    setFeedback({
      phase: 'updating',
      message: statusChanged ? 'Updating customer status...' : 'Saving customer...'
    });

    try {
      if (isEditMode) {
        await customerAPI.updateManagedCustomer(customer.customer_id, payload);
      } else {
        await customerAPI.addCustomer(payload);
      }

      const successMessage = statusChanged
        ? `Customer is now ${formData.status === 'active' ? 'Active' : 'Inactive'}.`
        : isEditMode
          ? 'Customer updated successfully.'
          : 'Customer added successfully.';

      setFeedback({ phase: 'success', message: successMessage });
      setTimeout(() => {
        setFeedback(null);
        navigation.goBack();
      }, 1200);
    } catch (error) {
      // Backend update failed — formData.status was never persisted, so the
      // displayed radio selection simply reverts to what's on screen already
      // (no optimistic UI to roll back); we just surface the failure.
      const message =
        error.response?.data?.message ||
        error.response?.data?.error ||
        (error.response
          ? `Failed to ${isEditMode ? 'update' : 'add'} customer`
          : 'Network error — check your connection and try again');
      setFeedback({ phase: 'error', message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Basic Information */}
          <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <Card.Content>
              <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
                Basic Information
              </Text>

              <TextInput
                mode="outlined"
                label="Full Name *"
                value={formData.name}
                onChangeText={(value) => handleInputChange('name', value)}
                error={!!errors.name}
                style={styles.input}
              />
              {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}

              <TextInput
                mode="outlined"
                label="Email Address *"
                value={formData.email_address}
                onChangeText={(value) => handleInputChange('email_address', value)}
                keyboardType="email-address"
                autoCapitalize="none"
                error={!!errors.email_address}
                style={styles.input}
              />
              {errors.email_address && <Text style={styles.errorText}>{errors.email_address}</Text>}

              <TextInput
                mode="outlined"
                label="Cellphone *"
                placeholder="09XXXXXXXXX"
                value={formData.cellphone}
                onChangeText={(value) => handleInputChange('cellphone', value)}
                keyboardType="phone-pad"
                error={!!errors.cellphone}
                style={styles.input}
              />
              {errors.cellphone && <Text style={styles.errorText}>{errors.cellphone}</Text>}

              <TextInput
                mode="outlined"
                label="Telephone (optional)"
                value={formData.telephone}
                onChangeText={(value) => handleInputChange('telephone', value)}
                keyboardType="phone-pad"
                style={styles.input}
              />

              <TextInput
                mode="outlined"
                label="Shipping Address *"
                value={formData.address}
                onChangeText={(value) => handleInputChange('address', value)}
                multiline
                numberOfLines={3}
                error={!!errors.address}
                style={[styles.input, styles.multilineInput]}
              />
              {errors.address && <Text style={styles.errorText}>{errors.address}</Text>}
            </Card.Content>
          </Card>

          {/* Status */}
          <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <Card.Content>
              <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
                Status
              </Text>

              <RadioButton.Group onValueChange={(value) => handleInputChange('status', value)} value={formData.status}>
                <View style={styles.statusOption}>
                  <View style={styles.statusOptionContent}>
                    <MaterialCommunityIcons name="check-circle" size={20} color="#4CAF50" />
                    <Text style={[styles.statusLabel, { color: theme.colors.onSurface }]}>
                      Active
                    </Text>
                  </View>
                  <RadioButton value="active" disabled={loading} />
                </View>
                <View style={styles.statusOption}>
                  <View style={styles.statusOptionContent}>
                    <MaterialCommunityIcons name="pause-circle" size={20} color="#F57C00" />
                    <Text style={[styles.statusLabel, { color: theme.colors.onSurface }]}>
                      Inactive
                    </Text>
                  </View>
                  <RadioButton value="inactive" disabled={loading} />
                </View>
              </RadioButton.Group>
            </Card.Content>
          </Card>

          {/* Additional Information (edit mode only) */}
          {isEditMode && (
            <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
              <Card.Content>
                <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
                  Additional Information
                </Text>

                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: theme.colors.onSurfaceVariant }]}>
                    Customer ID:
                  </Text>
                  <Text style={[styles.infoValue, { color: theme.colors.onSurface }]}>
                    {customer?.customer_id || 'N/A'}
                  </Text>
                </View>

                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: theme.colors.onSurfaceVariant }]}>
                    Created:
                  </Text>
                  <Text style={[styles.infoValue, { color: theme.colors.onSurface }]}>
                    {customer?.created_at ? new Date(customer.created_at).toLocaleDateString() : 'N/A'}
                  </Text>
                </View>

                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: theme.colors.onSurfaceVariant }]}>
                    Total Orders:
                  </Text>
                  <Text style={[styles.infoValue, { color: theme.colors.onSurface }]}>
                    {customer?.order_count ?? customer?.total_orders ?? 0}
                  </Text>
                </View>

                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: theme.colors.onSurfaceVariant }]}>
                    Total Spent:
                  </Text>
                  <Text style={[styles.infoValue, { color: theme.colors.onSurface }]}>
                    {new Intl.NumberFormat('en-PH', {
                      style: 'currency',
                      currency: 'PHP',
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    }).format(customer?.total_spent || 0)}
                  </Text>
                </View>
              </Card.Content>
            </Card>
          )}

          <View style={{ height: 8 }} />
        </ScrollView>

        {/* Action Buttons */}
        <View style={[styles.actionButtons, { backgroundColor: theme.colors.surface }]}>
          <Button
            mode="outlined"
            onPress={handleCancel}
            disabled={loading}
            style={styles.actionButton}
          >
            Cancel
          </Button>
          <Button
            mode="contained"
            onPress={handleSubmit}
            loading={loading}
            disabled={loading || !isDirty}
            style={[styles.actionButton, { backgroundColor: theme.colors.primary }]}
          >
            {isEditMode ? 'Save Changes' : 'Add Customer'}
          </Button>
        </View>
      </View>
      <StatusFeedback
        phase={feedback?.phase}
        message={feedback?.message}
        onDismiss={() => setFeedback(null)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  card: {
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  input: {
    marginBottom: 8,
  },
  multilineInput: {
    minHeight: 80,
  },
  errorText: {
    color: '#F44336',
    fontSize: 12,
    marginBottom: 8,
    marginTop: -4,
  },
  statusOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  statusOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusLabel: {
    fontSize: 16,
    marginLeft: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 14,
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  actionButtons: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  actionButton: {
    flex: 1,
  },
});
