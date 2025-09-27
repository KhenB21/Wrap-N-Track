import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  TextInput
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Button, Card, RadioButton } from 'react-native-paper';
import { useTheme } from '../../Context/ThemeContext';
import { useRoute } from '@react-navigation/native';

export default function AddEditCustomerScreen({ navigation }) {
  const theme = useTheme();
  const route = useRoute();
  const { customer, mode = 'add' } = route.params;

  const [formData, setFormData] = useState({
    name: customer?.name || '',
    email_address: customer?.email_address || '',
    phone_number: customer?.phone_number || '',
    status: customer?.status || 'active'
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const isEditMode = mode === 'edit';

  useEffect(() => {
    if (isEditMode) {
      navigation.setOptions({ title: 'Edit Customer' });
    } else {
      navigation.setOptions({ title: 'Add Customer' });
    }
  }, [isEditMode]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) newErrors.name = 'Customer name is required';
    if (!formData.email_address.trim()) {
      newErrors.email_address = 'Email address is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email_address)) {
      newErrors.email_address = 'Please enter a valid email address';
    }
    if (!formData.phone_number.trim()) {
      newErrors.phone_number = 'Phone number is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);
      // Implement API call to add/edit customer
      const action = isEditMode ? 'Customer updated' : 'Customer added';
      Alert.alert('Success', `${action} successfully`, [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      Alert.alert('Error', `Failed to ${isEditMode ? 'update' : 'add'} customer`);
    } finally {
      setLoading(false);
    }
  };

  const handleImagePicker = () => {
    Alert.alert('Image Picker', 'Camera/Gallery functionality would be implemented here');
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Profile Image */}
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
              Profile Image
            </Text>
            <View style={styles.imageContainer}>
              <View style={[styles.avatarContainer, { backgroundColor: theme.colors.primary }]}>
                <MaterialCommunityIcons name="account" size={48} color="#fff" />
              </View>
              <Button
                mode="outlined"
                onPress={handleImagePicker}
                style={styles.imageButton}
              >
                {customer?.profile_picture_data ? 'Change Image' : 'Add Image'}
              </Button>
            </View>
          </Card.Content>
        </Card>

        {/* Basic Information */}
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
              Basic Information
            </Text>
            
            <TextInput
              label="Full Name *"
              value={formData.name}
              onChangeText={(value) => handleInputChange('name', value)}
              error={!!errors.name}
              style={styles.input}
            />
            {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}

            <TextInput
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
              label="Phone Number *"
              value={formData.phone_number}
              onChangeText={(value) => handleInputChange('phone_number', value)}
              keyboardType="phone-pad"
              error={!!errors.phone_number}
              style={styles.input}
            />
            {errors.phone_number && <Text style={styles.errorText}>{errors.phone_number}</Text>}
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
                <RadioButton value="active" />
              </View>
              <View style={styles.statusOption}>
                <View style={styles.statusOptionContent}>
                  <MaterialCommunityIcons name="pause-circle" size={20} color="#F57C00" />
                  <Text style={[styles.statusLabel, { color: theme.colors.onSurface }]}>
                    Inactive
                  </Text>
                </View>
                <RadioButton value="inactive" />
              </View>
            </RadioButton.Group>
          </Card.Content>
        </Card>

        {/* Additional Information */}
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
                {customer?.customer_id || 'Auto-generated'}
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
                {customer?.total_orders || 0}
              </Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: theme.colors.onSurfaceVariant }]}>
                Total Spent:
              </Text>
              <Text style={[styles.infoValue, { color: theme.colors.onSurface }]}>
                {customer?.total_spent ? 
                  new Intl.NumberFormat('en-PH', {
                    style: 'currency',
                    currency: 'PHP',
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  }).format(customer.total_spent) : '₱0.00'
                }
              </Text>
            </View>
          </Card.Content>
        </Card>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <Button
          mode="outlined"
          onPress={() => navigation.goBack()}
          style={styles.actionButton}
        >
          Cancel
        </Button>
        <Button
          mode="contained"
          onPress={handleSubmit}
          loading={loading}
          disabled={loading}
          style={[styles.actionButton, { backgroundColor: theme.colors.primary }]}
        >
          {isEditMode ? 'Update Customer' : 'Add Customer'}
        </Button>
      </View>
    </View>
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
  imageContainer: {
    alignItems: 'center',
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  imageButton: {
    marginTop: 8,
  },
  input: {
    marginBottom: 8,
  },
  errorText: {
    color: '#F44336',
    fontSize: 12,
    marginBottom: 8,
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
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
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
