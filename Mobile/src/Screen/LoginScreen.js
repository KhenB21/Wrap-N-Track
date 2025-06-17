import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Pressable,
} from "react-native";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import CustomAlert from "../Components/CustomAlert";
import { Feather } from "@expo/vector-icons";

export default function LoginScreen({ navigation }) {
  const [form, setForm] = useState({ username: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [remember, setRemember] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (key, value) => setForm({ ...form, [key]: value });

  const handleLogin = async () => {
    if (!form.username || !form.password) {
      setAlertMessage("Please enter both Username and Password.");
      setAlertVisible(true);
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post("http://10.0.2.2:5000/api/auth/login", {
        username: form.username,
        password: form.password,
      });
      await AsyncStorage.setItem("token", res.data.token);
      await AsyncStorage.setItem("user", JSON.stringify(res.data.user));
      navigation.reset({ index: 0, routes: [{ name: "Home" }] });
    } catch (err) {
      setAlertMessage(
        err?.response?.data?.message || "Wrong Username or Password"
      );
      setAlertVisible(true);
    }
    setLoading(false);
  };

  return (
    <View style={styles.bg}>
      <View style={styles.card}>
        <Text style={styles.title}>LOGIN</Text>

        <Text style={styles.label}>Username:</Text>
        <TextInput
          style={styles.input}
          placeholder="Username:"
          value={form.username}
          onChangeText={(v) => handleChange("username", v)}
          autoCapitalize="none"
          maxLength={25}
        />

        <Text style={styles.label}>Password:</Text>
        <View style={{ position: "relative" }}>
          <TextInput
            style={styles.input}
            placeholder="Password"
            value={form.password}
            onChangeText={(v) => handleChange("password", v)}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            maxLength={25}
          />
          <TouchableOpacity
            onPress={() => setShowPassword((prev) => !prev)}
            style={{ position: "absolute", right: 16, top: 14 }}
          >
            <Feather
              name={showPassword ? "eye-off" : "eye"}
              size={20}
              color="#726d8a"
            />
          </TouchableOpacity>
        </View>

        <View style={styles.row}>
          <Pressable
            style={styles.checkboxContainer}
            onPress={() => setRemember(!remember)}
          >
            <View style={[styles.checkbox, remember && styles.checkboxChecked]}>
              {remember && <View style={styles.checkboxDot} />}
            </View>
            <Text style={styles.rememberText}>Remember me</Text>
          </Pressable>
          <TouchableOpacity
            onPress={() => navigation.navigate("ForgotPassword")}
            style={{ marginLeft: "auto" }}
          >
            <Text style={styles.forgot}>Forgot Password?</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.loginBtn}
          onPress={handleLogin}
          disabled={loading}
        >
          <Text style={styles.loginBtnText}>
            {loading ? "Logging in..." : "LOGIN"}
          </Text>
        </TouchableOpacity>

        <View style={styles.signupRow}>
          <Text style={styles.signupText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate("Register")}>
            <Text style={styles.signupLink}>Sign Up.</Text>
          </TouchableOpacity>
        </View>
      </View>
      <CustomAlert
        visible={alertVisible}
        message={alertMessage}
        onClose={() => setAlertVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bg: {
    flex: 1,
    backgroundColor: "#f5f5f7",
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    width: "90%",
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
    marginTop: 10,
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
  showPasswordBtn: {
    alignSelf: "flex-end",
    marginBottom: 12,
  },
  showPasswordText: {
    fontSize: 13,
    color: "#726d8a",
    fontFamily: "serif",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
    marginTop: 2,
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  checkbox: {
    width: 18,
    height: 18,
    borderWidth: 1,
    borderColor: "#aaa",
    borderRadius: 4,
    marginRight: 6,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxChecked: {
    borderColor: "#726d8a",
    backgroundColor: "#edeaf6",
  },
  checkboxDot: {
    width: 10,
    height: 10,
    borderRadius: 2,
    backgroundColor: "#726d8a",
  },
  rememberText: {
    fontSize: 13,
    color: "#888",
    fontFamily: "serif",
  },
  forgot: {
    color: "#726d8a",
    fontSize: 13,
    fontFamily: "serif",
    textDecorationLine: "underline",
  },
  loginBtn: {
    backgroundColor: "#726d8a",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 10,
  },
  loginBtnText: {
    color: "#fff",
    fontSize: 17,
    fontFamily: "serif",
    fontWeight: "bold",
    letterSpacing: 1,
  },
  signupRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 8,
  },
  signupText: {
    fontSize: 14,
    color: "#222",
    fontFamily: "serif",
  },
  signupLink: {
    fontSize: 14,
    color: "#c44",
    fontFamily: "serif",
    fontWeight: "bold",
  },
});
