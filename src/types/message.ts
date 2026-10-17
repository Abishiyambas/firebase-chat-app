// A chat message as the app uses it. A message has text, an image, or both
export type Message = {
  id: string;
  text: string;
  image: string | null;
  createdAt: Date | null;
  userId: string;
  userName: string;
  userAvatar: string | null;
};
