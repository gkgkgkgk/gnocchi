import * as ImagePicker from 'expo-image-picker';
import { api } from '@/lib/api';

export async function requestCameraPermission(): Promise<boolean> {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  return status === 'granted';
}

export async function requestMediaLibraryPermission(): Promise<boolean> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  return status === 'granted';
}

export async function takePhoto(): Promise<string | null> {
  if (!(await requestCameraPermission())) throw new Error('Camera permission not granted');
  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [4, 3],
    quality: 0.8,
  });
  return result.canceled ? null : result.assets[0].uri;
}

export async function pickImage(): Promise<string | null> {
  if (!(await requestMediaLibraryPermission()))
    throw new Error('Media library permission not granted');
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [4, 3],
    quality: 0.8,
  });
  return result.canceled ? null : result.assets[0].uri;
}

/**
 * Parse a recipe from a photo URI. Backend OCRs the image and returns an
 * `ImportedRecipe` shape ({recipe, source_url, source_image}). Callers
 * consume the `.recipe` field.
 */
export async function parseRecipeFromImage(uri: string): Promise<any> {
  const response = await fetch(uri);
  const blob = await response.blob();
  const fd = new FormData();
  fd.append('image', blob, 'recipe.jpg');
  return api.upload('/import/photo', fd);
}
