import React from "react";
import {PaperProvider} from 'react-native-paper';
import Navigation from './src/Navigation/StackNavigation'
import { NavigationContainer } from '@react-navigation/native';
import { SalesProvider } from "./src/Context/SalesContext";
import { ThemeProvider } from './src/Screens/DrawerNavigation/ThemeContect';
import { InventoryProvider } from './src/Context/InventoryContext';
import { ProfileProvider } from "./src/Screens/DrawerNavigation/AccountProfileScreen";

export default function App() { 

  return (
    <InventoryProvider>
    <SalesProvider>
    <ThemeProvider>
    <PaperProvider>
    <ProfileProvider>
      <NavigationContainer>
        <Navigation/>
      </NavigationContainer>
    </ProfileProvider>
    </PaperProvider>
    </ThemeProvider>
    </SalesProvider>
    </InventoryProvider>
  );
}
