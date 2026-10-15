import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';

//You can only use the AuthContext with in in the AuthProvider. Otherwise there will be thrown an error
export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
