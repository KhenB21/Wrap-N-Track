import {PaperProvider} from 'react-native-paper';
import Navigation from './src/Navigation/StackNavigation'
import { NavigationContainer } from '@react-navigation/native';
import { SalesProvider } from "./src/Context/SalesContext";
import { ThemeProvider } from './src/Screens/DrawerNavigation/ThemeContect';
import { InventoryProvider } from './src/Context/InventoryContext';

export default function App() { 

  return (
    <InventoryProvider>
    <SalesProvider>
    <ThemeProvider>
    <PaperProvider>
      <NavigationContainer>
        <Navigation/>
      </NavigationContainer>
    </PaperProvider>
    </ThemeProvider>
    </SalesProvider>
    </InventoryProvider>
  );
}
