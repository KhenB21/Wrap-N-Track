import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Header from "../Components/Header";
import { useAuth } from "../Context/AuthContext";
import { useTheme } from "../Context/ThemeContext";
import { authAPI } from "../services/api";

export default function ChangePasswordScreen() {
  const navigation = useNavigation();
  const { userType } = useAuth();
  const { darkMode } = useTheme();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const colors = {
    bg: darkMode ? "#18191A" : "#F5F4FA",
    card: darkMode ? "#242526" : "#fff",
    text: darkMode ? "#E4E6EB" : "#222",
    subText: darkMode ? "#B0B3B8" : "#6B6593",
    input: darkMode ? "#393A3B" : "#fff",
    border: darkMode ? "#3A3B3C" : "#C7C5D1",
    accent: "#6B6593",
  };

  const handleSubmit = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert("Missing Details", "Please enter your existing password, new password, and confirmation.");
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
      const response = userType === "employee"
        ? await authAPI.changeEmployeePassword(currentPassword, newPassword)
        : await authAPI.changeCustomerPassword(currentPassword, newPassword);
      if (response.success) {
        Alert.alert("Password Updated", response.message || "Password changed successfully.", [
          { text: "OK", onPress: () => navigation.goBack() },
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
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <Header showBack logoType="image" onBackPress={() => navigation.goBack()} darkMode={darkMode} title="Change Password" />
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <MaterialCommunityIcons name="lock-reset" size={36} color={colors.accent} style={styles.icon} />
        <Text style={[styles.title, { color: colors.text }]}>Change Password</Text>
        <Text style={[styles.subtitle, { color: colors.subText }]}>Enter your existing password before setting a new one.</Text>

        <Text style={[styles.label, { color: colors.text }]}>Existing Password</Text>
        <TextInput style={[styles.input, { backgroundColor: colors.input, color: colors.text, borderColor: colors.border }]} value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry />

        <Text style={[styles.label, { color: colors.text }]}>New Password</Text>
        <TextInput style={[styles.input, { backgroundColor: colors.input, color: colors.text, borderColor: colors.border }]} value={newPassword} onChangeText={setNewPassword} secureTextEntry />

        <Text style={[styles.label, { color: colors.text }]}>Confirm New Password</Text>
        <TextInput style={[styles.input, { backgroundColor: colors.input, color: colors.text, borderColor: colors.border }]} value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry />

        <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleSubmit} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Update Password</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  card: { margin: 18, borderRadius: 12, padding: 20, elevation: 2 },
  icon: { alignSelf: "center", marginBottom: 8 },
  title: { fontSize: 22, fontWeight: "bold", textAlign: "center", marginBottom: 6 },
  subtitle: { fontSize: 13, textAlign: "center", marginBottom: 18 },
  label: { fontWeight: "bold", marginTop: 12, marginBottom: 4, fontSize: 14 },
  input: { borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 14 },
  button: { marginTop: 22, backgroundColor: "#6B6593", borderRadius: 8, paddingVertical: 12, alignItems: "center" },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#fff", fontWeight: "bold", fontSize: 15 },
});
