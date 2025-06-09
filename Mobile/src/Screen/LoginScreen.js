import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function LoginScreen({ navigation }) {
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);

  // Handle input changes
  const handleChange = (key, value) => setForm({ ...form, [key]: value });

  // Login function
  const handleLogin = async () => {
    if (!form.email || !form.password) {
      Alert.alert("Please enter both email and password.");
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post("http://10.0.2.2:5000/api/auth/login", {
        email: form.email,
        password: form.password,
      });
      // Save JWT token for session
      await AsyncStorage.setItem("token", res.data.token);
      await AsyncStorage.setItem("user", JSON.stringify(res.data.user));

      Alert.alert("Login Success!", `Welcome, ${res.data.user.username}!`);

      // Reset navigation to Home (user can't go back to login)
      navigation.reset({ index: 0, routes: [{ name: "Home" }] });
    } catch (err) {
      // Handle error from backend or network
      Alert.alert(
        "Login Failed",
        err?.response?.data?.message || "Wrong email or password"
      );
    }
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Log In</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        keyboardType="email-address"
        value={form.email}
        onChangeText={(v) => handleChange("email", v)}
        autoCapitalize="none"
      />

      <TextInput
        style={styles.input}
        placeholder="Password"
        value={form.password}
        onChangeText={(v) => handleChange("password", v)}
        secureTextEntry
        autoCapitalize="none"
      />

      <Button
        title={loading ? "Logging in..." : "Log In"}
        onPress={handleLogin}
        disabled={loading}
      />

      {/* Forgot Password */}
      <TouchableOpacity onPress={() => navigation.navigate("ForgotPassword")}>
        <Text style={styles.link}>Forgot Password?</Text>
      </TouchableOpacity>

      {/* Register */}
      <TouchableOpacity onPress={() => navigation.navigate("Register")}>
        <Text style={styles.link}>Don’t have an account? Sign up</Text>
      </TouchableOpacity>
    </View>
  );
}

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "#fff",
  },
  title: { fontSize: 28, fontWeight: "bold", marginBottom: 24 },
  input: {
    width: "100%",
    padding: 10,
    borderWidth: 1,
    borderColor: "#ccc",
    marginBottom: 12,
    borderRadius: 8,
  },
  link: { color: "blue", marginTop: 14 },
});
