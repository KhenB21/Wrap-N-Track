import React, { useState } from "react";
import { View, Text, TouchableOpacity, Image } from "react-native";
import { useTheme } from "../Screens/DrawerNavigation/ThemeContect";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import Ionicons from "react-native-vector-icons/Ionicons";
import { Menu } from "react-native-paper";

const InventoryItem = ({handleItemLongpress, handleItemPress, isLongpress}) => {
  const { themeStyles } = useTheme();

  return (
    <TouchableOpacity 
      style={{
        width: '100%', 
        backgroundColor: themeStyles.containerColor, 
        marginTop: 4, 
        borderRadius: 5, 
        flexDirection: 'row', 
        padding: 8, 
        justifyContent: 'space-between',
      }} 
      onPress={() => handleItemPress()}
      onLongPress={() => handleItemLongpress()}
    >
      <View style={{flexDirection: 'row'}}>
        <Image style={{height: 90, width: 90, borderRadius: 3}} resizeMethod='contain' source={require('../../assets/inventory/oolong-tea.jpg')}/>
        <View style={{marginLeft: 8}}>
          <Text style={{fontWeight: 'bold', color: themeStyles.textColor}}>Artisan teas</Text>
          <Text style = {{color: themeStyles.textColor}}>Oolong tea</Text>
          <Text style={{color: themeStyles.textColor}}>Qty: 314</Text>
        </View>
      </View>
      <View>
        <Text style={{fontWeight: 'bold', textAlign: 'right', color: themeStyles.textColor}}>₱195.00</Text>
      </View>
    </TouchableOpacity>
  );
};

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
        {/* Wrap message and time in <Text> */}
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

export default InventoryItem;