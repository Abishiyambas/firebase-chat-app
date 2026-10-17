/**
 * @format
 */

import { AppRegistry } from 'react-native';
import { setBackgroundMessageHandler } from '@react-native-firebase/messaging';
import App from './App';
import { name as appName } from './app.json';
import { messaging } from './src/lib/firebase';

// Push messages that arrive while the app is in the background or closed.
// The system shows the notification itself; tapping it is handled by the deep link setup
setBackgroundMessageHandler(messaging, async () => {});

AppRegistry.registerComponent(appName, () => App);
