import { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, Pressable, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { CookTimers, TimerSuggestion } from '@/components/cook-timers';
import { fetchRecipeById, Recipe } from '@/services/recipe-service';
import { fetchUnits, Unit } from '@/services/unit-service';
import { getUnitPreference, type UnitPreference } from '@/services/profile-service';
import { scaleForDisplay } from '@/utils/unit-conversion';
import { convertDecimalsToFractions } from '@/utils/fraction-formatter';
import { formatIngredientLine } from '@/utils/ingredient-formatter';
import { useTheme } from '@/hooks/use-theme';
import { type Theme } from '@/constants/theme';

const VERB_RE = /\b(bake|roast|simmer|boil|cook|fry|sauté|saute|steam|chill|rest|marinate|proof|rise|grill|braise|poach|refrigerate|freeze|knead|whisk|reduce|toast|broil|steep|soak)\b/i;
const TIME_RE = /(\d+)\s*(hours?|hrs?|minutes?|mins?|seconds?|secs?)/gi;

/** Pull "cook for 20 minutes"-style durations out of steps into quick-add
 *  timer chips. First number of a range wins; deduped by duration. */
function deriveTimerSuggestions(steps: string[]): TimerSuggestion[] {
  const out: TimerSuggestion[] = [];
  const seen = new Set<number>();
  steps.forEach((step, i) => {
    if (!step) return;
    TIME_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = TIME_RE.exec(step)) !== null) {
      const n = parseInt(m[1], 10);
      if (!n) continue;
      const unit = m[2].toLowerCase();
      const seconds = unit.startsWith('h') ? n * 3600 : unit.startsWith('m') ? n * 60 : n;
      if (seconds < 30 || seconds > 6 * 3600 || seen.has(seconds)) continue;
      seen.add(seconds);
      const verb = step.match(VERB_RE)?.[1];
      const label = verb ? verb[0].toUpperCase() + verb.slice(1).toLowerCase() : `Step ${i + 1}`;
      out.push({ label, seconds });
    }
  });
  return out.slice(0, 5);
}

export default function EasyRecipeViewer() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const styles = makeStyles(theme);
  const c = theme.colors;
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [multiplier, setMultiplier] = useState(1);
  const [units, setUnits] = useState<Unit[]>([]);
  const [unitPref, setUnitPref] = useState<UnitPreference>('as_written');
  const { width } = useWindowDimensions();
  const tintColor = c.accent;

  // Use side-by-side layout if width is >= 768px (tablet landscape or desktop)
  const useSideBySide = width >= 768;

  const timerSuggestions = useMemo(() => deriveTimerSuggestions(recipe?.steps ?? []), [recipe?.steps]);

  // Multiplier options
  const multiplierOptions = [0.5, 0.75, 1, 1.25, 1.333, 1.5, 1.75, 2, 2.5, 3, 3.5, 4];
  const multiplierLabels = ['1/2', '3/4', '1', '1 1/4', '1 1/3', '1 1/2', '1 3/4', '2', '2 1/2', '3', '3 1/2', '4'];
  
  const getMultiplierLabel = (value: number) => {
    const index = multiplierOptions.findIndex(opt => Math.abs(opt - value) < 0.01);
    return index >= 0 ? multiplierLabels[index] : value.toFixed(2);
  };

  // Step through the snap points with the − / + buttons on the ingredients header.
  const stepSize = (dir: -1 | 1) => {
    const idx = multiplierOptions.findIndex((o) => Math.abs(o - multiplier) < 0.01);
    const cur = idx >= 0 ? idx : multiplierOptions.indexOf(1);
    const next = Math.min(multiplierOptions.length - 1, Math.max(0, cur + dir));
    setMultiplier(multiplierOptions[next]);
  };
  const atMin = Math.abs(multiplier - multiplierOptions[0]) < 0.01;
  const atMax = Math.abs(multiplier - multiplierOptions[multiplierOptions.length - 1]) < 0.01;

  useEffect(() => {
    loadRecipe();
  }, [id]);

  useEffect(() => {
    fetchUnits().then(setUnits).catch((e) => console.error('Failed to load units:', e));
    getUnitPreference().then(setUnitPref).catch(() => {});
  }, []);

  const loadRecipe = async () => {
    try {
      setLoading(true);
      const data = await fetchRecipeById(id as string);
      setRecipe(data);
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
          <ThemedText style={styles.loadingText}>Loading recipe...</ThemedText>
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

  return (
    <ThemedView style={styles.container}>
      {/* Back to Recipe Button */}
      <View style={[styles.headerButtons, { paddingTop: insets.top + 12 }]}>
        <Pressable 
          onPress={() => router.push(`/recipe/${id}` as any)}
          style={styles.backButton}
        >
          <ThemedText style={styles.backButtonText}>← View Full Recipe</ThemedText>
        </Pressable>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Recipe Title */}
          <ThemedText style={styles.title}>{recipe.title}</ThemedText>

          {/* Servings Info */}
          {recipe.servings && (
            <ThemedText style={styles.servings}>
              Serves {recipe.servings}
            </ThemedText>
          )}

          {/* Cook-along timers — start/stop named timers that beep when done
              and keep the screen awake while they run. */}
          <View style={styles.timersWrap}>
            <CookTimers suggestions={timerSuggestions} />
          </View>

          {/* Main Content - Side by Side or Stacked */}
          <View style={useSideBySide ? styles.sideBySideContainer : styles.stackedContainer}>
            {/* Ingredients Section */}
            <View style={[styles.section, useSideBySide && styles.sectionSideBySide]}>
              <View style={styles.sectionHeaderRow}>
                <ThemedText style={styles.sectionTitleInline}>Ingredients</ThemedText>
                <View style={styles.sizeStepper}>
                  <Pressable
                    onPress={() => stepSize(-1)}
                    disabled={atMin}
                    hitSlop={6}
                    style={[styles.stepBtn, { backgroundColor: c.bgElevated }, atMin && { opacity: 0.4 }]}
                  >
                    <Ionicons name="remove" size={18} color={c.fg} />
                  </Pressable>
                  <ThemedText style={styles.sizeLabel}>{getMultiplierLabel(multiplier)}×</ThemedText>
                  <Pressable
                    onPress={() => stepSize(1)}
                    disabled={atMax}
                    hitSlop={6}
                    style={[styles.stepBtn, { backgroundColor: c.bgElevated }, atMax && { opacity: 0.4 }]}
                  >
                    <Ionicons name="add" size={18} color={c.fg} />
                  </Pressable>
                </View>
              </View>
              <View style={styles.ingredientsList}>
                {recipe.ingredients && recipe.ingredients.length > 0 ? (
                  recipe.ingredients.map((item, index) => {
                    const ingredientName = item.ingredient?.name || item.text || 'Unknown';
                    const scaled = scaleForDisplay(item.quantity, item.unit, multiplier, units, unitPref);
                    let displayText = formatIngredientLine(scaled.quantity, scaled.unit, ingredientName);
                    displayText = convertDecimalsToFractions(displayText);
                    const isOptional = (item as any).optional;
                    if (isOptional) displayText = `${displayText} (optional)`;
                    
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
            </View>

            {/* Instructions Section */}
            <View style={[styles.section, useSideBySide && styles.sectionSideBySide]}>
              <View style={styles.sectionHeaderRow}>
                <ThemedText style={styles.sectionTitleInline}>Instructions</ThemedText>
              </View>
              <View style={styles.instructionsList}>
                {recipe.steps && recipe.steps.length > 0 ? (
                  recipe.steps.map((step, index) => (
                    <View key={index} style={styles.stepItem}>
                      <View style={styles.stepNumber}>
                        <ThemedText style={styles.stepNumberText}>
                          {index + 1}
                        </ThemedText>
                      </View>
                      <ThemedText style={styles.stepText}>
                        {step}
                      </ThemedText>
                    </View>
                  ))
                ) : (
                  <ThemedText style={styles.placeholderText}>
                    No instructions provided
                  </ThemedText>
                )}
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

function makeStyles(theme: Theme) {
  const c = theme.colors;
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.bg,
  },
  headerButtons: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  backButton: {
    backgroundColor: c.accentMuted,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: theme.radius.md,
    alignSelf: 'flex-start',
  },
  backButtonText: {
    ...theme.type.button,
    color: c.accent,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 24,
    maxWidth: 1400,
    alignSelf: 'center',
    width: '100%',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  servings: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 24,
    opacity: 0.7,
  },
  timersWrap: {
    maxWidth: 520,
    width: '100%',
    alignSelf: 'center',
    marginBottom: 28,
  },
  sideBySideContainer: {
    flexDirection: 'row',
    gap: 32,
    alignItems: 'flex-start',
  },
  stackedContainer: {
    flexDirection: 'column',
  },
  section: {
    marginBottom: 40,
  },
  sectionSideBySide: {
    flex: 1,
    marginBottom: 0,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: c.accent,
  },
  // Shared by both column headers so the accent underline lines up across
  // Ingredients (which carries the size stepper) and Instructions.
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 50,
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: c.accent,
  },
  sectionTitleInline: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  sizeStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: c.bgMuted,
    borderRadius: theme.radius.pill,
    padding: 4,
  },
  stepBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadow.sm,
  },
  sizeLabel: {
    fontSize: 16,
    fontWeight: '700',
    minWidth: 44,
    textAlign: 'center',
    color: c.accent,
  },
  ingredientsList: {
    gap: 8,
  },
  ingredientItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 4,
  },
  ingredientBullet: {
    fontSize: 18,
    marginRight: 12,
    marginTop: 2,
  },
  ingredientText: {
    fontSize: 18,
    lineHeight: 26,
    flex: 1,
  },
  instructionsList: {
    gap: 20,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stepNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: c.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    marginTop: 2,
  },
  stepNumberText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: c.accentFg,
  },
  stepText: {
    fontSize: 18,
    lineHeight: 28,
    flex: 1,
  },
  placeholderText: {
    fontSize: 16,
    opacity: 0.5,
    fontStyle: 'italic',
  },
  multiplierContainer: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: c.bgMuted,
    borderRadius: 12,
    marginBottom: 24,
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
    color: c.accent,
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
}
