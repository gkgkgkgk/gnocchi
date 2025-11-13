import { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator, Alert, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { CookbookCard } from '@/components/cookbook-card';
import { FloatingActionButton } from '@/components/floating-action-button';
import { CreateCookbookModal } from '@/components/create-cookbook-modal';
import { fetchCookbooks, deleteCookbook, createCookbook, updateCookbook, fetchCookbookRecipes, Cookbook } from '@/services/cookbook-service';

export default function CookbooksScreen() {
  const router = useRouter();
  const [cookbooks, setCookbooks] = useState<Cookbook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCookbook, setEditingCookbook] = useState<{ id: string; name: string; recipeIds: string[] } | null>(null);
  const { width } = useWindowDimensions();
  
  // Calculate number of columns based on screen width
  // Books look good at around 180-220px wide
  const numColumns = Math.max(2, Math.floor(width / 220));

  useEffect(() => {
    loadCookbooks();
  }, []);

  const loadCookbooks = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchCookbooks();
      setCookbooks(data);
    } catch (err) {
      console.error('Failed to load cookbooks:', err);
      setError('Failed to load cookbooks');
    } finally {
      setLoading(false);
    }
  };

  const handleCookbookPress = (cookbookId: string) => {
    router.push(`/cookbook/${cookbookId}` as any);
  };

  const handleAddCookbook = () => {
    setShowCreateModal(true);
  };

  const handleCreateCookbook = async (name: string, recipeIds: string[]) => {
    try {
      if (editingCookbook) {
        // Update existing cookbook
        await updateCookbook(editingCookbook.id, name, recipeIds);
      } else {
        // Create new cookbook
        await createCookbook(name, recipeIds);
      }
      await loadCookbooks();
      setEditingCookbook(null);
    } catch (error) {
      console.error('Failed to save cookbook:', error);
      Alert.alert('Error', 'Failed to save cookbook');
      throw error;
    }
  };

  const handleEditCookbook = async (cookbookId: string) => {
    try {
      // Fetch cookbook details with recipes
      const { cookbook, recipes } = await fetchCookbookRecipes(cookbookId);
      const recipeIds = recipes.map(r => r.id);
      
      setEditingCookbook({
        id: cookbookId,
        name: cookbook.name,
        recipeIds: recipeIds
      });
      setShowCreateModal(true);
    } catch (error) {
      console.error('Failed to load cookbook for editing:', error);
      Alert.alert('Error', 'Failed to load cookbook');
    }
  };

  const handleDeleteCookbook = async (cookbookId: string) => {
    try {
      await deleteCookbook(cookbookId);
      await loadCookbooks();
    } catch (error) {
      console.error('Failed to delete cookbook:', error);
      Alert.alert('Error', 'Failed to delete cookbook');
    }
  };

  if (loading) {
    return (
      <ThemedView style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" />
        <ThemedText style={styles.loadingText}>Loading cookbooks...</ThemedText>
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
        data={cookbooks}
        renderItem={({ item }) => (
          <View style={[styles.cardWrapper, { width: `${100 / numColumns}%` }]}>
            <CookbookCard
              {...item}
              onPress={() => handleCookbookPress(item.id)}
              onEdit={() => handleEditCookbook(item.id)}
              onDelete={() => handleDeleteCookbook(item.id)}
            />
          </View>
        )}
        keyExtractor={(item) => item.id}
        key={numColumns}
        numColumns={numColumns}
        contentContainerStyle={styles.grid}
        ListEmptyComponent={
          <ThemedView style={styles.centered}>
            <ThemedText style={styles.emptyText}>📚 No cookbooks yet!</ThemedText>
            <ThemedText style={styles.emptySubtext}>Create your first cookbook to organize your recipes</ThemedText>
          </ThemedView>
        }
      />
      <FloatingActionButton onPress={handleAddCookbook} label="Create Cookbook" icon="book" />
      
      <CreateCookbookModal
        visible={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setEditingCookbook(null);
        }}
        onCreate={handleCreateCookbook}
        editMode={!!editingCookbook}
        existingName={editingCookbook?.name}
        existingRecipeIds={editingCookbook?.recipeIds}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  grid: {
    padding: 12,
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
