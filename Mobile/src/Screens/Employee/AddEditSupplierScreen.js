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

export default function AddEditSupplierScreen({ navigation }) {
  const theme = useTheme();
  const route = useRoute();
  const { supplier, mode = 'add' } = route.params;

  const [formData, setFormData] = useState({
    name: supplier?.name || '',
    contact_person: supplier?.contact_person || '',
    cellphone: supplier?.cellphone || '',
    telephone: supplier?.telephone || '',
    email_address: supplier?.email_address || '',
    street_address: supplier?.street_address || '',
    barangay: supplier?.barangay || '',
    city_municipality: supplier?.city_municipality || '',
    province: supplier?.province || '',
    type_of_supplies: supplier?.type_of_supplies || '',
    description: supplier?.description || '',
    reliability_score: supplier?.reliability_score?.toString() || '5.0'
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const isEditMode = mode === 'edit';

  const supplyTypes = [
    'Packaging Materials',
    'Gift Wrapping',
    'Wedding Supplies',
    'Corporate Supplies',
    'Bespoke Materials',
    'Other'
  ];

  const provinces = [
    'Metro Manila',
    'Cavite',
    'Laguna',
    'Batangas',
    'Rizal',
    'Quezon',
    'Bulacan',
    'Pampanga',
    'Other'
  ];

  useEffect(() => {
    if (isEditMode) {
      navigation.setOptions({ title: 'Edit Supplier' });
    } else {
      navigation.setOptions({ title: 'Add Supplier' });
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
    
    if (!formData.name.trim()) newErrors.name = 'Supplier name is required';
    if (!formData.contact_person.trim()) newErrors.contact_person = 'Contact person is required';
    if (!formData.email_address.trim()) {
      newErrors.email_address = 'Email address is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email_address)) {
      newErrors.email_address = 'Please enter a valid email address';
    }
    if (!formData.cellphone.trim()) newErrors.cellphone = 'Cellphone number is required';
    if (!formData.street_address.trim()) newErrors.street_address = 'Street address is required';
    if (!formData.city_municipality.trim()) newErrors.city_municipality = 'City/Municipality is required';
    if (!formData.province.trim()) newErrors.province = 'Province is required';
    if (!formData.type_of_supplies.trim()) newErrors.type_of_supplies = 'Type of supplies is required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);
      // Implement API call to add/edit supplier
      const action = isEditMode ? 'Supplier updated' : 'Supplier added';
      Alert.alert('Success', `${action} successfully`, [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      Alert.alert('Error', `Failed to ${isEditMode ? 'update' : 'add'} supplier`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Basic Information */}
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
              Basic Information
            </Text>
            
            <TextInput
              label="Supplier Name *"
              value={formData.name}
              onChangeText={(value) => handleInputChange('name', value)}
              error={!!errors.name}
              style={styles.input}
            />
            {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}

            <TextInput
              label="Contact Person *"
              value={formData.contact_person}
              onChangeText={(value) => handleInputChange('contact_person', value)}
              error={!!errors.contact_person}
              style={styles.input}
            />
            {errors.contact_person && <Text style={styles.errorText}>{errors.contact_person}</Text>}

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
              label="Cellphone *"
              value={formData.cellphone}
              onChangeText={(value) => handleInputChange('cellphone', value)}
              keyboardType="phone-pad"
              error={!!errors.cellphone}
              style={styles.input}
            />
            {errors.cellphone && <Text style={styles.errorText}>{errors.cellphone}</Text>}

            <TextInput
              label="Telephone"
              value={formData.telephone}
              onChangeText={(value) => handleInputChange('telephone', value)}
              keyboardType="phone-pad"
              style={styles.input}
            />
          </Card.Content>
        </Card>

        {/* Address Information */}
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
              Address Information
            </Text>
            
            <TextInput
              label="Street Address *"
              value={formData.street_address}
              onChangeText={(value) => handleInputChange('street_address', value)}
              error={!!errors.street_address}
              style={styles.input}
            />
            {errors.street_address && <Text style={styles.errorText}>{errors.street_address}</Text>}

            <TextInput
              label="Barangay"
              value={formData.barangay}
              onChangeText={(value) => handleInputChange('barangay', value)}
              style={styles.input}
            />

            <TextInput
              label="City/Municipality *"
              value={formData.city_municipality}
              onChangeText={(value) => handleInputChange('city_municipality', value)}
              error={!!errors.city_municipality}
              style={styles.input}
            />
            {errors.city_municipality && <Text style={styles.errorText}>{errors.city_municipality}</Text>}

            <TextInput
              label="Province *"
              value={formData.province}
              onChangeText={(value) => handleInputChange('province', value)}
              error={!!errors.province}
              style={styles.input}
            />
            {errors.province && <Text style={styles.errorText}>{errors.province}</Text>}
          </Card.Content>
        </Card>

        {/* Business Information */}
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
              Business Information
            </Text>
            
            <TextInput
              label="Type of Supplies *"
              value={formData.type_of_supplies}
              onChangeText={(value) => handleInputChange('type_of_supplies', value)}
              error={!!errors.type_of_supplies}
              style={styles.input}
            />
            {errors.type_of_supplies && <Text style={styles.errorText}>{errors.type_of_supplies}</Text>}

            <TextInput
              label="Description"
              value={formData.description}
              onChangeText={(value) => handleInputChange('description', value)}
              multiline
              numberOfLines={3}
              style={styles.input}
            />

            <TextInput
              label="Reliability Score"
              value={formData.reliability_score}
              onChangeText={(value) => handleInputChange('reliability_score', value)}
              keyboardType="numeric"
              style={styles.input}
            />
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
                Supplier ID:
              </Text>
              <Text style={[styles.infoValue, { color: theme.colors.onSurface }]}>
                {supplier?.supplier_id || 'Auto-generated'}
              </Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: theme.colors.onSurfaceVariant }]}>
                Total Products:
              </Text>
              <Text style={[styles.infoValue, { color: theme.colors.onSurface }]}>
                {supplier?.total_products || 0}
              </Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: theme.colors.onSurfaceVariant }]}>
                Last Order:
              </Text>
              <Text style={[styles.infoValue, { color: theme.colors.onSurface }]}>
                {supplier?.last_order_date ? 
                  new Date(supplier.last_order_date).toLocaleDateString() : 'N/A'
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
          {isEditMode ? 'Update Supplier' : 'Add Supplier'}
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
  input: {
    marginBottom: 8,
  },
  errorText: {
    color: '#F44336',
    fontSize: 12,
    marginBottom: 8,
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
