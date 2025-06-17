import React from "react";
import {
  View,
  Image,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function Header({ navigation, onCartPress }) {
  return (
    <View style={styles.header}>
      <TouchableOpacity
        onPress={() => {
          if (navigation.openDrawer) {
            navigation.openDrawer();
          } else if (navigation.getParent) {
            navigation.getParent()?.openDrawer();
          }
        }}
        style={styles.iconBtn}
      >
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
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    zIndex: 100,
    height: 90,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#747497",
    borderBottomColor: "#fff",
    borderBottomWidth: 4,
    paddingHorizontal: 0,
    marginHorizontal: 0,
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
