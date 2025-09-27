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
import { Button, Card, Chip, Avatar, Divider } from 'react-native-paper';
import { useTheme } from '../../Context/ThemeContext';
import { useRoute } from '@react-navigation/native';

const { width } = Dimensions.get('window');

export default function CustomerDetailScreen({ navigation }) {
  const theme = useTheme();
  const route = useRoute();
  const { customer: initialCustomer } = route.params;

  const [customer, setCustomer] = useState(initialCustomer);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialCustomer?.customer_id) {
      fetchCustomerDetails();
    }
  }, [initialCustomer?.customer_id]);

  const fetchCustomerDetails = async () => {
    try {
      setLoading(true);
      // Mock data - replace with actual API call
      const mockOrders = [
        {
          order_id: 'ORD-001',
          order_date: '2024-01-15T10:30:00Z',
          status: 'Completed',
          total_cost: 5000
        },
        {
          order_id: 'ORD-002',
          order_date: '2024-01-20T14:45:00Z',
          status: 'Order Shipped Out',
          total_cost: 3500
        }
      ];
      setOrders(mockOrders);
    } catch (error) {
      console.error('Error fetching customer details:', error);
      Alert.alert('Error', 'Failed to fetch customer details');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    navigation.navigate('AddEditCustomer', { 
      customer, 
      mode: 'edit' 
    });
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Customer',
      `Are you sure you want to delete ${customer.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => {
            Alert.alert('Success', 'Customer deleted successfully');
            navigation.goBack();
          }
        }
      ]
    );
  };

  const handleCall = () => {
    if (customer.phone_number) {
      Alert.alert(
        'Call Customer',
        `Call ${customer.name} at ${customer.phone_number}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Call', 
            onPress: () => {
              Alert.alert('Call', 'Phone call functionality would be implemented here');
            }
          }
        ]
      );
    } else {
      Alert.alert('No Phone Number', 'Customer phone number is not available');
    }
  };

  const handleEmail = () => {
    if (customer.email_address) {
      Alert.alert(
        'Email Customer',
        `Send email to ${customer.name} at ${customer.email_address}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Email', 
            onPress: () => {
              Alert.alert('Email', 'Email functionality would be implemented here');
            }
          }
        ]
      );
    } else {
      Alert.alert('No Email', 'Customer email address is not available');
    }
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

  const renderCustomerHeader = () => (
    <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
      <Card.Content>
        <View style={styles.customerHeader}>
          <Avatar.Text
            size={80}
            label={customer.name.charAt(0).toUpperCase()}
            style={{ backgroundColor: theme.colors.primary }}
          />
          <View style={styles.customerInfo}>
            <Text style={[styles.customerName, { color: theme.colors.onSurface }]}>
              {customer.name}
            </Text>
            <Text style={[styles.customerEmail, { color: theme.colors.onSurfaceVariant }]}>
              {customer.email_address}
            </Text>
            <Text style={[styles.customerPhone, { color: theme.colors.onSurfaceVariant }]}>
              {customer.phone_number || 'No phone number'}
            </Text>
            <Chip
              mode="outlined"
              style={[
                styles.statusChip,
                { 
                  backgroundColor: customer.status === 'active' ? '#E8F5E8' : '#FFEBEE',
                  borderColor: customer.status === 'active' ? '#4CAF50' : '#F44336'
                }
              ]}
            >
              {customer.status}
            </Chip>
          </View>
        </View>
        
        <View style={styles.contactActions}>
          <TouchableOpacity
            style={[styles.contactButton, { backgroundColor: '#4CAF50' }]}
            onPress={handleCall}
          >
            <MaterialCommunityIcons name="phone" size={16} color="#fff" />
            <Text style={styles.contactButtonText}>Call</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.contactButton, { backgroundColor: '#2196F3' }]}
            onPress={handleEmail}
          >
            <MaterialCommunityIcons name="email" size={16} color="#fff" />
            <Text style={styles.contactButtonText}>Email</Text>
          </TouchableOpacity>
        </View>
      </Card.Content>
    </Card>
  );

  const renderCustomerStats = () => (
    <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
      <Card.Content>
        <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
          Customer Statistics
        </Text>
        
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: theme.colors.primary }]}>
              {customer.total_orders || 0}
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>
              Total Orders
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: theme.colors.primary }]}>
              {formatCurrency(customer.total_spent || 0)}
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>
              Total Spent
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: theme.colors.primary }]}>
              {formatDate(customer.created_at)}
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>
              Member Since
            </Text>
          </View>
        </View>
      </Card.Content>
    </Card>
  );

  const renderOrderHistory = () => (
    <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
      <Card.Content>
        <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
          Order History ({orders.length})
        </Text>
        
        {orders.length > 0 ? (
          orders.map((order, index) => (
            <View key={order.order_id} style={styles.orderItem}>
              <View style={styles.orderInfo}>
                <Text style={[styles.orderId, { color: theme.colors.primary }]}>
                  #{order.order_id}
                </Text>
                <Text style={[styles.orderDate, { color: theme.colors.onSurfaceVariant }]}>
                  {formatDate(order.order_date)}
                </Text>
                <Text style={[styles.orderTotal, { color: theme.colors.onSurface }]}>
                  {formatCurrency(order.total_cost)}
                </Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]}>
                <Text style={styles.statusText}>{order.status}</Text>
              </View>
            </View>
          ))
        ) : (
          <Text style={[styles.noOrdersText, { color: theme.colors.onSurfaceVariant }]}>
            No orders found
          </Text>
        )}
      </Card.Content>
    </Card>
  );

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

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.colors.background }]}>
        <MaterialCommunityIcons name="loading" size={48} color={theme.colors.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.onBackground }]}>
          Loading customer details...
        </Text>
      </View>
    );
  }

  if (!customer) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.colors.background }]}>
        <MaterialCommunityIcons name="alert-circle" size={48} color={theme.colors.error} />
        <Text style={[styles.errorText, { color: theme.colors.error }]}>
          Customer not found
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
        {renderCustomerHeader()}
        {renderCustomerStats()}
        {renderOrderHistory()}
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
  customerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  customerInfo: {
    flex: 1,
    marginLeft: 16,
  },
  customerName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  customerEmail: {
    fontSize: 16,
    marginBottom: 4,
  },
  customerPhone: {
    fontSize: 16,
    marginBottom: 8,
  },
  statusChip: {
    alignSelf: 'flex-start',
  },
  contactActions: {
    flexDirection: 'row',
    gap: 12,
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
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  orderInfo: {
    flex: 1,
  },
  orderId: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 12,
    marginBottom: 2,
  },
  orderTotal: {
    fontSize: 14,
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  noOrdersText: {
    textAlign: 'center',
    fontSize: 14,
    fontStyle: 'italic',
    padding: 20,
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
