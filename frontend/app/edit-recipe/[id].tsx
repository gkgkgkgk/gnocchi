import { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Pressable, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { UnitPickerModal } from '@/components/unit-picker-modal';
import { IngredientPickerModal } from '@/components/ingredient-picker-modal';
import { Unit, fetchUnits } from '@/services/unit-service';
import { Ingredient } from '@/services/ingredient-service';
import { updateRecipe, fetchRecipeById } from '@/services/recipe-service';
import { useTheme } from '@/hooks/use-theme';
import { type Theme } from '@/constants/theme';

export default function EditRecipeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const recipeId = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    prepTime: '',
    cookTime: '',
    servings: '',
    ingredients: [{ ingredientId: '', ingredientName: '', quantity: '', unitId: '', unitAbbreviation: '', text: '' }],
    steps: [''],
    imageUrl: '',
  });

  const [unitModalVisible, setUnitModalVisible] = useState(false);
  const [ingredientModalVisible, setIngredientModalVisible] = useState(false);
  const [selectedIngredientIndex, setSelectedIngredientIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  
  const theme = useTheme();
  const styles = makeStyles(theme);
  const c = theme.colors;
  const backgroundColor = c.bgElevated;
  const borderColor = c.border;
  const textColor = c.fg;

  // Load recipe data
  useEffect(() => {
    loadRecipe();
  }, [recipeId]);

  const loadRecipe = async () => {
    try {
      setLoading(true);
      const recipe = await fetchRecipeById(recipeId);
      
      if (!recipe) {
        Alert.alert('Error', 'Recipe not found');
        router.back();
        return;
      }

      // Fetch units for matching
      const allUnits = await fetchUnits();

      // Transform recipe data to form format
      const transformedIngredients = recipe.ingredients?.map((ing: any) => {
        // Try to find matching unit
        let matchedUnit: Unit | undefined;
        if (ing.unit_id) {
          matchedUnit = allUnits.find(u => u.id === ing.unit_id);
        } else if (ing.unit) {
          // Try fuzzy matching if we have unit object
          const unitName = ing.unit.name || '';
          matchedUnit = allUnits.find(u => 
            u.name?.toLowerCase() === unitName.toLowerCase() ||
            u.abbreviation?.toLowerCase() === unitName.toLowerCase()
          );
        }

        // Extract ingredient name from text
        let ingredientName = ing.text || '';
        if (ing.quantity && ing.unit) {
          const quantityStr = ing.quantity.toString();
          const unitStr = ing.unit.name || ing.unit.abbreviation || '';
          ingredientName = ing.text
            .replace(new RegExp(`^${quantityStr}\\s*${unitStr}\\s*`, 'i'), '')
            .replace(/^of\s+/i, '')
            .trim();
        }

        return {
          ingredientId: ing.id || ing.ingredient_id || '',
          ingredientName: ingredientName || ing.ingredient?.name || '',
          quantity: ing.quantity?.toString() || '',
          unitId: matchedUnit?.id || ing.unit_id || '',
          unitAbbreviation: matchedUnit?.abbreviation || ing.unit?.abbreviation || '',
          text: ing.text || '',
        };
      }) || [{ ingredientId: '', ingredientName: '', quantity: '', unitId: '', unitAbbreviation: '', text: '' }];

      setFormData({
        title: recipe.title || '',
        description: recipe.notes || '',
        prepTime: recipe.metadata?.prepTime?.toString() || recipe.prep_time?.toString() || '',
        cookTime: recipe.metadata?.cookTime?.toString() || recipe.cook_time?.toString() || '',
        servings: recipe.metadata?.servings?.toString() || recipe.servings?.toString() || '',
        ingredients: transformedIngredients,
        steps: recipe.steps || [''],
        imageUrl: recipe.image_url || recipe.imageUrl || '',
      });
    } catch (error) {
      console.error('Failed to load recipe:', error);
      Alert.alert('Error', 'Failed to load recipe');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const buildIngredientText = (quantity: string, unit: string, ingredient: string) => {
    const parts = [];
    if (quantity) parts.push(quantity);
    if (unit) parts.push(unit);
    if (ingredient) parts.push(ingredient);
    return parts.join(' ');
  };

  const validateRecipe = () => {
    if (!formData.title.trim()) {
      return 'Please enter a recipe title';
    }

    const validIngredients = formData.ingredients.filter(
      (ing) => ing.ingredientName && ing.quantity.trim()
    );
    if (validIngredients.length === 0) {
      return 'Please add at least one ingredient';
    }

    const validSteps = formData.steps.filter((step) => step.trim());
    if (validSteps.length === 0) {
      return 'Please add at least one instruction step';
    }

    return null;
  };

  const handleSave = async () => {
    const validationError = validateRecipe();
    if (validationError) {
      Alert.alert('Validation Error', validationError);
      return;
    }

    setSaving(true);
    try {
      const ingredients = formData.ingredients
        .filter((ing) => ing.ingredientName && ing.quantity.trim())
        .map((ing) => ({
          text: ing.text || buildIngredientText(ing.quantity, ing.unitAbbreviation, ing.ingredientName),
          id: ing.ingredientId && ing.ingredientId.trim() !== '' ? ing.ingredientId : undefined,
          quantity: ing.quantity,
          unit: ing.unitId || undefined,
        }));

      const steps = formData.steps.filter((step) => step.trim());

      const metadata: Record<string, any> = {};
      if (formData.prepTime) {
        metadata.prepTime = formData.prepTime;
      }
      if (formData.cookTime) {
        metadata.cookTime = formData.cookTime;
      }
      if (formData.servings) {
        metadata.servings = formData.servings;
      }

      await updateRecipe(recipeId, {
        title: formData.title,
        ingredients,
        steps,
        image_url: formData.imageUrl || undefined,
        notes: formData.description || undefined,
        metadata,
      });

      Alert.alert('Success', 'Recipe updated successfully!', [
        { text: 'OK', onPress: () => router.push(`/recipe/${recipeId}` as any) }
      ]);
    } catch (error) {
      console.error('Failed to update recipe:', error);
      Alert.alert('Error', 'Failed to update recipe. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleUnitSelect = (unit: Unit) => {
    if (selectedIngredientIndex !== null) {
      const newIngredients = [...formData.ingredients];
      newIngredients[selectedIngredientIndex].unitId = unit.id;
      newIngredients[selectedIngredientIndex].unitAbbreviation = unit.abbreviation;
      setFormData({ ...formData, ingredients: newIngredients });
    }
    setUnitModalVisible(false);
  };

  const handleIngredientSelect = (ingredient: Ingredient) => {
    if (selectedIngredientIndex !== null) {
      const newIngredients = [...formData.ingredients];
      newIngredients[selectedIngredientIndex].ingredientId = ingredient.id;
      newIngredients[selectedIngredientIndex].ingredientName = ingredient.name;
      setFormData({ ...formData, ingredients: newIngredients });
    }
    setIngredientModalVisible(false);
  };

  const addIngredient = () => {
    setFormData({
      ...formData,
      ingredients: [...formData.ingredients, { ingredientId: '', ingredientName: '', quantity: '', unitId: '', unitAbbreviation: '', text: '' }],
    });
  };

  const removeIngredient = (index: number) => {
    const newIngredients = formData.ingredients.filter((_, i) => i !== index);
    setFormData({ ...formData, ingredients: newIngredients });
  };

  const addStep = () => {
    setFormData({
      ...formData,
      steps: [...formData.steps, ''],
    });
  };

  const removeStep = (index: number) => {
    const newSteps = formData.steps.filter((_, i) => i !== index);
    setFormData({ ...formData, steps: newSteps });
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

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { borderBottomColor: borderColor }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ThemedText style={styles.backButtonText}>← Cancel</ThemedText>
        </Pressable>
        <ThemedText style={styles.headerTitle}>Edit Recipe</ThemedText>
        <Pressable onPress={handleSave} style={styles.saveButton} disabled={saving}>
          {saving ? (
            <ActivityIndicator color={c.accentFg} />
          ) : (
            <ThemedText style={styles.saveButtonText}>Save</ThemedText>
          )}
        </Pressable>
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Basic Information</ThemedText>
          
          <ThemedText style={styles.label}>Recipe Title *</ThemedText>
          <TextInput
            style={[styles.input, { backgroundColor, borderColor, color: textColor }]}
            value={formData.title}
            onChangeText={(text) => setFormData({ ...formData, title: text })}
            placeholder="Enter recipe title"
            placeholderTextColor={c.fgSubtle}
          />

          <ThemedText style={styles.label}>Image URL</ThemedText>
          <TextInput
            style={[styles.input, { backgroundColor, borderColor, color: textColor }]}
            value={formData.imageUrl}
            onChangeText={(text) => setFormData({ ...formData, imageUrl: text })}
            placeholder="https://example.com/image.jpg"
            placeholderTextColor={c.fgSubtle}
          />

          <ThemedText style={styles.label}>Description</ThemedText>
          <TextInput
            style={[styles.textArea, { backgroundColor, borderColor, color: textColor }]}
            value={formData.description}
            onChangeText={(text) => setFormData({ ...formData, description: text })}
            placeholder="Add notes or description"
            placeholderTextColor={c.fgSubtle}
            multiline
            numberOfLines={4}
          />

          <View style={styles.row}>
            <View style={styles.rowItem}>
              <ThemedText style={styles.label}>Prep Time (min)</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor, borderColor, color: textColor }]}
                value={formData.prepTime}
                onChangeText={(text) => setFormData({ ...formData, prepTime: text })}
                placeholder="30"
                placeholderTextColor={c.fgSubtle}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.rowItem}>
              <ThemedText style={styles.label}>Cook Time (min)</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor, borderColor, color: textColor }]}
                value={formData.cookTime}
                onChangeText={(text) => setFormData({ ...formData, cookTime: text })}
                placeholder="45"
                placeholderTextColor={c.fgSubtle}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.rowItem}>
              <ThemedText style={styles.label}>Servings</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor, borderColor, color: textColor }]}
                value={formData.servings}
                onChangeText={(text) => setFormData({ ...formData, servings: text })}
                placeholder="4"
                placeholderTextColor={c.fgSubtle}
                keyboardType="numeric"
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Ingredients *</ThemedText>
          {formData.ingredients.map((ingredient, index) => (
            <View key={index} style={styles.ingredientRow}>
              <TextInput
                style={[styles.ingredientInput, styles.quantityInput, { backgroundColor, borderColor, color: textColor }]}
                value={ingredient.quantity}
                onChangeText={(text) => {
                  const newIngredients = [...formData.ingredients];
                  newIngredients[index].quantity = text;
                  setFormData({ ...formData, ingredients: newIngredients });
                }}
                placeholder="Qty"
                placeholderTextColor={c.fgSubtle}
                keyboardType="numeric"
              />
              <Pressable
                style={[styles.ingredientInput, styles.unitInput, { backgroundColor, borderColor }]}
                onPress={() => {
                  setSelectedIngredientIndex(index);
                  setUnitModalVisible(true);
                }}
              >
                <ThemedText style={styles.unitText}>
                  {ingredient.unitAbbreviation || 'Unit'}
                </ThemedText>
              </Pressable>
              <Pressable
                style={[styles.ingredientInput, styles.nameInput, { backgroundColor, borderColor }]}
                onPress={() => {
                  setSelectedIngredientIndex(index);
                  setIngredientModalVisible(true);
                }}
              >
                <ThemedText style={styles.ingredientText} numberOfLines={1}>
                  {ingredient.ingredientName || 'Select ingredient'}
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={() => removeIngredient(index)}
                style={styles.removeButton}
              >
                <ThemedText style={styles.removeButtonText}>✕</ThemedText>
              </Pressable>
            </View>
          ))}
          <Pressable onPress={addIngredient} style={styles.addButton}>
            <ThemedText style={styles.addButtonText}>+ Add Ingredient</ThemedText>
          </Pressable>
        </View>

        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Instructions *</ThemedText>
          {formData.steps.map((step, index) => (
            <View key={index} style={styles.stepRow}>
              <ThemedText style={styles.stepNumber}>{index + 1}.</ThemedText>
              <TextInput
                style={[styles.stepInput, { backgroundColor, borderColor, color: textColor }]}
                value={step}
                onChangeText={(text) => {
                  const newSteps = [...formData.steps];
                  newSteps[index] = text;
                  setFormData({ ...formData, steps: newSteps });
                }}
                placeholder="Enter instruction step"
                placeholderTextColor={c.fgSubtle}
                multiline
              />
              <Pressable
                onPress={() => removeStep(index)}
                style={styles.removeButton}
              >
                <ThemedText style={styles.removeButtonText}>✕</ThemedText>
              </Pressable>
            </View>
          ))}
          <Pressable onPress={addStep} style={styles.addButton}>
            <ThemedText style={styles.addButtonText}>+ Add Step</ThemedText>
          </Pressable>
        </View>
      </ScrollView>

      <UnitPickerModal
        visible={unitModalVisible}
        onClose={() => setUnitModalVisible(false)}
        onSelect={handleUnitSelect}
      />

      <IngredientPickerModal
        visible={ingredientModalVisible}
        onClose={() => setIngredientModalVisible(false)}
        onSelect={handleIngredientSelect}
      />
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  backButtonText: {
    ...theme.type.bodyMedium,
    color: c.accent,
  },
  headerTitle: {
    ...theme.type.h3,
  },
  saveButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: c.accent,
    borderRadius: theme.radius.md,
    minWidth: 60,
    alignItems: 'center',
  },
  saveButtonText: {
    ...theme.type.button,
    color: c.accentFg,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  sectionTitle: {
    ...theme.type.h2,
    marginBottom: 16,
  },
  label: {
    ...theme.type.label,
    color: c.fgMuted,
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: theme.radius.md,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: theme.radius.md,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  rowItem: {
    flex: 1,
  },
  ingredientRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    alignItems: 'center',
  },
  ingredientInput: {
    borderWidth: 1,
    borderRadius: theme.radius.md,
    padding: 12,
    justifyContent: 'center',
  },
  quantityInput: {
    width: 60,
  },
  unitInput: {
    width: 80,
  },
  nameInput: {
    flex: 1,
  },
  unitText: {
    ...theme.type.small,
  },
  ingredientText: {
    ...theme.type.small,
  },
  removeButton: {
    padding: 8,
  },
  removeButtonText: {
    fontSize: 20,
    color: c.danger,
  },
  addButton: {
    padding: 12,
    borderWidth: 1,
    borderColor: c.accent,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    marginTop: 8,
  },
  addButtonText: {
    ...theme.type.button,
    color: c.accent,
  },
  stepRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  stepNumber: {
    ...theme.type.bodyMedium,
    paddingTop: 12,
  },
  stepInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: theme.radius.md,
    padding: 12,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    ...theme.type.body,
    color: c.fgMuted,
  },
  });
}
