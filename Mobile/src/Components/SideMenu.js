import React, { useRef, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
  Image,
  Pressable,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../Context/ThemeContext";
import { useNavigation } from "@react-navigation/native";
import { useProfile } from "../Context/ProfileContext"; // <-- Add this import

const { width } = Dimensions.get("window");
const MENU_WIDTH = width * 0.7;

export default function SideMenu({ visible, onClose }) {
  const slideAnim = useRef(new Animated.Value(-MENU_WIDTH)).current;
  const { darkMode, setDarkMode } = useTheme();
  const [displayDropdown, setDisplayDropdown] = useState(false);
  const navigation = useNavigation();

  const { profile } = useProfile(); // { name, avatar, ... }

  const menuBg = darkMode ? "#242526" : "#6B6593";
  const cardBg = darkMode ? "#393A3B" : "#B6B3C6";
  const textColor = darkMode ? "#E4E6EB" : "#fff";
  const subTextColor = darkMode ? "#B0B3B8" : "#fff";
  const borderColor = darkMode ? "#3A3B3C" : "#C7C5D1";

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: visible ? 0 : -MENU_WIDTH,
      duration: 250,
      useNativeDriver: false,
    }).start();
    if (!visible) setDisplayDropdown(false);
  }, [visible]);

  if (!visible && slideAnim._value <= -MENU_WIDTH + 1) return null;

  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents={visible ? "auto" : "none"}
    >
      {/* Overlay: only render when visible */}
      {visible && (
        <Pressable
          style={[
            styles.overlay,
            {
              backgroundColor: darkMode
                ? "rgba(24,25,26,0.7)"
                : "rgba(0,0,0,0.18)",
            },
          ]}
          onPress={onClose}
        />
      )}
      {/* Menu */}
      <Animated.View
        style={[styles.menu, { left: slideAnim, backgroundColor: menuBg }]}
      >
        {/* User Card */}
        <View style={[styles.userCard, { backgroundColor: cardBg }]}>
          <Image
            source={
              profile?.avatar
                ? { uri: profile.avatar }
                : { uri: "https://randomuser.me/api/portraits/lego/1.jpg" }
            }
            style={styles.avatar}
          />
          <Text style={[styles.userName, { color: textColor }]}>
            {profile?.name || "JUAN DELA CRUZ"}
          </Text>
        </View>
        {/* Menu Items */}
        <View style={styles.menuItems}>
          {/* Profile Button */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              onClose && onClose();
              setTimeout(() => navigation.navigate("Profile"), 250);
            }}
          >
            <MaterialCommunityIcons
              name="account-circle-outline"
              size={28}
              color={textColor}
            />
            <Text style={[styles.menuItemText, { color: textColor }]}>
              Profile
            </Text>
          </TouchableOpacity>
          {/* My Orders Button */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              onClose && onClose();
              setTimeout(() => navigation.navigate("OrderedItem"), 250);
            }}
          >
            <MaterialCommunityIcons
              name="clipboard-list-outline"
              size={28}
              color={textColor}
            />
            <Text style={[styles.menuItemText, { color: textColor }]}>
              My Orders
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem}>
            <MaterialCommunityIcons
              name="cog-outline"
              size={28}
              color={textColor}
            />
            <Text style={[styles.menuItemText, { color: textColor }]}>
              SETTINGS
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => setDisplayDropdown((v) => !v)}
          >
            <MaterialCommunityIcons
              name="weather-night"
              size={28}
              color={textColor}
            />
            <Text style={[styles.menuItemText, { color: textColor }]}>
              DISPLAY
            </Text>
            <MaterialCommunityIcons
              name={displayDropdown ? "chevron-up" : "chevron-down"}
              size={18}
              color={textColor}
              style={{ marginLeft: 6 }}
            />
          </TouchableOpacity>
          {displayDropdown && (
            <View
              style={[
                styles.dropdownBox,
                { backgroundColor: cardBg, borderColor: borderColor },
              ]}
            >
              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => setDarkMode(!darkMode)}
              >
                <MaterialCommunityIcons
                  name={
                    darkMode ? "toggle-switch" : "toggle-switch-off-outline"
                  }
                  size={28}
                  color={textColor}
                />
                <Text style={[styles.dropdownText, { color: textColor }]}>
                  Dark Mode: {darkMode ? "On" : "Off"}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        {/* Spacer */}
        <View style={{ flex: 1 }} />
        {/* Logout */}
        <TouchableOpacity
          style={[styles.logoutRow, { backgroundColor: cardBg }]}
        >
          <MaterialCommunityIcons
            name="logout"
            size={28}
            color={textColor}
            style={styles.logoutIcon}
          />
          <Text style={[styles.logoutText, { color: textColor }]}>LOGOUT</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.18)",
  },
  menu: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: MENU_WIDTH,
    backgroundColor: "#6B6593",
    zIndex: 10,
    paddingTop: 36,
    paddingHorizontal: 0,
    paddingBottom: 0,
    shadowColor: "#000",
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  userCard: {
    backgroundColor: "#B6B3C6",
    margin: 18,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    marginBottom: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
    backgroundColor: "#fff",
  },
  userName: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "bold",
    fontFamily: "serif",
    letterSpacing: 1,
  },
  menuItems: {
    marginTop: 8,
    marginLeft: 18,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },
  menuItemText: {
    color: "#fff",
    fontSize: 14,
    marginLeft: 12,
    fontFamily: "serif",
    letterSpacing: 1,
  },
  dropdownBox: {
    backgroundColor: "#B6B3C6",
    borderRadius: 8,
    marginLeft: 38,
    marginBottom: 8,
    marginTop: -8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#C7C5D1",
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  dropdownText: {
    color: "#fff",
    fontSize: 14,
    marginLeft: 10,
    fontFamily: "serif",
    letterSpacing: 1,
  },
  logoutRow: {
    backgroundColor: "#B6B3C6",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 0,
  },
  logoutIcon: {
    marginRight: 10,
  },
  logoutText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    fontFamily: "serif",
    letterSpacing: 2,
  },
});
