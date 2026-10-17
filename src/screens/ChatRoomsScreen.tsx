import { useCallback, useEffect } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { ScreenProps } from '../types/navigation';
import { useRooms } from '../hooks/useRooms';

// Shows an alert when loading fails
function showLoadError(error: unknown) {
  const message = error instanceof Error ? error.message : 'Unknown error';
  Alert.alert('Could not load rooms', message);
}

// Lists the chat rooms, newest message first, with pull-to-refresh
export default function ChatRoomsScreen({
  navigation,
}: ScreenProps<'ChatRooms'>) {
  const { rooms, refreshing, refreshRooms } = useRooms();

  const loadRooms = useCallback(() => {
    refreshRooms().catch(showLoadError);
  }, [refreshRooms]);

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  return (
    <FlatList
      data={rooms}
      keyExtractor={room => room.id}
      refreshing={refreshing}
      onRefresh={loadRooms}
      renderItem={({ item }) => (
        <Pressable
          style={styles.row}
          onPress={() => navigation.navigate('ChatRoom', { roomId: item.id })}
        >
          <View style={styles.texts}>
            <Text style={styles.title}>{item.name}</Text>
            <Text style={styles.subtitle}>{item.description}</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ccc',
  },
  texts: { flex: 1 },
  title: { fontSize: 17, fontWeight: '600' },
  subtitle: { fontSize: 14, color: '#666', marginTop: 2 },
  chevron: { fontSize: 24, color: '#c7c7cc' },
});
