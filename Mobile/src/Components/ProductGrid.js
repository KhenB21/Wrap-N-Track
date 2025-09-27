import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import ProductCard from './ProductCard';

const { width } = Dimensions.get('window');

const ProductGrid = ({
  products = [],
  onProductSelect,
  selectedProducts = [],
  darkMode = false,
  showQuantity = false,
  quantities = {},
  onQuantityChange,
  loading = false,
  emptyMessage = 'No products available',
  title = 'Products',
  onRefresh,
  currentCategory = null,
}) => {
  const colors = {
    text: darkMode ? '#F5F5F7' : '#2c3e50',
    secondaryText: darkMode ? '#B0B0B0' : '#666',
    background: darkMode ? '#18191A' : '#F8F9FA',
  };

  const renderProduct = ({ item, index }) => {
    const isSelected = selectedProducts.some(p => p.sku === item.sku);
    const quantity = quantities[item.sku] || 1;

    return (
      <View style={styles.productWrapper}>
        <ProductCard
          product={item}
          onSelect={onProductSelect}
          isSelected={isSelected}
          darkMode={darkMode}
          showQuantity={showQuantity}
          quantity={quantity}
          onQuantityChange={(newQuantity) => 
            onQuantityChange && onQuantityChange(item.sku, newQuantity)
          }
          selectedProducts={selectedProducts}
          currentCategory={currentCategory}
        />
      </View>
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={[styles.title, { color: colors.text }]}>
        {title}
      </Text>
      <Text style={[styles.subtitle, { color: colors.secondaryText }]}>
        {products.length} {products.length === 1 ? 'item' : 'items'} available
      </Text>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={[styles.emptyText, { color: colors.secondaryText }]}>
        {loading ? 'Loading products...' : emptyMessage}
      </Text>
      {loading && <ActivityIndicator size="large" color={colors.text} />}
    </View>
  );

  if (loading && products.length === 0) {
    return (
      <View style={styles.container}>
        {renderHeader()}
        {renderEmpty()}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderHeader()}
      <FlatList
        data={products}
        renderItem={renderProduct}
        keyExtractor={(item) => item.sku}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={renderEmpty}
        refreshing={loading}
        onRefresh={onRefresh}
        style={styles.flatList}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
  },
  listContent: {
    padding: 16,
  },
  row: {
    justifyContent: 'space-between',
  },
  productWrapper: {
    flex: 1,
    maxWidth: '48%',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  flatList: {
    flex: 1,
  },
});

export default ProductGrid;
