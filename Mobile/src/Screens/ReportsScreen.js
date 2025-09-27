import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
} from "react-native";
import Header from "../Components/Header";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../Context/ThemeContext";

const { width } = Dimensions.get("window");

export default function ReportsScreen({ navigation }) {
  const { darkMode } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedReport, setSelectedReport] = useState("sales");
  const [reportData, setReportData] = useState({
    sales: {
      totalRevenue: 0,
      totalOrders: 0,
      averageOrderValue: 0,
      topProducts: [],
    },
    inventory: {
      totalItems: 0,
      lowStockItems: 0,
      outOfStockItems: 0,
      totalValue: 0,
    },
    customers: {
      totalCustomers: 0,
      newCustomers: 0,
      activeCustomers: 0,
      averageOrderValue: 0,
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      // In a real app, you would fetch actual report data here
    } catch (error) {
      console.error("Error refreshing reports:", error);
    } finally {
      setRefreshing(false);
    }
  };

  const reportTypes = [
    {
      key: "sales",
      title: "Sales Report",
      icon: "chart-line",
      color: "#4CAF50",
      description: "Revenue, orders, and sales performance"
    },
    {
      key: "inventory",
      title: "Inventory Report",
      icon: "package-variant",
      color: "#2196F3",
      description: "Stock levels, low stock alerts, and inventory value"
    },
    {
      key: "customers",
      title: "Customer Report",
      icon: "account-group",
      color: "#FF9800",
      description: "Customer analytics and behavior insights"
    },
    {
      key: "products",
      title: "Product Report",
      icon: "chart-box",
      color: "#9C27B0",
      description: "Product performance and popularity"
    },
    {
      key: "suppliers",
      title: "Supplier Report",
      icon: "truck-delivery",
      color: "#F44336",
      description: "Supplier performance and delivery metrics"
    },
    {
      key: "financial",
      title: "Financial Report",
      icon: "currency-usd",
      color: "#607D8B",
      description: "Profit margins, costs, and financial health"
    }
  ];

  const renderReportCard = (report) => (
    <TouchableOpacity
      key={report.key}
      style={[
        styles.reportCard,
        { 
          backgroundColor: darkMode ? "#242526" : "#fff",
          borderColor: darkMode ? "#393A3B" : "#EDECF3",
        },
        selectedReport === report.key && styles.selectedCard
      ]}
      onPress={() => setSelectedReport(report.key)}
    >
      <View style={[styles.reportIcon, { backgroundColor: report.color }]}>
        <MaterialCommunityIcons name={report.icon} size={24} color="#fff" />
      </View>
      <View style={styles.reportContent}>
        <Text style={[styles.reportTitle, { color: darkMode ? "#E4E6EB" : "#222" }]}>
          {report.title}
        </Text>
        <Text style={[styles.reportDescription, { color: darkMode ? "#B0B3B8" : "#6B6593" }]}>
          {report.description}
        </Text>
      </View>
      {selectedReport === report.key && (
        <MaterialCommunityIcons 
          name="check-circle" 
          size={20} 
          color={report.color} 
        />
      )}
    </TouchableOpacity>
  );

  const renderSalesReport = () => (
    <View style={[styles.reportContent, { backgroundColor: darkMode ? "#242526" : "#fff" }]}>
      <Text style={[styles.reportSectionTitle, { color: darkMode ? "#E4E6EB" : "#222" }]}>
        Sales Overview
      </Text>
      
      <View style={styles.metricsGrid}>
        <View style={[styles.metricCard, { backgroundColor: darkMode ? "#393A3B" : "#F5F4FA" }]}>
          <MaterialCommunityIcons name="currency-usd" size={24} color="#4CAF50" />
          <Text style={[styles.metricValue, { color: darkMode ? "#E4E6EB" : "#222" }]}>
            ₱{reportData.sales.totalRevenue.toLocaleString()}
          </Text>
          <Text style={[styles.metricLabel, { color: darkMode ? "#B0B3B8" : "#6B6593" }]}>
            Total Revenue
          </Text>
        </View>

        <View style={[styles.metricCard, { backgroundColor: darkMode ? "#393A3B" : "#F5F4FA" }]}>
          <MaterialCommunityIcons name="shopping" size={24} color="#2196F3" />
          <Text style={[styles.metricValue, { color: darkMode ? "#E4E6EB" : "#222" }]}>
            {reportData.sales.totalOrders}
          </Text>
          <Text style={[styles.metricLabel, { color: darkMode ? "#B0B3B8" : "#6B6593" }]}>
            Total Orders
          </Text>
        </View>

        <View style={[styles.metricCard, { backgroundColor: darkMode ? "#393A3B" : "#F5F4FA" }]}>
          <MaterialCommunityIcons name="chart-line" size={24} color="#FF9800" />
          <Text style={[styles.metricValue, { color: darkMode ? "#E4E6EB" : "#222" }]}>
            ₱{reportData.sales.averageOrderValue.toFixed(2)}
          </Text>
          <Text style={[styles.metricLabel, { color: darkMode ? "#B0B3B8" : "#6B6593" }]}>
            Avg Order Value
          </Text>
        </View>

        <View style={[styles.metricCard, { backgroundColor: darkMode ? "#393A3B" : "#F5F4FA" }]}>
          <MaterialCommunityIcons name="trending-up" size={24} color="#9C27B0" />
          <Text style={[styles.metricValue, { color: darkMode ? "#E4E6EB" : "#222" }]}>
            +12.5%
          </Text>
          <Text style={[styles.metricLabel, { color: darkMode ? "#B0B3B8" : "#6B6593" }]}>
            Growth Rate
          </Text>
        </View>
      </View>
    </View>
  );

  const renderInventoryReport = () => (
    <View style={[styles.reportContent, { backgroundColor: darkMode ? "#242526" : "#fff" }]}>
      <Text style={[styles.reportSectionTitle, { color: darkMode ? "#E4E6EB" : "#222" }]}>
        Inventory Overview
      </Text>
      
      <View style={styles.metricsGrid}>
        <View style={[styles.metricCard, { backgroundColor: darkMode ? "#393A3B" : "#F5F4FA" }]}>
          <MaterialCommunityIcons name="package-variant" size={24} color="#2196F3" />
          <Text style={[styles.metricValue, { color: darkMode ? "#E4E6EB" : "#222" }]}>
            {reportData.inventory.totalItems}
          </Text>
          <Text style={[styles.metricLabel, { color: darkMode ? "#B0B3B8" : "#6B6593" }]}>
            Total Items
          </Text>
        </View>

        <View style={[styles.metricCard, { backgroundColor: darkMode ? "#393A3B" : "#F5F4FA" }]}>
          <MaterialCommunityIcons name="alert" size={24} color="#FF9800" />
          <Text style={[styles.metricValue, { color: darkMode ? "#E4E6EB" : "#222" }]}>
            {reportData.inventory.lowStockItems}
          </Text>
          <Text style={[styles.metricLabel, { color: darkMode ? "#B0B3B8" : "#6B6593" }]}>
            Low Stock
          </Text>
        </View>

        <View style={[styles.metricCard, { backgroundColor: darkMode ? "#393A3B" : "#F5F4FA" }]}>
          <MaterialCommunityIcons name="close-circle" size={24} color="#F44336" />
          <Text style={[styles.metricValue, { color: darkMode ? "#E4E6EB" : "#222" }]}>
            {reportData.inventory.outOfStockItems}
          </Text>
          <Text style={[styles.metricLabel, { color: darkMode ? "#B0B3B8" : "#6B6593" }]}>
            Out of Stock
          </Text>
        </View>

        <View style={[styles.metricCard, { backgroundColor: darkMode ? "#393A3B" : "#F5F4FA" }]}>
          <MaterialCommunityIcons name="currency-usd" size={24} color="#4CAF50" />
          <Text style={[styles.metricValue, { color: darkMode ? "#E4E6EB" : "#222" }]}>
            ₱{reportData.inventory.totalValue.toLocaleString()}
          </Text>
          <Text style={[styles.metricLabel, { color: darkMode ? "#B0B3B8" : "#6B6593" }]}>
            Total Value
          </Text>
        </View>
      </View>
    </View>
  );

  const renderCustomerReport = () => (
    <View style={[styles.reportContent, { backgroundColor: darkMode ? "#242526" : "#fff" }]}>
      <Text style={[styles.reportSectionTitle, { color: darkMode ? "#E4E6EB" : "#222" }]}>
        Customer Overview
      </Text>
      
      <View style={styles.metricsGrid}>
        <View style={[styles.metricCard, { backgroundColor: darkMode ? "#393A3B" : "#F5F4FA" }]}>
          <MaterialCommunityIcons name="account-group" size={24} color="#2196F3" />
          <Text style={[styles.metricValue, { color: darkMode ? "#E4E6EB" : "#222" }]}>
            {reportData.customers.totalCustomers}
          </Text>
          <Text style={[styles.metricLabel, { color: darkMode ? "#B0B3B8" : "#6B6593" }]}>
            Total Customers
          </Text>
        </View>

        <View style={[styles.metricCard, { backgroundColor: darkMode ? "#393A3B" : "#F5F4FA" }]}>
          <MaterialCommunityIcons name="account-plus" size={24} color="#4CAF50" />
          <Text style={[styles.metricValue, { color: darkMode ? "#E4E6EB" : "#222" }]}>
            {reportData.customers.newCustomers}
          </Text>
          <Text style={[styles.metricLabel, { color: darkMode ? "#B0B3B8" : "#6B6593" }]}>
            New This Month
          </Text>
        </View>

        <View style={[styles.metricCard, { backgroundColor: darkMode ? "#393A3B" : "#F5F4FA" }]}>
          <MaterialCommunityIcons name="account-check" size={24} color="#FF9800" />
          <Text style={[styles.metricValue, { color: darkMode ? "#E4E6EB" : "#222" }]}>
            {reportData.customers.activeCustomers}
          </Text>
          <Text style={[styles.metricLabel, { color: darkMode ? "#B0B3B8" : "#6B6593" }]}>
            Active Customers
          </Text>
        </View>

        <View style={[styles.metricCard, { backgroundColor: darkMode ? "#393A3B" : "#F5F4FA" }]}>
          <MaterialCommunityIcons name="chart-line" size={24} color="#9C27B0" />
          <Text style={[styles.metricValue, { color: darkMode ? "#E4E6EB" : "#222" }]}>
            ₱{reportData.customers.averageOrderValue.toFixed(2)}
          </Text>
          <Text style={[styles.metricLabel, { color: darkMode ? "#B0B3B8" : "#6B6593" }]}>
            Avg Order Value
          </Text>
        </View>
      </View>
    </View>
  );

  const renderReportContent = () => {
    switch (selectedReport) {
      case "sales":
        return renderSalesReport();
      case "inventory":
        return renderInventoryReport();
      case "customers":
        return renderCustomerReport();
      default:
        return (
          <View style={[styles.reportContent, { backgroundColor: darkMode ? "#242526" : "#fff" }]}>
            <Text style={[styles.comingSoon, { color: darkMode ? "#B0B3B8" : "#6B6593" }]}>
              This report is coming soon!
            </Text>
          </View>
        );
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: darkMode ? "#18191A" : "#F5F4FA" }]}>
      <Header
        showBack
        showCart
        logoType="image"
        onBackPress={() => navigation.goBack()}
        onCartPress={() => navigation.navigate("MyCart")}
        darkMode={darkMode}
      />

      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.headerContainer}>
          <Text style={[styles.headerTitle, { color: darkMode ? "#E4E6EB" : "#222" }]}>
            Reports & Analytics
          </Text>
          <Text style={[styles.headerSubtitle, { color: darkMode ? "#B0B3B8" : "#6B6593" }]}>
            Track your business performance
          </Text>
        </View>

        {/* Report Type Selection */}
        <View style={styles.reportTypesContainer}>
          {reportTypes.map(renderReportCard)}
        </View>

        {/* Report Content */}
        {renderReportContent()}
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
  headerContainer: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: 'serif',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: 'serif',
  },
  reportTypesContainer: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  reportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedCard: {
    borderColor: '#6B6593',
    borderWidth: 2,
  },
  reportIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  reportContent: {
    flex: 1,
  },
  reportTitle: {
    fontSize: 16,
    fontFamily: 'serif',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  reportDescription: {
    fontSize: 12,
    fontFamily: 'serif',
    lineHeight: 16,
  },
  reportSectionTitle: {
    fontSize: 18,
    fontFamily: 'serif',
    fontWeight: 'bold',
    marginBottom: 16,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  metricCard: {
    width: (width - 48) / 2,
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 20,
    fontFamily: 'serif',
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
    fontFamily: 'serif',
    textAlign: 'center',
  },
  comingSoon: {
    fontSize: 16,
    fontFamily: 'serif',
    textAlign: 'center',
    paddingVertical: 40,
  },
});