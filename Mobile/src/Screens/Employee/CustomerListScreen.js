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
  TextInput,
  ActivityIndicator
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Button, Avatar } from 'react-native-paper';
import { useTheme } from '../../Context/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { customerAPI } from '../../services/api';

const { width } = Dimensions.get('window');

// Custom Chip component
const CustomChip = ({ icon, children, style, iconColor = '#fff', mode = 'filled' }) => (
  <View style={[
    styles.customChip, 
    mode === 'outlined' ? styles.customChipOutlined : styles.customChipFilled,
    style
  ]}>
    {icon && <MaterialCommunityIcons name={icon} size={16} color={iconColor} style={styles.chipIcon} />}
    <Text style={[styles.chipText, { color: iconColor }]}>{children}</Text>
  </View>
);

export default function CustomerListScreen() {
  const theme = useTheme();
  const navigation = useNavigation();

  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [selectedCustomers, setSelectedCustomers] = useState(new Set());
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const response = await customerAPI.getCustomers();
      
      // Handle different response structures
      let customersData = [];
      if (response && Array.isArray(response)) {
        customersData = response;
      } else if (response && response.data && Array.isArray(response.data)) {
        customersData = response.data;
      } else if (response && response.customers && Array.isArray(response.customers)) {
        customersData = response.customers;
      } else if (response && response.success && response.customers) {
        customersData = response.customers;
      }
      
      // Transform data to ensure proper structure
      const transformedCustomers = customersData.map(customer => ({
        customer_id: customer.customer_id || customer.id || '',
        name: customer.name || 'Unknown',
        email_address: customer.email_address || customer.email || '',
        phone_number: customer.phone_number || customer.phone || '',
        account_status: customer.account_status || customer.status || 'active',
        status: (customer.account_status || customer.status || 'active').toLowerCase(),
        created_at: customer.created_at || customer.createdAt || new Date().toISOString(),
        profile_picture_data: customer.profile_picture_data || null,
        total_orders: customer.total_orders || 0,
        total_spent: customer.total_spent || 0,
        address: customer.address || ''
      }));
      
      setCustomers(transformedCustomers);
      setFilteredCustomers(transformedCustomers);
    } catch (error) {
      console.error('Error fetching customers:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to fetch customers. Please try again.');
      // Set empty array on error so UI doesn't break
      setCustomers([]);
      setFilteredCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchCustomers();
    setRefreshing(false);
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
    filterCustomers(query, filter, sortBy, sortOrder);
  };

  const handleFilter = (filterType) => {
    setFilter(filterType);
    filterCustomers(searchQuery, filterType, sortBy, sortOrder);
    setShowFilters(false);
  };

  const handleSort = (field) => {
    const newSortOrder = sortBy === field && sortOrder === 'asc' ? 'desc' : 'asc';
    setSortBy(field);
    setSortOrder(newSortOrder);
    filterCustomers(searchQuery, filter, field, newSortOrder);
  };

  const filterCustomers = (query, filterType, sortField, sortDirection) => {
    let filtered = [...customers];

    // Search filter
    if (query) {
      filtered = filtered.filter(customer =>
        customer.name.toLowerCase().includes(query.toLowerCase()) ||
        customer.email_address.toLowerCase().includes(query.toLowerCase()) ||
        (customer.phone_number && customer.phone_number.includes(query))
      );
    }

    // Status filter
    if (filterType !== 'all') {
      filtered = filtered.filter(customer => customer.status === filterType);
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

    setFilteredCustomers(filtered);
  };

  const handleCustomerPress = (customer) => {
    navigation.navigate('CustomerDetail', { customer });
  };

  const handleEditCustomer = (customer) => {
    navigation.navigate('AddEditCustomer', { 
      customer, 
      mode: 'edit' 
    });
  };

  const handleDeleteCustomer = (customer) => {
    Alert.alert(
      'Delete Customer',
      `Are you sure you want to delete ${customer.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => {
            // Implement delete functionality
            Alert.alert('Success', 'Customer deleted successfully');
          }
        }
      ]
    );
  };

  const handleBulkAction = (action) => {
    if (selectedCustomers.size === 0) {
      Alert.alert('No Selection', 'Please select customers first');
      return;
    }

    Alert.alert(
      'Bulk Action',
      `Are you sure you want to ${action} ${selectedCustomers.size} customers?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Confirm', 
          onPress: () => {
            // Implement bulk action
            Alert.alert('Success', `Bulk ${action} completed`);
            setSelectedCustomers(new Set());
          }
        }
      ]
    );
  };

  const toggleCustomerSelection = (customerId) => {
    const newSelected = new Set(selectedCustomers);
    if (newSelected.has(customerId)) {
      newSelected.delete(customerId);
    } else {
      newSelected.add(customerId);
    }
    setSelectedCustomers(newSelected);
  };

  const selectAll = () => {
    if (selectedCustomers.size === filteredCustomers.length) {
      setSelectedCustomers(new Set());
    } else {
      setSelectedCustomers(new Set(filteredCustomers.map(c => c.customer_id)));
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
      month: 'short',
      day: 'numeric'
    });
  };

  const renderCustomerCard = ({ item }) => {
    const isSelected = selectedCustomers.has(item.customer_id);

    return (
      <TouchableOpacity
        style={[
          styles.customerCard,
          { 
            backgroundColor: theme.colors.surface,
            borderColor: isSelected ? theme.colors.primary : theme.colors.outline,
            borderWidth: isSelected ? 2 : 1
          }
        ]}
        onPress={() => handleCustomerPress(item)}
        onLongPress={() => toggleCustomerSelection(item.customer_id)}
      >
        <View style={styles.cardHeader}>
          <Avatar.Text
            size={48}
            label={item.name.charAt(0).toUpperCase()}
            style={{ backgroundColor: theme.colors.primary }}
          />
          <View style={styles.customerInfo}>
            <Text style={[styles.customerName, { color: theme.colors.onSurface }]}>
              {item.name}
            </Text>
            <Text style={[styles.customerEmail, { color: theme.colors.onSurfaceVariant }]}>
              {item.email_address}
            </Text>
            <Text style={[styles.customerPhone, { color: theme.colors.onSurfaceVariant }]}>
              {item.phone_number || 'No phone'}
            </Text>
          </View>
          <View style={styles.customerStatus}>
            <CustomChip
              mode="outlined"
              style={[
                styles.statusChip,
                { 
                  backgroundColor: item.status === 'active' ? '#E8F5E8' : '#FFEBEE',
                  borderColor: item.status === 'active' ? '#4CAF50' : '#F44336'
                }
              ]}
              iconColor={item.status === 'active' ? '#4CAF50' : '#F44336'}
            >
              {item.status}
            </CustomChip>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.customerStats}>
            <Text style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>
              Orders: {item.total_orders}
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>
              Spent: {formatCurrency(item.total_spent)}
            </Text>
          </View>
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#2196F3' }]}
              onPress={() => handleEditCustomer(item)}
            >
              <MaterialCommunityIcons name="pencil" size={16} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#F44336' }]}
              onPress={() => handleDeleteCustomer(item)}
            >
              <MaterialCommunityIcons name="delete" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderCustomerListItem = ({ item }) => {
    const isSelected = selectedCustomers.has(item.customer_id);

    return (
      <TouchableOpacity
        style={[
          styles.customerListItem,
          { 
            backgroundColor: theme.colors.surface,
            borderColor: isSelected ? theme.colors.primary : theme.colors.outline,
            borderWidth: isSelected ? 2 : 1
          }
        ]}
        onPress={() => handleCustomerPress(item)}
        onLongPress={() => toggleCustomerSelection(item.customer_id)}
      >
        <Avatar.Text
          size={40}
          label={item.name.charAt(0).toUpperCase()}
          style={{ backgroundColor: theme.colors.primary }}
        />
        <View style={styles.listItemInfo}>
          <Text style={[styles.customerName, { color: theme.colors.onSurface }]}>
            {item.name}
          </Text>
          <Text style={[styles.customerEmail, { color: theme.colors.onSurfaceVariant }]}>
            {item.email_address}
          </Text>
        </View>
        <View style={styles.listItemStats}>
          <Text style={[styles.statText, { color: theme.colors.onSurfaceVariant }]}>
            {item.total_orders} orders
          </Text>
          <Text style={[styles.statText, { color: theme.colors.onSurfaceVariant }]}>
            {formatCurrency(item.total_spent)}
          </Text>
        </View>
        <CustomChip
          mode="outlined"
          style={[
            styles.statusChip,
            { 
              backgroundColor: item.status === 'active' ? '#E8F5E8' : '#FFEBEE',
              borderColor: item.status === 'active' ? '#4CAF50' : '#F44336'
            }
          ]}
          iconColor={item.status === 'active' ? '#4CAF50' : '#F44336'}
        >
          {item.status}
        </CustomChip>
      </TouchableOpacity>
    );
  };

  const renderFilterModal = () => (
    <Modal
      visible={showFilters}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowFilters(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.colors.onSurface }]}>
              Filter & Sort
            </Text>
            <TouchableOpacity onPress={() => setShowFilters(false)}>
              <MaterialCommunityIcons name="close" size={24} color={theme.colors.onSurface} />
            </TouchableOpacity>
          </View>

          <View style={styles.filterSection}>
            <Text style={[styles.filterSectionTitle, { color: theme.colors.onSurface }]}>
              Status
            </Text>
            <View style={styles.chipContainer}>
              {['All', 'Active', 'Inactive'].map((status) => (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.filterChip,
                    { 
                      backgroundColor: filter === status.toLowerCase() 
                        ? theme.colors.primary 
                        : theme.colors.surface,
                      borderColor: theme.colors.outline,
                      borderWidth: 1
                    }
                  ]}
                  onPress={() => handleFilter(status.toLowerCase())}
                >
                  <Text style={[
                    styles.filterChipText,
                    { 
                      color: filter === status.toLowerCase() 
                        ? '#fff' 
                        : theme.colors.onSurface 
                    }
                  ]}>
                    {status}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.filterSection}>
            <Text style={[styles.filterSectionTitle, { color: theme.colors.onSurface }]}>
              Sort By
            </Text>
            <View style={styles.sortContainer}>
              {[
                { key: 'name', label: 'Name' },
                { key: 'email_address', label: 'Email' },
                { key: 'created_at', label: 'Date Created' },
                { key: 'total_orders', label: 'Orders' },
                { key: 'total_spent', label: 'Total Spent' }
              ].map((option) => (
                <TouchableOpacity
                  key={option.key}
                  style={[
                    styles.sortOption,
                    { 
                      backgroundColor: sortBy === option.key ? theme.colors.primary : 'transparent',
                      borderColor: theme.colors.outline
                    }
                  ]}
                  onPress={() => handleSort(option.key)}
                >
                  <Text style={[
                    styles.sortOptionText,
                    { 
                      color: sortBy === option.key ? theme.colors.onPrimary : theme.colors.onSurface 
                    }
                  ]}>
                    {option.label}
                  </Text>
                  {sortBy === option.key && (
                    <MaterialCommunityIcons 
                      name={sortOrder === 'asc' ? 'arrow-up' : 'arrow-down'} 
                      size={16} 
                      color={theme.colors.onPrimary} 
                    />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.modalActions}>
            <Button
              mode="outlined"
              onPress={() => {
                setFilter('all');
                setSortBy('name');
                setSortOrder('asc');
                filterCustomers(searchQuery, 'all', 'name', 'asc');
                setShowFilters(false);
              }}
              style={styles.clearButton}
            >
              Clear All
            </Button>
            <Button
              mode="contained"
              onPress={() => setShowFilters(false)}
              style={styles.applyButton}
            >
              Apply
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialCommunityIcons name="account-group" size={64} color={theme.colors.outline} />
      <Text style={[styles.emptyTitle, { color: theme.colors.onSurface }]}>
        No Customers Found
      </Text>
      <Text style={[styles.emptySubtitle, { color: theme.colors.onSurfaceVariant }]}>
        {searchQuery || filter !== 'all' 
          ? 'Try adjusting your search or filters'
          : 'Get started by adding your first customer'
        }
      </Text>
    </View>
  );

  const renderStats = () => {
    const stats = {
      total: customers.length,
      active: customers.filter(c => c.status === 'active').length,
      inactive: customers.filter(c => c.status === 'inactive').length,
      selected: selectedCustomers.size
    };

    return (
      <View style={styles.statsContainer}>
        <CustomChip icon="account-group" style={styles.statChip}>
          Total: {stats.total}
        </CustomChip>
        <CustomChip icon="check-circle" style={[styles.statChip, { backgroundColor: '#4CAF50' }]}>
          Active: {stats.active}
        </CustomChip>
        <CustomChip icon="pause-circle" style={[styles.statChip, { backgroundColor: '#F57C00' }]}>
          Inactive: {stats.inactive}
        </CustomChip>
        {stats.selected > 0 && (
          <CustomChip icon="check" style={[styles.statChip, { backgroundColor: '#2196F3' }]}>
            Selected: {stats.selected}
          </CustomChip>
        )}
      </View>
    );
  };

  if (loading && customers.length === 0) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.colors.background }]}>        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.onBackground }]}>
          Loading customers...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
        <TextInput
          placeholder="Search customers..."
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

      {/* View Mode Toggle */}
      <View style={styles.viewModeContainer}>
        <View style={styles.viewModeToggle}>
          <TouchableOpacity
            style={[
              styles.viewModeButton,
              { backgroundColor: viewMode === 'grid' ? theme.colors.primary : 'transparent' }
            ]}
            onPress={() => setViewMode('grid')}
          >
            <MaterialCommunityIcons 
              name="view-grid" 
              size={20} 
              color={viewMode === 'grid' ? '#fff' : theme.colors.onSurface} 
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.viewModeButton,
              { backgroundColor: viewMode === 'list' ? theme.colors.primary : 'transparent' }
            ]}
            onPress={() => setViewMode('list')}
          >
            <MaterialCommunityIcons 
              name="view-list" 
              size={20} 
              color={viewMode === 'list' ? '#fff' : theme.colors.onSurface} 
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Selection Bar */}
      {selectedCustomers.size > 0 && (
        <View style={[styles.selectionBar, { backgroundColor: theme.colors.primaryContainer }]}>
          <Text style={[styles.selectionText, { color: theme.colors.onPrimaryContainer }]}>
            {selectedCustomers.size} selected
          </Text>
          <View style={styles.selectionActions}>
            <TouchableOpacity
              style={styles.selectionAction}
              onPress={() => handleBulkAction('export')}
            >
              <MaterialCommunityIcons name="export" size={20} color={theme.colors.onPrimaryContainer} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.selectionAction}
              onPress={() => handleBulkAction('delete')}
            >
              <MaterialCommunityIcons name="delete" size={20} color={theme.colors.onPrimaryContainer} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.selectionAction}
              onPress={() => setSelectedCustomers(new Set())}
            >
              <MaterialCommunityIcons name="close" size={20} color={theme.colors.onPrimaryContainer} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Stats */}
      {renderStats()}

      {/* Customer List */}
      <FlatList
        data={filteredCustomers}
        renderItem={viewMode === 'grid' ? renderCustomerCard : renderCustomerListItem}
        keyExtractor={(item) => item.customer_id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
        numColumns={viewMode === 'grid' ? 2 : 1}
        key={viewMode} // Force re-render when view mode changes
      />

      {/* Floating Action Button */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={() => navigation.navigate('AddEditCustomer', { mode: 'add' })}
      >
        <MaterialCommunityIcons name="plus" size={24} color="#fff" />
      </TouchableOpacity>

      {/* Filter Modal */}
      {renderFilterModal()}
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
  loadingText: {
    fontSize: 16,
    marginTop: 16,
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
  viewModeContainer: {
    padding: 16,
    alignItems: 'flex-end',
  },
  viewModeToggle: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 2,
  },
  viewModeButton: {
    padding: 8,
    borderRadius: 6,
  },
  selectionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  selectionText: {
    fontSize: 16,
    fontWeight: '500',
  },
  selectionActions: {
    flexDirection: 'row',
  },
  selectionAction: {
    padding: 8,
    marginLeft: 8,
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
  customChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  customChipFilled: {
    backgroundColor: '#696a8f',
  },
  customChipOutlined: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  chipIcon: {
    marginRight: 4,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 80,
  },
  customerCard: {
    flex: 1,
    margin: 8,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  customerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  customerEmail: {
    fontSize: 12,
    marginBottom: 2,
  },
  customerPhone: {
    fontSize: 12,
  },
  customerStatus: {
    alignItems: 'flex-end',
  },
  statusChip: {
    marginBottom: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  customerStats: {
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
  customerListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 8,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  listItemInfo: {
    flex: 1,
    marginLeft: 12,
  },
  listItemStats: {
    alignItems: 'flex-end',
    marginRight: 12,
  },
  statText: {
    fontSize: 12,
    marginBottom: 2,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  filterSection: {
    marginBottom: 20,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    marginRight: 8,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  sortContainer: {
    gap: 8,
  },
  sortOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  sortOptionText: {
    fontSize: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  clearButton: {
    flex: 1,
    marginRight: 8,
  },
  applyButton: {
    flex: 1,
    marginLeft: 8,
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
