import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Button,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHeaderHeight } from '@react-navigation/elements';
import MessageItem from '../components/MessageItem';
import { useMessages } from '../hooks/useMessages';
import { useRooms } from '../hooks/useRooms';
import { sendMessage } from '../services/messagesService';
import type { ScreenProps } from '../types/navigation';

// Shows an alert with the error message
function showError(title: string, error: unknown) {
  const message = error instanceof Error ? error.message : 'Unknown error';
  Alert.alert(title, message);
}

// Last 50 messages with realtime updates, load-more on scroll and an input bar
export default function ChatRoomScreen({
  navigation,
  route,
}: ScreenProps<'ChatRoom'>) {
  const { roomId } = route.params;
  const { rooms } = useRooms();
  const { messages, loading, loadingOlder, error, loadOlder } =
    useMessages(roomId);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();

  // Use the room name as the screen title
  const room = rooms.find(candidate => candidate.id === roomId);
  useLayoutEffect(() => {
    navigation.setOptions({ title: room?.name ?? 'Chat' });
  }, [navigation, room?.name]);

  // The list is inverted, so reaching the "end" means scrolling up to older messages
  const handleEndReached = useCallback(() => {
    loadOlder().catch(loadError =>
      showError('Could not load older messages', loadError),
    );
  }, [loadOlder]);

  async function handleSend() {
    const trimmed = text.trim();
    if (!trimmed || sending) {
      return;
    }

    setSending(true);
    try {
      await sendMessage(roomId, trimmed);
      setText('');
    } catch (sendError) {
      showError('Could not send message', sendError);
    } finally {
      setSending(false);
    }
  }

  // Show listener errors once, when they happen
  useEffect(() => {
    if (error) {
      showError('Could not load messages', error);
    }
  }, [error]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior="padding"
      keyboardVerticalOffset={Platform.OS === 'ios' ? headerHeight : 0}
    >
      {loading ? (
        <ActivityIndicator style={styles.loader} />
      ) : (
        <FlatList
          inverted
          data={messages}
          keyExtractor={message => message.id}
          renderItem={({ item }) => <MessageItem message={item} />}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.2}
          ListFooterComponent={
            loadingOlder ? (
              <ActivityIndicator style={styles.loader} />
            ) : undefined
          }
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
        />
      )}
      <View
        style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 8) }]}
      >
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Write a message"
          returnKeyType="send"
          autoComplete="off"
          textContentType="none"
          onSubmitEditing={handleSend}
          submitBehavior="submit"
        />
        <Button
          title="Send"
          onPress={handleSend}
          disabled={sending || !text.trim()}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  loader: { margin: 16 },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#ccc',
    backgroundColor: '#f9f9f9',
  },
  input: {
    flex: 1,
    minHeight: 36,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 18,
    backgroundColor: 'white',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#ccc',
    fontSize: 16,
  },
});
