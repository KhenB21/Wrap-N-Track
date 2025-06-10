import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import axios from "axios";
import CustomAlert from "../Components/CustomAlert";

export default function VerifyEmailScreen({ route, navigation }) {
  const { email } = route.params;
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");

  const handleVerify = async () => {
    if (!otp) {
      setAlertMessage("Enter the verification code");
      setAlertVisible(true);
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post(
        "http://10.0.2.2:5000/api/auth/verify-email",
        { email, otp }
      );
      setAlertMessage(res.data.message || "Email verified!");
      setAlertVisible(true);
      setTimeout(() => {
        setAlertVisible(false);
        navigation.navigate("Login");
      }, 1200); // short delay for user to see success
    } catch (err) {
      setAlertMessage(
        err?.response?.data?.message || "Invalid or expired code"
      );
      setAlertVisible(true);
    }
    setLoading(false);
  };

  return (
    <View style={styles.bg}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          <Text style={styles.title}>Verify Email</Text>
          <Text style={styles.subtitle}>
            Enter the code sent to{" "}
            <Text style={{ color: "#726d8a", fontWeight: "bold" }}>
              {email}
            </Text>
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Enter code"
            value={otp}
            onChangeText={(v) => setOtp(v.toUpperCase())} 
            keyboardType="default"
            autoCapitalize="characters"
            maxLength={8}
          />
          <TouchableOpacity
            style={styles.verifyBtn}
            onPress={handleVerify}
            disabled={loading}
          >
            <Text style={styles.verifyBtnText}>
              {loading ? "Verifying..." : "Verify"}
            </Text>
          </TouchableOpacity>
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
  subtitle: {
    fontSize: 15,
    color: "#222",
    textAlign: "center",
    marginBottom: 18,
    fontFamily: "serif",
  },
  input: {
    width: "100%",
    padding: 12,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    marginBottom: 18,
    fontSize: 18,
    backgroundColor: "#fafaff",
    fontFamily: "serif",
    textAlign: "center",
    letterSpacing: 6,
  },
  verifyBtn: {
    backgroundColor: "#726d8a",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 10,
  },
  verifyBtnText: {
    color: "#fff",
    fontSize: 17,
    fontFamily: "serif",
    fontWeight: "bold",
    letterSpacing: 1,
  },
});
