import { Alert, Button } from 'react-native';
import { useAuth } from '../hooks/useAuth';

// header button that signs the user out
export default function LogOutButton() {
  const { logOut } = useAuth();

  async function handlePress() {
    try {
      await logOut();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert('Could not log out', message);
    }
  }

  return <Button title="Log out" onPress={handlePress} />;
}
