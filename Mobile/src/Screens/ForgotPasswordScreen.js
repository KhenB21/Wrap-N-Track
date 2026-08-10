import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { authAPI } from "../services/api";

export default function ForgotPasswordScreen({ navigation }) {
  const [username, setUsername] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!username.trim() || !currentPassword || !newPassword || !confirmPassword) {
      Alert.alert("Missing Details", "Please enter username, existing password, new password, and confirmation.");
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert("Weak Password", "New password must be at least 8 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Password Mismatch", "New password and confirmation do not match.");
      return;
    }
    try {
      setLoading(true);
      const response = await authAPI.changePasswordWithCurrent(username.trim(), currentPassword, newPassword);
      if (response.success) {
        Alert.alert("Password Updated", response.message || "Password changed successfully.", [
          { text: "OK", onPress: () => navigation.navigate("Login") },
        ]);
      } else {
        Alert.alert("Unable to Update", response.message || "Please try again.");
      }
    } catch (error) {
      Alert.alert("Unable to Update", error.response?.data?.message || error.message || "Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.box}>
        <MaterialCommunityIcons name="lock-reset" size={40} color="#6B6593" style={styles.icon} />
        <Text style={styles.title}>CHANGE PASSWORD</Text>
        <Text style={styles.subtitle}>Enter your username, existing password, and new password.</Text>
        <Text style={styles.label}>Username</Text>
        <TextInput style={styles.input} value={username} onChangeText={setUsername} autoCapitalize="none" />
        <Text style={styles.label}>Existing Password</Text>
        <TextInput style={styles.input} value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry />
        <Text style={styles.label}>New Password</Text>
        <TextInput style={styles.input} value={newPassword} onChangeText={setNewPassword} secureTextEntry />
        <Text style={styles.label}>Confirm New Password</Text>
        <TextInput style={styles.input} value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry />
        <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleSubmit} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>UPDATE PASSWORD</Text>}
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate("Login")}>
          <Text style={styles.loginText}>Back to Login</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", padding: 24 },
  box: { width: "100%", maxWidth: 400, backgroundColor: "#E6E6F0", borderRadius: 20, padding: 24, elevation: 4 },
  icon: { alignSelf: "center", marginBottom: 8 },
  title: { fontSize: 24, color: "#6B6593", fontFamily: "serif", textAlign: "center", marginBottom: 8, letterSpacing: 1 },
  subtitle: { color: "#6B6593", fontSize: 13, textAlign: "center", marginBottom: 16 },
  label: { color: "#6B6593", fontSize: 14, marginTop: 8, marginBottom: 2 },
  input: { backgroundColor: "#fff", borderRadius: 6, borderWidth: 1, borderColor: "#C7C5D1", paddingHorizontal: 12, paddingVertical: 9, fontSize: 14 },
  button: { backgroundColor: "#6B6593", borderRadius: 8, paddingVertical: 12, alignItems: "center", marginTop: 18 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#fff", fontSize: 15, fontWeight: "bold", letterSpacing: 1 },
  loginText: { color: "#6B6593", textAlign: "center", marginTop: 16, textDecorationLine: "underline" },
});
