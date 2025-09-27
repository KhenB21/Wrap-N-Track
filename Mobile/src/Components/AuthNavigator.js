import React, { useEffect } from 'react';
import { useAuth } from '../Context/AuthContext';

export default function AuthNavigator({ navigation }) {
  const { isAuthenticated, userType, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (isAuthenticated) {
        // User is authenticated, navigate based on user type
        if (userType === 'employee') {
          navigation.navigate('Dashboard');
        } else if (userType === 'customer') {
          navigation.navigate('Home');
        }
      } else {
        // User is not authenticated, go to login
        navigation.navigate('Login');
      }
    }
  }, [isAuthenticated, userType, loading, navigation]);

  return null; // This component doesn't render anything
}
