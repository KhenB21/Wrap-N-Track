import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Alert,
  Modal,
  ScrollView,
} from "react-native";
import Header from "../Components/Header";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../Context/ThemeContext";

export default function CustomerManagementScreen({ navigation }) {
  const { darkMode } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    customer_type: "individual",
  });

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      // Simulate API call - in a real app, you would call the actual API
      const mockCustomers = [
        {
          id: 1,
          name: "John Doe",
          email: "john.doe@email.com",
          phone: "+63 912 345 6789",
          address: "123 Main St, Quezon City, Metro Manila",
          customer_type: "individual",
          total_orders: 5,
          total_spent: 15000,
          last_order: "2024-01-15",
          status: "active"
        },
        {
          id: 2,
          name: "ABC Corporation",
          email: "orders@abccorp.com",
          phone: "+63 2 123 4567",
          address: "456 Business Ave, Makati City, Metro Manila",
          customer_type: "corporate",
          total_orders: 12,
          total_spent: 75000,
          last_order: "2024-01-20",
          status: "active"
        },
        {
          id: 3,
          name: "Jane Smith",
          email: "jane.smith@email.com",
          phone: "+63 917 987 6543",
          address: "789 Residential St, Taguig City, Metro Manila",
          customer_type: "individual",
          total_orders: 2,
          total_spent: 5000,
          last_order: "2024-01-10",
          status: "inactive"
        }
      ];
      setCustomers(mockCustomers);
    } catch (error) {
      console.error("Error loading customers:", error);
      Alert.alert("Error", "Failed to load customers");
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadCustomers();
    } catch (error) {
      console.error("Error refreshing customers:", error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleAddCustomer = async () => {
    try {
      // Simulate API call
      const newId = customers.length + 1;
      const customer = {
        id: newId,
        ...newCustomer,
        total_orders: 0,
        total_spent: 0,
        last_order: null,
        status: "active"
      };
      setCustomers(prev => [customer, ...prev]);
      setShowAddModal(false);
      setNewCustomer({
        name: "",
        email: "",
        phone: "",
        address: "",
        customer_type: "individual",
      });
      Alert.alert("Success", "Customer added successfully!");
    } catch (error) {
      Alert.alert("Error", "Failed to add customer. Please try again.");
    }
  };

  const handleUpdateCustomer = async () => {
    try {
      // Simulate API call
      setCustomers(prev => 
        prev.map(customer => 
          customer.id === selectedCustomer.id 
            ? { ...customer, ...newCustomer }
            : customer
        )
      );
      setShowEditModal(false);
      setSelectedCustomer(null);
      Alert.alert("Success", "Customer updated successfully!");
    } catch (error) {
      Alert.alert("Error", "Failed to update customer. Please try again.");
    }
  };

  const openEditModal = (customer) => {
    setSelectedCustomer(customer);
    setNewCustomer({
      name: customer.name || "",
      email: customer.email || "",
      phone: customer.phone || "",
      address: customer.address || "",
      customer_type: customer.customer_type || "individual",
    });
    setShowEditModal(true);
  };

  const getFilteredCustomers = () => {
    if (!searchQuery.trim()) return customers;
    return customers.filter(customer =>
      customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.phone.includes(searchQuery)
    );
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return '#4CAF50';
      case 'inactive':
        return '#F44336';
      default:
        return darkMode ? '#B0B3B8' : '#6B6593';
    }
  };

  const getCustomerTypeIcon = (type) => {
    switch (type) {
      case 'individual':
        return 'account';
      case 'corporate':
        return 'office-building';
      default:
        return 'account';
    }
  };

  const renderCustomerItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.customerCard,
        { 
          backgroundColor: darkMode ? "#242526" : "#fff",
          borderColor: darkMode ? "#393A3B" : "#EDECF3",
        }
      ]}
      onPress={() => openEditModal(item)}
    >
      <View style={styles.customerHeader}>
        <View style={styles.customerInfo}>
          <View style={styles.customerNameRow}>
            <MaterialCommunityIcons 
              name={getCustomerTypeIcon(item.customer_type)} 
              size={20} 
              color={darkMode ? "#E4E6EB" : "#222"} 
            />
            <Text style={[styles.customerName, { color: darkMode ? "#E4E6EB" : "#222" }]}>
              {item.name}
            </Text>
          </View>
          <Text style={[styles.customerEmail, { color: darkMode ? "#B0B3B8" : "#6B6593" }]}>
            {item.email}
          </Text>
          <Text style={[styles.customerPhone, { color: darkMode ? "#B0B3B8" : "#6B6593" }]}>
            {item.phone}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>
            {item.status.toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={styles.customerDetails}>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: darkMode ? "#B0B3B8" : "#6B6593" }]}>
            Type:
          </Text>
          <Text style={[styles.detailValue, { color: darkMode ? "#E4E6EB" : "#222" }]}>
            {item.customer_type.charAt(0).toUpperCase() + item.customer_type.slice(1)}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: darkMode ? "#B0B3B8" : "#6B6593" }]}>
            Orders:
          </Text>
          <Text style={[styles.detailValue, { color: darkMode ? "#E4E6EB" : "#222" }]}>
            {item.total_orders}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: darkMode ? "#B0B3B8" : "#6B6593" }]}>
            Total Spent:
          </Text>
          <Text style={[styles.detailValue, { color: darkMode ? "#E4E6EB" : "#222" }]}>
            ₱{item.total_spent.toLocaleString()}
          </Text>
        </View>
        {item.last_order && (
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: darkMode ? "#B0B3B8" : "#6B6593" }]}>
              Last Order:
            </Text>
            <Text style={[styles.detailValue, { color: darkMode ? "#E4E6EB" : "#222" }]}>
              {new Date(item.last_order).toLocaleDateString()}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.customerAddress}>
        <Text style={[styles.addressLabel, { color: darkMode ? "#B0B3B8" : "#6B6593" }]}>
          Address:
        </Text>
        <Text style={[styles.addressText, { color: darkMode ? "#E4E6EB" : "#222" }]}>
          {item.address}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderModal = () => (
    <Modal
      visible={showAddModal || showEditModal}
      animationType="slide"
      transparent={true}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: darkMode ? "#242526" : "#fff" }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: darkMode ? "#E4E6EB" : "#222" }]}>
              {showAddModal ? "Add New Customer" : "Edit Customer"}
            </Text>
            <TouchableOpacity onPress={() => {
              setShowAddModal(false);
              setShowEditModal(false);
              setSelectedCustomer(null);
            }}>
              <MaterialCommunityIcons name="close" size={24} color={darkMode ? "#E4E6EB" : "#222"} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: darkMode ? "#B0B3B8" : "#6B6593" }]}>
                Customer Name *
              </Text>
              <TextInput
                style={[styles.textInput, { 
                  backgroundColor: darkMode ? "#393A3B" : "#F5F4FA",
                  color: darkMode ? "#E4E6EB" : "#222",
                  borderColor: darkMode ? "#393A3B" : "#EDECF3"
                }]}
                value={newCustomer.name}
                onChangeText={(value) => setNewCustomer(prev => ({ ...prev, name: value }))}
                placeholder="Enter customer name"
                placeholderTextColor={darkMode ? "#B0B3B8" : "#6B6593"}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: darkMode ? "#B0B3B8" : "#6B6593" }]}>
                Email *
              </Text>
              <TextInput
                style={[styles.textInput, { 
                  backgroundColor: darkMode ? "#393A3B" : "#F5F4FA",
                  color: darkMode ? "#E4E6EB" : "#222",
                  borderColor: darkMode ? "#393A3B" : "#EDECF3"
                }]}
                value={newCustomer.email}
                onChangeText={(value) => setNewCustomer(prev => ({ ...prev, email: value }))}
                placeholder="Enter email address"
                placeholderTextColor={darkMode ? "#B0B3B8" : "#6B6593"}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: darkMode ? "#B0B3B8" : "#6B6593" }]}>
                Phone Number *
              </Text>
              <TextInput
                style={[styles.textInput, { 
                  backgroundColor: darkMode ? "#393A3B" : "#F5F4FA",
                  color: darkMode ? "#E4E6EB" : "#222",
                  borderColor: darkMode ? "#393A3B" : "#EDECF3"
                }]}
                value={newCustomer.phone}
                onChangeText={(value) => setNewCustomer(prev => ({ ...prev, phone: value }))}
                placeholder="Enter phone number"
                placeholderTextColor={darkMode ? "#B0B3B8" : "#6B6593"}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: darkMode ? "#B0B3B8" : "#6B6593" }]}>
                Customer Type
              </Text>
              <View style={styles.radioGroup}>
                <TouchableOpacity
                  style={[
                    styles.radioOption,
                    { backgroundColor: darkMode ? "#393A3B" : "#F5F4FA" },
                    newCustomer.customer_type === "individual" && styles.radioSelected
                  ]}
                  onPress={() => setNewCustomer(prev => ({ ...prev, customer_type: "individual" }))}
                >
                  <Text style={[styles.radioText, { color: darkMode ? "#E4E6EB" : "#222" }]}>Individual</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.radioOption,
                    { backgroundColor: darkMode ? "#393A3B" : "#F5F4FA" },
                    newCustomer.customer_type === "corporate" && styles.radioSelected
                  ]}
                  onPress={() => setNewCustomer(prev => ({ ...prev, customer_type: "corporate" }))}
                >
                  <Text style={[styles.radioText, { color: darkMode ? "#E4E6EB" : "#222" }]}>Corporate</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: darkMode ? "#B0B3B8" : "#6B6593" }]}>
                Address *
              </Text>
              <TextInput
                style={[styles.textInput, styles.textArea, { 
                  backgroundColor: darkMode ? "#393A3B" : "#F5F4FA",
                  color: darkMode ? "#E4E6EB" : "#222",
                  borderColor: darkMode ? "#393A3B" : "#EDECF3"
                }]}
                value={newCustomer.address}
                onChangeText={(value) => setNewCustomer(prev => ({ ...prev, address: value }))}
                placeholder="Enter address"
                placeholderTextColor={darkMode ? "#B0B3B8" : "#6B6593"}
                multiline
                numberOfLines={3}
              />
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.cancelButton, { backgroundColor: darkMode ? "#393A3B" : "#EDECF3" }]}
              onPress={() => {
                setShowAddModal(false);
                setShowEditModal(false);
                setSelectedCustomer(null);
              }}
            >
              <Text style={[styles.cancelText, { color: darkMode ? "#E4E6EB" : "#222" }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: darkMode ? "#393A3B" : "#6B6593" }]}
              onPress={showAddModal ? handleAddCustomer : handleUpdateCustomer}
            >
              <Text style={styles.saveText}>
                {showAddModal ? "Add Customer" : "Update Customer"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const filteredCustomers = getFilteredCustomers();

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

      <View style={[styles.searchContainer, { backgroundColor: darkMode ? "#242526" : "#EDECF3" }]}>
        <MaterialCommunityIcons 
          name="magnify" 
          size={20} 
          color={darkMode ? "#B0B3B8" : "#6B6593"} 
          style={styles.searchIcon}
        />
        <TextInput
          style={[styles.searchInput, { color: darkMode ? "#E4E6EB" : "#222" }]}
          placeholder="Search customers..."
          placeholderTextColor={darkMode ? "#B0B3B8" : "#6B6593"}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <MaterialCommunityIcons 
              name="close-circle" 
              size={20} 
              color={darkMode ? "#B0B3B8" : "#6B6593"} 
            />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.headerContainer}>
        <Text style={[styles.headerTitle, { color: darkMode ? "#E4E6EB" : "#222" }]}>
          Customer Management
        </Text>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: darkMode ? "#393A3B" : "#6B6593" }]}
          onPress={() => setShowAddModal(true)}
        >
          <MaterialCommunityIcons name="plus" size={20} color="#fff" />
          <Text style={styles.addButtonText}>Add Customer</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredCustomers}
        renderItem={renderCustomerItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.customersList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      />

      {renderModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'serif',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'serif',
    fontWeight: 'bold',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'serif',
    fontWeight: 'bold',
    marginLeft: 4,
  },
  customersList: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  customerCard: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  customerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  customerInfo: {
    flex: 1,
  },
  customerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  customerName: {
    fontSize: 16,
    fontFamily: 'serif',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  customerEmail: {
    fontSize: 14,
    fontFamily: 'serif',
    marginBottom: 2,
  },
  customerPhone: {
    fontSize: 14,
    fontFamily: 'serif',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 10,
    fontFamily: 'serif',
    fontWeight: 'bold',
  },
  customerDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  detailLabel: {
    fontSize: 12,
    fontFamily: 'serif',
  },
  detailValue: {
    fontSize: 12,
    fontFamily: 'serif',
    fontWeight: 'bold',
  },
  customerAddress: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#EDECF3',
  },
  addressLabel: {
    fontSize: 12,
    fontFamily: 'serif',
    marginBottom: 4,
  },
  addressText: {
    fontSize: 12,
    fontFamily: 'serif',
    lineHeight: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: 12,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'serif',
    fontWeight: 'bold',
  },
  modalBody: {
    maxHeight: 400,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontFamily: 'serif',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'serif',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  radioGroup: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  radioOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginRight: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  radioSelected: {
    backgroundColor: '#6B6593',
  },
  radioText: {
    fontSize: 14,
    fontFamily: 'serif',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    marginRight: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    fontFamily: 'serif',
    fontWeight: 'bold',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    marginLeft: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'serif',
    fontWeight: 'bold',
  },
});