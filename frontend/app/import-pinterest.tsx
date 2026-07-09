import { useState } from 'react';
import { View, StyleSheet, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { importFromPinterest } from '@/services/pinterest-service';
import { useTheme } from '@/hooks/use-theme';

export default function ImportPinterestScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const handleImport = async () => {
    if (!url.trim()) {
      Alert.alert('Error', 'Please enter a Pinterest URL');
      return;
    }

    setLoading(true);
    try {
      const result = await importFromPinterest(url.trim());

      router.push({
        pathname: '/new-recipe',
        params: {
          importedData: JSON.stringify({
            title: result.recipe.title,
            ingredients: (result.recipe.ingredients ?? []).map((ing: any) => ({
              text: ing.text,
              id: '',
              quantity: String(ing.quantity ?? ''),
              unit: ing.unit ?? '',
            })),
            steps: result.recipe.steps ?? [],
            notes: result.recipe.notes ?? '',
            imageUrl: result.source_image ?? '',
            prepTime: String(result.recipe.prep_time ?? ''),
            cookTime: String(result.recipe.cook_time ?? ''),
            servings: String(result.recipe.servings ?? ''),
            source: result.source_url ?? '',
          }),
        },
      } as any);
    } catch (error: any) {
      console.error('Import failed:', error);
      Alert.alert('Import Failed', error.message || 'Failed to import recipe from Pinterest');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <ScreenHeader title="Import from Pinterest" onBack={() => router.back()} />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <View style={[styles.iconCircle, { backgroundColor: theme.colors.accentMuted }]}>
            <Ionicons name="logo-pinterest" size={32} color={theme.colors.accent} />
          </View>
          <Text variant="h1" style={styles.center}>Pinterest Recipe Import</Text>
          <Text variant="body" color="fgMuted" style={[styles.center, { marginTop: theme.spacing.sm }]}>
            Paste a Pinterest link to a recipe and we&apos;ll automatically extract all the details for you.
          </Text>
        </View>

        <View style={{ marginTop: theme.spacing['2xl'] }}>
          <Text variant="label" color="fgMuted" style={{ marginBottom: theme.spacing.sm }}>
            Pinterest URL
          </Text>
          <Input
            value={url}
            onChangeText={setUrl}
            placeholder="https://pin.it/..."
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            editable={!loading}
            size="lg"
          />
        </View>

        <Button
          onPress={handleImport}
          loading={loading}
          disabled={loading}
          fullWidth
          size="lg"
          style={{ marginTop: theme.spacing.xl }}
        >
          Import Recipe
        </Button>

        <Text variant="small" color="fgSubtle" style={[styles.center, { marginTop: theme.spacing.xl }]}>
          💡 Works with Pinterest pins that link to recipe websites.
        </Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 24 },
  hero: { alignItems: 'center', marginTop: 16 },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  center: { textAlign: 'center' },
});
