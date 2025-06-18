import {
  View,
  ScrollView,
  TouchableOpacity,
  Text,
  ToastAndroid,
  Image,
  ActivityIndicator,
} from "react-native";
import React, { useState, useEffect, useContext, useMemo } from 'react';
import MenuTitle from "../../Components/MenuTitle";
import SearchBar from "../../Components/SearchBar";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { useNavigation } from "@react-navigation/native";
import ItemToolBar from "../../Components/ItemToolBar";
import { InventoryContext } from "../../Context/InventoryContext";
import { useTheme } from "../../Screens/DrawerNavigation/ThemeContect";

const InventoryScreen = ({ route }) => {
  const { pageTitle } = route.params;
  const navigation = useNavigation();
  const { items, removeItem, loading, fetchInventory } = useContext(InventoryContext);
  const { themeStyles } = useTheme();

  // State for page
  const [activeButton, setActiveButton] = useState('All');
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);

  const filteredItems = useMemo(() => {
    if (activeButton === 'All') {
      return items;
    }
    const lowerCaseActiveButton = activeButton.toLowerCase();
    if (lowerCaseActiveButton === 'active' || lowerCaseActiveButton === 'inactive') {
        return items.filter(
            (item) => item.status && item.status.toLowerCase() === lowerCaseActiveButton
        );
    }
    return items;
  }, [items, activeButton]);

  // Function for longpressing item
  const handleItemLongpress = (item) => {
    setIsSelectionMode(true);
    setSelectedItems([item]);
  };

  // Function for pressing an item
  const handleItemPress = (item) => {
    if (isSelectionMode) {
      toggleSelectItem(item);
    } else {
      navigation.navigate("InventoryItemDetails", { item });
    }
  };

  // Function to toggle selection of an item
  const toggleSelectItem = (item) => {
    const isSelected = selectedItems.some(selected => selected.sku === item.sku);
    if (isSelected) {
      setSelectedItems(selectedItems.filter(selected => selected.sku !== item.sku));
    } else {
      setSelectedItems([...selectedItems, item]);
    }
  };

  // When delete is pressed in the toolbar
  const handleDeleteSelected = () => {
    if (selectedItems.length > 0) {
      selectedItems.forEach(item => removeItem(item));
      setSelectedItems([]);
      setIsSelectionMode(false);
    }
  };

  // When cancel is pressed in the toolbar
  const handleCancelSelectMode = () => {
    setSelectedItems([]);
    setIsSelectionMode(false);
  };

  useEffect(() => {
    if (route.params?.newItem) {
      fetchInventory();
    }
  }, [route.params?.newItem]);

  useEffect(() => {
    if (selectedItems.length === 0) {
      setIsSelectionMode(false);
    }
  }, [selectedItems]);

  return (
    <View style={{ flex: 1, backgroundColor: themeStyles.backgroundColor }}>
      {/* Header */}
      <View
        style={{
          width: "100%",
          height: 233,
          backgroundColor: themeStyles.headerColor,
          paddingHorizontal: 10,
        }}
      >
        <MenuTitle pageTitle={pageTitle} />
        <SearchBar />
        {/* Header navbar */}
        <View style={{ flexDirection: "row", height: 40, width: "100%" }}>
          <TouchableOpacity
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              borderColor: "#F0F0F0",
              borderBottomWidth: activeButton === "All" ? 4 : 0,
            }}
            onPress={() => setActiveButton("All")}
          >
            <Text style={{ fontWeight: '500', fontSize: 14, color: "#F0F0F0" }}>
              All
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              borderColor: "#F0F0F0",
              borderBottomWidth: activeButton === "Active" ? 4 : 0,
            }}
            onPress={() => setActiveButton("Active")}
          >
            <Text style={{ fontWeight: '500', fontSize: 14, color: "#F0F0F0" }}>
              Active
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              borderColor: "#F0F0F0",
              borderBottomWidth: activeButton === "Inactive" ? 4 : 0,
            }}
            onPress={() => setActiveButton("Inactive")}
          >
            <Text style={{ fontWeight: '500', fontSize: 14, color: "#F0F0F0" }}>
              Inactive
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main content area */}
      <View
        style={{
          flex: 1,
          width: "100%",
          backgroundColor: themeStyles.backgroundColor,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          marginTop: 0,
          paddingTop: 20,
        }}
      >
        {isSelectionMode && (
          <ItemToolBar
            handleCancelSelectMode={handleCancelSelectMode}
            onDelete={handleDeleteSelected}
            selectedCount={selectedItems.length}
          />
        )}

        <ScrollView
          contentContainerStyle={{ paddingBottom: 150 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {loading ? (
            <ActivityIndicator size="large" color="#696A8F" style={{ marginTop: 50 }} />
          ) : (
            filteredItems.map((item, index) => (
              <TouchableOpacity
                key={item.sku || index}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: isSelectionMode && selectedItems.some(selected => selected.sku === item.sku)
                    ? '#E0E0E0'
                    : themeStyles.containerColor,
                  marginVertical: 5,
                  marginHorizontal: 10,
                  borderRadius: 10,
                  padding: 15,
                  shadowColor: "#000",
                  shadowOpacity: 0.1,
                  shadowRadius: 5,
                  elevation: 3,
                }}
                onPress={() => handleItemPress(item)}
                onLongPress={() => handleItemLongpress(item)}
              >
                <Image
                  source={{
                    uri: item.image_data
                      ? `data:image/jpeg;base64,${item.image_data}`
                      : 'https://via.placeholder.com/80',
                  }}
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: 10,
                    marginRight: 15,
                  }}
                />
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontWeight: 'bold',
                      fontSize: 16,
                      color: themeStyles.textColor,
                    }}
                  >
                    {item.name}
                  </Text>
                  <Text style={{ color: themeStyles.textColor, fontSize: 14 }}>
                    {item.category}
                  </Text>
                  <Text
                    style={{
                      color: '#888888',
                      fontSize: 14,
                    }}
                  >
                    {item.sku}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end', marginLeft: 10 }}>
                  <Text style={{ color: themeStyles.textColor, fontSize: 14 }}>
                    Qty: {item.quantity}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </View>

      {!isSelectionMode && (
        <View
          style={{
            position: "absolute",
            bottom: 90,
            right: 20,
            flexDirection: "row",
            alignItems: "flex-end",
          }}
        >
          <TouchableOpacity
            style={{
              backgroundColor: "#696A8F",
              width: 45,
              height: 45,
              borderRadius: 25,
              justifyContent: "center",
              alignItems: "center",
              shadowColor: "#000",
              shadowOpacity: 0.3,
              shadowRadius: 3,
              elevation: 5,
              marginRight: 10,
            }}
            onPress={() => ToastAndroid.show("Downloading Inventory List...", 5)}
          >
            <Icon name="file-document-outline" size={26} color={"#FDFDFD"} />
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              backgroundColor: "#696A8F",
              width: 60,
              height: 60,
              borderRadius: 30,
              justifyContent: "center",
              alignItems: "center",
              shadowColor: "#000",
              shadowOpacity: 0.3,
              shadowRadius: 3,
              elevation: 5,
            }}
            onPress={() => navigation.navigate("InventoryForm")}
          >
            <Icon name="plus" size={30} color={"#FDFDFD"} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

export default InventoryScreen;
