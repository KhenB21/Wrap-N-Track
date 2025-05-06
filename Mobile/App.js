import {PaperProvider} from 'react-native-paper';
import Navigation from './src/Navigation/StackNavigation'
import { NavigationContainer } from '@react-navigation/native';

export default function App() { 

  return (
    <PaperProvider>
      <NavigationContainer>
        <Navigation/>
      </NavigationContainer>
    </PaperProvider>
  );
}
