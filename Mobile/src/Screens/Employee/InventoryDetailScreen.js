import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Dimensions,
  Image,
  Modal,
  TextInput,
  ActivityIndicator
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Button, Card, Chip, Divider } from 'react-native-paper';
import { useTheme } from '../../Context/ThemeContext';
import { useRoute } from '@react-navigation/native';
import { useInventory } from '../../Context/InventoryContext';
import { useAuth } from '../../Context/AuthContext';
import { inventoryAPI } from '../../services/api';

const { width } = Dimensions.get('window');

export default function InventoryDetailScreen({ navigation }) {
  const theme = useTheme();
  const route = useRoute();
  const { product } = route.params;
  const { deleteProduct, fetchInventory } = useInventory();
  const { user, userType } = useAuth();

  const [currentProduct, setCurrentProduct] = useState(product);
  const [loading, setLoading] = useState(false);
  const [stockModalVisible, setStockModalVisible] = useState(false);
  const [stockAction, setStockAction] = useState('STOCK_IN');
  const [stockQuantity, setStockQuantity] = useState('');
  const [stockReason, setStockReason] = useState('');
  const inventoryManagerRoles = ['operations_manager', 'sales_manager', 'admin', 'super_admin', 'director'];
  const canManageInventory = userType === 'employee' && inventoryManagerRoles.includes(String(user?.role || '').toLowerCase());

  useEffect(() => {
    setCurrentProduct(product);
  }, [product]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStockLevel = (item) => {
    const quantity = Number(item?.quantity || 0);
    const reorderLevel = Number(item?.reorder_level || 0);
    if (quantity <= 0) return { level: 'out', color: '#D32F2F', text: 'Out of Stock' };
    if (quantity <= reorderLevel) return { level: 'low', color: '#F57C00', text: 'Low Stock' };
    return { level: 'high', color: '#4CAF50', text: 'In Stock' };
  };

  const handleEdit = () => {
    if (!canManageInventory) {
      Alert.alert('Not Authorized', 'You are not authorized to access this feature');
      return;
    }
    navigation.navigate('EditProduct', { initialData: currentProduct, isEdit: true });
  };

  const handleAddStock = () => {
    if (!canManageInventory) {
      Alert.alert('Not Authorized', 'You are not authorized to access this feature');
      return;
    }
    setStockAction('STOCK_IN');
    setStockQuantity('');
    setStockReason('');
    setStockModalVisible(true);
  };

  const handleStockOut = () => {
    if (!canManageInventory) {
      Alert.alert('Not Authorized', 'You are not authorized to access this feature');
      return;
    }
    setStockAction('STOCK_OUT');
    setStockQuantity('');
    setStockReason('');
    setStockModalVisible(true);
  };

  const refreshProduct = async () => {
    const response = await inventoryAPI.getInventoryItem(currentProduct.sku);
    const nextProduct = response.item || response.product || response;
    setCurrentProduct(nextProduct);
    if (fetchInventory) {
      await fetchInventory();
    }
  };

  const submitStockMovement = async () => {
    const quantity = Number(stockQuantity);
    if (!Number.isInteger(quantity) || quantity <= 0) {
      Alert.alert('Invalid Quantity', 'Quantity must be a positive whole number.');
      return;
    }
    if (stockAction === 'STOCK_OUT' && quantity > Number(currentProduct.quantity || 0)) {
      Alert.alert('Invalid Stock Out', 'Stock Out cannot make inventory negative.');
      return;
    }

    setLoading(true);
    try {
      if (stockAction === 'STOCK_OUT') {
        await inventoryAPI.stockOut(currentProduct.sku, quantity, stockReason);
      } else {
        await inventoryAPI.stockIn(currentProduct.sku, quantity, stockReason);
      }
      await refreshProduct();
      setStockModalVisible(false);
      Alert.alert('Success', stockAction === 'STOCK_OUT' ? 'Stock removed successfully.' : 'Stock added successfully.');
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to save stock movement.');
    } finally {
      setLoading(false);
    }
  };

  const handleArchive = () => {
    if (!canManageInventory) {
      Alert.alert('Not Authorized', 'You are not authorized to access this feature');
      return;
    }
    Alert.alert(
      'Archive Product',
      `Are you sure you want to archive "${currentProduct.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Archive',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteProduct(currentProduct.sku);
              Alert.alert('Success', 'Product archived successfully');
              navigation.goBack();
            } catch (error) {
              Alert.alert('Error', error.response?.data?.message || error.response?.data?.error || 'Failed to archive product');
            }
          }
        }
      ]
    );
  };

  const stockLevel = getStockLevel(currentProduct);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Product Image */}
        <View style={[styles.imageContainer, { backgroundColor: theme.colors.surface }]}>
          {currentProduct.image_data ? (
            <Image
              source={{ uri: `data:image/jpeg;base64,${currentProduct.image_data}` }}
              style={styles.productImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.placeholderImage}>
              <MaterialCommunityIcons name="image" size={64} color={theme.colors.outline} />
            </View>
          )}
        </View>

        {/* Product Info */}
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <View style={styles.header}>
              <View style={styles.productInfo}>
                <Text style={[styles.productName, { color: theme.colors.onSurface }]} numberOfLines={2}>
                  {currentProduct.name}
                </Text>
                <Text style={[styles.productSku, { color: theme.colors.onSurfaceVariant }]}>
                  SKU: {currentProduct.sku}
                </Text>
                <Text style={[styles.productCategory, { color: theme.colors.onSurfaceVariant }]}>
                  {currentProduct.category}
                </Text>
              </View>
              <View style={styles.stockInfo}>
                <Chip
                  style={[
                    styles.stockChip,
                    { backgroundColor: stockLevel.color }
                  ]}
                  textStyle={{ color: '#fff', fontWeight: 'bold' }}
                >
                  {stockLevel.text}
                </Chip>
                <Text style={[styles.stockQuantity, { color: theme.colors.onSurface }]}>
                  {currentProduct.quantity?.toLocaleString()} {currentProduct.uom || currentProduct.unit || 'units'}
                </Text>
              </View>
            </View>

            <Divider style={styles.divider} />

            <View style={styles.detailsRow}>
              <View style={styles.detailItem}>
                <Text style={[styles.detailLabel, { color: theme.colors.onSurfaceVariant }]}>
                  Unit Price
                </Text>
                <Text style={[styles.detailValue, { color: theme.colors.onSurface }]}>
                  {formatCurrency(currentProduct.unit_price || 0)}
                </Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={[styles.detailLabel, { color: theme.colors.onSurfaceVariant }]}>
                  Total Value
                </Text>
                <Text style={[styles.detailValue, { color: theme.colors.onSurface }]}>
                  {formatCurrency((currentProduct.quantity || 0) * (currentProduct.unit_price || 0))}
                </Text>
              </View>
            </View>

            {currentProduct.description && (
              <>
                <Divider style={styles.divider} />
                <View style={styles.descriptionSection}>
                  <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
                    Description
                  </Text>
                  <Text style={[styles.description, { color: theme.colors.onSurfaceVariant }]}>
                    {currentProduct.description}
                  </Text>
                </View>
              </>
            )}

            {/* Supplier Information */}
            {(currentProduct.supplier_name || currentProduct.supplier_id) && (
              <>
                <Divider style={styles.divider} />
                <View style={styles.supplierSection}>
                  <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
                    Supplier Information
                  </Text>
                  <Text style={[styles.supplierName, { color: theme.colors.onSurface }]}>
                    {currentProduct.supplier_name || `Supplier ID: ${currentProduct.supplier_id}`}
                  </Text>
                </View>
              </>
            )}

            {/* Product Details */}
            <Divider style={styles.divider} />
            <View style={styles.detailsSection}>
              <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
                Product Details
              </Text>

              <View style={styles.detailsGrid}>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: theme.colors.onSurfaceVariant }]}>
                    Unit of Measure:
                  </Text>
                  <Text style={[styles.detailValue, { color: theme.colors.onSurface }]}>
                    {currentProduct.uom || currentProduct.unit || 'Not specified'}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: theme.colors.onSurfaceVariant }]}>
                    Reorder Level:
                  </Text>
                  <Text style={[styles.detailValue, { color: theme.colors.onSurface }]}>
                    {Number(currentProduct.reorder_level || 0).toLocaleString()}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: theme.colors.onSurfaceVariant }]}>
                    Barcode Value:
                  </Text>
                  <Text style={[styles.detailValue, { color: theme.colors.onSurface }]}>
                    {currentProduct.barcode_value || currentProduct.sku}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: theme.colors.onSurfaceVariant }]}>
                    QR Value:
                  </Text>
                  <Text style={[styles.detailValue, { color: theme.colors.onSurface }]}>
                    {currentProduct.qr_value || currentProduct.sku}
                  </Text>
                </View>

                {currentProduct.conversion_qty && (
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: theme.colors.onSurfaceVariant }]}>
                      Conversion Qty:
                    </Text>
                    <Text style={[styles.detailValue, { color: theme.colors.onSurface }]}>
                      {currentProduct.conversion_qty} units per {currentProduct.uom}
                    </Text>
                  </View>
                )}

                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: theme.colors.onSurfaceVariant }]}>
                    Expirable:
                  </Text>
                  <Text style={[styles.detailValue, { color: theme.colors.onSurface }]}>
                    {currentProduct.expirable ? 'Yes' : 'No'}
                  </Text>
                </View>

                {currentProduct.expirable && currentProduct.expiration && (
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: theme.colors.onSurfaceVariant }]}>
                      Expiration Date:
                    </Text>
                    <Text style={[styles.detailValue, { color: theme.colors.onSurface }]}>
                      {formatDate(currentProduct.expiration)}
                    </Text>
                  </View>
                )}

                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: theme.colors.onSurfaceVariant }]}>
                    Date Added:
                  </Text>
                  <Text style={[styles.detailValue, { color: theme.colors.onSurface }]}>
                    {formatDate(currentProduct.created_at)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Stock Alerts */}
            <Divider style={styles.divider} />
            <View style={styles.alertsSection}>
              <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
                Stock Alerts
              </Text>

              {Number(currentProduct.quantity || 0) <= 0 && (
                <View style={[styles.alertItem, { backgroundColor: '#FFEBEE' }]}>
                  <MaterialCommunityIcons name="alert-circle" size={20} color="#D32F2F" />
                  <Text style={[styles.alertText, { color: '#D32F2F' }]}>
                    Out of stock - needs replenishment
                  </Text>
                </View>
              )}

              {Number(currentProduct.quantity || 0) > 0 && Number(currentProduct.quantity || 0) <= Number(currentProduct.reorder_level || 0) && (
                <View style={[styles.alertItem, { backgroundColor: '#FFF3E0' }]}>
                  <MaterialCommunityIcons name="alert" size={20} color="#F57C00" />
                  <Text style={[styles.alertText, { color: '#F57C00' }]}>
                    Low stock - consider restocking
                  </Text>
                </View>
              )}

              {Number(currentProduct.quantity || 0) > Number(currentProduct.reorder_level || 0) && (
                <View style={[styles.alertItem, { backgroundColor: '#E8F5E8' }]}>
                  <MaterialCommunityIcons name="check-circle" size={20} color="#4CAF50" />
                  <Text style={[styles.alertText, { color: '#4CAF50' }]}>
                    Stock level is good
                  </Text>
                </View>
              )}
            </View>
          </Card.Content>
        </Card>
      </ScrollView>

      <Modal
        visible={stockModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setStockModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.stockModal, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.onSurface }]}>
                {stockAction === 'STOCK_OUT' ? 'Stock Out' : 'Stock In'}
              </Text>
              <TouchableOpacity onPress={() => setStockModalVisible(false)} disabled={loading}>
                <MaterialCommunityIcons name="close" size={24} color={theme.colors.onSurface} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalProductName, { color: theme.colors.onSurface }]}>
              {currentProduct.name}
            </Text>
            <Text style={[styles.modalHelper, { color: theme.colors.onSurfaceVariant }]}>
              Current stock: {Number(currentProduct.quantity || 0).toLocaleString()} {currentProduct.uom || currentProduct.unit || 'units'}
            </Text>

            <Text style={[styles.inputLabel, { color: theme.colors.onSurfaceVariant }]}>Quantity</Text>
            <TextInput
              value={stockQuantity}
              onChangeText={setStockQuantity}
              keyboardType="number-pad"
              placeholder="Enter quantity"
              placeholderTextColor={theme.colors.placeholder}
              style={[styles.stockInput, { color: theme.colors.onSurface, borderColor: theme.colors.outline }]}
            />

            <Text style={[styles.inputLabel, { color: theme.colors.onSurfaceVariant }]}>Reason</Text>
            <TextInput
              value={stockReason}
              onChangeText={setStockReason}
              placeholder="Supplier delivery, damage, correction, etc."
              placeholderTextColor={theme.colors.placeholder}
              style={[styles.stockInput, styles.reasonInput, { color: theme.colors.onSurface, borderColor: theme.colors.outline }]}
              multiline
            />

            <Button
              mode="contained"
              onPress={submitStockMovement}
              disabled={loading}
              style={[styles.submitStockButton, { backgroundColor: stockAction === 'STOCK_OUT' ? '#D32F2F' : '#2E7D32' }]}
            >
              {loading ? 'Saving...' : 'Save Movement'}
            </Button>
          </View>
        </View>
      </Modal>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <Button
          mode="outlined"
          onPress={() => navigation.goBack()}
          style={styles.actionButton}
        >
          Back
        </Button>
        {canManageInventory && (
          <>
            <Button
              mode="contained"
              onPress={handleAddStock}
              style={[styles.actionButton, { backgroundColor: '#2E7D32' }]}
            >
              Stock In
            </Button>
            <Button
              mode="contained"
              onPress={handleStockOut}
              style={[styles.actionButton, { backgroundColor: '#D32F2F' }]}
            >
              Stock Out
            </Button>
            <Button
              mode="contained"
              onPress={handleEdit}
              style={[styles.actionButton, { backgroundColor: '#2196F3' }]}
            >
              Edit
            </Button>
            <Button
              mode="contained"
              onPress={handleArchive}
              style={[styles.actionButton, { backgroundColor: '#F44336' }]}
            >
              Archive
            </Button>
          </>
        )}
      </View>
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      )}
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
  imageContainer: {
    height: 200,
    borderRadius: 12,
    marginBottom: 16,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  productImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  placeholderImage: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderRadius: 12,
  },
  header: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  productSku: {
    fontSize: 16,
    marginBottom: 4,
  },
  productCategory: {
    fontSize: 14,
  },
  stockInfo: {
    alignItems: 'flex-end',
    marginLeft: 16,
  },
  stockChip: {
    marginBottom: 8,
  },
  stockQuantity: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  divider: {
    marginVertical: 16,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  descriptionSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
  },
  supplierSection: {
    marginBottom: 16,
  },
  supplierName: {
    fontSize: 14,
  },
  detailsSection: {
    marginBottom: 16,
  },
  detailsGrid: {
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  alertsSection: {
    marginBottom: 16,
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  alertText: {
    fontSize: 14,
    marginLeft: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 8,
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
    flexGrow: 1,
    minWidth: 110,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  stockModal: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  modalProductName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  modalHelper: {
    fontSize: 13,
    marginBottom: 18,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  stockInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 14,
  },
  reasonInput: {
    minHeight: 82,
    textAlignVertical: 'top',
  },
  submitStockButton: {
    borderRadius: 10,
    paddingVertical: 6,
    marginTop: 4,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
