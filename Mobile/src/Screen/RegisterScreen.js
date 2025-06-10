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
import CustomAlert from "../Components/CustomAlert";

export default function RegisterScreen({ navigation }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    username: "",
    phone: "",
    address: "",
  });
  const [loading, setLoading] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");

  const handleChange = (key, value) => setForm({ ...form, [key]: value });

  const handleRegister = async () => {
    if (
      !form.name ||
      !form.email ||
      !form.password ||
      !form.confirmPassword ||
      !form.username
    ) {
      setAlertMessage("All fields are required!");
      setAlertVisible(true);
      return;
    }
    if (form.password.length < 6) {
      setAlertMessage("Password must be at least 6 characters!");
      setAlertVisible(true);
      return;
    }
    if (form.password !== form.confirmPassword) {
      setAlertMessage("Passwords do not match!");
      setAlertVisible(true);
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

      navigation.navigate("VerifyEmail", { email: form.email });
    } catch (err) {
      setAlertMessage(err?.response?.data?.message || "Registration failed");
      setAlertVisible(true);
    }
    setLoading(false);
  };

  return (
    <View style={styles.bg}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          <Text style={styles.title}>Sign Up</Text>

          <Text style={styles.label}>Full Name:</Text>
          <TextInput
            style={styles.input}
            placeholder="Full Name"
            value={form.name}
            onChangeText={(v) => handleChange("name", v)}
          />
          <Text style={styles.label}>Email:</Text>
          <TextInput
            style={styles.input}
            placeholder="Email"
            keyboardType="email-address"
            value={form.email}
            onChangeText={(v) => handleChange("email", v)}
          />
          <Text style={styles.label}>Username:</Text>
          <TextInput
            style={styles.input}
            placeholder="Username"
            value={form.username}
            onChangeText={(v) => handleChange("username", v)}
          />
          <Text style={styles.label}>Phone:</Text>
          <TextInput
            style={styles.input}
            placeholder="Phone"
            value={form.phone}
            onChangeText={(v) => handleChange("phone", v)}
            keyboardType="phone-pad"
          />
          <Text style={styles.label}>Address:</Text>
          <TextInput
            style={styles.input}
            placeholder="Address"
            value={form.address}
            onChangeText={(v) => handleChange("address", v)}
          />
          <Text style={styles.label}>Password:</Text>
          <TextInput
            style={styles.input}
            placeholder="Password"
            value={form.password}
            onChangeText={(v) => handleChange("password", v)}
            secureTextEntry
          />
          <Text style={styles.label}>Confirm Password:</Text>
          <TextInput
            style={styles.input}
            placeholder="Confirm Password"
            value={form.confirmPassword}
            onChangeText={(v) => handleChange("confirmPassword", v)}
            secureTextEntry
          />

          <TouchableOpacity
            style={styles.registerBtn}
            onPress={handleRegister}
            disabled={loading}
          >
            <Text style={styles.registerBtnText}>
              {loading ? "Registering..." : "Register"}
            </Text>
          </TouchableOpacity>

          <View style={styles.loginRow}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate("Login")}>
              <Text style={styles.loginLink}>Log in</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
      <CustomAlert
        visible={alertVisible}
        message={alertMessage}
        onClose={() => setAlertVisible(false)}
      />
    </View>
  );
}

// Styles (replace your current styles with these)
const styles = StyleSheet.create({
  bg: {
    flex: 1,
    backgroundColor: "#f5f5f7",
  },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 32,
  },
  card: {
    width: "92%",
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 28,
    alignItems: "stretch",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  title: {
    fontSize: 32,
    fontFamily: "serif",
    fontWeight: "bold",
    color: "#726d8a",
    textAlign: "center",
    marginBottom: 18,
    letterSpacing: 1,
  },
  label: {
    fontSize: 15,
    fontWeight: "bold",
    marginBottom: 4,
    marginTop: 8,
    color: "#222",
    fontFamily: "serif",
  },
  input: {
    width: "100%",
    padding: 12,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    marginBottom: 8,
    fontSize: 15,
    backgroundColor: "#fafaff",
    fontFamily: "serif",
  },
  registerBtn: {
    backgroundColor: "#726d8a",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 10,
  },
  registerBtnText: {
    color: "#fff",
    fontSize: 17,
    fontFamily: "serif",
    fontWeight: "bold",
    letterSpacing: 1,
  },
  loginRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 8,
  },
  loginText: {
    fontSize: 14,
    color: "#222",
    fontFamily: "serif",
  },
  loginLink: {
    fontSize: 14,
    color: "#1976d2",
    fontFamily: "serif",
    fontWeight: "bold",
  },
});
