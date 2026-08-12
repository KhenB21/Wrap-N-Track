import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Provider as PaperProvider, MD3LightTheme, MD3DarkTheme } from 'react-native-paper';
import { ThemeProvider, useTheme } from './src/Context/ThemeContext';
import { AuthProvider } from './src/Context/AuthContext';
import { CartProvider } from './src/Context/CartContext';
import { OrdersProvider } from './src/Context/OrdersContext';
import { ProfileProvider } from './src/Context/ProfileContext';
import { InventoryProvider } from './src/Context/InventoryContext';
import { DashboardProvider } from './src/Context/DashboardContext';
import AppNavigator from './src/navigation/AppNavigator';

// Theme adapter component to integrate custom theme with React Native Paper
const AppStatusBar = () => {
  const { darkMode = false } = useTheme() || {};
  return <StatusBar style={darkMode ? 'light' : 'dark'} />;
};

const PaperThemeAdapter = ({ children }) => {
  const { darkMode = false, colors = {} } = useTheme() || {};
  const baseTheme = darkMode ? MD3DarkTheme : MD3LightTheme;

  // Adapt custom theme colors to React Native Paper format
  const paperTheme = {
    ...baseTheme,
    colors: {
      ...baseTheme.colors,
      // Override with custom colors
      primary: colors.primary || baseTheme.colors.primary,
      background: colors.background || baseTheme.colors.background,
      surface: colors.surface || baseTheme.colors.surface,
      secondary: colors.accent || baseTheme.colors.secondary,
      error: colors.error || baseTheme.colors.error,
      onSurface: colors.onSurface || baseTheme.colors.onSurface,
      onPrimary: colors.onPrimary || baseTheme.colors.onPrimary,
      primaryContainer: colors.primaryContainer || baseTheme.colors.primaryContainer,
      onPrimaryContainer: colors.onPrimaryContainer || baseTheme.colors.onPrimaryContainer,
      secondaryContainer: colors.surface || baseTheme.colors.secondaryContainer,
      onSecondaryContainer: colors.onSurface || baseTheme.colors.onSecondaryContainer,
      tertiaryContainer: colors.card || baseTheme.colors.tertiaryContainer,
      onTertiaryContainer: colors.onSurface || baseTheme.colors.onTertiaryContainer,
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
                        <AppStatusBar />
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
