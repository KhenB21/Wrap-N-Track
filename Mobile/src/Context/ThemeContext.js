import React, { createContext, useContext, useState, useEffect } from "react";
import { Appearance } from "react-native";

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const colorScheme = Appearance.getColorScheme();
  const [darkMode, setDarkMode] = useState(colorScheme === "dark");

  // Optionally, listen to system changes
  useEffect(() => {
    const listener = Appearance.addChangeListener(({ colorScheme }) => {
      setDarkMode((prev) => prev === undefined ? colorScheme === "dark" : prev);
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
    onSurface: darkMode ? '#ffffff' : '#000000',
    onSurfaceVariant: darkMode ? '#b0b0b0' : '#666666',
    onPrimary: '#ffffff',
    onPrimaryContainer: darkMode ? '#ffffff' : '#000000',
    primaryContainer: darkMode ? '#2a2a3f' : '#e8e8f0',
    outline: darkMode ? '#666666' : '#999999',
  };

  return (
    <ThemeContext.Provider value={{ darkMode, setDarkMode, colors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
} 