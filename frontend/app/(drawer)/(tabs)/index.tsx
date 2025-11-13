import { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator, Alert, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { RecipeCard } from '@/components/recipe-card';
import { FloatingActionButton } from '@/components/floating-action-button';
import { AddRecipeModal } from '@/components/add-recipe-modal';
import { ProfileQuestionnaireModal } from '@/components/profile-questionnaire-modal';
import { fetchRecipes, deleteRecipe, Recipe } from '@/services/recipe-service';
import { checkUserProfile, createUserProfile } from '@/services/profile-service';

export default function HomeScreen() {
  const router = useRouter();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const { width } = useWindowDimensions();
  
  // Calculate number of columns based on screen width
  // Aim for cards around 250-280px wide
  const numColumns = Math.max(2, Math.floor(width / 500));

  useEffect(() => {
    loadRecipes();
    checkProfile();
  }, []);

  const checkProfile = async () => {
    const hasProfile = await checkUserProfile();
    if (!hasProfile) {
      setShowProfileModal(true);
    }
  };

  const loadRecipes = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchRecipes();
      setRecipes(data);
    } catch (err) {
      console.error('Failed to load recipes:', err);
      setError('Failed to load recipes');
    } finally {
      setLoading(false);
    }
  };

  const handleRecipePress = (recipeId: string) => {
    router.push(`/recipe/${recipeId}` as any);
  };

  const handleAddRecipe = () => {
    setShowAddModal(true);
  };

  const handleAddFromPinterest = () => {
    setShowAddModal(false);
    router.push('/import-pinterest' as any);
  };

  const handleAddManually = () => {
    setShowAddModal(false);
    router.push('/new-recipe' as any);
  };

  const handleAddFromWebsite = () => {
    setShowAddModal(false);
    router.push('/import-website' as any);
  };

  const handleScanPhoto = () => {
    setShowAddModal(false);
    router.push('/scan-photo' as any);
  };

  const handleEditRecipe = (recipeId: string) => {
    router.push(`/new-recipe?id=${recipeId}` as any);
  };

  const handleDeleteRecipe = async (recipeId: string) => {
    try {
      await deleteRecipe(recipeId);
      // Reload recipes after deletion
      await loadRecipes();
    } catch (error) {
      console.error('Failed to delete recipe:', error);
      Alert.alert('Error', 'Failed to delete recipe');
    }
  };

  const handleProfileComplete = async (answers: Record<string, any>) => {
    try {
      await createUserProfile(answers);
      setShowProfileModal(false);
    } catch (error) {
      console.error('Failed to create profile:', error);
      Alert.alert('Error', 'Failed to create profile');
    }
  };

  if (loading) {
    return (
      <ThemedView style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" />
        <ThemedText style={styles.loadingText}>Loading recipes...</ThemedText>
      </ThemedView>
    );
  }

  if (error) {
    return (
      <ThemedView style={[styles.container, styles.centered]}>
        <ThemedText style={styles.errorText}>{error}</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={recipes}
        renderItem={({ item }) => (
          <View style={[styles.cardWrapper, { width: `${100 / numColumns}%` }]}>
            <RecipeCard
              {...item}
              onPress={() => handleRecipePress(item.id)}
              onEdit={() => handleEditRecipe(item.id)}
              onDelete={() => handleDeleteRecipe(item.id)}
            />
          </View>
        )}
        keyExtractor={(item) => item.id}
        key={numColumns}
        numColumns={numColumns}
        contentContainerStyle={styles.grid}
        ListEmptyComponent={
          <ThemedView style={styles.centered}>
            <ThemedText style={styles.emptyText}>No recipes yet!</ThemedText>
            <ThemedText style={styles.emptySubtext}>Tap the button below to add your first recipe</ThemedText>
          </ThemedView>
        }
      />
      <FloatingActionButton onPress={handleAddRecipe} label="Add New Recipe!" />
      
      <AddRecipeModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAddFromPinterest={handleAddFromPinterest}
        onAddManually={handleAddManually}
        onAddFromWebsite={handleAddFromWebsite}
        onScanPhoto={handleScanPhoto}
      />

      <ProfileQuestionnaireModal
        visible={showProfileModal}
        onComplete={handleProfileComplete}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  grid: {
    padding: 8,
    paddingBottom: 80,
  },
  cardWrapper: {
    padding: 8,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#ff4444',
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    opacity: 0.7,
    textAlign: 'center',
  },
});
