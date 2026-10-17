// Picks a photo from the camera or gallery and returns it as a small,
// compressed data URI that fits inside a Firestore document

import {
  launchCamera,
  launchImageLibrary,
  type CameraOptions,
  type ImagePickerResponse,
} from 'react-native-image-picker';

export type ImageSource = 'camera' | 'gallery';

// Keeps images well below Firestore's 1 MB document limit
const PICKER_OPTIONS: CameraOptions = {
  mediaType: 'photo',
  includeBase64: true,
  maxWidth: 800,
  maxHeight: 800,
  quality: 0.6,
};
const MAX_IMAGE_LENGTH = 700_000;

// Turns the picker's answer into a data URI. Returns null if the user cancelled
function toDataUri(response: ImagePickerResponse): string | null {
  if (response.didCancel) {
    return null;
  }
  if (response.errorCode === 'camera_unavailable') {
    throw new Error('This device has no camera');
  }
  if (response.errorCode) {
    throw new Error(response.errorMessage ?? 'Could not open the picker');
  }

  const asset = response.assets?.[0];
  if (!asset?.base64) {
    return null;
  }

  const dataUri = `data:${asset.type ?? 'image/jpeg'};base64,${asset.base64}`;
  if (dataUri.length > MAX_IMAGE_LENGTH) {
    throw new Error('The image is too large. Please choose another one');
  }
  return dataUri;
}

// Opens the camera or the photo library and returns the chosen photo
export async function pickImage(source: ImageSource): Promise<string | null> {
  const response =
    source === 'camera'
      ? await launchCamera(PICKER_OPTIONS)
      : await launchImageLibrary(PICKER_OPTIONS);
  return toDataUri(response);
}
