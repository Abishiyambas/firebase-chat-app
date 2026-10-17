import { useContext } from 'react';
import { RoomsContext } from '../contexts/RoomsContext';

//You can only use the RoomContext with in in the RoomsProvider. Otherwise there will be thrown an error
export function useRooms() {
  const context = useContext(RoomsContext);

  if (!context) {
    throw new Error('useRooms must be used within a RoomProvider');
  }

  return context;
}
