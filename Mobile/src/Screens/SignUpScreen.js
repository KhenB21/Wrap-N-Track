import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ToastAndroid,
  ActivityIndicator,
} from "react-native";
import axios from "axios";
import config from "../../config";

const regions = ["Region 1", "Region 2", "Region 3"];
const provinces = ["Province 1", "Province 2", "Province 3"];
const cities = ["City 1", "City 2", "City 3"];
const barangays = ["Barangay 1", "Barangay 2", "Barangay 3"];

function debounce(func, delay) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
}

export default function SignUpScreen({ navigation }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    address: "",
    region: "",
    province: "",
    city: "",
    barangay: "",
    postal: "",
  });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const debouncedCheckRef = useRef(null);
  const [emailError, setEmailError] = useState("");

  const validate = async (field, value) => {
    switch (field) {
      case "firstName":
      case "lastName":
        if (!value.trim()) return "Required";
        if (!/^[A-Za-z\s]+$/.test(value.trim()))
          return "Only letters and spaces allowed";
        return "";
      case "username":
        if (!value.trim()) return "Required";
        if (value.length < 3) return "Username must be at least 3 characters";
        if (!/^[A-Za-z0-9_]+$/.test(value)) return "Only letters, numbers, and underscores allowed";
        if (isCheckingUsername) return "Checking availability...";
        try {
          setIsCheckingUsername(true);
          const response = await axios.get(`${config.API_URL}/api/auth/check-username`, {
            params: { username: value.trim() }
          });
          if (response.data.exists) return "Username already taken";
          return "";
        } catch (error) {
          return "Error checking username";
        } finally {
          setIsCheckingUsername(false);
        }
      case "password":
        if (!value) return "Required";
        if (value.length < 8) return "Password must be at least 8 characters";
        if (!/(?=.*[A-Z])/.test(value)) return "Must contain uppercase letter";
        if (!/(?=.*[a-z])/.test(value)) return "Must contain lowercase letter";
        if (!/(?=.*\d)/.test(value)) return "Must contain number";
        if (!/(?=.*[!@#$%^&*])/.test(value))
          return "Must contain special character";
        return "";
      case "confirmPassword":
        if (!value) return "Required";
        if (value !== form.password) return "Passwords do not match";
        return "";
      case "address":
        if (!value.trim()) return "Required";
        return "";
      case "region":
      case "province":
      case "city":
      case "barangay":
        if (!value) return "Required";
        return "";
      case "postal":
        if (!value) return "Required";
        if (!/^\d{4,6}$/.test(value)) return "Invalid postal code";
        return "";
      default:
        return "";
    }
  };

  useEffect(() => {
    debouncedCheckRef.current = debounce(async (email) => {
      if (!email) return;
  
      const trimmedEmail = email.trim().toLowerCase();
  
      try {
        setIsCheckingEmail(true);
  
        const res = await axios.get(`${config.API_URL}/api/auth/check-email`, {
          params: { email: trimmedEmail },
        });
  
        if (res.data.exists) {
          setErrors((prev) => ({
            ...prev,
            email: "Email is already registered",
          }));
        } else {
          setErrors((prev) => ({ ...prev, email: "" }));
        }
      } catch (err) {
        console.error("Email check failed:", err);
        setErrors((prev) => ({ ...prev, email: "Could not check email" }));
      } finally {
        setIsCheckingEmail(false);
      }
    }, 500);
  
    return () => {
      if (debouncedCheckRef.current?.cancel) {
        debouncedCheckRef.current.cancel();
      }
    };
  }, []);

  const handleChange = (field, value) => {
    const newValue = field === "email" ? value.trimStart() : value;
  
    setForm((prev) => ({ ...prev, [field]: newValue }));
  
    if (!touched[field]) setTouched((prev) => ({ ...prev, [field]: true }));
  
    if (field === "password" || field === "confirmPassword") {
      (async () => {
        const validationError = await validate(field, newValue);
        setErrors((prev) => ({ ...prev, [field]: validationError }));
      })();
      return;
    }
  
    if (field === "email") {
      const trimmedEmail = newValue.trim().toLowerCase();
      const regex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
  
      if (!regex.test(trimmedEmail)) {
        setErrors((prev) => ({ ...prev, email: "Invalid email format" }));
        return;
      } else {
        setErrors((prev) => ({ ...prev, email: "" }));
        debouncedCheckRef.current(trimmedEmail);
      }
    }

    if (field === "username") {
      const trimmedUsername = newValue.trim();
      const regex = /^[A-Za-z0-9_]+$/;
  
      if (!regex.test(trimmedUsername)) {
        setErrors((prev) => ({ ...prev, username: "Only letters, numbers, and underscores allowed" }));
        return;
      } else {
        setErrors((prev) => ({ ...prev, username: "" }));
        (async () => {
          const validationError = await validate(field, trimmedUsername);
          setErrors((prev) => ({ ...prev, [field]: validationError }));
        })();
      }
    }
  
    clearTimeout(window.validationTimer);
    window.validationTimer = setTimeout(async () => {
      const validationError = await validate(field, newValue);
      setErrors((prev) => ({ ...prev, [field]: validationError }));
    }, 600);
  };

  const isStepValid = () => {
    if (step === 1) {
      return [
        "firstName",
        "lastName",
        "username",
        "email",
        "password",
        "confirmPassword",
      ].every(
        (field) => touched[field] && !errors[field] && form[field].length > 0
      );
    } else {
      return [
        "address",
        "region",
        "province",
        "city",
        "barangay",
        "postal",
      ].every(
        (field) => touched[field] && !errors[field] && form[field].length > 0
      );
    }
  };

  const handleSignUp = async () => {
    if (!isStepValid()) {
      ToastAndroid.show("Please fix all validation errors", ToastAndroid.SHORT);
      return;
    }
  
    setIsLoading(true);
  
    try {
      const payload = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        username: form.username.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        address: form.address.trim(),
        region: form.region.trim(),
        province: form.province.trim(),
        city: form.city.trim(),
        barangay: form.barangay.trim(),
        postal: form.postal.trim(),
      };
  
      const response = await axios.post(
        `${config.API_URL}/api/auth/register`,
        payload,
        {
          headers: { "Content-Type": "application/json" },
          validateStatus: () => true,
        }
      );
  
      if (response.data.success) {
        ToastAndroid.show(
          "Registration successful! Please verify your email.",
          ToastAndroid.LONG
        );
  
        navigation.reset({
          index: 0,
          routes: [{ name: "Verification", params: { email: payload.email } }],
        });
      } else {
        ToastAndroid.show(
          response.data.message || "Registration failed. Please try again.",
          ToastAndroid.LONG
        );
      }
    } catch (error) {
      ToastAndroid.show(
        error.response?.data?.message || "Registration failed. Please try again.",
        ToastAndroid.LONG
      );
    } finally {
      setIsLoading(false);
    }
  };
  

  const renderInput = (label, field, props = {}) => (
    <View style={{ marginBottom: 12 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[
          styles.input,
          touched[field] && errors[field] && styles.inputError,
        ]}
        value={form[field]}
        onChangeText={(v) => handleChange(field, v)}
        onBlur={() => setTouched((prev) => ({ ...prev, [field]: true }))}
        {...props}
      />
      {touched[field] && errors[field] ? (
        <Text style={styles.error}>{errors[field]}</Text>
      ) : null}
    </View>
  );

  const renderPicker = (label, field, options) => (
    <View style={{ marginBottom: 12 }}>
      <Text style={styles.label}>{label}</Text>
      <View
        style={[
          styles.pickerWrapper,
          touched[field] && errors[field] && styles.inputError,
        ]}
      >
        <TextInput
          style={styles.input}
          value={form[field]}
          placeholder={label}
          onFocus={() => {}}
          onChangeText={(v) => handleChange(field, v)}
        />
      </View>
      {touched[field] && errors[field] ? (
        <Text style={styles.error}>{errors[field]}</Text>
      ) : null}
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#fff" }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.signupBox}>
          <View style={styles.logoContainer}>
            {/* You can add your logo here if needed */}
          </View>
          <Text style={styles.title}>SIGN UP</Text>
          {step === 1 ? (
            <View style={{ width: "100%" }}>
              {renderInput("First Name:", "firstName", {
                placeholder: "First name",
              })}
              {renderInput("Last Name:", "lastName", {
                placeholder: "Last name",
              })}
              {renderInput("Username:", "username", {
                placeholder: "Username",
                autoCapitalize: "none",
              })}
              {renderInput("Email:", "email", {
                placeholder: "Email",
                keyboardType: "email-address",
                autoCapitalize: "none",
              })}
              {renderInput("Password:", "password", {
                placeholder: "Password",
                secureTextEntry: !showPassword,
              })}
              {renderInput("Re-Enter Password:", "confirmPassword", {
                placeholder: "Re-Enter Password",
                secureTextEntry: !showConfirmPassword,
              })}
              <TouchableOpacity
                style={[styles.button, !isStepValid() && styles.buttonDisabled]}
                disabled={!isStepValid()}
                onPress={() => setStep(2)}
              >
                <Text style={styles.buttonText}>Next</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ width: "100%" }}>
              {renderInput("House No. and Street", "address", {
                placeholder: "House No. and Street",
              })}
              {renderPicker("Region", "region", regions)}
              {renderPicker("Province", "province", provinces)}
              {renderPicker("City", "city", cities)}
              {renderPicker("Barangay", "barangay", barangays)}
              {renderInput("Postal Code:", "postal", {
                placeholder: "Postal Code",
                keyboardType: "numeric",
              })}
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                }}
              >
                <TouchableOpacity
                  style={styles.button}
                  onPress={() => setStep(1)}
                >
                  <Text style={styles.buttonText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.button,
                    !isStepValid() && styles.buttonDisabled,
                  ]}
                  disabled={!isStepValid() || isLoading}
                  onPress={handleSignUp}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>Sign up</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
          <TouchableOpacity
            onPress={() =>
              navigation.navigate("Verification", { email: form.email })
            }
          >
            <Text style={styles.loginText}>
              Have an account? <Text style={{ color: "#B76E79" }}>Log in.</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#fff",
  },
  signupBox: {
    width: "100%",
    maxWidth: 400,
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
  logoContainer: {
    alignItems: "center",
    marginBottom: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: "300",
    color: "#6B6593",
    fontFamily: "serif",
    marginBottom: 24,
    textAlign: "center",
  },
  label: {
    fontSize: 12,
    color: "#6B6593",
    marginBottom: 2,
    marginLeft: 2,
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    borderWidth: 1,
    borderColor: "#C7C5D1",
  },
  inputError: {
    borderColor: "#B76E79",
  },
  pickerWrapper: {
    backgroundColor: "#fff",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#C7C5D1",
  },
  button: {
    backgroundColor: "#6B6593",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 32,
    marginTop: 10,
    alignItems: "center",
  },
  buttonDisabled: {
    backgroundColor: "#B6B3C6",
  },
  buttonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  error: {
    color: "#B76E79",
    fontSize: 11,
    marginTop: 2,
    marginLeft: 2,
  },
  loginText: {
    marginTop: 18,
    fontSize: 13,
    color: "#6B6593",
    textAlign: "center",
  },
});
