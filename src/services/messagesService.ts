// Reads, listens to and sends chat messages in Firestore

import {
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  startAfter,
  Timestamp,
  writeBatch,
  type QueryDocumentSnapshot,
} from '@react-native-firebase/firestore';
import { auth, db } from '../lib/firebase';
import type { Message } from '../types/message';

const ROOMS_COLLECTION = 'rooms';
const MESSAGES_COLLECTION = 'messages';
export const MESSAGES_PAGE_SIZE = 50;

// Turns a Firestore document into the app's Message type
function toMessage(snapshot: QueryDocumentSnapshot): Message {
  const data = snapshot.data();
  return {
    id: snapshot.id,
    text: data.text ?? '',
    image: data.image ?? null,
    createdAt: data.createdAt?.toDate() ?? null,
    userId: data.userId,
    userName: data.userName,
    userAvatar: data.userAvatar ?? null,
  };
}

// Listens to the newest messages in a room. Returns a function that stops listening
export function subscribeToMessages(
  roomId: string,
  onChange: (messages: Message[]) => void,
  onError: (error: Error) => void,
): () => void {
  const messagesQuery = query(
    collection(db, ROOMS_COLLECTION, roomId, MESSAGES_COLLECTION),
    orderBy('createdAt', 'desc'),
    limit(MESSAGES_PAGE_SIZE),
  );

  return onSnapshot(
    messagesQuery,
    snapshot => onChange(snapshot.docs.map(toMessage)),
    onError,
  );
}

// Fetches the page of messages written before the given date (for "load more")
export async function getOlderMessages(
  roomId: string,
  before: Date,
): Promise<Message[]> {
  const olderQuery = query(
    collection(db, ROOMS_COLLECTION, roomId, MESSAGES_COLLECTION),
    orderBy('createdAt', 'desc'),
    startAfter(Timestamp.fromDate(before)),
    limit(MESSAGES_PAGE_SIZE),
  );
  const snapshot = await getDocs(olderQuery);
  return snapshot.docs.map(toMessage);
}

// Writes a message as the signed-in user and moves the room to the top of the list.
// Both writes happen in one batch, so either both succeed or neither does
async function writeMessage(
  roomId: string,
  content: { text: string; image: string | null },
): Promise<void> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('You must be signed in to send a message');
  }

  const batch = writeBatch(db);
  const messageRef = doc(
    collection(db, ROOMS_COLLECTION, roomId, MESSAGES_COLLECTION),
  );

  batch.set(messageRef, {
    text: content.text,
    image: content.image,
    createdAt: serverTimestamp(),
    userId: user.uid,
    userName: user.displayName ?? 'Anonymous',
    userAvatar: user.photoURL ?? null,
  });
  batch.update(doc(db, ROOMS_COLLECTION, roomId), {
    lastMessageAt: serverTimestamp(),
  });

  await batch.commit();
}

// Sends a text message
export function sendMessage(roomId: string, text: string): Promise<void> {
  return writeMessage(roomId, { text, image: null });
}

// Sends an image message. The image is a small, compressed data URI stored in
// the message itself (Firebase Storage needs the paid Blaze plan)
export function sendImageMessage(roomId: string, image: string): Promise<void> {
  return writeMessage(roomId, { text: '', image });
}
