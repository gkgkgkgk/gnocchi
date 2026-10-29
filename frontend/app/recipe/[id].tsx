import { useState, useEffect } from 'react';
import { View, StyleSheet, Pressable, ScrollView, Image, ActivityIndicator, Linking, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { AIInsightsBanner } from '@/components/ai-insights-banner';
import { ToolExecutionModal } from '@/components/tool-execution-modal';
import { RecipePhotoGallery } from '@/components/recipe-photo-gallery';
import { RecipeChatPanel } from '@/components/recipe-chat-panel';
import { EditRecipeTagsModal } from '@/components/edit-recipe-tags-modal';
import { Text } from '@/components/ui/Text';
import { fonts } from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Sheet } from '@/components/ui/Sheet';
import { StarRating } from '@/components/ui/StarRating';
import { fetchRecipeById, Recipe, deleteRecipe, saveModifiedRecipe, updateRecipeTags, setRecipeRating, addCookNote, setRecipeNotes, setCookHistory, CookHistoryEntry } from '@/services/recipe-service';
import { CookLog } from '@/components/cook-log';
import { Toast, type ToastMessage } from '@/components/ui/Toast';
import { executeAITool, AITool } from '@/services/ai-tools-service';
import { fetchUnits, Unit } from '@/services/unit-service';
import { getUnitPreference, type UnitPreference } from '@/services/profile-service';
import { scaleForDisplay, toggleMeasureType, findUnit } from '@/utils/unit-conversion';
import { densityFor } from '@/utils/ingredient-density';
import { formatAmount, groupBySection } from '@/utils/ingredient-formatter';
import { useTheme } from '@/hooks/use-theme';
import { inputStyle } from '@/components/ui/Input';
import { blockPress, type PressState } from '@/components/ui/press';
import { RecipeCover } from '@/components/kitchen/recipe-cover';
import { Tablecloth } from '@/components/kitchen/tablecloth';
import { DishSticker } from '@/components/kitchen/dish-sticker';
import { Mascot } from '@/components/kitchen/mascot';
import { Board, Pot } from '@/components/kitchen/shapes';
import { Bob, FadeIn, Pop, Rise } from '@/components/kitchen/motion';
import { ORIGIN_ICON, ORIGIN_LABEL, originOf } from '@/utils/recipe-origin';
import { useResponsive } from '@/hooks/use-responsive';

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
  const insets = useSafeAreaInsets();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showToolModal, setShowToolModal] = useState(false);
  const [executingTool, setExecutingTool] = useState(false);
  const [selectedTool, setSelectedTool] = useState<AITool | null>(null);
  const [modifiedRecipe, setModifiedRecipe] = useState<any>(null);
  const [savedRecipeId, setSavedRecipeId] = useState<string | null>(null);
  const [multiplier, setMultiplier] = useState(1);
  const [showEditTags, setShowEditTags] = useState(false);
  const [recipeTags, setRecipeTags] = useState<string[]>([]);
  const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(new Set());
  // Ingredient indices the user flipped between weight/volume (density-based).
  const [flippedUnits, setFlippedUnits] = useState<Set<number>>(new Set());
  const [loggingCook, setLoggingCook] = useState(false);
  const [units, setUnits] = useState<Unit[]>([]);
  const [unitPref, setUnitPref] = useState<UnitPreference>('as_written');
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);

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

  const [doneSteps, setDoneSteps] = useState<Set<number>>(new Set());
  const toggleStep = (index: number) => {
    setDoneSteps((prev) => {
      const next = new Set(prev);
      next.has(index) ? next.delete(index) : next.add(index);
      return next;
    });
  };

  const toggleUnitFlip = (index: number) => {
    setFlippedUnits((prev) => {
      const next = new Set(prev);
      next.has(index) ? next.delete(index) : next.add(index);
      return next;
    });
  };

  useEffect(() => {
    loadRecipe();
  }, [id]);

  // Canonical units power the scale-aware ingredient display (e.g. doubling
  // 1 tbsp shows 1/8 cup). Loaded once; free-text units just skip conversion.
  useEffect(() => {
    fetchUnits().then(setUnits).catch((e) => console.error('Failed to load units:', e));
    getUnitPreference().then(setUnitPref).catch(() => {});
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
      <View style={[styles.container, styles.loadingContainer, { backgroundColor: c.bg }]}>
        <Bob><Mascot size={110} /></Bob>
        <ActivityIndicator color={c.accent} style={{ marginTop: 18 }} />
      </View>
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

  const saveCookLog = async (next: CookHistoryEntry[], prev: CookHistoryEntry[]) => {
    setRecipe((r) => (r ? { ...r, cook_history: next } : r)); // optimistic
    try {
      setRecipe(await setCookHistory(id as string, next));
    } catch (error) {
      console.error('Failed to update the cook log:', error);
      setRecipe((r) => (r ? { ...r, cook_history: prev } : r));
      setToast({ text: "Couldn't update the cook log." });
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
      // A mis-tap is easy; offer the way back right away.
      setToast({
        text: 'Logged as cooked today',
        actionLabel: 'Undo',
        onAction: () => saveCookLog(prevHistory, updated.cook_history ?? []),
      });
    } catch (error) {
      console.error('Failed to log cook:', error);
      setRecipe((prev) => (prev ? { ...prev, cook_history: prevHistory } : prev));
    } finally {
      setLoggingCook(false);
    }
  };

  const removeCook = (index: number) => {
    if (!recipe) return;
    const prev = recipe.cook_history ?? [];
    saveCookLog(prev.filter((_, i) => i !== index), prev);
    setToast({ text: 'Removed from the cook log', actionLabel: 'Undo', onAction: () => saveCookLog(prev, prev) });
  };

  const addPastCook = async (entry: CookHistoryEntry) => {
    if (!recipe) return;
    const prev = recipe.cook_history ?? [];
    await saveCookLog([...prev, entry], prev);
  };

  const startEditNotes = () => {
    setNotesDraft((recipe as any)?.notes || '');
    setEditingNotes(true);
  };

  const handleSaveNotes = async () => {
    if (!recipe || savingNotes) return;
    setSavingNotes(true);
    const next = notesDraft.trim();
    const prev = (recipe as any).notes || '';
    setRecipe({ ...recipe, notes: next } as Recipe); // optimistic
    setEditingNotes(false);
    try {
      const updated = await setRecipeNotes(id as string, next);
      setRecipe(updated);
    } catch (error) {
      console.error('Failed to save notes:', error);
      setRecipe((r) => (r ? ({ ...r, notes: prev } as Recipe) : r));
    } finally {
      setSavingNotes(false);
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
        
        // Same order as the ingredient list: "all-purpose flour, 2 cups"
        const amount = formatAmount(quantity, unit);
        fullText = amount ? `${ingredientName}, ${amount}` : ingredientName;
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
    return groupBySection(recipe.ingredients).map((group, groupIndex) => (
      <View key={`${groupIndex}-${group.section ?? ''}`}>
        {group.section && (
          <Text
            variant="label"
            color="accent"
            style={[styles.ingredientSection, groupIndex === 0 && { marginTop: 0 }]}
          >
            {group.section}
          </Text>
        )}
        {group.items.map(({ item, index }) => renderIngredientRow(item, index))}
      </View>
    ));
  };

  // One ingredient: the name in bold first so the list scans at a glance,
  // then the scaled amount ("Vegetable Oil, 1/3 cup").
  const renderIngredientRow = (item: Recipe['ingredients'][number], index: number) => {
    const ingredientName = item.ingredient?.name || item.text || 'Unknown ingredient';
    const scaled = scaleForDisplay(item.quantity, item.unit, multiplier, units, unitPref);

    // Weight↔volume flip: offer it only when we know this ingredient's
    // density and its unit is a convertible weight/volume unit.
    const density = densityFor(ingredientName);
    const scaledUnit = findUnit(units, scaled.unit);
    const flipped = flippedUnits.has(index);
    let shownQty = scaled.quantity;
    let shownUnit = scaled.unit;
    let canFlip = false;
    if (density && scaledUnit && (scaledUnit.type === 'weight' || scaledUnit.type === 'volume')) {
      const alt = toggleMeasureType(scaled.quantity, scaledUnit, units, density);
      if (alt) {
        canFlip = true;
        if (flipped) {
          shownQty = alt.quantity;
          shownUnit = alt.unit;
        }
      }
    }

    const amount = formatAmount(shownQty, shownUnit);
    const isOptional = item.optional;
    const checked = checkedIngredients.has(index);
    return (
      <Pressable
        key={item.id || index}
        onPress={() => toggleIngredient(index)}
        style={[styles.ingredientRow, isOptional && { opacity: 0.55 }]}
      >
        <Pop trigger={checked} style={[styles.bowl, { borderColor: c.outline, backgroundColor: checked ? c.butter : c.bgElevated }]}>
          {checked && <Ionicons name="checkmark" size={14} color={c.outline} />}
        </Pop>
        <Text
          variant="body"
          color="fgMuted"
          style={[{ flex: 1, lineHeight: 24 }, checked && { textDecorationLine: 'line-through', color: c.fgSubtle }]}
        >
          <Text variant="bodyMedium" color={checked ? 'inherit' : 'fg'} style={styles.ingredientName}>
            {ingredientName}
          </Text>
          {amount ? `, ${amount}` : ''}
          {isOptional ? ' (optional)' : ''}
        </Text>
        {canFlip && (() => {
          const nativeType = scaledUnit!.type; // 'weight' | 'volume'
          // Tapping switches TO: native when currently flipped, else the opposite.
          const targetType = flipped ? nativeType : (nativeType === 'weight' ? 'volume' : 'weight');
          return (
            <Pressable
              onPress={(e) => { e.stopPropagation(); toggleUnitFlip(index); }}
              hitSlop={8}
              style={[styles.flipButton, { borderColor: c.border }, flipped && { backgroundColor: c.accentMuted, borderColor: c.accent }]}
            >
              <Ionicons name="swap-horizontal" size={14} color={flipped ? c.accent : c.fgSubtle} />
              <Text variant="caption" style={{ color: flipped ? c.accent : c.fgSubtle }}>
                {targetType === 'weight' ? 'wt' : 'vol'}
              </Text>
            </Pressable>
          );
        })()}
      </Pressable>
    );
  };

  const renderStepsList = () => {
    if (!recipe.steps || recipe.steps.length === 0) {
      return <Text variant="body" color="fgSubtle" style={{ fontStyle: 'italic' }}>No steps yet.</Text>;
    }
    // The first step not yet done is "on the heat".
    const current = recipe.steps.findIndex((_, i) => !doneSteps.has(i));
    return recipe.steps.map((step, index) => {
      const annotatedSteps = (recipe as any).annotated_steps;
      const annotatedText = annotatedSteps?.[index] || step;
      const { cleanText, ingredients } = parseAnnotatedStep(annotatedText);
      const done = doneSteps.has(index);
      const lit = index === current;
      return (
        <Pressable
          key={index}
          onPress={() => toggleStep(index)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: done }}
          style={[styles.stepItem, done && { opacity: 0.45 }]}
        >
          <Pop trigger={lit}>
            <View style={[styles.burner, { borderColor: c.outline, backgroundColor: lit ? c.tomato : done ? c.bgMuted : c.bgElevated }]}>
              <View style={[styles.burnerRing, { borderColor: lit ? c.accentFg : c.borderStrong }]} />
              {done
                ? <Ionicons name="checkmark" size={16} color={c.fgMuted} />
                : <Text variant="label" style={{ color: lit ? c.accentFg : c.fg, fontSize: 14 }}>{index + 1}</Text>}
            </View>
          </Pop>
          <View style={styles.stepTextContainer}>
            <Text variant="body" style={[styles.stepText, done && { textDecorationLine: 'line-through' }]}>{cleanText}</Text>
            {ingredients.length > 0 && (
              <View style={[styles.ingredientReferences, { borderTopColor: c.border }]}>
                {ingredients.map((ing, idx) => (
                  <Text key={idx} variant="small" color="fgMuted" style={{ marginBottom: 4 }}>
                    • {ing.fullText}
                  </Text>
                ))}
              </View>
            )}
          </View>
        </Pressable>
      );
    });
  };

  const facts = [
    servings > 0 && { label: 'Serves', value: `${Math.round(servings * multiplier * 10) / 10}` },
    prepTime > 0 && { label: 'Prep', value: `${prepTime} min` },
    cookTime > 0 && { label: 'Cook', value: `${cookTime} min` },
    totalTime > 0 && { label: 'Total', value: `${totalTime} min` },
  ].filter(Boolean) as { label: string; value: string }[];
  const origin = originOf(recipe.source_type, recipe.source_recipe_id, recipe.source_url);
  const cookCount = recipe.cook_history?.length ?? 0;

  const panel = [styles.panel, { backgroundColor: c.bgElevated, borderColor: c.outline, ...theme.shadow.md }];

  const ingredientsPanel = (
    <View style={panel}>
      <View style={styles.panelHead}>
        <Board size={40} rotate={-10} />
        <Text variant="h2" accessibilityRole="header">Ingredients</Text>
        <View style={{ flex: 1 }} />
      </View>
      <View style={styles.scaleRow} accessibilityRole="radiogroup" accessibilityLabel="Recipe size">
        <Text variant="label" color="fgMuted" style={{ marginRight: 4 }}>Make</Text>
        {SCALES.map(([value, label]) => (
          <Chip key={label} size="sm" variant={multiplier === value ? 'accent' : 'outline'} onPress={() => setMultiplier(value)}>
            {label}
          </Chip>
        ))}
      </View>
      {renderIngredientsList()}
    </View>
  );

  const methodPanel = (
    <View style={panel}>
      <View style={styles.panelHead}>
        <Pot size={42} />
        <Text variant="h2" accessibilityRole="header">Method</Text>
        <View style={{ flex: 1 }} />
        {doneSteps.size > 0 && (
          <Pressable onPress={() => setDoneSteps(new Set())} hitSlop={6} accessibilityRole="button">
            <Text variant="smallMedium" color="accent">Reset</Text>
          </Pressable>
        )}
      </View>
      <Text variant="small" color="fgSubtle" style={{ marginBottom: 12 }}>Tap a step when it&apos;s done.</Text>
      {renderStepsList()}
    </View>
  );

  return (
    <FadeIn style={[styles.container, { backgroundColor: c.bg }]}>
      <Tablecloth />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Hero: the photo, or the dish drawn on the counter */}
        <View style={{ borderBottomWidth: theme.outlineWidth, borderBottomColor: c.outline, zIndex: 2 }}>
          {imageUrl ? (
            <>
              <Image source={{ uri: imageUrl }} style={[styles.heroImage, { height: isWide ? 340 : 260 }]} accessibilityIgnoresInvertColors />
              <DishSticker
                title={recipe.title}
                tags={recipeTags}
                ingredients={(recipe.ingredients ?? []).map((i) => i.text)}
                id={recipe.id}
                size={isWide ? 130 : 96}
                style={{ right: isWide ? 40 : 16, bottom: isWide ? -34 : -26, zIndex: 2 }}
              />
            </>
          ) : (
            <RecipeCover
              title={recipe.title}
              tags={recipeTags}
              ingredients={(recipe.ingredients ?? []).map((i) => i.text)}
              id={recipe.id}
              height={isWide ? 300 : 230}
              steam
            />
          )}
        </View>

        <View style={[styles.content, isWide && styles.contentWide]}>
          <Rise index={0}>
            <View style={styles.chipRow}>
              <Chip variant="outline" size="sm" icon={<Ionicons name={ORIGIN_ICON[origin]} size={13} color={c.accent} />}>
                {ORIGIN_LABEL[origin]}
              </Chip>
              {recipe.source_recipe_id && (
                <Chip size="sm" variant="outline" onPress={() => router.push(`/recipe/${recipe.source_recipe_id}` as any)} icon={<Ionicons name="git-branch-outline" size={13} color={c.accent} />}>
                  View original
                </Chip>
              )}
              {recipe.source_url?.startsWith('http') && (
                <Chip size="sm" variant="outline" onPress={() => Linking.openURL(recipe.source_url!)} icon={<Ionicons name="open-outline" size={13} color={c.accent} />}>
                  Source
                </Chip>
              )}
            </View>
            <Text variant="display" style={{ marginTop: 12 }} accessibilityRole="header">{recipe.title}</Text>
            <View style={styles.ratingRow}>
              <StarRating value={recipe.rating} onChange={handleRate} size={24} gap={3} />
              <Text variant="small" color="fgMuted">
                {cookCount > 0
                  ? `Cooked ${cookCount} ${cookCount === 1 ? 'time' : 'times'} · last ${formatRelative(recipe.cook_history[cookCount - 1].date)}`
                  : 'Not cooked yet'}
              </Text>
            </View>
          </Rise>

          {facts.length > 0 && (
            <Rise index={1}>
              <View style={styles.facts}>
                {facts.map((f) => (
                  <View key={f.label} style={[styles.fact, !isWide && styles.factNarrow, { borderColor: c.outline, backgroundColor: c.bgElevated, ...theme.shadow.sm }]}>
                    <Text variant="caption" color="fgMuted" numberOfLines={1}>{f.label}</Text>
                    <Text variant="h2" style={{ fontSize: isWide ? 19 : 16 }} numberOfLines={1}>{f.value}</Text>
                  </View>
                ))}
              </View>
            </Rise>
          )}

          <Rise index={2}>
            <View style={styles.actions}>
              <Button
                size="lg"
                onPress={() => router.push(`/easy-recipe/${id}` as any)}
                icon={<Ionicons name="flame" size={18} color={c.accentFg} />}
                style={{ flexGrow: 1 }}
              >
                Start cooking
              </Button>
              <Button
                size="lg"
                variant="secondary"
                loading={loggingCook}
                onPress={handleCookedIt}
                icon={!loggingCook ? <Ionicons name="checkmark-done" size={18} color={c.fg} /> : undefined}
                style={{ flexGrow: 1 }}
              >
                I cooked this
              </Button>
            </View>
          </Rise>

          <Rise index={3}>
            {isWide ? (
              <View style={styles.twoPane}>
                <View style={styles.paneLeft}>{ingredientsPanel}</View>
                <View style={styles.paneRight}>{methodPanel}</View>
              </View>
            ) : (
              <View style={{ gap: 20 }}>{ingredientsPanel}{methodPanel}</View>
            )}
          </Rise>

          <View style={{ marginTop: 24 }}>
            <AIInsightsBanner
              insight={recipe.ai_insight?.text === '__GENERATING__' ? 'Chef Gnocchi is reading this recipe…' : recipe.ai_insight?.text}
              recommendedAction={recipe.ai_insight?.suggested_tool ? formatToolName(recipe.ai_insight.suggested_tool) : undefined}
              loading={recipe.ai_insight?.text === '__GENERATING__'}
              onActionPress={async () => {
                if (recipe.ai_insight?.suggested_tool) {
                  const { fetchAIToolByName } = await import('@/services/ai-tools-service');
                  const tool = await fetchAIToolByName(recipe.ai_insight.suggested_tool);
                  if (tool) handleToolPress(tool);
                }
              }}
              onToolPress={handleToolPress}
              onRefresh={handleRefreshInsight}
            />
          </View>

          {/* Notes: editable free text on every recipe */}
          <View style={[panel, { marginTop: 24 }]}>
            <View style={styles.panelHead}>
              <Text variant="h2" accessibilityRole="header">Notes</Text>
              <View style={{ flex: 1 }} />
              {!editingNotes && (
                <Pressable onPress={startEditNotes} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }} accessibilityRole="button">
                  <Ionicons name={notes ? 'create-outline' : 'add'} size={18} color={c.accent} />
                  <Text variant="smallMedium" color="accent">{notes ? 'Edit' : 'Add a note'}</Text>
                </Pressable>
              )}
            </View>
            {editingNotes ? (
              <View>
                <TextInput
                  value={notesDraft}
                  onChangeText={setNotesDraft}
                  placeholder="Tweaks, swaps, what you'd change next time"
                  placeholderTextColor={c.fgSubtle}
                  multiline
                  autoFocus
                  accessibilityLabel="Notes"
                  style={[inputStyle(theme, { focused: true }), { minHeight: 110, padding: 12, fontSize: 16, lineHeight: 24, textAlignVertical: 'top' }]}
                />
                <View style={{ flexDirection: 'row', gap: 12, marginTop: 14, justifyContent: 'flex-end' }}>
                  <Button variant="ghost" onPress={() => setEditingNotes(false)}>Cancel</Button>
                  <Button onPress={handleSaveNotes} loading={savingNotes}>Save notes</Button>
                </View>
              </View>
            ) : notes ? (
              <Pressable onPress={startEditNotes}>
                <Text variant="body" color="fgMuted">{notes}</Text>
              </Pressable>
            ) : (
              <Pressable onPress={startEditNotes}>
                <Text variant="body" color="fgSubtle">Nothing yet. Tap to jot down tweaks or reminders.</Text>
              </Pressable>
            )}
          </View>

          {/* Cook log */}
          <View style={[panel, { marginTop: 24 }]}>
            <View style={styles.panelHead}>
              <Text variant="h2" accessibilityRole="header">Cook log</Text>
            </View>
            <CookLog entries={recipe.cook_history ?? []} onRemove={removeCook} onAdd={addPastCook} />
          </View>
        </View>

        <RecipePhotoGallery
          recipeId={recipe.id}
          photos={recipe.photos ?? []}
          coverKey={recipe.cover_image ?? null}
          onChange={(updated) => setRecipe(updated)}
        />
      </ScrollView>

      {/* Floating controls over the hero */}
      <View style={[styles.navOverlay, { top: insets.top + 12 }]} pointerEvents="box-none">
        <IconBlock icon="chevron-back" label="Back" onPress={() => (router.canGoBack() ? router.back() : router.push('/(drawer)/(tabs)' as any))} />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <IconBlock icon="create-outline" label="Edit recipe" onPress={handleEdit} />
          <IconBlock icon="ellipsis-horizontal" label="More" onPress={() => setShowMenu(!showMenu)} />
        </View>
        {showMenu && (
          <Rise style={[styles.menuDropdown, { backgroundColor: c.bgElevated, borderColor: c.outline, ...theme.shadow.md }]}>
            {[
              { label: 'Start cooking', go: () => router.push(`/easy-recipe/${id}` as any) },
              { label: 'Ask AI', go: () => setShowChat(true) },
              { label: 'Edit tags', go: () => setShowEditTags(true) },
            ].map((item) => (
              <Pressable key={item.label} style={[styles.menuItem, { borderBottomColor: c.border }]} onPress={() => { setShowMenu(false); item.go(); }}>
                <Text variant="bodyMedium">{item.label}</Text>
              </Pressable>
            ))}
            <Pressable style={styles.menuItem} onPress={() => { setShowMenu(false); setShowDeleteConfirm(true); }}>
              <Text variant="bodyMedium" color="danger">Delete</Text>
            </Pressable>
          </Rise>
        )}
      </View>

      {/* Ask AI */}
      <Pressable
        onPress={() => setShowChat(true)}
        accessibilityRole="button"
        style={(state) => [styles.askAiFab, { backgroundColor: c.butter, borderColor: c.outline, bottom: insets.bottom + 20 }, blockPress(theme, state as PressState, 4)]}
      >
        <Ionicons name="sparkles" size={18} color={c.fg} />
        <Text variant="button" style={{ color: c.fg }}>Ask AI</Text>
      </Pressable>

      {recipe && (
        <RecipeChatPanel
          visible={showChat}
          recipe={recipe}
          onClose={() => setShowChat(false)}
          onApplied={(updated) => {
            setShowChat(false);
            router.push(`/recipe/${updated.id}` as any);
          }}
        />
      )}

      <Toast message={toast} onDismiss={() => setToast(null)} bottom={insets.bottom + 84} />

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
          &ldquo;{recipe.title}&rdquo; will be permanently removed.
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
        ingredients={(recipe?.ingredients ?? []).map((i) => i.text)}
      />
    </FadeIn>
  );
}

const SCALES: [number, string][] = [[0.5, '½×'], [1, '1×'], [1.5, '1½×'], [2, '2×'], [3, '3×']];

/** A square outlined button that floats over the hero. */
function IconBlock({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  const theme = useTheme();
  const c = theme.colors;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      style={(state) => [styles.iconBlock, { backgroundColor: c.bgElevated, borderColor: c.outline }, blockPress(theme, state as PressState, 2, 2)]}
    >
      <Ionicons name={icon} size={20} color={c.fg} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  heroImage: { width: '100%', resizeMode: 'cover' },
  navOverlay: {
    position: 'absolute', left: 16, right: 16, zIndex: 10,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
  },
  iconBlock: { width: 42, height: 42, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  menuDropdown: {
    position: 'absolute', top: 52, right: 0, minWidth: 190,
    borderRadius: 14, borderWidth: 2, overflow: 'hidden',
  },
  menuItem: { paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: 'transparent' },
  askAiFab: {
    position: 'absolute', right: 20, flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 18, paddingVertical: 13, borderRadius: 16, borderWidth: 2,
  },
  content: { padding: 20, gap: 20 },
  contentWide: { width: '100%', maxWidth: 1180, alignSelf: 'center', paddingHorizontal: 32 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginTop: 10 },
  facts: { flexDirection: 'row', gap: 10 },
  fact: { minWidth: 92, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, borderWidth: 2 },
  factNarrow: { flex: 1, minWidth: 0, paddingHorizontal: 10 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  twoPane: { flexDirection: 'row', gap: 24, alignItems: 'flex-start' },
  paneLeft: { flex: 5, minWidth: 0 },
  paneRight: { flex: 7, minWidth: 0 },
  panel: { borderRadius: 24, borderWidth: 2, padding: 20 },
  panelHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12, minHeight: 36 },
  scaleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 14 },
  ingredientRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 6 },
  ingredientName: { fontFamily: fonts.sansSb, fontWeight: '600' },
  ingredientSection: { textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 18, marginBottom: 6 },
  bowl: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  flipButton: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, borderWidth: 1.5, marginTop: 1,
  },
  stepItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, marginBottom: 18 },
  burner: { width: 38, height: 38, borderRadius: 19, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  burnerRing: { position: 'absolute', width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, opacity: 0.8 },
  stepTextContainer: { flex: 1, paddingTop: 6 },
  stepText: { fontSize: 17, lineHeight: 26 },
  ingredientReferences: { marginTop: 10, paddingTop: 8, borderTopWidth: 1 },
});
