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
    navigation.navigate('EditProduct', { product, mode: 'edit' });
  };

  const handleAddStock = () => {
    navigation.navigate('EditProduct', { product, mode: 'addStock' });
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
              source={{ uri: `data:image/png;base64,${product.image_data}` }}
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
              <Text style={[styles.productName, { color: theme.colors.onSurface }]}>
                {product.name}
              </Text>
              <Chip
                style={[styles.stockChip, { backgroundColor: stockLevel.color }]}
                textStyle={{ color: '#fff' }}
              >
                {stockLevel.text}
              </Chip>
            </View>
            
            <Text style={[styles.productSku, { color: theme.colors.onSurfaceVariant }]}>
              SKU: {product.sku}
            </Text>
            
            <Text style={[styles.productPrice, { color: theme.colors.onSurface }]}>
              {formatCurrency(product.unit_price)}
            </Text>
            
            {product.description && (
              <Text style={[styles.productDescription, { color: theme.colors.onSurfaceVariant }]}>
                {product.description}
              </Text>
            )}
          </Card.Content>
        </Card>

        {/* Stock Information */}
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
              Stock Information
            </Text>
            
            <View style={styles.stockRow}>
              <Text style={[styles.stockLabel, { color: theme.colors.onSurfaceVariant }]}>
                Current Stock:
              </Text>
              <Text style={[styles.stockValue, { color: theme.colors.onSurface }]}>
                {product.quantity.toLocaleString()} units
              </Text>
            </View>
            
            <View style={styles.stockRow}>
              <Text style={[styles.stockLabel, { color: theme.colors.onSurfaceVariant }]}>
                Ordered Quantity:
              </Text>
              <Text style={[styles.stockValue, { color: theme.colors.onSurface }]}>
                {product.ordered_quantity || 0} units
              </Text>
            </View>
            
            <View style={styles.stockRow}>
              <Text style={[styles.stockLabel, { color: theme.colors.onSurfaceVariant }]}>
                Delivered Quantity:
              </Text>
              <Text style={[styles.stockValue, { color: theme.colors.onSurface }]}>
                {product.delivered_quantity || 0} units
              </Text>
            </View>
            
            <View style={styles.stockRow}>
              <Text style={[styles.stockLabel, { color: theme.colors.onSurfaceVariant }]}>
                Reorder Level:
              </Text>
              <Text style={[styles.stockValue, { color: theme.colors.onSurface }]}>
                {product.reorder_level || 0} units
              </Text>
            </View>
          </Card.Content>
        </Card>

        {/* Product Details */}
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
              Product Details
            </Text>
            
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.colors.onSurfaceVariant }]}>
                Category:
              </Text>
              <Text style={[styles.detailValue, { color: theme.colors.onSurface }]}>
                {product.category}
              </Text>
            </View>
            
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.colors.onSurfaceVariant }]}>
                Unit of Measure:
              </Text>
              <Text style={[styles.detailValue, { color: theme.colors.onSurface }]}>
                {product.uom || 'N/A'}
              </Text>
            </View>
            
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.colors.onSurfaceVariant }]}>
                Conversion Quantity:
              </Text>
              <Text style={[styles.detailValue, { color: theme.colors.onSurface }]}>
                {product.conversion_qty || 'N/A'}
              </Text>
            </View>
            
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.colors.onSurfaceVariant }]}>
                Last Updated:
              </Text>
              <Text style={[styles.detailValue, { color: theme.colors.onSurface }]}>
                {formatDate(product.last_updated)}
              </Text>
            </View>
          </Card.Content>
        </Card>

        {/* Supplier Information */}
        {product.supplier_name && (
          <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <Card.Content>
              <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
                Supplier Information
              </Text>
              
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: theme.colors.onSurfaceVariant }]}>
                  Supplier:
                </Text>
                <Text style={[styles.detailValue, { color: theme.colors.onSurface }]}>
                  {product.supplier_name}
                </Text>
              </View>
              
              {product.supplier_phone && (
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: theme.colors.onSurfaceVariant }]}>
                    Phone:
                  </Text>
                  <Text style={[styles.detailValue, { color: theme.colors.onSurface }]}>
                    {product.supplier_phone}
                  </Text>
                </View>
              )}
              
              {product.supplier_website && (
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: theme.colors.onSurfaceVariant }]}>
                    Website:
                  </Text>
                  <Text style={[styles.detailValue, { color: theme.colors.onSurface }]}>
                    {product.supplier_website}
                  </Text>
                </View>
              )}
            </Card.Content>
          </Card>
        )}

        {/* Expiration Information */}
        {product.expiration && (
          <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <Card.Content>
              <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
                Expiration Information
              </Text>
              
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: theme.colors.onSurfaceVariant }]}>
                  Expiration Date:
                </Text>
                <Text style={[styles.detailValue, { color: theme.colors.onSurface }]}>
                  {formatDate(product.expiration)}
                </Text>
              </View>
            </Card.Content>
          </Card>
        )}
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
          onPress={handleAddStock}
          style={[styles.actionButton, { backgroundColor: '#4CAF50' }]}
        >
          Add Stock
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
  imageContainer: {
    height: 200,
    borderRadius: 12,
    marginBottom: 16,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
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
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  productName: {
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 12,
  },
  stockChip: {
    alignSelf: 'flex-start',
  },
  productSku: {
    fontSize: 14,
    marginBottom: 8,
  },
  productPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  productDescription: {
    fontSize: 16,
    lineHeight: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  stockRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  stockLabel: {
    fontSize: 14,
  },
  stockValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  actionButtons: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
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
