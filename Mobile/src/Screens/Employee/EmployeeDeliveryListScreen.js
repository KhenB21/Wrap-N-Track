import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  RefreshControl,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Chip } from 'react-native-paper';
import { useTheme } from '../../Context/ThemeContext';
import { deliveryAPI } from '../../services/api';
import { SkeletonCard } from '../../Components/Skeleton/Skeleton';

const STATUS_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'Pending', label: 'Pending' },
  { key: 'Ready for Delivery', label: 'Ready' },
  { key: 'Out for Delivery', label: 'Out' },
  { key: 'Delivered', label: 'Delivered' },
  { key: 'Failed Delivery', label: 'Failed' },
];

const STATUS_COLORS = {
  Pending: '#9E9E9E',
  Preparing: '#FF9800',
  'Ready for Delivery': '#2196F3',
  'Awaiting Pick-up': '#9C27B0',
  'Out for Delivery': '#FF9800',
  'Sent / Shipped': '#03A9F4',
  Delivered: '#4CAF50',
  'Picked Up': '#4CAF50',
  'Failed Delivery': '#F44336',
  Rescheduled: '#FF5722',
  Cancelled: '#757575',
};

const formatDate = (value) => {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(Number(value || 0));

export default function EmployeeDeliveryListScreen({ navigation }) {
  const theme = useTheme();
  const [deliveries, setDeliveries] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchDeliveries = useCallback(async () => {
    setLoading(true);
    try {
      const data = await deliveryAPI.getDeliveries();
      const list = data.deliveries || [];
      setDeliveries(list);
      applyFilters(list, search, statusFilter);
    } catch (error) {
      console.error('Error fetching deliveries:', error);
      Alert.alert('Error', 'Failed to load deliveries');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDeliveries();
  }, [fetchDeliveries]);

  const applyFilters = (list, searchText, status) => {
    let result = list;
    if (status !== 'all') {
      result = result.filter((d) => d.delivery_status === status);
    }
    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      result = result.filter(
        (d) =>
          String(d.order_id || '').toLowerCase().includes(q) ||
          String(d.customer_name || '').toLowerCase().includes(q) ||
          String(d.shipping_address || '').toLowerCase().includes(q) ||
          String(d.tracking_number || '').toLowerCase().includes(q) ||
          String(d.courier_name || '').toLowerCase().includes(q)
      );
    }
    setFiltered(result);
  };

  const handleSearch = (text) => {
    setSearch(text);
    applyFilters(deliveries, text, statusFilter);
  };

  const handleStatusFilter = (status) => {
    setStatusFilter(status);
    applyFilters(deliveries, search, status);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDeliveries();
    setRefreshing(false);
  };

  const renderDeliveryCard = ({ item }) => {
    const statusColor = STATUS_COLORS[item.delivery_status] || '#9E9E9E';
    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: theme.colors.surface }]}
        onPress={() => navigation.navigate('EmployeeDeliveryUpdate', { orderId: item.order_id, delivery: item })}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardOrderInfo}>
            <Text style={[styles.orderId, { color: theme.colors.primary }]}>
              Order #{item.order_id}
            </Text>
            <Text style={[styles.customerName, { color: theme.colors.onSurface }]}>
              {item.customer_name}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusBadgeText}>{item.delivery_status || 'Pending'}</Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="map-marker-outline" size={14} color={theme.colors.onSurfaceVariant} />
            <Text style={[styles.infoText, { color: theme.colors.onSurfaceVariant }]} numberOfLines={1}>
              {item.shipping_address || item.shipped_to || 'No address'}
            </Text>
          </View>
          {item.courier_name ? (
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="truck-outline" size={14} color={theme.colors.onSurfaceVariant} />
              <Text style={[styles.infoText, { color: theme.colors.onSurfaceVariant }]}>
                {item.courier_name}
                {item.tracking_number ? ` · ${item.tracking_number}` : ''}
              </Text>
            </View>
          ) : null}
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="calendar-outline" size={14} color={theme.colors.onSurfaceVariant} />
            <Text style={[styles.infoText, { color: theme.colors.onSurfaceVariant }]}>
              Expected: {formatDate(item.expected_delivery)}
            </Text>
          </View>
        </View>

        <View style={[styles.cardFooter, { borderTopColor: theme.colors.outline + '33' }]}>
          <Text style={[styles.totalCost, { color: theme.colors.onSurface }]}>
            {formatCurrency(item.total_cost)}
          </Text>
          <View style={styles.footerRight}>
            <Text style={[styles.delivery_method, { color: theme.colors.onSurfaceVariant }]}>
              {item.delivery_method || 'No mode set'}
            </Text>
            <MaterialCommunityIcons name="chevron-right" size={18} color={theme.colors.onSurfaceVariant} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.empty}>
      <MaterialCommunityIcons name="truck-off" size={64} color={theme.colors.outline} />
      <Text style={[styles.emptyTitle, { color: theme.colors.onSurface }]}>No Deliveries Found</Text>
      <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>
        {search || statusFilter !== 'all'
          ? 'Try adjusting your search or filter'
          : 'No deliveries are in the delivery stage yet'}
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
        <Text style={[styles.headerTitle, { color: theme.colors.onSurface }]}>
          Delivery Tracking
        </Text>
        <Text style={[styles.headerCount, { color: theme.colors.onSurfaceVariant }]}>
          {filtered.length} {filtered.length === 1 ? 'delivery' : 'deliveries'}
        </Text>
      </View>

      {/* Search */}
      <View style={[styles.searchContainer, { backgroundColor: theme.colors.surface }]}>
        <MaterialCommunityIcons name="magnify" size={20} color={theme.colors.onSurfaceVariant} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: theme.colors.onSurface }]}
          placeholder="Search order, customer, tracking..."
          placeholderTextColor={theme.colors.onSurfaceVariant}
          value={search}
          onChangeText={handleSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => handleSearch('')}>
            <MaterialCommunityIcons name="close-circle" size={18} color={theme.colors.onSurfaceVariant} />
          </TouchableOpacity>
        )}
      </View>

      {/* Status Filter */}
      <View style={styles.filterRow}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={STATUS_FILTERS}
          keyExtractor={(item) => item.key}
          contentContainerStyle={styles.filterList}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.filterChip,
                {
                  backgroundColor: statusFilter === item.key ? theme.colors.primary : theme.colors.surface,
                  borderColor: statusFilter === item.key ? theme.colors.primary : theme.colors.outline,
                },
              ]}
              onPress={() => handleStatusFilter(item.key)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  { color: statusFilter === item.key ? '#fff' : theme.colors.onSurface },
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* List */}
      {loading && filtered.length === 0 ? (
        <View style={styles.list}>
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} withImage={false} lines={3} style={{ marginBottom: 12 }} />
          ))}
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.order_id)}
          renderItem={renderDeliveryCard}
          ListEmptyComponent={renderEmpty}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={[styles.list, filtered.length === 0 && styles.listEmpty]}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  headerTitle: { fontSize: 22, fontWeight: 'bold' },
  headerCount: { fontSize: 13, marginTop: 2 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    elevation: 1,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, paddingVertical: 0 },
  filterRow: { paddingBottom: 8 },
  filterList: { paddingHorizontal: 12, gap: 8 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipText: { fontSize: 13, fontWeight: '600' },
  list: { padding: 12, paddingBottom: 24 },
  listEmpty: { flex: 1 },
  card: {
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 14,
    paddingBottom: 8,
  },
  cardOrderInfo: { flex: 1 },
  orderId: { fontSize: 15, fontWeight: 'bold', marginBottom: 2 },
  customerName: { fontSize: 14 },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    maxWidth: 140,
  },
  statusBadgeText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  cardBody: { paddingHorizontal: 14, paddingBottom: 10 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  infoText: { fontSize: 13, marginLeft: 6, flex: 1 },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  totalCost: { fontSize: 15, fontWeight: 'bold' },
  footerRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  delivery_method: { fontSize: 13 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', marginTop: 16, marginBottom: 8 },
  emptyText: { fontSize: 14, textAlign: 'center', paddingHorizontal: 32 },
});
