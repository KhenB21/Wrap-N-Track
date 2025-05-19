import React, { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import Ionicons from "react-native-vector-icons/Ionicons";
import { Menu } from "react-native-paper";

const NotificationItem = ({ time, icon, iconColor, message, themeStyles }) => {
  const [visible, setVisible] = useState(false);

  return (
    <TouchableOpacity
      style={{
        height: 80,
        width: "100%",
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 15,
        marginBottom: 15,
      }}
    >
      <View
        style={{
          height: 50,
          width: 50,
          backgroundColor: iconColor,
          borderRadius: 40,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <MaterialCommunityIcons name={icon} size={28} color={"#FDFDFD"} />
      </View>
      <View style={{ justifyContent: "space-between", width: "70%" }}>
        <Text style={{ color: themeStyles.textColor }}>{message}</Text>
        <Text style={{ color: themeStyles.textColor }}>{time} minutes ago</Text>
      </View>
      <View style={{ position: "relative" }}>
        <Menu
          visible={visible}
          onDismiss={() => setVisible(false)}
          anchor={
            <TouchableOpacity onPress={() => setVisible(true)}>
              <Ionicons
                name="ellipsis-horizontal"
                size={20}
                color={themeStyles.iconColor}
              />
            </TouchableOpacity>
          }
          contentStyle={{ backgroundColor: themeStyles.containerColor }}
        >
          <Menu.Item
            onPress={() => console.log("Delete")}
            title="Delete"
            leadingIcon={() => <Ionicons name="trash" size={20} color="red" />}
            style={{ backgroundColor: themeStyles.containerColor }}
          />
        </Menu>
      </View>
    </TouchableOpacity>
  );
};

export default NotificationItem;
