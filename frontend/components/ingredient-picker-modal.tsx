import { useState, useEffect } from 'react';
import { Modal, View, StyleSheet, Pressable, TextInput, FlatList, ActivityIndicator } from 'react-native';
import { ThemedView } from './themed-view';
import { ThemedText } from './themed-text';
import { fetchIngredients, Ingredient } from '@/services/ingredient-service';
import { useTheme } from '@/hooks/use-theme';
import { type Theme } from '@/constants/theme';

interface IngredientPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectIngredient: (ingredient: Ingredient) => void;
  selectedIngredientId?: string;
}

export function IngredientPickerModal({
  visible,
  onClose,
  onSelectIngredient,
  selectedIngredientId,
}: IngredientPickerModalProps) {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [filteredIngredients, setFilteredIngredients] = useState<Ingredient[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const theme = useTheme();
  const styles = makeStyles(theme);
  const c = theme.colors;
  const backgroundColor = c.bgElevated;
  const textColor = c.fg;
  const borderColor = c.border;
  const placeholderColor = c.fgSubtle;

  useEffect(() => {
    if (visible) {
      loadIngredients();
    }
  }, [visible]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredIngredients(ingredients);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = ingredients.filter((ingredient) =>
        ingredient.name.toLowerCase().includes(query)
      );
      setFilteredIngredients(filtered);
    }
  }, [searchQuery, ingredients]);

  const loadIngredients = async () => {
    setLoading(true);
    try {
      const data = await fetchIngredients();
      setIngredients(data);
      setFilteredIngredients(data);
    } catch (error) {
      console.error('Failed to load ingredients:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectIngredient = (ingredient: Ingredient) => {
    onSelectIngredient(ingredient);
    setSearchQuery('');
    onClose();
  };

  const handleCreateIngredient = () => {
    if (!searchQuery.trim()) return;

    // Check if ingredient already exists
    const existingIngredient = ingredients.find(
      (ing) => ing.name.toLowerCase() === searchQuery.trim().toLowerCase()
    );

    if (existingIngredient) {
      handleSelectIngredient(existingIngredient);
      return;
    }

    // Create a temporary ingredient object without saving to DB
    // The id will be empty/null, and the recipe will just store the text
    const tempIngredient: Ingredient = {
      id: '', // Empty ID indicates it's not in the database
      name: searchQuery.trim(),
    };

    handleSelectIngredient(tempIngredient);
  };

  const showCreateButton =
    searchQuery.trim() !== '' &&
    !filteredIngredients.some(
      (ing) => ing.name.toLowerCase() === searchQuery.trim().toLowerCase()
    );

  const renderIngredientItem = ({ item }: { item: Ingredient }) => (
    <Pressable
      style={[
        styles.ingredientItem,
        { backgroundColor, borderColor },
        item.id === selectedIngredientId && styles.ingredientItemSelected,
      ]}
      onPress={() => handleSelectIngredient(item)}
    >
      <ThemedText style={styles.ingredientName}>{item.name}</ThemedText>
      {item.id === selectedIngredientId && (
        <ThemedText style={styles.checkmark}>✓</ThemedText>
      )}
    </Pressable>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.modalContainer} onPress={(e) => e.stopPropagation()}>
          <ThemedView style={styles.modal}>
            {/* Header */}
            <View style={styles.header}>
              <ThemedText style={styles.title}>Select Ingredient</ThemedText>
              <Pressable onPress={onClose} style={styles.closeButton}>
                <ThemedText style={styles.closeButtonText}>✕</ThemedText>
              </Pressable>
            </View>

            {/* Search Input */}
            <TextInput
              style={[styles.searchInput, { backgroundColor, borderColor, color: textColor }]}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search or create ingredient..."
              placeholderTextColor={placeholderColor}
              autoCapitalize="words"
            />

            {/* Create Button */}
            {showCreateButton && (
              <Pressable
                style={styles.createButton}
                onPress={handleCreateIngredient}
              >
                <ThemedText style={styles.createButtonText}>
                  + Use "{searchQuery}"
                </ThemedText>
              </Pressable>
            )}

            {/* Ingredients List */}
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={c.accent} />
              </View>
            ) : (
              <FlatList
                data={filteredIngredients}
                renderItem={renderIngredientItem}
                keyExtractor={(item) => item.id}
                style={styles.list}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={true}
                ListEmptyComponent={
                  !showCreateButton ? (
                    <View style={styles.emptyContainer}>
                      <ThemedText style={styles.emptyText}>No ingredients found</ThemedText>
                      <ThemedText style={styles.emptySubtext}>
                        Type to create a new ingredient
                      </ThemedText>
                    </View>
                  ) : null
                }
              />
            )}
          </ThemedView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function makeStyles(theme: Theme) {
  const c = theme.colors;
  return StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: c.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  modal: {
    borderRadius: 16,
    padding: 24,
    maxHeight: '100%',
    ...theme.shadow.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  closeButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 24,
    opacity: 0.6,
  },
  searchInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  createButton: {
    backgroundColor: c.accent,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
    minHeight: 44,
    justifyContent: 'center',
  },
  createButtonText: {
    color: c.accentFg,
    fontSize: 16,
    fontWeight: '600',
  },
  list: {
    maxHeight: 400,
  },
  listContent: {
    gap: 8,
  },
  ingredientItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  ingredientItemSelected: {
    borderColor: c.accent,
    backgroundColor: c.accentMuted,
  },
  ingredientName: {
    fontSize: 16,
    fontWeight: '500',
  },
  checkmark: {
    fontSize: 20,
    color: c.accent,
    fontWeight: 'bold',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    opacity: 0.6,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    opacity: 0.4,
  },
  });
}
