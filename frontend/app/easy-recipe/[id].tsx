import { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, Pressable, useWindowDimensions } from 'react-native';
import Slider from '@react-native-community/slider';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { fetchRecipeById, Recipe } from '@/services/recipe-service';
import { convertDecimalsToFractions } from '@/utils/fraction-formatter';
import { formatIngredientLine } from '@/utils/ingredient-formatter';
import { useThemeColor } from '@/hooks/use-theme-color';

export default function EasyRecipeViewer() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [multiplier, setMultiplier] = useState(1);
  const { width } = useWindowDimensions();
  const tintColor = useThemeColor({}, 'tint');
  
  // Use side-by-side layout if width is >= 768px (tablet landscape or desktop)
  const useSideBySide = width >= 768;

  // Multiplier options
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
      <View style={styles.headerButtons}>
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

          {/* Recipe Multiplier Slider */}
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

          {/* Main Content - Side by Side or Stacked */}
          <View style={useSideBySide ? styles.sideBySideContainer : styles.stackedContainer}>
            {/* Ingredients Section */}
            <View style={[styles.section, useSideBySide && styles.sectionSideBySide]}>
              <ThemedText style={styles.sectionTitle}>Ingredients</ThemedText>
              <View style={styles.ingredientsList}>
                {recipe.ingredients && recipe.ingredients.length > 0 ? (
                  recipe.ingredients.map((item, index) => {
                    const ingredientName = item.ingredient?.name || item.text || 'Unknown';
                    const unitName = item.unit?.name;
                    const quantity = item.quantity * multiplier; // Apply multiplier
                    let displayText = formatIngredientLine(quantity, unitName, ingredientName);
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
              <ThemedText style={styles.sectionTitle}>Instructions</ThemedText>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerButtons: {
    padding: 16,
    paddingTop: 48,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  backButton: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E07856',
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
    marginBottom: 32,
    opacity: 0.7,
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
    borderBottomColor: '#E07856',
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
    backgroundColor: '#E07856',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    marginTop: 2,
  },
  stepNumberText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
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
    backgroundColor: 'rgba(0,0,0,0.03)',
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
