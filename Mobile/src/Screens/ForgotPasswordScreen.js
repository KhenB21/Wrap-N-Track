import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { authAPI } from "../services/api";

// Two ways in:
//  • "Forgot password" — same flow and endpoints as the Website ForgotPassword + ResetPassword
//    pages: forgot-password -> verify-reset-code -> reset-password (email OTP).
//  • "I know my password" — username + current password, for customers who remember it.
const MODE_FORGOT = "forgot";
const MODE_CURRENT = "current";

const STEP_EMAIL = "email";
const STEP_CODE = "code";
const STEP_PASSWORD = "password";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const serverMessage = (error, fallback) => error.response?.data?.message || fallback;

export default function ForgotPasswordScreen({ navigation }) {
  const [mode, setMode] = useState(MODE_FORGOT);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  // Forgot (OTP) flow
  const [step, setStep] = useState(STEP_EMAIL);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  // Shared by both flows
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Current-password flow
  const [username, setUsername] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");

  useEffect(() => {
    if (resendCooldown <= 0) return undefined;
    const timer = setTimeout(() => setResendCooldown((prev) => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const switchMode = (next) => {
    if (next === mode || loading) return;
    setMode(next);
    setError("");
    setInfo("");
    setNewPassword("");
    setConfirmPassword("");
  };

  // Returns an error message, or "" when the new password is acceptable.
  const validateNewPassword = () => {
    if (!newPassword || !confirmPassword) return "Please enter and confirm your new password.";
    if (newPassword.length < 8) return "New password must be at least 8 characters long.";
    if (newPassword !== confirmPassword) return "New password and confirmation do not match.";
    return "";
  };

  const finishWithSuccess = (message) => {
    Alert.alert("Password Updated", message, [{ text: "OK", onPress: () => navigation.navigate("Login") }]);
  };

  /* ── Forgot password (OTP) ─────────────────────────────────────────── */
  const requestCode = async () => {
    setError("");
    setInfo("");
    const trimmed = email.trim();
    if (!trimmed) {
      setError("Email is required.");
      return;
    }
    if (!EMAIL_PATTERN.test(trimmed)) {
      setError("Please enter a valid email address.");
      return;
    }
    try {
      setLoading(true);
      const response = await authAPI.forgotPassword(trimmed);
      setInfo(response?.message || "Password reset instructions have been sent to your email.");
      setCode("");
      setStep(STEP_CODE);
      setResendCooldown(30);
    } catch (err) {
      setError(serverMessage(err, "Unable to send the code. Please try again later."));
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    setError("");
    if (code.length !== 6) {
      setError("Please enter the 6-digit code.");
      return;
    }
    try {
      setLoading(true);
      await authAPI.verifyResetCode(email.trim(), code);
      setInfo("");
      setStep(STEP_PASSWORD);
    } catch (err) {
      setError(serverMessage(err, "Invalid code."));
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async () => {
    setError("");
    const problem = validateNewPassword();
    if (problem) {
      setError(problem);
      return;
    }
    try {
      setLoading(true);
      const response = await authAPI.resetPassword(email.trim(), code, newPassword);
      finishWithSuccess(response?.message || "Password reset successful.");
    } catch (err) {
      const message = serverMessage(err, "Unable to reset password. Please try again.");
      setError(message);
      // An expired/invalid code can't be fixed on this step — send the user back to request a new one.
      if (err.response?.status === 400 && /code/i.test(message)) {
        setStep(STEP_CODE);
      }
    } finally {
      setLoading(false);
    }
  };

  /* ── I know my current password ────────────────────────────────────── */
  const changeWithCurrent = async () => {
    setError("");
    if (!username.trim() || !currentPassword) {
      setError("Please enter your username and existing password.");
      return;
    }
    const problem = validateNewPassword();
    if (problem) {
      setError(problem);
      return;
    }
    try {
      setLoading(true);
      const response = await authAPI.changePasswordWithCurrent(username.trim(), currentPassword, newPassword);
      if (response.success) {
        finishWithSuccess(response.message || "Password changed successfully.");
      } else {
        setError(response.message || "Please try again.");
      }
    } catch (err) {
      setError(serverMessage(err, err.message || "Please try again."));
    } finally {
      setLoading(false);
    }
  };

  const renderNewPasswordFields = () => (
    <>
      <Text style={styles.label}>New Password</Text>
      <TextInput
        style={styles.input}
        value={newPassword}
        onChangeText={(v) => {
          setNewPassword(v);
          setError("");
        }}
        secureTextEntry
      />
      <Text style={styles.label}>Confirm New Password</Text>
      <TextInput
        style={styles.input}
        value={confirmPassword}
        onChangeText={(v) => {
          setConfirmPassword(v);
          setError("");
        }}
        secureTextEntry
      />
    </>
  );

  let title;
  let subtitle;
  if (mode === MODE_CURRENT) {
    title = "CHANGE PASSWORD";
    subtitle = "Enter your username, existing password, and new password.";
  } else if (step === STEP_CODE) {
    title = "VERIFY YOUR EMAIL";
    subtitle = `We've sent a 6-digit verification code to ${email.trim()}. Enter it below to continue.`;
  } else if (step === STEP_PASSWORD) {
    title = "RESET PASSWORD";
    subtitle = "Create your new password.";
  } else {
    title = "FORGOT PASSWORD";
    subtitle = "Enter the email address on your account and we'll send you a verification code.";
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.box}>
        <MaterialCommunityIcons name="lock-reset" size={40} color="#6B6593" style={styles.icon} />

        <View style={styles.modeToggle}>
          {[
            { key: MODE_FORGOT, label: "Forgot password" },
            { key: MODE_CURRENT, label: "I know my password" },
          ].map((option) => {
            const active = mode === option.key;
            return (
              <TouchableOpacity
                key={option.key}
                style={[styles.modeButton, active && styles.modeButtonActive]}
                onPress={() => switchMode(option.key)}
                disabled={loading}
              >
                <Text style={[styles.modeText, active && styles.modeTextActive]}>{option.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
        {!!error && <Text style={styles.errorText}>{error}</Text>}
        {!!info && <Text style={styles.infoText}>{info}</Text>}

        {mode === MODE_CURRENT && (
          <>
            <Text style={styles.label}>Username</Text>
            <TextInput
              style={styles.input}
              value={username}
              onChangeText={(v) => {
                setUsername(v);
                setError("");
              }}
              autoCapitalize="none"
            />
            <Text style={styles.label}>Existing Password</Text>
            <TextInput
              style={styles.input}
              value={currentPassword}
              onChangeText={(v) => {
                setCurrentPassword(v);
                setError("");
              }}
              secureTextEntry
            />
            {renderNewPasswordFields()}
            <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={changeWithCurrent} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>UPDATE PASSWORD</Text>}
            </TouchableOpacity>
          </>
        )}

        {mode === MODE_FORGOT && step === STEP_EMAIL && (
          <>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={(v) => {
                setEmail(v);
                setError("");
              }}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="Enter your email"
            />
            <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={requestCode} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>SEND CODE</Text>}
            </TouchableOpacity>
          </>
        )}

        {mode === MODE_FORGOT && step === STEP_CODE && (
          <>
            <Text style={styles.label}>Verification Code</Text>
            <TextInput
              style={[styles.input, styles.codeInput]}
              value={code}
              onChangeText={(v) => {
                setCode(v.replace(/[^0-9]/g, ""));
                setError("");
              }}
              keyboardType="number-pad"
              maxLength={6}
              placeholder="000000"
            />
            <TouchableOpacity
              style={[styles.button, (loading || code.length !== 6) && styles.buttonDisabled]}
              onPress={verifyCode}
              disabled={loading || code.length !== 6}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>VERIFY CODE</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={requestCode} disabled={resendCooldown > 0 || loading}>
              <Text style={[styles.linkText, (resendCooldown > 0 || loading) && styles.linkDisabled]}>
                {resendCooldown > 0 ? `Resend Code (${resendCooldown}s)` : "Resend Code"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setStep(STEP_EMAIL);
                setError("");
                setInfo("");
              }}
              disabled={loading}
            >
              <Text style={styles.linkText}>Use a different email</Text>
            </TouchableOpacity>
          </>
        )}

        {mode === MODE_FORGOT && step === STEP_PASSWORD && (
          <>
            {renderNewPasswordFields()}
            <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={resetPassword} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>UPDATE PASSWORD</Text>}
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity onPress={() => navigation.navigate("Login")}>
          <Text style={styles.linkText}>Back to Login</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", padding: 24 },
  box: { width: "100%", maxWidth: 400, backgroundColor: "#E6E6F0", borderRadius: 20, padding: 24, elevation: 4 },
  icon: { alignSelf: "center", marginBottom: 8 },
  modeToggle: { flexDirection: "row", backgroundColor: "#fff", borderRadius: 10, padding: 4, marginBottom: 14 },
  modeButton: { flex: 1, paddingVertical: 9, borderRadius: 8, alignItems: "center" },
  modeButtonActive: { backgroundColor: "#6B6593" },
  modeText: { color: "#6B6593", fontSize: 13, fontWeight: "600" },
  modeTextActive: { color: "#fff" },
  title: { fontSize: 24, color: "#6B6593", fontFamily: "serif", textAlign: "center", marginBottom: 8, letterSpacing: 1 },
  subtitle: { color: "#6B6593", fontSize: 13, textAlign: "center", marginBottom: 16 },
  label: { color: "#6B6593", fontSize: 14, marginTop: 8, marginBottom: 2 },
  input: { backgroundColor: "#fff", borderRadius: 6, borderWidth: 1, borderColor: "#C7C5D1", paddingHorizontal: 12, paddingVertical: 9, fontSize: 14 },
  codeInput: { textAlign: "center", letterSpacing: 4, fontSize: 18 },
  button: { backgroundColor: "#6B6593", borderRadius: 8, paddingVertical: 12, alignItems: "center", marginTop: 18 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#fff", fontSize: 15, fontWeight: "bold", letterSpacing: 1 },
  linkText: { color: "#6B6593", textAlign: "center", marginTop: 16, textDecorationLine: "underline" },
  linkDisabled: { opacity: 0.5 },
  errorText: { color: "#D9534F", fontSize: 13, textAlign: "center", marginBottom: 8 },
  infoText: { color: "#2E7D32", fontSize: 13, textAlign: "center", marginBottom: 8 },
});
