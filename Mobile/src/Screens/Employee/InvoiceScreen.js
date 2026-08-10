import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Card, Chip } from 'react-native-paper';
import { useTheme } from '../../Context/ThemeContext';
import { useRoute } from '@react-navigation/native';
import { invoiceAPI } from '../../services/api';

const STATUS_COLORS = {
  DRAFT: '#9E9E9E',
  ISSUED: '#2196F3',
  UNPAID: '#FF9800',
  PAID: '#4CAF50',
};

const TYPE_LABELS = {
  DOWN_PAYMENT: 'Down Payment',
  REMAINING_BALANCE: 'Remaining Balance',
};

export default function InvoiceScreen({ navigation }) {
  const theme = useTheme();
  const route = useRoute();
  const { orderId } = route.params;

  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const data = await invoiceAPI.getOrderInvoices(orderId);
      setInvoices(Array.isArray(data) ? data : (data.invoices || []));
    } catch (error) {
      console.error('Error fetching invoices:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchInvoices();
    setRefreshing(false);
  };

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 2 }).format(amount || 0);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const renderInvoice = ({ item }) => (
    <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
      <Card.Content>
        <View style={styles.invoiceHeader}>
          <View style={styles.invoiceInfo}>
            <Text style={[styles.invoiceId, { color: theme.colors.primary }]}>
              Invoice #{item.invoice_id}
            </Text>
            <Text style={[styles.invoiceType, { color: theme.colors.onSurfaceVariant }]}>
              {TYPE_LABELS[item.invoice_type] || item.invoice_type}
            </Text>
          </View>
          <Chip
            style={[styles.statusChip, { backgroundColor: STATUS_COLORS[item.status] || '#9E9E9E' }]}
            textStyle={{ color: '#fff', fontSize: 11, fontWeight: 'bold' }}
          >
            {item.status}
          </Chip>
        </View>

        <View style={styles.amountRow}>
          <View style={styles.amountItem}>
            <Text style={[styles.amountLabel, { color: theme.colors.onSurfaceVariant }]}>Amount Due</Text>
            <Text style={[styles.amountValue, { color: theme.colors.onSurface }]}>
              {formatCurrency(item.amount_due)}
            </Text>
          </View>
          <View style={styles.amountItem}>
            <Text style={[styles.amountLabel, { color: theme.colors.onSurfaceVariant }]}>Amount Paid</Text>
            <Text style={[styles.amountValue, { color: item.amount_paid >= item.amount_due ? '#4CAF50' : theme.colors.onSurface }]}>
              {formatCurrency(item.amount_paid)}
            </Text>
          </View>
          {item.amount_due > item.amount_paid && (
            <View style={styles.amountItem}>
              <Text style={[styles.amountLabel, { color: theme.colors.onSurfaceVariant }]}>Balance</Text>
              <Text style={[styles.amountValue, { color: '#FF9800' }]}>
                {formatCurrency(item.amount_due - item.amount_paid)}
              </Text>
            </View>
          )}
        </View>

        <View style={[styles.dateRow, { borderTopColor: theme.colors.outline }]}>
          <MaterialCommunityIcons name="calendar" size={14} color={theme.colors.onSurfaceVariant} />
          <Text style={[styles.dateText, { color: theme.colors.onSurfaceVariant }]}>
            Issued: {formatDate(item.issued_at)}
          </Text>
          {item.due_date && (
            <Text style={[styles.dateText, { color: theme.colors.onSurfaceVariant, marginLeft: 12 }]}>
              Due: {formatDate(item.due_date)}
            </Text>
          )}
        </View>

        {item.notes && (
          <Text style={[styles.notes, { color: theme.colors.onSurfaceVariant }]}>
            {item.notes}
          </Text>
        )}
      </Card.Content>
    </Card>
  );

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <MaterialCommunityIcons name="file-document-outline" size={64} color={theme.colors.outline} />
      <Text style={[styles.emptyTitle, { color: theme.colors.onSurface }]}>No Invoices</Text>
      <Text style={[styles.emptySubtitle, { color: theme.colors.onSurfaceVariant }]}>
        No invoices have been generated for this order yet.
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={theme.colors.onSurface} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.onSurface }]}>
          Invoices — Order #{orderId}
        </Text>
      </View>

      <FlatList
        data={invoices}
        renderItem={renderInvoice}
        keyExtractor={(item) => String(item.invoice_id)}
        contentContainerStyle={[styles.list, invoices.length === 0 && styles.listEmpty]}
        ListEmptyComponent={!loading ? renderEmpty : null}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backButton: { marginRight: 12, padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', flex: 1 },
  list: { padding: 16, paddingBottom: 32 },
  listEmpty: { flex: 1 },
  card: {
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  invoiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  invoiceInfo: { flex: 1 },
  invoiceId: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  invoiceType: { fontSize: 13 },
  statusChip: { borderRadius: 12 },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    flexWrap: 'wrap',
    gap: 8,
  },
  amountItem: { flex: 1, minWidth: 100 },
  amountLabel: { fontSize: 11, marginBottom: 2 },
  amountValue: { fontSize: 15, fontWeight: 'bold' },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
  },
  dateText: { fontSize: 12, marginLeft: 4 },
  notes: { fontSize: 13, marginTop: 8, fontStyle: 'italic' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', marginTop: 16, marginBottom: 8 },
  emptySubtitle: { fontSize: 16, textAlign: 'center', lineHeight: 24 },
});
