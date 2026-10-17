import { AuthProvider } from './src/contexts/AuthContext';
import { RoomsProvider } from './src/contexts/RoomsContext';
import RootNavigator from './src/navigation/RootNavigator';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// App root: wraps the navigator in safe-area, auth and navigation providers
export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <RoomsProvider>
          <NavigationContainer>
            <RootNavigator />
          </NavigationContainer>
        </RoomsProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
