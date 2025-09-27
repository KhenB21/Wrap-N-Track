import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  Image,
  TouchableOpacity,
  TextInput
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Button, Card } from 'react-native-paper';
import { useTheme } from '../../Context/ThemeContext';

export default function AddProductScreen({ navigation }) {
  const theme = useTheme();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    unit_price: '',
    category: '',
    quantity: '',
    uom: '',
    conversion_qty: '',
    reorder_level: '',
    supplier_name: '',
    supplier_phone: '',
    supplier_website: '',
    expiration: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const categories = [
    'Wedding', 'Corporate', 'Bespoke', 'Gift Wrapping', 'Packaging', 'Other'
  ];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) newErrors.name = 'Product name is required';
    if (!formData.unit_price || isNaN(parseFloat(formData.unit_price))) {
      newErrors.unit_price = 'Valid unit price is required';
    }
    if (!formData.category) newErrors.category = 'Category is required';
    if (!formData.quantity || isNaN(parseInt(formData.quantity))) {
      newErrors.quantity = 'Valid quantity is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);
      // Implement API call to add product
      Alert.alert('Success', 'Product added successfully', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to add product');
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
        {/* Product Image */}
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
              Product Image
            </Text>
            <TouchableOpacity
              style={[styles.imageContainer, { backgroundColor: theme.colors.background }]}
              onPress={handleImagePicker}
            >
              <MaterialCommunityIcons name="camera-plus" size={48} color={theme.colors.primary} />
              <Text style={[styles.imageText, { color: theme.colors.onSurfaceVariant }]}>
                Tap to add image
              </Text>
            </TouchableOpacity>
          </Card.Content>
        </Card>

        {/* Basic Information */}
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
              Basic Information
            </Text>
            
            <TextInput
              label="Product Name *"
              value={formData.name}
              onChangeText={(value) => handleInputChange('name', value)}
              error={!!errors.name}
              style={styles.input}
            />
            {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}

            <TextInput
              label="Description"
              value={formData.description}
              onChangeText={(value) => handleInputChange('description', value)}
              multiline
              numberOfLines={3}
              style={styles.input}
            />

            <TextInput
              label="Unit Price *"
              value={formData.unit_price}
              onChangeText={(value) => handleInputChange('unit_price', value)}
              keyboardType="numeric"
              error={!!errors.unit_price}
              style={styles.input}
            />
            {errors.unit_price && <Text style={styles.errorText}>{errors.unit_price}</Text>}

            <Text style={[styles.label, { color: theme.colors.onSurface }]}>
              Category *
            </Text>
            <View style={styles.chipContainer}>
              {categories.map((category) => (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.categoryChip,
                    { 
                      backgroundColor: formData.category === category 
                        ? theme.colors.primary 
                        : theme.colors.surface,
                      borderColor: theme.colors.outline,
                      borderWidth: 1
                    }
                  ]}
                  onPress={() => handleInputChange('category', category)}
                >
                  <Text style={[
                    styles.categoryChipText,
                    { 
                      color: formData.category === category 
                        ? '#fff' 
                        : theme.colors.onSurface 
                    }
                  ]}>
                    {category}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {errors.category && <Text style={styles.errorText}>{errors.category}</Text>}
          </Card.Content>
        </Card>

        {/* Stock Information */}
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
              Stock Information
            </Text>
            
            <TextInput
              label="Initial Quantity *"
              value={formData.quantity}
              onChangeText={(value) => handleInputChange('quantity', value)}
              keyboardType="numeric"
              error={!!errors.quantity}
              style={styles.input}
            />
            {errors.quantity && <Text style={styles.errorText}>{errors.quantity}</Text>}

            <TextInput
              label="Unit of Measure"
              value={formData.uom}
              onChangeText={(value) => handleInputChange('uom', value)}
              style={styles.input}
            />

            <TextInput
              label="Conversion Quantity"
              value={formData.conversion_qty}
              onChangeText={(value) => handleInputChange('conversion_qty', value)}
              keyboardType="numeric"
              style={styles.input}
            />

            <TextInput
              label="Reorder Level"
              value={formData.reorder_level}
              onChangeText={(value) => handleInputChange('reorder_level', value)}
              keyboardType="numeric"
              style={styles.input}
            />
          </Card.Content>
        </Card>

        {/* Supplier Information */}
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
              Supplier Information
            </Text>
            
            <TextInput
              label="Supplier Name"
              value={formData.supplier_name}
              onChangeText={(value) => handleInputChange('supplier_name', value)}
              style={styles.input}
            />

            <TextInput
              label="Supplier Phone"
              value={formData.supplier_phone}
              onChangeText={(value) => handleInputChange('supplier_phone', value)}
              keyboardType="phone-pad"
              style={styles.input}
            />

            <TextInput
              label="Supplier Website"
              value={formData.supplier_website}
              onChangeText={(value) => handleInputChange('supplier_website', value)}
              keyboardType="url"
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
            
            <TextInput
              label="Expiration Date"
              value={formData.expiration}
              onChangeText={(value) => handleInputChange('expiration', value)}
              placeholder="YYYY-MM-DD"
              style={styles.input}
            />
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
          Add Product
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
    height: 150,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
  },
  imageText: {
    marginTop: 8,
    fontSize: 14,
  },
  input: {
    marginBottom: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  categoryChip: {
    marginRight: 8,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  errorText: {
    color: '#F44336',
    fontSize: 12,
    marginBottom: 8,
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
