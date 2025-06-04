import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import SplashScreen from "./src/Screens/SplashScreen";
import LoginScreen from "./src/Screens/LoginScreen";
import SignUpScreen from "./src/Screens/SignUpScreen";
import HomeScreen from "./src/Screens/HomeScreen";
import ItemPreviewScreen from "./src/Screens/ItemPreviewScreen";
import MyCartScreen from "./src/Screens/MyCartScreen";
import OrderSummaryScreen from "./src/Screens/OrderSummaryScreen";
import { ThemeProvider } from "./src/Context/ThemeContext";
import { CartProvider } from "./src/Context/CartContext";
import { ProfileProvider } from "./src/Context/ProfileContext";
import { OrdersProvider } from "./src/Context/OrdersContext";
import VerificationScreen from './src/Screens/VerificationScreen';
import ProfileScreen from './src/Screens/ProfileScreen';
import OrderedItemsScreen from './src/Screens/OrderedItemsScreen';
import DeliveryTrackingScreen from './src/Screens/DeliveryTrackingScreen';
import CreateGiftScreen from './src/Screens/CreateGiftScreen';

const Stack = createStackNavigator();

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer>
        <ThemeProvider>
          <CartProvider>
            <ProfileProvider>
              <OrdersProvider>
                <Stack.Navigator screenOptions={{ headerShown: false }}>
                  <Stack.Screen name="Splash" component={SplashScreen} />
                  <Stack.Screen name="Login" component={LoginScreen} />
                  <Stack.Screen name="Signup" component={SignUpScreen} />
                  <Stack.Screen name="Home" component={HomeScreen} />
                  <Stack.Screen name="ItemPreview" component={ItemPreviewScreen} />
                  <Stack.Screen name="MyCart" component={MyCartScreen} />
                  <Stack.Screen name="OrderSummary" component={OrderSummaryScreen} />
                  <Stack.Screen name="Verification" component={VerificationScreen} />
                  <Stack.Screen name="Profile" component={ProfileScreen} />
                  <Stack.Screen name="OrderedItems" component={OrderedItemsScreen} />
                  <Stack.Screen name="DeliveryTracking" component={DeliveryTrackingScreen} />
                  <Stack.Screen name="CreateGift" component={CreateGiftScreen} />
                </Stack.Navigator>
              </OrdersProvider>
            </ProfileProvider>
          </CartProvider>
        </ThemeProvider>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}
