import React, { useState } from "react";
import { View, Text, TextInput, Button, Alert, StyleSheet } from "react-native";
import axios from "axios";

export default function VerifyEmailScreen({ route, navigation }) {
  const { email } = route.params; // passed from RegisterScreen
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    if (!otp) return Alert.alert("Enter the verification code");
    setLoading(true);
    try {
      const res = await axios.post(
        "http://10.0.2.2:5000/api/auth/verify-email",
        { email, otp }
      );
      Alert.alert("Success", res.data.message || "Email verified!");
      navigation.navigate("Login");
    } catch (err) {
      Alert.alert(
        "Verification Failed",
        err?.response?.data?.message || "Invalid or expired code"
      );
    }
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Verify your email</Text>
      <Text style={styles.subtitle}>Enter the code sent to {email}</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter code"
        value={otp}
        onChangeText={setOtp}
      />
      <Button
        title={loading ? "Verifying..." : "Verify"}
        onPress={handleVerify}
        disabled={loading}
      />
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 16 },
  subtitle: { marginBottom: 16 },
  input: {
    width: "100%",
    padding: 10,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    marginBottom: 16,
  },
});
