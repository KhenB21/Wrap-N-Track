import React from 'react'
import 'react-native-gesture-handler';
import { createDrawerNavigator} from '@react-navigation/drawer';
import BottomTabNavigation from './BottomTabNavigation';
import CustomDrawerContent from '../Components/CustomDrawerContent';
import CustomersScreen from '../Screens/DrawerNavigation/CustomersScreen';
import SettingsScreen from '../Screens/DrawerNavigation/SettingsScreen';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import SuppliersScreen from '../Screens/DrawerNavigation/SuppliersScreen';
import NotificationsScreen from '../Screens/DrawerNavigation/NotificationsScreen';
import SupplierDetails from '../Screens/DrawerNavigation/SupplierDetails';
import CustomerDetails from '../Screens/DrawerNavigation/CustomerDetails';

const DrawerNavigation = () => {
    const Drawer = createDrawerNavigator();

    return (
        <Drawer.Navigator 
            drawerContent={(props) => <CustomDrawerContent {...props} />}
            initialRouteName='Home'
            screenOptions={{ 
                headerShown: false,
                drawerStyle: {
                    width: 250,
                    borderTopRightRadius: 0,
                    borderBottomRightRadius: 0,
                    backgroundColor: '#FDFDFD'
                },
                drawerItemStyle: {
                    borderRadius: 0,
                },
                drawerActiveTintColor: '#888888',
                drawerInactiveTintColor: '#888888'
            }}
        >
            <Drawer.Screen 
                name='Home' 
                component={BottomTabNavigation}
                options={{
                    drawerIcon: ({ focused, color, size }) => (                       
                        <MaterialCommunityIcons 
                            name={focused ? "home" : "home-outline"} 
                            size={20} 
                            color={'#888888'} 
                        />
                    ),
                }}
            />
            <Drawer.Screen 
                name='Customers' 
                initialParams={{pageTitle: 'Customers'}}
                component={CustomersScreen}
                options={{
                    drawerIcon: ({ focused, color, size }) => (                       
                        <MaterialCommunityIcons 
                            name={focused ? "account-box" : "account-box-outline"} 
                            size={20} 
                            color={'#888888'} 
                        />
                    )
                }}
            />
            <Drawer.Screen 
                name='Suppliers' 
                initialParams={{pageTitle: 'Suppliers'}}
                component={SuppliersScreen}
                options={{
                    drawerIcon: ({ focused, color, size }) => (                       
                        <MaterialCommunityIcons 
                            name={focused ? "cube" : "cube-outline"} 
                            size={20} 
                            color={'#888888'} 
                        />
                    )
                }}
            />
            <Drawer.Screen 
                name='Settings' 
                initialParams={{pageTitle: 'Settings'}}
                component={SettingsScreen}
                options={{
                    drawerIcon: ({ focused, color, size }) => (                       
                        <MaterialCommunityIcons 
                            name={focused ? "cog" : "cog-outline"} 
                            size={20} 
                            color={'#888888'} 
                        />
                    )
                }}
            />
            <Drawer.Screen
                name='Notifications'
                initialParams={{pageTitle: 'Notifications'}}
                component={NotificationsScreen}
                options={{
                    drawerItemStyle: {
                        display: 'none'
                    }
                }}
            />
            <Drawer.Screen
                name='SupplierDetails'
                initialParams={{pageTitle: 'SupplierDetails'}}
                component={SupplierDetails}
                options={{
                    drawerItemStyle: {
                        display: 'none'
                    }
                }}
            />
            <Drawer.Screen
                name='CustomerDetails'
                component={CustomerDetails}
                options={{
                    drawerItemStyle: {
                        display: 'none'
                    }
                }}
            />
        </Drawer.Navigator>
    )
}

export default DrawerNavigation;