import { useState } from 'react';
import { View, StyleSheet, Pressable, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Ionicons } from '@expo/vector-icons';
import { takePhoto, pickImage, parseRecipeFromImage } from '@/services/image-service';

export default function ScanPhotoScreen() {
  const router = useRouter();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);

  const handleTakePhoto = async () => {
    try {
      const uri = await takePhoto();
      if (uri) {
        setImageUri(uri);
      }
    } catch (error: any) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', error.message || 'Failed to take photo');
    }
  };

  const handlePickImage = async () => {
    try {
      const uri = await pickImage();
      if (uri) {
        setImageUri(uri);
      }
    } catch (error: any) {
      console.error('Error picking image:', error);
      Alert.alert('Error', error.message || 'Failed to pick image');
    }
  };

  const handleProcessImage = async () => {
    if (!imageUri) return;

    try {
      setUploading(true);

      // Send the local image URI straight to /import/photo; backend OCRs it.
      const imported = await parseRecipeFromImage(imageUri);
      const recipeData = imported.recipe ?? imported;

      setUploading(false);
      setProcessing(true);

      const importData = {
        title: recipeData.title,
        ingredients: (recipeData.ingredients ?? []).map((ing: any) => ({
          text: ing.text,
          id: '',
          quantity: (ing.quantity ?? 0).toString(),
          unit: ing.unit ?? '',
        })),
        steps: recipeData.steps ?? recipeData.instructions ?? [],
        notes: recipeData.notes ?? '',
        imageUrl: undefined,
        prepTime: (recipeData.prep_time ?? 0).toString(),
        cookTime: (recipeData.cook_time ?? 0).toString(),
        servings: (recipeData.servings ?? 1).toString(),
        source: undefined,
      };

      setProcessing(false);
      
      // Store in global state temporarily
      (global as any).__pendingRecipeImport = importData;
      
      router.push({
        pathname: '/new-recipe',
        params: {
          fromImport: 'true',
        },
      } as any);
    } catch (error: any) {
      console.error('Error processing image:', error);
      Alert.alert('Error', error.message || 'Failed to process image');
      setUploading(false);
      setProcessing(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </Pressable>
          <ThemedText style={styles.title}>Scan Recipe Photo</ThemedText>
          <View style={styles.backButton} />
        </View>

        {/* Image preview */}
        {imageUri ? (
          <View style={styles.imageContainer}>
            <Image source={{ uri: imageUri }} style={styles.image} contentFit="contain" />
            <Pressable style={styles.retakeButton} onPress={() => setImageUri(null)}>
              <Ionicons name="close-circle" size={32} color="#fff" />
            </Pressable>
          </View>
        ) : (
          <View style={styles.placeholderContainer}>
            <Ionicons name="camera-outline" size={80} color="#ccc" />
            <ThemedText style={styles.placeholderText}>
              Take a photo or select from gallery
            </ThemedText>
          </View>
        )}

        {/* Action buttons */}
        {!imageUri ? (
          <View style={styles.buttonContainer}>
            <Pressable style={styles.actionButton} onPress={handleTakePhoto}>
              <Ionicons name="camera" size={24} color="#fff" />
              <ThemedText style={styles.actionButtonText}>Take Photo</ThemedText>
            </Pressable>

            <Pressable style={styles.actionButton} onPress={handlePickImage}>
              <Ionicons name="images" size={24} color="#fff" />
              <ThemedText style={styles.actionButtonText}>Choose from Gallery</ThemedText>
            </Pressable>
          </View>
        ) : (
          <View style={styles.buttonContainer}>
            <Pressable
              style={[styles.processButton, (uploading || processing) && styles.processButtonDisabled]}
              onPress={handleProcessImage}
              disabled={uploading || processing}
            >
              {uploading || processing ? (
                <>
                  <ActivityIndicator color="#fff" />
                  <ThemedText style={styles.processButtonText}>
                    {uploading ? 'Uploading...' : 'Processing...'}
                  </ThemedText>
                </>
              ) : (
                <>
                  <Ionicons name="sparkles" size={24} color="#fff" />
                  <ThemedText style={styles.processButtonText}>Process Recipe</ThemedText>
                </>
              )}
            </Pressable>
          </View>
        )}

        {/* Info text */}
        <View style={styles.infoContainer}>
          <ThemedText style={styles.infoText}>
            📸 Take a clear photo of the recipe
          </ThemedText>
          <ThemedText style={styles.infoText}>
            ✨ AI will extract ingredients and instructions
          </ThemedText>
          <ThemedText style={styles.infoText}>
            ✏️ Review and edit before saving
          </ThemedText>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 400,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 24,
    backgroundColor: '#f0f0f0',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  retakeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
  },
  placeholderContainer: {
    width: '100%',
    height: 400,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  placeholderText: {
    fontSize: 16,
    opacity: 0.6,
    marginTop: 16,
    textAlign: 'center',
  },
  buttonContainer: {
    gap: 12,
    marginBottom: 24,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  processButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2196F3',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  processButtonDisabled: {
    opacity: 0.6,
  },
  processButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  infoContainer: {
    gap: 8,
    padding: 16,
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
    borderRadius: 12,
  },
  infoText: {
    fontSize: 14,
    opacity: 0.8,
  },
});
