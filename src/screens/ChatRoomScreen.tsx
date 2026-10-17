import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Button,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHeaderHeight } from '@react-navigation/elements';
import MessageItem from '../components/MessageItem';
import { useMessages } from '../hooks/useMessages';
import { useRoomNotificationPrompt } from '../hooks/useRoomNotificationPrompt';
import { useRooms } from '../hooks/useRooms';
import { pickImage, type ImageSource } from '../services/imagePickerService';
import { sendImageMessage, sendMessage } from '../services/messagesService';
import type { ScreenProps } from '../types/navigation';

// Shows an alert with the error message
function showError(title: string, error: unknown) {
  const message = error instanceof Error ? error.message : 'Unknown error';
  Alert.alert(title, message);
}

// Lets the user choose between camera and photo library
function askImageSource(): Promise<ImageSource | null> {
  return new Promise(resolve => {
    Alert.alert('Send a photo', undefined, [
      { text: 'Take photo', onPress: () => resolve('camera') },
      { text: 'Choose from library', onPress: () => resolve('gallery') },
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
    ]);
  });
}

// Last 50 messages with realtime updates, load-more on scroll and an input bar
export default function ChatRoomScreen({
  navigation,
  route,
}: ScreenProps<'ChatRoom'>) {
  const { roomId } = route.params;
  const { rooms, refreshRooms } = useRooms();
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

  // Opened from a deep link before the rooms list was loaded: fetch it for the title
  const roomMissing = !room;
  useEffect(() => {
    if (roomMissing) {
      refreshRooms().catch(() => {
        // The title falls back to "Chat"; the messages still work
      });
    }
  }, [roomMissing, refreshRooms]);

  const askForNotifications = useRoomNotificationPrompt(
    roomId,
    room?.name ?? 'this room',
  );

  // The list is inverted, so reaching the "end" means scrolling up to older messages
  const handleEndReached = useCallback(() => {
    loadOlder().catch(loadError =>
      showError('Could not load older messages', loadError),
    );
  }, [loadOlder]);

  // Runs a send, then (first time in this room) asks about push notifications
  async function send(write: () => Promise<void>) {
    setSending(true);
    try {
      await write();
      askForNotifications().catch(notificationError =>
        showError('Could not turn on notifications', notificationError),
      );
    } catch (sendError) {
      showError('Could not send message', sendError);
    } finally {
      setSending(false);
    }
  }

  async function handleSend() {
    const trimmed = text.trim();
    if (!trimmed || sending) {
      return;
    }
    await send(async () => {
      await sendMessage(roomId, trimmed);
      setText('');
    });
  }

  async function handleAddPhoto() {
    const source = await askImageSource();
    if (!source) {
      return;
    }
    try {
      const image = await pickImage(source);
      if (image) {
        await send(() => sendImageMessage(roomId, image));
      }
    } catch (pickError) {
      showError('Could not add photo', pickError);
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
        <Pressable
          style={styles.photoButton}
          onPress={handleAddPhoto}
          disabled={sending}
          accessibilityLabel="Send a photo"
        >
          <Text style={styles.photoButtonText}>+</Text>
        </Pressable>
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
  photoButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    backgroundColor: '#e5e5ea',
  },
  photoButtonText: { fontSize: 24, color: '#0a5cff', lineHeight: 28 },
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
