import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";

const regions = ["Region 1", "Region 2", "Region 3"];
const provinces = ["Province 1", "Province 2", "Province 3"];
const cities = ["City 1", "City 2", "City 3"];
const barangays = ["Barangay 1", "Barangay 2", "Barangay 3"];

export default function SignUpScreen({ navigation }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
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

  // Validation functions
  const validate = (field, value) => {
    switch (field) {
      case "firstName":
      case "lastName":
        if (!value) return "Required";
        if (!/^[A-Za-z]+$/.test(value)) return "Only letters allowed";
        return "";
      case "username":
        if (!value) return "Required";
        if (value.length < 4) return "Min 4 characters";
        return "";
      case "email":
        if (!value) return "Required";
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value)) return "Invalid email";
        return "";
      case "password":
        if (!value) return "Required";
        if (value.length < 6) return "Min 6 characters";
        return "";
      case "confirmPassword":
        if (!value) return "Required";
        if (value !== form.password) return "Passwords do not match";
        return "";
      case "phone":
        if (!value) return "Required";
        if (!/^\d{10,15}$/.test(value)) return "Invalid phone number";
        return "";
      case "address":
        if (!value) return "Required";
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

  // Real-time validation
  const handleChange = (field, value) => {
    setForm({ ...form, [field]: value });
    setTouched({ ...touched, [field]: true });
    setErrors({ ...errors, [field]: validate(field, value) });
  };

  // Check if all fields in current step are valid
  const isStepValid = () => {
    if (step === 1) {
      return [
        "firstName",
        "lastName",
        "username",
        "email",
        "password",
        "confirmPassword",
        "phone",
      ].every(
        (field) =>
          touched[field] &&
          !validate(field, form[field]) &&
          form[field].length > 0
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
        (field) =>
          touched[field] &&
          !validate(field, form[field]) &&
          form[field].length > 0
      );
    }
  };

  // Render input with label and error
  const renderInput = (label, field, props = {}) => (
    <View style={{ marginBottom: 12 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={form[field]}
        onChangeText={(v) => handleChange(field, v)}
        onBlur={() => setTouched({ ...touched, [field]: true })}
        {...props}
      />
      {!!touched[field] && !!errors[field] && (
        <Text style={styles.error}>{errors[field]}</Text>
      )}
    </View>
  );

  // Render dropdown (simple picker)
  const renderPicker = (label, field, options) => (
    <View style={{ marginBottom: 12 }}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.pickerWrapper}>
        <TextInput
          style={styles.input}
          value={form[field]}
          placeholder={label}
          onFocus={() => {}}
          onChangeText={(v) => handleChange(field, v)}
        />
      </View>
      {!!touched[field] && !!errors[field] && (
        <Text style={styles.error}>{errors[field]}</Text>
      )}
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
              })}
              {renderInput("Email:", "email", { placeholder: "Email" })}
              {renderInput("Password:", "password", {
                placeholder: "Password",
                secureTextEntry: !showPassword,
              })}
              {renderInput("Re-Enter Password:", "confirmPassword", {
                placeholder: "Re-Enter Password",
                secureTextEntry: !showConfirmPassword,
              })}
              {renderInput("Phone Number:", "phone", {
                placeholder: "Phone Number",
                keyboardType: "phone-pad",
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
              {renderInput("Full Address:", "address", {
                placeholder: "Full Address",
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
                  disabled={!isStepValid()}
                  onPress={() => {
                    /* handle sign up */
                  }}
                >
                  <Text style={styles.buttonText}>Sign up</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          <TouchableOpacity onPress={() => navigation.navigate("Login")}>
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
