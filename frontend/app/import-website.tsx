import { useState } from 'react';
import { View, StyleSheet, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { importFromWebsite } from '@/services/pinterest-service';
import { useTheme } from '@/hooks/use-theme';

export default function ImportWebsiteScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const handleImport = async () => {
    if (!url.trim()) {
      Alert.alert('Error', 'Please enter a website URL');
      return;
    }

    setLoading(true);
    try {
      const result = await importFromWebsite(url.trim());

      const importData = {
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
      };

      (global as any).__pendingRecipeImport = importData;

      router.push({
        pathname: '/new-recipe',
        params: { fromImport: 'true' },
      } as any);
    } catch (error: any) {
      console.error('Import failed:', error);
      Alert.alert('Import Failed', error.message || 'Failed to import recipe from website');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <ScreenHeader title="Import from Website" onBack={() => router.back()} />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <View style={[styles.iconCircle, { backgroundColor: theme.colors.accentMuted }]}>
            <Ionicons name="globe-outline" size={32} color={theme.colors.accent} />
          </View>
          <Text variant="h1" style={styles.center}>Recipe Website Import</Text>
          <Text variant="body" color="fgMuted" style={[styles.center, { marginTop: theme.spacing.sm }]}>
            Paste a link to any recipe website and we&apos;ll automatically extract all the details for you.
          </Text>
        </View>

        <View style={{ marginTop: theme.spacing['2xl'] }}>
          <Text variant="label" color="fgMuted" style={{ marginBottom: theme.spacing.sm }}>
            Website URL
          </Text>
          <Input
            value={url}
            onChangeText={setUrl}
            placeholder="https://example.com/recipe"
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
          💡 Works best with popular recipe sites that use standard recipe formats.
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
