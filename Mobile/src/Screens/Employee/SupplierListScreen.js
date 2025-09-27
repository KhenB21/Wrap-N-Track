import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
  Modal,
  Dimensions,
  TextInput
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Button } from 'react-native-paper';
import { useTheme } from '../../Context/ThemeContext';
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');

export default function SupplierListScreen() {
  const theme = useTheme();
  const navigation = useNavigation();

  const [suppliers, setSuppliers] = useState([]);
  const [filteredSuppliers, setFilteredSuppliers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [viewMode, setViewMode] = useState('grid');
  const [selectedSuppliers, setSelectedSuppliers] = useState(new Set());
  const [showFilters, setShowFilters] = useState(false);

  // Mock data - replace with actual API call
  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      // Mock data - replace with actual API call
      const mockSuppliers = [
        {
          supplier_id: '1',
          name: 'ABC Packaging Supplies',
          contact_person: 'John Smith',
          cellphone: '+63 912 345 6789',
          telephone: '+63 2 123 4567',
          email_address: 'john@abcpkg.com',
          street_address: '123 Main Street',
          barangay: 'Barangay 1',
          city_municipality: 'Quezon City',
          province: 'Metro Manila',
          type_of_supplies: 'Packaging Materials',
          description: 'Leading supplier of packaging materials',
          reliability_score: 4.5,
          total_products: 25,
          last_order_date: '2024-01-15T10:30:00Z'
        },
        {
          supplier_id: '2',
          name: 'XYZ Gift Wrapping Co.',
          contact_person: 'Jane Doe',
          cellphone: '+63 917 654 3210',
          telephone: '+63 2 234 5678',
          email_address: 'jane@xyzgifts.com',
          street_address: '456 Business Ave',
          barangay: 'Barangay 2',
          city_municipality: 'Makati City',
          province: 'Metro Manila',
          type_of_supplies: 'Gift Wrapping',
          description: 'Specialized in gift wrapping materials',
          reliability_score: 4.2,
          total_products: 18,
          last_order_date: '2024-01-20T14:45:00Z'
        }
      ];
      setSuppliers(mockSuppliers);
      setFilteredSuppliers(mockSuppliers);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      Alert.alert('Error', 'Failed to fetch suppliers');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchSuppliers();
    setRefreshing(false);
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
    filterSuppliers(query, filter, sortBy, sortOrder);
  };

  const handleFilter = (filterType) => {
    setFilter(filterType);
    filterSuppliers(searchQuery, filterType, sortBy, sortOrder);
    setShowFilters(false);
  };

  const handleSort = (field) => {
    const newSortOrder = sortBy === field && sortOrder === 'asc' ? 'desc' : 'asc';
    setSortBy(field);
    setSortOrder(newSortOrder);
    filterSuppliers(searchQuery, filter, field, newSortOrder);
  };

  const filterSuppliers = (query, filterType, sortField, sortDirection) => {
    let filtered = [...suppliers];

    // Search filter
    if (query) {
      filtered = filtered.filter(supplier =>
        supplier.name.toLowerCase().includes(query.toLowerCase()) ||
        supplier.contact_person.toLowerCase().includes(query.toLowerCase()) ||
        supplier.email_address.toLowerCase().includes(query.toLowerCase()) ||
        supplier.type_of_supplies.toLowerCase().includes(query.toLowerCase())
      );
    }

    // Type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(supplier => supplier.type_of_supplies === filterType);
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue = a[sortField] || '';
      let bValue = b[sortField] || '';
      
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredSuppliers(filtered);
  };

  const handleSupplierPress = (supplier) => {
    navigation.navigate('SupplierDetail', { supplier });
  };

  const handleEditSupplier = (supplier) => {
    navigation.navigate('AddEditSupplier', { 
      supplier, 
      mode: 'edit' 
    });
  };

  const handleDeleteSupplier = (supplier) => {
    Alert.alert(
      'Delete Supplier',
      `Are you sure you want to delete ${supplier.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => {
            Alert.alert('Success', 'Supplier deleted successfully');
          }
        }
      ]
    );
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

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const renderSupplierCard = ({ item }) => {
    const reliabilityColor = getReliabilityColor(item.reliability_score);
    const reliabilityText = getReliabilityText(item.reliability_score);
    const isSelected = selectedSuppliers.has(item.supplier_id);

    return (
      <TouchableOpacity
        style={[
          styles.supplierCard,
          { 
            backgroundColor: theme.colors.surface,
            borderColor: isSelected ? theme.colors.primary : theme.colors.outline,
            borderWidth: isSelected ? 2 : 1
          }
        ]}
        onPress={() => handleSupplierPress(item)}
        onLongPress={() => toggleSupplierSelection(item.supplier_id)}
      >
        <View style={styles.cardHeader}>
          <View style={styles.supplierInfo}>
            <Text style={[styles.supplierName, { color: theme.colors.onSurface }]}>
              {item.name}
            </Text>
            <Text style={[styles.contactPerson, { color: theme.colors.onSurfaceVariant }]}>
              {item.contact_person}
            </Text>
            <Text style={[styles.supplierType, { color: theme.colors.onSurfaceVariant }]}>
              {item.type_of_supplies}
            </Text>
          </View>
          <View style={styles.reliabilityContainer}>
            <View style={[styles.reliabilityBadge, { backgroundColor: reliabilityColor }]}>
              <Text style={styles.reliabilityScore}>{item.reliability_score}</Text>
            </View>
            <Text style={[styles.reliabilityText, { color: reliabilityColor }]}>
              {reliabilityText}
            </Text>
          </View>
        </View>

        <View style={styles.cardContent}>
          <View style={styles.contactInfo}>
            <MaterialCommunityIcons name="email" size={16} color={theme.colors.onSurfaceVariant} />
            <Text style={[styles.contactText, { color: theme.colors.onSurfaceVariant }]}>
              {item.email_address}
            </Text>
          </View>
          <View style={styles.contactInfo}>
            <MaterialCommunityIcons name="phone" size={16} color={theme.colors.onSurfaceVariant} />
            <Text style={[styles.contactText, { color: theme.colors.onSurfaceVariant }]}>
              {item.cellphone}
            </Text>
          </View>
          <View style={styles.contactInfo}>
            <MaterialCommunityIcons name="map-marker" size={16} color={theme.colors.onSurfaceVariant} />
            <Text style={[styles.contactText, { color: theme.colors.onSurfaceVariant }]}>
              {item.city_municipality}, {item.province}
            </Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.supplierStats}>
            <Text style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>
              Products: {item.total_products}
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>
              Last Order: {formatDate(item.last_order_date)}
            </Text>
          </View>
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#2196F3' }]}
              onPress={() => handleEditSupplier(item)}
            >
              <MaterialCommunityIcons name="pencil" size={16} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#F44336' }]}
              onPress={() => handleDeleteSupplier(item)}
            >
              <MaterialCommunityIcons name="delete" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const toggleSupplierSelection = (supplierId) => {
    const newSelected = new Set(selectedSuppliers);
    if (newSelected.has(supplierId)) {
      newSelected.delete(supplierId);
    } else {
      newSelected.add(supplierId);
    }
    setSelectedSuppliers(newSelected);
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialCommunityIcons name="truck-delivery" size={64} color={theme.colors.outline} />
      <Text style={[styles.emptyTitle, { color: theme.colors.onSurface }]}>
        No Suppliers Found
      </Text>
      <Text style={[styles.emptySubtitle, { color: theme.colors.onSurfaceVariant }]}>
        {searchQuery || filter !== 'all' 
          ? 'Try adjusting your search or filters'
          : 'Get started by adding your first supplier'
        }
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
        <TextInput
          placeholder="Search suppliers..."
          onChangeText={handleSearch}
          value={searchQuery}
          style={[styles.searchBar, { backgroundColor: theme.colors.surface, color: theme.colors.onSurface }]}
          placeholderTextColor={theme.colors.placeholder}
        />
        <TouchableOpacity
          style={[styles.filterButton, { backgroundColor: theme.colors.primary }]}
          onPress={() => setShowFilters(true)}
        >
          <MaterialCommunityIcons name="filter" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <Chip icon="truck-delivery" style={styles.statChip}>
          Total: {suppliers.length}
        </Chip>
        <Chip icon="star" style={[styles.statChip, { backgroundColor: '#4CAF50' }]}>
          Excellent: {suppliers.filter(s => s.reliability_score >= 4.5).length}
        </Chip>
        <Chip icon="alert-circle" style={[styles.statChip, { backgroundColor: '#F57C00' }]}>
          Fair: {suppliers.filter(s => s.reliability_score < 3.5).length}
        </Chip>
      </View>

      {/* Supplier List */}
      <FlatList
        data={filteredSuppliers}
        renderItem={renderSupplierCard}
        keyExtractor={(item) => item.supplier_id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
        numColumns={1}
      />

      {/* Floating Action Button */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={() => navigation.navigate('AddEditSupplier', { mode: 'add' })}
      >
        <MaterialCommunityIcons name="plus" size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  searchBar: {
    flex: 1,
    marginRight: 12,
  },
  filterButton: {
    padding: 12,
    borderRadius: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 8,
  },
  statChip: {
    marginRight: 8,
    marginBottom: 8,
  },
  listContainer: {
    padding: 16,
    paddingBottom: 80,
  },
  supplierCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  supplierInfo: {
    flex: 1,
  },
  supplierName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  contactPerson: {
    fontSize: 14,
    marginBottom: 2,
  },
  supplierType: {
    fontSize: 12,
  },
  reliabilityContainer: {
    alignItems: 'flex-end',
  },
  reliabilityBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  reliabilityScore: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  reliabilityText: {
    fontSize: 10,
    fontWeight: '500',
  },
  cardContent: {
    marginBottom: 12,
  },
  contactInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  contactText: {
    fontSize: 12,
    marginLeft: 8,
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  supplierStats: {
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
});
