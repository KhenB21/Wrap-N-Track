import React, { useState } from 'react';
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

export default function OrderStatusUpdateScreen({ navigation }) {
  const theme = useTheme();
  const route = useRoute();
  const { order } = route.params;

  const [selectedStatus, setSelectedStatus] = useState(order?.status || '');
  const [paymentMethod, setPaymentMethod] = useState(order?.payment_method || '');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const statusOptions = [
    { value: 'Order Placed', label: 'Order Placed', icon: 'clipboard-text' },
    { value: 'Order Paid', label: 'Order Paid', icon: 'credit-card' },
    { value: 'To Be Packed', label: 'To Be Packed', icon: 'package-variant-closed' },
    { value: 'Order Shipped Out', label: 'Order Shipped Out', icon: 'truck-delivery' },
    { value: 'Ready for Delivery', label: 'Ready for Delivery', icon: 'truck' },
    { value: 'Order Received', label: 'Order Received', icon: 'check-circle' },
    { value: 'Completed', label: 'Completed', icon: 'check-circle' },
    { value: 'Cancelled', label: 'Cancelled', icon: 'close-circle' }
  ];

  const paymentMethods = [
    'Cash on Delivery',
    'Bank Transfer',
    'Credit Card',
    'PayPal',
    'GCash',
    'PayMaya'
  ];

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

  const handleSubmit = async () => {
    if (!selectedStatus) {
      Alert.alert('Error', 'Please select a status');
      return;
    }

    try {
      setLoading(true);
      // Implement API call to update order status
      Alert.alert('Success', 'Order status updated successfully', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to update order status');
    } finally {
      setLoading(false);
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

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Order Summary */}
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
              Order Summary
            </Text>
            
            <View style={styles.orderInfo}>
              <Text style={[styles.orderId, { color: theme.colors.primary }]}>
                #{order.order_id}
              </Text>
              <Text style={[styles.customerName, { color: theme.colors.onSurface }]}>
                {order.customer_name}
              </Text>
              <Text style={[styles.orderTotal, { color: theme.colors.onSurface }]}>
                {formatCurrency(order.total_cost)}
              </Text>
            </View>
          </Card.Content>
        </Card>

        {/* Current Status */}
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
              Current Status
            </Text>
            
            <View style={[styles.currentStatus, { backgroundColor: getStatusColor(order.status) }]}>
              <MaterialCommunityIcons name="information" size={20} color="#fff" />
              <Text style={styles.currentStatusText}>{order.status}</Text>
            </View>
          </Card.Content>
        </Card>

        {/* Status Selection */}
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
              Update Status
            </Text>
            
            <RadioButton.Group onValueChange={setSelectedStatus} value={selectedStatus}>
              {statusOptions.map((status) => (
                <View key={status.value} style={styles.statusOption}>
                  <View style={styles.statusOptionContent}>
                    <MaterialCommunityIcons 
                      name={status.icon} 
                      size={20} 
                      color={theme.colors.onSurface} 
                    />
                    <Text style={[styles.statusLabel, { color: theme.colors.onSurface }]}>
                      {status.label}
                    </Text>
                  </View>
                  <RadioButton value={status.value} />
                </View>
              ))}
            </RadioButton.Group>
          </Card.Content>
        </Card>

        {/* Payment Method */}
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
              Payment Method
            </Text>
            
            <RadioButton.Group onValueChange={setPaymentMethod} value={paymentMethod}>
              {paymentMethods.map((method) => (
                <View key={method} style={styles.paymentOption}>
                  <Text style={[styles.paymentLabel, { color: theme.colors.onSurface }]}>
                    {method}
                  </Text>
                  <RadioButton value={method} />
                </View>
              ))}
            </RadioButton.Group>
          </Card.Content>
        </Card>

        {/* Notes */}
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
              Additional Notes
            </Text>
            
            <TextInput
              label="Notes (Optional)"
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={4}
              style={styles.notesInput}
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
          Update Status
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
  orderInfo: {
    alignItems: 'center',
  },
  orderId: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  customerName: {
    fontSize: 16,
    marginBottom: 4,
  },
  orderTotal: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  currentStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
  },
  currentStatusText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
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
  paymentOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  paymentLabel: {
    fontSize: 16,
    flex: 1,
  },
  notesInput: {
    marginTop: 8,
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
