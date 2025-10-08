import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  Image,
  TouchableOpacity,
  TextInput,
  FlatList,
  Modal,
  ActivityIndicator,
  Platform
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Button, Card, Switch, Chip } from 'react-native-paper';
import { useTheme } from '../../Context/ThemeContext';
import { useInventory } from '../../Context/InventoryContext';
import { inventoryAPI, supplierAPI } from '../../services/api';
import * as ImagePicker from 'expo-image-picker';

// Generate unique SKU
const generateUniqueSku = () => {
  let digits = '';
  for (let i = 0; i < 12; i++) {
    digits += Math.floor(Math.random() * 10);
  }
  return `BC${digits}`;
};

const CATEGORIES = [
  'Electronics', 'Beauty & Personal Care', 'Health & Wellness', 'Toys & Games',
  'Sports & Outdoors', 'Automotive', 'Office Supplies', 'Pet Supplies',
  'Gaming Consoles', "Men's Clothing", "Women's Clothing", "Kids' Clothing",
  'Shoes', 'Accessories (Bags, Wallets)', 'Jewelry', 'Watches',
  'Underwear & Sleepwear', 'Activewear', 'Formal Wear', 'Fresh Produce',
  'Dairy & Eggs', 'Meat & Seafood', 'Frozen Foods', 'Bakery', 'Beverages',
  'Snacks', 'Canned Goods', 'International Foods', 'Organic & Natural',
  'Books', 'Music', 'Movies & TV', 'Office Electronics', 'Home Appliances',
  'Baby Products', 'Groceries', 'Tools & Home Improvement', 'Garden & Outdoor',
  'Art Supplies', 'Stationery', 'Medical Supplies', 'Cleaning Supplies',
  'Party Supplies', 'Travel Accessories', 'Mobile Phones', 'Tablets',
  'Laptops', 'Computer Accessories', 'Smart Home', 'Fitness Equipment',
  'Bags & Luggage', 'Eyewear', 'Perfume & Fragrances', 'Cosmetics',
  'Hair Care', 'Skincare', 'Bath & Body', 'Jewelry & Accessories',
  'Watches & Wearables', 'Pet Food', 'Pet Accessories', 'Automotive Parts',
  'Car Electronics', 'Motorcycle Accessories', 'Bicycles & Accessories',
  'Musical Instruments', 'Board Games', 'Video Games', 'Collectibles',
  'Hobbies', 'Crafts', 'Seasonal', 'Gift Items', 'Souvenirs',
  'Subscription Boxes', 'Tickets & Events', 'Services', 'Digital Goods',
  'Software', 'Apps', 'E-books', 'Learning Materials', 'Office Furniture',
  'Lighting', 'Decor', 'Wall Art', 'Rugs & Carpets', 'Curtains & Blinds',
  'Bedding', 'Kitchenware', 'Cookware', 'Tableware', 'Barware',
  'Wine & Spirits', 'Health Devices', 'Supplements', 'Vitamins', 'First Aid',
  'Personal Safety', 'Baby Care', 'Maternity', 'School Supplies', 'Uniforms',
  'Religious Items', 'Charity & Donations', 'Other Services', 'Others'
];

const UOM_OPTIONS = [
  'Each', 'Piece', 'Set', 'Pair', 'Dozen', 'Roll', 'Sheet', 'Bag', 'Box',
  'Bundle', 'Meter', 'Centimeter', 'Foot', 'Gram', 'Kilogram',
  'Milliliter', 'Liter', 'Kit', 'Unit', 'Task'
];

const UOMS_REQUIRING_CONVERSION = ['Dozen', 'Box', 'Bundle', 'Set', 'Kit'];

export default function AddProductScreen({ route, navigation }) {
  const theme = useTheme();
  const { fetchInventory, inventory } = useInventory();
  const { initialData, isEdit, isAddStockMode } = route?.params || {};
  
  const [formData, setFormData] = useState({
    sku: isEdit || isAddStockMode ? (initialData?.sku || '') : generateUniqueSku(),
    name: initialData?.name || '',
    description: initialData?.description || '',
    unit_price: initialData?.unit_price?.toString() || '',
    category: initialData?.category || '',
    quantity: initialData?.quantity?.toString() || '0',
    uom: initialData?.uom || '',
    conversion_qty: initialData?.conversion_qty?.toString() || '',
    supplier_id: initialData?.supplier_id || null,
    expirable: initialData?.expirable || false,
    expiration: initialData?.expiration || ''
  });
  
  const [quantityToAdd, setQuantityToAdd] = useState('0');
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(initialData?.image_data ? `data:image/jpeg;base64,${initialData.image_data}` : null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  
  // Autocomplete states
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');
  const [filteredCategories, setFilteredCategories] = useState(CATEGORIES);
  
  const [showUomModal, setShowUomModal] = useState(false);
  const [uomSearch, setUomSearch] = useState('');
  const [filteredUoms, setFilteredUoms] = useState(UOM_OPTIONS);
  
  const [suppliers, setSuppliers] = useState([]);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  
  useEffect(() => {
    loadSuppliers();
  }, []);
  
  // If editing and there's existing image data, convert to preview
  useEffect(() => {
    if (isEdit && initialData?.image_data && !image) {
      setPreview(`data:image/jpeg;base64,${initialData.image_data}`);
    }
  }, [isEdit, initialData?.image_data]);
  
  useEffect(() => {
    if (uomSearch) {
      const filtered = UOM_OPTIONS.filter(uom =>
        uom.toLowerCase().includes(uomSearch.toLowerCase())
      );
      setFilteredUoms(filtered);
    } else {
      setFilteredUoms(UOM_OPTIONS);
    }
  }, [uomSearch]);
  
  const loadSuppliers = async () => {
    try {
      const response = await supplierAPI.getSuppliers();
      const supplierList = Array.isArray(response) ? response : (response.data || []);
      setSuppliers(supplierList);
    } catch (error) {
      console.error('Error loading suppliers:', error);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (isAddStockMode) {
      const qty = Number(quantityToAdd);
      if (isNaN(qty) || !Number.isInteger(qty) || qty <= 0) {
        newErrors.quantity = 'Please enter a valid positive integer to add';
      }
      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    }
    
    if (!formData.name.trim()) newErrors.name = 'Product name is required';
    if (!formData.unit_price || isNaN(parseFloat(formData.unit_price)) || parseFloat(formData.unit_price) < 0) {
      newErrors.unit_price = 'Valid unit price is required';
    }
    if (!formData.category) newErrors.category = 'Category is required';
    if (!formData.quantity || isNaN(parseInt(formData.quantity)) || parseInt(formData.quantity) < 0) {
      newErrors.quantity = 'Valid quantity is required';
    }
    if (!formData.supplier_id) newErrors.supplier = 'Please select a supplier';
    
    // Validate conversion quantity for UOMs that require it
    if (UOMS_REQUIRING_CONVERSION.includes(formData.uom)) {
      if (!formData.conversion_qty || isNaN(formData.conversion_qty) || Number(formData.conversion_qty) <= 0) {
        newErrors.conversion_qty = 'Conversion QTY must be a positive integer';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);
      
      if (isAddStockMode) {
        // Add stock mode
        await inventoryAPI.addStock(formData.sku, parseInt(quantityToAdd));
        Alert.alert('Success', 'Stock added successfully', [
          { text: 'OK', onPress: () => {
            fetchInventory();
            navigation.goBack();
          }}
        ]);
        return;
      }
      
      // Create FormData for image upload
      const dataToSend = new FormData();
      dataToSend.append('sku', formData.sku);
      dataToSend.append('name', formData.name);
      dataToSend.append('description', formData.description);
      dataToSend.append('quantity', String(Number(formData.quantity)));
      dataToSend.append('unit_price', String(Number(formData.unit_price)));
      dataToSend.append('category', formData.category);
      dataToSend.append('supplier_id', formData.supplier_id || '');
      dataToSend.append('uom', formData.uom || '');
      dataToSend.append('conversion_qty', formData.conversion_qty || '');
      dataToSend.append('expirable', formData.expirable ? 'true' : 'false');
      dataToSend.append('expiration', formData.expiration || '');
      
      if (image) {
        const uriParts = image.uri.split('.');
        const fileType = uriParts[uriParts.length - 1];
        dataToSend.append('image', {
          uri: image.uri,
          name: `product.${fileType}`,
          type: `image/${fileType}`
        });
      }
      
      if (isEdit) {
        dataToSend.append('isUpdate', 'true');
      }
      
      // Call API
      await inventoryAPI.addInventoryItem(dataToSend);
      
      Alert.alert('Success', isEdit ? 'Product updated successfully' : 'Product added successfully', [
        { text: 'OK', onPress: () => {
          fetchInventory();
          navigation.goBack();
        }}
      ]);
    } catch (error) {
      console.error('Error submitting product:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to save product');
    } finally {
      setLoading(false);
    }
  };

  const handleImagePicker = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera roll permission is required');
      return;
    }
    
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });
    
    if (!result.canceled && result.assets[0]) {
      setImage(result.assets[0]);
      setPreview(result.assets[0].uri);
    }
  };
  
  const selectedSupplier = suppliers.find(s => s.supplier_id === formData.supplier_id);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Section Title */}
        <Text style={[styles.mainTitle, { color: theme.colors.onBackground }]}>
          {isAddStockMode ? 'ADD STOCK' : (isEdit ? 'EDIT PRODUCT' : 'ADD PRODUCT')}
        </Text>

        {/* Product Image */}
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
              Product Image
            </Text>
            <TouchableOpacity
              style={[styles.imageContainer, { backgroundColor: theme.colors.background }]}
              onPress={handleImagePicker}
              disabled={isAddStockMode}
            >
              {preview ? (
                <Image source={{ uri: preview }} style={styles.previewImage} />
              ) : (
                <>
                  <MaterialCommunityIcons name="camera-plus" size={48} color={theme.colors.primary} />
                  <Text style={[styles.imageText, { color: theme.colors.onSurfaceVariant }]}>
                    Tap to add image
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </Card.Content>
        </Card>

        {/* Basic Information */}
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
              Basic Information
            </Text>
            
            {/* SKU */}
            <Text style={[styles.label, { color: theme.colors.onSurface }]}>SKU</Text>
            <TextInput
              value={formData.sku}
              editable={false}
              style={[styles.input, styles.disabledInput, { color: theme.colors.onSurfaceVariant }]}
            />

            {/* Product Name */}
            <Text style={[styles.label, { color: theme.colors.onSurface }]}>Product Name *</Text>
            <TextInput
              value={formData.name}
              onChangeText={(value) => handleInputChange('name', value)}
              placeholder="Enter product name"
              placeholderTextColor={theme.colors.onSurfaceVariant}
              editable={!isAddStockMode}
              style={[styles.input, isAddStockMode && styles.disabledInput, { color: theme.colors.onSurface, borderColor: errors.name ? '#F44336' : theme.colors.outline }]}
            />
            {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}

            {/* Category */}
            <Text style={[styles.label, { color: theme.colors.onSurface }]}>Category *</Text>
            <TouchableOpacity
              style={[styles.selectorButton, { borderColor: errors.category ? '#F44336' : theme.colors.outline }]}
              onPress={() => !isAddStockMode && setShowCategoryModal(true)}
              disabled={isAddStockMode}
            >
              <Text style={[styles.selectorButtonText, { color: formData.category ? theme.colors.onSurface : theme.colors.onSurfaceVariant }]}>
                {formData.category || 'Select category'}
              </Text>
              <MaterialCommunityIcons name="chevron-down" size={24} color={theme.colors.onSurfaceVariant} />
            </TouchableOpacity>
            {errors.category && <Text style={styles.errorText}>{errors.category}</Text>}

            {/* Description */}
            <Text style={[styles.label, { color: theme.colors.onSurface }]}>Description</Text>
            <TextInput
              value={formData.description}
              onChangeText={(value) => handleInputChange('description', value)}
              placeholder="Enter description"
              placeholderTextColor={theme.colors.onSurfaceVariant}
              multiline
              numberOfLines={3}
              editable={!isAddStockMode}
              style={[styles.input, styles.textArea, isAddStockMode && styles.disabledInput, { color: theme.colors.onSurface, borderColor: theme.colors.outline }]}
            />

            {/* Supplier */}
            <Text style={[styles.label, { color: theme.colors.onSurface }]}>Supplier *</Text>
            <TouchableOpacity
              style={[styles.selectorButton, { borderColor: errors.supplier ? '#F44336' : theme.colors.outline }]}
              onPress={() => !isAddStockMode && setShowSupplierModal(true)}
              disabled={isAddStockMode}
            >
              <Text style={[styles.selectorButtonText, { color: selectedSupplier ? theme.colors.onSurface : theme.colors.onSurfaceVariant }]}>
                {selectedSupplier?.name || 'Select supplier'}
              </Text>
              <MaterialCommunityIcons name="chevron-down" size={24} color={theme.colors.onSurfaceVariant} />
            </TouchableOpacity>
            {errors.supplier && <Text style={styles.errorText}>{errors.supplier}</Text>}
          </Card.Content>
        </Card>

        {/* Stock Information */}
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
              Inventory & Pricing
            </Text>
            
            {isAddStockMode ? (
              <>
                {/* Current Stock */}
                <Text style={[styles.label, { color: theme.colors.onSurface }]}>Current Stock</Text>
                <TextInput
                  value={formData.quantity}
                  editable={false}
                  style={[styles.input, styles.disabledInput, { color: theme.colors.onSurfaceVariant }]}
                />

                {/* Quantity to Add */}
                <Text style={[styles.label, { color: theme.colors.onSurface }]}>Quantity to Add *</Text>
                <TextInput
                  value={quantityToAdd}
                  onChangeText={setQuantityToAdd}
                  keyboardType="numeric"
                  placeholder="Enter quantity to add"
                  placeholderTextColor={theme.colors.onSurfaceVariant}
                  style={[styles.input, { color: theme.colors.onSurface, borderColor: errors.quantity ? '#F44336' : theme.colors.outline }]}
                />
                {errors.quantity && <Text style={styles.errorText}>{errors.quantity}</Text>}
              </>
            ) : (
              <>
                {/* Quantity */}
                <Text style={[styles.label, { color: theme.colors.onSurface }]}>Quantity (Base Unit) *</Text>
                <TextInput
                  value={formData.quantity}
                  onChangeText={(value) => handleInputChange('quantity', value)}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={theme.colors.onSurfaceVariant}
                  editable={!isEdit}
                  style={[styles.input, isEdit && styles.disabledInput, { color: theme.colors.onSurface, borderColor: errors.quantity ? '#F44336' : theme.colors.outline }]}
                />
                {errors.quantity && <Text style={styles.errorText}>{errors.quantity}</Text>}
              </>
            )}

            {!isAddStockMode && (
              <>
                {/* UOM */}
                <Text style={[styles.label, { color: theme.colors.onSurface }]}>Unit of Measure</Text>
                <TouchableOpacity
                  style={[styles.selectorButton, { borderColor: theme.colors.outline }]}
                  onPress={() => setShowUomModal(true)}
                >
                  <Text style={[styles.selectorButtonText, { color: formData.uom ? theme.colors.onSurface : theme.colors.onSurfaceVariant }]}>
                    {formData.uom || 'Select UoM'}
                  </Text>
                  <MaterialCommunityIcons name="chevron-down" size={24} color={theme.colors.onSurfaceVariant} />
                </TouchableOpacity>

                {/* Conversion Quantity (if needed) */}
                {UOMS_REQUIRING_CONVERSION.includes(formData.uom) && (
                  <>
                    <Text style={[styles.label, { color: theme.colors.onSurface }]}>Units per {formData.uom} *</Text>
                    <TextInput
                      value={formData.conversion_qty}
                      onChangeText={(value) => handleInputChange('conversion_qty', value)}
                      keyboardType="numeric"
                      placeholder={`How many units in one ${formData.uom}?`}
                      placeholderTextColor={theme.colors.onSurfaceVariant}
                      style={[styles.input, { color: theme.colors.onSurface, borderColor: errors.conversion_qty ? '#F44336' : theme.colors.outline }]}
                    />
                    {formData.conversion_qty && (
                      <Text style={[styles.helpText, { color: theme.colors.onSurfaceVariant }]}>
                        1 {formData.uom} = {formData.conversion_qty} Pieces
                      </Text>
                    )}
                    {errors.conversion_qty && <Text style={styles.errorText}>{errors.conversion_qty}</Text>}
                  </>
                )}

                {/* Unit Price */}
                <Text style={[styles.label, { color: theme.colors.onSurface }]}>Unit Price (Per UOM) *</Text>
                <TextInput
                  value={formData.unit_price}
                  onChangeText={(value) => handleInputChange('unit_price', value)}
                  keyboardType="numeric"
                  placeholder="0.00"
                  placeholderTextColor={theme.colors.onSurfaceVariant}
                  style={[styles.input, { color: theme.colors.onSurface, borderColor: errors.unit_price ? '#F44336' : theme.colors.outline }]}
                />
                {errors.unit_price && <Text style={styles.errorText}>{errors.unit_price}</Text>}
              </>
            )}
          </Card.Content>
        </Card>

        {/* Product Details - Expirable */}
        {!isAddStockMode && (
          <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <Card.Content>
              <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
                Product Details
              </Text>
              
              <View style={styles.expirableRow}>
                <Text style={[styles.label, { color: theme.colors.onSurface }]}>Expirable Product?</Text>
                <Switch
                  value={formData.expirable}
                  onValueChange={(value) => handleInputChange('expirable', value)}
                  color={theme.colors.primary}
                />
              </View>

              {formData.expirable ? (
                <>
                  <Text style={[styles.label, { color: theme.colors.onSurface }]}>Expiration Date</Text>
                  <TextInput
                    value={formData.expiration}
                    onChangeText={(value) => handleInputChange('expiration', value)}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={theme.colors.onSurfaceVariant}
                    style={[styles.input, { color: theme.colors.onSurface, borderColor: theme.colors.outline }]}
                  />
                </>
              ) : (
                <View style={[styles.badge, { backgroundColor: '#E8F5E9' }]}>
                  <Text style={[styles.badgeText, { color: '#4CAF50' }]}>DOES NOT EXPIRE</Text>
                </View>
              )}
            </Card.Content>
          </Card>
        )}
      </ScrollView>

      {/* Category Modal */}
      <Modal visible={showCategoryModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.onSurface }]}>Select Category</Text>
              <TouchableOpacity onPress={() => setShowCategoryModal(false)}>
                <MaterialCommunityIcons name="close" size={24} color={theme.colors.onSurface} />
              </TouchableOpacity>
            </View>
            
            <TextInput
              value={categorySearch}
              onChangeText={setCategorySearch}
              placeholder="Search categories..."
              placeholderTextColor={theme.colors.onSurfaceVariant}
              style={[styles.searchInput, { color: theme.colors.onSurface, borderColor: theme.colors.outline }]}
            />
            
            <FlatList
              data={filteredCategories}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.modalItem, { backgroundColor: formData.category === item ? theme.colors.primaryContainer : 'transparent' }]}
                  onPress={() => {
                    handleInputChange('category', item);
                    setShowCategoryModal(false);
                    setCategorySearch('');
                  }}
                >
                  <Text style={[styles.modalItemText, { color: theme.colors.onSurface }]}>{item}</Text>
                  {formData.category === item && (
                    <MaterialCommunityIcons name="check" size={20} color={theme.colors.primary} />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* UOM Modal */}
      <Modal visible={showUomModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.onSurface }]}>Select Unit of Measure</Text>
              <TouchableOpacity onPress={() => setShowUomModal(false)}>
                <MaterialCommunityIcons name="close" size={24} color={theme.colors.onSurface} />
              </TouchableOpacity>
            </View>
            
            <TextInput
              value={uomSearch}
              onChangeText={setUomSearch}
              placeholder="Search UoM..."
              placeholderTextColor={theme.colors.onSurfaceVariant}
              style={[styles.searchInput, { color: theme.colors.onSurface, borderColor: theme.colors.outline }]}
            />
            
            <FlatList
              data={filteredUoms}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.modalItem, { backgroundColor: formData.uom === item ? theme.colors.primaryContainer : 'transparent' }]}
                  onPress={() => {
                    handleInputChange('uom', item);
                    setShowUomModal(false);
                    setUomSearch('');
                  }}
                >
                  <Text style={[styles.modalItemText, { color: theme.colors.onSurface }]}>{item}</Text>
                  {formData.uom === item && (
                    <MaterialCommunityIcons name="check" size={20} color={theme.colors.primary} />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Supplier Modal */}
      <Modal visible={showSupplierModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.onSurface }]}>Select Supplier</Text>
              <TouchableOpacity onPress={() => setShowSupplierModal(false)}>
                <MaterialCommunityIcons name="close" size={24} color={theme.colors.onSurface} />
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={suppliers}
              keyExtractor={(item) => item.supplier_id?.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.modalItem, { backgroundColor: formData.supplier_id === item.supplier_id ? theme.colors.primaryContainer : 'transparent' }]}
                  onPress={() => {
                    handleInputChange('supplier_id', item.supplier_id);
                    setShowSupplierModal(false);
                  }}
                >
                  <View style={styles.supplierInfo}>
                    <Text style={[styles.modalItemText, { color: theme.colors.onSurface }]}>{item.name}</Text>
                    {item.phone && (
                      <Text style={[styles.supplierPhone, { color: theme.colors.onSurfaceVariant }]}>{item.phone}</Text>
                    )}
                  </View>
                  {formData.supplier_id === item.supplier_id && (
                    <MaterialCommunityIcons name="check" size={20} color={theme.colors.primary} />
                  )}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>
                  No suppliers found
                </Text>
              }
            />
          </View>
        </View>
      </Modal>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <Button
          mode="outlined"
          onPress={() => navigation.goBack()}
          style={styles.actionButton}
          disabled={loading}
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
          {isAddStockMode ? 'Add Stock' : (isEdit ? 'Save Changes' : 'Add Product')}
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
    paddingBottom: 80,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  card: {
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderRadius: 12,
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
    overflow: 'hidden',
  },
  imageText: {
    marginTop: 8,
    fontSize: 14,
  },
  input: {
    borderWidth: 1.5,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 4,
  },
  disabledInput: {
    backgroundColor: '#F5F5F5',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  selectorButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 8,
    padding: 12,
    marginBottom: 4,
  },
  selectorButtonText: {
    fontSize: 16,
    flex: 1,
  },
  helpText: {
    fontSize: 12,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  expirableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  badge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  errorText: {
    color: '#F44336',
    fontSize: 12,
    marginBottom: 8,
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    height: '70%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  searchInput: {
    borderWidth: 1.5,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  modalItemText: {
    fontSize: 16,
    flex: 1,
  },
  supplierInfo: {
    flex: 1,
  },
  supplierPhone: {
    fontSize: 12,
    marginTop: 4,
  },
  emptyText: {
    textAlign: 'center',
    padding: 20,
    fontSize: 14,
  },
  actionButtons: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  actionButton: {
    flex: 1,
  },
});
