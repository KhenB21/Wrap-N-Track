import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Dimensions,
  Image
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Button, Card, Chip, Divider } from 'react-native-paper';
import { useTheme } from '../../Context/ThemeContext';
import { useRoute } from '@react-navigation/native';

const { width } = Dimensions.get('window');

export default function InventoryDetailScreen({ navigation }) {
  const theme = useTheme();
  const route = useRoute();
  const { product } = route.params;

  const [loading, setLoading] = useState(false);

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

  const getStockLevel = (quantity) => {
    if (quantity <= 0) return { level: 'out', color: '#D32F2F', text: 'Out of Stock' };
    if (quantity <= 300) return { level: 'low', color: '#F57C00', text: 'Low Stock' };
    if (quantity <= 800) return { level: 'medium', color: '#FFC107', text: 'Medium Stock' };
    return { level: 'high', color: '#4CAF50', text: 'High Stock' };
  };

  const handleEdit = () => {
    navigation.navigate('EditProduct', { initialData: product, isEdit: true });
  };

  const handleAddStock = () => {
    navigation.navigate('EditProduct', { initialData: product, isAddStockMode: true });
  };

  const handleArchive = () => {
    Alert.alert(
      'Archive Product',
      `Are you sure you want to archive "${product.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Archive',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Success', 'Product archived successfully');
            navigation.goBack();
          }
        }
      ]
    );
  };

  const stockLevel = getStockLevel(product.quantity);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Product Image */}
        <View style={[styles.imageContainer, { backgroundColor: theme.colors.surface }]}>
          {product.image_data ? (
            <Image
              source={{ uri: `data:image/jpeg;base64,${product.image_data}` }}
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
                  {product.name}
                </Text>
                <Text style={[styles.productSku, { color: theme.colors.onSurfaceVariant }]}>
                  SKU: {product.sku}
                </Text>
                <Text style={[styles.productCategory, { color: theme.colors.onSurfaceVariant }]}>
                  {product.category}
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
                  {product.quantity?.toLocaleString()} {product.uom || 'units'}
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
                  {formatCurrency(product.unit_price || 0)}
                </Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={[styles.detailLabel, { color: theme.colors.onSurfaceVariant }]}>
                  Total Value
                </Text>
                <Text style={[styles.detailValue, { color: theme.colors.onSurface }]}>
                  {formatCurrency((product.quantity || 0) * (product.unit_price || 0))}
                </Text>
              </View>
            </View>

            {product.description && (
              <>
                <Divider style={styles.divider} />
                <View style={styles.descriptionSection}>
                  <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
                    Description
                  </Text>
                  <Text style={[styles.description, { color: theme.colors.onSurfaceVariant }]}>
                    {product.description}
                  </Text>
                </View>
              </>
            )}

            {/* Supplier Information */}
            {product.supplier_id && (
              <>
                <Divider style={styles.divider} />
                <View style={styles.supplierSection}>
                  <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
                    Supplier Information
                  </Text>
                  <Text style={[styles.supplierName, { color: theme.colors.onSurface }]}>
                    Supplier ID: {product.supplier_id}
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
                    {product.uom || 'Not specified'}
                  </Text>
                </View>

                {product.conversion_qty && (
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: theme.colors.onSurfaceVariant }]}>
                      Conversion Qty:
                    </Text>
                    <Text style={[styles.detailValue, { color: theme.colors.onSurface }]}>
                      {product.conversion_qty} units per {product.uom}
                    </Text>
                  </View>
                )}

                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: theme.colors.onSurfaceVariant }]}>
                    Expirable:
                  </Text>
                  <Text style={[styles.detailValue, { color: theme.colors.onSurface }]}>
                    {product.expirable ? 'Yes' : 'No'}
                  </Text>
                </View>

                {product.expirable && product.expiration && (
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: theme.colors.onSurfaceVariant }]}>
                      Expiration Date:
                    </Text>
                    <Text style={[styles.detailValue, { color: theme.colors.onSurface }]}>
                      {formatDate(product.expiration)}
                    </Text>
                  </View>
                )}

                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: theme.colors.onSurfaceVariant }]}>
                    Date Added:
                  </Text>
                  <Text style={[styles.detailValue, { color: theme.colors.onSurface }]}>
                    {formatDate(product.created_at)}
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

              {product.quantity <= 0 && (
                <View style={[styles.alertItem, { backgroundColor: '#FFEBEE' }]}>
                  <MaterialCommunityIcons name="alert-circle" size={20} color="#D32F2F" />
                  <Text style={[styles.alertText, { color: '#D32F2F' }]}>
                    Out of stock - needs replenishment
                  </Text>
                </View>
              )}

              {product.quantity > 0 && product.quantity <= 300 && (
                <View style={[styles.alertItem, { backgroundColor: '#FFF3E0' }]}>
                  <MaterialCommunityIcons name="alert" size={20} color="#F57C00" />
                  <Text style={[styles.alertText, { color: '#F57C00' }]}>
                    Low stock - consider restocking
                  </Text>
                </View>
              )}

              {product.quantity > 300 && (
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

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <Button
          mode="outlined"
          onPress={() => navigation.goBack()}
          style={styles.actionButton}
        >
          Back
        </Button>
        <Button
          mode="contained"
          onPress={handleEdit}
          style={[styles.actionButton, { backgroundColor: '#2196F3' }]}
        >
          Edit Product
        </Button>
        <Button
          mode="contained"
          onPress={handleAddStock}
          style={[styles.actionButton, { backgroundColor: '#4CAF50' }]}
        >
          Add Stock
        </Button>
        <Button
          mode="contained"
          onPress={handleArchive}
          style={[styles.actionButton, { backgroundColor: '#F44336' }]}
        >
          Archive
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
    color: theme.colors.onSurfaceVariant,
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
    flex: 1,
  },
});
