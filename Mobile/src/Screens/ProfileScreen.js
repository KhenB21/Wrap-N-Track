import React, { useMemo, useState, useEffect } from "react";
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Image, ScrollView, ToastAndroid, Platform, Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useProfile } from "../Context/ProfileContext";
import { useAuth } from "../Context/AuthContext";
import { useTheme } from "../Context/ThemeContext";
import { customerAPI, accountManagementAPI } from "../services/api";
import { regions, citiesByRegion, getBarangaysForCity } from "../data/philippineLocations";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import Header from "../Components/Header";
import { useNavigation } from "@react-navigation/native";

const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const phoneRegex = /^\+639\d{9}$/;
const postalRegex = /^\d{4}$/;

export default function ProfileScreen() {
  const { profile, updateProfile, setProfile } = useProfile();
  const { user, logout, isEmployee, updateUser } = useAuth();
  const { darkMode } = useTheme();
  const navigation = useNavigation();
  const base = profile || user || {};

  const [name, setName] = useState(base.name || "");
  const [avatar, setAvatar] = useState(base.avatar || (base.profile_picture_base64 ? `data:image/jpeg;base64,${base.profile_picture_base64}` : "https://via.placeholder.com/150"));
  const [avatarChanged, setAvatarChanged] = useState(false);
  const [username, setUsername] = useState(base.username || base.name || "");
  const [email, setEmail] = useState(base.email || base.email_address || "");
  const [phoneDigits, setPhoneDigits] = useState((base.phone_number || "").replace(/^\+63/, "").replace(/\D/g, "").slice(0, 10));
  const [houseStreetNumber, setHouseStreetNumber] = useState(base.house_street_number || "");
  const [region, setRegion] = useState(base.region || "");
  const [regionCode, setRegionCode] = useState(base.region_code || "");
  const [city, setCity] = useState(base.city || "");
  const [cityCode, setCityCode] = useState(base.city_code || "");
  const [barangay, setBarangay] = useState(base.barangay || "");
  const [barangayCode, setBarangayCode] = useState(base.barangay_code || "");
  const [postal, setPostal] = useState(base.postal_code || "");
  const [isEditing, setIsEditing] = useState(false);

  // Snapshot of the fields as they are when Edit is opened, so Cancel can
  // restore them exactly without re-fetching from the server.
  const buildSnapshot = () => ({
    name, avatar, username, email, phoneDigits,
    houseStreetNumber, region, regionCode, city, cityCode, barangay, barangayCode, postal,
  });
  const [snapshot, setSnapshotState] = useState(buildSnapshot);

  const enterEditMode = () => {
    setSnapshotState(buildSnapshot());
    setIsEditing(true);
  };

  const cancelEditMode = () => {
    setName(snapshot.name);
    setAvatar(snapshot.avatar);
    setAvatarChanged(false);
    setUsername(snapshot.username);
    setEmail(snapshot.email);
    setPhoneDigits(snapshot.phoneDigits);
    setHouseStreetNumber(snapshot.houseStreetNumber);
    setRegion(snapshot.region);
    setRegionCode(snapshot.regionCode);
    setCity(snapshot.city);
    setCityCode(snapshot.cityCode);
    setBarangay(snapshot.barangay);
    setBarangayCode(snapshot.barangayCode);
    setPostal(snapshot.postal);
    setIsEditing(false);
  };

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setUsername(user.username || user.name || "");
      setEmail(user.email || user.email_address || "");
      setPhoneDigits((user.phone_number || "").replace(/^\+63/, "").replace(/\D/g, "").slice(0, 10));
      setHouseStreetNumber(user.house_street_number || "");
      setRegion(user.region || "");
      setRegionCode(user.region_code || "");
      setCity(user.city || "");
      setCityCode(user.city_code || "");
      setBarangay(user.barangay || "");
      setBarangayCode(user.barangay_code || "");
      setPostal(user.postal_code || "");
    }
  }, [user]);

  const cityOptions = useMemo(() => (regionCode ? citiesByRegion[regionCode] || [] : []), [regionCode]);
  const barangayOptions = useMemo(() => (cityCode ? getBarangaysForCity(cityCode) : []), [cityCode]);

  const colors = {
    bg: darkMode ? "#18191A" : "#fff",
    card: darkMode ? "#242526" : "#fff",
    text: darkMode ? "#fff" : "#111",
    input: darkMode ? "#393A3B" : "#F5F5F7",
    border: darkMode ? "#393A3B" : "#C7C5D1",
    accent: darkMode ? "#4F8EF7" : "#6B6593",
  };

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Photos Disabled", "Please allow photo access in your mobile system settings to update your profile image.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets?.length) {
      setAvatar(result.assets[0].uri);
      setAvatarChanged(true);
    }
  };

  const showSaved = () => {
    if (Platform.OS === "android") ToastAndroid.show("Profile saved!", ToastAndroid.SHORT);
    else Alert.alert("Profile saved!");
  };

  const validate = () => {
    if (!name.trim()) return "Name is required.";
    if (!username.trim()) return "Username is required.";
    if (!emailRegex.test(email.trim())) return "Please enter a valid email address.";
    if (phoneDigits && !/^9\d{9}$/.test(phoneDigits)) return "Please enter a valid Philippine mobile number.";
    if (!houseStreetNumber.trim()) return "House / Street Number is required.";
    if (!regionCode || !regions.some((item) => item.code === regionCode && item.name === region)) return "Please select a valid region from the list.";
    if (!cityCode || !cityOptions.some((item) => item.code === cityCode && item.name === city)) return "Please select a valid city from the selected region.";
    if (!barangayCode || !barangayOptions.some((item) => item.code === barangayCode && item.name === barangay)) return "Please select a valid barangay from the selected city.";
    if (!postalRegex.test(postal)) return "Postal code must be 4 digits.";
    return "";
  };

  const handleSave = async () => {
    const message = validate();
    if (message) {
      Alert.alert("Check Your Details", message);
      return;
    }
    const fullAddress = [houseStreetNumber.trim(), `Barangay ${barangay}`, city, region, postal].filter(Boolean).join(", ");
    const payload = {
      name: name.trim(),
      username: username.trim(),
      email_address: email.trim(),
      phone_number: phoneDigits ? `+63${phoneDigits}` : "",
      house_street_number: houseStreetNumber.trim(),
      region,
      region_code: regionCode,
      city,
      city_code: cityCode,
      barangay,
      barangay_code: barangayCode,
      postal_code: postal,
      address: fullAddress,
      avatar,
    };

    try {
      const result = isEmployee() ? { success: true, profile: payload } : await updateProfile(payload);
      if (!result.success) {
        Alert.alert("Unable to Save", result.message || "Please try again.");
        return;
      }
      let savedAvatar = avatar;
      let uploadedProfilePictureBase64 = result.profile?.profile_picture_base64;
      if (avatarChanged && avatar && !avatar.startsWith("http") && !avatar.startsWith("data:")) {
        const uploadResult = isEmployee()
          ? await accountManagementAPI.uploadOwnProfilePicture(avatar)
          : await customerAPI.uploadProfilePicture(avatar);
        uploadedProfilePictureBase64 = uploadResult.profile_picture_data || uploadResult.profile_picture_base64 || uploadedProfilePictureBase64;
        if (uploadedProfilePictureBase64) {
          savedAvatar = `data:image/jpeg;base64,${uploadedProfilePictureBase64}`;
          setAvatar(savedAvatar);
        }
      }
      const savedProfile = {
        ...(result.profile || payload),
        profile_picture_base64: uploadedProfilePictureBase64,
        avatar: savedAvatar,
      };
      setProfile(savedProfile);
      await updateUser(savedProfile);
      setAvatarChanged(false);
      setIsEditing(false);
      showSaved();
    } catch (error) {
      Alert.alert("Unable to Save", error.response?.data?.message || error.message || "Please try again.");
    }
  };

  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", style: "destructive", onPress: async () => logout() },
    ]);
  };

  const renderSearchSelect = ({ label, value, setValue, code, setCode, options, disabled, placeholder, onSelected }) => {
    const filtered = value ? options.filter((item) => item.name.toLowerCase().includes(value.toLowerCase())).slice(0, 8) : options.slice(0, 8);
    return (
      <View>
        <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.input, color: colors.text, borderColor: colors.border }, disabled && styles.inputDisabled]}
          value={value}
          editable={!disabled}
          placeholder={disabled ? "Select previous field first" : placeholder}
          placeholderTextColor={darkMode ? "#8A8D91" : "#8E89A8"}
          onChangeText={(text) => { setValue(text); setCode(""); }}
        />
        {!disabled && value && !code && filtered.length > 0 && (
          <View style={[styles.suggestions, { borderColor: colors.border, backgroundColor: colors.card }]}>
            {filtered.map((item) => (
              <TouchableOpacity key={item.code} style={styles.suggestionItem} onPress={() => { setValue(item.name); setCode(item.code); onSelected?.(); }}>
                <Text style={[styles.suggestionText, { color: colors.text }]}>{item.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header showBack logoType="image" showCart onBackPress={() => navigation.goBack()} onCartPress={() => navigation.navigate("MyCart")} darkMode={darkMode} title="Profile" />
      <ScrollView keyboardShouldPersistTaps="handled">
        <View style={[styles.userInfoCard, { backgroundColor: colors.card }]}>
          <View style={styles.userInfoHeader}>
            <View style={styles.avatarContainer}>
              <Image source={{ uri: avatar }} style={styles.avatar} />
              {isEditing && (
                <TouchableOpacity style={styles.pencilBtn} onPress={pickImage} activeOpacity={0.7}>
                  <MaterialCommunityIcons name="pencil" size={22} color={colors.accent} />
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.userDetails}>
              <Text style={[styles.userName, { color: colors.text }]}>{name || "User"}</Text>
              <Text style={[styles.userRole, { color: colors.accent }]}>{isEmployee() ? `Employee - ${user?.role || "Staff"}` : "Customer"}</Text>
              <Text style={[styles.userEmail, { color: colors.text }]}>{email}</Text>
            </View>
            {!isEditing && (
              <TouchableOpacity style={[styles.editProfileBtn, { borderColor: colors.accent }]} onPress={enterEditMode}>
                <MaterialCommunityIcons name="pencil-outline" size={16} color={colors.accent} />
                <Text style={[styles.editProfileBtnText, { color: colors.accent }]}>Edit Profile</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{isEditing ? "Edit Profile" : "Profile Details"}</Text>
          <Text style={[styles.label, { color: colors.text }]}>Name</Text>
          <TextInput style={[styles.input, { backgroundColor: colors.input, color: colors.text, borderColor: colors.border }, !isEditing && styles.inputDisabled]} value={name} onChangeText={setName} editable={isEditing} />
          <Text style={[styles.label, { color: colors.text }]}>Username</Text>
          <TextInput style={[styles.input, { backgroundColor: colors.input, color: colors.text, borderColor: colors.border }, !isEditing && styles.inputDisabled]} value={username} onChangeText={setUsername} editable={isEditing} />
          <Text style={[styles.label, { color: colors.text }]}>Email</Text>
          <TextInput style={[styles.input, { backgroundColor: colors.input, color: colors.text, borderColor: colors.border }, !isEditing && styles.inputDisabled]} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" editable={isEditing} />
          <Text style={[styles.label, { color: colors.text }]}>Phone</Text>
          <View style={[styles.phoneRow, { backgroundColor: colors.input, borderColor: colors.border }, !isEditing && styles.inputDisabled]}>
            <Text style={[styles.phonePrefix, { color: colors.text }]}>+63 |</Text>
            <TextInput style={[styles.phoneInput, { color: colors.text }]} value={phoneDigits} onChangeText={(v) => setPhoneDigits(v.replace(/\D/g, "").slice(0, 10))} keyboardType="number-pad" maxLength={10} placeholder="9123456789" editable={isEditing} />
          </View>

          <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 18 }]}>Address</Text>
          <Text style={[styles.label, { color: colors.text }]}>House / Street Number</Text>
          <TextInput style={[styles.input, { backgroundColor: colors.input, color: colors.text, borderColor: colors.border }, !isEditing && styles.inputDisabled]} value={houseStreetNumber} onChangeText={setHouseStreetNumber} placeholder="House No., Block/Lot, Street" editable={isEditing} />
          {isEditing ? (
            <>
              {renderSearchSelect({ label: "Region", value: region, setValue: setRegion, code: regionCode, setCode: setRegionCode, options: regions, placeholder: "Search and select region", onSelected: () => { setCity(""); setCityCode(""); setBarangay(""); setBarangayCode(""); } })}
              {renderSearchSelect({ label: "City", value: city, setValue: setCity, code: cityCode, setCode: setCityCode, options: cityOptions, disabled: !regionCode, placeholder: "Search and select city", onSelected: () => { setBarangay(""); setBarangayCode(""); } })}
              {renderSearchSelect({ label: "Barangay", value: barangay, setValue: setBarangay, code: barangayCode, setCode: setBarangayCode, options: barangayOptions, disabled: !cityCode, placeholder: "Search and select barangay" })}
            </>
          ) : (
            <>
              <Text style={[styles.label, { color: colors.text }]}>Region</Text>
              <TextInput style={[styles.input, { backgroundColor: colors.input, color: colors.text, borderColor: colors.border }, styles.inputDisabled]} value={region} editable={false} />
              <Text style={[styles.label, { color: colors.text }]}>City</Text>
              <TextInput style={[styles.input, { backgroundColor: colors.input, color: colors.text, borderColor: colors.border }, styles.inputDisabled]} value={city} editable={false} />
              <Text style={[styles.label, { color: colors.text }]}>Barangay</Text>
              <TextInput style={[styles.input, { backgroundColor: colors.input, color: colors.text, borderColor: colors.border }, styles.inputDisabled]} value={barangay} editable={false} />
            </>
          )}
          <Text style={[styles.label, { color: colors.text }]}>Postal Code</Text>
          <TextInput style={[styles.input, { backgroundColor: colors.input, color: colors.text, borderColor: colors.border }, !isEditing && styles.inputDisabled]} value={postal} onChangeText={(v) => setPostal(v.replace(/\D/g, "").slice(0, 4))} keyboardType="number-pad" maxLength={4} placeholder="4-digit postal code" editable={isEditing} />

          {isEditing && (
            <View style={styles.editActionsRow}>
              <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.border }]} onPress={cancelEditMode}>
                <Text style={[styles.cancelBtnText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveBtn, { flex: 1 }]} onPress={handleSave}>
                <Text style={styles.saveBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <MaterialCommunityIcons name="logout" size={20} color="#fff" />
            <Text style={styles.logoutBtnText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { margin: 18, borderRadius: 12, padding: 18, elevation: 2 },
  userInfoCard: { margin: 18, marginBottom: 8, borderRadius: 12, padding: 20, elevation: 2 },
  userInfoHeader: { flexDirection: "row", alignItems: "center" },
  avatarContainer: { position: "relative", marginRight: 16 },
  userDetails: { flex: 1 },
  userName: { fontSize: 20, fontWeight: "bold", marginBottom: 4 },
  userRole: { fontSize: 14, fontWeight: "600", marginBottom: 4 },
  userEmail: { fontSize: 14, opacity: 0.7 },
  sectionTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 12 },
  avatar: { width: 90, height: 90, borderRadius: 45, alignSelf: "center", backgroundColor: "#EDECF3" },
  pencilBtn: { position: "absolute", top: 4, right: 4, backgroundColor: "#fff", borderRadius: 14, padding: 4, elevation: 2 },
  label: { fontWeight: "bold", marginTop: 12, marginBottom: 2, fontSize: 14 },
  input: { borderWidth: 1, borderRadius: 8, padding: 8, marginBottom: 8, fontSize: 14 },
  inputDisabled: { opacity: 0.65 },
  phoneRow: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 8, marginBottom: 8 },
  phonePrefix: { paddingLeft: 10, paddingRight: 8, fontSize: 14 },
  phoneInput: { flex: 1, paddingVertical: 8, paddingRight: 10, fontSize: 14 },
  suggestions: { borderWidth: 1, borderRadius: 8, marginBottom: 8, overflow: "hidden" },
  suggestionItem: { paddingVertical: 9, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: "#EDECF3" },
  suggestionText: { fontSize: 13 },
  saveBtn: { marginTop: 18, backgroundColor: "#4F8EF7", borderRadius: 8, paddingVertical: 10, alignItems: "center" },
  saveBtnText: { color: "#fff", fontWeight: "bold", fontSize: 15, letterSpacing: 1 },
  editProfileBtn: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, gap: 4 },
  editProfileBtnText: { fontSize: 12, fontWeight: "600" },
  editActionsRow: { flexDirection: "row", gap: 12, marginTop: 18 },
  cancelBtn: { flex: 1, borderWidth: 1, borderRadius: 8, paddingVertical: 10, alignItems: "center" },
  cancelBtnText: { fontWeight: "bold", fontSize: 15, letterSpacing: 1 },
  logoutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#E57373", borderRadius: 8, paddingVertical: 12, marginTop: 8 },
  logoutBtnText: { color: "#fff", fontWeight: "bold", fontSize: 15, letterSpacing: 1, marginLeft: 8 },
});
