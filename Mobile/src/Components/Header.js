import React from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export default function Header({
  showMenu = false,
  showBack = false,
  showCart = false,
  onMenuPress,
  onBackPress,
  onCartPress,
  title = "",
  logoType = "image", // 'image' or 'text'
  darkMode = false,
}) {
  const bgColor = darkMode ? "#242526" : "#6B6593";
  const iconColor = darkMode ? "#E4E6EB" : "#fff";
  const textColor = darkMode ? "#E4E6EB" : "#fff";
  return (
    <View style={[styles.header, { backgroundColor: bgColor }]}>
      {showMenu ? (
        <TouchableOpacity style={styles.iconBtn} onPress={onMenuPress}>
          <MaterialCommunityIcons name="menu" size={36} color={iconColor} />
        </TouchableOpacity>
      ) : showBack ? (
        <TouchableOpacity style={styles.iconBtn} onPress={onBackPress}>
          <MaterialCommunityIcons
            name="arrow-left"
            size={28}
            color={iconColor}
          />
        </TouchableOpacity>
      ) : (
        <View style={styles.iconBtn} />
      )}
      <View style={styles.headerCenter}>
        {logoType === "image" ? (
          <Image
            source={require("../Images/Logo/pensee-name-only-white.png")}
            style={[styles.logo, { width: 180, height: 60 }]}
            resizeMode="contain"
          />
        ) : (
          <Text style={[styles.logoText, { color: textColor }]}>{title}</Text>
        )}
      </View>
      {showCart ? (
        <TouchableOpacity style={styles.iconBtn} onPress={onCartPress}>
          <MaterialCommunityIcons
            name="cart-outline"
            size={28}
            color={iconColor}
          />
        </TouchableOpacity>
      ) : (
        <View style={styles.iconBtn} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: "#6B6593",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 36,
    paddingBottom: 10,
    paddingHorizontal: 18,
  },
  iconBtn: {
    padding: 8,
    minWidth: 44,
    alignItems: "center",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 180,
    height: 60,
    alignSelf: "center",
  },
  logoText: {
    color: "#fff",
    fontSize: 26,
    fontFamily: "serif",
    fontWeight: "400",
    textAlign: "center",
    lineHeight: 30,
    letterSpacing: 1,
  },
});
