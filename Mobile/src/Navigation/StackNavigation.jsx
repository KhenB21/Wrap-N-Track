import React from 'react'
import { createStackNavigator } from '@react-navigation/stack';
import DrawerNavigation from './DrawerNavigation';
import InventoryItemDetails from '../Screens/StackNavigation/InventoryItemDetails';
import InventoryForm from '../Screens/StackNavigation/InventoryForm';
import SalesForm from '../Screens/StackNavigation/SalesForm'
import OrderDetails from '../Screens/StackNavigation/OrderDetails'
import CustomerForm from '../Screens/StackNavigation/CustomerForm';
import SupplierForm from '../Screens/StackNavigation/SupplierForm';
import LoginScreen from '../Screens/StackNavigation/LoginScreen';
import SupplierOrderForm from '../Screens/StackNavigation/SupplierOrderForm'


const Navbar = () => {
    const Stack = createStackNavigator();

    return (
        <Stack.Navigator 
            screenOptions={{headerShown: false}}
            initialRouteName='Login'
        >
            <Stack.Screen name='Login' component={LoginScreen}/>
            <Stack.Screen name='Drawer' component={DrawerNavigation}/>
            <Stack.Screen name='InventoryItemDetails' component={InventoryItemDetails}/>
            <Stack.Screen name='InventoryForm' component={InventoryForm} initialParams={{pageTitle: 'New Item'}}/>
            <Stack.Screen name='CustomerForm' component={CustomerForm} initialParams={{pageTitle: 'New Customer'}}/>
            <Stack.Screen name='SupplierForm' component={SupplierForm} initialParams={{pageTitle: 'New Supplier'}}/>
            <Stack.Screen name='SalesForm' component={SalesForm} initialParams={{pageTitle: 'New Order'}}/>
            <Stack.Screen name='SupplierOrderForm' component={SupplierOrderForm} initialParams={{pageTitle: 'New Supplier Order'}}/>
            <Stack.Screen name='OrderDetails' component={OrderDetails}/>            
        </Stack.Navigator>
    )
}

export default Navbar