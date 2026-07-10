import { useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Chip } from '@/components/ui/Chip';
import { Card } from '@/components/ui/Card';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { generateRecipeFromPitch } from '@/services/recipe-service';
import { useTheme } from '@/hooks/use-theme';
import { useResponsive } from '@/hooks/use-responsive';

const EXAMPLES = [
  'A cozy one-pot autumn dinner with squash',
  'Quick weeknight pasta, under 30 minutes',
  'Use up leftover roast chicken',
  'An impressive but easy dinner-party dessert',
  'Something spicy and vegetarian for lunch',
];

export default function PitchScreen() {
  const router = useRouter();
  const theme = useTheme();
  const c = theme.colors;
  const { isWide } = useResponsive();
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [recipe, setRecipe] = useState<any | null>(null);

  const handleGenerate = async () => {
    const trimmed = prompt.trim();
    if (!trimmed) {
      Alert.alert('Pitch a dish', 'Describe what you feel like eating and let the chef dream it up.');
      return;
    }
    setLoading(true);
    setRecipe(null);
    try {
      const result = await generateRecipeFromPitch(trimmed);
      setRecipe(result);
    } catch (error: any) {
      console.error('Recipe generation failed:', error);
      Alert.alert('Could not dream that up', error.message || 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUseRecipe = () => {
    if (!recipe) return;
    const md = recipe.metadata ?? {};
    const importData = {
      title: recipe.title,
      ingredients: (recipe.ingredients ?? []).map((ing: any) => ({
        text: ing.text,
        id: '',
        quantity: String(ing.quantity ?? ''),
        unit: ing.unit ?? '',
      })),
      steps: recipe.instructions ?? recipe.steps ?? [],
      notes: recipe.notes ?? '',
      imageUrl: '',
      prepTime: String(md.prep_time ?? ''),
      cookTime: String(md.cook_time ?? ''),
      servings: String(md.servings ?? ''),
      source: '',
    };
    (global as any).__pendingRecipeImport = importData;
    router.push({ pathname: '/new-recipe', params: { fromImport: 'true' } } as any);
  };

  const md = recipe?.metadata ?? {};
  const ingredientCount = recipe?.ingredients?.length ?? 0;
  const stepCount = recipe?.instructions?.length ?? 0;
  const totalTime = (md.prep_time ?? 0) + (md.cook_time ?? 0);

  return (
    <Screen>
      <ScreenHeader title="Pitch me a recipe" onBack={() => router.back()} />

      <ScrollView contentContainerStyle={[styles.content, isWide && styles.contentWide]}>
        <Text variant="body" color="fgMuted">
          Describe a craving, an occasion, or a few ingredients on hand — the chef will invent a
          recipe for you, honoring your House preferences.
        </Text>

        <View style={{ marginTop: theme.spacing.xl }}>
          <Text variant="label" color="fgMuted">Your pitch</Text>
          <Input
            value={prompt}
            onChangeText={(t) => { setPrompt(t); if (recipe) setRecipe(null); }}
            placeholder="Something cozy with butternut squash…"
            editable={!loading}
            multiline
            size="lg"
            style={{ marginTop: theme.spacing.sm, minHeight: 88 }}
          />
        </View>

        <View style={styles.exampleRow}>
          {EXAMPLES.map((ex) => (
            <Pressable key={ex} onPress={() => { setPrompt(ex); setRecipe(null); }} disabled={loading}>
              <Chip size="sm" tone={c.secondary}>{ex}</Chip>
            </Pressable>
          ))}
        </View>

        <Button
          onPress={handleGenerate}
          loading={loading}
          disabled={loading || !prompt.trim()}
          fullWidth
          size="lg"
          icon={!loading ? <Ionicons name="restaurant" size={18} color={c.accentFg} /> : undefined}
          style={{ marginTop: theme.spacing.xl }}
        >
          {loading ? 'Dreaming up a recipe…' : 'Dream it up'}
        </Button>

        {recipe && (
          <Card inset style={{ marginTop: theme.spacing.xl }}>
            <Text variant="h2">{recipe.title || 'Untitled recipe'}</Text>

            <View style={styles.metaRow}>
              <Chip size="sm" icon={<Ionicons name="list-outline" size={13} color={c.fg} />}>
                {`${ingredientCount} ${ingredientCount === 1 ? 'ingredient' : 'ingredients'}`}
              </Chip>
              <Chip size="sm" icon={<Ionicons name="footsteps-outline" size={13} color={c.fg} />}>
                {`${stepCount} ${stepCount === 1 ? 'step' : 'steps'}`}
              </Chip>
              {!!md.servings && (
                <Chip size="sm" icon={<Ionicons name="people-outline" size={13} color={c.fg} />}>
                  {`${md.servings} servings`}
                </Chip>
              )}
              {totalTime > 0 && (
                <Chip size="sm" tone={c.accent} icon={<Ionicons name="time-outline" size={13} color={c.accent} />}>
                  {`${totalTime} min`}
                </Chip>
              )}
            </View>

            {ingredientCount > 0 && (
              <View style={{ marginTop: theme.spacing.lg }}>
                <Text variant="label" color="fgMuted">Ingredients</Text>
                <View style={{ marginTop: theme.spacing.sm, gap: 4 }}>
                  {recipe.ingredients.slice(0, 6).map((ing: any, i: number) => (
                    <Text key={i} variant="small" color="fgMuted">
                      {`• ${[ing.quantity, ing.unit, ing.text].filter(Boolean).join(' ')}`}
                    </Text>
                  ))}
                  {ingredientCount > 6 && (
                    <Text variant="small" color="fgSubtle">{`+ ${ingredientCount - 6} more`}</Text>
                  )}
                </View>
              </View>
            )}

            <View style={{ flexDirection: 'row', gap: theme.spacing.md, marginTop: theme.spacing.lg }}>
              <Button variant="ghost" onPress={handleGenerate} style={{ flex: 1 }} icon={<Ionicons name="refresh" size={16} color={c.fg} />}>
                Try again
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
  exampleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
});
