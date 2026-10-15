import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types/navigation';
import SplashScreen from '../screens/SplashScreen';
import LoginScreen from '../screens/LoginScreen';
import ChatRoomsScreen from '../screens/ChatRoomsScreen';
import ChatRoomScreen from '../screens/ChatRoomScreen';
import { useAuth } from '../hooks/useAuth';

const Stack = createNativeStackNavigator<RootStackParamList>();

// Picks Splash, Login or the chat screens based on auth state
export default function RootNavigator() {
  const { user, authChecked } = useAuth();

  return (
    <Stack.Navigator screenOptions={{ animation: 'fade' }}>
      {!authChecked ? (
        <Stack.Screen name="Splash" component={SplashScreen} />
      ) : !user ? (
        <Stack.Screen name="Login" component={LoginScreen} />
      ) : (
        <>
          <Stack.Screen name="ChatRooms" component={ChatRoomsScreen} />
          <Stack.Screen name="ChatRoom" component={ChatRoomScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}
