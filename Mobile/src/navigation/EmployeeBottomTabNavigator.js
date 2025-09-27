import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../Context/ThemeContext';
import { useAuth } from '../Context/AuthContext';

// Import Employee Screens
import DashboardScreen from '../Screens/Employee/DashboardScreen';
import InventoryListScreen from '../Screens/Employee/InventoryListScreen';
import InventoryDetailScreen from '../Screens/Employee/InventoryDetailScreen';
import AddProductScreen from '../Screens/Employee/AddProductScreen';
import EditProductScreen from '../Screens/Employee/EditProductScreen';
import OrderListScreen from '../Screens/Employee/OrderListScreen';
import OrderDetailScreen from '../Screens/Employee/OrderDetailScreen';
import OrderStatusUpdateScreen from '../Screens/Employee/OrderStatusUpdateScreen';
import CustomerListScreen from '../Screens/Employee/CustomerListScreen';
import CustomerDetailScreen from '../Screens/Employee/CustomerDetailScreen';
import AddEditCustomerScreen from '../Screens/Employee/AddEditCustomerScreen';
import SupplierListScreen from '../Screens/Employee/SupplierListScreen';
import SupplierDetailScreen from '../Screens/Employee/SupplierDetailScreen';
import AddEditSupplierScreen from '../Screens/Employee/AddEditSupplierScreen';
import ReportsHomeScreen from '../Screens/Employee/ReportsHomeScreen';
import SalesReportScreen from '../Screens/Employee/SalesReportScreen';
import InventoryReportScreen from '../Screens/Employee/InventoryReportScreen';
import SettingsScreen from '../Screens/Employee/SettingsScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Stack Navigators for each main section
function InventoryStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="InventoryList" component={InventoryListScreen} />
      <Stack.Screen name="InventoryDetail" component={InventoryDetailScreen} />
      <Stack.Screen name="AddProduct" component={AddProductScreen} />
      <Stack.Screen name="EditProduct" component={EditProductScreen} />
    </Stack.Navigator>
  );
}

function OrdersStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="OrderList" component={OrderListScreen} />
      <Stack.Screen name="OrderDetail" component={OrderDetailScreen} />
      <Stack.Screen name="OrderStatusUpdate" component={OrderStatusUpdateScreen} />
    </Stack.Navigator>
  );
}

function CustomersStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CustomerList" component={CustomerListScreen} />
      <Stack.Screen name="CustomerDetail" component={CustomerDetailScreen} />
      <Stack.Screen name="AddEditCustomer" component={AddEditCustomerScreen} />
    </Stack.Navigator>
  );
}

function SuppliersStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SupplierList" component={SupplierListScreen} />
      <Stack.Screen name="SupplierDetail" component={SupplierDetailScreen} />
      <Stack.Screen name="AddEditSupplier" component={AddEditSupplierScreen} />
    </Stack.Navigator>
  );
}

function ReportsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ReportsHome" component={ReportsHomeScreen} />
      <Stack.Screen name="SalesReport" component={SalesReportScreen} />
      <Stack.Screen name="InventoryReport" component={InventoryReportScreen} />
    </Stack.Navigator>
  );
}

export default function EmployeeBottomTabNavigator() {
  const { colors = {}, darkMode } = useTheme();
  const { user } = useAuth();

  const role = user ? user.role : null;

  // Define permissions for each role (same as website)
  const rolePermissions = {
    super_admin: {
      dashboard: true, inventory: true, orders: true, reports: true, customers: true, suppliers: true, settings: true,
    },
    admin: {
      dashboard: true, inventory: true, orders: true, reports: true, customers: true, suppliers: true, settings: true,
    },
    director: {
      dashboard: true, inventory: true, orders: true, reports: true, customers: true, suppliers: true, settings: true,
    },
    business_developer: {
      dashboard: true, inventory: false, orders: true, reports: true, customers: true, suppliers: false, settings: true,
    },
    creatives: {
      dashboard: true, inventory: true, orders: false, reports: true, customers: false, suppliers: false, settings: true,
    },
    sales_manager: {
      dashboard: true, inventory: true, orders: true, reports: true, customers: true, suppliers: true, settings: true,
    },
    assistant_sales: {
      dashboard: true, inventory: true, orders: true, reports: true, customers: true, suppliers: false, settings: true,
    },
    packer: {
      dashboard: true, inventory: true, orders: true, reports: true, customers: false, suppliers: false, settings: true,
    },
    operations_manager: {
      dashboard: true, inventory: true, orders: true, reports: true, customers: true, suppliers: true, settings: true,
    },
    social_media_manager: {
      dashboard: true, inventory: false, orders: true, reports: true, customers: true, suppliers: false, settings: true,
    },
    default: {
      dashboard: true, inventory: true, orders: true, reports: true, customers: true, suppliers: true, settings: true,
    }
  };

  const permissions = role ? (rolePermissions[role] || rolePermissions.default) : {};

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.subText,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
        tabBarIconStyle: {
          marginTop: 2,
        },
      })}
    >
      {permissions.dashboard && (
        <Tab.Screen
          name="Dashboard"
          component={DashboardScreen}
          options={{
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="chart-line" size={size} color={color} />
            ),
            tabBarLabel: 'Dashboard',
          }}
        />
      )}

      {permissions.inventory && (
        <Tab.Screen
          name="Inventory"
          component={InventoryStack}
          options={{
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="package-variant" size={size} color={color} />
            ),
            tabBarLabel: 'Inventory',
          }}
        />
      )}

      {permissions.orders && (
        <Tab.Screen
          name="Orders"
          component={OrdersStack}
          options={{
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="currency-usd" size={size} color={color} />
            ),
            tabBarLabel: 'Orders',
          }}
        />
      )}

      {permissions.customers && (
        <Tab.Screen
          name="Customers"
          component={CustomersStack}
          options={{
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="account-group" size={size} color={color} />
            ),
            tabBarLabel: 'Customers',
          }}
        />
      )}

      {permissions.reports && (
        <Tab.Screen
          name="Reports"
          component={ReportsStack}
          options={{
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="chart-bar" size={size} color={color} />
            ),
            tabBarLabel: 'Reports',
          }}
        />
      )}

      {permissions.settings && (
        <Tab.Screen
          name="Settings"
          component={SettingsScreen}
          options={{
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="cog" size={size} color={color} />
            ),
            tabBarLabel: 'Settings',
          }}
        />
      )}
    </Tab.Navigator>
  );
}
