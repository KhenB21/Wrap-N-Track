import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Card, Button } from 'react-native-paper';
import { useTheme } from '../../Context/ThemeContext';
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');

export default function ReportsHomeScreen() {
  const theme = useTheme();
  const navigation = useNavigation();

  const reportCategories = [
    {
      id: 'sales',
      title: 'Sales Reports',
      description: 'Revenue, orders, and customer analytics',
      icon: 'chart-line',
      color: '#4CAF50',
      screens: [
        { name: 'SalesReport', title: 'Sales Overview', description: 'Revenue and order statistics' },
        { name: 'CustomerReport', title: 'Customer Analytics', description: 'Customer behavior and insights' },
        { name: 'ProductReport', title: 'Product Performance', description: 'Best-selling products and trends' }
      ]
    },
    {
      id: 'inventory',
      title: 'Inventory Reports',
      description: 'Stock levels, movements, and replenishment',
      icon: 'package-variant',
      color: '#2196F3',
      screens: [
        { name: 'InventoryReport', title: 'Stock Analysis', description: 'Current stock levels and trends' },
        { name: 'MovementReport', title: 'Movement Analysis', description: 'Product movement patterns' },
        { name: 'ReplenishmentReport', title: 'Replenishment', description: 'Reorder suggestions and alerts' }
      ]
    },
    {
      id: 'financial',
      title: 'Financial Reports',
      description: 'Profitability, costs, and financial metrics',
      icon: 'currency-usd',
      color: '#FF9800',
      screens: [
        { name: 'ProfitReport', title: 'Profit Analysis', description: 'Revenue vs costs breakdown' },
        { name: 'CostReport', title: 'Cost Analysis', description: 'Operational cost insights' },
        { name: 'ROIReport', title: 'ROI Analysis', description: 'Return on investment metrics' }
      ]
    },
    {
      id: 'operational',
      title: 'Operational Reports',
      description: 'Efficiency, performance, and process metrics',
      icon: 'cog',
      color: '#9C27B0',
      screens: [
        { name: 'EfficiencyReport', title: 'Efficiency Metrics', description: 'Process efficiency analysis' },
        { name: 'PerformanceReport', title: 'Performance Dashboard', description: 'Key performance indicators' },
        { name: 'QualityReport', title: 'Quality Metrics', description: 'Quality control and standards' }
      ]
    }
  ];

  const quickReports = [
    {
      title: 'Today\'s Sales',
      value: '₱15,420',
      change: '+12.5%',
      trend: 'up',
      icon: 'trending-up',
      color: '#4CAF50'
    },
    {
      title: 'Low Stock Items',
      value: '8',
      change: '-2',
      trend: 'down',
      icon: 'alert-circle',
      color: '#F57C00'
    },
    {
      title: 'Pending Orders',
      value: '23',
      change: '+5',
      trend: 'up',
      icon: 'clock-outline',
      color: '#2196F3'
    },
    {
      title: 'Customer Growth',
      value: '15',
      change: '+8.2%',
      trend: 'up',
      icon: 'account-plus',
      color: '#9C27B0'
    }
  ];

  const handleReportPress = (screenName) => {
    navigation.navigate(screenName);
  };

  const handleCategoryPress = (category) => {
    // Navigate to first report in category
    if (category.screens.length > 0) {
      navigation.navigate(category.screens[0].name);
    }
  };

  const renderQuickReport = (report, index) => (
    <TouchableOpacity
      key={index}
      style={[styles.quickReportCard, { backgroundColor: theme.colors.surface }]}
      onPress={() => handleReportPress('SalesReport')}
    >
      <View style={styles.quickReportHeader}>
        <View style={[styles.quickReportIcon, { backgroundColor: report.color }]}>
          <MaterialCommunityIcons name={report.icon} size={24} color="#fff" />
        </View>
        <View style={styles.quickReportInfo}>
          <Text style={[styles.quickReportTitle, { color: theme.colors.onSurface }]}>
            {report.title}
          </Text>
          <Text style={[styles.quickReportValue, { color: theme.colors.onSurface }]}>
            {report.value}
          </Text>
        </View>
      </View>
      <View style={styles.quickReportFooter}>
        <View style={[
          styles.trendContainer,
          { backgroundColor: report.trend === 'up' ? '#E8F5E8' : '#FFEBEE' }
        ]}>
          <MaterialCommunityIcons 
            name={report.trend === 'up' ? 'trending-up' : 'trending-down'} 
            size={16} 
            color={report.trend === 'up' ? '#4CAF50' : '#F44336'} 
          />
          <Text style={[
            styles.trendText,
            { color: report.trend === 'up' ? '#4CAF50' : '#F44336' }
          ]}>
            {report.change}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderReportCategory = (category) => (
    <Card key={category.id} style={[styles.categoryCard, { backgroundColor: theme.colors.surface }]}>
      <Card.Content>
        <TouchableOpacity
          style={styles.categoryHeader}
          onPress={() => handleCategoryPress(category)}
        >
          <View style={[styles.categoryIcon, { backgroundColor: category.color }]}>
            <MaterialCommunityIcons name={category.icon} size={32} color="#fff" />
          </View>
          <View style={styles.categoryInfo}>
            <Text style={[styles.categoryTitle, { color: theme.colors.onSurface }]}>
              {category.title}
            </Text>
            <Text style={[styles.categoryDescription, { color: theme.colors.onSurfaceVariant }]}>
              {category.description}
            </Text>
          </View>
          <MaterialCommunityIcons 
            name="chevron-right" 
            size={24} 
            color={theme.colors.onSurfaceVariant} 
          />
        </TouchableOpacity>
        
        <View style={styles.reportList}>
          {category.screens.map((report, index) => (
            <TouchableOpacity
              key={index}
              style={styles.reportItem}
              onPress={() => handleReportPress(report.name)}
            >
              <View style={styles.reportItemInfo}>
                <Text style={[styles.reportItemTitle, { color: theme.colors.onSurface }]}>
                  {report.title}
                </Text>
                <Text style={[styles.reportItemDescription, { color: theme.colors.onSurfaceVariant }]}>
                  {report.description}
                </Text>
              </View>
              <MaterialCommunityIcons 
                name="chevron-right" 
                size={20} 
                color={theme.colors.onSurfaceVariant} 
              />
            </TouchableOpacity>
          ))}
        </View>
      </Card.Content>
    </Card>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.colors.primary }]}>
          <Text style={[styles.headerTitle, { color: theme.colors.onPrimary }]}>
            Reports & Analytics
          </Text>
          <Text style={[styles.headerSubtitle, { color: theme.colors.onPrimary }]}>
            Comprehensive business insights
          </Text>
        </View>

        {/* Quick Reports */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
            Quick Overview
          </Text>
          <View style={styles.quickReportsGrid}>
            {quickReports.map((report, index) => renderQuickReport(report, index))}
          </View>
        </View>

        {/* Report Categories */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
            Report Categories
          </Text>
          {reportCategories.map((category) => renderReportCategory(category))}
        </View>

        {/* Export Options */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
            Export Options
          </Text>
          <Card style={[styles.exportCard, { backgroundColor: theme.colors.surface }]}>
            <Card.Content>
              <View style={styles.exportOptions}>
                <Button
                  mode="outlined"
                  icon="file-pdf"
                  onPress={() => Alert.alert('Export', 'PDF export functionality')}
                  style={styles.exportButton}
                >
                  Export to PDF
                </Button>
                <Button
                  mode="outlined"
                  icon="file-excel"
                  onPress={() => Alert.alert('Export', 'Excel export functionality')}
                  style={styles.exportButton}
                >
                  Export to Excel
                </Button>
                <Button
                  mode="outlined"
                  icon="email"
                  onPress={() => Alert.alert('Export', 'Email functionality')}
                  style={styles.exportButton}
                >
                  Email Report
                </Button>
              </View>
            </Card.Content>
          </Card>
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
  quickReportsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickReportCard: {
    width: (width - 48) / 2,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  quickReportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  quickReportIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  quickReportInfo: {
    flex: 1,
  },
  quickReportTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  quickReportValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  quickReportFooter: {
    alignItems: 'flex-end',
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  trendText: {
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  categoryCard: {
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  categoryIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  categoryDescription: {
    fontSize: 14,
  },
  reportList: {
    marginTop: 8,
  },
  reportItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  reportItemInfo: {
    flex: 1,
  },
  reportItemTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  reportItemDescription: {
    fontSize: 12,
  },
  exportCard: {
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  exportOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  exportButton: {
    flex: 1,
    minWidth: 120,
  },
});
