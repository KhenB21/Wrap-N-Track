import { View, Text, ScrollView, TouchableOpacity, Switch } from "react-native";
import React, { useState } from "react";
import MenuTitle from "../../Components/MenuTitle";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useTheme } from "../../Screens/DrawerNavigation/ThemeContect";

const SettingsScreen = ({ route }) => {
  const { pageTitle } = route.params;
  const { isDarkMode, toggleTheme } = useTheme(); // Access theme state and toggle function
  const [isThemeDropdownVisible, setIsThemeDropdownVisible] = useState(false); // State to toggle dropdown visibility
  const { themeStyles } = useTheme();
  

  return (
    <View style={{ flex: 1, alignItems: "center", backgroundColor: themeStyles.backgroundColor }}>
      <View style={{ width: "100%", alignItems: "center", height: 150, backgroundColor: themeStyles.headerColor }}>
        <View style={{ width: "92%", flex: 1 }}>
          <MenuTitle pageTitle={pageTitle} />
        </View>
      </View>

      <View style={{ flex: 3, width: "100%", alignItems: "center" }}>
        <ScrollView
          style={{ width: "92%" }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Organization Section */}
          <View style={{ height: 150, width: "100%", backgroundColor: themeStyles.containerColor, borderRadius: 10, marginTop: 10, padding: 15 }}>
            <View style={{ height: 30 }}>
              <Text style={{ fontWeight: "bold", fontSize: 16, color: themeStyles.textColor }}>Organization</Text>
            </View>
            <TouchableOpacity style={{ width: "100%", height: 50, flexDirection: "row", alignItems: "center" }}>
              <MaterialCommunityIcons name="office-building" size={22} color={themeStyles.iconColor} />
              <Text style={{ fontSize: 15, fontWeight: "500", color: themeStyles.textColor, paddingLeft: 10 }}>
                Organization Profile
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ width: "100%", height: 50, flexDirection: "row", alignItems: "center" }}>
              <MaterialCommunityIcons name="account-cog" size={22} color={themeStyles.iconColor} />
              <Text style={{ fontSize: 15, fontWeight: "500", color: themeStyles.textColor, paddingLeft: 10 }}>
                User Management
              </Text>
            </TouchableOpacity>
          </View>

          {/* Personal Section */}
          <View style={{ width: "100%", backgroundColor: themeStyles.containerColor, borderRadius: 10, marginTop: 10, padding: 15 }}>
            <View style={{ height: 30 }}>
              <Text style={{ fontWeight: "bold", fontSize: 16, color: themeStyles.textColor }}>Personal</Text>
            </View>
            <TouchableOpacity style={{ width: "100%", height: 50, flexDirection: "row", alignItems: "center" }}>
              <MaterialCommunityIcons name="account" size={22} color={themeStyles.iconColor} />
              <Text style={{ fontSize: 15, fontWeight: "500", color: themeStyles.textColor, paddingLeft: 10 }}>
                Account Profile
              </Text>
            </TouchableOpacity>

             {/* Theme Section */}
            <View style={{ width: "100%", marginTop: 10 }}>
              <TouchableOpacity
                style={{ width: "100%", height: 50, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
                onPress={() => setIsThemeDropdownVisible(!isThemeDropdownVisible)} // Toggle dropdown visibility
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <MaterialCommunityIcons name="palette" size={22} color={themeStyles.iconColor} />
                  <Text style={{ fontSize: 15, fontWeight: "500", color: themeStyles.textColor, paddingLeft: 10 }}>Theme</Text>
                </View>
                <MaterialCommunityIcons
                  name={isThemeDropdownVisible ? "chevron-up" : "chevron-down"}
                  size={22}
                  color={themeStyles.iconColor}
                />
              </TouchableOpacity>

              {isThemeDropdownVisible && (
                <View style={{ marginTop: 10, paddingLeft: 32 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <MaterialCommunityIcons name="theme-light-dark" size={22} color={themeStyles.iconColor} />
                      <Text style={{ fontSize: 15, fontWeight: "500", color: themeStyles.textColor, paddingLeft: 10 }}>
                        Dark Mode
                      </Text>
                    </View>
                    <Switch value={isDarkMode} onValueChange={toggleTheme} />
                  </View>
                </View>
              )}
            </View>

            {/* Notification Section */}
            <TouchableOpacity
              style={{
                width: "100%",
                height: 50,
                flexDirection: "row",
                alignItems: "center",
                marginTop: isThemeDropdownVisible ? 20 : 10, // Adjust margin when dropdown is visible
              }}
            >
              <MaterialCommunityIcons name="bell" size={22} color={themeStyles.iconColor} />
              <Text style={{ fontSize: 15, fontWeight: "500", color: themeStyles.textColor, paddingLeft: 10 }}>
                Notifications
              </Text>
            </TouchableOpacity>
          </View>

          {/* Security Section */}
          <View style={{ height: 100, width: "100%", backgroundColor: themeStyles.containerColor, borderRadius: 10, marginTop: 10, padding: 15 }}>
            <View style={{ height: 30 }}>
              <Text style={{ fontWeight: "bold", fontSize: 16, color: themeStyles.textColor }}>Security</Text>
            </View>
            <TouchableOpacity style={{ width: "100%", height: 50, flexDirection: "row", alignItems: "center" }}>
              <MaterialCommunityIcons name="lock" size={22} color={themeStyles.iconColor} />
              <Text style={{ fontSize: 15, fontWeight: "500", color: themeStyles.textColor, paddingLeft: 10 }}>Privacy and Security</Text>
            </TouchableOpacity>
          </View>

          {/* More Section */}
          <View style={{ height: 100, width: "100%", backgroundColor: themeStyles.containerColor, borderRadius: 10, marginTop: 10, padding: 15 }}>
            <View style={{ height: 30 }}>
              <Text style={{ fontWeight: "bold", fontSize: 16, color: themeStyles.textColor }}>More</Text>
            </View>
            <TouchableOpacity style={{ width: "100%", height: 50, flexDirection: "row", alignItems: "center" }}>
              <MaterialCommunityIcons name="information" size={22} color={themeStyles.iconColor} />
              <Text style={{ fontSize: 15, fontWeight: "500", color: themeStyles.textColor, paddingLeft: 10 }}>About</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </View>
  );
};

export default SettingsScreen;