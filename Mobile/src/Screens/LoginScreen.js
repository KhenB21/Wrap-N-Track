import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Image,
  ToastAndroid,
  ActivityIndicator,
  Platform,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_URL = Platform.select({
  ios: "http://localhost:3000",
  //   android: "http://10.0.2.2:3000", // if using emulator
  android: "http://192.168.100.34:3000", // if using physical device
  default: "http://localhost:3000",
});

export default function LoginScreen({ navigation }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isLockedOut, setIsLockedOut] = useState(false);
  const [lockoutTime, setLockoutTime] = useState(null);
  const [lockoutCountdown, setLockoutCountdown] = useState(0);

  // Validation functions
  const validateUsername = (inputUsername) => {
    if (!inputUsername) return "Username is required";
    if (inputUsername.length < 3)
      return "Username must be at least 3 characters";
    return "";
  };

  const validatePassword = (inputPassword) => {
    if (!inputPassword) return "Password is required";
    if (inputPassword.length < 6)
      return "Password must be at least 6 characters";
    return "";
  };

  // Handle input changes with validation
  const handleUsernameChange = (text) => {
    setUsername(text);
    setTouched((prev) => ({ ...prev, username: true }));
    const error = validateUsername(text);
    setErrors((prev) => ({ ...prev, username: error }));
  };

  const handlePasswordChange = (text) => {
    setPassword(text);
    setTouched((prev) => ({ ...prev, password: true }));
    const error = validatePassword(text);
    setErrors((prev) => ({ ...prev, password: error }));
  };

  //for failed login timer
  useEffect(() => {
    if (failedAttempts >= 3) {
      const lockTime = Date.now() + 60000; // 1 minute lockout
      setLockoutTime(lockTime);
      setIsLockedOut(true);
      ToastAndroid.show(
        `Too many failed attempts. Please wait 60 seconds.`,
        ToastAndroid.LONG
      );
    }
  }, [failedAttempts]);

  // countdown timer
  useEffect(() => {
    if (lockoutTime) {
      const interval = setInterval(() => {
        const timeLeft = Math.max(
          0,
          Math.ceil((lockoutTime - Date.now()) / 1000)
        );
        setLockoutCountdown(timeLeft);

        if (timeLeft <= 0) {
          setIsLockedOut(false);
          setFailedAttempts(0);
          setLockoutTime(null);
          clearInterval(interval);
          ToastAndroid.show(
            "You can now try logging in again.",
            ToastAndroid.SHORT
          );
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [lockoutTime]);

  const handleLogin = async () => {
    if (isLoading || isLockedOut) return;

    const usernameError = validateUsername(username);
    const passwordError = validatePassword(password);
    setErrors({ username: usernameError, password: passwordError });
    setTouched({ username: true, password: true });

    if (usernameError || passwordError) {
      ToastAndroid.show("Please fix the input errors", ToastAndroid.SHORT);
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.post(
        `${API_URL}/api/auth/login`,
        {
          username: username.trim(),
          password: password,
        },
        {
          headers: { "Content-Type": "application/json" },
          validateStatus: () => true,
          timeout: 7000,
        }
      );

      if (response.data.success) {
        await AsyncStorage.setItem("token", response.data.token);
        await AsyncStorage.setItem("user", JSON.stringify(response.data.user));

        ToastAndroid.show("Login successful", ToastAndroid.SHORT);
        navigation.navigate("Dashboard", { pageTitle: "Dashboard" });

      } else {
        const newAttempts = failedAttempts + 1;
        setFailedAttempts(newAttempts);
        ToastAndroid.show(
          response.data.message || "Invalid username or password",
          ToastAndroid.SHORT
        );
      }
    } catch (error) {
      const newAttempts = failedAttempts + 1;
      setFailedAttempts(newAttempts);
      const message =
        error.code === "ECONNABORTED"
          ? "Login timed out. Please try again later."
          : "Login failed. Please try again.";

      ToastAndroid.show(message, ToastAndroid.SHORT);
      console.error("Login error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderAlert = () => {
    if (isLockedOut) {
      return (
        <Text style={styles.alertText}>
          Too many failed attempts. Please wait {lockoutCountdown} seconds.
        </Text>
      );
    } else if (failedAttempts > 0) {
      const remaining = 3 - failedAttempts;
      return (
        <Text style={styles.warningText}>
          {remaining} login attempt{remaining !== 1 ? "s" : ""} remaining.
        </Text>
      );
    }
    return null;
  };

  return (
    <View style={styles.container}>
      <Image
        source={require("../../../assets/Pensee logos/pensee-logo-only.png")}
        style={styles.logo}
        resizeMode="contain"
      />
      <View style={styles.loginBox}>
        <Text style={styles.loginTitle}>LOGIN</Text>
        {renderAlert()}
        <Text style={styles.label}>Username:</Text>
        <TextInput
          style={[
            styles.input,
            touched.username && errors.username && styles.inputError,
          ]}
          placeholder="Username"
          value={username}
          onChangeText={handleUsernameChange}
          onBlur={() => setTouched((prev) => ({ ...prev, username: true }))}
          autoCapitalize="none"
          editable={!isLockedOut && !isLoading}
        />
        {touched.username && errors.username && (
          <Text style={styles.errorText}>{errors.username}</Text>
        )}
        <Text style={styles.label}>Password:</Text>
        <View style={styles.passwordFieldContainer}>
          <TextInput
            style={[
              styles.inputWithIcon,
              touched.password && errors.password && styles.inputError,
            ]}
            placeholder="Password"
            value={password}
            onChangeText={handlePasswordChange}
            onBlur={() => setTouched((prev) => ({ ...prev, password: true }))}
            secureTextEntry={!showPassword}
            editable={!isLockedOut && !isLoading}
          />
          <TouchableOpacity
            style={styles.passwordIcon}
            onPress={() => setShowPassword(!showPassword)}
            disabled={isLockedOut}
          >
            <MaterialCommunityIcons
              name={showPassword ? "eye" : "eye-off"}
              size={22}
              color="#6B6593"
            />
          </TouchableOpacity>
        </View>
        {touched.password && errors.password && (
          <Text style={styles.errorText}>{errors.password}</Text>
        )}
        <View style={styles.optionsRow}>
          <TouchableOpacity
            style={styles.rememberMeRow}
            onPress={() => setRememberMe(!rememberMe)}
            disabled={isLockedOut}
          >
            <MaterialCommunityIcons
              name={rememberMe ? "checkbox-marked" : "checkbox-blank-outline"}
              size={20}
              color="#6B6593"
            />
            <Text style={styles.rememberMeText}>Remember me</Text>
          </TouchableOpacity>
          <TouchableOpacity
            disabled={isLockedOut}
            onPress={() =>
              ToastAndroid.show(
                "Forgot Password functionality not yet implemented",
                ToastAndroid.SHORT
              )
            }
          >
            <Text style={styles.forgotText}>Forgot Password?</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={[
            styles.loginButton,
            (isLoading ||
              isLockedOut ||
              username.length === 0 ||
              password.length === 0) &&
              styles.buttonDisabled, // Disable if inputs are empty for initial state
          ]}
          onPress={handleLogin}
          disabled={
            isLoading ||
            isLockedOut ||
            !!errors.username ||
            !!errors.password ||
            !username ||
            !password
          }
        >
          {isLoading ? (
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
            >
              <ActivityIndicator color="#fff" />
              <Text style={{ color: "#fff", fontSize: 14 }}>Logging in...</Text>
            </View>
          ) : (
            <Text style={styles.loginButtonText}>LOGIN</Text>
          )}
        </TouchableOpacity>
        <View style={styles.signupRow}>
          <Text style={styles.signupText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate("Signup")}>
            <Text style={styles.signupLink}>Sign Up.</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 120,
    height: 120,
    marginTop: 40,
    marginBottom: 10,
  },
  loginBox: {
    width: "90%",
    backgroundColor: "#E6E6F0",
    borderRadius: 20,
    padding: 24,
    alignItems: "stretch",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  loginTitle: {
    fontSize: 28,
    color: "#6B6593",
    fontFamily: "serif",
    alignSelf: "center",
    marginBottom: 18,
    letterSpacing: 2,
  },
  label: {
    color: "#6B6593",
    fontSize: 14,
    marginTop: 8,
    marginBottom: 2,
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#ccc",
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    marginBottom: 8,
  },
  inputError: {
    borderColor: "#B76E79",
  },
  passwordFieldContainer: {
    position: "relative",
    justifyContent: "center",
  },
  inputWithIcon: {
    backgroundColor: "#fff",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#ccc",
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    marginBottom: 8,
    paddingRight: 40,
  },
  passwordIcon: {
    position: "absolute",
    right: 10,
    top: 5,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  optionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  rememberMeRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  rememberMeText: {
    color: "#6B6593",
    fontSize: 13,
    marginLeft: 4,
  },
  forgotText: {
    color: "#6B6593",
    fontSize: 13,
    textDecorationLine: "underline",
  },
  loginButton: {
    backgroundColor: "#6B6593",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: 10,
  },
  buttonDisabled: {
    backgroundColor: "#B6B3C6",
  },
  loginButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  signupRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 4,
  },
  signupText: {
    color: "#6B6593",
    fontSize: 13,
  },
  signupLink: {
    color: "#E57373",
    fontSize: 13,
    textDecorationLine: "underline",
  },
  errorText: {
    color: "#B76E79",
    fontSize: 12,
    marginTop: -4,
    marginBottom: 8,
    marginLeft: 4,
  },
  alertText: {
    color: "#B76E79",
    fontSize: 12,
    textAlign: "center",
    marginBottom: 12,
  },
  warningText: {
    color: "#E57373",
    fontSize: 12,
    textAlign: "center",
    marginBottom: 12,
  },
});
