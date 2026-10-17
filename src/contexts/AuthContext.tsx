import { createContext, useEffect, useState, type ReactNode } from 'react';
import { onAuthStateChanged, type User } from '@react-native-firebase/auth';
import {
  logOut,
  signInWithFacebook,
  signInWithGoogle,
} from '../services/authService';
import { auth } from '../lib/firebase';

type AuthContextValue = {
  user: User | null;
  authChecked: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithFacebook: () => Promise<void>;
  logOut: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined,
);

// Provides the signed-in user, whether auth has been checked, and sign-in/out actions
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, newUser => {
      setUser(newUser);
      setAuthChecked(true);
    });
    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        authChecked,
        signInWithGoogle,
        signInWithFacebook,
        logOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
