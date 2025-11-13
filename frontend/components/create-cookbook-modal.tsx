import { useState, useEffect } from 'react';
import { View, StyleSheet, Modal, Pressable, TextInput, ScrollView, ActivityIndicator, useWindowDimensions } from 'react-native';
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { fetchRecipes, Recipe } from '@/services/recipe-service';
import { Image } from 'expo-image';
import { useThemeColor } from '@/hooks/use-theme-color';

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
  
  // Get theme colors
  const textColor = useThemeColor({}, 'text');
  const backgroundColor = useThemeColor({}, 'background');

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
            <Ionicons name="close" size={24} color="#666" />
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
            placeholderTextColor="#999"
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
                            <Ionicons name="menu" size={20} color="#666" />
                          </View>
                          
                          {item.image_url || item.imageUrl ? (
                            <Image
                              source={{ uri: item.image_url || item.imageUrl }}
                              style={styles.selectedRecipeImage}
                              contentFit="cover"
                            />
                          ) : (
                            <View style={styles.selectedRecipePlaceholder}>
                              <Ionicons name="restaurant" size={20} color="#ccc" />
                            </View>
                          )}
                          
                          <ThemedText style={styles.selectedRecipeTitle} numberOfLines={2}>
                            {item.title}
                          </ThemedText>
                          
                          <Pressable
                            onPress={() => toggleRecipe(item.id)}
                            style={styles.removeButton}
                          >
                            <Ionicons name="close-circle" size={24} color="#ff4444" />
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
                                source={{ uri: recipe.image_url || recipe.imageUrl }}
                                style={styles.recipeImage}
                                contentFit="cover"
                              />
                            ) : (
                              <View style={styles.placeholderImage}>
                                <Ionicons name="restaurant" size={32} color="#ccc" />
                              </View>
                            )}
                            
                            <View style={styles.checkbox}>
                              <Ionicons name="add" size={16} color="#666" />
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  headerButton: {
    padding: 8,
    minWidth: 60,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  doneText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4CAF50',
  },
  doneTextDisabled: {
    opacity: 0.3,
  },
  inputContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.6,
    marginBottom: 8,
  },
  input: {
    fontSize: 18,
    fontWeight: '600',
    paddingVertical: 8,
    color: '#000',
  },
  selectedCountContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
  selectedCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
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
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  draggingItem: {
    opacity: 0.7,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  dragHandle: {
    padding: 4,
  },
  selectedRecipeImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
  },
  selectedRecipePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
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
    padding: 4,
  },
  newRow: {
    marginTop: 0,
  },
  imageContainer: {
    position: 'relative',
    aspectRatio: 1,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 4,
  },
  recipeImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(76, 175, 80, 0.3)',
  },
  checkbox: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 2,
    borderColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recipeTitle: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
});
