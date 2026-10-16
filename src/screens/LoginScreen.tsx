import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { GoogleSigninButton } from '@react-native-google-signin/google-signin';

// Google and Facebook sign-in via Firebase Auth, with an error dialog on failure
export default function LoginScreen() {
  const { signInWithGoogle } = useAuth();
  const [signingIn, setSigningIn] = useState(false);

  async function loginHandler() {
    setSigningIn(true);
    try {
      await signInWithGoogle();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert('Login failed', message);
    } finally {
      setSigningIn(false);
    }
  }

  return (
    <View style={styles.container}>
      <GoogleSigninButton onPress={loginHandler} disabled={signingIn} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
