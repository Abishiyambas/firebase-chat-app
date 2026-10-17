import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { GoogleSigninButton } from '@react-native-google-signin/google-signin';

// Google and Facebook sign-in via Firebase Auth, with an error dialog on failure
export default function LoginScreen() {
  const { signInWithGoogle, signInWithFacebook } = useAuth();
  const [signingIn, setSigningIn] = useState(false);

  // Runs one sign-in method and shows a dialog if it fails
  async function loginHandler(signIn: () => Promise<void>) {
    setSigningIn(true);
    try {
      await signIn();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert('Login failed', message);
    } finally {
      setSigningIn(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>PentiaChat</Text>
      <Text style={styles.subtitle}>Sign in to join the chat rooms</Text>
      <GoogleSigninButton
        style={styles.googleButton}
        size={GoogleSigninButton.Size.Wide}
        onPress={() => loginHandler(signInWithGoogle)}
        disabled={signingIn}
      />
      <Pressable
        style={({ pressed }) => [
          styles.facebookButton,
          (pressed || signingIn) && styles.facebookButtonDimmed,
        ]}
        onPress={() => loginHandler(signInWithFacebook)}
        disabled={signingIn}
        accessibilityRole="button"
      >
        <Text style={styles.facebookText}>Continue with Facebook</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 24,
  },
  title: { fontSize: 32, fontWeight: '700', color: '#0a5cff' },
  subtitle: { fontSize: 16, color: '#666', marginTop: 6, marginBottom: 32 },
  googleButton: { width: 260, height: 48 },
  facebookButton: {
    width: 254,
    height: 42,
    marginTop: 12,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1877f2',
  },
  facebookButtonDimmed: { opacity: 0.6 },
  facebookText: { color: 'white', fontSize: 15, fontWeight: '600' },
});
