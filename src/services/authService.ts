// Handles sign-in and sign-out with Google, Facebook and Firebase Auth

import { Platform } from 'react-native';
import {
  GoogleSignin,
  isCancelledResponse,
} from '@react-native-google-signin/google-signin';
import {
  AccessToken,
  AuthenticationToken,
  LoginManager,
} from 'react-native-fbsdk-next';
import { sha256 } from 'js-sha256';
import {
  FacebookAuthProvider,
  GoogleAuthProvider,
  signInWithCredential,
  signOut,
} from '@react-native-firebase/auth';
import { auth } from '../lib/firebase';

const GOOGLE_WEB_CLIENT_ID =
  '831872663629-ebqi2p21jmdj6ci5k0ngp9t764ki5cvb.apps.googleusercontent.com';
const FACEBOOK_PERMISSIONS = ['public_profile', 'email'];

GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID });

// Google proves the user's identity, Firebase creates the session
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

// A random one-time value that ties the Facebook token to this sign-in attempt
function createNonce(): string {
  return Array.from({ length: 32 }, () =>
    Math.floor(Math.random() * 36).toString(36),
  ).join('');
}

// Facebook proves the user's identity, Firebase creates the session.
// Android (and iOS with tracking allowed) gives a classic access token.
// Otherwise iOS uses "Limited Login", which gives an ID token tied to our nonce
export async function signInWithFacebook(): Promise<void> {
  const nonce = createNonce();
  const result =
    Platform.OS === 'ios'
      ? await LoginManager.logInWithPermissions(
          FACEBOOK_PERMISSIONS,
          'enabled',
          sha256(nonce),
        )
      : await LoginManager.logInWithPermissions(FACEBOOK_PERMISSIONS);
  if (result.isCancelled) {
    return;
  }

  const accessToken = await AccessToken.getCurrentAccessToken();
  if (accessToken) {
    const credential = FacebookAuthProvider.credential(accessToken.accessToken);
    await signInWithCredential(auth, credential);
    return;
  }

  if (Platform.OS === 'ios') {
    const idToken = await AuthenticationToken.getAuthenticationTokenIOS();
    if (idToken?.authenticationToken) {
      const credential = FacebookAuthProvider.credential(
        idToken.authenticationToken,
        nonce,
      );
      await signInWithCredential(auth, credential);
      return;
    }
  }

  throw new Error('Facebook sign-in returned no token');
}

// Signs out of Firebase and the provider used, so the provider asks for an
// account next time
export async function logOut(): Promise<void> {
  const providers =
    auth.currentUser?.providerData.map(info => info.providerId) ?? [];

  if (providers.includes('google.com')) {
    await GoogleSignin.signOut();
  }
  if (providers.includes('facebook.com')) {
    LoginManager.logOut();
  }

  await signOut(auth);
}
