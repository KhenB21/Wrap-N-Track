import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useTheme } from "../Screens/DrawerNavigation/ThemeContect";

const OrderItem = ({
  order,
  isLongpress,
  handleItemLongpress,
  handleItemPress,
}) => {
  const { themeStyles } = useTheme();

  return (
    <TouchableOpacity
      onLongPress={handleItemLongpress}
      onPress={handleItemPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: themeStyles.containerColor,
        marginVertical: 6,
        marginHorizontal: 4,
        borderRadius: 10,
        padding: 14,
        shadowColor: "#000",
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
        width: 340,
      }}
    >
      <View
        style={{
          backgroundColor: "#F0F0F0",
          borderRadius: 8,
          width: 50,
          height: 50,
          justifyContent: "center",
          alignItems: "center",
          marginRight: 14,
        }}
      >
        <Ionicons name="cart-outline" size={28} color="#888" />
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontWeight: "bold",
            fontSize: 16,
            color: themeStyles.textColor,
          }}
        >
          {order.customerName}
        </Text>
        <Text style={{ color: "#666", fontSize: 13 }}>
          Order #: {order.salesOrderNumber}
        </Text>
        <Text style={{ color: "#888", fontSize: 13 }}>
          Item: {order.item?.itemName || "N/A"}
        </Text>
        <Text style={{ color: "#aaa", fontSize: 12 }}>
          Date: {order.dateOrdered}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

export default OrderItem;
