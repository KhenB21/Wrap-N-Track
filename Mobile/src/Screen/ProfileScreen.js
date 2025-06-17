import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Header from "../Components/Header";
import * as ImagePicker from "expo-image-picker";
import { Feather } from "@expo/vector-icons";
import axios from "axios";
import DoneAlert from "../Components/DoneAlert";

const API_URL = "http://10.0.2.2:5000/api";

export default function ProfileScreen({ navigation }) {
  const [user, setUser] = useState({
    name: "",
    age: "",
    email: "",
    phone: "",
    address: "",
    avatar: "",
    user_id: "",
  });
  const [originalUser, setOriginalUser] = useState(null); // for dirty check
  const [editingField, setEditingField] = useState(""); // which field is being edited
  const [isDirty, setIsDirty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertMsg, setAlertMsg] = useState("");
  const [phoneError, setPhoneError] = useState(false);

  const inputRefs = {
    name: useRef(),
    age: useRef(),
    phone: useRef(),
    address: useRef(),
  };

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const userData = await AsyncStorage.getItem("user");
        if (userData) {
          const localUser = JSON.parse(userData);
          const res = await axios.get(`${API_URL}/users/${localUser.user_id}`);
          setUser({ ...res.data, user_id: localUser.user_id });
          setOriginalUser({ ...res.data, user_id: localUser.user_id });
        }
      } catch (error) {
        showAlert("Could not load profile");
      }
      setLoading(false);
    };
    fetchUser();
  }, []);

  // Track changes to user for dirty check
  useEffect(() => {
    if (!originalUser) return;
    const changed =
      user.name !== originalUser.name ||
      user.age !== originalUser.age ||
      user.phone !== originalUser.phone ||
      user.address !== originalUser.address ||
      user.avatar !== originalUser.avatar;
    setIsDirty(changed);
  }, [user, originalUser]);

  const showAlert = (msg) => {
    setAlertMsg(msg);
    setAlertVisible(true);
  };

  const validatePhone = (val) => /^\d{11}$/.test(val) && val.startsWith("09");

  // Save all changes
  const handleSave = async () => {
    // Phone validation
    if (!validatePhone(user.phone)) {
      setPhoneError(true);
      showAlert("Phone must be exactly 11 numbers and start with '09'");
      return;
    }
    setPhoneError(false);

    setLoading(true);
    try {
      await axios.put(`${API_URL}/users/${user.user_id}`, {
        name: user.name,
        age: user.age,
        phone: user.phone,
        address: user.address,
        avatar: user.avatar,
      });
      await AsyncStorage.setItem("user", JSON.stringify(user));
      setOriginalUser({ ...user }); // update "dirty" baseline
      showAlert("Profile updated!");
    } catch (e) {
      showAlert("Failed to update profile");
    }
    setLoading(false);
    setEditingField("");
  };

  // Image picker
  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.status !== "granted") {
      showAlert("Please allow access to your photos.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      const picked = result.assets[0];
      setUser((prev) => ({ ...prev, avatar: picked.uri }));
    }
  };

  const avatar =
    user.avatar && user.avatar.length > 0
      ? { uri: user.avatar }
      : require("../../assets/Images/Default Profile.jpg");

  // Editable Field with edit icon at right (inside the input, vertically centered)
  const RenderEditableField = ({
    label,
    value,
    field,
    keyboardType,
    multiline,
    placeholder,
    error,
    ...props
  }) => (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputWrapper}>
        <TextInput
          ref={inputRefs[field]}
          style={[
            styles.input,
            editingField === field && styles.inputActive,
            error && styles.inputError,
            multiline && { minHeight: 48, textAlignVertical: "top" },
          ]}
          value={value ? String(value) : ""}
          editable={editingField === field}
          onFocus={() => setEditingField(field)}
          onBlur={() => setEditingField("")}
          onChangeText={(val) => {
            if (field === "phone") {
              const filtered = val.replace(/[^0-9]/g, "");
              setUser((prev) => ({ ...prev, [field]: filtered }));
            } else {
              setUser((prev) => ({ ...prev, [field]: val }));
            }
          }}
          keyboardType={keyboardType}
          placeholder={placeholder}
          placeholderTextColor="#b1b1b1"
          multiline={multiline}
          maxLength={field === "age" ? 3 : field === "phone" ? 11 : undefined}
          returnKeyType="done"
          blurOnSubmit
          {...props}
        />
        {field !== "email" && (
          <TouchableOpacity
            style={styles.editIcon}
            onPress={() => {
              setEditingField(field);
              setTimeout(() => {
                inputRefs[field]?.current?.focus();
              }, 80);
            }}
            activeOpacity={0.7}
          >
            <Feather
              name="edit-2"
              size={17}
              color={editingField === field ? "#7d789b" : "#726d8a"}
            />
          </TouchableOpacity>
        )}
      </View>
      {error && (
        <Text style={styles.errorMsg}>
          Phone must be exactly 11 numbers and start with "09"
        </Text>
      )}
    </View>
  );

  if (loading)
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#7d789b" />
      </View>
    );

  return (
    <View style={{ flex: 1, backgroundColor: "#f5f5f7" }}>
      <Header title="Profile" navigation={navigation} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.profileCard}>
            {/* Profile Image with Pencil Overlay */}
            <View style={{ marginBottom: 14 }}>
              <TouchableOpacity onPress={pickImage} activeOpacity={0.8}>
                <Image source={avatar} style={styles.avatar} />
                <View style={styles.avatarEditIcon}>
                  <Feather name="edit-2" size={18} color="#fff" />
                </View>
              </TouchableOpacity>
            </View>

            {/* Editable Fields with Pencil */}
            <RenderEditableField
              label="Name"
              value={user.name}
              field="name"
              placeholder="Your name"
            />
            <RenderEditableField
              label="Age"
              value={user.age?.toString() || ""}
              field="age"
              placeholder="Your age"
              keyboardType="number-pad"
            />
            <RenderEditableField
              label="Email"
              value={user.email}
              field="email"
              placeholder="Email"
              editable={false}
            />
            <RenderEditableField
              label="Phone"
              value={user.phone}
              field="phone"
              placeholder="Your phone (e.g. 09XXXXXXXXX)"
              keyboardType="phone-pad"
              error={phoneError}
            />
            <RenderEditableField
              label="Address"
              value={user.address}
              field="address"
              placeholder="Your address"
              multiline
            />

            {/* Save Changes button (only if there are changes) */}
            {isDirty && (
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSave}
                activeOpacity={0.8}
              >
                <Text style={styles.saveBtnText}>Save Changes</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <DoneAlert
        visible={alertVisible}
        message={alertMsg}
        onDone={() => setAlertVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 40,
  },
  profileCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    width: "96%",
    maxWidth: 400,
    shadowColor: "#aaa",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.13,
    shadowRadius: 8,
    elevation: 2,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#f2f2f2",
    borderWidth: 2,
    borderColor: "#bcb7ce",
  },
  avatarEditIcon: {
    position: "absolute",
    bottom: 2,
    right: 2,
    backgroundColor: "#7d789b",
    borderRadius: 11,
    padding: 3,
    elevation: 3,
    borderWidth: 2,
    borderColor: "#fff",
  },
  fieldGroup: {
    width: "100%",
    marginBottom: 16,
  },
  label: {
    fontWeight: "bold",
    color: "#726d8a",
    fontSize: 15,
    marginBottom: 4,
    fontFamily: "serif",
    marginLeft: 3,
  },
  inputWrapper: {
    position: "relative",
    justifyContent: "center",
  },
  input: {
    backgroundColor: "#f5f5f7",
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    color: "#434343",
    borderWidth: 1,
    borderColor: "#d3d1e4",
    fontFamily: "serif",
    paddingRight: 38, // for icon
  },
  inputActive: {
    borderColor: "#7d789b",
    backgroundColor: "#edeaf7",
  },
  inputDisabled: {
    backgroundColor: "#eee",
    color: "#a2a2a2",
    borderColor: "#e3e1f0",
  },
  inputError: {
    borderColor: "#c03d3d",
  },
  errorMsg: {
    color: "#c03d3d",
    fontSize: 12,
    marginTop: 2,
    marginLeft: 5,
    fontFamily: "serif",
  },
editIcon: {
  position: "absolute",
  right: 10,
  top: "50%",
  marginTop: -10,
  zIndex: 2,
},

  saveBtn: {
    marginTop: 10,
    backgroundColor: "#7d789b",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 36,
    alignSelf: "center",
    shadowColor: "#000",
    shadowOpacity: 0.09,
    shadowRadius: 3,
    elevation: 1,
  },
  saveBtnText: {
    color: "#fff",
    fontSize: 16,
    letterSpacing: 1,
    fontWeight: "bold",
    fontFamily: "serif",
  },
});
