import { useCallback, useEffect, useState } from 'react';
import {
  getOlderMessages,
  MESSAGES_PAGE_SIZE,
  subscribeToMessages,
} from '../services/messagesService';
import type { Message } from '../types/message';

// Messages still waiting for a server timestamp count as the newest
function sortTime(message: Message): number {
  return message.createdAt?.getTime() ?? Number.MAX_SAFE_INTEGER;
}

// Merges two lists by id (newer data wins) and sorts them newest first
function mergeMessages(current: Message[], incoming: Message[]): Message[] {
  const byId = new Map(current.map(message => [message.id, message]));
  incoming.forEach(message => byId.set(message.id, message));
  return [...byId.values()].sort((a, b) => sortTime(b) - sortTime(a));
}

// Live messages for one room (newest first) plus loading of older pages
export function useMessages(roomId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Realtime listener for the newest page; stopped when the room changes or closes.
  // New snapshots are merged, so messages that slide out of the live page are kept.
  useEffect(() => {
    let firstSnapshot = true;
    setMessages([]);
    setLoading(true);
    setHasMore(true);
    setError(null);

    const unsubscribe = subscribeToMessages(
      roomId,
      latest => {
        setMessages(current => mergeMessages(current, latest));
        setLoading(false);
        if (firstSnapshot && latest.length < MESSAGES_PAGE_SIZE) {
          setHasMore(false);
        }
        firstSnapshot = false;
      },
      listenError => {
        setError(listenError);
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [roomId]);

  const oldestDate = messages[messages.length - 1]?.createdAt ?? null;

  // Fetches the next page of older messages. Errors are passed on to the screen
  const loadOlder = useCallback(async () => {
    if (loadingOlder || !hasMore || !oldestDate) {
      return;
    }

    setLoadingOlder(true);
    try {
      const page = await getOlderMessages(roomId, oldestDate);
      setMessages(current => mergeMessages(current, page));
      if (page.length < MESSAGES_PAGE_SIZE) {
        setHasMore(false);
      }
    } finally {
      setLoadingOlder(false);
    }
  }, [roomId, oldestDate, loadingOlder, hasMore]);

  return { messages, loading, loadingOlder, hasMore, error, loadOlder };
}
