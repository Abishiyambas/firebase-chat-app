import { Text, View } from 'react-native';
import type { ScreenProps } from '../types/navigation';

// Last 50 messages with realtime updates, load-more on scroll and an input bar
export default function ChatRoomScreen({ route }: ScreenProps<'ChatRoom'>) {
  return (
    <View>
      <Text>Room: {route.params.roomId}</Text>
    </View>
  );
}
