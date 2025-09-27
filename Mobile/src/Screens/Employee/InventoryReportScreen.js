import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Dimensions,
  TouchableOpacity
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Card, Button, Chip } from 'react-native-paper';
import { useTheme } from '../../Context/ThemeContext';

const { width } = Dimensions.get('window');

export default function InventoryReportScreen({ navigation }) {
  const theme = useTheme();
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [loading, setLoading] = useState(false);

  const periods = [
    { key: 'week', label: 'This Week' },
    { key: 'month', label: 'This Month' },
    { key: 'quarter', label: 'This Quarter' },
    { key: 'year', label: 'This Year' }
  ];

  // Mock data - replace with actual API call
  const inventoryData = {
    totalProducts: 150,
    totalValue: 250000,
    lowStockItems: 8,
    outOfStockItems: 3,
    topCategories: [
      { name: 'Wedding', count: 45, value: 75000 },
      { name: 'Corporate', count: 38, value: 60000 },
      { name: 'Bespoke', count: 25, value: 50000 }
    ],
    lowStockProducts: [
      { name: 'Gift Box Small', sku: 'PKG-001', current: 15, reorder: 50 },
      { name: 'Ribbon Red', sku: 'PKG-002', current: 8, reorder: 100 },
      { name: 'Tissue Paper', sku: 'PKG-003', current: 5, reorder: 200 }
    ],
    movementAnalysis: [
      { name: 'Fast Moving', count: 25, description: 'High turnover items' },
      { name: 'Slow Moving', count: 15, description: 'Low turnover items' },
      { name: 'Dead Stock', count: 5, description: 'No movement items' }
    ]
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const getStockLevelColor = (current, reorder) => {
    if (current <= 0) return '#F44336';
    if (current <= reorder * 0.5) return '#FF9800';
    if (current <= reorder) return '#FFC107';
    return '#4CAF50';
  };

  const getStockLevelText = (current, reorder) => {
    if (current <= 0) return 'Out of Stock';
    if (current <= reorder * 0.5) return 'Critical';
    if (current <= reorder) return 'Low Stock';
    return 'In Stock';
  };

  const renderMetricCard = (title, value, icon, color, subtitle = null) => (
    <Card style={[styles.metricCard, { backgroundColor: theme.colors.surface }]}>
      <Card.Content>
        <View style={styles.metricHeader}>
          <View style={[styles.metricIcon, { backgroundColor: color }]}>
            <MaterialCommunityIcons name={icon} size={24} color="#fff" />
          </View>
          <Text style={[styles.metricTitle, { color: theme.colors.onSurface }]}>
            {title}
          </Text>
        </View>
        <Text style={[styles.metricValue, { color: theme.colors.onSurface }]}>
          {value}
        </Text>
        {subtitle && (
          <Text style={[styles.metricSubtitle, { color: theme.colors.onSurfaceVariant }]}>
            {subtitle}
          </Text>
        )}
      </Card.Content>
    </Card>
  );

  const renderTopCategories = () => (
    <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
      <Card.Content>
        <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
          Top Categories
        </Text>
        {inventoryData.topCategories.map((category, index) => (
          <View key={index} style={styles.categoryItem}>
            <View style={styles.categoryInfo}>
              <Text style={[styles.categoryName, { color: theme.colors.onSurface }]}>
                {category.name}
              </Text>
              <Text style={[styles.categoryCount, { color: theme.colors.onSurfaceVariant }]}>
                {category.count} products
              </Text>
            </View>
            <Text style={[styles.categoryValue, { color: theme.colors.onSurface }]}>
              {formatCurrency(category.value)}
            </Text>
          </View>
        ))}
      </Card.Content>
    </Card>
  );

  const renderLowStockProducts = () => (
    <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
      <Card.Content>
        <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
          Low Stock Alert
        </Text>
        {inventoryData.lowStockProducts.map((product, index) => {
          const stockColor = getStockLevelColor(product.current, product.reorder);
          const stockText = getStockLevelText(product.current, product.reorder);
          
          return (
            <View key={index} style={styles.productItem}>
              <View style={styles.productInfo}>
                <Text style={[styles.productName, { color: theme.colors.onSurface }]}>
                  {product.name}
                </Text>
                <Text style={[styles.productSku, { color: theme.colors.onSurfaceVariant }]}>
                  SKU: {product.sku}
                </Text>
                <Text style={[styles.productStock, { color: stockColor }]}>
                  {product.current} / {product.reorder} units
                </Text>
              </View>
              <View style={[styles.stockBadge, { backgroundColor: stockColor }]}>
                <Text style={styles.stockBadgeText}>{stockText}</Text>
              </View>
            </View>
          );
        })}
      </Card.Content>
    </Card>
  );

  const renderMovementAnalysis = () => (
    <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
      <Card.Content>
        <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
          Movement Analysis
        </Text>
        {inventoryData.movementAnalysis.map((movement, index) => (
          <View key={index} style={styles.movementItem}>
            <View style={styles.movementInfo}>
              <Text style={[styles.movementName, { color: theme.colors.onSurface }]}>
                {movement.name}
              </Text>
              <Text style={[styles.movementDescription, { color: theme.colors.onSurfaceVariant }]}>
                {movement.description}
              </Text>
            </View>
            <Text style={[styles.movementCount, { color: theme.colors.onSurface }]}>
              {movement.count}
            </Text>
          </View>
        ))}
      </Card.Content>
    </Card>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.colors.primary }]}>
          <Text style={[styles.headerTitle, { color: theme.colors.onPrimary }]}>
            Inventory Report
          </Text>
          <Text style={[styles.headerSubtitle, { color: theme.colors.onPrimary }]}>
            Stock levels and movement analysis
          </Text>
        </View>

        {/* Period Selector */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
            Time Period
          </Text>
          <View style={styles.periodContainer}>
            {periods.map((period) => (
              <Chip
                key={period.key}
                selected={selectedPeriod === period.key}
                onPress={() => setSelectedPeriod(period.key)}
                style={styles.periodChip}
              >
                {period.label}
              </Chip>
            ))}
          </View>
        </View>

        {/* Metrics */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
            Key Metrics
          </Text>
          <View style={styles.metricsGrid}>
            {renderMetricCard(
              'Total Products',
              inventoryData.totalProducts.toString(),
              'package-variant',
              '#2196F3',
              'Items in inventory'
            )}
            {renderMetricCard(
              'Total Value',
              formatCurrency(inventoryData.totalValue),
              'currency-usd',
              '#4CAF50',
              'Inventory worth'
            )}
            {renderMetricCard(
              'Low Stock',
              inventoryData.lowStockItems.toString(),
              'alert-circle',
              '#FF9800',
              'Items need restocking'
            )}
            {renderMetricCard(
              'Out of Stock',
              inventoryData.outOfStockItems.toString(),
              'alert',
              '#F44336',
              'Items unavailable'
            )}
          </View>
        </View>

        {/* Top Categories */}
        {renderTopCategories()}

        {/* Low Stock Products */}
        {renderLowStockProducts()}

        {/* Movement Analysis */}
        {renderMovementAnalysis()}

        {/* Action Buttons */}
        <View style={styles.section}>
          <View style={styles.actionButtons}>
            <Button
              mode="outlined"
              icon="file-pdf"
              onPress={() => Alert.alert('Export', 'PDF export functionality')}
              style={styles.actionButton}
            >
              Export PDF
            </Button>
            <Button
              mode="outlined"
              icon="file-excel"
              onPress={() => Alert.alert('Export', 'Excel export functionality')}
              style={styles.actionButton}
            >
              Export Excel
            </Button>
            <Button
              mode="contained"
              icon="email"
              onPress={() => Alert.alert('Email', 'Email functionality')}
              style={[styles.actionButton, { backgroundColor: theme.colors.primary }]}
            >
              Email Report
            </Button>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingTop: 40,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    fontSize: 16,
    marginTop: 4,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  periodContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  periodChip: {
    marginRight: 8,
    marginBottom: 8,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  metricCard: {
    width: (width - 48) / 2,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  metricTitle: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  metricSubtitle: {
    fontSize: 12,
  },
  card: {
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  categoryCount: {
    fontSize: 12,
  },
  categoryValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  productItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  productStock: {
    fontSize: 14,
    fontWeight: '500',
  },
  stockBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  stockBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  movementItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  movementInfo: {
    flex: 1,
  },
  movementName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  movementDescription: {
    fontSize: 12,
  },
  movementCount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  actionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    minWidth: 120,
  },
});
