import { useState } from 'react';
import { View, StyleSheet, Pressable, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useTheme } from '@/hooks/use-theme';
import { takePhoto, pickImage, parseRecipeFromImage } from '@/services/image-service';

export default function ScanPhotoScreen() {
  const router = useRouter();
  const theme = useTheme();
  const c = theme.colors;
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);

  const handleTakePhoto = async () => {
    try {
      const uri = await takePhoto();
      if (uri) setImageUri(uri);
    } catch (error: any) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', error.message || 'Failed to take photo');
    }
  };

  const handlePickImage = async () => {
    try {
      const uri = await pickImage();
      if (uri) setImageUri(uri);
    } catch (error: any) {
      console.error('Error picking image:', error);
      Alert.alert('Error', error.message || 'Failed to pick image');
    }
  };

  const handleProcessImage = async () => {
    if (!imageUri) return;

    try {
      setUploading(true);
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
      (global as any).__pendingRecipeImport = importData;

      router.push({
        pathname: '/new-recipe',
        params: { fromImport: 'true' },
      } as any);
    } catch (error: any) {
      console.error('Error processing image:', error);
      Alert.alert('Error', error.message || 'Failed to process image');
      setUploading(false);
      setProcessing(false);
    }
  };

  const busy = uploading || processing;

  return (
    <Screen>
      <ScreenHeader title="Scan Recipe Photo" onBack={() => router.back()} />

      <ScrollView contentContainerStyle={styles.content}>
        {imageUri ? (
          <View style={[styles.imageContainer, { backgroundColor: c.bgMuted, borderRadius: theme.radius.lg }]}>
            <Image source={{ uri: imageUri }} style={styles.image} contentFit="contain" />
            <Pressable style={styles.retakeButton} onPress={() => setImageUri(null)}>
              <Ionicons name="close-circle" size={32} color="#fff" />
            </Pressable>
          </View>
        ) : (
          <View style={[styles.placeholder, { borderColor: c.borderStrong, borderRadius: theme.radius.lg }]}>
            <Ionicons name="camera-outline" size={72} color={c.fgSubtle} />
            <Text variant="body" color="fgMuted" style={{ marginTop: 16, textAlign: 'center' }}>
              Take a photo or select from gallery
            </Text>
          </View>
        )}

        <View style={styles.buttons}>
          {!imageUri ? (
            <>
              <Button onPress={handleTakePhoto} fullWidth size="lg" icon={<Ionicons name="camera" size={20} color={c.accentFg} />}>
                Take Photo
              </Button>
              <Button onPress={handlePickImage} variant="secondary" fullWidth size="lg" icon={<Ionicons name="images" size={20} color={c.fg} />}>
                Choose from Gallery
              </Button>
            </>
          ) : (
            <Button
              onPress={handleProcessImage}
              loading={busy}
              disabled={busy}
              fullWidth
              size="lg"
              icon={!busy ? <Ionicons name="sparkles" size={20} color={c.accentFg} /> : undefined}
            >
              {busy ? (uploading ? 'Uploading…' : 'Processing…') : 'Process Recipe'}
            </Button>
          )}
        </View>

        <View style={[styles.info, { backgroundColor: c.bgMuted, borderRadius: theme.radius.lg }]}>
          <Text variant="small" color="fgMuted">📸 Take a clear photo of the recipe</Text>
          <Text variant="small" color="fgMuted">✨ AI will extract ingredients and instructions</Text>
          <Text variant="small" color="fgMuted">✏️ Review and edit before saving</Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20 },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 400,
    overflow: 'hidden',
    marginBottom: 24,
  },
  image: { width: '100%', height: '100%' },
  retakeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
  },
  placeholder: {
    width: '100%',
    height: 400,
    borderWidth: 2,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  buttons: { gap: 12, marginBottom: 24 },
  info: { gap: 8, padding: 16 },
});
