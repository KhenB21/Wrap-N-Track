import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
  ActivityIndicator,
} from "react-native";
import { authAPI } from "../services/api";
import { regions, citiesByRegion, getBarangaysForCity } from "../data/philippineLocations";

const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const phoneRegex = /^9\d{9}$/;
const postalRegex = /^\d{4}$/;

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
    houseStreetNumber: "",
    region: "",
    regionCode: "",
    city: "",
    cityCode: "",
    barangay: "",
    barangayCode: "",
    postal: "",
  });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const cityOptions = useMemo(
    () => (form.regionCode ? citiesByRegion[form.regionCode] || [] : []),
    [form.regionCode]
  );
  const barangayOptions = useMemo(
    () => (form.cityCode ? getBarangaysForCity(form.cityCode) : []),
    [form.cityCode]
  );

  const validate = (field, value = form[field]) => {
    switch (field) {
      case "firstName":
      case "lastName":
        if (!value.trim()) return "Required";
        if (!/^[A-Za-z\s'-]+$/.test(value.trim())) return "Only letters allowed";
        return "";
      case "username":
        if (!value.trim()) return "Required";
        if (value.trim().length < 4) return "Min 4 characters";
        return "";
      case "email":
        if (!value.trim()) return "Required";
        if (!emailRegex.test(value.trim())) return "Please enter a valid email address.";
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
        if (!phoneRegex.test(value)) return "Please enter a valid Philippine mobile number.";
        return "";
      case "houseStreetNumber":
        if (!value.trim()) return "House / Street Number is required.";
        return "";
      case "region":
        if (!form.regionCode || !regions.some((item) => item.code === form.regionCode && item.name === form.region)) {
          return "Please select a valid region from the list.";
        }
        return "";
      case "city":
        if (!form.cityCode || !cityOptions.some((item) => item.code === form.cityCode && item.name === form.city)) {
          return "Please select a valid city from the selected region.";
        }
        return "";
      case "barangay":
        if (!form.barangayCode || !barangayOptions.some((item) => item.code === form.barangayCode && item.name === form.barangay)) {
          return "Please select a valid barangay from the selected city.";
        }
        return "";
      case "postal":
        if (!postalRegex.test(value)) return "Postal code must be 4 digits.";
        return "";
      default:
        return "";
    }
  };

  const setField = (field, value, extra = {}) => {
    const nextForm = { ...form, [field]: value, ...extra };
    setForm(nextForm);
    setTouched({ ...touched, [field]: true });
    setErrors({ ...errors, [field]: validate(field, value) });
  };

  const handlePhoneChange = (value) => {
    const digits = value.replace(/\D/g, "").slice(0, 10);
    setField("phone", digits);
  };

  const handlePostalChange = (value) => {
    const digits = value.replace(/\D/g, "").slice(0, 4);
    setField("postal", digits);
  };

  const validateFields = (fields) => {
    const nextTouched = { ...touched };
    const nextErrors = { ...errors };
    fields.forEach((field) => {
      nextTouched[field] = true;
      const message = validate(field);
      if (message) {
        nextErrors[field] = message;
      } else {
        delete nextErrors[field];
      }
    });
    setTouched(nextTouched);
    setErrors(nextErrors);
    return fields.every((field) => !validate(field));
  };

  const stepOneFields = ["firstName", "lastName", "username", "email", "password", "confirmPassword", "phone"];
  const stepTwoFields = ["houseStreetNumber", "region", "city", "barangay", "postal"];

  const canContinue = stepOneFields.every((field) => touched[field] && !validate(field));
  const canSubmit = stepTwoFields.every((field) => touched[field] && !validate(field));

  const renderInput = (label, field, props = {}) => (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={form[field]}
        onChangeText={(value) => setField(field, value)}
        onBlur={() => setTouched({ ...touched, [field]: true })}
        {...props}
      />
      {props.helperText ? <Text style={styles.helper}>{props.helperText}</Text> : null}
      {!!touched[field] && !!errors[field] && <Text style={styles.error}>{errors[field]}</Text>}
    </View>
  );

  const renderPhoneInput = () => (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>Phone Number</Text>
      <View style={styles.phoneRow}>
        <Text style={styles.phonePrefix}>+63 |</Text>
        <TextInput
          style={styles.phoneInput}
          value={form.phone}
          onChangeText={handlePhoneChange}
          keyboardType="number-pad"
          maxLength={10}
          placeholder="9123456789"
        />
      </View>
      {!!touched.phone && !!errors.phone && <Text style={styles.error}>{errors.phone}</Text>}
    </View>
  );

  const renderSearchSelect = ({ label, field, codeField, options, disabled, placeholder, reset }) => {
    const query = form[field];
    const filtered = query
      ? options.filter((item) => item.name.toLowerCase().includes(query.toLowerCase())).slice(0, 8)
      : options.slice(0, 8);

    return (
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>{label}</Text>
        <TextInput
          style={[styles.input, disabled && styles.inputDisabled]}
          value={form[field]}
          editable={!disabled}
          placeholder={disabled ? "Select previous field first" : placeholder}
          onChangeText={(value) => {
            setForm({ ...form, [field]: value, [codeField]: "", ...reset });
            setTouched({ ...touched, [field]: true });
          }}
          onBlur={() => setTouched({ ...touched, [field]: true })}
        />
        {!disabled && form[field] && !form[codeField] && filtered.length > 0 && (
          <View style={styles.suggestions}>
            {filtered.map((item) => (
              <TouchableOpacity
                key={item.code}
                style={styles.suggestionItem}
                onPress={() => {
                  setForm({ ...form, [field]: item.name, [codeField]: item.code, ...reset });
                  setTouched({ ...touched, [field]: true });
                  setErrors({ ...errors, [field]: "" });
                }}
              >
                <Text style={styles.suggestionText}>{item.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        {!!touched[field] && !!errors[field] && <Text style={styles.error}>{errors[field]}</Text>}
      </View>
    );
  };

  const handleNext = () => {
    if (validateFields(stepOneFields)) {
      setStep(2);
    } else {
      Alert.alert("Check Your Details", "Please complete the required fields before continuing.");
    }
  };

  const handleSignUp = async () => {
    if (!validateFields([...stepOneFields, ...stepTwoFields])) {
      Alert.alert("Check Your Details", "Please complete the required fields before creating your customer account.");
      return;
    }

    const fullAddress = [
      form.houseStreetNumber.trim(),
      `Barangay ${form.barangay}`,
      form.city,
      form.region,
      form.postal,
    ].filter(Boolean).join(", ");

    const customerData = {
      first_name: form.firstName.trim(),
      last_name: form.lastName.trim(),
      username: form.username.trim(),
      name: `${form.firstName.trim()} ${form.lastName.trim()}`,
      email: form.email.trim(),
      password: form.password,
      phone_number: `+63${form.phone}`,
      house_street_number: form.houseStreetNumber.trim(),
      region: form.region,
      region_code: form.regionCode,
      city: form.city,
      city_code: form.cityCode,
      barangay: form.barangay,
      barangay_code: form.barangayCode,
      postal_code: form.postal,
      address: fullAddress,
    };

    try {
      setSubmitting(true);
      const response = await authAPI.register(customerData);
      if (response.success) {
        Alert.alert(
          "Account Created",
          response.message || "Registration successful. You can now log in.",
          [{ text: "OK", onPress: () => navigation.navigate("Login") }]
        );
      } else {
        Alert.alert("Registration Failed", response.message || "Please try again.");
      }
    } catch (error) {
      Alert.alert("Registration Failed", error.response?.data?.message || error.message || "Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: "#fff" }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Image source={require("../Images/Logo/pensee-logo-only.png")} style={styles.logo} resizeMode="contain" />
        <View style={styles.signupBox}>
          <Text style={styles.title}>SIGN UP</Text>
          {step === 1 ? (
            <View style={{ width: "100%" }}>
              {renderInput("First Name", "firstName", { placeholder: "First name" })}
              {renderInput("Last Name", "lastName", { placeholder: "Last name" })}
              {renderInput("Username", "username", { placeholder: "Username" })}
              {renderInput("Email Address", "email", {
                placeholder: "Enter your email address",
                keyboardType: "email-address",
                autoCapitalize: "none",
                helperText: "Make sure the email is correct for verification.",
              })}
              {renderInput("Password", "password", { placeholder: "Password", secureTextEntry: true })}
              {renderInput("Re-Enter Password", "confirmPassword", { placeholder: "Re-enter password", secureTextEntry: true })}
              {renderPhoneInput()}
              <TouchableOpacity style={[styles.button, !canContinue && styles.buttonDisabled]} disabled={!canContinue} onPress={handleNext}>
                <Text style={styles.buttonText}>Next</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ width: "100%" }}>
              {renderInput("House / Street Number", "houseStreetNumber", { placeholder: "House No., Block/Lot, Street" })}
              {renderSearchSelect({
                label: "Region",
                field: "region",
                codeField: "regionCode",
                options: regions,
                placeholder: "Search and select region",
                reset: { city: "", cityCode: "", barangay: "", barangayCode: "" },
              })}
              {renderSearchSelect({
                label: "City",
                field: "city",
                codeField: "cityCode",
                options: cityOptions,
                disabled: !form.regionCode,
                placeholder: "Search and select city",
                reset: { barangay: "", barangayCode: "" },
              })}
              {renderSearchSelect({
                label: "Barangay",
                field: "barangay",
                codeField: "barangayCode",
                options: barangayOptions,
                disabled: !form.cityCode,
                placeholder: "Search and select barangay",
                reset: {},
              })}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Postal Code</Text>
                <TextInput
                  style={styles.input}
                  value={form.postal}
                  onChangeText={handlePostalChange}
                  keyboardType="number-pad"
                  maxLength={4}
                  placeholder="4-digit postal code"
                />
                {!!touched.postal && !!errors.postal && <Text style={styles.error}>{errors.postal}</Text>}
              </View>
              <View style={styles.actionRow}>
                <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={() => setStep(1)}>
                  <Text style={styles.buttonText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.button, (!canSubmit || submitting) && styles.buttonDisabled]} disabled={!canSubmit || submitting} onPress={handleSignUp}>
                  {submitting ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.buttonText}>Sign up</Text>}
                </TouchableOpacity>
              </View>
            </View>
          )}
          <TouchableOpacity onPress={() => navigation.navigate("Login")}>
            <Text style={styles.loginText}>Have an account? <Text style={{ color: "#B76E79" }}>Log in.</Text></Text>
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
  logo: {
    width: 120,
    height: 120,
    marginTop: 40,
    marginBottom: 10,
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
  title: {
    fontSize: 32,
    fontWeight: "300",
    color: "#6B6593",
    fontFamily: "serif",
    marginBottom: 24,
    textAlign: "center",
  },
  fieldGroup: {
    marginBottom: 12,
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
  inputDisabled: {
    backgroundColor: "#F3F2F7",
    color: "#8E89A8",
  },
  phoneRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#C7C5D1",
  },
  phonePrefix: {
    color: "#6B6593",
    fontSize: 14,
    paddingLeft: 12,
    paddingRight: 8,
  },
  phoneInput: {
    flex: 1,
    paddingVertical: 10,
    paddingRight: 12,
    fontSize: 14,
  },
  suggestions: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#C7C5D1",
    borderRadius: 6,
    marginTop: 4,
    overflow: "hidden",
  },
  suggestionItem: {
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#EEEAF5",
  },
  suggestionText: {
    color: "#6B6593",
    fontSize: 13,
  },
  helper: {
    color: "#6B6593",
    fontSize: 11,
    marginTop: 4,
    marginLeft: 2,
  },
  button: {
    backgroundColor: "#6B6593",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 28,
    marginTop: 10,
    alignItems: "center",
    minWidth: 120,
  },
  secondaryButton: {
    backgroundColor: "#8E89A8",
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
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
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

