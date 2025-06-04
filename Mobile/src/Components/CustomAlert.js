import React from "react";
import { Modal, View, Text, StyleSheet, Image, TouchableOpacity, Dimensions } from "react-native";

const { width } = Dimensions.get("window");

export default function CustomAlert({
  visible,
  title = "Pensee",
  message,
  onClose,
  buttonText = "OK",
  logo = require("../Images/Logo/pensee-logo-only.png"),
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Image source={logo} style={styles.logo} resizeMode="contain" />
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <TouchableOpacity style={styles.button} onPress={onClose}>
            <Text style={styles.buttonText}>{buttonText}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    width: width * 0.8,
    backgroundColor: "#fff",
    borderRadius: 18,
    alignItems: "center",
    padding: 24,
    elevation: 10,
  },
  logo: {
    width: 64,
    height: 64,
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#6C4AB6",
    textAlign: "center",
  },
  message: {
    fontSize: 16,
    color: "#333",
    marginBottom: 20,
    textAlign: "center",
  },
  button: {
    backgroundColor: "#6C4AB6",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 32,
    marginTop: 8,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});