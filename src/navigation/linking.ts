// Deep links: pentiachat://room/<roomId> opens a chat room. Push notifications
// carry a roomId in their data, which is turned into the same link when tapped

import { Linking } from 'react-native';
import type { LinkingOptions } from '@react-navigation/native';
import {
  getInitialNotification,
  onNotificationOpenedApp,
  type RemoteMessage,
} from '@react-native-firebase/messaging';
import { messaging } from '../lib/firebase';
import type { RootStackParamList } from '../types/navigation';

const PREFIX = 'pentiachat://';

// Builds the deep link for a tapped notification, if it belongs to a room
function linkFromNotification(message: RemoteMessage | null): string | null {
  const roomId = message?.data?.roomId;
  return typeof roomId === 'string' ? `${PREFIX}room/${roomId}` : null;
}

export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [PREFIX],
  config: {
    // Keeps the rooms list underneath, so "back" works after opening a link
    initialRouteName: 'ChatRooms',
    screens: {
      ChatRooms: 'rooms',
      ChatRoom: 'room/:roomId',
    },
  },

  // App started from a link or by tapping a notification
  async getInitialURL() {
    const url = await Linking.getInitialURL();
    if (url) {
      return url;
    }
    return linkFromNotification(await getInitialNotification(messaging));
  },

  // App already running: links and notification taps
  subscribe(listener) {
    const urlSubscription = Linking.addEventListener('url', ({ url }) =>
      listener(url),
    );
    const stopNotificationListener = onNotificationOpenedApp(
      messaging,
      message => {
        const url = linkFromNotification(message);
        if (url) {
          listener(url);
        }
      },
    );

    return () => {
      urlSubscription.remove();
      stopNotificationListener();
    };
  },
};
