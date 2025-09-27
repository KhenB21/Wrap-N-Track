import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../Context/AuthContext';
import { useTheme } from '../Context/ThemeContext';
import Header from '../Components/Header';

const { width } = Dimensions.get('window');

export default function DashboardScreen({ navigation }) {
  const { user, logout, isEmployee } = useAuth();
  const { darkMode } = useTheme();

  const colors = {
    bg: darkMode ? '#18191A' : '#fff',
    card: darkMode ? '#242526' : '#fff',
    text: darkMode ? '#E4E6EB' : '#6B6593',
    subText: darkMode ? '#B0B3B8' : '#6B6593',
    border: darkMode ? '#3A3B3C' : '#C7C5D1',
    accent: '#6B6593',
    button: darkMode ? '#393A3B' : '#6B6593',
    buttonText: '#E4E6EB',
  };

  const handleLogout = async () => {
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
  };

  const dashboardItems = [
    {
      id: 1,
      title: 'Inventory Management',
      icon: 'package-variant',
      description: 'Manage product inventory',
      onPress: () => navigation.navigate('Inventory'),
    },
    {
      id: 2,
      title: 'Order Management',
      icon: 'clipboard-list',
      description: 'View and manage orders',
      onPress: () => navigation.navigate('Orders'),
    },
    {
      id: 3,
      title: 'Customer Management',
      icon: 'account-group',
      description: 'Manage customer accounts',
      onPress: () => navigation.navigate('Customers'),
    },
    {
      id: 4,
      title: 'Reports',
      icon: 'chart-line',
      description: 'View business reports',
      onPress: () => navigation.navigate('Reports'),
    },
    {
      id: 5,
      title: 'Settings',
      icon: 'cog',
      description: 'App settings and preferences',
      onPress: () => navigation.navigate('Settings'),
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <Header
        showMenu={false}
        showCart={false}
        logoType="image"
        darkMode={darkMode}
        title="Dashboard"
      />
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Welcome Section */}
        <View style={[styles.welcomeCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.welcomeContent}>
            <View>
              <Text style={[styles.welcomeTitle, { color: colors.text }]}>
                Welcome back, {user?.name || 'User'}!
              </Text>
              <Text style={[styles.welcomeSubtitle, { color: colors.subText }]}>
                {isEmployee() ? `Role: ${user?.role || 'Employee'}` : 'Customer Dashboard'}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.logoutButton, { backgroundColor: colors.accent }]}
              onPress={handleLogout}
            >
              <MaterialCommunityIcons name="logout" size={20} color={colors.buttonText} />
              <Text style={[styles.logoutText, { color: colors.buttonText }]}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Dashboard Items */}
        <View style={styles.dashboardGrid}>
          {dashboardItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.dashboardCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={item.onPress}
            >
              <View style={[styles.iconContainer, { backgroundColor: colors.accent }]}>
                <MaterialCommunityIcons name={item.icon} size={24} color={colors.buttonText} />
              </View>
              <Text style={[styles.cardTitle, { color: colors.text }]}>{item.title}</Text>
              <Text style={[styles.cardDescription, { color: colors.subText }]}>
                {item.description}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Quick Stats (Placeholder) */}
        <View style={[styles.statsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.statsTitle, { color: colors.text }]}>Quick Stats</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: colors.accent }]}>0</Text>
              <Text style={[styles.statLabel, { color: colors.subText }]}>Pending Orders</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: colors.accent }]}>0</Text>
              <Text style={[styles.statLabel, { color: colors.subText }]}>Low Stock Items</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: colors.accent }]}>0</Text>
              <Text style={[styles.statLabel, { color: colors.subText }]}>New Customers</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  welcomeCard: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  welcomeContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  welcomeSubtitle: {
    fontSize: 14,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  logoutText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '600',
  },
  dashboardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  dashboardCard: {
    width: (width - 48) / 2,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 12,
    lineHeight: 16,
  },
  statsCard: {
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
});
