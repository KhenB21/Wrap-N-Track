import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
} from "react-native";

export default function DoneAlert({ visible, message, onDone }) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Image
            source={require("../../assets/PenseeLogos/pensee-logo-only.png")} // Update path if needed
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.message}>{message}</Text>
          <TouchableOpacity style={styles.button} onPress={onDone}>
            <Text style={styles.buttonText}>DONE</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.18)",
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    width: 320,
    backgroundColor: "#fff",
    borderRadius: 24,
    alignItems: "center",
    padding: 28,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  logo: {
    width: 90,
    height: 90,
    marginBottom: 18,
  },
  message: {
    fontSize: 16,
    color: "#222",
    textAlign: "center",
    marginBottom: 32,
    fontFamily: "serif",
    letterSpacing: 0.5,
  },
  button: {
    backgroundColor: "#726d8a",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 36,
    alignSelf: "flex-end",
  },
  buttonText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "serif",
    letterSpacing: 1,
  },
});
