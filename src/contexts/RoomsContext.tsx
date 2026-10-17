import { createContext, useState, useCallback, type ReactNode } from 'react';
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

// Holds the shared chat rooms and lets screens reload them
export function RoomsProvider({ children }: { children: ReactNode }) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // No catch: the screen that calls this shows the error
  const refreshRooms = useCallback(async () => {
    setRefreshing(true);
    try {
      setRooms(await getRooms());
    } finally {
      setRefreshing(false);
    }
  }, []);

  return (
    <RoomsContext.Provider value={{ rooms, refreshing, refreshRooms }}>
      {children}
    </RoomsContext.Provider>
  );
}
