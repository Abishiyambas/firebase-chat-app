import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

// Shown while the auth state is checked, then fades to Login or ChatRooms
export default function SplashScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.logo}>
        <Text style={styles.logoText}>💬</Text>
      </View>
      <Text style={styles.title}>PentiaChat</Text>
      <Text style={styles.subtitle}>Chat rooms in real time</Text>
      <ActivityIndicator style={styles.spinner} color="white" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0a5cff',
  },
  logo: {
    width: 96,
    height: 96,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    marginBottom: 20,
  },
  logoText: { fontSize: 48 },
  title: { fontSize: 32, fontWeight: '700', color: 'white' },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 6,
  },
  spinner: { marginTop: 40 },
});
