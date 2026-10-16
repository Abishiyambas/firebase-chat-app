// A room as the app uses it
export type Room = {
  id: string;
  name: string;
  description: string;
  lastMessageAt: Date | null;
};
