import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAuth } from "../Context/AuthContext";

export default function LoginScreen({ navigation }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [formCleared, setFormCleared] = useState(false);
  
  const { login, loading, error, clearError, isAuthenticated } = useAuth();

  // Clear form fields when component mounts (after logout)
  useEffect(() => {
    // Clear all form fields
    setUsername("");
    setPassword("");
    setShowPassword(false);
    setRememberMe(false);
    // Clear any previous errors
    clearError();
    // Set form cleared state
    setFormCleared(true);
    
    // Auto-hide cleared message after 3 seconds
    const timer = setTimeout(() => {
      setFormCleared(false);
    }, 3000);
    
    return () => clearTimeout(timer);
  }, []); // Empty dependency array - runs once when component mounts

  // Note: Removed useFocusEffect to prevent clearing on every keystroke
  // Form will only clear when component mounts (after logout navigation)

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert("Error", "Please enter both username and password");
      return;
    }

    clearError();
    
    try {
      const result = await login(username.trim(), password);
      
      if (result.success) {
        // Navigate based on user type
        if (result.userType === 'employee') {
          // For employees, navigate to Dashboard
          navigation.navigate("Dashboard");
        } else if (result.userType === 'customer') {
          // For customers, navigate to Home
          navigation.navigate("Home");
        }
      } else {
        Alert.alert("Login Failed", result.message || "Invalid credentials");
      }
    } catch (error) {
      Alert.alert("Error", "Login failed. Please try again.");
    }
  };

  return (
    <View style={styles.container}>
      <Image
        source={require("../Images/Logo/pensee-logo-only.png")}
        style={styles.logo}
        resizeMode="contain"
      />
      <View style={styles.loginBox}>
        <Text style={styles.loginTitle}>LOGIN</Text>
        <Text style={styles.label}>Username:</Text>
        <TextInput
          style={styles.input}
          placeholder="Username:"
          value={username}
          onChangeText={(text) => {
            setUsername(text);
            setFormCleared(false); // Hide cleared message when user starts typing
          }}
        />
        <Text style={styles.label}>Password:</Text>
        <View style={styles.passwordFieldContainer}>
          <TextInput
            style={styles.inputWithIcon}
            placeholder="Password:"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              setFormCleared(false); // Hide cleared message when user starts typing
            }}
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity
            style={styles.passwordIcon}
            onPress={() => setShowPassword(!showPassword)}
          >
            <MaterialCommunityIcons
              name={showPassword ? "eye" : "eye-off"}
              size={22}
              color="#6B6593"
            />
          </TouchableOpacity>
        </View>
        <View style={styles.optionsRow}>
          <TouchableOpacity
            style={styles.rememberMeRow}
            onPress={() => setRememberMe(!rememberMe)}
          >
            <MaterialCommunityIcons
              name={rememberMe ? "checkbox-marked" : "checkbox-blank-outline"}
              size={20}
              color="#6B6593"
            />
            <Text style={styles.rememberMeText}>Remember me</Text>
          </TouchableOpacity>
          <TouchableOpacity>
            <Text style={styles.forgotText}>Forgot Password?</Text>
          </TouchableOpacity>
        </View>
        {error && (
          <Text style={styles.errorText}>{error}</Text>
        )}
        
        {formCleared && !error && (
          <Text style={styles.clearedText}>Form cleared - ready for new login</Text>
        )}
        
        <TouchableOpacity
          style={[styles.loginButton, loading && styles.loginButtonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
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
    color: "#E57373",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 10,
    paddingHorizontal: 10,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  clearedText: {
    color: "#4CAF50",
    fontSize: 12,
    textAlign: "center",
    marginBottom: 10,
    paddingHorizontal: 10,
    fontStyle: "italic",
  },
});
