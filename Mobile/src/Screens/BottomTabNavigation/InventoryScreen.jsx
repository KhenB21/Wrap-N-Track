import {
  View,
  ScrollView,
  TouchableOpacity,
  Text,
  ToastAndroid,
  Image,
  ActivityIndicator,
} from "react-native";
import React, { useContext, useEffect, useState } from "react";
import MenuTitle from "../../Components/MenuTitle";
import SearchBar from "../../Components/SearchBar";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { useNavigation } from "@react-navigation/native";
import ItemToolBar from "../../Components/ItemToolBar";
import { InventoryContext } from "../../Context/InventoryContext";
import { useTheme } from "../../Screens/DrawerNavigation/ThemeContect";

const InventoryScreen = ({ route }) => {
  const pageTitle = route?.params?.pageTitle ?? "Inventory";
  const navigation = useNavigation();
  const { items, loading, error, removeItem, fetchInventoryItems } = useContext(
    InventoryContext
  );
  const { themeStyles } = useTheme();

  const [focused, setFocused] = useState("all");
  const [isLongpress, setLongpress] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  const handleItemLongpress = (item) => {
    setSelectedItem(item);
    setLongpress(true);
  };

  const handleItemPress = (item) => {
    if (isLongpress) {
      console.log("item selected");
    } else {
      navigation.navigate("InventoryItemDetails", { item });
    }
  };

  const handleDeleteSelected = () => {
    if (selectedItem) {
      removeItem(selectedItem); 
      setSelectedItem(null);
      setLongpress(false);
      ToastAndroid.show(`Deleted ${selectedItem.name}`, ToastAndroid.SHORT);
    }
  };

  const handleCancelSelectMode = () => {
    setSelectedItem(null);
    setLongpress(false);
  };

  useEffect(() => {

    const unsubscribe = navigation.addListener('focus', () => {
      fetchInventoryItems();
    });

    return unsubscribe;
  }, [navigation]);

  const renderContent = () => {
    if (loading) {
      return <ActivityIndicator size="large" color={themeStyles.textColor} style={{marginTop: 50}} />;
    }

    if (error) {
      return <Text style={{color: 'red', marginTop: 50}}>Error: {error}</Text>;
    }

    const filteredItems = focused === "all"
      ? items
      : items.filter((item) => item.status && item.status.toLowerCase() === "inactive");

    if (filteredItems.length === 0) {
      return <Text style={{color: themeStyles.textColor, marginTop: 50}}>No products found.</Text>;
    }

    return filteredItems.map((item, index) => (
      <TouchableOpacity
        key={item.sku}
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: themeStyles.containerColor,
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
        {/* Item Image */}
        <Image
          source={{
            uri: item.image_url || "https://via.placeholder.com/80",
          }}
          defaultSource={require("../../../assets/Pensee logos/pensee-logo-only.png")}
          style={{
            width: 80,
            height: 80,
            borderRadius: 8,
            marginRight: 15,
          }}
        />

        {/* Item Details */}
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontWeight: "600",
              fontSize: 18,
              color: themeStyles.textColor,
              marginBottom: 4,
            }}
          >
            {item.name} {/* Use name from database */}
          </Text>
          <Text
            style={{
              color: themeStyles.textColor,
              fontSize: 14,
              marginBottom: 4,
            }}
          >
            {item.category}
          </Text>
          <Text
            style={{
              color: themeStyles.textColor,
              fontSize: 14,
            }}
          >
            SKU: {item.sku}
          </Text>
        </View>

        {/* Quantity */}
        <View style={{ alignItems: "flex-end", marginLeft: 10 }}>
          <Text style={{ color: themeStyles.textColor, fontSize: 14 }}>
            Qty: {item.quantity}
          </Text>
        </View>
      </TouchableOpacity>
    ));
  };

  return (
    <View style={{ flex: 1, alignItems: "center" }}>
      {/* Header */}
      <View
        style={{
          width: "100%",
          height: 233,
          backgroundColor: themeStyles.headerColor,
          paddingHorizontal: 10,
        }}
      >
        {/* Menu button, Menu title, and Notification button */}
        <MenuTitle pageTitle={pageTitle} />

        {/* Search bar */}
        <SearchBar />

        {/* Header navbar */}
        <View style={{ flexDirection: "row", height: 40, width: "100%" }}>
          <TouchableOpacity
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              borderColor: "#F0F0F0",
              borderBottomWidth: focused === "all" ? 4 : 0,
            }}
            onPress={() => setFocused("all")}
          >
            <Text style={{ fontWeight: 500, fontSize: 14, color: "#F0F0F0" }}>
              All
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              borderColor: "#F0F0F0",
              borderBottomWidth: focused === "inactive" ? 4 : 0,
            }}
            onPress={() => setFocused("inactive")}
          >
            <Text style={{ fontWeight: 500, fontSize: 14, color: "#F0F0F0" }}>
              Inactive
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content */}
      <View
        style={{
          flex: 3,
          width: "100%",
          backgroundColor: themeStyles.backgroundColor,
          paddingHorizontal: 10,
        }}
      >
        {/* Longpress toolbar */}
        {isLongpress && (selectedItem) &&(
          <ItemToolBar
            handleCancelSelectMode={handleCancelSelectMode}
            onDelete={handleDeleteSelected}
            selectedCount={selectedItem ? 1 : 0}
          />
        )}

        {/* Products */}
        <ScrollView
          contentContainerStyle={{ paddingBottom: 63 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {renderContent()}
        </ScrollView>
      </View>

      <View
        style={{
          position: "absolute",
          bottom: 20,
          right: 20,
          flexDirection: "row",
          alignItems: "flex-end",
          marginBottom: 50,
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
    </View>
  );
};

export default InventoryScreen;
