import React from "react";
import { View, Image, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function Header({ onMenuPress, onCartPress }) {
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={onMenuPress} style={styles.iconBtn}>
        <Ionicons name="menu" size={38} color="#fff" />
      </TouchableOpacity>
      <View style={styles.logoWrap}>
        <Image
          source={require("../../assets/PenseeLogos/pensee-name-only-white.png")}
          style={styles.logoImg}
          resizeMode="contain"
        />
      </View>
      <TouchableOpacity onPress={onCartPress} style={styles.iconBtn}>
        <Ionicons name="bag-outline" size={36} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    position: "absolute",      // <-- makes it overlay the top
    left: 0,
    right: 0,
    top: 0,
    zIndex: 100,
    height: 90,                // adjust for status bar
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#747497",
    borderBottomColor: "#fff",
    borderBottomWidth: 4,
    paddingHorizontal: 0,      // no padding on the sides!
    marginHorizontal: 0,       // no margin
  },
  iconBtn: {
    width: 54,
    alignItems: "center",
    justifyContent: "center",
  },
  logoWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  logoImg: {
    height: 48,
    width: 170,
  },
});
