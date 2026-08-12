import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { Appearance } from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';

const ThemeContext = createContext();
const THEME_STORAGE_KEY = 'themeMode'; // 'dark' | 'light'

export function ThemeProvider({ children }) {
  const colorScheme = Appearance.getColorScheme();
  const [darkMode, setDarkModeState] = useState(colorScheme === "dark");
  const userOverrideRef = useRef(false); // true once the user manually sets a theme, so system changes stop overriding it

  // Every manual theme change (Switch, dropdown, toggleTheme) funnels through here
  // so the choice is always persisted and always wins over future system changes.
  const setDarkMode = (value) => {
    userOverrideRef.current = true;
    setDarkModeState((prev) => {
      const next = typeof value === 'function' ? value(prev) : value;
      AsyncStorage.setItem(THEME_STORAGE_KEY, next ? 'dark' : 'light').catch(() => {});
      return next;
    });
  };
  const toggleTheme = () => setDarkMode((prev) => !prev);

  // Load the user's saved preference once on mount; falls back to system scheme if never set.
  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY).then((stored) => {
      if (stored === 'dark' || stored === 'light') {
        userOverrideRef.current = true;
        setDarkModeState(stored === 'dark');
      }
    }).catch(() => {});
  }, []);

  // System theme changes only apply until the user has manually chosen a theme.
  useEffect(() => {
    const listener = Appearance.addChangeListener(({ colorScheme }) => {
      if (!userOverrideRef.current) {
        setDarkModeState(colorScheme === "dark");
      }
    });
    return () => listener.remove();
  }, []);

  // Color definitions
  const colors = {
    // Primary colors
    primary: '#696a8f',
    secondary: '#4a4a6a',
    accent: '#2E7D32',
    
    // Background colors
    background: darkMode ? '#121212' : '#ffffff',
    surface: darkMode ? '#1e1e1e' : '#f5f5f5',
    card: darkMode ? '#2e2e2e' : '#ffffff',
    sidebar: '#696a8f',
    
    // Text colors
    text: darkMode ? '#ffffff' : '#000000',
    subText: darkMode ? '#b0b0b0' : '#666666',
    buttonText: '#ffffff',
    
    // Status colors
    success: '#4CAF50',
    warning: '#FF9800',
    error: '#f44336',
    info: '#2196F3',
    
    // Border colors
    border: darkMode ? '#333333' : '#e0e0e0',
    
    // Other colors
    placeholder: darkMode ? '#666666' : '#999999',
    
    // React Native Paper compatible colors
    onBackground: darkMode ? '#ffffff' : '#000000',
    onSurface: darkMode ? '#ffffff' : '#000000',
    onSurfaceVariant: darkMode ? '#b0b0b0' : '#666666',
    onPrimary: '#ffffff',
    onPrimaryContainer: darkMode ? '#ffffff' : '#000000',
    primaryContainer: darkMode ? '#2a2a3f' : '#e8e8f0',
    outline: darkMode ? '#666666' : '#999999',

    // Inputs / dividers
    inputBackground: darkMode ? '#1e1e1e' : '#f5f5f5',
    divider: darkMode ? '#333333' : '#e0e0e0',

    // Skeleton loading placeholders
    skeletonBase: darkMode ? '#2a2a2a' : '#e5e5e5',
    skeletonHighlight: darkMode ? '#3d3d3d' : '#f2f2f2',
  };

  return (
    <ThemeContext.Provider value={{ darkMode, setDarkMode, toggleTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
} 
