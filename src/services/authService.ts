// We have a sign in and signout funktion in our service file

import {
  GoogleSignin,
  isCancelledResponse,
} from '@react-native-google-signin/google-signin';
import { auth } from '../lib/firebase';
import {
  GoogleAuthProvider,
  signInWithCredential,
  signOut,
} from '@react-native-firebase/auth';

const GOOGLE_WEB_CLIENT_ID =
  '831872663629-ebqi2p21jmdj6ci5k0ngp9t764ki5cvb.apps.googleusercontent.com';

GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID });

// so we want to make sure that the login goes through, so if it doesnt, we will throw an error message
export async function signInWithGoogle(): Promise<void> {
  await GoogleSignin.hasPlayServices();

  const response = await GoogleSignin.signIn();

  if (isCancelledResponse(response)) {
    return;
  }

  const idToken = response.data.idToken;
  if (!idToken) {
    throw new Error('Google sign-in returned no ID token');
  }

  const credential = GoogleAuthProvider.credential(idToken);
  await signInWithCredential(auth, credential);
}

//Sign out function
export async function logOut(): Promise<void> {
  await GoogleSignin.signOut();
  await signOut(auth);
}
