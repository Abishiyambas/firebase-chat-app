// Reads chat rooms from Firestore and maps them to the app's Room type

import {
  collection,
  getDocs,
  orderBy,
  query,
} from '@react-native-firebase/firestore';
import { db } from '../lib/firebase';
import type { Room } from '../types/room';

const ROOMS_COLLECTION = 'rooms';

// Fetches all rooms, newest first
export async function getRooms(): Promise<Room[]> {
  const roomsQuery = query(
    collection(db, ROOMS_COLLECTION),
    orderBy('lastMessageAt', 'desc'),
  );
  const snapshot = await getDocs(roomsQuery);

  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      name: data.name,
      description: data.description,
      lastMessageAt: data.lastMessageAt?.toDate() ?? null,
    };
  });
}
