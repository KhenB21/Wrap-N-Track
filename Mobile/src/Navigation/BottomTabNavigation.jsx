import { View, Text, Platform, TouchableOpacity } from 'react-native'
import React from 'react'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import Ionicons from "react-native-vector-icons/Ionicons";
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import DashboardScreen from '../Screens/BottomTabNavigation/DashboardScreen';
import InventoryScreen from '../Screens/BottomTabNavigation/InventoryScreen';
import SalesScreen from '../Screens/BottomTabNavigation/SalesScreen';
import ReportsScreen from '../Screens/BottomTabNavigation/ReportsScreen';
import { useTheme } from '../Screens/DrawerNavigation/ThemeContect';

const BottomTabNavigation = () => {
    const Tab = createBottomTabNavigator();
    const { themeStyles } = useTheme();

    return (
        <Tab.Navigator
            initialRouteName='Dashboard'
            screenOptions={{
                headerShown: false,
                tabBarShowLabel: false,
                tabBarStyle: {
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    left: 0,
                    elevation: 0,
                    height: Platform.OS === 'ios' ? 90 : 60,
                    backgroundColor: themeStyles.containerColor,
                    borderTopWidth: 1,
                    borderTopColor: '#E6E6F0',
                },
                tabBarItemStyle: {
                    height: 50,
                    width: 80,
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginTop: 10
                },
                tabBarActiveTintColor: '#6B6593',
                tabBarInactiveTintColor: '#888888',
            }}
        >
            <Tab.Screen 
                name='Dashboard' 
                component={DashboardScreen}
                initialParams={{pageTitle: 'Dashboard'}}
                options={{
                    title: "Dashboard",
                    tabBarIcon: ({ focused, color, size }) => (                       
                        <MaterialCommunityIcons 
                            name={focused ? "view-dashboard" : "view-dashboard-outline"} 
                            size={24} 
                            color={color} 
                        />                            
                    ),
                }}
            />
            <Tab.Screen 
                name='Inventory' 
                component={InventoryScreen}
                initialParams={{pageTitle: 'Inventory'}}
                options={{
                    title: "Inventory",
                    tabBarIcon: ({ focused, color, size }) => (
                        <MaterialCommunityIcons 
                            name={focused ? "package-variant" : "package-variant-closed"}
                            size={24} 
                            color={color} 
                        />
                    ),
                }}
            />
            <Tab.Screen 
                name='Sales' 
                component={SalesScreen}
                initialParams={{pageTitle: 'Sales'}}
                options={{
                    title: "Sales",
                    tabBarIcon: ({ focused, color, size }) => (
                        <MaterialCommunityIcons 
                            name={focused ? "cart" : "cart-outline"}
                            size={24} 
                            color={color} 
                        />
                    ),
                }}
            />
            <Tab.Screen 
                name='Reports' 
                component={ReportsScreen}
                initialParams={{pageTitle: 'Reports'}}
                options={{
                    title: "Reports",
                    tabBarIcon: ({ focused, color, size }) => (
                        <MaterialCommunityIcons 
                            name={focused ? "chart-bar" : "chart-bar-stacked"}
                            size={24} 
                            color={color} 
                        />
                    ),
                }}
            />
        </Tab.Navigator>
    )
}

export default BottomTabNavigation;