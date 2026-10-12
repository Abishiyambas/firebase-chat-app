import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export type RootStackParamList = {
  // Screens in the root stack and the params each one requires
  Splash: undefined;
  Login: undefined;
  ChatRooms: undefined;
  ChatRoom: { roomId: string };
};

export type ScreenProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;
