import React, { useState, useEffect } from "react";
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Image, ScrollView, ToastAndroid, Platform, Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useProfile } from "../Context/ProfileContext";
import { useAuth } from "../Context/AuthContext";
import { useTheme } from "../Context/ThemeContext";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import Header from "../Components/Header";
import { useNavigation } from "@react-navigation/native";

export default function ProfileScreen() {
  const { profile, setProfile } = useProfile();
  const { user, logout, isEmployee, isCustomer } = useAuth();
  const { darkMode } = useTheme();
  const navigation = useNavigation();
  
  // Initialize with user data from AuthContext
  const [name, setName] = useState(user?.name || profile.name || '');
  const [avatar, setAvatar] = useState(profile.avatar || 'https://via.placeholder.com/150');
  const [username, setUsername] = useState(user?.username || user?.name || profile.username || '');
  const [email, setEmail] = useState(user?.email || user?.email_address || profile.email || '');
  const [address, setAddress] = useState(profile.address || '');
  const [phone, setPhone] = useState(user?.phone_number || profile.phone || '');

  // Update form data when user data changes
  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setUsername(user.username || user.name || '');
      setEmail(user.email || user.email_address || '');
      setPhone(user.phone_number || '');
    }
  }, [user]);

  const colors = {
    bg: darkMode ? "#18191A" : "#fff",
    card: darkMode ? "#242526" : "#fff",
    text: darkMode ? "#fff" : "#111",
    input: darkMode ? "#393A3B" : "#F5F5F7",
    border: darkMode ? "#393A3B" : "#C7C5D1",
    accent: darkMode ? "#4F8EF7" : "#6B6593",
  };

  // Pick image from gallery
  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setAvatar(result.assets[0].uri);
    }
  };

  const handleSave = () => {
    setProfile({
      ...profile,
      name,
      avatar,
      username,
      email,
      address,
      phone,
    });
    // Show toast after saving
    if (Platform.OS === "android") {
      ToastAndroid.show("Profile saved!", ToastAndroid.SHORT);
    } else {
      Alert.alert("Profile saved!");
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            try {
              await logout();
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert("Error", "Failed to logout. Please try again.");
            }
          }
        }
      ]
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header
        showBack
        logoType="image"
        showCart
        onBackPress={() => navigation.goBack()}
        onCartPress={() => navigation.navigate("MyCart")}
        darkMode={darkMode}
        title="Profile"
      />
      <ScrollView>
        {/* User Info Header */}
        <View style={[styles.userInfoCard, { backgroundColor: colors.card }]}>
          <View style={styles.userInfoHeader}>
            <View style={styles.avatarContainer}>
              <Image source={{ uri: avatar }} style={styles.avatar} />
              <TouchableOpacity
                style={styles.pencilBtn}
                onPress={pickImage}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name="pencil" size={22} color={colors.accent} />
              </TouchableOpacity>
            </View>
            <View style={styles.userDetails}>
              <Text style={[styles.userName, { color: colors.text }]}>{name || 'User'}</Text>
              <Text style={[styles.userRole, { color: colors.accent }]}>
                {isEmployee() ? `Employee - ${user?.role || 'Staff'}` : 'Customer'}
              </Text>
              <Text style={[styles.userEmail, { color: colors.text }]}>{email}</Text>
            </View>
          </View>
        </View>

        {/* Profile Edit Form */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Edit Profile</Text>
          <Text style={[styles.label, { color: colors.text }]}>Name</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.input, color: colors.text, borderColor: colors.border }]}
            value={name}
            onChangeText={setName}
          />
          <Text style={[styles.label, { color: colors.text }]}>Username</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.input, color: colors.text, borderColor: colors.border }]}
            value={username}
            onChangeText={setUsername}
          />
          <Text style={[styles.label, { color: colors.text }]}>Email</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.input, color: colors.text, borderColor: colors.border }]}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Text style={[styles.label, { color: colors.text }]}>Address</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.input, color: colors.text, borderColor: colors.border }]}
            value={address}
            onChangeText={setAddress}
          />
          <Text style={[styles.label, { color: colors.text }]}>Phone</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.input, color: colors.text, borderColor: colors.border }]}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
            <Text style={styles.saveBtnText}>Save</Text>
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
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
  card: {
    margin: 18,
    borderRadius: 12,
    padding: 18,
    elevation: 2,
  },
  userInfoCard: {
    margin: 18,
    marginBottom: 8,
    borderRadius: 12,
    padding: 20,
    elevation: 2,
  },
  userInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  userRole: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    opacity: 0.7,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignSelf: "center",
    backgroundColor: "#EDECF3",
  },
  pencilBtn: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 4,
    elevation: 2,
  },
  label: {
    fontWeight: "bold",
    marginTop: 12,
    marginBottom: 2,
    fontSize: 14,
  },
  value: {
    fontSize: 14,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
    fontSize: 14,
  },
  saveBtn: {
    marginTop: 18,
    backgroundColor: "#4F8EF7",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
  },
  saveBtnText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 15,
    letterSpacing: 1,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: "#E57373",
    borderRadius: 8,
    paddingVertical: 12,
    marginTop: 8,
  },
  logoutBtnText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 15,
    letterSpacing: 1,
    marginLeft: 8,
  },
});