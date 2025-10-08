import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Provider as PaperProvider, DefaultTheme, DarkTheme } from 'react-native-paper';
import { ThemeProvider, useTheme } from './src/Context/ThemeContext';
import { AuthProvider } from './src/Context/AuthContext';
import { CartProvider } from './src/Context/CartContext';
import { OrdersProvider } from './src/Context/OrdersContext';
import { ProfileProvider } from './src/Context/ProfileContext';
import { InventoryProvider } from './src/Context/InventoryContext';
import { DashboardProvider } from './src/Context/DashboardContext';
import AppNavigator from './src/navigation/AppNavigator';

// Theme adapter component to integrate custom theme with React Native Paper
const PaperThemeAdapter = ({ children }) => {
  const { darkMode, colors } = useTheme();

  // Adapt custom theme colors to React Native Paper format
  const paperTheme = {
    ...(darkMode ? DarkTheme : DefaultTheme),
    colors: {
      ...(darkMode ? DarkTheme.colors : DefaultTheme.colors),
      // Override with custom colors
      primary: colors.primary,
      background: colors.background,
      surface: colors.surface,
      accent: colors.accent,
      error: colors.error,
      text: colors.text,
      onSurface: colors.onSurface,
      onPrimary: colors.onPrimary,
      primaryContainer: colors.primaryContainer,
      onPrimaryContainer: colors.onPrimaryContainer,
      secondaryContainer: colors.surface,
      onSecondaryContainer: colors.onSurface,
      tertiaryContainer: colors.card,
      onTertiaryContainer: colors.onSurface,
    },
  };

  return (
    <PaperProvider theme={paperTheme}>
      {children}
    </PaperProvider>
  );
};

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <PaperThemeAdapter>
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
        </PaperThemeAdapter>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
