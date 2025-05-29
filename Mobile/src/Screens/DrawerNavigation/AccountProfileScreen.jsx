import React, { useState, useEffect, useContext } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  Platform,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useTheme } from "./ThemeContect";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

// Context to share profile info between screens (create this in a separate file for real apps)
const ProfileContext = React.createContext();

export const useProfile = () => useContext(ProfileContext);

// Default profile image
import defaultProfile from "../../../assets/Profile/person.jpg";

const AccountProfileScreen = ({ navigation }) => {
  const { themeStyles } = useTheme();
  const { profile, setProfile } = useProfile();

  const [profileImage, setProfileImage] = useState(profile.image);
  const [name, setName] = useState(profile.name);
  const [email, setEmail] = useState(profile.email);
  const [phone, setPhone] = useState(profile.phone);

  useEffect(() => {
    setProfile((prev) => ({
      ...prev,
      image: profileImage,
      name,
      email,
      phone,
    }));
    // eslint-disable-next-line
  }, [profileImage, name, email, phone]);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });
    if (!result.canceled) {
      setProfileImage(result.assets[0].uri);
    }
  };

  const handleSave = () => {
    setProfile((prev) => ({
      ...prev,
      image: profileImage,
      name,
      email,
      phone,
    }));
    navigation.goBack();
  };

  return (
    <View style={[styles.screen, { backgroundColor: "#F5F5F7" }]}>
      {/* Header with back button */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color="#222" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Account Profile</Text>
      </View>
      <View style={styles.card}>
        <View style={styles.profileEditRow}>
          <TouchableOpacity onPress={pickImage} style={styles.imageContainer}>
            <Image
              source={
                profileImage
                  ? profileImage.startsWith("file")
                    ? { uri: profileImage }
                    : profileImage
                  : defaultProfile
              }
              style={styles.profileImage}
            />
            {/* Pencil icon at top right of profile image */}
            <TouchableOpacity
              onPress={pickImage}
              style={styles.profileEditIcon}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="pencil" size={20} color="#fff" />
            </TouchableOpacity>
          </TouchableOpacity>
        </View>
        <Text style={styles.sectionTitle}>Personal Information</Text>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Name:</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Enter your name"
            placeholderTextColor="#888"
          />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email:</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="Enter your email"
            placeholderTextColor="#888"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Phone Number:</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="Enter your phone number"
            placeholderTextColor="#888"
            keyboardType="phone-pad"
          />
        </View>
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
          <Text style={styles.saveBtnText}>Save</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// Provide this context at a high level (e.g. App.js or DrawerNavigator)
export const ProfileProvider = ({ children }) => {
  const [profile, setProfile] = useState({
    image: null,
    name: "",
    email: "",
    phone: "",
  });
  return (
    <ProfileContext.Provider value={{ profile, setProfile }}>
      {children}
    </ProfileContext.Provider>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: Platform.OS === "android" ? 32 : 0,
  },
  header: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 12,
    paddingBottom: 12,
    paddingHorizontal: 12,
    backgroundColor: "#F5F5F7",
  },
  backBtn: {
    padding: 4,
    marginRight: 4,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#222",
    marginLeft: 4,
  },
  card: {
    width: "92%",
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 18,
    alignItems: "center",
    marginTop: 8,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 1,
  },
  imageContainer: {
    marginTop: 8,
    marginBottom: 10,
    alignItems: "center",
    justifyContent: "center",
    width: 110,
    height: 110,
    borderRadius: 12,
    backgroundColor: "#E0E0E0",
    overflow: "hidden",
  },
  profileImage: {
    width: 110,
    height: 110,
    borderRadius: 12,
    backgroundColor: "#E0E0E0",
    resizeMode: "cover",
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "500",
    marginVertical: 16,
    textAlign: "center",
  },
  inputGroup: {
    width: "100%",
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    marginBottom: 4,
    color: "#222",
  },
  input: {
    width: "100%",
    height: 38,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#C7C5D1",
    backgroundColor: "#fff",
    paddingHorizontal: 10,
    fontSize: 15,
    color: "#222",
  },
  saveBtn: {
    marginTop: 18,
    width: "100%",
    height: 44,
    borderRadius: 6,
    backgroundColor: "#A3A0B4",
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  profileEditRow: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  profileEditIcon: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: "#A3A0B4",
    borderRadius: 12,
    padding: 4,
    zIndex: 2,
  },
});

export default AccountProfileScreen;