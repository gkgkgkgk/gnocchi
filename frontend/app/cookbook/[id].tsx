import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { EmptyState } from '@/components/ui/EmptyState';
import { blockPress, type PressState } from '@/components/ui/press';
import { RecipeCard } from '@/components/recipe-card';
import { clothFor } from '@/components/cookbook-card';
import { Rise } from '@/components/kitchen/motion';
import { fetchCookbookRecipes, Cookbook } from '@/services/cookbook-service';
import { Recipe } from '@/services/recipe-service';
import { useTheme } from '@/hooks/use-theme';
import { useResponsive } from '@/hooks/use-responsive';

/**
 * One cookbook: its cloth cover with the name and count, then its recipes
 * as the same cards the home screen uses.
 */
export default function CookbookScreen() {
  const router = useRouter();
  const theme = useTheme();
  const c = theme.colors;
  const { id } = useLocalSearchParams();
  const { columns } = useResponsive();
  const [cookbook, setCookbook] = useState<Cookbook | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchCookbookRecipes(id as string);
        setCookbook(data.cookbook);
        setRecipes(data.recipes);
      } catch (err) {
        console.error('Failed to load cookbook:', err);
        setError('Could not load this cookbook.');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const back = () => (router.canGoBack() ? router.back() : router.replace('/(drawer)/(tabs)/explore' as any));

  if (loading || !cookbook) {
    return (
      <Screen>
        <View style={styles.center}>
          {loading ? <ActivityIndicator color={c.accent} /> : <Text variant="body" color="danger">{error || 'Cookbook not found'}</Text>}
        </View>
      </Screen>
    );
  }

  const cloth = clothFor(cookbook.name, c);

  return (
    <Screen>
      <FlatList
        data={recipes}
        key={`grid-${columns}`}
        numColumns={columns}
        keyExtractor={(r) => r.id}
        contentContainerStyle={{ padding: 12, paddingBottom: 48 }}
        ListHeaderComponent={(
          <View style={{ padding: 8, paddingBottom: 16 }}>
            <Pressable
              onPress={back}
              accessibilityRole="button"
              accessibilityLabel="Back to cookbooks"
              style={(state) => [styles.iconBlock, { backgroundColor: c.bgElevated, borderColor: c.outline }, blockPress(theme, state as PressState, 2, 2)]}
            >
              <Ionicons name="chevron-back" size={20} color={c.fg} />
            </Pressable>
            <Rise>
              <View style={[styles.cover, { backgroundColor: cloth.bg, borderColor: c.outline, ...theme.shadow.lg }]}>
                <View style={[styles.spine, { borderColor: c.outline }]} />
                <View style={[styles.label, { backgroundColor: c.bgElevated, borderColor: c.outline }]}>
                  <Text variant="label" color="accent">COOKBOOK</Text>
                  <Text variant="display" accessibilityRole="header">{cookbook.name}</Text>
                  {cookbook.description ? <Text variant="body" color="fgMuted" style={{ marginTop: 6 }}>{cookbook.description}</Text> : null}
                  <Text variant="small" color="fgMuted" style={{ marginTop: 8 }}>
                    {recipes.length} {recipes.length === 1 ? 'recipe' : 'recipes'}
                  </Text>
                </View>
              </View>
            </Rise>
          </View>
        )}
        ListEmptyComponent={(
          <EmptyState doodle="book" title="An empty book" line="Add recipes to it from the Cookbooks tab." />
        )}
        renderItem={({ item, index }) => (
          <Rise index={index + 1} style={{ flex: 1 / columns, minWidth: 0 }}>
            <RecipeCard
              {...item}
              tags={item.metadata?.tags || []}
              onPress={() => router.push(`/recipe/${item.id}?from=cookbook&cookbookId=${id}` as any)}
            />
          </Rise>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  iconBlock: { width: 42, height: 42, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  cover: { borderRadius: 24, borderWidth: 2, paddingVertical: 22, paddingLeft: 44, paddingRight: 22, overflow: 'hidden' },
  spine: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 22, borderRightWidth: 2, backgroundColor: 'rgba(0,0,0,0.14)' },
  label: { borderWidth: 2, borderRadius: 16, padding: 18, maxWidth: 640 },
});
