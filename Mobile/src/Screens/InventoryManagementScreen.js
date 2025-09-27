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
import { useInventory } from "../Context/InventoryContext";
import { useTheme } from "../Context/ThemeContext";

export default function InventoryManagementScreen({ navigation }) {
  const {
    inventory,
    filteredInventory,
    loading,
    error,
    searchQuery,
    setSearchQuery,
    loadInventory,
    addInventoryItem,
    updateInventoryItem,
    adjustStock,
    clearError,
  } = useInventory();
  const { darkMode } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [newItem, setNewItem] = useState({
    name: "",
    sku: "",
    description: "",
    category: "",
    unit_price: "",
    current_stock: "",
    reorder_level: "",
    supplier: "",
  });
  const [adjustmentData, setAdjustmentData] = useState({
    adjustment_type: "add",
    quantity: "",
    reason: "",
  });

  useEffect(() => {
    loadInventory();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadInventory();
    } catch (error) {
      console.error("Error refreshing inventory:", error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleAddItem = async () => {
    try {
      await addInventoryItem(newItem);
      setShowAddModal(false);
      setNewItem({
        name: "",
        sku: "",
        description: "",
        category: "",
        unit_price: "",
        current_stock: "",
        reorder_level: "",
        supplier: "",
      });
      Alert.alert("Success", "Item added successfully!");
    } catch (error) {
      Alert.alert("Error", "Failed to add item. Please try again.");
    }
  };

  const handleUpdateItem = async () => {
    try {
      await updateInventoryItem(selectedItem.sku, newItem);
      setShowEditModal(false);
      setSelectedItem(null);
      Alert.alert("Success", "Item updated successfully!");
    } catch (error) {
      Alert.alert("Error", "Failed to update item. Please try again.");
    }
  };

  const handleAdjustStock = async () => {
    try {
      await adjustStock(selectedItem.sku, adjustmentData);
      setShowAdjustModal(false);
      setSelectedItem(null);
      setAdjustmentData({
        adjustment_type: "add",
        quantity: "",
        reason: "",
      });
      Alert.alert("Success", "Stock adjusted successfully!");
    } catch (error) {
      Alert.alert("Error", "Failed to adjust stock. Please try again.");
    }
  };

  const openEditModal = (item) => {
    setSelectedItem(item);
    setNewItem({
      name: item.name || "",
      sku: item.sku || "",
      description: item.description || "",
      category: item.category || "",
      unit_price: item.unit_price?.toString() || "",
      current_stock: item.current_stock?.toString() || "",
      reorder_level: item.reorder_level?.toString() || "",
      supplier: item.supplier || "",
    });
    setShowEditModal(true);
  };

  const openAdjustModal = (item) => {
    setSelectedItem(item);
    setAdjustmentData({
      adjustment_type: "add",
      quantity: "",
      reason: "",
    });
    setShowAdjustModal(true);
  };

  const getStockStatus = (item) => {
    if (item.current_stock <= 0) return { status: "Out of Stock", color: "#EF5350" };
    if (item.current_stock <= item.reorder_level) return { status: "Low Stock", color: "#FFA726" };
    return { status: "In Stock", color: "#4CAF50" };
  };

  const renderItem = ({ item }) => {
    const stockStatus = getStockStatus(item);
    
    return (
      <TouchableOpacity
        style={[
          styles.itemCard,
          { 
            backgroundColor: darkMode ? "#242526" : "#fff",
            borderColor: darkMode ? "#393A3B" : "#EDECF3",
          }
        ]}
        onPress={() => openEditModal(item)}
      >
        <View style={styles.itemHeader}>
          <View style={styles.itemInfo}>
            <Text style={[styles.itemName, { color: darkMode ? "#E4E6EB" : "#222" }]} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={[styles.itemSku, { color: darkMode ? "#B0B3B8" : "#6B6593" }]}>
              SKU: {item.sku}
            </Text>
          </View>
          <View style={[styles.stockBadge, { backgroundColor: stockStatus.color }]}>
            <Text style={styles.stockText}>{stockStatus.status}</Text>
          </View>
        </View>

        <View style={styles.itemDetails}>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: darkMode ? "#B0B3B8" : "#6B6593" }]}>
              Category:
            </Text>
            <Text style={[styles.detailValue, { color: darkMode ? "#E4E6EB" : "#222" }]}>
              {item.category}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: darkMode ? "#B0B3B8" : "#6B6593" }]}>
              Price:
            </Text>
            <Text style={[styles.detailValue, { color: darkMode ? "#E4E6EB" : "#222" }]}>
              ₱{parseFloat(item.unit_price).toFixed(2)}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: darkMode ? "#B0B3B8" : "#6B6593" }]}>
              Stock:
            </Text>
            <Text style={[styles.detailValue, { color: darkMode ? "#E4E6EB" : "#222" }]}>
              {item.current_stock} units
            </Text>
          </View>
        </View>

        <View style={styles.itemActions}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: darkMode ? "#393A3B" : "#6B6593" }]}
            onPress={() => openAdjustModal(item)}
          >
            <MaterialCommunityIcons name="plus-minus" size={16} color="#fff" />
            <Text style={styles.actionText}>Adjust Stock</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderModal = () => (
    <Modal
      visible={showAddModal || showEditModal || showAdjustModal}
      animationType="slide"
      transparent={true}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: darkMode ? "#242526" : "#fff" }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: darkMode ? "#E4E6EB" : "#222" }]}>
              {showAddModal ? "Add New Item" : showEditModal ? "Edit Item" : "Adjust Stock"}
            </Text>
            <TouchableOpacity onPress={() => {
              setShowAddModal(false);
              setShowEditModal(false);
              setShowAdjustModal(false);
              setSelectedItem(null);
            }}>
              <MaterialCommunityIcons name="close" size={24} color={darkMode ? "#E4E6EB" : "#222"} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            {(showAddModal || showEditModal) && (
              <>
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: darkMode ? "#B0B3B8" : "#6B6593" }]}>
                    Item Name *
                  </Text>
                  <TextInput
                    style={[styles.textInput, { 
                      backgroundColor: darkMode ? "#393A3B" : "#F5F4FA",
                      color: darkMode ? "#E4E6EB" : "#222",
                      borderColor: darkMode ? "#393A3B" : "#EDECF3"
                    }]}
                    value={newItem.name}
                    onChangeText={(value) => setNewItem(prev => ({ ...prev, name: value }))}
                    placeholder="Enter item name"
                    placeholderTextColor={darkMode ? "#B0B3B8" : "#6B6593"}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: darkMode ? "#B0B3B8" : "#6B6593" }]}>
                    SKU *
                  </Text>
                  <TextInput
                    style={[styles.textInput, { 
                      backgroundColor: darkMode ? "#393A3B" : "#F5F4FA",
                      color: darkMode ? "#E4E6EB" : "#222",
                      borderColor: darkMode ? "#393A3B" : "#EDECF3"
                    }]}
                    value={newItem.sku}
                    onChangeText={(value) => setNewItem(prev => ({ ...prev, sku: value }))}
                    placeholder="Enter SKU"
                    placeholderTextColor={darkMode ? "#B0B3B8" : "#6B6593"}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: darkMode ? "#B0B3B8" : "#6B6593" }]}>
                    Category
                  </Text>
                  <TextInput
                    style={[styles.textInput, { 
                      backgroundColor: darkMode ? "#393A3B" : "#F5F4FA",
                      color: darkMode ? "#E4E6EB" : "#222",
                      borderColor: darkMode ? "#393A3B" : "#EDECF3"
                    }]}
                    value={newItem.category}
                    onChangeText={(value) => setNewItem(prev => ({ ...prev, category: value }))}
                    placeholder="Enter category"
                    placeholderTextColor={darkMode ? "#B0B3B8" : "#6B6593"}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: darkMode ? "#B0B3B8" : "#6B6593" }]}>
                    Unit Price *
                  </Text>
                  <TextInput
                    style={[styles.textInput, { 
                      backgroundColor: darkMode ? "#393A3B" : "#F5F4FA",
                      color: darkMode ? "#E4E6EB" : "#222",
                      borderColor: darkMode ? "#393A3B" : "#EDECF3"
                    }]}
                    value={newItem.unit_price}
                    onChangeText={(value) => setNewItem(prev => ({ ...prev, unit_price: value }))}
                    placeholder="Enter unit price"
                    placeholderTextColor={darkMode ? "#B0B3B8" : "#6B6593"}
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: darkMode ? "#B0B3B8" : "#6B6593" }]}>
                    Current Stock *
                  </Text>
                  <TextInput
                    style={[styles.textInput, { 
                      backgroundColor: darkMode ? "#393A3B" : "#F5F4FA",
                      color: darkMode ? "#E4E6EB" : "#222",
                      borderColor: darkMode ? "#393A3B" : "#EDECF3"
                    }]}
                    value={newItem.current_stock}
                    onChangeText={(value) => setNewItem(prev => ({ ...prev, current_stock: value }))}
                    placeholder="Enter current stock"
                    placeholderTextColor={darkMode ? "#B0B3B8" : "#6B6593"}
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: darkMode ? "#B0B3B8" : "#6B6593" }]}>
                    Reorder Level
                  </Text>
                  <TextInput
                    style={[styles.textInput, { 
                      backgroundColor: darkMode ? "#393A3B" : "#F5F4FA",
                      color: darkMode ? "#E4E6EB" : "#222",
                      borderColor: darkMode ? "#393A3B" : "#EDECF3"
                    }]}
                    value={newItem.reorder_level}
                    onChangeText={(value) => setNewItem(prev => ({ ...prev, reorder_level: value }))}
                    placeholder="Enter reorder level"
                    placeholderTextColor={darkMode ? "#B0B3B8" : "#6B6593"}
                    keyboardType="numeric"
                  />
                </View>
              </>
            )}

            {showAdjustModal && (
              <>
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: darkMode ? "#B0B3B8" : "#6B6593" }]}>
                    Adjustment Type
                  </Text>
                  <View style={styles.radioGroup}>
                    <TouchableOpacity
                      style={[
                        styles.radioOption,
                        { backgroundColor: darkMode ? "#393A3B" : "#F5F4FA" },
                        adjustmentData.adjustment_type === "add" && styles.radioSelected
                      ]}
                      onPress={() => setAdjustmentData(prev => ({ ...prev, adjustment_type: "add" }))}
                    >
                      <Text style={[styles.radioText, { color: darkMode ? "#E4E6EB" : "#222" }]}>Add Stock</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.radioOption,
                        { backgroundColor: darkMode ? "#393A3B" : "#F5F4FA" },
                        adjustmentData.adjustment_type === "remove" && styles.radioSelected
                      ]}
                      onPress={() => setAdjustmentData(prev => ({ ...prev, adjustment_type: "remove" }))}
                    >
                      <Text style={[styles.radioText, { color: darkMode ? "#E4E6EB" : "#222" }]}>Remove Stock</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: darkMode ? "#B0B3B8" : "#6B6593" }]}>
                    Quantity *
                  </Text>
                  <TextInput
                    style={[styles.textInput, { 
                      backgroundColor: darkMode ? "#393A3B" : "#F5F4FA",
                      color: darkMode ? "#E4E6EB" : "#222",
                      borderColor: darkMode ? "#393A3B" : "#EDECF3"
                    }]}
                    value={adjustmentData.quantity}
                    onChangeText={(value) => setAdjustmentData(prev => ({ ...prev, quantity: value }))}
                    placeholder="Enter quantity"
                    placeholderTextColor={darkMode ? "#B0B3B8" : "#6B6593"}
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: darkMode ? "#B0B3B8" : "#6B6593" }]}>
                    Reason
                  </Text>
                  <TextInput
                    style={[styles.textInput, styles.textArea, { 
                      backgroundColor: darkMode ? "#393A3B" : "#F5F4FA",
                      color: darkMode ? "#E4E6EB" : "#222",
                      borderColor: darkMode ? "#393A3B" : "#EDECF3"
                    }]}
                    value={adjustmentData.reason}
                    onChangeText={(value) => setAdjustmentData(prev => ({ ...prev, reason: value }))}
                    placeholder="Enter reason for adjustment"
                    placeholderTextColor={darkMode ? "#B0B3B8" : "#6B6593"}
                    multiline
                    numberOfLines={3}
                  />
                </View>
              </>
            )}
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.cancelButton, { backgroundColor: darkMode ? "#393A3B" : "#EDECF3" }]}
              onPress={() => {
                setShowAddModal(false);
                setShowEditModal(false);
                setShowAdjustModal(false);
                setSelectedItem(null);
              }}
            >
              <Text style={[styles.cancelText, { color: darkMode ? "#E4E6EB" : "#222" }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: darkMode ? "#393A3B" : "#6B6593" }]}
              onPress={showAdjustModal ? handleAdjustStock : (showAddModal ? handleAddItem : handleUpdateItem)}
            >
              <Text style={styles.saveText}>
                {showAdjustModal ? "Adjust Stock" : (showAddModal ? "Add Item" : "Update Item")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

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
          placeholder="Search inventory..."
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
          Inventory Management
        </Text>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: darkMode ? "#393A3B" : "#6B6593" }]}
          onPress={() => setShowAddModal(true)}
        >
          <MaterialCommunityIcons name="plus" size={20} color="#fff" />
          <Text style={styles.addButtonText}>Add Item</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredInventory}
        renderItem={renderItem}
        keyExtractor={(item) => item.sku}
        contentContainerStyle={styles.inventoryList}
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
  inventoryList: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  itemCard: {
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
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontFamily: 'serif',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  itemSku: {
    fontSize: 12,
    fontFamily: 'serif',
  },
  stockBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  stockText: {
    color: '#fff',
    fontSize: 10,
    fontFamily: 'serif',
    fontWeight: 'bold',
  },
  itemDetails: {
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
  itemActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  actionText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'serif',
    marginLeft: 4,
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