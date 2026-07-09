import { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Pressable, TextInput, Alert, ActivityIndicator, Platform } from 'react-native';

// Alert.alert() is unreliable on web (silent in some Expo builds). Route
// through window.alert directly so validation errors always surface.
function notify(title: string, message: string) {
  console.log(`[${title}] ${message}`);
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
}
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { UnitPickerModal } from '@/components/unit-picker-modal';
import { IngredientPickerModal } from '@/components/ingredient-picker-modal';
import { Unit, fetchUnits } from '@/services/unit-service';
import { Ingredient } from '@/services/ingredient-service';
import { createRecipe, updateRecipe, fetchRecipeById } from '@/services/recipe-service';
import { useThemeColor } from '@/hooks/use-theme-color';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  backButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  saveButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#E07856',
    borderRadius: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  fieldGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.2)',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  errorField: {
    borderColor: '#ff3b30',
    borderWidth: 2,
  },
  optionalToggle: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.2)',
  },
  optionalToggleActive: {
    backgroundColor: '#E07856',
    borderColor: '#E07856',
  },
  optionalToggleText: {
    fontSize: 11,
    fontWeight: '600',
    opacity: 0.6,
  },
  optionalToggleTextActive: {
    color: '#fff',
    opacity: 1,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  quickInfoRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  quickInfoField: {
    flex: 1,
  },
  quickInput: {
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.2)',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  ingredientRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    alignItems: 'center',
  },
  ingredientInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    flex: 1,
    justifyContent: 'center',
  },
  ingredientNameInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    flex: 2,
    justifyContent: 'center',
  },
  removeButton: {
    padding: 8,
  },
  removeButtonText: {
    fontSize: 18,
    color: '#ff4444',
    fontWeight: 'bold',
  },
  addButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 8,
    marginTop: 8,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  stepContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E07856',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  stepInput: {
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.2)',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    flex: 1,
    textAlignVertical: 'top',
  },
  stepContent: {
    paddingBottom: 20,
  },
  photoButton: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  photoButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  orText: {
    fontSize: 14,
    opacity: 0.6,
    textAlign: 'center',
    marginVertical: 8,
  },
  timeline: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
    backgroundColor: 'rgba(0,0,0,0.02)',
  },
  timelineItem: {
    flex: 1,
    alignItems: 'center',
    position: 'relative',
  },
  timelineCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.2)',
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  timelineCircleActive: {
    borderColor: '#E07856',
    backgroundColor: '#E07856',
  },
  timelineCircleCompleted: {
    borderColor: '#E07856',
    backgroundColor: '#E07856',
  },
  timelineNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#999',
  },
  timelineNumberActive: {
    color: '#fff',
  },
  timelineLabel: {
    fontSize: 12,
    textAlign: 'center',
    opacity: 0.6,
  },
  timelineLabelActive: {
    fontWeight: '600',
    opacity: 1,
  },
  timelineLine: {
    position: 'absolute',
    top: 18,
    left: '50%',
    right: '-50%',
    height: 2,
    backgroundColor: 'rgba(0,0,0,0.2)',
    zIndex: -1,
  },
  timelineLineCompleted: {
    backgroundColor: '#E07856',
  },
  navigationContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
    backgroundColor: '#fff',
  },
  navButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.2)',
  },
  navButtonPrimary: {
    backgroundColor: '#E07856',
    borderColor: '#E07856',
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  navButtonTextPrimary: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  navButtonDisabled: {
    opacity: 0.6,
  },
  selectedText: {
    fontSize: 16,
  },
  placeholderText: {
    fontSize: 16,
    opacity: 0.5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingCard: {
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
    gap: 16,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
  },
  imagePreviewContainer: {
    marginTop: 16,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  imagePreview: {
    width: '100%',
    height: 200,
  },
});

interface RecipeIngredient {
  ingredientId: string;
  ingredientName: string;
  quantity: string;
  unitId: string;
  unitAbbreviation: string;
  text: string;  // Raw ingredient text
  optional: boolean;
}

interface RecipeFormData {
  title: string;
  description: string;
  prepTime: string;
  cookTime: string;
  servings: string;
  ingredients: RecipeIngredient[];
  steps: string[];
  imageUrl?: string;
}

export default function NewRecipeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const recipeId = params.id as string | undefined;
  const isEditing = !!recipeId;
  
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(isEditing);
  const [loadingImport, setLoadingImport] = useState(false);
  const [formData, setFormData] = useState<RecipeFormData>({
    title: '',
    description: '',
    prepTime: '',
    cookTime: '',
    servings: '',
    ingredients: [{ ingredientId: '', ingredientName: '', quantity: '', unitId: '', unitAbbreviation: '', text: '', optional: false }],
    steps: [''],
    imageUrl: '',
  });
  
  // Load recipe data if editing
  useEffect(() => {
    if (isEditing && recipeId) {
      loadRecipe(recipeId);
    }
  }, [recipeId, isEditing]);
  
  const loadRecipe = async (id: string) => {
    try {
      setLoading(true);
      const recipe = await fetchRecipeById(id);
      
      if (!recipe) {
        notify('Error', 'Recipe not found');
        router.back();
        return;
      }

      const allUnits = await fetchUnits();

      const transformedIngredients = recipe.ingredients?.map((ing: any) => {
        let matchedUnit: Unit | undefined;
        if (ing.unit_id) {
          matchedUnit = allUnits.find(u => u.id === ing.unit_id);
        } else if (ing.unit) {
          const unitName = ing.unit.name || '';
          matchedUnit = allUnits.find(u => 
            u.name?.toLowerCase() === unitName.toLowerCase() ||
            u.abbreviation?.toLowerCase() === unitName.toLowerCase()
          );
        }

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
          optional: !!ing.optional,
        };
      }) || [{ ingredientId: '', ingredientName: '', quantity: '', unitId: '', unitAbbreviation: '', text: '', optional: false }];

      setFormData({
        title: recipe.title || '',
        description: (recipe as any).notes || '',
        prepTime: (recipe as any).metadata?.prepTime?.toString() || (recipe as any).prep_time?.toString() || '',
        cookTime: (recipe as any).metadata?.cookTime?.toString() || (recipe as any).cook_time?.toString() || '',
        servings: (recipe as any).metadata?.servings?.toString() || (recipe as any).servings?.toString() || '',
        ingredients: transformedIngredients,
        steps: recipe.steps || [''],
        imageUrl: (recipe as any).image_url || recipe.imageUrl || '',
      });
    } catch (error) {
      console.error('Failed to load recipe:', error);
      notify('Error', 'Failed to load recipe');
      router.back();
    } finally {
      setLoading(false);
    }
  };
  
  // Load imported data if available
  useEffect(() => {
    // Check for data in global state (new method - no URL length limits)
    const pendingImport = (global as any).__pendingRecipeImport;
    
    // Also support legacy URL param method for backwards compatibility
    const importedDataParam = params.importedData;
    
    if (pendingImport || (importedDataParam && typeof importedDataParam === 'string')) {
      const loadImportedData = async () => {
        setLoadingImport(true);
        try {
          // Use pending import if available, otherwise parse from URL param
          const imported = pendingImport || JSON.parse(
            typeof importedDataParam === 'string' ? importedDataParam : importedDataParam[0]
          );
          
          // Clear the global state after reading
          if (pendingImport) {
            delete (global as any).__pendingRecipeImport;
          }
          
          // Fetch all units to match against
          const allUnits = await fetchUnits();
          
          // Transform imported ingredients to match form structure
          const transformedIngredients = imported.ingredients?.map((ing: any) => {
            // Try to find a matching unit by name or abbreviation with fuzzy matching
            let matchedUnit: Unit | undefined;
            if (ing.unit) {
              const unitLower = ing.unit.toLowerCase().trim();
              
              // First try exact match
              matchedUnit = allUnits.find(u => 
                u.name?.toLowerCase() === unitLower || 
                u.abbreviation?.toLowerCase() === unitLower
              );
              
              // If no exact match, try fuzzy matching
              if (!matchedUnit) {
                // Remove trailing 's' for plural matching
                const unitSingular = unitLower.endsWith('s') ? unitLower.slice(0, -1) : unitLower;
                
                matchedUnit = allUnits.find(u => {
                  const nameLower = u.name?.toLowerCase() || '';
                  const abbrevLower = u.abbreviation?.toLowerCase() || '';
                  const nameSingular = nameLower.endsWith('s') ? nameLower.slice(0, -1) : nameLower;
                  
                  // Check if singular forms match
                  return nameSingular === unitSingular || 
                         abbrevLower === unitSingular ||
                         nameLower === unitSingular ||
                         // Check if the unit contains the search term or vice versa
                         nameLower.includes(unitLower) ||
                         unitLower.includes(nameLower);
                });
              }
            }
            
            // Extract ingredient name from the full text
            // The text is like "2 cups flour" - we need to extract just "flour"
            let ingredientName = ing.text || '';
            if (ing.quantity && ing.unit) {
              // Remove quantity and unit from the beginning
              const quantityStr = ing.quantity.toString();
              const unitStr = ing.unit;
              ingredientName = ing.text
                .replace(new RegExp(`^${quantityStr}\\s*${unitStr}\\s*`, 'i'), '')
                .replace(/^of\s+/i, '') // Remove "of" if present
                .trim();
            } else if (ing.quantity) {
              // Just remove quantity
              const quantityStr = ing.quantity.toString();
              ingredientName = ing.text
                .replace(new RegExp(`^${quantityStr}\\s*`, 'i'), '')
                .trim();
            }
            
            return {
              ingredientId: ing.id || '',
              ingredientName: ingredientName,
              quantity: ing.quantity || '',
              unitId: matchedUnit?.id || '',
              unitAbbreviation: matchedUnit?.abbreviation || ing.unit || '',
              text: ing.text || '',
              optional: !!ing.optional,
            };
          }) || [{ ingredientId: '', ingredientName: '', quantity: '', unitId: '', unitAbbreviation: '', text: '', optional: false }];
          
          setFormData({
            title: imported.title || '',
            description: imported.notes || '',
            prepTime: imported.prepTime || '',
            cookTime: imported.cookTime || '',
            servings: imported.servings || '',
            ingredients: transformedIngredients,
            steps: imported.steps || [''],
            imageUrl: imported.imageUrl || '',
          });
        } catch (error) {
          console.error('Failed to parse imported data:', error);
        } finally {
          setLoadingImport(false);
        }
      };
      
      loadImportedData();
    }
  }, [params.importedData]);
  const [unitModalVisible, setUnitModalVisible] = useState(false);
  const [ingredientModalVisible, setIngredientModalVisible] = useState(false);
  const [selectedIngredientIndex, setSelectedIngredientIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  
  const backgroundColor = useThemeColor({}, 'background');
  const borderColor = useThemeColor({ light: 'rgba(0,0,0,0.2)', dark: 'rgba(255,255,255,0.2)' }, 'text');

  const stepTitles = ['Basic Info', 'Ingredients', 'Instructions', 'Details'];

  // --- Inline validation state -----------------------------------------
  // Field IDs used: 'title', 'ingredient-{i}-quantity',
  // 'ingredient-{i}-name', 'step-{i}'.
  const [errors, setErrors] = useState<Set<string>>(new Set());

  const clearError = (id: string) => {
    setErrors(prev => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const errorsForStep = (step: number, data = formData): string[] => {
    const out: string[] = [];
    if (step === 0) {
      if (!data.title.trim()) out.push('title');
    }
    if (step === 1) {
      // A row counts as "started" if either field has content. A started
      // row must have BOTH quantity and name; if not, the missing fields
      // are errors. Additionally, at least one row must be complete —
      // if none is, mark row 0's empty fields.
      let anyComplete = false;
      data.ingredients.forEach((ing, i) => {
        const hasQty = ing.quantity.trim();
        const hasName = !!ing.ingredientName;
        if (hasQty && hasName) anyComplete = true;
        if ((hasQty || hasName) && !(hasQty && hasName)) {
          if (!hasQty) out.push(`ingredient-${i}-quantity`);
          if (!hasName) out.push(`ingredient-${i}-name`);
        }
      });
      if (!anyComplete) {
        // Force at least the first row's fields to be flagged.
        if (!data.ingredients[0]?.quantity.trim()) out.push('ingredient-0-quantity');
        if (!data.ingredients[0]?.ingredientName) out.push('ingredient-0-name');
      }
    }
    if (step === 2) {
      const anyFilled = data.steps.some(s => s.trim());
      if (!anyFilled) out.push('step-0');
    }
    return out;
  };

  // Helper function to build ingredient text from components
  const buildIngredientText = (quantity: string, unit: string, name: string): string => {
    const parts = [];
    if (quantity) parts.push(quantity);
    if (unit) parts.push(unit);
    if (name) parts.push(name);
    return parts.join(' ');
  };

  const updateFormData = (field: keyof RecipeFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (field === 'title') clearError('title');
  };

  const addIngredient = () => {
    setFormData(prev => ({
      ...prev,
      ingredients: [...prev.ingredients, { ingredientId: '', ingredientName: '', quantity: '', unitId: '', unitAbbreviation: '', text: '', optional: false }]
    }));
  };

  const updateIngredient = (index: number, field: keyof RecipeIngredient, value: string) => {
    setFormData(prev => ({
      ...prev,
      ingredients: prev.ingredients.map((ing, i) => {
        if (i === index) {
          const updated = { ...ing, [field]: value };
          // Update text whenever quantity, unit, or name changes
          if (field === 'quantity' || field === 'unitAbbreviation' || field === 'ingredientName') {
            updated.text = buildIngredientText(updated.quantity, updated.unitAbbreviation, updated.ingredientName);
          }
          return updated;
        }
        return ing;
      })
    }));
    if (field === 'quantity' && value.trim()) clearError(`ingredient-${index}-quantity`);
    if (field === 'ingredientName' && value) clearError(`ingredient-${index}-name`);
  };

  const handleUnitSelect = (unit: Unit) => {
    if (selectedIngredientIndex !== null) {
      setFormData(prev => ({
        ...prev,
        ingredients: prev.ingredients.map((ing, i) =>
          i === selectedIngredientIndex
            ? { ...ing, unitId: unit.id, unitAbbreviation: unit.abbreviation, text: buildIngredientText(ing.quantity, unit.abbreviation, ing.ingredientName) }
            : ing
        )
      }));
    }
  };

  const handleIngredientSelect = (ingredient: Ingredient) => {
    if (selectedIngredientIndex !== null) {
      setFormData(prev => ({
        ...prev,
        ingredients: prev.ingredients.map((ing, i) =>
          i === selectedIngredientIndex
            ? { ...ing, ingredientId: ingredient.id, ingredientName: ingredient.name, text: buildIngredientText(ing.quantity, ing.unitAbbreviation, ingredient.name) }
            : ing
        )
      }));
      if (ingredient.name) clearError(`ingredient-${selectedIngredientIndex}-name`);
    }
  };

  const openUnitPicker = (index: number) => {
    setSelectedIngredientIndex(index);
    setUnitModalVisible(true);
  };

  const openIngredientPicker = (index: number) => {
    setSelectedIngredientIndex(index);
    setIngredientModalVisible(true);
  };

  const removeIngredient = (index: number) => {
    setFormData(prev => ({
      ...prev,
      ingredients: prev.ingredients.filter((_, i) => i !== index)
    }));
  };

  const addStep = () => {
    setFormData(prev => ({
      ...prev,
      steps: [...prev.steps, '']
    }));
  };

  const updateStep = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      steps: prev.steps.map((step, i) => i === index ? value : step)
    }));
    if (value.trim()) clearError(`step-${index}`);
  };

  const removeStep = (index: number) => {
    setFormData(prev => ({
      ...prev,
      steps: prev.steps.filter((_, i) => i !== index)
    }));
  };

  const handleNext = () => {
    const errs = errorsForStep(currentStep);
    if (errs.length) {
      setErrors(new Set(errs));
      return;
    }
    setErrors(new Set());
    if (currentStep < stepTitles.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const validateRecipe = (): string | null => {
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
    // Run per-step validation; jump to the first bad step so the user sees
    // exactly which fields are red instead of an alert box.
    for (let s = 0; s <= 2; s++) {
      const errs = errorsForStep(s);
      if (errs.length) {
        setCurrentStep(s);
        setErrors(new Set(errs));
        return;
      }
    }
    setErrors(new Set());

    setSaving(true);
    try {
      // Transform ingredients to match the database schema
      const ingredients = formData.ingredients
        .filter((ing) => ing.ingredientName && ing.quantity.trim())
        .map((ing) => ({
          text: ing.text || buildIngredientText(ing.quantity, ing.unitAbbreviation, ing.ingredientName),
          id: ing.ingredientId && ing.ingredientId.trim() !== '' ? ing.ingredientId : undefined,
          quantity: ing.quantity,
          unit: ing.unitId || undefined,
          unitAbbreviation: ing.unitAbbreviation,
          ingredientName: ing.ingredientName,
          optional: ing.optional,
        }));

      // Filter out empty steps
      const steps = formData.steps.filter((step) => step.trim());

      // Prepare metadata with additional info
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

      const recipeData = {
        title: formData.title,
        ingredients,
        steps,
        image_url: formData.imageUrl || undefined,
        notes: formData.description || undefined,
        metadata,
      };

      if (isEditing && recipeId) {
        // Update existing recipe
        await updateRecipe(recipeId, recipeData);
        router.push(`/recipe/${recipeId}` as any);
      } else {
        // Create new recipe
        await createRecipe(recipeData);
        router.push('/(drawer)/(tabs)' as any);
      }
    } catch (error) {
      console.error(`Failed to ${isEditing ? 'update' : 'create'} recipe:`, error);
      notify('Error', `Failed to ${isEditing ? 'update' : 'create'} recipe. Please try again.`);
    } finally {
      setSaving(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return renderBasicInfo();
      case 1:
        return renderIngredients();
      case 2:
        return renderInstructions();
      case 3:
        return renderDetails();
      default:
        return null;
    }
  };

  const renderBasicInfo = () => (
    <View style={styles.stepContent}>
      <View style={styles.fieldGroup}>
        <ThemedText style={styles.label}>Recipe Title *</ThemedText>
        <TextInput
          style={[styles.textInput, errors.has('title') && styles.errorField]}
          value={formData.title}
          onChangeText={(value) => updateFormData('title', value)}
          placeholder="Enter recipe name..."
          placeholderTextColor="#999"
        />
      </View>

      <View style={styles.fieldGroup}>
        <ThemedText style={styles.label}>Recipe Photo</ThemedText>

        {/* Photo Upload Button */}
        <Pressable style={styles.photoButton}>
          <ThemedText style={styles.photoButtonText}>📷 Upload Photo</ThemedText>
        </Pressable>

        <ThemedText style={styles.orText}>or</ThemedText>

        {/* Photo URL Input */}
        <TextInput
          style={styles.textInput}
          value={formData.imageUrl}
          onChangeText={(value) => updateFormData('imageUrl', value)}
          placeholder="Enter photo URL..."
          placeholderTextColor="#999"
        />
        
        {/* Image Preview */}
        {formData.imageUrl && (
          <View style={styles.imagePreviewContainer}>
            <Image
              source={{ uri: formData.imageUrl }}
              style={styles.imagePreview}
              contentFit="cover"
            />
          </View>
        )}
      </View>
    </View>
  );

  const renderIngredients = () => (
    <View style={styles.stepContent}>
      <ThemedText style={styles.sectionTitle}>Ingredients</ThemedText>
      {formData.ingredients.map((ingredient, index) => (
        <View key={index} style={styles.ingredientRow}>
          <TextInput
            style={[
              styles.ingredientInput,
              errors.has(`ingredient-${index}-quantity`) && styles.errorField,
            ]}
            value={ingredient.quantity}
            onChangeText={(value) => updateIngredient(index, 'quantity', value)}
            placeholder="2"
            placeholderTextColor="#999"
            keyboardType="decimal-pad"
          />
          <Pressable
            style={[styles.ingredientInput, { backgroundColor, borderColor }]}
            onPress={() => openUnitPicker(index)}
          >
            <ThemedText style={ingredient.unitAbbreviation ? styles.selectedText : styles.placeholderText}>
              {ingredient.unitAbbreviation || 'unit'}
            </ThemedText>
          </Pressable>
          <Pressable
            style={[
              styles.ingredientNameInput,
              { backgroundColor, borderColor },
              errors.has(`ingredient-${index}-name`) && styles.errorField,
            ]}
            onPress={() => openIngredientPicker(index)}
          >
            <ThemedText style={ingredient.ingredientName ? styles.selectedText : styles.placeholderText}>
              {ingredient.ingredientName || 'ingredient'}
            </ThemedText>
          </Pressable>
          <Pressable
            onPress={() => setFormData(prev => ({
              ...prev,
              ingredients: prev.ingredients.map((ing, i) => i === index ? { ...ing, optional: !ing.optional } : ing),
            }))}
            style={[styles.optionalToggle, ingredient.optional && styles.optionalToggleActive]}
          >
            <ThemedText
              style={[styles.optionalToggleText, ingredient.optional && styles.optionalToggleTextActive]}
            >
              opt
            </ThemedText>
          </Pressable>
          <Pressable
            style={styles.removeButton}
            onPress={() => removeIngredient(index)}
          >
            {formData.ingredients.length > 1 ? <ThemedText style={styles.removeButtonText}>✕</ThemedText> : null}
          </Pressable>
        </View>
      ))}
      <Pressable style={styles.addButton} onPress={addIngredient}>
        <ThemedText style={styles.addButtonText}>+ Add Ingredient</ThemedText>
      </Pressable>
    </View>
  );

  const renderInstructions = () => (
    <View style={styles.stepContent}>
      <ThemedText style={styles.sectionTitle}>Instructions</ThemedText>
      {formData.steps.map((step, index) => (
        <View key={index} style={styles.stepContainer}>
          <ThemedText style={styles.stepNumber}>{index + 1}</ThemedText>
          <TextInput
            style={[styles.stepInput, errors.has(`step-${index}`) && styles.errorField]}
            value={step}
            onChangeText={(value) => updateStep(index, value)}
            placeholder={`Step ${index + 1}...`}
            placeholderTextColor="#999"
            multiline
          />
          <Pressable
            style={styles.removeButton}
            onPress={() => removeStep(index)}
          >
            {formData.steps.length > 1 ? <ThemedText style={styles.removeButtonText}>✕</ThemedText>: null}
          </Pressable>
        </View>
      ))}
      <Pressable style={styles.addButton} onPress={addStep}>
        <ThemedText style={styles.addButtonText}>+ Add Step</ThemedText>
      </Pressable>
    </View>
  );

  const renderDetails = () => (
    <View style={styles.stepContent}>
      <View style={styles.fieldGroup}>
        <ThemedText style={styles.label}>Description</ThemedText>
        <TextInput
          style={[styles.textInput, styles.textArea]}
          value={formData.description}
          onChangeText={(value) => updateFormData('description', value)}
          placeholder="Brief description..."
          placeholderTextColor="#999"
          multiline
          numberOfLines={3}
        />
      </View>

      <View style={styles.quickInfoRow}>
        <View style={styles.quickInfoField}>
          <ThemedText style={styles.label}>Prep Time</ThemedText>
          <TextInput
            style={styles.quickInput}
            value={formData.prepTime}
            onChangeText={(value) => updateFormData('prepTime', value)}
            placeholder="30 min"
            placeholderTextColor="#999"
          />
        </View>
        <View style={styles.quickInfoField}>
          <ThemedText style={styles.label}>Cook Time</ThemedText>
          <TextInput
            style={styles.quickInput}
            value={formData.cookTime}
            onChangeText={(value) => updateFormData('cookTime', value)}
            placeholder="45 min"
            placeholderTextColor="#999"
          />
        </View>
        <View style={styles.quickInfoField}>
          <ThemedText style={styles.label}>Servings</ThemedText>
          <TextInput
            style={styles.quickInput}
            value={formData.servings}
            onChangeText={(value) => updateFormData('servings', value)}
            placeholder="4"
            placeholderTextColor="#999"
            keyboardType="numeric"
          />
        </View>
      </View>
    </View>
  );

  // Show loading screen while loading recipe data for editing or importing
  if (loading || loadingImport) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
          <ThemedText style={styles.loadingText}>
            {loading ? 'Loading recipe...' : 'Processing imported recipe...'}
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      {/* Loading Overlay */}
      {saving && (
        <View style={styles.loadingOverlay}>
          <ThemedView style={styles.loadingCard}>
            <ActivityIndicator size="large" color="#E07856" />
            <ThemedText style={styles.loadingText}>Saving recipe...</ThemedText>
          </ThemedView>
        </View>
      )}

      {/* Modals */}
      <UnitPickerModal
        visible={unitModalVisible}
        onClose={() => setUnitModalVisible(false)}
        onSelectUnit={handleUnitSelect}
        selectedUnitId={selectedIngredientIndex !== null ? formData.ingredients[selectedIngredientIndex]?.unitId : undefined}
      />
      <IngredientPickerModal
        visible={ingredientModalVisible}
        onClose={() => setIngredientModalVisible(false)}
        onSelectIngredient={handleIngredientSelect}
        selectedIngredientId={selectedIngredientIndex !== null ? formData.ingredients[selectedIngredientIndex]?.ingredientId : undefined}
      />

      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <ThemedText style={styles.backButtonText}>✕</ThemedText>
        </Pressable>
        <ThemedText style={styles.headerTitle}>New Recipe</ThemedText>
        <View style={styles.backButton} />
      </View>

      {/* Progress Timeline */}
      <View style={styles.timeline}>
        {stepTitles.map((title, index) => (
          <Pressable
            key={index}
            style={styles.timelineItem}
            onPress={() => setCurrentStep(index)}
          >
            <View style={[
              styles.timelineCircle,
              index === currentStep && styles.timelineCircleActive,
              index < currentStep && styles.timelineCircleCompleted
            ]}>
              <ThemedText style={[
                styles.timelineNumber,
                (index === currentStep || index < currentStep) && styles.timelineNumberActive
              ]}>
                {index + 1}
              </ThemedText>
            </View>
            <ThemedText style={[
              styles.timelineLabel,
              index === currentStep && styles.timelineLabelActive
            ]}>
              {title}
            </ThemedText>
            {index < stepTitles.length - 1 && (
              <View style={[
                styles.timelineLine,
                index < currentStep && styles.timelineLineCompleted
              ]} />
            )}
          </Pressable>
        ))}
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>{renderStepContent()}</View>
      </ScrollView>

      {/* Navigation Buttons */}
      <View style={styles.navigationContainer}>
        {currentStep > 0 && (
          <Pressable style={styles.navButton} onPress={handlePrevious}>
            <ThemedText style={styles.navButtonText}>← Previous</ThemedText>
          </Pressable>
        )}
        <View style={{ flex: 1 }} />
        {currentStep < stepTitles.length - 1 ? (
          <Pressable style={[styles.navButton, styles.navButtonPrimary]} onPress={handleNext}>
            <ThemedText style={styles.navButtonTextPrimary}>Next →</ThemedText>
          </Pressable>
        ) : (
          <Pressable 
            style={[styles.navButton, styles.navButtonPrimary, saving && styles.navButtonDisabled]} 
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <ThemedText style={styles.navButtonTextPrimary}>Save Recipe</ThemedText>
            )}
          </Pressable>
        )}
      </View>
    </ThemedView>
  );
}
