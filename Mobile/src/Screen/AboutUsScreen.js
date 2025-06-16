import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function AboutUsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>About Us</Text>
      <Text style={styles.content}>
        Pensée is a modern gift box studio that creates thoughtful, memorable gifting experiences for all occasions. We are dedicated to quality, creativity, and personal touch.
      </Text>
      <Text style={styles.content}>
        Contact us: hello@penseegifts.com
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f7", padding: 32, justifyContent: "center" },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#726d8a",
    fontFamily: "serif",
    marginBottom: 12,
    textAlign: "center",
  },
  content: {
    fontSize: 15,
    color: "#222",
    fontFamily: "serif",
    marginBottom: 10,
    textAlign: "center",
  },
});
