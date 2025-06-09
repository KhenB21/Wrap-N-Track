import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from "react-native";
import axios from "axios";

export default function RegisterScreen({ navigation }) {
  const [form, setForm] = useState({
    name:"",
    email: "",
    password: "",
    confirmPassword: "",
    username: "",
    phone: "",
    address: "",
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (key, value) => setForm({ ...form, [key]: value });

  const handleRegister = async () => {
    if (
      !form.name ||
      !form.email ||
      !form.password ||
      !form.confirmPassword ||
      !form.username
    ) {
      Alert.alert("All fields are required!");
      return;
    }
    if (form.password.length < 6) {
      Alert.alert("Password must be at least 6 characters!");
      return;
    }
    if (form.password !== form.confirmPassword) {
      Alert.alert("Passwords do not match!");
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post("http://10.0.2.2:5000/api/auth/register", {
        name: form.name,
        email: form.email,
        password: form.password,
        username: form.username,
        phone: form.phone,
        address: form.address,
      });
      Alert.alert(
        "Success!",
        res.data.message ||
          "Registered. Check your email for verification code."
      );
      navigation.navigate('VerifyEmail', { email: form.email });
    } catch (err) {
      Alert.alert(
        "Error",
        err?.response?.data?.message || "Registration failed"
      );
    }
    setLoading(false);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Sign Up</Text>

      <TextInput
        style={styles.input}
        placeholder="Full Name"
        value={form.name}
        onChangeText={(v) => handleChange("name", v)}
      />
      <TextInput
        style={styles.input}
        placeholder="Email"
        keyboardType="email-address"
        value={form.email}
        onChangeText={(v) => handleChange("email", v)}
      />
      <TextInput
        style={styles.input}
        placeholder="Username"
        value={form.username}
        onChangeText={(v) => handleChange("username", v)}
      />
      <TextInput
        style={styles.input}
        placeholder="Phone"
        value={form.phone}
        onChangeText={(v) => handleChange("phone", v)}
        keyboardType="phone-pad"
      />
      <TextInput
        style={styles.input}
        placeholder="Address"
        value={form.address}
        onChangeText={(v) => handleChange("address", v)}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={form.password}
        onChangeText={(v) => handleChange("password", v)}
        secureTextEntry
      />
      <TextInput
        style={styles.input}
        placeholder="Confirm Password"
        value={form.confirmPassword}
        onChangeText={(v) => handleChange("confirmPassword", v)}
        secureTextEntry
      />
      <Button
        title={loading ? "Registering..." : "Register"}
        onPress={handleRegister}
        disabled={loading}
      />
      <TouchableOpacity onPress={() => navigation.navigate("Login")}>
        <Text style={styles.link}>Already have an account? Log in</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
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
