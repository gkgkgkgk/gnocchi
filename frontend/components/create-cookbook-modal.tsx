import { useState, useEffect } from 'react';
import { View, StyleSheet, Modal, Pressable, TextInput, ScrollView, ActivityIndicator, useWindowDimensions } from 'react-native';
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { fetchRecipes, Recipe } from '@/services/recipe-service';
import { Image } from 'expo-image';
import { useTheme } from '@/hooks/use-theme';
import { inputStyle } from './ui/Input';
import { DishTile } from './kitchen/dish-sticker';
import { type Theme } from '@/constants/theme';

interface CreateCookbookModalProps {
  visible: boolean;
  onClose: () => void;
  onCreate: (name: string, recipeIds: string[]) => Promise<void>;
  editMode?: boolean;
  existingName?: string;
  existingRecipeIds?: string[];
}

export function CreateCookbookModal({ 
  visible, 
  onClose, 
  onCreate,
  editMode = false,
  existingName = '',
  existingRecipeIds = []
}: CreateCookbookModalProps) {
  const [cookbookName, setCookbookName] = useState('');
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [orderedRecipeIds, setOrderedRecipeIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const { width } = useWindowDimensions();

  const theme = useTheme();
  const styles = makeStyles(theme);
  const c = theme.colors;
  const textColor = c.fg;
  const backgroundColor = c.bgElevated;

  // Calculate grid columns
  const numColumns = Math.max(3, Math.floor((width - 80) / 120));

  useEffect(() => {
    if (visible) {
      loadRecipes();
      // Set initial values based on edit mode
      if (editMode) {
        setCookbookName(existingName);
        setOrderedRecipeIds(existingRecipeIds);
      } else {
        setCookbookName('');
        setOrderedRecipeIds([]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, editMode]);

  const loadRecipes = async () => {
    try {
      setLoading(true);
      const data = await fetchRecipes();
      setRecipes(data);
    } catch (error) {
      console.error('Failed to load recipes:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleRecipe = (recipeId: string) => {
    setOrderedRecipeIds(prev => {
      if (prev.includes(recipeId)) {
        // Remove from selected
        return prev.filter(id => id !== recipeId);
      } else {
        // Add to end of selected
        return [...prev, recipeId];
      }
    });
  };

  const selectedRecipes = orderedRecipeIds
    .map(id => recipes.find(r => r.id === id))
    .filter((r): r is Recipe => r !== undefined);
  
  const unselectedRecipes = recipes.filter(r => !orderedRecipeIds.includes(r.id));

  const handleCreate = async () => {
    if (!cookbookName.trim()) {
      return;
    }

    try {
      setCreating(true);
      await onCreate(cookbookName.trim(), orderedRecipeIds);
      onClose();
    } catch (error) {
      console.error('Failed to create cookbook:', error);
    } finally {
      setCreating(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ThemedView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={onClose} style={styles.headerButton}>
            <Ionicons name="close" size={24} color={c.fgMuted} />
          </Pressable>
          <ThemedText style={styles.headerTitle}>
            {editMode ? 'Edit Cookbook' : 'Create Cookbook'}
          </ThemedText>
          <Pressable
            onPress={handleCreate}
            disabled={!cookbookName.trim() || creating}
            style={styles.headerButton}
          >
            {creating ? (
              <ActivityIndicator size="small" />
            ) : (
              <ThemedText style={[styles.doneText, !cookbookName.trim() && styles.doneTextDisabled]}>
                Done
              </ThemedText>
            )}
          </Pressable>
        </View>

        {/* Cookbook Name Input */}
        <View style={styles.inputContainer}>
          <ThemedText style={styles.inputLabel}>Cookbook Name</ThemedText>
          <TextInput
            style={[styles.input, { color: textColor }]}
            placeholder="My Favorite Recipes"
            placeholderTextColor={c.fgSubtle}
            value={cookbookName}
            onChangeText={setCookbookName}
            autoFocus
          />
        </View>

        {/* Selected Count */}
        <View style={styles.selectedCountContainer}>
          <ThemedText style={styles.selectedCount}>
            {orderedRecipeIds.length} {orderedRecipeIds.length === 1 ? 'recipe' : 'recipes'} selected
          </ThemedText>
        </View>

        {/* Recipe Sections */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" />
            <ThemedText style={styles.loadingText}>Loading recipes...</ThemedText>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.scrollContent}>
              {/* Selected Recipes - Draggable */}
              {selectedRecipes.length > 0 && (
                <View style={styles.section}>
                  <ThemedText style={styles.sectionTitle}>Selected Recipes (Drag to Reorder)</ThemedText>
                  <View style={{ height: selectedRecipes.length * 82 }}>
                    <DraggableFlatList
                      data={selectedRecipes}
                      onDragEnd={({ data }) => setOrderedRecipeIds(data.map(r => r.id))}
                      keyExtractor={(item) => item.id}
                      activationDistance={10}
                      renderItem={({ item, drag, isActive }: RenderItemParams<Recipe>) => (
                        <ScaleDecorator>
                          <Pressable
                            onLongPress={drag}
                            onPressIn={drag}
                            delayLongPress={150}
                            disabled={isActive}
                            style={[
                              styles.selectedRecipeItem, 
                              { backgroundColor },
                              isActive && styles.draggingItem
                            ]}
                          >
                          <View style={styles.dragHandle}>
                            <Ionicons name="menu" size={20} color={c.fgMuted} />
                          </View>
                          
                          {item.image_url || item.imageUrl ? (
                            <Image
                              source={{ uri: item.image_url || item.imageUrl || undefined }}
                              style={styles.selectedRecipeImage}
                              contentFit="cover"
                            />
                          ) : (
                            <View style={styles.selectedRecipePlaceholder}>
                              <DishTile title={item.title} id={item.id} size={46} />
                            </View>
                          )}
                          
                          <ThemedText style={styles.selectedRecipeTitle} numberOfLines={2}>
                            {item.title}
                          </ThemedText>
                          
                          <Pressable
                            onPress={() => toggleRecipe(item.id)}
                            style={styles.removeButton}
                          >
                            <Ionicons name="close" size={20} color={c.fgMuted} />
                          </Pressable>
                        </Pressable>
                      </ScaleDecorator>
                    )}
                      scrollEnabled={false}
                    />
                  </View>
                </View>
              )}

              {/* Unselected Recipes - Grid */}
              {unselectedRecipes.length > 0 && (
                <View style={styles.section}>
                  <ThemedText style={styles.sectionTitle}>Available Recipes</ThemedText>
                  <View style={styles.gridRow}>
                    {unselectedRecipes.map((recipe, index) => {
                      const isNewRow = index % numColumns === 0;
                      
                      return (
                        <Pressable
                          key={recipe.id}
                          style={[
                            styles.recipeCard,
                            { width: `${100 / numColumns}%` },
                            isNewRow && index !== 0 && styles.newRow,
                          ]}
                          onPress={() => toggleRecipe(recipe.id)}
                        >
                          <View style={styles.imageContainer}>
                            {recipe.image_url || recipe.imageUrl ? (
                              <Image
                                source={{ uri: recipe.image_url || recipe.imageUrl || undefined }}
                                style={styles.recipeImage}
                                contentFit="cover"
                              />
                            ) : (
                              <View style={styles.placeholderImage}>
                                <DishTile title={recipe.title} id={recipe.id} size={150} />
                              </View>
                            )}
                            
                            <View style={styles.checkbox}>
                              <Ionicons name="add" size={18} color={c.fg} />
                            </View>
                          </View>

                          <ThemedText style={styles.recipeTitle} numberOfLines={2}>
                            {recipe.title}
                          </ThemedText>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              )}
            </ScrollView>
        )}
        </ThemedView>
      </GestureHandlerRootView>
    </Modal>
  );
}

function makeStyles(theme: Theme) {
  const c = theme.colors;
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.bg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: c.outline,
  },
  headerButton: {
    padding: 8,
    minWidth: 60,
  },
  headerTitle: {
    ...theme.type.h3,
  },
  doneText: {
    ...theme.type.button,
    color: c.accent,
  },
  doneTextDisabled: {
    opacity: 0.3,
  },
  inputContainer: {
    padding: 16,
  },
  inputLabel: {
    ...theme.type.label,
    color: c.fgMuted,
    marginBottom: 8,
  },
  input: {
    ...inputStyle(theme),
    ...theme.type.h2,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  selectedCountContainer: {
    marginHorizontal: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: c.outline,
    backgroundColor: c.butterMuted,
    alignSelf: 'flex-start',
  },
  selectedCount: {
    ...theme.type.label,
    color: c.fg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    opacity: 0.6,
  },
  scrollContent: {
    padding: 8,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  selectedRecipeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 10,
    marginBottom: 8,
    gap: 12,
    borderWidth: 2,
    borderColor: c.outline,
    backgroundColor: c.bgElevated,
    ...theme.shadow.sm,
  },
  draggingItem: {
    opacity: 0.7,
    ...theme.shadow.lg,
  },
  dragHandle: {
    padding: 4,
  },
  selectedRecipeImage: {
    width: 46,
    height: 46,
    borderRadius: 10,
  },
  selectedRecipePlaceholder: {
    width: 46,
    height: 46,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: c.outline,
  },
  selectedRecipeTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  removeButton: {
    padding: 4,
  },
  grid: {
    padding: 4,
  },
  gridRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  recipeCard: {
    padding: 8,
  },
  newRow: {
    marginTop: 0,
  },
  imageContainer: {
    position: 'relative',
    aspectRatio: 1,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: c.outline,
    overflow: 'hidden',
    marginBottom: 6,
    ...theme.shadow.sm,
  },
  recipeImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: c.accentMuted,
  },
  checkbox: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: c.bgElevated,
    borderWidth: 2,
    borderColor: c.outline,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recipeTitle: {
    ...theme.type.smallMedium,
    textAlign: 'center',
  },
  });
}
