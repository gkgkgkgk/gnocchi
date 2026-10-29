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
import { Mascot } from '@/components/kitchen/mascot';
import { Plate } from '@/components/kitchen/shapes';
import { Bob } from '@/components/kitchen/motion';
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
          optional: !!ing.optional,
          section: ing.section ?? null,
        })),
        steps: recipeData.steps ?? recipeData.instructions ?? [],
        notes: recipeData.notes ?? '',
        imageUrl: undefined,
        // Keep the scanned photo so it's saved as the recipe's cover image,
        // not just used for OCR. new-recipe uploads this on save.
        localPhotoUri: imageUri,
        prepTime: (recipeData.prep_time ?? 0).toString(),
        cookTime: (recipeData.cook_time ?? 0).toString(),
        servings: (recipeData.servings ?? 1).toString(),
        source: undefined,
        sourceType: 'photo',
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
      <ScreenHeader title="Snap a recipe" onBack={() => router.back()} />

      <ScrollView contentContainerStyle={styles.content}>
        {imageUri ? (
          <View style={[styles.imageContainer, { backgroundColor: c.bgMuted, borderRadius: theme.radius.xl, borderWidth: 2, borderColor: c.outline }]}>
            <Image source={{ uri: imageUri }} style={styles.image} contentFit="contain" />
            <Pressable style={styles.retakeButton} onPress={() => setImageUri(null)}>
              <Ionicons name="close-circle" size={32} color="#fff" />
            </Pressable>
          </View>
        ) : (
          <View style={[styles.placeholder, { borderColor: c.borderStrong, borderRadius: theme.radius.xl, backgroundColor: c.bgElevated }]}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end' }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              <Bob><Mascot size={110} /></Bob>
              <Plate size={84} />
            </View>
            <Text variant="h2" style={{ marginTop: 16, textAlign: 'center' }}>A cookbook page, a card, a screenshot</Text>
            <Text variant="body" color="fgMuted" style={{ marginTop: 6, textAlign: 'center', maxWidth: 360 }}>
              Gnocchi reads the ingredients and steps, then you check them over before saving.
            </Text>
          </View>
        )}

        <View style={styles.buttons}>
          {!imageUri ? (
            <>
              <Button onPress={handleTakePhoto} fullWidth size="lg" icon={<Ionicons name="camera" size={20} color={c.accentFg} />}>
                Take a photo
              </Button>
              <Button onPress={handlePickImage} variant="secondary" fullWidth size="lg" icon={<Ionicons name="images" size={20} color={c.fg} />}>
                Choose a photo
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
              {busy ? (uploading ? 'Uploading…' : 'Reading the recipe…') : 'Read this recipe'}
            </Button>
          )}
        </View>

      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, width: '100%', maxWidth: 720, alignSelf: 'center' },
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
});
