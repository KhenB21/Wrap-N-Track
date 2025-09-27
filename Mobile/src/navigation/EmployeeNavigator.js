import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import CustomDrawerContent from '../Components/CustomDrawerContent';

// Import screens
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

// Import contexts for role-based access
import { useAuth } from '../Context/AuthContext';

const Drawer = createDrawerNavigator();
const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Inventory Stack Navigator
function InventoryStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: '#2E7D32' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' }
      }}
    >
      <Stack.Screen 
        name="InventoryList" 
        component={InventoryListScreen}
        options={{ title: 'Inventory Management' }}
      />
      <Stack.Screen 
        name="InventoryDetail" 
        component={InventoryDetailScreen}
        options={{ title: 'Product Details' }}
      />
      <Stack.Screen 
        name="AddProduct" 
        component={AddProductScreen}
        options={{ title: 'Add Product' }}
      />
      <Stack.Screen 
        name="EditProduct" 
        component={EditProductScreen}
        options={{ title: 'Edit Product' }}
      />
    </Stack.Navigator>
  );
}

// Orders Stack Navigator
function OrdersStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: '#1976D2' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' }
      }}
    >
      <Stack.Screen 
        name="OrderList" 
        component={OrderListScreen}
        options={{ title: 'Order Management' }}
      />
      <Stack.Screen 
        name="OrderDetail" 
        component={OrderDetailScreen}
        options={{ title: 'Order Details' }}
      />
      <Stack.Screen 
        name="OrderStatusUpdate" 
        component={OrderStatusUpdateScreen}
        options={{ title: 'Update Status' }}
      />
    </Stack.Navigator>
  );
}

// Customers Stack Navigator
function CustomersStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: '#FF6F00' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' }
      }}
    >
      <Stack.Screen 
        name="CustomerList" 
        component={CustomerListScreen}
        options={{ title: 'Customer Management' }}
      />
      <Stack.Screen 
        name="CustomerDetail" 
        component={CustomerDetailScreen}
        options={{ title: 'Customer Details' }}
      />
      <Stack.Screen 
        name="AddEditCustomer" 
        component={AddEditCustomerScreen}
        options={{ title: 'Customer Details' }}
      />
    </Stack.Navigator>
  );
}

// Suppliers Stack Navigator
function SuppliersStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: '#7B1FA2' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' }
      }}
    >
      <Stack.Screen 
        name="SupplierList" 
        component={SupplierListScreen}
        options={{ title: 'Supplier Management' }}
      />
      <Stack.Screen 
        name="SupplierDetail" 
        component={SupplierDetailScreen}
        options={{ title: 'Supplier Details' }}
      />
      <Stack.Screen 
        name="AddEditSupplier" 
        component={AddEditSupplierScreen}
        options={{ title: 'Supplier Details' }}
      />
    </Stack.Navigator>
  );
}

// Reports Stack Navigator
function ReportsStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: '#D32F2F' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' }
      }}
    >
      <Stack.Screen 
        name="ReportsHome" 
        component={ReportsHomeScreen}
        options={{ title: 'Reports' }}
      />
      <Stack.Screen 
        name="SalesReport" 
        component={SalesReportScreen}
        options={{ title: 'Sales Report' }}
      />
      <Stack.Screen 
        name="InventoryReport" 
        component={InventoryReportScreen}
        options={{ title: 'Inventory Report' }}
      />
    </Stack.Navigator>
  );
}

// Main Employee Navigator with Role-Based Access
export default function EmployeeNavigator() {
  const { user } = useAuth();
  const role = user?.role || 'default';

  // Define permissions for each role
  const permissions = {
    super_admin: {
      dashboard: true, inventory: true, orders: true, reports: true, 
      customers: true, suppliers: true, accountManagement: true
    },
    admin: {
      dashboard: true, inventory: true, orders: true, reports: true, 
      customers: true, suppliers: true, accountManagement: true
    },
    director: {
      dashboard: true, inventory: true, orders: true, reports: true, 
      customers: true, suppliers: true, accountManagement: true
    },
    business_developer: {
      dashboard: true, inventory: false, orders: true, reports: true, 
      customers: true, suppliers: false, accountManagement: false
    },
    creatives: {
      dashboard: true, inventory: true, orders: false, reports: true, 
      customers: false, suppliers: false, accountManagement: false
    },
    sales_manager: {
      dashboard: true, inventory: true, orders: true, reports: true, 
      customers: true, suppliers: true, accountManagement: false
    },
    assistant_sales: {
      dashboard: true, inventory: true, orders: true, reports: true, 
      customers: true, suppliers: false, accountManagement: false
    },
    packer: {
      dashboard: true, inventory: true, orders: true, reports: true, 
      customers: false, suppliers: false, accountManagement: false,
      readOnly: true
    },
    operations_manager: {
      dashboard: true, inventory: true, orders: true, reports: true, 
      customers: true, suppliers: true, accountManagement: false
    },
    social_media_manager: {
      dashboard: true, inventory: false, orders: true, reports: true, 
      customers: true, suppliers: false, accountManagement: false
    },
    default: {
      dashboard: true, inventory: true, orders: true, reports: true, 
      customers: true, suppliers: true, accountManagement: false
    }
  };

  const userPermissions = permissions[role] || permissions.default;

  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerStyle: {
          backgroundColor: '#696a8f',
          width: 280,
        },
        drawerActiveTintColor: '#fff',
        drawerInactiveTintColor: '#ecf0f1',
        drawerLabelStyle: {
          fontSize: 16,
          fontWeight: '500',
        },
      }}
    >
      {userPermissions.dashboard && (
        <Drawer.Screen
          name="Dashboard"
          component={DashboardScreen}
          options={{
            drawerIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="view-dashboard" size={size} color={color} />
            ),
            drawerLabel: 'Dashboard',
          }}
        />
      )}

      {userPermissions.inventory && (
        <Drawer.Screen
          name="Inventory"
          component={InventoryStackNavigator}
          options={{
            drawerIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="package-variant" size={size} color={color} />
            ),
            drawerLabel: 'Inventory',
          }}
        />
      )}

      {userPermissions.orders && (
        <Drawer.Screen
          name="Orders"
          component={OrdersStackNavigator}
          options={{
            drawerIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="shopping" size={size} color={color} />
            ),
            drawerLabel: 'Orders',
          }}
        />
      )}

      {userPermissions.customers && (
        <Drawer.Screen
          name="Customers"
          component={CustomersStackNavigator}
          options={{
            drawerIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="account-group" size={size} color={color} />
            ),
            drawerLabel: 'Customers',
          }}
        />
      )}

      {userPermissions.suppliers && (
        <Drawer.Screen
          name="Suppliers"
          component={SuppliersStackNavigator}
          options={{
            drawerIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="truck-delivery" size={size} color={color} />
            ),
            drawerLabel: 'Suppliers',
          }}
        />
      )}

      {userPermissions.reports && (
        <Drawer.Screen
          name="Reports"
          component={ReportsStackNavigator}
          options={{
            drawerIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="chart-line" size={size} color={color} />
            ),
            drawerLabel: 'Reports',
          }}
        />
      )}

      <Drawer.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          drawerIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="cog" size={size} color={color} />
          ),
          drawerLabel: 'Settings',
        }}
      />
    </Drawer.Navigator>
  );
}
