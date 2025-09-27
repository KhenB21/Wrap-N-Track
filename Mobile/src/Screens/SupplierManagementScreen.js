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

export default function SupplierManagementScreen({ navigation }) {
  const { darkMode } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [suppliers, setSuppliers] = useState([]);
  const [newSupplier, setNewSupplier] = useState({
    name: "",
    contact_person: "",
    email: "",
    phone: "",
    address: "",
    supplier_type: "local",
    payment_terms: "30",
    status: "active"
  });

  useEffect(() => {
    loadSuppliers();
  }, []);

  const loadSuppliers = async () => {
    setLoading(true);
    try {
      // Simulate API call - in a real app, you would call the actual API
      const mockSuppliers = [
        {
          id: 1,
          name: "ABC Packaging Supplies",
          contact_person: "Maria Santos",
          email: "orders@abcpkg.com",
          phone: "+63 2 123 4567",
          address: "123 Industrial Ave, Caloocan City, Metro Manila",
          supplier_type: "local",
          payment_terms: "30",
          status: "active",
          total_orders: 25,
          total_value: 150000,
          last_order: "2024-01-18",
          rating: 4.5
        },
        {
          id: 2,
          name: "Global Materials Inc.",
          contact_person: "John Smith",
          email: "john@globalmaterials.com",
          phone: "+63 917 123 4567",
          address: "456 Business Park, Pasig City, Metro Manila",
          supplier_type: "international",
          payment_terms: "15",
          status: "active",
          total_orders: 18,
          total_value: 200000,
          last_order: "2024-01-15",
          rating: 4.8
        },
        {
          id: 3,
          name: "Local Craft Supplies",
          contact_person: "Ana Cruz",
          email: "ana@localcraft.com",
          phone: "+63 918 987 6543",
          address: "789 Artisan St, Marikina City, Metro Manila",
          supplier_type: "local",
          payment_terms: "45",
          status: "inactive",
          total_orders: 8,
          total_value: 45000,
          last_order: "2023-12-20",
          rating: 3.9
        }
      ];
      setSuppliers(mockSuppliers);
    } catch (error) {
      console.error("Error loading suppliers:", error);
      Alert.alert("Error", "Failed to load suppliers");
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadSuppliers();
    } catch (error) {
      console.error("Error refreshing suppliers:", error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleAddSupplier = async () => {
    try {
      // Simulate API call
      const newId = suppliers.length + 1;
      const supplier = {
        id: newId,
        ...newSupplier,
        total_orders: 0,
        total_value: 0,
        last_order: null,
        rating: 0
      };
      setSuppliers(prev => [supplier, ...prev]);
      setShowAddModal(false);
      setNewSupplier({
        name: "",
        contact_person: "",
        email: "",
        phone: "",
        address: "",
        supplier_type: "local",
        payment_terms: "30",
        status: "active"
      });
      Alert.alert("Success", "Supplier added successfully!");
    } catch (error) {
      Alert.alert("Error", "Failed to add supplier. Please try again.");
    }
  };

  const handleUpdateSupplier = async () => {
    try {
      // Simulate API call
      setSuppliers(prev => 
        prev.map(supplier => 
          supplier.id === selectedSupplier.id 
            ? { ...supplier, ...newSupplier }
            : supplier
        )
      );
      setShowEditModal(false);
      setSelectedSupplier(null);
      Alert.alert("Success", "Supplier updated successfully!");
    } catch (error) {
      Alert.alert("Error", "Failed to update supplier. Please try again.");
    }
  };

  const openEditModal = (supplier) => {
    setSelectedSupplier(supplier);
    setNewSupplier({
      name: supplier.name || "",
      contact_person: supplier.contact_person || "",
      email: supplier.email || "",
      phone: supplier.phone || "",
      address: supplier.address || "",
      supplier_type: supplier.supplier_type || "local",
      payment_terms: supplier.payment_terms || "30",
      status: supplier.status || "active"
    });
    setShowEditModal(true);
  };

  const getFilteredSuppliers = () => {
    if (!searchQuery.trim()) return suppliers;
    return suppliers.filter(supplier =>
      supplier.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      supplier.contact_person.toLowerCase().includes(searchQuery.toLowerCase()) ||
      supplier.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      supplier.phone.includes(searchQuery)
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

  const getSupplierTypeIcon = (type) => {
    switch (type) {
      case 'local':
        return 'home-city';
      case 'international':
        return 'earth';
      default:
        return 'truck-delivery';
    }
  };

  const renderSupplierItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.supplierCard,
        { 
          backgroundColor: darkMode ? "#242526" : "#fff",
          borderColor: darkMode ? "#393A3B" : "#EDECF3",
        }
      ]}
      onPress={() => openEditModal(item)}
    >
      <View style={styles.supplierHeader}>
        <View style={styles.supplierInfo}>
          <View style={styles.supplierNameRow}>
            <MaterialCommunityIcons 
              name={getSupplierTypeIcon(item.supplier_type)} 
              size={20} 
              color={darkMode ? "#E4E6EB" : "#222"} 
            />
            <Text style={[styles.supplierName, { color: darkMode ? "#E4E6EB" : "#222" }]}>
              {item.name}
            </Text>
          </View>
          <Text style={[styles.contactPerson, { color: darkMode ? "#B0B3B8" : "#6B6593" }]}>
            Contact: {item.contact_person}
          </Text>
          <Text style={[styles.supplierEmail, { color: darkMode ? "#B0B3B8" : "#6B6593" }]}>
            {item.email}
          </Text>
          <Text style={[styles.supplierPhone, { color: darkMode ? "#B0B3B8" : "#6B6593" }]}>
            {item.phone}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>
            {item.status.toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={styles.supplierDetails}>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: darkMode ? "#B0B3B8" : "#6B6593" }]}>
            Type:
          </Text>
          <Text style={[styles.detailValue, { color: darkMode ? "#E4E6EB" : "#222" }]}>
            {item.supplier_type.charAt(0).toUpperCase() + item.supplier_type.slice(1)}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: darkMode ? "#B0B3B8" : "#6B6593" }]}>
            Payment Terms:
          </Text>
          <Text style={[styles.detailValue, { color: darkMode ? "#E4E6EB" : "#222" }]}>
            {item.payment_terms} days
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
            Total Value:
          </Text>
          <Text style={[styles.detailValue, { color: darkMode ? "#E4E6EB" : "#222" }]}>
            ₱{item.total_value.toLocaleString()}
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
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: darkMode ? "#B0B3B8" : "#6B6593" }]}>
            Rating:
          </Text>
          <View style={styles.ratingContainer}>
            <MaterialCommunityIcons name="star" size={16} color="#FFD700" />
            <Text style={[styles.ratingText, { color: darkMode ? "#E4E6EB" : "#222" }]}>
              {item.rating.toFixed(1)}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.supplierAddress}>
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
              {showAddModal ? "Add New Supplier" : "Edit Supplier"}
            </Text>
            <TouchableOpacity onPress={() => {
              setShowAddModal(false);
              setShowEditModal(false);
              setSelectedSupplier(null);
            }}>
              <MaterialCommunityIcons name="close" size={24} color={darkMode ? "#E4E6EB" : "#222"} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: darkMode ? "#B0B3B8" : "#6B6593" }]}>
                Supplier Name *
              </Text>
              <TextInput
                style={[styles.textInput, { 
                  backgroundColor: darkMode ? "#393A3B" : "#F5F4FA",
                  color: darkMode ? "#E4E6EB" : "#222",
                  borderColor: darkMode ? "#393A3B" : "#EDECF3"
                }]}
                value={newSupplier.name}
                onChangeText={(value) => setNewSupplier(prev => ({ ...prev, name: value }))}
                placeholder="Enter supplier name"
                placeholderTextColor={darkMode ? "#B0B3B8" : "#6B6593"}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: darkMode ? "#B0B3B8" : "#6B6593" }]}>
                Contact Person *
              </Text>
              <TextInput
                style={[styles.textInput, { 
                  backgroundColor: darkMode ? "#393A3B" : "#F5F4FA",
                  color: darkMode ? "#E4E6EB" : "#222",
                  borderColor: darkMode ? "#393A3B" : "#EDECF3"
                }]}
                value={newSupplier.contact_person}
                onChangeText={(value) => setNewSupplier(prev => ({ ...prev, contact_person: value }))}
                placeholder="Enter contact person name"
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
                value={newSupplier.email}
                onChangeText={(value) => setNewSupplier(prev => ({ ...prev, email: value }))}
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
                value={newSupplier.phone}
                onChangeText={(value) => setNewSupplier(prev => ({ ...prev, phone: value }))}
                placeholder="Enter phone number"
                placeholderTextColor={darkMode ? "#B0B3B8" : "#6B6593"}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: darkMode ? "#B0B3B8" : "#6B6593" }]}>
                Supplier Type
              </Text>
              <View style={styles.radioGroup}>
                <TouchableOpacity
                  style={[
                    styles.radioOption,
                    { backgroundColor: darkMode ? "#393A3B" : "#F5F4FA" },
                    newSupplier.supplier_type === "local" && styles.radioSelected
                  ]}
                  onPress={() => setNewSupplier(prev => ({ ...prev, supplier_type: "local" }))}
                >
                  <Text style={[styles.radioText, { color: darkMode ? "#E4E6EB" : "#222" }]}>Local</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.radioOption,
                    { backgroundColor: darkMode ? "#393A3B" : "#F5F4FA" },
                    newSupplier.supplier_type === "international" && styles.radioSelected
                  ]}
                  onPress={() => setNewSupplier(prev => ({ ...prev, supplier_type: "international" }))}
                >
                  <Text style={[styles.radioText, { color: darkMode ? "#E4E6EB" : "#222" }]}>International</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: darkMode ? "#B0B3B8" : "#6B6593" }]}>
                Payment Terms (days)
              </Text>
              <TextInput
                style={[styles.textInput, { 
                  backgroundColor: darkMode ? "#393A3B" : "#F5F4FA",
                  color: darkMode ? "#E4E6EB" : "#222",
                  borderColor: darkMode ? "#393A3B" : "#EDECF3"
                }]}
                value={newSupplier.payment_terms}
                onChangeText={(value) => setNewSupplier(prev => ({ ...prev, payment_terms: value }))}
                placeholder="Enter payment terms in days"
                placeholderTextColor={darkMode ? "#B0B3B8" : "#6B6593"}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: darkMode ? "#B0B3B8" : "#6B6593" }]}>
                Status
              </Text>
              <View style={styles.radioGroup}>
                <TouchableOpacity
                  style={[
                    styles.radioOption,
                    { backgroundColor: darkMode ? "#393A3B" : "#F5F4FA" },
                    newSupplier.status === "active" && styles.radioSelected
                  ]}
                  onPress={() => setNewSupplier(prev => ({ ...prev, status: "active" }))}
                >
                  <Text style={[styles.radioText, { color: darkMode ? "#E4E6EB" : "#222" }]}>Active</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.radioOption,
                    { backgroundColor: darkMode ? "#393A3B" : "#F5F4FA" },
                    newSupplier.status === "inactive" && styles.radioSelected
                  ]}
                  onPress={() => setNewSupplier(prev => ({ ...prev, status: "inactive" }))}
                >
                  <Text style={[styles.radioText, { color: darkMode ? "#E4E6EB" : "#222" }]}>Inactive</Text>
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
                value={newSupplier.address}
                onChangeText={(value) => setNewSupplier(prev => ({ ...prev, address: value }))}
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
                setSelectedSupplier(null);
              }}
            >
              <Text style={[styles.cancelText, { color: darkMode ? "#E4E6EB" : "#222" }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: darkMode ? "#393A3B" : "#6B6593" }]}
              onPress={showAddModal ? handleAddSupplier : handleUpdateSupplier}
            >
              <Text style={styles.saveText}>
                {showAddModal ? "Add Supplier" : "Update Supplier"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const filteredSuppliers = getFilteredSuppliers();

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
          placeholder="Search suppliers..."
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
          Supplier Management
        </Text>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: darkMode ? "#393A3B" : "#6B6593" }]}
          onPress={() => setShowAddModal(true)}
        >
          <MaterialCommunityIcons name="plus" size={20} color="#fff" />
          <Text style={styles.addButtonText}>Add Supplier</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredSuppliers}
        renderItem={renderSupplierItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.suppliersList}
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
  suppliersList: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  supplierCard: {
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
  supplierHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  supplierInfo: {
    flex: 1,
  },
  supplierNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  supplierName: {
    fontSize: 16,
    fontFamily: 'serif',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  contactPerson: {
    fontSize: 14,
    fontFamily: 'serif',
    marginBottom: 2,
  },
  supplierEmail: {
    fontSize: 14,
    fontFamily: 'serif',
    marginBottom: 2,
  },
  supplierPhone: {
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
  supplierDetails: {
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
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 12,
    fontFamily: 'serif',
    fontWeight: 'bold',
    marginLeft: 4,
  },
  supplierAddress: {
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