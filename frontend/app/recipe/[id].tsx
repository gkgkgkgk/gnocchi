import { useState, useEffect } from 'react';
import { View, StyleSheet, Pressable, ScrollView, Image, ActivityIndicator, Modal, Platform } from 'react-native';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { AIInsightsBanner } from '@/components/ai-insights-banner';
import { ToolExecutionModal } from '@/components/tool-execution-modal';
import { RecipePhotoGallery } from '@/components/recipe-photo-gallery';
import { EditRecipeTagsModal } from '@/components/edit-recipe-tags-modal';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Sheet } from '@/components/ui/Sheet';
import { fetchRecipeById, Recipe, deleteRecipe, saveModifiedRecipe, updateRecipeTags } from '@/services/recipe-service';
import { executeAITool, AITool } from '@/services/ai-tools-service';
import { formatIngredientLine } from '@/utils/ingredient-formatter';
import { useTheme } from '@/hooks/use-theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { convertDecimalsToFractions } from '@/utils/fraction-formatter';

export default function RecipeDetailScreen() {
  const { id, from, cookbookId } = useLocalSearchParams();
  const router = useRouter();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showIngredients, setShowIngredients] = useState(true);
  const [showToolModal, setShowToolModal] = useState(false);
  const [executingTool, setExecutingTool] = useState(false);
  const [selectedTool, setSelectedTool] = useState<AITool | null>(null);
  const [modifiedRecipe, setModifiedRecipe] = useState<any>(null);
  const [savedRecipeId, setSavedRecipeId] = useState<string | null>(null);
  const [multiplier, setMultiplier] = useState(1);
  const [showEditTags, setShowEditTags] = useState(false);
  const [recipeTags, setRecipeTags] = useState<string[]>([]);
  
  const theme = useTheme();
  const c = theme.colors;
  const menuBackgroundColor = c.bgElevated;
  const cardBackgroundColor = c.bgElevated;
  const tintColor = c.accent;

  // Multiplier options: 1/2, 3/4, 1, 1 1/4, 1 1/3, 1 1/2, 1 3/4, 2, 2 1/2, 3, 3 1/2, 4
  const multiplierOptions = [0.5, 0.75, 1, 1.25, 1.333, 1.5, 1.75, 2, 2.5, 3, 3.5, 4];
  const multiplierLabels = ['1/2', '3/4', '1', '1 1/4', '1 1/3', '1 1/2', '1 3/4', '2', '2 1/2', '3', '3 1/2', '4'];
  
  const getMultiplierLabel = (value: number) => {
    const index = multiplierOptions.findIndex(opt => Math.abs(opt - value) < 0.01);
    return index >= 0 ? multiplierLabels[index] : value.toFixed(2);
  };

  const handleSliderChange = (value: number) => {
    // Find closest snap point
    let closestIndex = 0;
    let minDiff = Math.abs(value - multiplierOptions[0]);
    
    for (let i = 1; i < multiplierOptions.length; i++) {
      const diff = Math.abs(value - multiplierOptions[i]);
      if (diff < minDiff) {
        minDiff = diff;
        closestIndex = i;
      }
    }
    
    setMultiplier(multiplierOptions[closestIndex]);
  };

  useEffect(() => {
    loadRecipe();
  }, [id]);

  // Poll for updates if AI insight or annotations are generating
  useEffect(() => {
    if (!recipe) return;
    
    const needsPolling = 
      recipe.ai_insight?.text === '__GENERATING__' || 
      recipe.annotated_steps === null;
    
    if (!needsPolling) return;
    
    const pollInterval = setInterval(async () => {
      try {
        const updatedRecipe = await fetchRecipeById(id as string);
        if (updatedRecipe) {
          // Check if AI insight finished generating
          if (recipe.ai_insight?.text === '__GENERATING__' && 
              updatedRecipe.ai_insight?.text !== '__GENERATING__') {
            console.log('AI insight ready, updating...');
            setRecipe(updatedRecipe);
          }
          
          // Check if annotations finished generating
          if (recipe.annotated_steps === null && 
              updatedRecipe.annotated_steps && 
              updatedRecipe.annotated_steps.length > 0) {
            console.log('Annotated steps ready, updating...');
            setRecipe(updatedRecipe);
          }
          
          // Stop polling if both are done
          if (updatedRecipe.ai_insight?.text !== '__GENERATING__' && 
              updatedRecipe.annotated_steps !== null) {
            clearInterval(pollInterval);
          }
        }
      } catch (error) {
        console.error('Error polling for updates:', error);
      }
    }, 3000); // Poll every 3 seconds
    
    return () => clearInterval(pollInterval);
  }, [recipe, id]);

  const loadRecipe = async () => {
    try {
      setLoading(true);
      const data = await fetchRecipeById(id as string);
      console.log(data);
      setRecipe(data);
      // Load tags from metadata
      if (data?.metadata?.tags) {
        setRecipeTags(data.metadata.tags);
      }
    } catch (error) {
      console.error('Failed to load recipe:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
        </View>
      </ThemedView>
    );
  }

  if (!recipe) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ThemedText>Recipe not found</ThemedText>
        </View>
      </ThemedView>
    );
  }

  const imageUrl = recipe.imageUrl || recipe.image_url;
  const metadata = (recipe as any).metadata || {};
  const prepTime = metadata.prepTime || recipe.prepTime || recipe.prep_time || 0;
  const cookTime = metadata.cookTime || recipe.cookTime || recipe.cook_time || 0;
  const servings = metadata.servings || recipe.servings || 0;
  const notes = (recipe as any).notes || '';
  const totalTime = parseInt(prepTime) + parseInt(cookTime);

  const handleEdit = () => {
    setShowMenu(false);
    router.push(`/new-recipe?id=${id}` as any);
  };

  const handleDelete = async () => {
    try {
      await deleteRecipe(id as string);
      // Navigate back to cookbook if we came from there, otherwise go to recipes
      if (from === 'cookbook' && cookbookId) {
        router.push(`/cookbook/${cookbookId}` as any);
      } else {
        router.push('/(drawer)/(tabs)' as any);
      }
    } catch (error) {
      console.error('Failed to delete recipe:', error);
    }
  };

  const formatToolName = (toolName: string): string => {
    // Convert snake_case to Title Case
    return toolName
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const handleToolPress = (tool: AITool) => {
    if (!recipe) return;
    
    // Just open the modal with the tool, don't execute yet
    setSelectedTool(tool);
    setShowToolModal(true);
    setExecutingTool(false);
    setModifiedRecipe(null);
  };

  const handleConfirmTool = async (userGuidance: string) => {
    if (!recipe || !selectedTool) return;
    
    setExecutingTool(true);
    
    try {
      console.log(`Executing tool: ${selectedTool.name}`);
      if (userGuidance) {
        console.log(`User guidance: ${userGuidance}`);
      }
      
      // Execute the tool to get modified recipe
      const result = await executeAITool(recipe, selectedTool, userGuidance);
      setModifiedRecipe(result);
      
      // Save the recipe immediately after generation, passing original recipe for metadata fallback
      const savedRecipe = await saveModifiedRecipe(result, recipe);
      if (savedRecipe) {
        setSavedRecipeId(savedRecipe.id);
        console.log('Recipe saved with ID:', savedRecipe.id);
      }
      
    } catch (error) {
      console.error('Failed to execute tool:', error);
      // TODO: Show error toast/alert
    } finally {
      setExecutingTool(false);
    }
  };

  const handleOpenRecipe = () => {
    if (!savedRecipeId) return;
    
    // Close modal and navigate to the saved recipe
    setShowToolModal(false);
    router.push(`/recipe/${savedRecipeId}` as any);
  };


  const handleCloseModal = () => {
    // Recipe is already saved, just close the modal
    setShowToolModal(false);
    setModifiedRecipe(null);
    setSelectedTool(null);
    setSavedRecipeId(null);
  };

  const handleRefreshInsight = async () => {
    if (!recipe) return;
    
    try {
      // Clear the current insight and set to generating state
      setRecipe({
        ...recipe,
        ai_insight: { text: '__GENERATING__', suggested_tool: null }
      });
      
      // Import the service functions
      const { analyzeRecipeInsight, saveRecipeInsight } = await import('@/services/recipe-service');
      
      // Generate new insight
      const insightData = await analyzeRecipeInsight(recipe);
      
      // Save to database
      await saveRecipeInsight(id as string, insightData);
      
      // Update local state
      setRecipe({
        ...recipe,
        ai_insight: insightData
      });
      
      console.log('AI insight refreshed successfully');
    } catch (error) {
      console.error('Failed to refresh AI insight:', error);
      // Revert to previous state on error
      loadRecipe();
    }
  };

  // Parse annotated text to extract ingredient references and enrich with measurements
  const parseAnnotatedStep = (annotatedText: string) => {
    const regex = /\$\{([^,]+),\s*([^}]+)\}/g;
    const ingredientRefs: { displayText: string; fullText: string }[] = [];
    let cleanText = annotatedText;
    let match;

    while ((match = regex.exec(annotatedText)) !== null) {
      const displayText = match[1].trim();
      const ingredientText = match[2].trim();
      
      // Look up the full ingredient details from the recipe
      const matchingIngredient = recipe.ingredients?.find(ing => 
        ing.text?.toLowerCase().includes(ingredientText.toLowerCase()) ||
        ingredientText.toLowerCase().includes(ing.text?.toLowerCase() || '')
      );
      
      let fullText = ingredientText;
      if (matchingIngredient) {
        const quantity = (matchingIngredient.quantity || 0) * multiplier; // Apply multiplier
        const unit = matchingIngredient.unit?.name || matchingIngredient.unit?.abbreviation || '';
        const ingredientName = matchingIngredient.ingredient?.name || matchingIngredient.text || '';
        
        // Format: "2 cups all-purpose flour" or "2 large eggs"
        fullText = [quantity, unit, ingredientName].filter(Boolean).join(' ').trim();
        // Convert decimals to fractions
        fullText = convertDecimalsToFractions(fullText);
      }
      
      ingredientRefs.push({ displayText, fullText });
      // Replace the annotation with just the display text
      cleanText = cleanText.replace(match[0], displayText);
    }

    return { cleanText, ingredients: ingredientRefs };
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: c.bg }]}>
      {/* Fixed Back Button and Menu */}
      <View style={[styles.backButtonContainer, { backgroundColor: c.bg, borderBottomColor: c.border }]}>
        <Pressable onPress={() => router.push('/(drawer)/(tabs)' as any)} style={styles.backButton}>
          <ThemedText style={[styles.backButtonText, { color: c.fg }]}>← Back</ThemedText>
        </Pressable>

        <Pressable onPress={() => setShowMenu(!showMenu)} style={styles.menuButton}>
          <ThemedText style={[styles.menuIcon, { color: c.fgMuted }]}>⋮</ThemedText>
        </Pressable>

        {/* Dropdown Menu */}
        {showMenu && (
          <View style={[styles.menuDropdown, { backgroundColor: c.bgElevated, borderColor: c.border, ...theme.shadow.md }]}>
            <Pressable
              style={[styles.menuItem, { borderBottomColor: c.border }]}
              onPress={() => { setShowMenu(false); router.push(`/easy-recipe/${id}` as any); }}
            >
              <Text variant="bodyMedium">Easy view</Text>
            </Pressable>
            <Pressable style={[styles.menuItem, { borderBottomColor: c.border }]} onPress={handleEdit}>
              <Text variant="bodyMedium">Edit</Text>
            </Pressable>
            <Pressable
              style={[styles.menuItem, { borderBottomColor: c.border }]}
              onPress={() => { setShowMenu(false); setShowEditTags(true); }}
            >
              <Text variant="bodyMedium">Edit tags</Text>
            </Pressable>
            <Pressable
              style={[styles.menuItem, styles.menuItemLast]}
              onPress={() => { setShowMenu(false); setShowDeleteConfirm(true); }}
            >
              <Text variant="bodyMedium" color="danger">Delete</Text>
            </Pressable>
          </View>
        )}
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Banner Image */}
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.bannerImage} />
        ) : (
          <View style={[styles.bannerPlaceholder, { backgroundColor: c.bgMuted }]}>
            <ThemedText style={styles.bannerEmoji}>🍽️</ThemedText>
          </View>
        )}

        {/* Recipe Content */}
        <View style={styles.content}>
          <Text variant="display">{recipe.title}</Text>

          {/* Metadata chips */}
          {(servings > 0 || prepTime > 0 || cookTime > 0) && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm, marginTop: theme.spacing.md }}>
              {servings > 0 && (
                <Chip icon={<Ionicons name="people-outline" size={14} color={c.fg} />}>
                  {`${servings} ${servings === 1 ? 'serving' : 'servings'}`}
                </Chip>
              )}
              {prepTime > 0 && (
                <Chip icon={<Ionicons name="cut-outline" size={14} color={c.fg} />}>
                  {`${prepTime} min prep`}
                </Chip>
              )}
              {cookTime > 0 && (
                <Chip icon={<Ionicons name="flame-outline" size={14} color={c.fg} />}>
                  {`${cookTime} min cook`}
                </Chip>
              )}
              {totalTime > 0 && (
                <Chip tone={c.accent} icon={<Ionicons name="time-outline" size={14} color={c.accent} />}>
                  {`${totalTime} min total`}
                </Chip>
              )}
            </View>
          )}

          {/* AI Insights Banner */}
          <AIInsightsBanner
            insight={recipe.ai_insight?.text === '__GENERATING__' ? 'Chef Gnocchi is analyzing this recipe...' : recipe.ai_insight?.text}
            recommendedAction={recipe.ai_insight?.suggested_tool ? formatToolName(recipe.ai_insight.suggested_tool) : undefined}
            loading={recipe.ai_insight?.text === '__GENERATING__'}
            onActionPress={async () => {
              // Handle recommended action button click
              if (recipe.ai_insight?.suggested_tool) {
                // Fetch the tool from the database by name
                const { fetchAIToolByName } = await import('@/services/ai-tools-service');
                const tool = await fetchAIToolByName(recipe.ai_insight.suggested_tool);
                if (tool) {
                  handleToolPress(tool);
                }
              }
            }}
            onToolPress={handleToolPress}
            onRefresh={handleRefreshInsight}
          />

          {/* Easy Recipe Viewer Button */}
          <Pressable 
            style={styles.easyViewButton}
            onPress={() => router.push(`/easy-recipe/${id}` as any)}
          >
            <ThemedText style={styles.easyViewButtonText}>
              📖 Open Recipe Reader
            </ThemedText>
            <ThemedText style={styles.easyViewButtonSubtext}>
              Clean view for cooking
            </ThemedText>
          </Pressable>

          {/* Notes Section */}
          {notes && (
            <View style={styles.section}>
              <ThemedText style={styles.sectionTitle}>Notes</ThemedText>
              <View style={styles.sectionContent}>
                <ThemedText style={styles.notesText}>{notes}</ThemedText>
              </View>
            </View>
          )}

          {/* Recipe Multiplier Slider */}
          <View style={styles.section}>
            <View style={styles.multiplierContainer}>
              <View style={styles.multiplierHeader}>
                <ThemedText style={styles.multiplierLabel}>Recipe Size:</ThemedText>
                <View style={styles.multiplierValueContainer}>
                  <ThemedText style={styles.multiplierValue}>{getMultiplierLabel(multiplier)}×</ThemedText>
                </View>
              </View>
              
              <View style={styles.sliderRow}>
                <ThemedText style={styles.sliderEndLabel}>1/2×</ThemedText>
                <Slider
                  style={styles.slider}
                  minimumValue={0.5}
                  maximumValue={4}
                  value={multiplier}
                  onValueChange={handleSliderChange}
                  minimumTrackTintColor={tintColor}
                  maximumTrackTintColor="rgba(0,0,0,0.1)"
                  thumbTintColor={tintColor}
                  step={0.01}
                />
                <ThemedText style={styles.sliderEndLabel}>4×</ThemedText>
              </View>
            </View>
          </View>

          {/* Flip Card for Ingredients/Instructions */}
          <View style={styles.section}>
            <View style={styles.flipCardContainer}>
              {/* Tab Headers */}
              <View style={styles.tabHeaders}>
                <Pressable
                  style={[styles.tabHeader, showIngredients && styles.tabHeaderActive]}
                  onPress={() => setShowIngredients(true)}
                >
                  <ThemedText style={[styles.tabHeaderText, showIngredients && styles.tabHeaderTextActive]}>
                    📝 Ingredients
                  </ThemedText>
                </Pressable>
                <Pressable
                  style={[styles.tabHeader, !showIngredients && styles.tabHeaderActive]}
                  onPress={() => setShowIngredients(false)}
                >
                  <ThemedText style={[styles.tabHeaderText, !showIngredients && styles.tabHeaderTextActive]}>
                    👨‍🍳 Instructions
                  </ThemedText>
                </Pressable>
              </View>

              {/* Card Content */}
              <ThemedView style={[styles.flipCard, { backgroundColor: cardBackgroundColor }]}>
                {showIngredients ? (
                  /* Ingredients Side */
                  <View style={styles.cardContent}>
                    {recipe.ingredients && recipe.ingredients.length > 0 ? (
                      recipe.ingredients.map((item, index) => {
                        const ingredientName = item.ingredient?.name || item.text || 'Unknown ingredient';
                        const unitName = item.unit?.name;
                        const quantity = item.quantity * multiplier; // Apply multiplier
                        let displayText = formatIngredientLine(quantity, unitName, ingredientName);
                        const isOptional = (item as any).optional;
                        if (isOptional) displayText = `${displayText} (optional)`;
                        // Convert decimals to fractions for display
                        displayText = convertDecimalsToFractions(displayText);
                        return (
                          <View key={item.id || index} style={[styles.ingredientItem, isOptional && { opacity: 0.55 }]}>
                            <ThemedText style={styles.ingredientBullet}>•</ThemedText>
                            <ThemedText style={styles.ingredientText}>
                              {displayText}
                            </ThemedText>
                          </View>
                        );
                      })
                    ) : (
                      <ThemedText style={styles.placeholderText}>
                        No ingredients listed
                      </ThemedText>
                    )}
                  </View>
                ) : (
                  /* Instructions Side */
                  <View style={styles.cardContent}>
                    {recipe.steps && recipe.steps.length > 0 ? (
                      recipe.steps.map((step, index) => {
                        // Use annotated step if available, otherwise use original
                        const annotatedSteps = (recipe as any).annotated_steps;
                        const annotatedText = annotatedSteps?.[index] || step;
                        const { cleanText, ingredients } = parseAnnotatedStep(annotatedText);
                        return (
                          <View key={index} style={styles.stepItem}>
                            <View style={styles.stepNumber}>
                              <ThemedText style={styles.stepNumberText}>
                                {index + 1}
                              </ThemedText>
                            </View>
                            <View style={styles.stepTextContainer}>
                              <ThemedText style={styles.stepText}>
                                {cleanText}
                              </ThemedText>
                              {ingredients.length > 0 && (
                                <View style={styles.ingredientReferences}>
                                  {ingredients.map((ing, idx) => (
                                    <ThemedText key={idx} style={styles.ingredientReference}>
                                      • {ing.fullText}
                                    </ThemedText>
                                  ))}
                                </View>
                              )}
                            </View>
                          </View>
                        );
                      })
                    ) : (
                      <ThemedText style={styles.placeholderText}>
                        No instructions provided
                      </ThemedText>
                    )}
                  </View>
                )}
              </ThemedView>
            </View>
          </View>
        </View>

        {/* Photo Gallery */}
        <RecipePhotoGallery
          recipeId={recipe.id}
          images={recipe.images || (recipe.image_url ? [recipe.image_url] : [])}
          chosenImage={recipe.image_url || null}
          onUpdate={(newImages, newChosenImage) => {
            setRecipe(prev => prev ? { 
              ...prev, 
              images: newImages,
              image_url: newChosenImage || undefined
            } : null);
          }}
        />
      </ScrollView>

      {/* Tool Execution Modal */}
      <ToolExecutionModal
        visible={showToolModal}
        tool={selectedTool}
        loading={executingTool}
        recipeReady={!!savedRecipeId}
        onConfirm={handleConfirmTool}
        onOpenRecipe={handleOpenRecipe}
        onClose={handleCloseModal}
      />

      {/* Delete Confirmation */}
      <Sheet visible={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)}>
        <Text variant="h2">Delete recipe?</Text>
        <Text variant="body" color="fgMuted" style={{ marginTop: theme.spacing.sm, marginBottom: theme.spacing.xl }}>
          "{recipe.title}" will be permanently removed.
        </Text>
        <View style={{ flexDirection: 'row', gap: theme.spacing.md, justifyContent: 'flex-end' }}>
          <Button variant="ghost" onPress={() => setShowDeleteConfirm(false)}>Cancel</Button>
          <Button variant="danger" onPress={() => { setShowDeleteConfirm(false); handleDelete(); }}>
            Delete
          </Button>
        </View>
      </Sheet>

      {/* Edit Recipe Tags Modal */}
      <EditRecipeTagsModal
        visible={showEditTags}
        onClose={() => setShowEditTags(false)}
        currentTags={recipeTags}
        onSave={async (tagIds) => {
          try {
            await updateRecipeTags(id as string, tagIds);
            setRecipeTags(tagIds);
            // Update the recipe object with new tags
            if (recipe) {
              setRecipe({
                ...recipe,
                metadata: {
                  ...recipe.metadata,
                  tags: tagIds,
                },
              });
            }
          } catch (error) {
            console.error('Failed to update recipe tags:', error);
            // TODO: Show error toast to user
          }
        }}
        recipeName={recipe?.title}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonContainer: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  backButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  backButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  bannerImage: {
    width: '100%',
    height: 300,
    resizeMode: 'cover',
  },
  bannerPlaceholder: {
    width: '100%',
    height: 300,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerEmoji: {
    fontSize: 80,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 20,
    lineHeight: 38,
  },
  quickInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 32,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: '45%',
  },
  infoIcon: {
    fontSize: 24,
  },
  infoLabel: {
    fontSize: 12,
    opacity: 0.6,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 18,
    fontWeight: '600',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  sectionContent: {
    paddingLeft: 8,
  },
  placeholderText: {
    fontSize: 16,
    opacity: 0.5,
    fontStyle: 'italic',
  },
  ingredientItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingLeft: 4,
  },
  ingredientBullet: {
    fontSize: 18,
    marginRight: 12,
    marginTop: 2,
  },
  ingredientText: {
    fontSize: 16,
    lineHeight: 24,
    flex: 1,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
    paddingLeft: 4,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  stepNumberText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  stepTextContainer: {
    flex: 1,
  },
  stepText: {
    fontSize: 16,
    lineHeight: 24,
  },
  ingredientReferences: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  ingredientReference: {
    fontSize: 14,
    fontStyle: 'italic',
    opacity: 0.7,
    lineHeight: 20,
    marginBottom: 4,
  },
  menuButton: {
    backgroundColor: 'rgba(50,50,50, 1.0)',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  menuIcon: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  menuDropdown: {
    position: 'absolute',
    top: 88,
    right: 16,
    minWidth: 140,
    zIndex: 11,
    borderRadius: 8,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  menuItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuItemText: {
    fontSize: 16,
  },
  menuItemTextDanger: {
    color: '#ff3b30',
  },
  notesText: {
    fontSize: 16,
    lineHeight: 24,
    opacity: 0.8,
  },
  confirmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  confirmModal: {
    width: '100%',
    maxWidth: 400,
  },
  confirmContent: {
    borderRadius: 16,
    padding: 24,
  },
  confirmTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  confirmMessage: {
    fontSize: 16,
    opacity: 0.8,
    marginBottom: 24,
    lineHeight: 22,
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  confirmButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#e0e0e0',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  deleteButton: {
    backgroundColor: '#ff3b30',
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  flipCardContainer: {
    marginBottom: 16,
  },
  tabHeaders: {
    flexDirection: 'row',
    marginBottom: 0,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    overflow: 'hidden',
  },
  tabHeader: {
    flex: 1,
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabHeaderActive: {
    backgroundColor: 'transparent',
    borderBottomColor: '#4CAF50',
  },
  tabHeaderText: {
    fontSize: 16,
    fontWeight: '600',
    opacity: 0.6,
  },
  tabHeaderTextActive: {
    opacity: 1,
    color: '#4CAF50',
  },
  flipCard: {
    borderRadius: 12,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    padding: 20,
    minHeight: 300,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  cardContent: {
    flex: 1,
  },
  easyViewButton: {
    backgroundColor: '#4CAF50',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  easyViewButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  easyViewButtonSubtext: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
  },
  multiplierContainer: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: 12,
    marginBottom: 16,
    maxWidth: 400,
    alignSelf: 'center',
    width: '85%',
  },
  multiplierHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  multiplierLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  multiplierValueContainer: {
    minWidth: 60,
    alignItems: 'flex-end',
  },
  multiplierValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  slider: {
    flex: 1,
    height: 40,
  },
  sliderEndLabel: {
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.5,
    minWidth: 32,
    textAlign: 'center',
  },
});
