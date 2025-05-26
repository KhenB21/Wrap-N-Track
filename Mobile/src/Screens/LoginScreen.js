import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Image,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export default function LoginScreen({ navigation }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  return (
    <View style={styles.container}>
      <Image
        source={require("../Images/Logo/pensee-logo-only.png")}
        style={styles.logo}
        resizeMode="contain"
      />
      <View style={styles.loginBox}>
        <Text style={styles.loginTitle}>LOGIN</Text>
        <Text style={styles.label}>Username:</Text>
        <TextInput
          style={styles.input}
          placeholder="Username:"
          value={username}
          onChangeText={setUsername}
        />
        <Text style={styles.label}>Password:</Text>
        <View style={styles.passwordFieldContainer}>
          <TextInput
            style={styles.inputWithIcon}
            placeholder="Password:"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity
            style={styles.passwordIcon}
            onPress={() => setShowPassword(!showPassword)}
          >
            <MaterialCommunityIcons
              name={showPassword ? "eye" : "eye-off"}
              size={22}
              color="#6B6593"
            />
          </TouchableOpacity>
        </View>
        <View style={styles.optionsRow}>
          <TouchableOpacity
            style={styles.rememberMeRow}
            onPress={() => setRememberMe(!rememberMe)}
          >
            <MaterialCommunityIcons
              name={rememberMe ? "checkbox-marked" : "checkbox-blank-outline"}
              size={20}
              color="#6B6593"
            />
            <Text style={styles.rememberMeText}>Remember me</Text>
          </TouchableOpacity>
          <TouchableOpacity>
            <Text style={styles.forgotText}>Forgot Password?</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={styles.loginButton}
          onPress={() => navigation.navigate("Home")}
        >
          <Text style={styles.loginButtonText}>LOGIN</Text>
        </TouchableOpacity>
        <View style={styles.signupRow}>
          <Text style={styles.signupText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate("Signup")}>
            <Text style={styles.signupLink}>Sign Up.</Text>
          </TouchableOpacity>
        </View>
      </View>
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
  logo: {
    width: 120,
    height: 120,
    marginTop: 40,
    marginBottom: 10,
  },
  loginBox: {
    width: "90%",
    backgroundColor: "#E6E6F0",
    borderRadius: 20,
    padding: 24,
    alignItems: "stretch",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  loginTitle: {
    fontSize: 28,
    color: "#6B6593",
    fontFamily: "serif",
    alignSelf: "center",
    marginBottom: 18,
    letterSpacing: 2,
  },
  label: {
    color: "#6B6593",
    fontSize: 14,
    marginTop: 8,
    marginBottom: 2,
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#ccc",
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    marginBottom: 8,
  },
  passwordFieldContainer: {
    position: "relative",
    justifyContent: "center",
  },
  inputWithIcon: {
    backgroundColor: "#fff",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#ccc",
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    marginBottom: 8,
    paddingRight: 40,
  },
  passwordIcon: {
    position: "absolute",
    right: 10,
    top: 5,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  optionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  rememberMeRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  rememberMeText: {
    color: "#6B6593",
    fontSize: 13,
    marginLeft: 4,
  },
  forgotText: {
    color: "#6B6593",
    fontSize: 13,
    textDecorationLine: "underline",
  },
  loginButton: {
    backgroundColor: "#6B6593",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: 10,
  },
  loginButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  signupRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 4,
  },
  signupText: {
    color: "#6B6593",
    fontSize: 13,
  },
  signupLink: {
    color: "#E57373",
    fontSize: 13,
    textDecorationLine: "underline",
  },
});
