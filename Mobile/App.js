import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Provider as PaperProvider } from 'react-native-paper';
import { ThemeProvider } from './src/Context/ThemeContext';
import { AuthProvider } from './src/Context/AuthContext';
import { CartProvider } from './src/Context/CartContext';
import { OrdersProvider } from './src/Context/OrdersContext';
import { ProfileProvider } from './src/Context/ProfileContext';
import { InventoryProvider } from './src/Context/InventoryContext';
import { DashboardProvider } from './src/Context/DashboardContext';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <PaperProvider>
          <AuthProvider>
            <DashboardProvider>
              <InventoryProvider>
                <CartProvider>
                  <OrdersProvider>
                    <ProfileProvider>
                      <NavigationContainer>
                        <StatusBar style="auto" />
                        <AppNavigator />
                      </NavigationContainer>
                    </ProfileProvider>
                  </OrdersProvider>
                </CartProvider>
              </InventoryProvider>
            </DashboardProvider>
          </AuthProvider>
        </PaperProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
