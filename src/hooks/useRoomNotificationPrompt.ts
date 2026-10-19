import { useCallback, useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import {
  getRoomNotificationAnswer,
  resubscribeIfEnabled,
  setRoomNotifications,
} from '../services/notificationsService';

// Shows a native yes/no dialog and resolves with the answer
function askYesNo(title: string, message: string): Promise<boolean> {
  return new Promise(resolve => {
    Alert.alert(
      title,
      message,
      [
        { text: 'No', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Yes', onPress: () => resolve(true) },
      ],
      { cancelable: false },
    );
  });
}

// Returns a function that, the first time the user writes in a room,
// asks whether they want push notifications from that room
export function useRoomNotificationPrompt(roomId: string, roomName: string) {
  const asked = useRef(false);

  // If the user already said yes (maybe on another install), make sure this
  // device is subscribed again. Fails quietly, e.g. on iOS without APNs
  useEffect(() => {
    resubscribeIfEnabled(roomId).catch(() => {});
  }, [roomId]);

  return useCallback(async () => {
    if (asked.current) {
      return;
    }
    asked.current = true;

    if ((await getRoomNotificationAnswer(roomId)) !== null) {
      return;
    }

    const wantsNotifications = await askYesNo(
      `Notifications from ${roomName}?`,
      'Get a push message when someone writes in this room.',
    );
    await setRoomNotifications(roomId, wantsNotifications);
  }, [roomId, roomName]);
}
