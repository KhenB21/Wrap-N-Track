import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  Switch
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Card, List, Button, Divider } from 'react-native-paper';
import { useTheme } from '../../Context/ThemeContext';
import { useAuth } from '../../Context/AuthContext';

export default function SettingsScreen({ navigation }) {
  const theme = useTheme();
  const { user, logout } = useAuth();
  const { darkMode, setDarkMode } = useTheme();
  
  const [notifications, setNotifications] = useState(true);
  const [autoSync, setAutoSync] = useState(true);
  const [biometric, setBiometric] = useState(false);

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: () => {
            logout();
            navigation.reset({
              index: 0,
              routes: [{ name: 'Auth' }],
            });
          }
        }
      ]
    );
  };

  const handleChangePassword = () => {
    Alert.alert('Change Password', 'Password change functionality would be implemented here');
  };

  const handleExportData = () => {
    Alert.alert('Export Data', 'Data export functionality would be implemented here');
  };

  const handleClearCache = () => {
    Alert.alert(
      'Clear Cache',
      'Are you sure you want to clear all cached data?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear', 
          onPress: () => {
            Alert.alert('Success', 'Cache cleared successfully');
          }
        }
      ]
    );
  };

  const handleAbout = () => {
    Alert.alert(
      'About Wrap N\' Track',
      'Version 1.0.0\n\nA comprehensive inventory and order management system for mobile devices.\n\n© 2024 Wrap N\' Track. All rights reserved.'
    );
  };

  const renderUserProfile = () => (
    <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
      <Card.Content>
        <View style={styles.profileHeader}>
          <View style={[styles.avatar, { backgroundColor: theme.colors.primary }]}>
            <MaterialCommunityIcons name="account" size={32} color="#fff" />
          </View>
          <View style={styles.profileInfo}>
            <Text style={[styles.userName, { color: theme.colors.onSurface }]}>
              {user?.name || 'Employee User'}
            </Text>
            <Text style={[styles.userRole, { color: theme.colors.onSurfaceVariant }]}>
              {user?.role || 'Employee'}
            </Text>
            <Text style={[styles.userEmail, { color: theme.colors.onSurfaceVariant }]}>
              {user?.email || 'user@example.com'}
            </Text>
          </View>
        </View>
      </Card.Content>
    </Card>
  );

  const renderAppearanceSettings = () => (
    <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
      <Card.Content>
        <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
          Appearance
        </Text>
        
        <List.Item
          title="Dark Mode"
          description="Switch between light and dark themes"
          left={(props) => <List.Icon {...props} icon="theme-light-dark" />}
          right={() => (
            <Switch
              value={darkMode}
              onValueChange={toggleDarkMode}
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={darkMode ? '#f5dd4b' : '#f4f3f4'}
            />
          )}
        />
      </Card.Content>
    </Card>
  );

  const renderNotificationSettings = () => (
    <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
      <Card.Content>
        <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
          Notifications
        </Text>
        
        <List.Item
          title="Push Notifications"
          description="Receive notifications for orders and updates"
          left={(props) => <List.Icon {...props} icon="bell" />}
          right={() => (
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={notifications ? '#f5dd4b' : '#f4f3f4'}
            />
          )}
        />
        
        <List.Item
          title="Auto Sync"
          description="Automatically sync data in background"
          left={(props) => <List.Icon {...props} icon="sync" />}
          right={() => (
            <Switch
              value={autoSync}
              onValueChange={setAutoSync}
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={autoSync ? '#f5dd4b' : '#f4f3f4'}
            />
          )}
        />
      </Card.Content>
    </Card>
  );

  const renderSecuritySettings = () => (
    <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
      <Card.Content>
        <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
          Security
        </Text>
        
        <List.Item
          title="Change Password"
          description="Update your account password"
          left={(props) => <List.Icon {...props} icon="key" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={handleChangePassword}
        />
        
        <List.Item
          title="Biometric Login"
          description="Use fingerprint or face recognition"
          left={(props) => <List.Icon {...props} icon="fingerprint" />}
          right={() => (
            <Switch
              value={biometric}
              onValueChange={setBiometric}
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={biometric ? '#f5dd4b' : '#f4f3f4'}
            />
          )}
        />
      </Card.Content>
    </Card>
  );

  const renderDataSettings = () => (
    <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
      <Card.Content>
        <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
          Data & Storage
        </Text>
        
        <List.Item
          title="Export Data"
          description="Download your data as CSV or PDF"
          left={(props) => <List.Icon {...props} icon="download" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={handleExportData}
        />
        
        <List.Item
          title="Clear Cache"
          description="Free up storage space"
          left={(props) => <List.Icon {...props} icon="delete-sweep" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={handleClearCache}
        />
      </Card.Content>
    </Card>
  );

  const renderSupportSettings = () => (
    <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
      <Card.Content>
        <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
          Support
        </Text>
        
        <List.Item
          title="Help & FAQ"
          description="Get help and find answers"
          left={(props) => <List.Icon {...props} icon="help-circle" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => Alert.alert('Help', 'Help functionality would be implemented here')}
        />
        
        <List.Item
          title="Contact Support"
          description="Get in touch with our team"
          left={(props) => <List.Icon {...props} icon="message" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => Alert.alert('Contact', 'Contact support functionality would be implemented here')}
        />
        
        <List.Item
          title="About"
          description="App version and information"
          left={(props) => <List.Icon {...props} icon="information" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={handleAbout}
        />
      </Card.Content>
    </Card>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.colors.primary }]}>
          <Text style={[styles.headerTitle, { color: theme.colors.onPrimary }]}>
            Settings
          </Text>
          <Text style={[styles.headerSubtitle, { color: theme.colors.onPrimary }]}>
            Manage your app preferences
          </Text>
        </View>

        {/* User Profile */}
        {renderUserProfile()}

        {/* Appearance Settings */}
        {renderAppearanceSettings()}

        {/* Notification Settings */}
        {renderNotificationSettings()}

        {/* Security Settings */}
        {renderSecuritySettings()}

        {/* Data Settings */}
        {renderDataSettings()}

        {/* Support Settings */}
        {renderSupportSettings()}

        {/* Logout Button */}
        <View style={styles.section}>
          <Button
            mode="contained"
            onPress={handleLogout}
            style={[styles.logoutButton, { backgroundColor: '#F44336' }]}
            icon="logout"
          >
            Logout
          </Button>
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
  header: {
    padding: 20,
    paddingTop: 40,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    fontSize: 16,
    marginTop: 4,
  },
  section: {
    padding: 16,
  },
  card: {
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  userRole: {
    fontSize: 14,
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  logoutButton: {
    marginTop: 16,
  },
});
