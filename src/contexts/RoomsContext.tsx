import { createContext, useState, type ReactNode } from 'react';
import { getRooms } from '../services/roomsService';
import type { Room } from '../types/room';

type RoomsContextValue = {
  rooms: Room[];
  refreshing: boolean;
  refreshRooms: () => Promise<void>;
};

export const RoomsContext = createContext<RoomsContextValue | undefined>(
  undefined,
);

// Keeps the users rooms and lets the screen reload them
export function RoomsProvider({ children }: { children: ReactNode }) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // No catch: the screen that calls this shows the error
  async function refreshRooms() {
    setRefreshing(true);
    try {
      setRooms(await getRooms());
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <RoomsContext.Provider value={{ rooms, refreshing, refreshRooms }}>
      {children}
    </RoomsContext.Provider>
  );
}
