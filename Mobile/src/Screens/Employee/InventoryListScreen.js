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
  TextInput,
  Dimensions
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
// Removed Chip import - using custom implementation
import { useTheme } from '../../Context/ThemeContext';
import { useInventory } from '../../Context/InventoryContext';
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');

// Custom Chip component
const CustomChip = ({ icon, children, style, iconColor = '#fff' }) => (
  <View style={[styles.customChip, style]}>
    {icon && <MaterialCommunityIcons name={icon} size={16} color={iconColor} style={styles.chipIcon} />}
    <Text style={[styles.chipText, { color: iconColor }]}>{children}</Text>
  </View>
);

export default function InventoryListScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const {
    inventory,
    filteredInventory,
    loading,
    error,
    searchQuery,
    filter,
    fetchInventory,
    searchProducts,
    filterProducts,
    clearError
  } = useInventory();

  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedItems, setSelectedItems] = useState(new Set());

  useEffect(() => {
    fetchInventory();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchInventory();
    setRefreshing(false);
  };

  const handleSearch = (query) => {
    searchProducts(query);
  };

  const handleFilter = (filterType) => {
    filterProducts(filterType);
    setShowFilters(false);
  };

  const getStockLevel = (quantity) => {
    if (quantity <= 0) return { level: 'out', color: '#D32F2F', text: 'Out of Stock' };
    if (quantity <= 300) return { level: 'low', color: '#F57C00', text: 'Low Stock' };
    if (quantity <= 800) return { level: 'medium', color: '#FFC107', text: 'Medium Stock' };
    return { level: 'high', color: '#4CAF50', text: 'High Stock' };
  };

  const handleItemPress = (item) => {
    navigation.navigate('InventoryDetail', { product: item });
  };

  const handleAddStock = (item) => {
    navigation.navigate('EditProduct', { 
      product: item, 
      mode: 'addStock' 
    });
  };

  const handleEdit = (item) => {
    navigation.navigate('EditProduct', { 
      product: item, 
      mode: 'edit' 
    });
  };

  const handleArchive = (item) => {
    Alert.alert(
      'Archive Product',
      `Are you sure you want to archive "${item.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Archive', 
          style: 'destructive',
          onPress: () => {
            // Implement archive functionality
            Alert.alert('Success', 'Product archived successfully');
          }
        }
      ]
    );
  };

  const handleBulkAction = (action) => {
    if (selectedItems.size === 0) {
      Alert.alert('No Selection', 'Please select items first');
      return;
    }

    Alert.alert(
      'Bulk Action',
      `Are you sure you want to ${action} ${selectedItems.size} items?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Confirm', 
          onPress: () => {
            // Implement bulk action
            Alert.alert('Success', `Bulk ${action} completed`);
            setSelectedItems(new Set());
          }
        }
      ]
    );
  };

  const toggleItemSelection = (sku) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(sku)) {
      newSelected.delete(sku);
    } else {
      newSelected.add(sku);
    }
    setSelectedItems(newSelected);
  };

  const selectAll = () => {
    if (selectedItems.size === filteredInventory.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredInventory.map(item => item.sku)));
    }
  };

  const renderProductItem = ({ item }) => {
    const stockLevel = getStockLevel(item.quantity);
    const isSelected = selectedItems.has(item.sku);

    return (
      <TouchableOpacity
        style={[
          styles.productCard,
          { 
            backgroundColor: theme.colors.surface,
            borderColor: isSelected ? theme.colors.primary : theme.colors.outline,
            borderWidth: isSelected ? 2 : 1
          }
        ]}
        onPress={() => handleItemPress(item)}
        onLongPress={() => toggleItemSelection(item.sku)}
      >
        <View style={styles.cardHeader}>
          <View style={styles.productImageContainer}>
            {item.image_data ? (
              <MaterialCommunityIcons name="image" size={40} color={theme.colors.primary} />
            ) : (
              <MaterialCommunityIcons name="image-outline" size={40} color={theme.colors.outline} />
            )}
          </View>
          <View style={styles.productInfo}>
            <Text style={[styles.productName, { color: theme.colors.onSurface }]} numberOfLines={2}>
              {item.name}
            </Text>
            <Text style={[styles.productSku, { color: theme.colors.onSurfaceVariant }]}>
              SKU: {item.sku}
            </Text>
            <Text style={[styles.productCategory, { color: theme.colors.onSurfaceVariant }]}>
              {item.category}
            </Text>
          </View>
          <View style={styles.stockInfo}>
            <View style={[styles.stockBadge, { backgroundColor: stockLevel.color }]}>
              <Text style={styles.stockText}>{stockLevel.text}</Text>
            </View>
            <Text style={[styles.stockQuantity, { color: theme.colors.onSurface }]}>
              {item.quantity.toLocaleString()}
            </Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <Text style={[styles.productPrice, { color: theme.colors.onSurface }]}>
            ₱{parseFloat(item.unit_price).toFixed(2)}
          </Text>
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#4CAF50' }]}
              onPress={() => handleAddStock(item)}
            >
              <MaterialCommunityIcons name="plus" size={16} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#2196F3' }]}
              onPress={() => handleEdit(item)}
            >
              <MaterialCommunityIcons name="pencil" size={16} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#F44336' }]}
              onPress={() => handleArchive(item)}
            >
              <MaterialCommunityIcons name="archive" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
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
              Filter Products
            </Text>
            <TouchableOpacity onPress={() => setShowFilters(false)}>
              <MaterialCommunityIcons name="close" size={24} color={theme.colors.onSurface} />
            </TouchableOpacity>
          </View>

          <View style={styles.filterOptions}>
            {[
              { key: 'all', label: 'All Products', icon: 'package-variant' },
              { key: 'low-stock', label: 'Low Stock (≤300)', icon: 'alert-circle' },
              { key: 'medium-stock', label: 'Medium Stock (301-800)', icon: 'package-variant-closed' },
              { key: 'high-stock', label: 'High Stock (>800)', icon: 'package-variant' },
              { key: 'replenishment', label: 'Need Replenishment (0)', icon: 'alert' }
            ].map((option) => (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.filterOption,
                  { 
                    backgroundColor: filter === option.key ? theme.colors.primary : 'transparent',
                    borderColor: theme.colors.outline
                  }
                ]}
                onPress={() => handleFilter(option.key)}
              >
                <MaterialCommunityIcons 
                  name={option.icon} 
                  size={20} 
                  color={filter === option.key ? theme.colors.onPrimary : theme.colors.onSurface} 
                />
                <Text style={[
                  styles.filterOptionText,
                  { 
                    color: filter === option.key ? theme.colors.onPrimary : theme.colors.onSurface 
                  }
                ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialCommunityIcons name="package-variant" size={64} color={theme.colors.outline} />
      <Text style={[styles.emptyTitle, { color: theme.colors.onSurface }]}>
        No Products Found
      </Text>
      <Text style={[styles.emptySubtitle, { color: theme.colors.onSurfaceVariant }]}>
        {searchQuery || filter !== 'all' 
          ? 'Try adjusting your search or filters'
          : 'Get started by adding your first product'
        }
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
        <TextInput
          placeholder="Search products..."
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

      {/* Selection Bar */}
      {selectedItems.size > 0 && (
        <View style={[styles.selectionBar, { backgroundColor: theme.colors.primaryContainer }]}>
          <Text style={[styles.selectionText, { color: theme.colors.onPrimaryContainer }]}>
            {selectedItems.size} selected
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
              onPress={() => handleBulkAction('archive')}
            >
              <MaterialCommunityIcons name="archive" size={20} color={theme.colors.onPrimaryContainer} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.selectionAction}
              onPress={() => setSelectedItems(new Set())}
            >
              <MaterialCommunityIcons name="close" size={20} color={theme.colors.onPrimaryContainer} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Stats */}
      <View style={styles.statsContainer}>
        <CustomChip icon="package-variant" style={styles.statChip}>
          Total: {inventory.length}
        </CustomChip>
        <CustomChip icon="alert-circle" style={[styles.statChip, { backgroundColor: '#F57C00' }]}>
          Low Stock: {inventory.filter(item => item.quantity <= 300).length}
        </CustomChip>
        <CustomChip icon="alert" style={[styles.statChip, { backgroundColor: '#D32F2F' }]}>
          Out: {inventory.filter(item => item.quantity <= 0).length}
        </CustomChip>
      </View>

      {/* Product List */}
      <FlatList
        data={filteredInventory}
        renderItem={renderProductItem}
        keyExtractor={(item) => item.sku}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />

      {/* Floating Action Button */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={() => navigation.navigate('AddProduct')}
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
    padding: 16,
    gap: 8,
  },
  statChip: {
    marginRight: 8,
  },
  customChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#696a8f',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
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
  productCard: {
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
    marginBottom: 12,
  },
  productImageContainer: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  productSku: {
    fontSize: 12,
    marginBottom: 2,
  },
  productCategory: {
    fontSize: 12,
  },
  stockInfo: {
    alignItems: 'flex-end',
  },
  stockBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 4,
  },
  stockText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  stockQuantity: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productPrice: {
    fontSize: 18,
    fontWeight: 'bold',
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
  filterOptions: {
    gap: 12,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  filterOptionText: {
    fontSize: 16,
    marginLeft: 12,
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
