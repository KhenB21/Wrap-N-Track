import React from "react";
import { TouchableOpacity, Text, StyleSheet, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export default function AddToCartButton({
  onPress,
  disabled,
  style,
  children,
}) {
  return (
    <TouchableOpacity
      style={[styles.button, disabled && styles.buttonDisabled, style]}
      onPress={onPress}
      disabled={disabled}
    >
      <View style={styles.row}>
        <MaterialCommunityIcons
          name="cart-outline"
          size={20}
          color="#fff"
          style={{ marginRight: 6 }}
        />
        <Text style={styles.text}>{children || "ADD TO CART"}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: "#6B6593",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    flex: 1,
    marginRight: 8,
  },
  buttonDisabled: {
    backgroundColor: "#B6B3C6",
  },
  text: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
    letterSpacing: 1,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
});
