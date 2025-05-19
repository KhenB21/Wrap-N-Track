import React, { useContext, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ToastAndroid,
} from "react-native";
import MenuTitle from "../../Components/MenuTitle";
import Ionicons from "react-native-vector-icons/Ionicons";
import SearchBar from "../../Components/SearchBar";
import { useNavigation } from "@react-navigation/native";
import OrderItem from "../../Components/OrderItem";
import ItemToolBar from "../../Components/ItemToolBar";
import { useTheme } from "../../Screens/DrawerNavigation/ThemeContect";
import { SalesContext } from "../../Context/SalesContext"; // <-- Import SalesContext

const SalesScreen = ({ route }) => {
  const { pageTitle } = route.params;
  const navigation = useNavigation();
  const [focused, setFocused] = useState("all");
  const { themeStyles } = useTheme();
  const { orders } = useContext(SalesContext); // <-- Get orders from context

  // State for long press
  const [isLongpress, setLongpress] = useState(false);

  // Function for longpressing item
  const handleItemLongpress = () => {
    setLongpress(true);
  };

  // Function for pressing an item
  const handleItemPress = () => {
    if (isLongpress) {
      console.log("item selected");
    } else {
      navigation.navigate("InventoryItemDetails");
    }
  };

  const handleCancelSelectMode = () => {
    setLongpress(false);
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
        <MenuTitle pageTitle={pageTitle} />
        <SearchBar />
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
              Completed
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View
        style={{
          flex: 3,
          width: "100%",
          alignItems: "center",
          backgroundColor: themeStyles.backgroundColor,
          paddingHorizontal: 10,
        }}
      >
        {isLongpress && (
          <ItemToolBar handleCancelSelectMode={handleCancelSelectMode} />
        )}

        <ScrollView
          contentContainerStyle={{ paddingBottom: 63 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {focused === "all"
            ? orders.map((order, index) => (
                <TouchableOpacity
                  key={index}
                  style={{
                    width: "100%",
                    backgroundColor: themeStyles.containerColor,
                    marginTop: 4,
                    borderRadius: 5,
                    flexDirection: "row",
                    padding: 8,
                    justifyContent: "space-between",
                  }}
                  onPress={() => {
                    /* handle order press if needed */
                  }}
                  onLongPress={() => handleItemLongpress(order)}
                >
                  <View style={{ flexDirection: "row" }}>
                    <View
                      style={{
                        height: 90,
                        width: 90,
                        borderRadius: 3,
                        backgroundColor: "#F0F0F0",
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      <Ionicons name="cart-outline" size={40} color="#888888" />
                    </View>
                    <View style={{ marginLeft: 8 }}>
                      <Text
                        style={{
                          fontWeight: "bold",
                          color: themeStyles.textColor,
                        }}
                      >
                        {order.customerName}
                      </Text>
                      <Text style={{ color: themeStyles.textColor }}>
                        Order #: {order.salesOrderNumber}
                      </Text>
                      <Text style={{ color: themeStyles.textColor }}>
                        Item: {order.item?.itemName || "N/A"}
                      </Text>
                      <Text style={{ color: themeStyles.textColor }}>
                        Qty: {order.item?.quantity || "N/A"}
                      </Text>
                    </View>
                  </View>
                  <View>
                    <Text
                      style={{
                        fontWeight: "bold",
                        textAlign: "right",
                        color: themeStyles.textColor,
                      }}
                    >
                      {order.dateOrdered}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))
            : orders
                .filter((order) => order.status?.toLowerCase() === "completed")
                .map((order, index) => (
                  <TouchableOpacity
                    key={index}
                    style={{
                      width: "100%",
                      backgroundColor: themeStyles.containerColor,
                      marginTop: 4,
                      borderRadius: 5,
                      flexDirection: "row",
                      padding: 8,
                      justifyContent: "space-between",
                    }}
                    onPress={() => {
                      /* handle order press if needed */
                    }}
                    onLongPress={() => handleItemLongpress(order)}
                  >
                    <View style={{ flexDirection: "row" }}>
                      <View
                        style={{
                          height: 90,
                          width: 90,
                          borderRadius: 3,
                          backgroundColor: "#F0F0F0",
                          justifyContent: "center",
                          alignItems: "center",
                        }}
                      >
                        <Ionicons name="cart-outline" size={40} color="#888888" />
                      </View>
                      <View style={{ marginLeft: 8 }}>
                        <Text
                          style={{
                            fontWeight: "bold",
                            color: themeStyles.textColor,
                          }}
                        >
                          {order.customerName}
                        </Text>
                        <Text style={{ color: themeStyles.textColor }}>
                          Order #: {order.salesOrderNumber}
                        </Text>
                        <Text style={{ color: themeStyles.textColor }}>
                          Item: {order.item?.itemName || "N/A"}
                        </Text>
                        <Text style={{ color: themeStyles.textColor }}>
                          Qty: {order.item?.quantity || "N/A"}
                        </Text>
                      </View>
                    </View>
                    <View>
                      <Text
                        style={{
                          fontWeight: "bold",
                          textAlign: "right",
                          color: themeStyles.textColor,
                        }}
                      >
                        {order.dateOrdered}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
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
          onPress={() => ToastAndroid.show("Downloading Sales List...", 5)}
        >
          <Ionicons name="document-text" size={26} color={"#FDFDFD"} />
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
          onPress={() => navigation.navigate("SalesForm")}
        >
          <Ionicons name="add" size={30} color={"#FDFDFD"} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default SalesScreen;