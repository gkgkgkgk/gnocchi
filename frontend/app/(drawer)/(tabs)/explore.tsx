import { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator, Alert, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { WavyDecoration } from '@/components/wavy-decoration';
import { CookbookCard } from '@/components/cookbook-card';
import { FloatingActionButton } from '@/components/floating-action-button';
import { CreateCookbookModal } from '@/components/create-cookbook-modal';
import {
  fetchCookbooks, deleteCookbook, createCookbook, updateCookbook,
  fetchCookbookRecipes, Cookbook,
} from '@/services/cookbook-service';
import { useTheme } from '@/hooks/use-theme';

export default function CookbooksScreen() {
  const router = useRouter();
  const theme = useTheme();
  const c = theme.colors;
  const [cookbooks, setCookbooks] = useState<Cookbook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCookbook, setEditingCookbook] = useState<{ id: string; name: string; recipeIds: string[] } | null>(null);
  const { width } = useWindowDimensions();

  const numColumns = Math.max(2, Math.min(5, Math.floor(width / 220)));

  useEffect(() => { loadCookbooks(); }, []);

  const loadCookbooks = async () => {
    try {
      setLoading(true);
      setError(null);
      setCookbooks(await fetchCookbooks());
    } catch (err) {
      console.error('Failed to load cookbooks:', err);
      setError('Failed to load cookbooks');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (name: string, recipeIds: string[]) => {
    try {
      if (editingCookbook) {
        await updateCookbook(editingCookbook.id, name, recipeIds);
      } else {
        await createCookbook(name, recipeIds);
      }
      await loadCookbooks();
      setEditingCookbook(null);
    } catch (err) {
      console.error('Save failed:', err);
      Alert.alert('Error', 'Failed to save cookbook');
      throw err;
    }
  };

  const handleEditPress = async (id: string) => {
    try {
      const { cookbook, recipes } = await fetchCookbookRecipes(id);
      setEditingCookbook({ id, name: cookbook.name, recipeIds: recipes.map(r => r.id) });
      setShowCreateModal(true);
    } catch (err) {
      console.error('Load-for-edit failed:', err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteCookbook(id);
      await loadCookbooks();
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Text variant="display">Cookbooks</Text>
        <WavyDecoration variant="line" width={140} height={16} style={{ marginTop: 4 }} />
      </View>

      {loading ? (
        <View style={styles.centered}><ActivityIndicator color={c.accent} /></View>
      ) : error ? (
        <View style={styles.centered}><Text variant="body" color="danger">{error}</Text></View>
      ) : cookbooks.length === 0 ? (
        <EmptyState
          doodle="book"
          title="No cookbooks yet"
          line="Group your recipes — weeknight dinners, holiday baking, whatever."
          action={<Button onPress={() => setShowCreateModal(true)}>Create a cookbook</Button>}
        />
      ) : (
        <FlatList
          data={cookbooks}
          key={`grid-${numColumns}`}
          numColumns={numColumns}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: theme.spacing.md, paddingBottom: theme.spacing['3xl'] }}
          renderItem={({ item }) => (
            <View style={{ flex: 1 / numColumns, minWidth: 0 }}>
              <CookbookCard
                {...item}
                cover_color={item.cover_color ?? undefined}
                onPress={() => router.push(`/cookbook/${item.id}` as any)}
                onEdit={() => handleEditPress(item.id)}
                onDelete={() => handleDelete(item.id)}
              />
            </View>
          )}
        />
      )}

      <FloatingActionButton onPress={() => setShowCreateModal(true)} label="New cookbook" icon="book" />

      <CreateCookbookModal
        visible={showCreateModal}
        onClose={() => { setShowCreateModal(false); setEditingCookbook(null); }}
        onCreate={handleCreate}
        editMode={!!editingCookbook}
        existingName={editingCookbook?.name}
        existingRecipeIds={editingCookbook?.recipeIds}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
});
