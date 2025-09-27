import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Dimensions
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Button, Card, Divider, Chip } from 'react-native-paper';
import { useTheme } from '../../Context/ThemeContext';
import { useRoute } from '@react-navigation/native';
import { useOrders } from '../../Context/OrdersContext';

const { width } = Dimensions.get('window');

export default function OrderDetailScreen({ navigation }) {
  const theme = useTheme();
  const route = useRoute();
  const { order: initialOrder } = route.params;
  const { getOrder, updateOrderStatus } = useOrders();

  const [order, setOrder] = useState(initialOrder);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialOrder?.order_id) {
      fetchOrderDetails();
    }
  }, [initialOrder?.order_id]);

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      const orderDetails = await getOrder(initialOrder.order_id);
      setOrder(orderDetails);
    } catch (error) {
      console.error('Error fetching order details:', error);
      Alert.alert('Error', 'Failed to fetch order details');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const statusColors = {
      'Order Placed': '#17a2b8',
      'Order Paid': '#28a745',
      'To Be Packed': '#ffc107',
      'Order Shipped Out': '#007bff',
      'Ready for Delivery': '#6f42c1',
      'Order Received': '#20c997',
      'Completed': '#28a745',
      'Cancelled': '#dc3545'
    };
    return statusColors[status] || '#6c757d';
  };

  const getStatusIcon = (status) => {
    const statusIcons = {
      'Order Placed': 'clipboard-text',
      'Order Paid': 'credit-card',
      'To Be Packed': 'package-variant-closed',
      'Order Shipped Out': 'truck-delivery',
      'Ready for Delivery': 'truck',
      'Order Received': 'check-circle',
      'Completed': 'check-circle',
      'Cancelled': 'close-circle'
    };
    return statusIcons[status] || 'help-circle';
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

  const formatTime = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleTimeString('en-PH', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleStatusUpdate = () => {
    navigation.navigate('OrderStatusUpdate', { order });
  };

  const handleCallCustomer = () => {
    if (order.telephone) {
      Alert.alert(
        'Call Customer',
        `Call ${order.customer_name} at ${order.telephone}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Call', 
            onPress: () => {
              // Implement phone call functionality
              Alert.alert('Call', 'Phone call functionality would be implemented here');
            }
          }
        ]
      );
    } else {
      Alert.alert('No Phone Number', 'Customer phone number is not available');
    }
  };

  const handleEmailCustomer = () => {
    if (order.email_address) {
      Alert.alert(
        'Email Customer',
        `Send email to ${order.customer_name} at ${order.email_address}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Email', 
            onPress: () => {
              // Implement email functionality
              Alert.alert('Email', 'Email functionality would be implemented here');
            }
          }
        ]
      );
    } else {
      Alert.alert('No Email', 'Customer email address is not available');
    }
  };

  const renderOrderHeader = () => (
    <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
      <Card.Content>
        <View style={styles.orderHeader}>
          <View style={styles.orderInfo}>
            <Text style={[styles.orderId, { color: theme.colors.primary }]}>
              Order #{order.order_id}
            </Text>
            <Text style={[styles.orderDate, { color: theme.colors.onSurfaceVariant }]}>
              {formatDate(order.order_date)}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]}>
            <MaterialCommunityIcons 
              name={getStatusIcon(order.status)} 
              size={20} 
              color="#fff" 
            />
            <Text style={styles.statusText}>{order.status}</Text>
          </View>
        </View>
      </Card.Content>
    </Card>
  );

  const renderOrderSummary = () => (
    <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
      <Card.Content>
        <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
          Order Summary
        </Text>
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: theme.colors.onSurfaceVariant }]}>
            Total Cost:
          </Text>
          <Text style={[styles.summaryValue, { color: theme.colors.onSurface }]}>
            {formatCurrency(order.total_cost)}
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: theme.colors.onSurfaceVariant }]}>
            Payment Method:
          </Text>
          <Text style={[styles.summaryValue, { color: theme.colors.onSurface }]}>
            {order.payment_method || 'N/A'}
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: theme.colors.onSurfaceVariant }]}>
            Expected Delivery:
          </Text>
          <Text style={[styles.summaryValue, { color: theme.colors.onSurface }]}>
            {formatDate(order.expected_delivery)}
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: theme.colors.onSurfaceVariant }]}>
            Last Updated:
          </Text>
          <Text style={[styles.summaryValue, { color: theme.colors.onSurface }]}>
            {formatDate(order.status_updated_at)}
          </Text>
        </View>
      </Card.Content>
    </Card>
  );

  const renderCustomerInfo = () => (
    <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
      <Card.Content>
        <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
          Customer Information
        </Text>
        <View style={styles.customerHeader}>
          <View style={styles.customerAvatar}>
            <MaterialCommunityIcons name="account" size={24} color={theme.colors.primary} />
          </View>
          <View style={styles.customerInfo}>
            <Text style={[styles.customerName, { color: theme.colors.onSurface }]}>
              {order.customer_name}
            </Text>
            <Text style={[styles.customerEmail, { color: theme.colors.onSurfaceVariant }]}>
              {order.email_address}
            </Text>
          </View>
        </View>
        
        <View style={styles.contactActions}>
          <TouchableOpacity
            style={[styles.contactButton, { backgroundColor: '#4CAF50' }]}
            onPress={handleCallCustomer}
          >
            <MaterialCommunityIcons name="phone" size={16} color="#fff" />
            <Text style={styles.contactButtonText}>Call</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.contactButton, { backgroundColor: '#2196F3' }]}
            onPress={handleEmailCustomer}
          >
            <MaterialCommunityIcons name="email" size={16} color="#fff" />
            <Text style={styles.contactButtonText}>Email</Text>
          </TouchableOpacity>
        </View>

        <Divider style={styles.divider} />

        <View style={styles.shippingInfo}>
          <Text style={[styles.shippingTitle, { color: theme.colors.onSurface }]}>
            Shipping Address
          </Text>
          <Text style={[styles.shippingAddress, { color: theme.colors.onSurfaceVariant }]}>
            {order.shipped_to}
          </Text>
          <Text style={[styles.shippingAddress, { color: theme.colors.onSurfaceVariant }]}>
            {order.shipping_address}
          </Text>
          <Text style={[styles.shippingPhone, { color: theme.colors.onSurfaceVariant }]}>
            Phone: {order.telephone}
          </Text>
        </View>
      </Card.Content>
    </Card>
  );

  const renderOrderItems = () => (
    <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
      <Card.Content>
        <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
          Order Items ({order.products?.length || 0})
        </Text>
        {order.products?.map((product, index) => (
          <View key={index} style={styles.productItem}>
            <View style={styles.productInfo}>
              <Text style={[styles.productName, { color: theme.colors.onSurface }]}>
                {product.product_name}
              </Text>
              <Text style={[styles.productSku, { color: theme.colors.onSurfaceVariant }]}>
                SKU: {product.sku}
              </Text>
              {product.description && (
                <Text style={[styles.productDescription, { color: theme.colors.onSurfaceVariant }]}>
                  {product.description}
                </Text>
              )}
            </View>
            <View style={styles.productQuantity}>
              <Text style={[styles.quantityText, { color: theme.colors.onSurface }]}>
                Qty: {product.quantity}
              </Text>
            </View>
            <View style={styles.productPrice}>
              <Text style={[styles.priceText, { color: theme.colors.onSurface }]}>
                {formatCurrency(product.total_price)}
              </Text>
            </View>
          </View>
        ))}
      </Card.Content>
    </Card>
  );

  const renderSpecialInstructions = () => {
    if (!order.remarks) return null;

    return (
      <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        <Card.Content>
          <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
            Special Instructions
          </Text>
          <Text style={[styles.remarksText, { color: theme.colors.onSurfaceVariant }]}>
            {order.remarks}
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
        onPress={handleStatusUpdate}
        style={[styles.actionButton, styles.primaryButton]}
      >
        Update Status
      </Button>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.colors.background }]}>
        <MaterialCommunityIcons name="loading" size={48} color={theme.colors.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.onBackground }]}>
          Loading order details...
        </Text>
      </View>
    );
  }

  if (!order) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.colors.background }]}>
        <MaterialCommunityIcons name="alert-circle" size={48} color={theme.colors.error} />
        <Text style={[styles.errorText, { color: theme.colors.error }]}>
          Order not found
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
        {renderOrderHeader()}
        {renderOrderSummary()}
        {renderCustomerInfo()}
        {renderOrderItems()}
        {renderSpecialInstructions()}
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
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  orderInfo: {
    flex: 1,
  },
  orderId: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 14,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  customerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  customerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  customerEmail: {
    fontSize: 14,
  },
  contactActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
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
  divider: {
    marginVertical: 16,
  },
  shippingInfo: {
    marginTop: 8,
  },
  shippingTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  shippingAddress: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  shippingPhone: {
    fontSize: 14,
    marginTop: 4,
  },
  productItem: {
    flexDirection: 'row',
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
  productDescription: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  productQuantity: {
    marginHorizontal: 12,
  },
  quantityText: {
    fontSize: 14,
    fontWeight: '500',
  },
  productPrice: {
    alignItems: 'flex-end',
  },
  priceText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  remarksText: {
    fontSize: 14,
    lineHeight: 20,
    fontStyle: 'italic',
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
  primaryButton: {
    backgroundColor: '#2E7D32',
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
