import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from "react-native";
import Header from "../Components/Header";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../Context/ThemeContext";
import { useAuth } from "../Context/AuthContext";

export default function SettingsScreen({ navigation }) {
  const { darkMode, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);
  const [locationEnabled, setLocationEnabled] = useState(false);

  const handleLogout = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          style: "destructive",
          onPress: () => {
            logout();
            navigation.navigate("Login");
          }
        }
      ]
    );
  };

  const handleClearCache = () => {
    Alert.alert(
      "Clear Cache",
      "This will clear all cached data. Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: () => {
            // In a real app, you would clear the cache here
            Alert.alert("Success", "Cache cleared successfully!");
          }
        }
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "This action cannot be undone. Are you sure you want to delete your account?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            // In a real app, you would delete the account here
            Alert.alert("Account Deleted", "Your account has been deleted.");
            logout();
            navigation.navigate("Login");
          }
        }
      ]
    );
  };

  const settingsSections = [
    {
      title: "Appearance",
      items: [
        {
          id: "theme",
          title: "Dark Mode",
          subtitle: "Switch between light and dark themes",
          type: "switch",
          value: darkMode,
          onPress: toggleTheme,
          icon: "theme-light-dark"
        }
      ]
    },
    {
      title: "Notifications",
      items: [
        {
          id: "notifications",
          title: "Push Notifications",
          subtitle: "Receive notifications for orders and updates",
          type: "switch",
          value: notificationsEnabled,
          onPress: setNotificationsEnabled,
          icon: "bell"
        }
      ]
    },
    {
      title: "Data & Sync",
      items: [
        {
          id: "auto_sync",
          title: "Auto Sync",
          subtitle: "Automatically sync data when connected",
          type: "switch",
          value: autoSyncEnabled,
          onPress: setAutoSyncEnabled,
          icon: "sync"
        },
        {
          id: "location",
          title: "Location Services",
          subtitle: "Allow app to access your location",
          type: "switch",
          value: locationEnabled,
          onPress: setLocationEnabled,
          icon: "map-marker"
        },
        {
          id: "clear_cache",
          title: "Clear Cache",
          subtitle: "Clear all cached data",
          type: "action",
          onPress: handleClearCache,
          icon: "delete-sweep"
        }
      ]
    },
    {
      title: "Account",
      items: [
        {
          id: "profile",
          title: "Edit Profile",
          subtitle: "Update your personal information",
          type: "navigation",
          onPress: () => navigation.navigate("Profile"),
          icon: "account-edit"
        },
        {
          id: "change_password",
          title: "Change Password",
          subtitle: "Update your account password",
          type: "navigation",
          onPress: () => navigation.navigate("ChangePassword"),
          icon: "lock-reset"
        },
        {
          id: "logout",
          title: "Logout",
          subtitle: "Sign out of your account",
          type: "action",
          onPress: handleLogout,
          icon: "logout",
          destructive: true
        }
      ]
    },
    {
      title: "Support",
      items: [
        {
          id: "help",
          title: "Help & Support",
          subtitle: "Get help and contact support",
          type: "navigation",
          onPress: () => navigation.navigate("Help"),
          icon: "help-circle"
        },
        {
          id: "about",
          title: "About",
          subtitle: "App version and information",
          type: "navigation",
          onPress: () => navigation.navigate("About"),
          icon: "information"
        },
        {
          id: "privacy",
          title: "Privacy Policy",
          subtitle: "Read our privacy policy",
          type: "navigation",
          onPress: () => navigation.navigate("Privacy"),
          icon: "shield-account"
        },
        {
          id: "terms",
          title: "Terms of Service",
          subtitle: "Read our terms of service",
          type: "navigation",
          onPress: () => navigation.navigate("Terms"),
          icon: "file-document"
        }
      ]
    },
    {
      title: "Danger Zone",
      items: [
        {
          id: "delete_account",
          title: "Delete Account",
          subtitle: "Permanently delete your account",
          type: "action",
          onPress: handleDeleteAccount,
          icon: "account-remove",
          destructive: true
        }
      ]
    }
  ];

  const renderSettingItem = (item) => (
    <TouchableOpacity
      key={item.id}
      style={[
        styles.settingItem,
        { 
          backgroundColor: darkMode ? "#242526" : "#fff",
          borderColor: darkMode ? "#393A3B" : "#EDECF3",
        }
      ]}
      onPress={item.onPress}
    >
      <View style={styles.settingLeft}>
        <View style={[
          styles.settingIcon,
          { backgroundColor: item.destructive ? "#EF5350" : (darkMode ? "#393A3B" : "#F5F4FA") }
        ]}>
          <MaterialCommunityIcons 
            name={item.icon} 
            size={20} 
            color={item.destructive ? "#fff" : (darkMode ? "#E4E6EB" : "#6B6593")} 
          />
        </View>
        <View style={styles.settingContent}>
          <Text style={[
            styles.settingTitle,
            { color: item.destructive ? "#EF5350" : (darkMode ? "#E4E6EB" : "#222") }
          ]}>
            {item.title}
          </Text>
          <Text style={[styles.settingSubtitle, { color: darkMode ? "#B0B3B8" : "#6B6593" }]}>
            {item.subtitle}
          </Text>
        </View>
      </View>
      <View style={styles.settingRight}>
        {item.type === "switch" ? (
          <Switch
            value={item.value}
            onValueChange={item.onPress}
            trackColor={{ false: darkMode ? "#393A3B" : "#EDECF3", true: "#6B6593" }}
            thumbColor={item.value ? "#fff" : (darkMode ? "#B0B3B8" : "#6B6593")}
          />
        ) : (
          <MaterialCommunityIcons 
            name="chevron-right" 
            size={20} 
            color={darkMode ? "#B0B3B8" : "#6B6593"} 
          />
        )}
      </View>
    </TouchableOpacity>
  );

  const renderSection = (section) => (
    <View key={section.title} style={styles.section}>
      <Text style={[styles.sectionTitle, { color: darkMode ? "#B0B3B8" : "#6B6593" }]}>
        {section.title}
      </Text>
      <View style={[styles.sectionContent, { backgroundColor: darkMode ? "#242526" : "#fff" }]}>
        {section.items.map(renderSettingItem)}
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: darkMode ? "#18191A" : "#F5F4FA" }]}>
      <Header
        showBack
        showCart
        logoType="image"
        onBackPress={() => navigation.goBack()}
        onCartPress={() => navigation.navigate("MyCart")}
        darkMode={darkMode}
      />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* User Profile Section */}
        <View style={[styles.profileSection, { backgroundColor: darkMode ? "#242526" : "#fff" }]}>
          <View style={styles.profileInfo}>
            <View style={[styles.profileAvatar, { backgroundColor: darkMode ? "#393A3B" : "#F5F4FA" }]}>
              <MaterialCommunityIcons 
                name="account" 
                size={32} 
                color={darkMode ? "#E4E6EB" : "#6B6593"} 
              />
            </View>
            <View style={styles.profileDetails}>
              <Text style={[styles.profileName, { color: darkMode ? "#E4E6EB" : "#222" }]}>
                {user?.name || "User"}
              </Text>
              <Text style={[styles.profileEmail, { color: darkMode ? "#B0B3B8" : "#6B6593" }]}>
                {user?.email || "user@example.com"}
              </Text>
              <Text style={[styles.profileRole, { color: darkMode ? "#B0B3B8" : "#6B6593" }]}>
                {user?.role || "Customer"}
              </Text>
            </View>
          </View>
        </View>

        {/* Settings Sections */}
        {settingsSections.map(renderSection)}

        {/* App Version */}
        <View style={styles.versionSection}>
          <Text style={[styles.versionText, { color: darkMode ? "#B0B3B8" : "#6B6593" }]}>
            Wrap N' Track Mobile v1.0.0
          </Text>
          <Text style={[styles.versionSubtext, { color: darkMode ? "#B0B3B8" : "#6B6593" }]}>
            © 2024 Wrap N' Track. All rights reserved.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  profileSection: {
    margin: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  profileDetails: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontFamily: 'serif',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    fontFamily: 'serif',
    marginBottom: 2,
  },
  profileRole: {
    fontSize: 12,
    fontFamily: 'serif',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: 'serif',
    fontWeight: 'bold',
    marginBottom: 8,
    marginHorizontal: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionContent: {
    marginHorizontal: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EDECF3',
  },
  settingLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontFamily: 'serif',
    fontWeight: '500',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 12,
    fontFamily: 'serif',
    lineHeight: 16,
  },
  settingRight: {
    marginLeft: 16,
  },
  versionSection: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  versionText: {
    fontSize: 12,
    fontFamily: 'serif',
    marginBottom: 4,
  },
  versionSubtext: {
    fontSize: 10,
    fontFamily: 'serif',
    textAlign: 'center',
  },
});