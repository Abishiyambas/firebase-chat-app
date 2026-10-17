import { useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import {
  hasAnsweredRoomNotifications,
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

  return useCallback(async () => {
    if (asked.current) {
      return;
    }
    asked.current = true;

    if (await hasAnsweredRoomNotifications(roomId)) {
      return;
    }

    const wantsNotifications = await askYesNo(
      `Notifications from ${roomName}?`,
      'Get a push message when someone writes in this room.',
    );
    await setRoomNotifications(roomId, wantsNotifications);
  }, [roomId, roomName]);
}
