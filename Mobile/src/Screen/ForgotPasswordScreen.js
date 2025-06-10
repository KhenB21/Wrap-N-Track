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

export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");

  const handleSendCode = async () => {
    if (!email) {
      setAlertMessage("Enter your email");
      setAlertVisible(true);
      return;
    }
    setLoading(true);
    try {
      await axios.post("http://10.0.2.2:5000/api/auth/forgot-password", {
        email,
      });
      setAlertMessage("Check your email for the reset code!");
      setAlertVisible(true);
      setTimeout(() => {
        setAlertVisible(false);
        navigation.navigate("ResetPassword", { email });
      }, 1200);
    } catch (err) {
      setAlertMessage(err?.response?.data?.message || "Failed to send code");
      setAlertVisible(true);
    }
    setLoading(false);
  };

  return (
    <View style={styles.bg}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          <Text style={styles.title}>Forgot Password?</Text>
          <Text style={styles.subtitle}>
            Enter your email to receive a password reset code.
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TouchableOpacity
            style={styles.sendBtn}
            onPress={handleSendCode}
            disabled={loading}
          >
            <Text style={styles.sendBtnText}>
              {loading ? "Sending..." : "Send Code"}
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
    fontSize: 16,
    backgroundColor: "#fafaff",
    fontFamily: "serif",
  },
  sendBtn: {
    backgroundColor: "#726d8a",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 10,
  },
  sendBtnText: {
    color: "#fff",
    fontSize: 17,
    fontFamily: "serif",
    fontWeight: "bold",
    letterSpacing: 1,
  },
});
