import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from "react-native";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function ChangePasswordScreen({ navigation }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = async () => {
    if (!current || !next || !confirm) return Alert.alert("Fill in all fields.");
    if (next.length < 6) return Alert.alert("New password too short.");
    if (next !== confirm) return Alert.alert("Passwords do not match.");

    setLoading(true);
    try {
      const userData = await AsyncStorage.getItem("user");
      const user = JSON.parse(userData);
      await axios.post("http://10.0.2.2:5000/api/auth/change-password", {
        userId: user.user_id,
        currentPassword: current,
        newPassword: next,
      });
      Alert.alert("Password updated!");
      navigation.goBack();
    } catch (err) {
      Alert.alert(
        "Error",
        err?.response?.data?.message || "Failed to change password."
      );
    }
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Change Password</Text>
      <TextInput
        style={styles.input}
        placeholder="Current Password"
        value={current}
        onChangeText={setCurrent}
        secureTextEntry
      />
      <TextInput
        style={styles.input}
        placeholder="New Password"
        value={next}
        onChangeText={setNext}
        secureTextEntry
      />
      <TextInput
        style={styles.input}
        placeholder="Confirm New Password"
        value={confirm}
        onChangeText={setConfirm}
        secureTextEntry
      />
      <TouchableOpacity style={styles.btn} onPress={handleChange} disabled={loading}>
        <Text style={styles.btnText}>{loading ? "Saving..." : "Save"}</Text>
      </TouchableOpacity>
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
    marginBottom: 24,
    textAlign: "center",
  },
  input: {
    width: "100%",
    padding: 12,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    marginBottom: 16,
    fontSize: 16,
    backgroundColor: "#fafaff",
    fontFamily: "serif",
  },
  btn: {
    backgroundColor: "#726d8a",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 10,
  },
  btnText: {
    color: "#fff",
    fontSize: 17,
    fontFamily: "serif",
    fontWeight: "bold",
    letterSpacing: 1,
  },
});
