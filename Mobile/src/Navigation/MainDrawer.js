import React from "react";
import {
  createDrawerNavigator,
  DrawerContentScrollView,
  DrawerItemList,
  DrawerItem,
} from "@react-navigation/drawer";
import { View } from "react-native";
import HomeScreen from "../Screen/HomeScreen";
// import ProfileScreen from "../Screen/ProfileScreen";
// import OrdersScreen from "../Screen/OrdersScreen";
// import SettingsScreen from "../Screen/SettingsScreen";
import AsyncStorage from "@react-native-async-storage/async-storage";

const Drawer = createDrawerNavigator();

function CustomDrawerContent(props) {
  const { navigation } = props;

  const handleLogout = async () => {
    await AsyncStorage.clear(); // or remove only token/user if you prefer
    navigation.reset({ index: 0, routes: [{ name: "Login" }] });
  };

  return (
    <DrawerContentScrollView {...props} contentContainerStyle={{ flex: 1 }}>
      <View style={{ flex: 1 }}>
        <DrawerItemList {...props} />
      </View>
      <DrawerItem
        label="Logout"
        labelStyle={{ color: "#c44", fontWeight: "bold" }}
        onPress={handleLogout}
      />
    </DrawerContentScrollView>
  );
}

export default function MainDrawer() {
  return (
    <Drawer.Navigator
      initialRouteName="Home"
      screenOptions={{ headerShown: false }}
      drawerContent={(props) => <CustomDrawerContent {...props} />}
    >
      <Drawer.Screen name="Home" component={HomeScreen} />
      {/* <Drawer.Screen name="Profile" component={ProfileScreen} />
      <Drawer.Screen name="Orders" component={OrdersScreen} />
      <Drawer.Screen name="Settings" component={SettingsScreen} /> */}
    </Drawer.Navigator>
  );
}
