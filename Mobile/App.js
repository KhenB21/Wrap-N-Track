import {PaperProvider} from 'react-native-paper';
import Navigation from './src/Navigation/StackNavigation'
import { NavigationContainer } from '@react-navigation/native';
import { ThemeProvider } from './src/Screens/DrawerNavigation/ThemeContect';

export default function App() { 

  return (
    <ThemeProvider>
    <PaperProvider>
      <NavigationContainer>
        <Navigation/>
      </NavigationContainer>
    </PaperProvider>
    </ThemeProvider>
  );
}
