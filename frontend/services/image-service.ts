import { supabase } from '@/lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';
import { API_ENDPOINTS } from '@/config/api';

/**
 * Request camera permissions
 */
export async function requestCameraPermission(): Promise<boolean> {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  return status === 'granted';
}

/**
 * Request media library permissions
 */
export async function requestMediaLibraryPermission(): Promise<boolean> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  return status === 'granted';
}

/**
 * Take a photo with the camera
 */
export async function takePhoto(): Promise<string | null> {
  const hasPermission = await requestCameraPermission();
  if (!hasPermission) {
    throw new Error('Camera permission not granted');
  }

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [4, 3],
    quality: 0.8,
  });

  if (result.canceled) {
    return null;
  }

  return result.assets[0].uri;
}

/**
 * Pick an image from the gallery
 */
export async function pickImage(): Promise<string | null> {
  const hasPermission = await requestMediaLibraryPermission();
  if (!hasPermission) {
    throw new Error('Media library permission not granted');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [4, 3],
    quality: 0.8,
  });

  if (result.canceled) {
    return null;
  }

  return result.assets[0].uri;
}

/**
 * Upload an image to Supabase storage
 * Returns both the public URL and the storage path
 */
export async function uploadRecipeImage(uri: string, userId: string): Promise<{ url: string; path: string }> {
  try {
    // Generate a unique filename
    const timestamp = Date.now();
    const filename = `${userId}/${timestamp}.jpg`;

    // Fetch the image as a blob
    const response = await fetch(uri);
    const blob = await response.blob();

    // Upload to Supabase storage
    const { data, error } = await supabase.storage
      .from('images')
      .upload(filename, blob, {
        contentType: 'image/jpeg',
        upsert: false,
      });


    if (error) {
      console.error('Error uploading image:', error);
      throw error;
    }

    // Get the public URL
    const { data: { publicUrl } } = supabase.storage
      .from('images')
      .getPublicUrl(filename);

    return {
      url: publicUrl,
      path: filename, // Return the storage path
    };
  } catch (error) {
    console.error('Failed to upload image:', error);
    throw error;
  }
}

/**
 * Parse recipe from image using OCR
 * Downloads the image from Supabase and sends it as multipart form data
 */
export async function parseRecipeFromImage(imageUrl: string, imagePath: string): Promise<any> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  try {
    // Download the image from Supabase
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error('Failed to download image');
    }
    
    const imageBlob = await imageResponse.blob();
    
    // Create form data
    const formData = new FormData();
    formData.append('image', imageBlob, 'recipe-image.jpg');
    formData.append('userId', user.id);

    // Call backend API with multipart form data
    const response = await fetch(API_ENDPOINTS.PARSE_RECIPE_IMAGE, {
      method: 'POST',
      body: formData,
      // Don't set Content-Type header - browser will set it with boundary
    });


    if (!response.ok) {
      const errorText = await response.text();
      console.error('Parse recipe error:', errorText);
      throw new Error('Failed to parse recipe from image');
    }

    const data = await response.json();
    console.log(data);
    
    // Add the image path as source
    return {
      ...data,
      source: imagePath, // Store the storage path as source
    };
  } catch (error) {
    console.error('Failed to parse recipe from image:', error);
    throw error;
  }
}
