import React from "react";
import { View, Text, Image, StyleSheet, TouchableOpacity } from "react-native";

export default function SplashScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Image
          source={require("../Images/Logo/pensee-logo-with-name-vertical.png")}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>
      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate("Home")}>
        <Text style={styles.buttonText}>GET STARTED</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  logoContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 180,
    height: 180,
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: "300",
    color: "#6B6593",
    fontFamily: "serif",
    marginTop: 10,
  },
  subtitle: {
    fontSize: 14,
    color: "#6B6593",
    letterSpacing: 2,
    marginBottom: 40,
  },
  button: {
    backgroundColor: "#6B6593",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 40,
    marginBottom: 40,
  },
  buttonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
    letterSpacing: 1,
  },
});
