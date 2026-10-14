import { getAuth } from '@react-native-firebase/auth';
import { getFirestore } from '@react-native-firebase/firestore';

//  Single place the app gets its Firebase services from
export const auth = getAuth(); // gives me authentication
export const db = getFirestore(); //gives me database
