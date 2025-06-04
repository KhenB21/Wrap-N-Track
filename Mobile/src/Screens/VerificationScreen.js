import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function VerificationScreen({ route, navigation }) {
  const { email } = route.params;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Verify Your Email</Text>
      <Text style={styles.subtitle}>A verification link was sent to:</Text>
      <Text style={styles.email}>{email}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#6B6593",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: "#444",
    marginBottom: 5,
  },
  email: {
    fontSize: 16,
    color: "#B76E79",
  },
});
