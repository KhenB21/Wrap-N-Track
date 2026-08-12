import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Dimensions,
  Linking
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Button, Card, Chip, Divider } from 'react-native-paper';
import { useTheme } from '../../Context/ThemeContext';
import { useRoute } from '@react-navigation/native';
import { supplierAPI } from '../../services/api';
import { SkeletonProfile, SkeletonCard } from '../../Components/Skeleton/Skeleton';

const { width } = Dimensions.get('window');

export default function SupplierDetailScreen({ navigation }) {
  const theme = useTheme();
  const route = useRoute();
  const { supplier: initialSupplier } = route.params;

  const [supplier, setSupplier] = useState(initialSupplier);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialSupplier?.supplier_id) {
      fetchSupplierDetails();
    }
  }, [initialSupplier?.supplier_id]);

  const fetchSupplierDetails = async () => {
    try {
      setLoading(true);
      const latestSupplier = await supplierAPI.getSupplier(initialSupplier.supplier_id);
      setSupplier(latestSupplier);
      setProducts(latestSupplier.products || []);
    } catch (error) {
      console.error('Error fetching supplier details:', error);
      Alert.alert('Error', error.response?.data?.message || error.response?.data?.error || 'Failed to fetch supplier details');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    navigation.navigate('AddEditSupplier', { 
      supplier, 
      mode: 'edit' 
    });
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Supplier',
      `Are you sure you want to delete ${supplier.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await supplierAPI.deleteSupplier(supplier.supplier_id);
              Alert.alert('Success', 'Supplier deleted successfully');
              navigation.goBack();
            } catch (error) {
              Alert.alert('Error', error.response?.data?.message || error.response?.data?.error || 'Failed to delete supplier');
            }
          }
        }
      ]
    );
  };

  const handleCall = () => {
    if (!supplier.cellphone) {
      Alert.alert('No Phone Number', 'Supplier phone number is not available');
      return;
    }
    Alert.alert(
      'Call Supplier',
      `Call ${supplier.name} at ${supplier.cellphone}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Call',
          onPress: () => {
            Linking.openURL(`tel:${supplier.cellphone}`).catch(() =>
              Alert.alert('Error', 'Unable to open the phone dialer on this device')
            );
          }
        }
      ]
    );
  };

  const handleEmail = () => {
    if (!supplier.email_address) {
      Alert.alert('No Email', 'Supplier email address is not available');
      return;
    }
    Alert.alert(
      'Email Supplier',
      `Send email to ${supplier.name} at ${supplier.email_address}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Email',
          onPress: () => {
            Linking.openURL(`mailto:${supplier.email_address}`).catch(() =>
              Alert.alert('Error', 'No email app is available on this device')
            );
          }
        }
      ]
    );
  };

  const handleContact = () => {
    const canCall = !!supplier.cellphone;
    const canEmail = !!supplier.email_address;
    if (!canCall && !canEmail) {
      Alert.alert('No Contact Info', 'This supplier has no phone number or email on file');
      return;
    }
    const options = [];
    if (canCall) options.push({ text: '📞 Call', onPress: handleCall });
    if (canEmail) options.push({ text: '✉️ Email', onPress: handleEmail });
    options.push({ text: 'Cancel', style: 'cancel' });
    Alert.alert('Contact Supplier', supplier.name, options);
  };

  const getReliabilityColor = (score) => {
    if (score >= 4.5) return '#4CAF50';
    if (score >= 3.5) return '#FFC107';
    if (score >= 2.5) return '#FF9800';
    return '#F44336';
  };

  const getReliabilityText = (score) => {
    if (score >= 4.5) return 'Excellent';
    if (score >= 3.5) return 'Good';
    if (score >= 2.5) return 'Fair';
    return 'Poor';
  };

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

  const renderSupplierHeader = () => (
    <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
      <Card.Content>
        <View style={styles.supplierHeader}>
          <View style={styles.supplierInfo}>
            <Text style={[styles.supplierName, { color: theme.colors.onSurface }]}>
              {supplier.name}
            </Text>
            <Text style={[styles.contactPerson, { color: theme.colors.onSurfaceVariant }]}>
              Contact: {supplier.contact_person}
            </Text>
            <Text style={[styles.supplierType, { color: theme.colors.onSurfaceVariant }]}>
              {supplier.type_of_supplies}
            </Text>
          </View>
          <View style={styles.reliabilityContainer}>
            <View style={[styles.reliabilityBadge, { backgroundColor: getReliabilityColor(supplier.reliability_score) }]}>
              <Text style={styles.reliabilityScore}>{supplier.reliability_score}</Text>
            </View>
            <Text style={[styles.reliabilityText, { color: getReliabilityColor(supplier.reliability_score) }]}>
              {getReliabilityText(supplier.reliability_score)}
            </Text>
          </View>
        </View>
        
        <View style={styles.contactActions}>
          <TouchableOpacity
            style={[styles.contactButton, styles.contactButtonWide, { backgroundColor: theme.colors.primary }]}
            onPress={handleContact}
          >
            <MaterialCommunityIcons name="account-voice" size={16} color="#fff" />
            <Text style={styles.contactButtonText}>Contact Supplier</Text>
          </TouchableOpacity>
        </View>
      </Card.Content>
    </Card>
  );

  const renderContactInfo = () => (
    <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
      <Card.Content>
        <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
          Contact Information
        </Text>
        
        <View style={styles.contactRow}>
          <MaterialCommunityIcons name="email" size={20} color={theme.colors.primary} />
          <Text style={[styles.contactText, { color: theme.colors.onSurface }]}>
            {supplier.email_address}
          </Text>
        </View>
        
        <View style={styles.contactRow}>
          <MaterialCommunityIcons name="phone" size={20} color={theme.colors.primary} />
          <Text style={[styles.contactText, { color: theme.colors.onSurface }]}>
            {supplier.cellphone}
          </Text>
        </View>
        
        {supplier.telephone && (
          <View style={styles.contactRow}>
            <MaterialCommunityIcons name="phone-classic" size={20} color={theme.colors.primary} />
            <Text style={[styles.contactText, { color: theme.colors.onSurface }]}>
              {supplier.telephone}
            </Text>
          </View>
        )}
      </Card.Content>
    </Card>
  );

  const renderAddressInfo = () => (
    <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
      <Card.Content>
        <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
          Address
        </Text>
        
        <View style={styles.addressContainer}>
          <MaterialCommunityIcons name="map-marker" size={20} color={theme.colors.primary} />
          <View style={styles.addressText}>
            <Text style={[styles.addressLine, { color: theme.colors.onSurface }]}>
              {supplier.street_address}
            </Text>
            <Text style={[styles.addressLine, { color: theme.colors.onSurface }]}>
              {supplier.barangay}
            </Text>
            <Text style={[styles.addressLine, { color: theme.colors.onSurface }]}>
              {supplier.city_municipality}, {supplier.province}
            </Text>
          </View>
        </View>
      </Card.Content>
    </Card>
  );

  const renderSupplierStats = () => (
    <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
      <Card.Content>
        <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
          Supplier Statistics
        </Text>
        
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: theme.colors.primary }]}>
              {supplier.total_products || 0}
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>
              Total Products
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: theme.colors.primary }]}>
              {supplier.reliability_score}
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>
              Reliability Score
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: theme.colors.primary }]}>
              {formatDate(supplier.last_order_date)}
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>
              Last Order
            </Text>
          </View>
        </View>
      </Card.Content>
    </Card>
  );

  const renderProducts = () => (
    <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
      <Card.Content>
        <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
          Products ({products.length})
        </Text>
        
        {products.length > 0 ? (
          products.map((product, index) => (
            <View key={product.sku} style={styles.productItem}>
              <View style={styles.productInfo}>
                <Text style={[styles.productName, { color: theme.colors.onSurface }]}>
                  {product.name}
                </Text>
                <Text style={[styles.productSku, { color: theme.colors.onSurfaceVariant }]}>
                  SKU: {product.sku}
                </Text>
                <Text style={[styles.productCategory, { color: theme.colors.onSurfaceVariant }]}>
                  {product.category}
                </Text>
              </View>
              <View style={styles.productStats}>
                <Text style={[styles.productQuantity, { color: theme.colors.onSurface }]}>
                  Qty: {product.quantity}
                </Text>
                <Text style={[styles.productPrice, { color: theme.colors.onSurface }]}>
                  {formatCurrency(product.unit_price)}
                </Text>
              </View>
            </View>
          ))
        ) : (
          <Text style={[styles.noProductsText, { color: theme.colors.onSurfaceVariant }]}>
            No products found
          </Text>
        )}
      </Card.Content>
    </Card>
  );

  const renderDescription = () => {
    if (!supplier.description) return null;

    return (
      <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        <Card.Content>
          <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
            Description
          </Text>
          <Text style={[styles.descriptionText, { color: theme.colors.onSurfaceVariant }]}>
            {supplier.description}
          </Text>
        </Card.Content>
      </Card>
    );
  };

  const renderActionButtons = () => (
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
        Edit
      </Button>
      <Button
        mode="contained"
        onPress={handleDelete}
        style={[styles.actionButton, { backgroundColor: '#F44336' }]}
      >
        Delete
      </Button>
    </View>
  );

  if (loading && !supplier) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={{ padding: 16 }}>
          <SkeletonProfile />
          <SkeletonCard lines={3} style={{ marginTop: 12 }} />
        </View>
      </View>
    );
  }

  if (!supplier) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.colors.background }]}>
        <MaterialCommunityIcons name="alert-circle" size={48} color={theme.colors.error} />
        <Text style={[styles.errorText, { color: theme.colors.error }]}>
          Supplier not found
        </Text>
        <Button
          mode="contained"
          onPress={() => navigation.goBack()}
          style={styles.retryButton}
        >
          Go Back
        </Button>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {renderSupplierHeader()}
        {renderContactInfo()}
        {renderAddressInfo()}
        {renderSupplierStats()}
        {renderProducts()}
        {renderDescription()}
      </ScrollView>
      {renderActionButtons()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
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
  supplierHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  supplierInfo: {
    flex: 1,
  },
  supplierName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  contactPerson: {
    fontSize: 16,
    marginBottom: 4,
  },
  supplierType: {
    fontSize: 14,
  },
  reliabilityContainer: {
    alignItems: 'flex-end',
  },
  reliabilityBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  reliabilityScore: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  reliabilityText: {
    fontSize: 12,
    fontWeight: '500',
  },
  contactActions: {
    flexDirection: 'row',
    gap: 12,
  },
  contactButtonWide: {
    flex: 1,
  },
  contactButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  contactButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  contactText: {
    fontSize: 16,
    marginLeft: 12,
    flex: 1,
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  addressText: {
    flex: 1,
    marginLeft: 12,
  },
  addressLine: {
    fontSize: 16,
    marginBottom: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  productItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  productSku: {
    fontSize: 12,
    marginBottom: 2,
  },
  productCategory: {
    fontSize: 12,
  },
  productStats: {
    alignItems: 'flex-end',
  },
  productQuantity: {
    fontSize: 14,
    marginBottom: 2,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  noProductsText: {
    textAlign: 'center',
    fontSize: 14,
    fontStyle: 'italic',
    padding: 20,
  },
  descriptionText: {
    fontSize: 16,
    lineHeight: 24,
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
  loadingText: {
    fontSize: 16,
    marginTop: 16,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
  },
  retryButton: {
    marginTop: 16,
  },
});
