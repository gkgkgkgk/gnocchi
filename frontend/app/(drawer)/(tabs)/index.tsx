import { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator, Alert, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { WavyDecoration } from '@/components/wavy-decoration';
import { RecipeCard } from '@/components/recipe-card';
import { FloatingActionButton } from '@/components/floating-action-button';
import { AddRecipeModal } from '@/components/add-recipe-modal';
import { ProfileQuestionnaireModal } from '@/components/profile-questionnaire-modal';
import { fetchRecipes, deleteRecipe, Recipe } from '@/services/recipe-service';
import { checkUserProfile, createUserProfile, getUserTags, RecipeTag } from '@/services/profile-service';
import { useTheme } from '@/hooks/use-theme';

export default function HomeScreen() {
  const router = useRouter();
  const theme = useTheme();
  const c = theme.colors;
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [userTags, setUserTags] = useState<RecipeTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const { width } = useWindowDimensions();

  // Card sizing: aim for ~280px per card.
  const numColumns = Math.max(1, Math.min(4, Math.floor(width / 300)));

  useEffect(() => {
    loadRecipes();
    loadTags();
    checkProfile();
  }, []);

  const loadTags = async () => {
    try {
      setUserTags(await getUserTags());
    } catch (err) {
      console.error('Failed to load tags:', err);
    }
  };

  const checkProfile = async () => {
    const hasProfile = await checkUserProfile();
    if (!hasProfile) setShowProfileModal(true);
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

  const handleProfileComplete = async (answers: Record<string, any>) => {
    try {
      await createUserProfile(answers);
      setShowProfileModal(false);
    } catch (err) {
      console.error('Profile create failed:', err);
      Alert.alert('Error', 'Failed to create profile');
    }
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Text variant="display">Recipes</Text>
        <WavyDecoration variant="line" width={140} height={16} style={{ marginTop: 4 }} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={c.accent} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text variant="body" color="danger">{error}</Text>
        </View>
      ) : recipes.length === 0 ? (
        <EmptyState
          doodle="bowl"
          title="Your cookbook awaits"
          line="Import from a website, paste a photo, or type one in."
          action={<Button onPress={() => setShowAddModal(true)}>Add your first recipe</Button>}
        />
      ) : (
        <FlatList
          data={recipes}
          key={`grid-${numColumns}`}
          numColumns={numColumns}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: theme.spacing.md, paddingBottom: theme.spacing['3xl'] }}
          renderItem={({ item }) => (
            <View style={{ flex: 1 / numColumns, minWidth: 0 }}>
              <RecipeCard
                {...item}
                tags={item.metadata?.tags || []}
                userTags={userTags}
                onPress={() => router.push(`/recipe/${item.id}` as any)}
                onEdit={() => router.push(`/new-recipe?id=${item.id}` as any)}
                onDelete={() => handleDelete(item.id)}
                onTagsChange={(tagIds) => {
                  setRecipes(recipes.map(r =>
                    r.id === item.id ? { ...r, metadata: { ...r.metadata, tags: tagIds } } : r,
                  ));
                }}
              />
            </View>
          )}
        />
      )}

      <FloatingActionButton onPress={() => setShowAddModal(true)} label="Add recipe" />

      <AddRecipeModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAddFromPinterest={() => { setShowAddModal(false); router.push('/import-pinterest' as any); }}
        onAddManually={() => { setShowAddModal(false); router.push('/new-recipe' as any); }}
        onAddFromWebsite={() => { setShowAddModal(false); router.push('/import-website' as any); }}
        onScanPhoto={() => { setShowAddModal(false); router.push('/scan-photo' as any); }}
      />

      <ProfileQuestionnaireModal visible={showProfileModal} onComplete={handleProfileComplete} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12 },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
});
