import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import LoginScreen from "../Screen/LoginScreen";
import RegisterScreen from "../Screen/RegisterScreen";
import VerifyEmailScreen from "../Screen/VerifyEmailScreen";
import ForgotPasswordScreen from "../Screen/ForgotPasswordScreen";
import ResetPasswordScreen from "../Screen/ResetPasswordScreen";
import MainDrawer from "./MainDrawer";
import ProductDetailsScreen from "../Screen/ProductDetailsScreen";
import OrderSummaryScreen from "../Screen/OrderSummaryScreen";
import CreateGiftScreen from "../Screen/CreateGiftScreen";

const Stack = createStackNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Login"
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="ProductDetails" component={ProductDetailsScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="VerifyEmail" component={VerifyEmailScreen} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
        <Stack.Screen name="Home" component={MainDrawer} /> 
        <Stack.Screen name="OrderSummary" component={OrderSummaryScreen} />
        <Stack.Screen name="CreateGift" component={CreateGiftScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
