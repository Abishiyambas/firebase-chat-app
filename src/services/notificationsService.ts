// Push notifications per room: one FCM topic per room, and the user's
// yes/no answer stored in Firestore so we only ask once per room

import { PermissionsAndroid, Platform } from 'react-native';
import { doc, getDoc, setDoc } from '@react-native-firebase/firestore';
import {
  AuthorizationStatus,
  requestPermission,
  subscribeToTopic,
} from '@react-native-firebase/messaging';
import { auth, db, messaging } from '../lib/firebase';

const USERS_COLLECTION = 'users';
const ROOM_NOTIFICATIONS_COLLECTION = 'roomNotifications';

// The FCM topic a room's push messages are sent to, e.g. "room_abc123"
export function roomTopic(roomId: string): string {
  return `room_${roomId}`;
}

// Where the signed-in user's answer for a room is stored
function answerRef(roomId: string) {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('You must be signed in to change notifications');
  }
  return doc(
    db,
    USERS_COLLECTION,
    user.uid,
    ROOM_NOTIFICATIONS_COLLECTION,
    roomId,
  );
}

// The user's saved answer for this room: true/false, or null if not asked yet
export async function getRoomNotificationAnswer(
  roomId: string,
): Promise<boolean | null> {
  const snapshot = await getDoc(answerRef(roomId));
  return snapshot.exists() ? snapshot.data()?.enabled === true : null;
}

// The answer is stored per user, but the topic subscription belongs to the
// device (it is lost on reinstall or a new phone). Subscribing again is safe
export async function resubscribeIfEnabled(roomId: string): Promise<void> {
  if ((await getRoomNotificationAnswer(roomId)) === true) {
    await subscribeToTopic(messaging, roomTopic(roomId));
  }
}

// Asks the operating system for permission to show notifications
async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    // Android 13 (API 33) and newer need a runtime permission
    if (Number(Platform.Version) < 33) {
      return true;
    }
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    );
    return result === PermissionsAndroid.RESULTS.GRANTED;
  }

  const status = await requestPermission(messaging);
  return (
    status === AuthorizationStatus.AUTHORIZED ||
    status === AuthorizationStatus.PROVISIONAL
  );
}

// Saves the user's answer. If yes (and the OS allows it), this device
// subscribes to the room's topic. Returns whether notifications are on
export async function setRoomNotifications(
  roomId: string,
  wantsNotifications: boolean,
): Promise<boolean> {
  let enabled = false;

  if (wantsNotifications && (await requestNotificationPermission())) {
    await subscribeToTopic(messaging, roomTopic(roomId));
    enabled = true;
  }

  await setDoc(answerRef(roomId), { enabled });
  return enabled;
}
