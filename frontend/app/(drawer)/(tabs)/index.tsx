import { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator, Alert, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';

import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { RecipeCard } from '@/components/recipe-card';
import { FloatingActionButton } from '@/components/floating-action-button';
import { Pot, SheetTray, Skillet } from '@/components/kitchen/shapes';
import { PageHeader } from '@/components/kitchen/page-header';
import { Rise } from '@/components/kitchen/motion';
import { originOf } from '@/utils/recipe-origin';
import { fetchRecipes, deleteRecipe, Recipe } from '@/services/recipe-service';
import { getUserTags, RecipeTag } from '@/services/profile-service';
import { useTheme } from '@/hooks/use-theme';
import { useResponsive } from '@/hooks/use-responsive';

type SortKey = 'recent' | 'rating' | 'cooks';
type LibraryFilter = 'all' | 'made' | 'adapted' | 'imported';
const LIBRARY_FILTERS: { key: LibraryFilter; label: string }[] = [
  { key: 'all', label: 'All recipes' },
  { key: 'made', label: 'Made by me' },
  { key: 'adapted', label: 'Adapted' },
  { key: 'imported', label: 'Imported' },
];
const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'recent', label: 'Recent' },
  { key: 'rating', label: 'Rating' },
  { key: 'cooks', label: 'Most cooked' },
];

export default function HomeScreen() {
  const router = useRouter();
  const isFocused = useIsFocused();
  const theme = useTheme();
  const c = theme.colors;
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [userTags, setUserTags] = useState<RecipeTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [libraryFilter, setLibraryFilter] = useState<LibraryFilter>('all');
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<SortKey>('recent');
  const { columns: numColumns } = useResponsive();

  const toggleTag = (id: string) =>
    setActiveTags((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));

  // Search (title + ingredient text), tag filter (recipe must have every
  // selected tag), then sort. Recomputed only when inputs change.
  const visibleRecipes = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = recipes.filter((r) => {
      const origin = originOf(r.source_type, r.source_recipe_id, r.source_url);
      if (libraryFilter === 'made' && !['made', 'ai'].includes(origin)) return false;
      if (libraryFilter === 'adapted' && origin !== 'adapted') return false;
      if (libraryFilter === 'imported' && origin !== 'imported') return false;
      if (q) {
        const inTitle = r.title?.toLowerCase().includes(q);
        const inIngredients = r.ingredients?.some((i) => i.text?.toLowerCase().includes(q));
        if (!inTitle && !inIngredients) return false;
      }
      if (activeTags.length > 0) {
        const tags = r.metadata?.tags ?? r.tags ?? [];
        if (!activeTags.every((t) => tags.includes(t))) return false;
      }
      return true;
    });
    const byRecent = (a: Recipe, b: Recipe) =>
      (b.created_at || '').localeCompare(a.created_at || '');
    return filtered.sort((a, b) => {
      if (sortBy === 'rating') return (b.rating ?? 0) - (a.rating ?? 0) || byRecent(a, b);
      if (sortBy === 'cooks') return (b.cook_history?.length ?? 0) - (a.cook_history?.length ?? 0) || byRecent(a, b);
      return byRecent(a, b);
    });
  }, [recipes, search, activeTags, sortBy, libraryFilter]);

  useEffect(() => {
    if (!isFocused) return;
    loadRecipes();
    loadTags();
  }, [isFocused]);

  const loadTags = async () => {
    try {
      setUserTags(await getUserTags());
    } catch (err) {
      console.error('Failed to load tags:', err);
    }
  };

  const loadRecipes = async () => {
    try {
      setLoading(true);
      setError(null);
      setRecipes(await fetchRecipes());
    } catch (err) {
      console.error('Failed to load recipes:', err);
      setError('Failed to load recipes');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteRecipe(id);
      await loadRecipes();
    } catch (err) {
      console.error('Delete failed:', err);
      Alert.alert('Error', 'Failed to delete recipe');
    }
  };

  return (
    <Screen>
      <PageHeader
        title="Your recipes"
        subtitle={recipes.length === 0 ? 'A good meal starts here.' : `${recipes.length} on the shelf`}
        art={<><Pot size={70} /><Skillet size={84} rotate={-30} /><SheetTray size={70} rotate={-6} /></>}
      />

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={c.accent} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text variant="body" color="danger">{error}</Text>
          <Button onPress={loadRecipes} style={{ marginTop: 16 }}>Try again</Button>
        </View>
      ) : recipes.length === 0 ? (
        <EmptyState
          doodle="bowl"
          title="The counter's clear"
          line="Paste a link, snap a photo, or type one in."
          action={<Button onPress={() => router.push('/import' as any)}>Add your first recipe</Button>}
        />
      ) : (
        <>
          {/* Filter bar — stays pinned above the scrolling grid. */}
          <View style={styles.filterBar}>
            <View style={styles.searchWrap}>
              <Ionicons name="search" size={18} color={c.fgSubtle} style={styles.searchIcon} />
              <Input
                placeholder="Search recipes"
                value={search}
                onChangeText={setSearch}
                containerStyle={{ flex: 1 }}
                style={{ paddingLeft: 40, paddingRight: search ? 40 : undefined }}
                returnKeyType="search"
              />
              {search ? (
                <Pressable onPress={() => setSearch('')} style={styles.clearBtn} hitSlop={8}>
                  <Ionicons name="close-circle" size={18} color={c.fgSubtle} />
                </Pressable>
              ) : null}
            </View>

            {/* One row of filters: where a recipe came from, then the
                household's tags. Sort cycles from the trailing button. */}
            <View style={styles.filterRow}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow} style={{ flex: 1 }}>
                {LIBRARY_FILTERS.map((option) => (
                  <Chip key={option.key} size="sm" onPress={() => setLibraryFilter(option.key)} variant={libraryFilter === option.key ? 'accent' : 'outline'}>
                    {option.label}
                  </Chip>
                ))}
                {userTags.length > 0 && <View style={[styles.chipDivider, { backgroundColor: c.borderStrong }]} />}
                {userTags.map((tag) => {
                  const on = activeTags.includes(tag.id);
                  return (
                    <Chip
                      key={tag.id}
                      size="sm"
                      onPress={() => toggleTag(tag.id)}
                      variant={on ? 'accent' : 'outline'}
                      tone={tag.color}
                    >
                      {tag.name}
                    </Chip>
                  );
                })}
              </ScrollView>
              <Pressable
                onPress={() => setSortBy(SORT_OPTIONS[(SORT_OPTIONS.findIndex((o) => o.key === sortBy) + 1) % SORT_OPTIONS.length].key)}
                accessibilityRole="button"
                accessibilityLabel={`Sort: ${SORT_OPTIONS.find((o) => o.key === sortBy)?.label}. Tap to change.`}
                style={styles.sortButton}
                hitSlop={6}
              >
                <Ionicons name="swap-vertical" size={15} color={c.fgMuted} />
                <Text variant="label" color="fgMuted">{SORT_OPTIONS.find((o) => o.key === sortBy)?.label}</Text>
              </Pressable>
            </View>
          </View>

          {visibleRecipes.length === 0 ? (
            <View style={styles.centered}>
              <Text variant="body" color="fgMuted">No recipes match your filters.</Text>
              <Button variant="ghost" onPress={() => { setSearch(''); setActiveTags([]); setLibraryFilter('all'); }} style={{ marginTop: 12 }}>
                Clear filters
              </Button>
            </View>
          ) : (
            <FlatList
              data={visibleRecipes}
              key={`grid-${numColumns}`}
              numColumns={numColumns}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ padding: theme.spacing.md, paddingBottom: theme.spacing['3xl'] }}
              renderItem={({ item, index }) => (
                <Rise index={index} style={{ flex: 1 / numColumns, minWidth: 0 }}>
                  <RecipeCard
                    {...item}
                    tags={item.metadata?.tags || []}
                    userTags={userTags}
                    onPress={() => router.push(`/recipe/${item.id}` as any)}
                    onEdit={() => router.push(`/new-recipe?id=${item.id}` as any)}
                    onDelete={() => handleDelete(item.id)}
                    onTagsChange={(tagIds) => {
                      setRecipes((current) => current.map(r =>
                        r.id === item.id ? { ...r, metadata: { ...r.metadata, tags: tagIds } } : r,
                      ));
                    }}
                  />
                </Rise>
              )}
            />
          )}
        </>
      )}

      <FloatingActionButton onPress={() => router.push('/import' as any)} label="Add recipe" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  filterRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4, marginHorizontal: -6 },
  chipDivider: { width: 2, alignSelf: 'stretch', marginVertical: 4, borderRadius: 1 },
  sortButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6 },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  filterBar: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  searchIcon: {
    position: 'absolute',
    left: 14,
    zIndex: 1,
  },
  clearBtn: {
    position: 'absolute',
    right: 12,
  },
  // Room around the chips so the selected chip's shadow and focus ring
  // aren't clipped by the horizontal scroller.
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
});
