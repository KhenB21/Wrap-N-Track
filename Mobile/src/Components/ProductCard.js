import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';

const { width } = Dimensions.get('window');

const ProductCard = ({ 
  product, 
  onSelect, 
  isSelected, 
  darkMode = false,
  showQuantity = false,
  quantity = 1,
  onQuantityChange,
  selectedProducts = [],
  currentCategory = null
}) => {
  const colors = {
    card: darkMode ? '#232323' : '#fff',
    text: darkMode ? '#F5F5F7' : '#2c3e50',
    secondaryText: darkMode ? '#B0B0B0' : '#666',
    price: darkMode ? '#4CAF50' : '#27ae60',
    border: darkMode ? '#393A3B' : '#E0E0E0',
    selected: darkMode ? '#333' : '#B6B3C6',
  };

  const cardWidth = (width - 48) / 2; // 2 columns with padding

  // Special styling for "None" option
  if (product.isNoneOption) {
    // Check if current category has no products selected (meaning "None" is effectively selected)
    const hasProductsInCategory = currentCategory && selectedProducts.some(p => p.category === currentCategory);
    const isNoneSelected = !hasProductsInCategory;
    
    return (
      <TouchableOpacity
        style={[
          styles.card,
          styles.noneCard,
          {
            backgroundColor: isNoneSelected ? colors.selected : colors.card,
            borderColor: isNoneSelected ? colors.price : colors.border,
            width: cardWidth,
          },
        ]}
        onPress={() => onSelect(product)}
        activeOpacity={0.8}
      >
        <View style={styles.noneIcon}>
          <Text style={[styles.noneIconText, { color: colors.secondaryText }]}>✕</Text>
        </View>
        
        <View style={styles.productInfo}>
          <Text style={[styles.productName, { color: colors.text }]} numberOfLines={2}>
            {product.name}
          </Text>
          
          <Text style={[styles.productDescription, { color: colors.secondaryText }]} numberOfLines={2}>
            {product.description}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: isSelected ? colors.selected : colors.card,
          borderColor: isSelected ? colors.price : colors.border,
          width: cardWidth,
        },
      ]}
      onPress={() => onSelect(product)}
      activeOpacity={0.8}
    >
      {product.image_data && (
        <Image
          source={{ uri: `data:image/jpeg;base64,${product.image_data}` }}
          style={styles.productImage}
          resizeMode="cover"
        />
      )}
      
      <View style={styles.productInfo}>
        <Text style={[styles.productName, { color: colors.text }]} numberOfLines={2}>
          {product.name}
        </Text>
        
        <Text style={[styles.productSku, { color: colors.secondaryText }]} numberOfLines={1}>
          SKU: {product.sku}
        </Text>
        
        {product.description && (
          <Text style={[styles.productDescription, { color: colors.secondaryText }]} numberOfLines={2}>
            {product.description}
          </Text>
        )}
        
        <View style={styles.priceContainer}>
          <Text style={[styles.productPrice, { color: colors.price }]}>
            ₱{product.unit_price}
          </Text>
          {product.quantity !== undefined && (
            <Text style={[styles.stockInfo, { color: colors.secondaryText }]}>
              Stock: {product.quantity}
            </Text>
          )}
        </View>

        {showQuantity && (
          <View style={styles.quantityContainer}>
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={() => onQuantityChange && onQuantityChange(Math.max(1, quantity - 1))}
            >
              <Text style={styles.quantityButtonText}>-</Text>
            </TouchableOpacity>
            
            <Text style={[styles.quantityText, { color: colors.text }]}>
              {quantity}
            </Text>
            
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={() => onQuantityChange && onQuantityChange(quantity + 1)}
            >
              <Text style={styles.quantityButtonText}>+</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  productImage: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#F5F5F5',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    lineHeight: 18,
  },
  productSku: {
    fontSize: 12,
    marginBottom: 4,
  },
  productDescription: {
    fontSize: 11,
    marginBottom: 8,
    lineHeight: 14,
  },
  priceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: '700',
  },
  stockInfo: {
    fontSize: 10,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  quantityButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  quantityText: {
    fontSize: 14,
    fontWeight: '600',
    marginHorizontal: 12,
    minWidth: 20,
    textAlign: 'center',
  },
  // Styles for "None" option
  noneCard: {
    borderStyle: 'dashed',
    borderWidth: 2,
  },
  noneIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 8,
  },
  noneIconText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
});

export default ProductCard;
