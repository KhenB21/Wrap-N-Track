import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Animated,
  Switch,
} from "react-native";
import {
  createDrawerNavigator,
  DrawerContentScrollView,
} from "@react-navigation/drawer";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons, Feather, MaterialIcons } from "@expo/vector-icons";
import HomeScreen from "../Screen/HomeScreen";
import ProfileScreen from "../Screen/ProfileScreen";
import MyOrdersScreen from "../Screen/MyOrdersScreen";
import AboutUsScreen from "../Screen/AboutUsScreen";
import ChangePasswordScreen from "../Screen/ChangePasswordScreen";

function CustomDrawerContent(props) {
  const { navigation } = props;
  const [user, setUser] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [displayOpen, setDisplayOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const settingsAnim = useState(new Animated.Value(0))[0];
  const displayAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    const fetchUser = async () => {
      const userData = await AsyncStorage.getItem("user");
      if (userData) setUser(JSON.parse(userData));
    };
    fetchUser();
  }, []);

  // Animate dropdowns
  useEffect(() => {
    Animated.timing(settingsAnim, {
      toValue: settingsOpen ? 1 : 0,
      duration: 180,
      useNativeDriver: false,
    }).start();
  }, [settingsOpen]);
  useEffect(() => {
    Animated.timing(displayAnim, {
      toValue: displayOpen ? 1 : 0,
      duration: 180,
      useNativeDriver: false,
    }).start();
  }, [displayOpen]);

  const handleLogout = async () => {
    await AsyncStorage.clear();
    navigation.reset({ index: 0, routes: [{ name: "Login" }] });
  };

  const avatar = require("../../assets/Images/Default Profile.jpg");

  // Animate heights for dropdowns
  const settingsHeight = settingsAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 104], // 2 submenu items, each ~52px
  });
  const displayHeight = displayAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 52], // 1 submenu item, ~52px
  });

  return (
    <View style={{ flex: 1, backgroundColor: "#7978a0" }}>
      <DrawerContentScrollView
        {...props}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        {/* Profile Card */}
        <TouchableOpacity
          style={styles.profileCard}
          onPress={() => navigation.navigate("Profile")}
          activeOpacity={0.8}
        >
          <Image source={avatar} style={styles.avatar} />
          <View>
            <Text style={styles.profileName}>
              {user?.name || "Juan Dela Cruz"}
            </Text>
            <Text style={styles.profileEmail}>
              {user?.email || "jdc@email.com"}
            </Text>
            <Text style={styles.profileEdit}>View Profile</Text>
          </View>
        </TouchableOpacity>

        {/* Menu Items */}
        <View style={{ marginTop: 20, flex: 1 }}>
          {/* My Orders */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate("MyOrders")}
          >
            <View style={styles.menuIconCircle}>
              <MaterialIcons name="receipt-long" size={22} color="#7978a0" />
            </View>
            <Text style={styles.menuText}>My Orders</Text>
          </TouchableOpacity>

          {/* Settings Dropdown */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => setSettingsOpen((prev) => !prev)}
            activeOpacity={0.7}
          >
            <View style={styles.menuIconCircle}>
              <Ionicons name="settings-sharp" size={22} color="#7978a0" />
            </View>
            <Text style={styles.menuText}>Settings</Text>
            <Feather
              name={settingsOpen ? "chevron-up" : "chevron-down"}
              size={20}
              color="#ededed"
              style={{ marginLeft: "auto" }}
            />
          </TouchableOpacity>
          {/* Settings Dropdown Content */}
          <Animated.View style={{ overflow: "hidden", height: settingsHeight }}>
            <TouchableOpacity
              style={[styles.menuItem, styles.subMenuItem]}
              onPress={() => navigation.navigate("AboutUs")}
            >
              <Ionicons
                name="information-circle-outline"
                size={20}
                color="#ededed"
                style={styles.subMenuIcon}
              />
              <Text style={styles.menuText}>About Us</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.menuItem, styles.subMenuItem]}
              onPress={() => navigation.navigate("ChangePassword")}
            >
              <Feather
                name="key"
                size={20}
                color="#ededed"
                style={styles.subMenuIcon}
              />
              <Text style={styles.menuText}>Change Password</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Display Dropdown */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => setDisplayOpen((prev) => !prev)}
            activeOpacity={0.7}
          >
            <View style={styles.menuIconCircle}>
              <Feather name="monitor" size={22} color="#7978a0" />
            </View>
            <Text style={styles.menuText}>Display</Text>
            <Feather
              name={displayOpen ? "chevron-up" : "chevron-down"}
              size={20}
              color="#ededed"
              style={{ marginLeft: "auto" }}
            />
          </TouchableOpacity>
          {/* Display Dropdown Content */}
          <Animated.View
            style={{ overflow: "hidden", height: displayHeight, width: "100%" }}
          >
            <View style={styles.centeredSubMenuRow}>
              <Feather name="moon" size={20} color="#ededed" />
              <Text style={[styles.menuText, { marginHorizontal: 12 }]}>
                Dark Mode
              </Text>
              <Switch
                value={darkMode}
                onValueChange={setDarkMode}
                thumbColor={darkMode ? "#fff" : "#ccc"}
                trackColor={{ false: "#bbb", true: "#4b4368" }}
              />
            </View>
          </Animated.View>
        </View>
      </DrawerContentScrollView>
      {/* Bottom Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={24} color="#ededed" />
        <Text style={styles.logoutText}>LOGOUT</Text>
      </TouchableOpacity>
    </View>
  );
}

const Drawer = createDrawerNavigator();

export default function MainDrawer() {
  return (
    <Drawer.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerShown: false,
        drawerStyle: {
          width: "68%",
          backgroundColor: "#7978a0",
        },
      }}
      drawerContent={(props) => <CustomDrawerContent {...props} />}
    >
      <Drawer.Screen name="Home" component={HomeScreen} />
      <Drawer.Screen name="Profile" component={ProfileScreen} />
      <Drawer.Screen name="MyOrders" component={MyOrdersScreen} />
      <Drawer.Screen name="AboutUs" component={AboutUsScreen} />
      <Drawer.Screen name="ChangePassword" component={ChangePasswordScreen} />
    </Drawer.Navigator>
  );
}

const styles = StyleSheet.create({
  profileCard: {
    backgroundColor: "#908db6",
    borderRadius: 12,
    margin: 5,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    marginRight: 14,
    borderWidth: 1,
    borderColor: "#ededed",
    backgroundColor: "#fff",
  },
  profileName: {
    fontSize: 16,
    color: "#ededed",
    fontFamily: "serif",
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  profileEmail: {
    fontSize: 12,
    color: "#dfdef7",
    fontFamily: "serif",
    marginBottom: 2,
  },
  profileEdit: {
    color: "#e0d5fa",
    fontSize: 12,
    fontStyle: "italic",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingLeft: 12, // move icon more to left
    paddingRight: 18,
    borderRadius: 8,
    marginBottom: 2,
  },
  menuIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#ededed",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  subMenuItem: {
    paddingLeft: 45,
    backgroundColor: "rgba(0,0,0,0.07)",
    marginBottom: 0,
    borderRadius: 0,
  },
  centeredSubMenuRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    width: "100%",
    paddingVertical: 14,
    marginRight: 14,
    backgroundColor: "rgba(0,0,0,0.07)",
  },

  subMenuIcon: {
    marginRight: 10,
  },
  menuText: {
    fontSize: 15,
    color: "#ededed",
    fontFamily: "serif",
    letterSpacing: 0.5,
  },
  logoutBtn: {
    backgroundColor: "#908db6",
    paddingVertical: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  logoutText: {
    color: "#ededed",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 12,
    fontFamily: "serif",
    letterSpacing: 1,
  },
});
