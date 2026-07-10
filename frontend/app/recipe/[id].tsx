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
import { StarRating } from '@/components/ui/StarRating';
import { fetchRecipeById, Recipe, deleteRecipe, saveModifiedRecipe, updateRecipeTags, setRecipeRating, addCookNote } from '@/services/recipe-service';
import { executeAITool, AITool } from '@/services/ai-tools-service';
import { fetchUnits, Unit } from '@/services/unit-service';
import { scaleForDisplay } from '@/utils/unit-conversion';
import { formatIngredientLine } from '@/utils/ingredient-formatter';
import { useTheme } from '@/hooks/use-theme';
import { useResponsive } from '@/hooks/use-responsive';
import { useThemeColor } from '@/hooks/use-theme-color';
import { convertDecimalsToFractions } from '@/utils/fraction-formatter';

function formatCookDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatRelative(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const days = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  return formatCookDate(iso);
}

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
  const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(new Set());
  const [loggingCook, setLoggingCook] = useState(false);
  const [units, setUnits] = useState<Unit[]>([]);

  const theme = useTheme();
  const { isWide } = useResponsive();
  const c = theme.colors;

  const toggleIngredient = (index: number) => {
    setCheckedIngredients((prev) => {
      const next = new Set(prev);
      next.has(index) ? next.delete(index) : next.add(index);
      return next;
    });
  };
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

  // Canonical units power the scale-aware ingredient display (e.g. doubling
  // 1 tbsp shows 1/8 cup). Loaded once; free-text units just skip conversion.
  useEffect(() => {
    fetchUnits().then(setUnits).catch((e) => console.error('Failed to load units:', e));
  }, []);

  // Poll only while an AI insight is actively generating. (Previously this
  // also polled while `annotated_steps === null` — a permanent state for most
  // recipes, so it hit GET /recipes/{id} every 3s forever.)
  useEffect(() => {
    if (recipe?.ai_insight?.text !== '__GENERATING__') return;

    const pollInterval = setInterval(async () => {
      try {
        const updatedRecipe = await fetchRecipeById(id as string);
        if (updatedRecipe && updatedRecipe.ai_insight?.text !== '__GENERATING__') {
          setRecipe(updatedRecipe);
          clearInterval(pollInterval);
        }
      } catch (error) {
        console.error('Error polling for updates:', error);
      }
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [recipe?.ai_insight?.text, id]);

  const loadRecipe = async () => {
    try {
      setLoading(true);
      const data = await fetchRecipeById(id as string);
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

  const handleRate = async (value: number | null) => {
    if (!recipe) return;
    const prev = recipe.rating;
    setRecipe({ ...recipe, rating: value }); // optimistic
    try {
      await setRecipeRating(id as string, value);
    } catch (error) {
      console.error('Failed to set rating:', error);
      setRecipe((r) => (r ? { ...r, rating: prev } : r));
    }
  };

  const handleCookedIt = async () => {
    if (!recipe || loggingCook) return;
    setLoggingCook(true);
    const entry = { date: new Date().toISOString(), note: '' };
    const prevHistory = recipe.cook_history || [];
    setRecipe({ ...recipe, cook_history: [...prevHistory, entry] }); // optimistic
    try {
      const updated = await addCookNote(id as string, entry);
      setRecipe(updated);
    } catch (error) {
      console.error('Failed to log cook:', error);
      setRecipe((prev) => (prev ? { ...prev, cook_history: prevHistory } : prev));
    } finally {
      setLoggingCook(false);
    }
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
      // Clear the current insight and set to generating state. Include both
      // the new (insight/recommended_tool) and legacy (text/suggested_tool)
      // field pairs so it satisfies the AIInsight type and the banner's poll.
      setRecipe({
        ...recipe,
        ai_insight: { insight: '__GENERATING__', recommended_tool: null, text: '__GENERATING__', suggested_tool: null }
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
        const unit = matchingIngredient.unit || '';
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

  // Ingredient list with tap-to-check-off — shared by the phone tab view and
  // the wide two-pane layout. Checked items strike through so you can track
  // what's already in the bowl.
  const renderIngredientsList = () => {
    if (!recipe.ingredients || recipe.ingredients.length === 0) {
      return <Text variant="body" color="fgSubtle" style={{ fontStyle: 'italic' }}>No ingredients listed</Text>;
    }
    return recipe.ingredients.map((item, index) => {
      const ingredientName = item.ingredient?.name || item.text || 'Unknown ingredient';
      const scaled = scaleForDisplay(item.quantity, item.unit, multiplier, units);
      let displayText = formatIngredientLine(scaled.quantity, scaled.unit, ingredientName);
      const isOptional = (item as any).optional;
      if (isOptional) displayText = `${displayText} (optional)`;
      displayText = convertDecimalsToFractions(displayText);
      const checked = checkedIngredients.has(index);
      return (
        <Pressable
          key={item.id || index}
          onPress={() => toggleIngredient(index)}
          style={[styles.ingredientRow, isOptional && { opacity: 0.55 }]}
        >
          <View
            style={[
              styles.checkbox,
              { borderColor: checked ? c.accent : c.borderStrong, backgroundColor: checked ? c.accent : 'transparent' },
            ]}
          >
            {checked && <Ionicons name="checkmark" size={14} color={c.accentFg} />}
          </View>
          <Text
            variant="body"
            style={[{ flex: 1, lineHeight: 24 }, checked && { textDecorationLine: 'line-through', color: c.fgSubtle }]}
          >
            {displayText}
          </Text>
        </Pressable>
      );
    });
  };

  const renderStepsList = () => {
    if (!recipe.steps || recipe.steps.length === 0) {
      return <Text variant="body" color="fgSubtle" style={{ fontStyle: 'italic' }}>No instructions provided</Text>;
    }
    return recipe.steps.map((step, index) => {
      const annotatedSteps = (recipe as any).annotated_steps;
      const annotatedText = annotatedSteps?.[index] || step;
      const { cleanText, ingredients } = parseAnnotatedStep(annotatedText);
      return (
        <View key={index} style={styles.stepItem}>
          <View style={[styles.stepNumber, { backgroundColor: c.accent }]}>
            <Text style={[styles.stepNumberText, { color: c.accentFg }]}>{index + 1}</Text>
          </View>
          <View style={styles.stepTextContainer}>
            <Text variant="body" style={styles.stepText}>{cleanText}</Text>
            {ingredients.length > 0 && (
              <View style={[styles.ingredientReferences, { borderTopColor: c.border }]}>
                {ingredients.map((ing, idx) => (
                  <Text key={idx} variant="small" color="fgMuted" style={{ fontStyle: 'italic', marginBottom: 4 }}>
                    • {ing.fullText}
                  </Text>
                ))}
              </View>
            )}
          </View>
        </View>
      );
    });
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: c.bg }]}>
      {/* Floating nav over the hero */}
      <View style={styles.navOverlay} pointerEvents="box-none">
        <Pressable onPress={() => router.push('/(drawer)/(tabs)' as any)} style={styles.navButton}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </Pressable>

        <Pressable onPress={() => setShowMenu(!showMenu)} style={styles.navButton}>
          <Ionicons name="ellipsis-horizontal" size={20} color="#fff" />
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
        <View style={[styles.content, isWide && styles.contentWide]}>
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

          {/* Rating */}
          <View style={styles.ratingRow}>
            <Text variant="label" color="fgMuted">Your rating</Text>
            <StarRating value={recipe.rating} onChange={handleRate} size={26} gap={4} />
          </View>

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
          <View style={{ marginTop: theme.spacing.xl }}>
            <Button
              variant="secondary"
              fullWidth
              size="lg"
              icon={<Ionicons name="book-outline" size={18} color={c.fg} />}
              iconRight={<Ionicons name="arrow-forward" size={18} color={c.fg} />}
              onPress={() => router.push(`/easy-recipe/${id}` as any)}
            >
              Open kitchen reader
            </Button>
          </View>

          {/* Cook log */}
          <View style={[styles.section, { marginTop: theme.spacing.xl }]}>
            <View style={styles.cookLogHeader}>
              <View style={{ flex: 1 }}>
                <Text variant="h2">Cook log</Text>
                <Text variant="small" color="fgMuted" style={{ marginTop: 2 }}>
                  {recipe.cook_history && recipe.cook_history.length > 0
                    ? `Made ${recipe.cook_history.length} ${recipe.cook_history.length === 1 ? 'time' : 'times'} · last ${formatRelative(recipe.cook_history[recipe.cook_history.length - 1].date)}`
                    : 'Not cooked yet — log it the next time you make it.'}
                </Text>
              </View>
              <Button
                size="sm"
                loading={loggingCook}
                onPress={handleCookedIt}
                icon={!loggingCook ? <Ionicons name="restaurant-outline" size={16} color={c.accentFg} /> : undefined}
              >
                I cooked this
              </Button>
            </View>

            {recipe.cook_history && recipe.cook_history.length > 0 && (
              <View style={{ marginTop: theme.spacing.lg, gap: theme.spacing.sm }}>
                {[...recipe.cook_history].reverse().slice(0, 6).map((entry, i) => (
                  <View key={i} style={styles.cookLogRow}>
                    <View style={[styles.cookLogDot, { backgroundColor: c.accent }]} />
                    <Text variant="bodyMedium">{formatCookDate(entry.date)}</Text>
                    {!!entry.note && <Text variant="body" color="fgMuted"> — {entry.note}</Text>}
                  </View>
                ))}
                {recipe.cook_history.length > 6 && (
                  <Text variant="small" color="fgSubtle" style={{ marginLeft: 18 }}>
                    + {recipe.cook_history.length - 6} more
                  </Text>
                )}
              </View>
            )}
          </View>

          {/* Notes Section */}
          {notes && (
            <View style={styles.section}>
              <Text variant="h2" style={{ marginBottom: theme.spacing.md }}>Notes</Text>
              <Text variant="body" color="fgMuted" style={{ lineHeight: 22 }}>{notes}</Text>
            </View>
          )}

          {/* Recipe Multiplier Slider */}
          <View style={[styles.section, { backgroundColor: c.bgMuted, borderRadius: theme.radius.lg, padding: theme.spacing.lg, marginTop: theme.spacing.xl }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.md }}>
              <Text variant="label" color="fgMuted">Recipe size</Text>
              <View style={{ backgroundColor: c.accent, paddingHorizontal: theme.spacing.md, paddingVertical: 4, borderRadius: theme.radius.pill }}>
                <Text style={{ color: c.accentFg, fontWeight: '700', fontSize: 15 }}>{getMultiplierLabel(multiplier)}×</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
              <Text variant="caption" color="fgSubtle">½×</Text>
              <Slider
                style={{ flex: 1, height: 40 }}
                minimumValue={0.5}
                maximumValue={4}
                value={multiplier}
                onValueChange={handleSliderChange}
                minimumTrackTintColor={c.accent}
                maximumTrackTintColor={c.border}
                thumbTintColor={c.accent}
                step={0.01}
              />
              <Text variant="caption" color="fgSubtle">4×</Text>
            </View>
          </View>

          {/* Ingredients + Instructions. Wide screens (iPad landscape /
              desktop) get a side-by-side two-pane; phones keep the tabbed
              flip-card so both fit one thumb-width column. */}
          {isWide ? (
            <View style={styles.twoPane}>
              <View style={styles.paneLeft}>
                <Text variant="h2" style={{ marginBottom: theme.spacing.md }}>Ingredients</Text>
                <ThemedView style={[styles.flipCard, { backgroundColor: cardBackgroundColor, minHeight: 0, marginTop: 0 }]}>
                  {renderIngredientsList()}
                </ThemedView>
              </View>
              <View style={styles.paneRight}>
                <Text variant="h2" style={{ marginBottom: theme.spacing.md }}>Instructions</Text>
                <ThemedView style={[styles.flipCard, { backgroundColor: cardBackgroundColor, minHeight: 0, marginTop: 0 }]}>
                  {renderStepsList()}
                </ThemedView>
              </View>
            </View>
          ) : (
            <View style={styles.section}>
              <View style={styles.flipCardContainer}>
                {/* Tab Headers */}
                <View style={[styles.tabHeaders, { backgroundColor: c.bgMuted, borderRadius: theme.radius.pill, padding: 4 }]}>
                  <Pressable
                    style={[
                      styles.tabHeader,
                      { borderRadius: theme.radius.pill },
                      showIngredients && { backgroundColor: c.bgElevated, ...theme.shadow.sm },
                    ]}
                    onPress={() => setShowIngredients(true)}
                  >
                    <Text variant="bodyMedium" color={showIngredients ? 'fg' : 'fgMuted'}>
                      Ingredients
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.tabHeader,
                      { borderRadius: theme.radius.pill },
                      !showIngredients && { backgroundColor: c.bgElevated, ...theme.shadow.sm },
                    ]}
                    onPress={() => setShowIngredients(false)}
                  >
                    <Text variant="bodyMedium" color={!showIngredients ? 'fg' : 'fgMuted'}>
                      Instructions
                    </Text>
                  </Pressable>
                </View>

                {/* Card Content */}
                <ThemedView style={[styles.flipCard, { backgroundColor: cardBackgroundColor }]}>
                  <View style={styles.cardContent}>
                    {showIngredients ? renderIngredientsList() : renderStepsList()}
                  </View>
                </ThemedView>
              </View>
            </View>
          )}
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
  navOverlay: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
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
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 20,
  },
  cookLogHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cookLogRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cookLogDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 10,
  },
  contentWide: {
    width: '100%',
    maxWidth: 1100,
    alignSelf: 'center',
    paddingHorizontal: 32,
  },
  twoPane: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 24,
    marginBottom: 32,
  },
  paneLeft: {
    flex: 4,
    minWidth: 260,
  },
  paneRight: {
    flex: 6,
    minWidth: 320,
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
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
    fontSize: 24,
    marginRight: 12,
    marginTop: -6,
    color: '#E07856',
    fontWeight: '700',
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
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#E07856',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    marginTop: 0,
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
  menuDropdown: {
    position: 'absolute',
    top: 48,
    right: 0,
    minWidth: 160,
    zIndex: 11,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  menuItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
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
    paddingVertical: 10,
    alignItems: 'center',
  },
  flipCard: {
    borderRadius: 16,
    padding: 20,
    minHeight: 300,
    marginTop: 12,
  },
  cardContent: {
    flex: 1,
  },
  easyViewButton: {
    backgroundColor: '#E07856',
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
    color: '#E07856',
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
