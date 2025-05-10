import React, { createContext, useState, useContext, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // Load theme preference from AsyncStorage
    const loadTheme = async () => {
      const savedTheme = await AsyncStorage.getItem("isDarkMode");
      if (savedTheme !== null) {
        setIsDarkMode(JSON.parse(savedTheme));
      }
    };
    loadTheme();
  }, []);

  const toggleTheme = async () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    await AsyncStorage.setItem("isDarkMode", JSON.stringify(newTheme)); // Save theme preference
  };

  const themeStyles = {
    backgroundColor: isDarkMode ? "#1C1C1D" : "#00000",
    textColor: isDarkMode ? "white" : "#1C1C1D",
    iconColor: isDarkMode ? "white" : "#1C1C1D",
    headerColor: isDarkMode ? "#3C3C3C" : "#696A8F",
    containerColor: isDarkMode ? "#3C3C3C" : "#FDFDFD",
    buttonColor: isDarkMode ? "#1C1C1D" : "#696A8F",
    imageButtonColor: isDarkMode ? "#DEDCDC" : "#DEDCDC",
  };

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme, themeStyles }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);