import React, { useEffect, useState } from "react";
import { View, Text, Image, StyleSheet, ActivityIndicator, TouchableOpacity } from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SplashScreen() {
  const [showSkip, setShowSkip] = useState(false);

  useEffect(() => {
    console.log('SplashScreen starting...');
    
    // Show skip button after 2 seconds
    const skipTimer = setTimeout(() => {
      setShowSkip(true);
    }, 2000);
    
    // Just show splash screen - AppNavigator handles navigation
    console.log('SplashScreen - AppNavigator will handle navigation based on auth state');
    
    return () => {
      clearTimeout(skipTimer);
    };
  }, []);

  const handleSkip = () => {
    console.log('User skipped splash screen');
    // AppNavigator will handle navigation
  };

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Image
          source={require("../Images/Logo/pensee-logo-with-name-vertical.png")}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6B6593" />
        <Text style={styles.loadingText}>Loading...</Text>
        {showSkip && (
          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkip}
          >
            <Text style={styles.skipButtonText}>Skip</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  logoContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 180,
    height: 180,
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: "300",
    color: "#6B6593",
    fontFamily: "serif",
    marginTop: 10,
  },
  subtitle: {
    fontSize: 14,
    color: "#6B6593",
    letterSpacing: 2,
    marginBottom: 40,
  },
  button: {
    backgroundColor: "#6B6593",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 40,
    marginBottom: 40,
  },
  buttonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  loadingContainer: {
    alignItems: "center",
    marginBottom: 40,
  },
  loadingText: {
    color: "#6B6593",
    fontSize: 14,
    marginTop: 10,
    letterSpacing: 1,
  },
  skipButton: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#6B6593",
  },
  skipButtonText: {
    color: "#6B6593",
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 1,
  },
});
