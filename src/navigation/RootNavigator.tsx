import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types/navigation';
import SplashScreen from '../screens/SplashScreen';
import LoginScreen from '../screens/LoginScreen';
import ChatRoomsScreen from '../screens/ChatRoomsScreen';
import ChatRoomScreen from '../screens/ChatRoomScreen';
import { useAuth } from '../hooks/useAuth';
import LogOutButton from '../components/LogOutButton';

const Stack = createNativeStackNavigator<RootStackParamList>();

// Picks Splash, Login or the chat screens based on auth state.
// A deep link that arrives while Splash/Login is shown is kept and
// opened once the chat screens exist ('lastUnhandled')
export default function RootNavigator() {
  const { user, authChecked } = useAuth();

  return (
    <Stack.Navigator
      screenOptions={{ animation: 'fade' }}
      UNSTABLE_routeNamesChangeBehavior="lastUnhandled"
    >
      {!authChecked ? (
        <Stack.Screen name="Splash" component={SplashScreen} />
      ) : !user ? (
        <Stack.Screen name="Login" component={LoginScreen} />
      ) : (
        <>
          <Stack.Screen
            name="ChatRooms"
            component={ChatRoomsScreen}
            options={{ headerRight: LogOutButton }}
          />
          <Stack.Screen name="ChatRoom" component={ChatRoomScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}
