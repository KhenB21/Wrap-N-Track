import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../Context/AuthContext';
import { useTheme } from '../Context/ThemeContext';

const CustomDrawerContent = (props) => {
  const { navigation } = props;
  const { user, logout } = useAuth();
  const { colors = {}, darkMode } = useTheme();
  const [reportsOpen, setReportsOpen] = useState(false);

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: () => {
            logout();
            navigation.navigate('Login');
          },
        },
      ]
    );
  };

  const role = user ? user.role : null;

  // Define permissions for each role (same as website)
  const rolePermissions = {
    super_admin: {
      dashboard: true, inventory: true, orders: true, reports: true, customers: true, suppliers: true, orderHistory: true, accountManagement: true,
    },
    admin: {
      dashboard: true, inventory: true, orders: true, reports: true, customers: true, suppliers: true, orderHistory: true, accountManagement: true,
    },
    director: {
      dashboard: true, inventory: true, orders: true, reports: true, customers: true, suppliers: true, orderHistory: true, accountManagement: true,
    },
    business_developer: {
      dashboard: true, inventory: false, orders: true, reports: true, customers: true, suppliers: false, orderHistory: true, accountManagement: false,
    },
    creatives: {
      dashboard: true, inventory: true, orders: false, reports: true, customers: false, suppliers: false, orderHistory: false, accountManagement: false,
    },
    sales_manager: {
      dashboard: true, inventory: true, orders: true, reports: true, customers: true, suppliers: true, orderHistory: true, accountManagement: false,
    },
    assistant_sales: {
      dashboard: true, inventory: true, orders: true, reports: true, customers: true, suppliers: false, orderHistory: false, accountManagement: false,
    },
    packer: {
      dashboard: true, inventory: true, orders: true, reports: true, customers: false, suppliers: false, orderHistory: true, accountManagement: false,
      readOnly: true,
    },
    operations_manager: {
      dashboard: true, inventory: true, orders: true, reports: true, customers: true, suppliers: true, orderHistory: true, accountManagement: false,
    },
    social_media_manager: {
      dashboard: true, inventory: false, orders: true, reports: true, customers: true, suppliers: false, orderHistory: true, accountManagement: false,
    },
    default: {
      dashboard: true, inventory: true, orders: true, reports: true, customers: true, suppliers: true, orderHistory: true, accountManagement: false,
    }
  };

  const permissions = role ? (rolePermissions[role] || rolePermissions.default) : {};

  const menuItems = [
    {
      id: 'dashboard',
      title: 'Dashboard',
      icon: 'chart-line',
      screen: 'Dashboard',
      permission: permissions.dashboard,
    },
    {
      id: 'inventory',
      title: 'Inventory',
      icon: 'package-variant',
      screen: 'Inventory',
      permission: permissions.inventory,
    },
    {
      id: 'orders',
      title: 'Orders',
      icon: 'currency-usd',
      screen: 'Orders',
      permission: permissions.orders,
    },
    {
      id: 'reports',
      title: 'Reports',
      icon: 'chart-bar',
      screen: null, // This is a dropdown
      permission: permissions.reports,
      isDropdown: true,
      subItems: [
        {
          id: 'sales-reports',
          title: 'Sales Reports',
          icon: 'chart-line',
          screen: 'SalesReport',
        },
        {
          id: 'inventory-reports',
          title: 'Inventory Reports',
          icon: 'package-variant',
          screen: 'InventoryReport',
        },
      ],
    },
    {
      id: 'customers',
      title: 'Customers',
      icon: 'account-group',
      screen: 'Customers',
      permission: permissions.customers,
    },
    {
      id: 'suppliers',
      title: 'Suppliers',
      icon: 'factory',
      screen: 'Suppliers',
      permission: permissions.suppliers,
    },
    {
      id: 'order-history',
      title: 'Order History',
      icon: 'history',
      screen: 'OrderHistory',
      permission: permissions.orderHistory,
    },
    {
      id: 'account-management',
      title: 'Account Management',
      icon: 'account-cog',
      screen: 'AccountManagement',
      permission: permissions.accountManagement,
    },
    {
      id: 'website',
      title: 'Go to website',
      icon: 'web',
      screen: 'Website',
      permission: true, // Always show
    },
  ];

  const renderMenuItem = (item) => {
    if (!item.permission) return null;

    if (item.isDropdown) {
      return (
        <View key={item.id}>
          <TouchableOpacity
            style={[styles.menuItem, { borderBottomColor: colors.border }]}
            onPress={() => setReportsOpen(!reportsOpen)}
          >
            <MaterialCommunityIcons
              name={item.icon}
              size={24}
              color={colors.text}
              style={styles.menuIcon}
            />
            <Text style={[styles.menuText, { color: colors.text }]}>
              {item.title}
            </Text>
            <MaterialCommunityIcons
              name={reportsOpen ? 'chevron-down' : 'chevron-right'}
              size={20}
              color={colors.text}
            />
          </TouchableOpacity>
          {reportsOpen && (
            <View style={styles.subMenu}>
              {item.subItems.map((subItem) => (
                <TouchableOpacity
                  key={subItem.id}
                  style={[styles.subMenuItem, { borderBottomColor: colors.border }]}
                  onPress={() => {
                    navigation.navigate(subItem.screen);
                    setReportsOpen(false);
                  }}
                >
                  <MaterialCommunityIcons
                    name={subItem.icon}
                    size={20}
                    color={colors.subText}
                    style={styles.subMenuIcon}
                  />
                  <Text style={[styles.subMenuText, { color: colors.subText }]}>
                    {subItem.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      );
    }

    return (
      <TouchableOpacity
        key={item.id}
        style={[styles.menuItem, { borderBottomColor: colors.border }]}
        onPress={() => navigation.navigate(item.screen)}
      >
        <MaterialCommunityIcons
          name={item.icon}
          size={24}
          color={colors.text}
          style={styles.menuIcon}
        />
        <Text style={[styles.menuText, { color: colors.text }]}>
          {item.title}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.sidebar || '#696a8f' }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.logoContainer}>
          <Image
            source={require('../Images/Logo/pensee-logo-with-name-vertical.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
        <Text style={[styles.headerTitle, { color: colors.buttonText }]}>
          Wrap N' Track
        </Text>
      </View>

      {/* User Profile Section */}
      <View style={[styles.userSection, { borderBottomColor: colors.border }]}>
        <View style={styles.userInfo}>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <MaterialCommunityIcons
              name="account"
              size={32}
              color={colors.buttonText}
            />
          </View>
          <View style={styles.userDetails}>
            <Text style={[styles.userName, { color: colors.buttonText }]}>
              {user?.name || 'Employee'}
            </Text>
            <Text style={[styles.userRole, { color: colors.subText }]}>
              {user?.role?.replace('_', ' ').toUpperCase() || 'USER'}
            </Text>
          </View>
        </View>
      </View>

      {/* Navigation Menu */}
      <ScrollView style={styles.menuContainer} showsVerticalScrollIndicator={false}>
        {menuItems.map(renderMenuItem)}
      </ScrollView>

      {/* Footer with Logout */}
      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.logoutButton, { backgroundColor: colors.error || '#e74c3c' }]}
          onPress={handleLogout}
        >
          <MaterialCommunityIcons
            name="logout"
            size={24}
            color={colors.buttonText}
            style={styles.logoutIcon}
          />
          <Text style={[styles.logoutText, { color: colors.buttonText }]}>
            Log Out
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#696a8f',
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  logoContainer: {
    marginBottom: 10,
  },
  logo: {
    width: 60,
    height: 60,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  userSection: {
    padding: 15,
    borderBottomWidth: 1,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#4a4a6a',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 2,
  },
  userRole: {
    fontSize: 12,
    color: '#ecf0f1',
    textTransform: 'uppercase',
  },
  menuContainer: {
    flex: 1,
    paddingTop: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  menuIcon: {
    marginRight: 15,
  },
  menuText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#ecf0f1',
    flex: 1,
  },
  subMenu: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  subMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    paddingLeft: 50,
    borderBottomWidth: 1,
  },
  subMenuIcon: {
    marginRight: 15,
  },
  subMenuText: {
    fontSize: 14,
    color: '#bdc3c7',
    flex: 1,
  },
  footer: {
    padding: 15,
    borderTopWidth: 1,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#e74c3c',
  },
  logoutIcon: {
    marginRight: 10,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
});

export default CustomDrawerContent;
