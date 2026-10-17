import { getAuth } from '@react-native-firebase/auth';
import { getFirestore } from '@react-native-firebase/firestore';
import { getMessaging } from '@react-native-firebase/messaging';

// Single place the app gets its Firebase services from
export const auth = getAuth();
export const db = getFirestore();
export const messaging = getMessaging();
