import { useContext } from 'react';
import { RoomsContext } from '../contexts/RoomsContext';

// Gives access to the rooms context. Throws if used outside a RoomsProvider
export function useRooms() {
  const context = useContext(RoomsContext);

  if (!context) {
    throw new Error('useRooms must be used within a RoomsProvider');
  }

  return context;
}
