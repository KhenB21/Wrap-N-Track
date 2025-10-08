import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../Context/AuthContext';
import { useTheme } from '../Context/ThemeContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Import screens
import SplashScreen from '../Screens/SplashScreen';
import LoginScreen from '../Screens/LoginScreen';
import SignUpScreen from '../Screens/SignUpScreen';

// Customer screens
import HomeScreen from '../Screens/HomeScreen';
import ProductCatalogScreen from '../Screens/ProductCatalogScreen';
import ProductDetailScreen from '../Screens/ProductDetailScreen';
import MyCartScreen from '../Screens/MyCartScreen';
import CheckoutScreen from '../Screens/CheckoutScreen';
import OrderTrackingScreen from '../Screens/OrderTrackingScreen';
import OrderHistoryScreen from '../Screens/OrderHistoryScreen';
import ProfileScreen from '../Screens/ProfileScreen';

// Employee screens
import DashboardScreen from '../Screens/DashboardScreen';
import InventoryManagementScreen from '../Screens/InventoryManagementScreen';
import OrderManagementScreen from '../Screens/OrderManagementScreen';
import CustomerManagementScreen from '../Screens/CustomerManagementScreen';
import SupplierManagementScreen from '../Screens/SupplierManagementScreen';
import ReportsScreen from '../Screens/ReportsScreen';
import SettingsScreen from '../Screens/SettingsScreen';

// Import employee navigator
import SimpleEmployeeNavigator from './SimpleEmployeeNavigator';

// Shared screens
import ItemPreviewScreen from '../Screens/ItemPreviewScreen';
import CreateGiftScreen from '../Screens/CreateGiftScreen';
import DeliveryTrackingScreen from '../Screens/DeliveryTrackingScreen';
import OrderedItemsScreen from '../Screens/OrderedItemsScreen';
import OrderSummaryScreen from '../Screens/OrderSummaryScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Customer Tab Navigator
function CustomerTabNavigator() {
  const { darkMode } = useTheme();
  
  const colors = {
    tabBarActiveTintColor: '#6B6593',
    tabBarInactiveTintColor: darkMode ? '#B0B3B8' : '#6B6593',
    tabBarStyle: {
      backgroundColor: darkMode ? '#242526' : '#fff',
      borderTopColor: darkMode ? '#3A3B3C' : '#C7C5D1',
    },
  };

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          switch (route.name) {
            case 'Home':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'Catalog':
              iconName = focused ? 'view-grid' : 'view-grid-outline';
              break;
            case 'Cart':
              iconName = focused ? 'cart' : 'cart-outline';
              break;
            case 'Orders':
              iconName = focused ? 'clipboard-list' : 'clipboard-list-outline';
              break;
            case 'Profile':
              iconName = focused ? 'account' : 'account-outline';
              break;
            default:
              iconName = 'circle';
          }

          return <MaterialCommunityIcons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.tabBarActiveTintColor,
        tabBarInactiveTintColor: colors.tabBarInactiveTintColor,
        tabBarStyle: colors.tabBarStyle,
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Catalog" component={ProductCatalogScreen} />
      <Tab.Screen name="Cart" component={MyCartScreen} />
      <Tab.Screen name="Orders" component={OrderHistoryScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

// Employee Tab Navigator
function EmployeeTabNavigator() {
  const { darkMode } = useTheme();
  
  const colors = {
    tabBarActiveTintColor: '#6B6593',
    tabBarInactiveTintColor: darkMode ? '#B0B3B8' : '#6B6593',
    tabBarStyle: {
      backgroundColor: darkMode ? '#242526' : '#fff',
      borderTopColor: darkMode ? '#3A3B3C' : '#C7C5D1',
    },
  };

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          switch (route.name) {
            case 'Dashboard':
              iconName = focused ? 'view-dashboard' : 'view-dashboard-outline';
              break;
            case 'Inventory':
              iconName = focused ? 'package-variant' : 'package-variant-outline';
              break;
            case 'Orders':
              iconName = focused ? 'clipboard-list' : 'clipboard-list-outline';
              break;
            case 'Customers':
              iconName = focused ? 'account-group' : 'account-group-outline';
              break;
            case 'Reports':
              iconName = focused ? 'chart-line' : 'chart-line-outline';
              break;
            default:
              iconName = 'circle';
          }

          return <MaterialCommunityIcons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.tabBarActiveTintColor,
        tabBarInactiveTintColor: colors.tabBarInactiveTintColor,
        tabBarStyle: colors.tabBarStyle,
        headerShown: false,
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Inventory" component={InventoryManagementScreen} />
      <Tab.Screen name="Orders" component={OrderManagementScreen} />
      <Tab.Screen name="Customers" component={CustomerManagementScreen} />
      <Tab.Screen name="Reports" component={ReportsScreen} />
    </Tab.Navigator>
  );
}

// Main Stack Navigator
function MainStackNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Login"
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
      <Stack.Screen name="ItemPreview" component={ItemPreviewScreen} />
      <Stack.Screen name="CreateGift" component={CreateGiftScreen} />
      <Stack.Screen name="DeliveryTracking" component={DeliveryTrackingScreen} />
      <Stack.Screen name="OrderedItems" component={OrderedItemsScreen} />
      <Stack.Screen name="OrderSummary" component={OrderSummaryScreen} />
      <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
      <Stack.Screen name="Checkout" component={CheckoutScreen} />
      <Stack.Screen name="OrderTracking" component={OrderTrackingScreen} />
      <Stack.Screen name="SupplierManagement" component={SupplierManagementScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
    </Stack.Navigator>
  );
}

// Main App Navigator
export default function AppNavigator() {
  const { isAuthenticated, userType, loading } = useAuth();

  // Show splash screen while loading
  if (loading) {
    return <SplashScreen />;
  }

  // Show auth screens if not authenticated
  if (!isAuthenticated) {
    return <MainStackNavigator />;
  }

  // Show customer screens if customer
  if (userType === 'customer') {
    return <CustomerTabNavigator />;
  }

  // Show employee screens if employee (default)
  return <SimpleEmployeeNavigator />;
}
