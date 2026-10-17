import { Image, StyleSheet, Text, View } from 'react-native';
import type { Message } from '../types/message';

type MessageItemProps = {
  message: Message;
};

// Formats the send time, e.g. "17/10 20.15". Pending messages show "Sending…"
function formatDate(date: Date | null): string {
  if (!date) {
    return 'Sending…';
  }
  return date.toLocaleString('da-DK', {
    day: 'numeric',
    month: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// One chat message: sender avatar, name, date and text and/or image
export default function MessageItem({ message }: MessageItemProps) {
  return (
    <View style={styles.row}>
      {message.userAvatar ? (
        <Image source={{ uri: message.userAvatar }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarFallback]}>
          <Text style={styles.avatarInitial}>
            {message.userName.charAt(0).toUpperCase()}
          </Text>
        </View>
      )}
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.name}>{message.userName}</Text>
          <Text style={styles.date}>{formatDate(message.createdAt)}</Text>
        </View>
        {message.text ? <Text style={styles.text}>{message.text}</Text> : null}
        {message.image ? (
          <Image
            source={{ uri: message.image }}
            style={styles.image}
            resizeMode="cover"
          />
        ) : null}
      </View>
    </View>
  );
}

const AVATAR_SIZE = 36;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    marginRight: 10,
  },
  avatarFallback: {
    backgroundColor: '#8e8e93',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: { color: 'white', fontWeight: '600' },
  content: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'baseline' },
  name: { fontSize: 15, fontWeight: '600', marginRight: 8 },
  date: { fontSize: 12, color: '#8e8e93' },
  text: { fontSize: 16, marginTop: 2 },
  image: {
    width: 220,
    height: 220,
    borderRadius: 12,
    marginTop: 6,
    backgroundColor: '#eee',
  },
});
