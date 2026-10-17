// A chat message as the app uses it
export type Message = {
  id: string;
  text: string;
  createdAt: Date | null;
  userId: string;
  userName: string;
  userAvatar: string | null;
};
