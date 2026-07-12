import { useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, Image, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Chip } from '@/components/ui/Chip';
import { Card } from '@/components/ui/Card';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { importFromPinterest, importFromWebsite, importFromInstagram, ImportResponse } from '@/services/pinterest-service';
import { useTheme } from '@/hooks/use-theme';
import { useResponsive } from '@/hooks/use-responsive';

type Source = 'pinterest' | 'instagram' | 'website';

const SOURCE_META: Record<Source, { label: string; icon: keyof typeof Ionicons.glyphMap }> = {
  pinterest: { label: 'Pinterest pin', icon: 'logo-pinterest' },
  instagram: { label: 'Instagram post', icon: 'logo-instagram' },
  website:   { label: 'Recipe website', icon: 'globe-outline' },
};

function detectSource(url: string): Source {
  const u = url.toLowerCase();
  if (u.includes('pinterest.') || u.includes('pin.it')) return 'pinterest';
  if (u.includes('instagram.')) return 'instagram';
  return 'website';
}

export default function ImportScreen() {
  const router = useRouter();
  const theme = useTheme();
  const c = theme.colors;
  const { isWide } = useResponsive();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<ImportResponse | null>(null);

  const source = useMemo(() => (url.trim() ? detectSource(url) : null), [url]);

  const handlePreview = async () => {
    const trimmed = url.trim();
    if (!trimmed) {
      Alert.alert('Add a link', 'Paste a recipe URL to import.');
      return;
    }
    setLoading(true);
    setPreview(null);
    try {
      const src = detectSource(trimmed);
      const result =
        src === 'pinterest'
          ? await importFromPinterest(trimmed)
          : src === 'instagram'
            ? await importFromInstagram(trimmed)
            : await importFromWebsite(trimmed);
      setPreview(result);
    } catch (error: any) {
      console.error('Import preview failed:', error);
      Alert.alert('Import failed', error.message || 'Could not read a recipe from that link.');
    } finally {
      setLoading(false);
    }
  };

  const handleUseRecipe = () => {
    if (!preview) return;
    const importData = {
      title: preview.recipe.title,
      ingredients: (preview.recipe.ingredients ?? []).map((ing: any) => ({
        text: ing.text,
        id: '',
        quantity: String(ing.quantity ?? ''),
        unit: ing.unit ?? '',
      })),
      steps: preview.recipe.steps ?? [],
      notes: preview.recipe.notes ?? '',
      imageUrl: preview.source_image ?? '',
      prepTime: String(preview.recipe.prep_time ?? ''),
      cookTime: String(preview.recipe.cook_time ?? ''),
      servings: String(preview.recipe.servings ?? ''),
      source: preview.source_url ?? '',
    };
    (global as any).__pendingRecipeImport = importData;
    router.push({ pathname: '/new-recipe', params: { fromImport: 'true' } } as any);
  };

  const r = preview?.recipe;
  const ingredientCount = r?.ingredients?.length ?? 0;
  const stepCount = r?.steps?.length ?? 0;

  return (
    <Screen>
      <ScreenHeader title="Import a recipe" onBack={() => router.back()} />

      <ScrollView contentContainerStyle={[styles.content, isWide && styles.contentWide]}>
        <Text variant="body" color="fgMuted">
          Paste a link from Pinterest, Instagram, or any recipe site — we&apos;ll pull out the
          ingredients and steps for you to review.
        </Text>

        <View style={{ marginTop: theme.spacing.xl }}>
          <View style={styles.labelRow}>
            <Text variant="label" color="fgMuted">Recipe link</Text>
            {source && (
              <Chip size="sm" icon={<Ionicons name={SOURCE_META[source].icon} size={13} color={c.accent} />} tone={c.accent}>
                {SOURCE_META[source].label}
              </Chip>
            )}
          </View>
          <Input
            value={url}
            onChangeText={(t) => { setUrl(t); if (preview) setPreview(null); }}
            placeholder="https://example.com/recipe"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            editable={!loading}
            size="lg"
            style={{ marginTop: theme.spacing.sm }}
            onSubmitEditing={handlePreview}
            returnKeyType="go"
          />
        </View>

        {source === 'instagram' && (
          <Text variant="small" color="fgSubtle" style={{ marginTop: theme.spacing.sm }}>
            We read the recipe from the post&apos;s caption — works best for public posts that
            spell out the ingredients and steps.
          </Text>
        )}

        <Button
          onPress={handlePreview}
          loading={loading}
          disabled={loading || !url.trim()}
          fullWidth
          size="lg"
          icon={!loading ? <Ionicons name="sparkles" size={18} color={c.accentFg} /> : undefined}
          style={{ marginTop: theme.spacing.xl }}
        >
          {loading ? 'Reading recipe…' : 'Preview recipe'}
        </Button>

        {/* Scrape preview — confirm the right recipe came through before
            dropping into the full edit form. */}
        {r && (
          <Card inset style={{ marginTop: theme.spacing.xl }}>
            {preview?.source_image ? (
              <Image source={{ uri: preview.source_image }} style={styles.previewImage} />
            ) : (
              <View style={[styles.previewImage, styles.previewImagePlaceholder, { backgroundColor: c.bgMuted }]}>
                <Text style={{ fontSize: 40 }}>🍽️</Text>
              </View>
            )}

            <Text variant="h2" style={{ marginTop: theme.spacing.md }}>{r.title || 'Untitled recipe'}</Text>

            <View style={styles.metaRow}>
              <Chip size="sm" icon={<Ionicons name="list-outline" size={13} color={c.fg} />}>
                {`${ingredientCount} ${ingredientCount === 1 ? 'ingredient' : 'ingredients'}`}
              </Chip>
              <Chip size="sm" icon={<Ionicons name="footsteps-outline" size={13} color={c.fg} />}>
                {`${stepCount} ${stepCount === 1 ? 'step' : 'steps'}`}
              </Chip>
              {!!r.servings && (
                <Chip size="sm" icon={<Ionicons name="people-outline" size={13} color={c.fg} />}>
                  {`${r.servings} servings`}
                </Chip>
              )}
              {!!(r.prep_time || r.cook_time) && (
                <Chip size="sm" tone={c.accent} icon={<Ionicons name="time-outline" size={13} color={c.accent} />}>
                  {`${(r.prep_time ?? 0) + (r.cook_time ?? 0)} min`}
                </Chip>
              )}
            </View>

            {ingredientCount === 0 && stepCount === 0 && (
              <Text variant="small" color="danger" style={{ marginTop: theme.spacing.sm }}>
                We couldn&apos;t find ingredients or steps on that page. Try a different link, or add it manually.
              </Text>
            )}

            <View style={{ flexDirection: 'row', gap: theme.spacing.md, marginTop: theme.spacing.lg }}>
              <Button variant="ghost" onPress={() => setPreview(null)} style={{ flex: 1 }}>
                Start over
              </Button>
              <Button onPress={handleUseRecipe} style={{ flex: 2 }} iconRight={<Ionicons name="arrow-forward" size={18} color={c.accentFg} />}>
                Edit &amp; save
              </Button>
            </View>
          </Card>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 24 },
  contentWide: { width: '100%', maxWidth: 640, alignSelf: 'center' },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  previewImage: { width: '100%', height: 200, borderRadius: 12, resizeMode: 'cover' },
  previewImagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
});
