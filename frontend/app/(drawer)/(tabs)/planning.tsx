import React, { useState, useEffect, useRef } from 'react';
import { View, ScrollView, Pressable, StyleSheet, TextInput, Modal, Platform, useWindowDimensions, Image, Animated, ActivityIndicator, Alert } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/use-theme';
import { type Theme } from '@/constants/theme';
import { useRouter } from 'expo-router';
import { fetchRecipes, Recipe, fetchRecipeById, unitToString } from '@/services/recipe-service';
import { saveMealPlan, fetchMealPlan, MealPlanStructure } from '@/services/meal-plan-service';
import { api } from '@/lib/api';

interface PlannedRecipe {
  id: string;
  recipeId: string;
  recipeName: string;
  servings?: number;
  cookTime?: number;
  completed: boolean;
  imageUrl?: string;
}

interface ShoppingListItem {
  name: string;
  sources: string[];
  checked: boolean;
}

interface DayPlan {
  date: Date;
  dayName: string;
  recipes: PlannedRecipe[];
}

// Initialize week with 7 days starting from today
const initializeEmptyWeek = (): DayPlan[] => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const days: DayPlan[] = [];
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    days.push({
      date,
      dayName: dayNames[date.getDay()],
      recipes: [],
    });
  }
  
  return days;
};

export default function PlanningScreen() {
  const theme = useTheme();
  const c = theme.colors;
  const styles = makeStyles(theme);
  const tintColor = c.accent;
  const router = useRouter();
  const { width } = useWindowDimensions();
  const menuBackgroundColor = c.bg;
  
  const [weekPlan, setWeekPlan] = useState<DayPlan[]>(initializeEmptyWeek());
  const [showAddRecipeModal, setShowAddRecipeModal] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [filteredRecipes, setFilteredRecipes] = useState<Recipe[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingRecipes, setLoadingRecipes] = useState(false);
  const [shortList, setShortList] = useState<PlannedRecipe[]>([]);
  const [shoppingList, setShoppingList] = useState<ShoppingListItem[]>([]);
  const [draggedShoppingItem, setDraggedShoppingItem] = useState<number | null>(null);
  const [generatingShoppingList, setGeneratingShoppingList] = useState(false);
  const [loadingShoppingList, setLoadingShoppingList] = useState(true);
  const [addingToShortList, setAddingToShortList] = useState(false);
  const [draggedRecipe, setDraggedRecipe] = useState<{ recipe: PlannedRecipe; fromDay: number | null } | null>(null);
  const [removingRecipeId, setRemovingRecipeId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showRecipeDetailModal, setShowRecipeDetailModal] = useState(false);
  const [selectedRecipeDetail, setSelectedRecipeDetail] = useState<Recipe | null>(null);
  const [loadingRecipeDetail, setLoadingRecipeDetail] = useState(false);
  // Calculate if cards should be centered (all fit on screen)
  const cardWidth = 180;
  const gap = 12;
  const padding = 32; // 16px on each side
  const totalCardsWidth = (weekPlan.length * cardWidth) + ((weekPlan.length - 1) * gap) + padding;
  const shouldCenter = totalCardsWidth < width;

  useEffect(() => {
    loadRecipes();
    loadUserAndMealPlan();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredRecipes(recipes);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredRecipes(
        recipes.filter(recipe => 
          recipe.title.toLowerCase().includes(query)
        )
      );
    }
  }, [searchQuery, recipes]);

  const formatDate = (date: Date) => {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}/${day}`;
  };

  // Animated Recipe Chip Component
  const AnimatedRecipeChip = ({ recipe, dayIndex, isDragging, isRemoving }: { 
    recipe: PlannedRecipe; 
    dayIndex: number; 
    isDragging: boolean;
    isRemoving: boolean;
  }) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const opacityAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
      if (isRemoving) {
        Animated.parallel([
          Animated.timing(scaleAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start();
      }
    }, [isRemoving]);

    return (
      <Animated.View
        style={{
          transform: [{ scale: scaleAnim }],
          opacity: opacityAnim,
        }}
      >
        <Pressable
          style={[
            styles.recipeChip,
            isDragging && styles.recipeChipDragging
          ]}
          onPress={() => openRecipeDetail(recipe.recipeId)}
          onLongPress={() => {
            console.log('Long press detected on recipe:', recipe.recipeName);
            startDrag(recipe, dayIndex);
          }}
          delayLongPress={500}
        >
          {/* Top section: Image and Title */}
          <View style={styles.recipeChipTop}>
            {/* Circular Recipe Image */}
            <View style={styles.recipeChipImageContainer}>
              {recipe.imageUrl ? (
                <Image 
                  source={{ uri: recipe.imageUrl }}
                  style={styles.recipeChipImage}
                />
              ) : (
                <View style={styles.recipeChipImage}>
                  <Ionicons name="restaurant" size={22} color={c.secondary} />
                </View>
              )}
            </View>
            
            {/* Recipe Title */}
            <ThemedText
              style={styles.recipeChipText}
              numberOfLines={2}
            >
              {recipe.recipeName}
            </ThemedText>
          </View>
          
          {/* Bottom section: Remove button (always at bottom) */}
          <Pressable
            style={styles.chipRemove}
            onPress={(e) => {
              e.stopPropagation();
              removeRecipe(dayIndex, recipe.id);
            }}
          >
            <ThemedText style={styles.chipRemoveText}>Remove</ThemedText>
          </Pressable>
        </Pressable>
      </Animated.View>
    );
  };


  const removeRecipe = async (dayIndex: number, recipeId: string) => {
    // Trigger animation
    setRemovingRecipeId(recipeId);
    
    // Wait for animation to complete
    setTimeout(async () => {
      const updatedWeekPlan = [...weekPlan];
      updatedWeekPlan[dayIndex].recipes = updatedWeekPlan[dayIndex].recipes.filter(r => r.id !== recipeId);
      setWeekPlan(updatedWeekPlan);
      await persistMealPlanWithData(updatedWeekPlan, shortList);
      setRemovingRecipeId(null);
    }, 300); // Match animation duration
  };

  const startDrag = (recipe: PlannedRecipe, fromDay: number | null) => {
    console.log('Starting drag:', recipe.recipeName, 'from day:', fromDay);
    setDraggedRecipe({ recipe, fromDay });
  };

  const cancelDrag = () => {
    console.log('Canceling drag');
    setDraggedRecipe(null);
  };

  const dropOnDay = (targetDay: number) => {
    console.log('Drop on day:', targetDay, 'dragged recipe:', draggedRecipe);
    if (!draggedRecipe) return;

    const { recipe, fromDay } = draggedRecipe;

    if (fromDay === null) {
      // From short list to day
      console.log('Moving from short list to day', targetDay);
      moveToDay(recipe, targetDay);
    } else if (fromDay !== targetDay) {
      // From one day to another
      console.log('Moving from day', fromDay, 'to day', targetDay);
      setWeekPlan(prev => {
        const updated = [...prev];
        // Remove from source day
        updated[fromDay].recipes = updated[fromDay].recipes.filter(r => r.id !== recipe.id);
        // Add to target day
        updated[targetDay].recipes.push(recipe);
        return updated;
      });
      persistMealPlan();
    }

    setDraggedRecipe(null);
  };

  const dropOnShortList = () => {
    if (!draggedRecipe) return;

    const { recipe, fromDay } = draggedRecipe;

    if (fromDay !== null) {
      // From day to short list
      moveToShortList(recipe, fromDay);
    }

    setDraggedRecipe(null);
  };

  const loadUserAndMealPlan = async () => {
    try {
      const mealPlan = await fetchMealPlan();
      await loadMealPlanData(mealPlan);
    } catch (error) {
      console.error('Failed to load meal plan:', error);
      setLoadingShoppingList(false);
    }
  };

  const loadMealPlanData = async (planData: MealPlanStructure) => {
    try {
      // Create a map of dates to recipe IDs from the plan
      const dateToRecipes = new Map<string, string[]>();
      for (const dayPlan of planData.plan) {
        dateToRecipes.set(dayPlan.date, dayPlan.recipes);
      }

      // Update the week plan with recipes from the database
      const updatedWeek = [...weekPlan];
      for (let dayIndex = 0; dayIndex < updatedWeek.length; dayIndex++) {
        const dayDate = updatedWeek[dayIndex].date;
        const dateString = dayDate.toISOString().split('T')[0]; // YYYY-MM-DD
        const recipeIds = dateToRecipes.get(dateString) || [];
        
        const dayRecipes: PlannedRecipe[] = [];
        for (const recipeId of recipeIds) {
          try {
            const recipe = await fetchRecipeById(recipeId);
            if (recipe) {
              dayRecipes.push({
                id: `${Date.now()}-${Math.random()}`,
                recipeId: recipe.id,
                recipeName: recipe.title,
                servings: recipe.servings ?? undefined,
                cookTime: recipe.cook_time || recipe.cookTime || undefined,
                completed: false,
                imageUrl: recipe.image_url || recipe.imageUrl || undefined,
              });
            }
          } catch (err) {
            console.error(`Failed to load recipe ${recipeId}:`, err);
          }
        }
        
        updatedWeek[dayIndex].recipes = dayRecipes;
      }
      setWeekPlan(updatedWeek);

      // Load short list
      const shortListRecipes: PlannedRecipe[] = [];
      for (const recipeId of planData.short_list) {
        try {
          const recipe = await fetchRecipeById(recipeId);
          if (recipe) {
            shortListRecipes.push({
              id: `${Date.now()}-${Math.random()}`,
              recipeId: recipe.id,
              recipeName: recipe.title,
              servings: recipe.servings ?? undefined,
              cookTime: recipe.cook_time || recipe.cookTime || undefined,
              completed: false,
              imageUrl: recipe.image_url || recipe.imageUrl || undefined,
            });
          }
        } catch (err) {
          console.error(`Failed to load recipe ${recipeId}:`, err);
        }
      }
      setShortList(shortListRecipes);

      // Load shopping list from the meal plan
      if (planData.shopping_list && Array.isArray(planData.shopping_list)) {
        setShoppingList(planData.shopping_list as ShoppingListItem[]);
      }
      setLoadingShoppingList(false);
    } catch (error) {
      console.error('Failed to load meal plan data:', error);
      setLoadingShoppingList(false);
    }
  };

  const loadRecipes = async () => {
    try {
      setLoadingRecipes(true);
      const data = await fetchRecipes();
      setRecipes(data);
      setFilteredRecipes(data);
    } catch (error) {
      console.error('Failed to load recipes:', error);
    } finally {
      setLoadingRecipes(false);
    }
  };

  const openAddRecipe = (dayIndex: number | null) => {
    setSelectedDay(dayIndex);
    setSearchQuery('');
    setAddingToShortList(dayIndex === null);
    setShowAddRecipeModal(true);
  };

  const addRecipeToDay = async (recipe: Recipe) => {
    const newRecipe: PlannedRecipe = {
      id: `${Date.now()}-${Math.random()}`,
      recipeId: recipe.id,
      recipeName: recipe.title,
      servings: recipe.servings ?? undefined,
      cookTime: recipe.cook_time || recipe.cookTime || undefined,
      completed: false,
      imageUrl: recipe.image_url || recipe.imageUrl || undefined,
    };

    let updatedWeekPlan = weekPlan;
    let updatedShortList = shortList;

    if (addingToShortList) {
      updatedShortList = [...shortList, newRecipe];
      setShortList(updatedShortList);
    } else if (selectedDay !== null) {
      updatedWeekPlan = [...weekPlan];
      updatedWeekPlan[selectedDay].recipes.push(newRecipe);
      setWeekPlan(updatedWeekPlan);
    }

    setShowAddRecipeModal(false);
    await persistMealPlanWithData(updatedWeekPlan, updatedShortList);
  };

  const removeFromShortList = async (recipeId: string) => {
    const updatedShortList = shortList.filter(r => r.id !== recipeId);
    setShortList(updatedShortList);
    await persistMealPlanWithData(weekPlan, updatedShortList);
  };

  const resetMealPlan = () => {
    const clearedWeekPlan = weekPlan.map(day => ({
        ...day,
        recipes: []
    }));
    setWeekPlan(clearedWeekPlan);
    setShortList([]);
    setShoppingList([]);
    persistMealPlanWithData(clearedWeekPlan, [], [])
  };

  const moveToDay = async (recipe: PlannedRecipe, dayIndex: number) => {
    // Remove from short list
    const updatedShortList = shortList.filter(r => r.id !== recipe.id);
    setShortList(updatedShortList);
    
    // Add to day
    const updatedWeekPlan = [...weekPlan];
    updatedWeekPlan[dayIndex].recipes.push(recipe);
    setWeekPlan(updatedWeekPlan);
    
    await persistMealPlanWithData(updatedWeekPlan, updatedShortList);
  };

  const moveToShortList = async (recipe: PlannedRecipe, fromDayIndex: number) => {
    // Remove from day
    const updatedWeekPlan = [...weekPlan];
    updatedWeekPlan[fromDayIndex].recipes = updatedWeekPlan[fromDayIndex].recipes.filter(r => r.id !== recipe.id);
    setWeekPlan(updatedWeekPlan);
    
    // Add to short list
    const updatedShortList = [...shortList, recipe];
    setShortList(updatedShortList);
    
    await persistMealPlanWithData(updatedWeekPlan, updatedShortList);
  };

  const persistMealPlanWithData = async (
    weekPlanData: DayPlan[], 
    shortListData: PlannedRecipe[],
    shoppingListData?: ShoppingListItem[]
  ) => {
    try {
      const planStructure: MealPlanStructure = {
        plan: weekPlanData.map(day => ({
          date: day.date.toISOString().split('T')[0],
          recipes: day.recipes.map(r => r.recipeId),
        })),
        short_list: shortListData.map(r => r.recipeId),
        shopping_list: shoppingListData || shoppingList,
      };
      await saveMealPlan(planStructure);
    } catch (error) {
      console.error('Failed to save meal plan:', error);
    }
  };

  const persistMealPlan = async () => {
    await persistMealPlanWithData(weekPlan, shortList, shoppingList);
  };

  const toggleShoppingListItem = (index: number) => {
    const newList = [...shoppingList];
    newList[index] = { ...newList[index], checked: !newList[index].checked };
    setShoppingList(newList);
    // Save to DB
    persistMealPlanWithData(weekPlan, shortList, newList);
  };

  const generateShoppingList = async () => {
    try {
      setGeneratingShoppingList(true);
      
      // Clear existing shopping list
      setShoppingList([]);
      
      // Collect all unique recipe IDs from week plan and short list
      const recipeIds = new Set<string>();
      
      weekPlan.forEach(day => {
        day.recipes.forEach(recipe => recipeIds.add(recipe.recipeId));
      });
      
      shortList.forEach(recipe => recipeIds.add(recipe.recipeId));
      
      if (recipeIds.size === 0) {
        Alert.alert('No recipes', 'Add some recipes to your meal plan first.');
        setGeneratingShoppingList(false);
        return;
      }
      
      // Fetch full recipe details for each ID
      const recipes: Recipe[] = [];
      for (const recipeId of recipeIds) {
        try {
          const recipe = await fetchRecipeById(recipeId);
          if (recipe) {
            recipes.push(recipe);
          }
        } catch (error) {
          console.error(`Failed to fetch recipe ${recipeId}:`, error);
        }
      }
      
      if (recipes.length === 0) {
        Alert.alert('Error', 'Could not load recipe details.');
        setGeneratingShoppingList(false);
        return;
      }
      
      const apiRecipes = recipes.map(recipe => ({
        title: recipe.title,
        ingredients: (recipe.ingredients ?? []).map(ing => ({
          text: ing.text,
          quantity: ing.quantity,
          // adaptForUI wraps unit as an object; the API expects a plain string.
          unit: unitToString(ing.unit),
        })),
        instructions: recipe.steps || [],
        notes: recipe.notes || '',
        metadata: {
          prep_time: recipe.prep_time ?? 0,
          cook_time: recipe.cook_time ?? 0,
          servings: recipe.servings ?? 0,
        },
      }));

      const data = await api.post<{ items: { name: string; sources: string[] }[] }>(
        '/ai/shopping-list',
        { recipes: apiRecipes },
      );
      const shoppingListWithState: ShoppingListItem[] = data.items.map(item => ({
        name: item.name,
        sources: item.sources ?? [],
        checked: false,
      }));
      setShoppingList(shoppingListWithState);
      
      // Save to database
      await persistMealPlanWithData(weekPlan, shortList, shoppingListWithState);
      
    } catch (error) {
      console.error('Failed to generate shopping list:', error);
      Alert.alert('Error', 'Failed to generate shopping list. Please try again.');
    } finally {
      setGeneratingShoppingList(false);
    }
  };

  const openRecipeDetail = async (recipeId: string) => {
    try {
      setLoadingRecipeDetail(true);
      setShowRecipeDetailModal(true);
      const recipe = await fetchRecipeById(recipeId);
      if (recipe) {
        setSelectedRecipeDetail(recipe);
      }
    } catch (error) {
      console.error('Failed to load recipe details:', error);
      Alert.alert('Error', 'Failed to load recipe details.');
      setShowRecipeDetailModal(false);
    } finally {
      setLoadingRecipeDetail(false);
    }
  };

  const closeRecipeDetail = () => {
    setShowRecipeDetailModal(false);
    setSelectedRecipeDetail(null);
  };

  const navigateToRecipe = () => {
    if (selectedRecipeDetail) {
      closeRecipeDetail();
      router.push(`/recipe/${selectedRecipeDetail.id}`);
    }
  };


  return (
    <ThemedView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <ThemedText style={styles.title}>Meal Planning</ThemedText>
              <ThemedText style={styles.subtitle}>
                Week of {weekPlan[0] && formatDate(weekPlan[0].date)} - {weekPlan[6] && formatDate(weekPlan[6].date)}
              </ThemedText>
            </View>
            <Pressable style={styles.resetButton} onPress={() => setShowDeleteConfirm(true)}>
              <Ionicons name="refresh-outline" size={20} color={c.danger} />
              <ThemedText style={styles.resetButtonText}>Reset</ThemedText>
            </Pressable>
          </View>
        </View>

        {/* Horizontal Scrollable Calendar */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={Platform.OS === 'web'}
          contentContainerStyle={[
            styles.calendarScroll,
            shouldCenter && { flexGrow: 1, justifyContent: 'center' }
          ]}
          style={[
            styles.calendarContainer,
            Platform.OS === 'web' && ({ scrollbarColor: `${c.accent} ${c.border}` } as any)
          ]}
        >
          {weekPlan.map((day, dayIndex) => {
            const isToday = dayIndex === 0;
            const hasRecipes = day.recipes.length > 0;
            
            // Calculate width based on number of recipes
            // Mobile: max 2 columns, Desktop: max 3 columns
            // Mobile: 1: *    2: * *    3+: * *
            //                               * *
            // Desktop: 1: *    2: * *    3: * * *    4+: * * *
            //                                            * * *
            const recipeCount = day.recipes.length;
            const maxColumns = Platform.OS === 'web' ? 3 : 2; // Mobile: 2 cols, Desktop: 3 cols
            const recipesInFirstRow = Math.min(recipeCount, maxColumns);
            const columns = recipesInFirstRow > 0 ? recipesInFirstRow : 1;
            
            const recipeWidth = 148;
            const gap = 10;
            const padding = 40; // 20px on each side
            const calculatedWidth = (columns * recipeWidth) + ((columns - 1) * gap) + padding;
            
            return (
              <View
                key={dayIndex}
                style={{
                  borderWidth: draggedRecipe ? 3 : 2,
                  borderColor: draggedRecipe 
                    ? c.accent 
                    : isToday ? c.accent : c.border,
                  borderRadius: 16,
                  backgroundColor: draggedRecipe ? c.secondaryMuted : undefined,
                  width: calculatedWidth,
                }}
              >
                <View
                  style={[
                    styles.dayCard,
                    hasRecipes && styles.dayCardWithRecipes,
                    isToday && styles.dayCardToday,
                  ]}
                >
                {/* Day Header */}
                <View style={styles.dayCardHeader}>
                  <ThemedText style={[styles.dayCardDay, isToday && styles.todayText]}>
                    {day.dayName.slice(0, 3).toUpperCase()}
                  </ThemedText>
                  <ThemedText style={[styles.dayCardDate, isToday && styles.todayText]}>
                    {day.date.getDate()}
                  </ThemedText>
                  {isToday && (
                    <View style={styles.todayDot} />
                  )}
                </View>

                {/* Scrollable Recipes Area */}
                <ScrollView 
                  style={styles.dayCardContent}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.recipesContainer}
                  nestedScrollEnabled={true}
                  scrollEnabled={true}
                >
                  {day.recipes.length === 0 ? (
                    <View style={styles.emptyDay}>
                      <ThemedText style={[styles.emptyDayText, isToday && styles.emptyDayTextToday]}>
                        No recipes yet
                      </ThemedText>
                    </View>
                  ) : (
                    <>
                      {day.recipes.map((recipe) => {
                        const isDragging = draggedRecipe?.recipe.id === recipe.id;
                        const isRemoving = removingRecipeId === recipe.id;
                        
                        return (
                          <AnimatedRecipeChip
                            key={recipe.id}
                            recipe={recipe}
                            dayIndex={dayIndex}
                            isDragging={isDragging}
                            isRemoving={isRemoving}
                          />
                        );
                      })}
                    </>
                  )}
                </ScrollView>
                
                {/* Fixed Add Button at Bottom */}
                <Pressable
                  style={styles.addRecipeButton}
                  onPress={() => {
                    if (draggedRecipe) {
                      dropOnDay(dayIndex);
                    } else {
                      openAddRecipe(dayIndex);
                    }
                  }}
                >
                  <Ionicons name="add-circle" size={20} color={isToday ? c.accent : c.fgMuted} />
                  <ThemedText style={[styles.addRecipeButtonText, isToday && styles.addRecipeButtonTextToday]}>
                    Add Recipe
                  </ThemedText>
                </Pressable>
              </View>
              </View>
            );
          })}
        </ScrollView>

        {/* Short List Section */}
        <View
          style={{
            borderWidth: draggedRecipe && draggedRecipe.fromDay !== null ? 3 : 2,
            borderColor: draggedRecipe && draggedRecipe.fromDay !== null ? c.accent : c.borderStrong,
            margin: 20,
            marginTop: 0,
            padding: 16,
            backgroundColor: draggedRecipe && draggedRecipe.fromDay !== null
              ? c.accentMuted
              : c.bgMuted,
            borderRadius: 12,
            minHeight: 180,
          }}
        >
          <Pressable 
            style={{ flex: 1 }}
            onPress={() => {
              if (draggedRecipe && draggedRecipe.fromDay !== null) {
                dropOnShortList();
              }
            }}
          >
          <View style={styles.shortListHeader}>
            <Ionicons name="list-outline" size={24} color={tintColor} />
            <ThemedText style={styles.shortListTitle}>Recipe Ideas</ThemedText>
            <Pressable
              style={styles.addToShortListButton}
              onPress={() => openAddRecipe(null)}
            >
              <Ionicons name="add-circle" size={24} color={tintColor} />
            </Pressable>
          </View>
          
          {shortList.length === 0 ? (
            <View style={styles.shortListEmpty}>
              <ThemedText style={styles.placeholderText}>
                Add recipes you're considering but haven't scheduled yet
              </ThemedText>
            </View>
          ) : (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.shortListScroll}
            >
              {shortList.map((recipe) => {
                const isDragging = draggedRecipe?.recipe.id === recipe.id;
                
                return (
                  <Pressable
                    key={recipe.id} 
                    style={[
                      styles.shortListCard,
                      isDragging && styles.shortListCardDragging
                    ]}
                    onPress={() => openRecipeDetail(recipe.recipeId)}
                    onLongPress={() => {
                      console.log('Long press detected on short list recipe:', recipe.recipeName);
                      startDrag(recipe, null);
                    }}
                    delayLongPress={500}
                  >
                  {/* Top section: Image and Title */}
                  <View style={styles.recipeChipTop}>
                    {/* Circular Recipe Image */}
                    <View style={styles.recipeChipImageContainer}>
                      {recipe.imageUrl ? (
                        <Image 
                          source={{ uri: recipe.imageUrl }}
                          style={styles.recipeChipImage}
                        />
                      ) : (
                        <View style={styles.recipeChipImage}>
                          <Ionicons name="restaurant" size={22} color={c.secondary} />
                        </View>
                      )}
                    </View>
                    
                    {/* Recipe Title */}
                    <ThemedText
                      style={styles.recipeChipText}
                      numberOfLines={2}
                    >
                      {recipe.recipeName}
                    </ThemedText>
                  </View>
                  
                  {/* Bottom section: Remove button */}
                  <Pressable
                    style={styles.chipRemove}
                    onPress={(e) => {
                      e.stopPropagation();
                      removeFromShortList(recipe.id);
                    }}
                  >
                    <ThemedText style={styles.chipRemoveText}>Remove</ThemedText>
                  </Pressable>
                </Pressable>
                );
              })}
            </ScrollView>
          )}
          </Pressable>
        </View>

        {/* Shopping List Section */}
        <View style={styles.shoppingListSection}>
          <View style={styles.shoppingListHeader}>
            <Ionicons name="cart-outline" size={24} color={tintColor} />
            <ThemedText style={styles.shoppingListTitle}>Shopping List</ThemedText>
            <Pressable
              style={styles.generateButton}
              onPress={generateShoppingList}
            >
              <Ionicons name="refresh-outline" size={20} color={c.accentFg} />
              <ThemedText style={styles.generateButtonText}>Generate</ThemedText>
            </Pressable>
          </View>
          <View style={styles.shoppingListContent}>
            {shoppingList.length === 0 && !generatingShoppingList && !loadingShoppingList ? (
              <ThemedText style={styles.placeholderText}>
                Add recipes to generate your shopping list
              </ThemedText>
            ) : (
              <View>
                {(generatingShoppingList || loadingShoppingList) && (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color={c.accent} />
                    <ThemedText style={styles.loadingText}>
                      {generatingShoppingList ? 'Generating shopping list...' : 'Loading shopping list...'}
                    </ThemedText>
                  </View>
                )}
                {shoppingList.map((item, index) => (
                  <Pressable
                    key={index}
                    style={[
                      styles.shoppingListItem,
                      draggedShoppingItem === index && styles.shoppingListItemDragging,
                    ]}
                    onLongPress={() => setDraggedShoppingItem(index)}
                    onPress={() => {
                      if (draggedShoppingItem !== null) {
                        // Drop the item
                        const newList = [...shoppingList];
                        const [removed] = newList.splice(draggedShoppingItem, 1);
                        newList.splice(index, 0, removed);
                        setShoppingList(newList);
                        persistMealPlanWithData(weekPlan, shortList, newList);
                        setDraggedShoppingItem(null);
                      } else {
                        // Toggle checkbox
                        toggleShoppingListItem(index);
                      }
                    }}
                    delayLongPress={500}
                  >
                    <View style={styles.shoppingListItemLeft}>
                      <Pressable
                        onPress={() => toggleShoppingListItem(index)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Ionicons
                          name={item.checked ? "checkmark-circle" : "checkmark-circle-outline"}
                          size={24}
                          color={item.checked ? c.accent : c.fgSubtle}
                        />
                      </Pressable>
                      <ThemedText
                        style={[
                          styles.shoppingListItemText,
                          item.checked && styles.shoppingListItemTextChecked,
                        ]}
                      >
                        {item.name}
                      </ThemedText>
                    </View>
                    {item.sources && item.sources.length > 0 && (
                      <View style={styles.shoppingListItemSources}>
                        <ThemedText style={styles.shoppingListItemSourcesText}>
                          {item.sources.join(', ')}
                        </ThemedText>
                      </View>
                    )}
                  </Pressable>
                ))}
                {draggedShoppingItem !== null && (
                  <Pressable
                    style={styles.cancelShoppingDragButton}
                    onPress={() => setDraggedShoppingItem(null)}
                  >
                    <Ionicons name="close-circle" size={32} color={c.bg} />
                    <ThemedText style={styles.cancelShoppingDragText}>Cancel</ThemedText>
                  </Pressable>
                )}
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Add Recipe Modal */}
      <Modal
        visible={showAddRecipeModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddRecipeModal(false)}
      >
        <ThemedView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <ThemedText style={styles.modalTitle}>
              {addingToShortList 
                ? 'Add to Recipe Ideas' 
                : `Add Recipe - ${selectedDay !== null ? weekPlan[selectedDay]?.dayName : ''}`
              }
            </ThemedText>
            <Pressable onPress={() => setShowAddRecipeModal(false)}>
              <Ionicons name="close" size={28} color={c.fg} />
            </Pressable>
          </View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color={c.fgSubtle} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search recipes..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery('')} style={styles.clearButton}>
                <Ionicons name="close-circle" size={20} color={c.fgSubtle} />
              </Pressable>
            )}
          </View>

          {/* Recipe List */}
          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {loadingRecipes ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={tintColor} />
                <ThemedText style={styles.loadingText}>Loading recipes...</ThemedText>
              </View>
            ) : filteredRecipes.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="restaurant-outline" size={64} color={c.fgSubtle} />
                <ThemedText style={styles.emptyText}>
                  {searchQuery ? 'No recipes found' : 'No recipes yet'}
                </ThemedText>
                <ThemedText style={styles.emptySubtext}>
                  {searchQuery ? 'Try a different search' : 'Create your first recipe to get started'}
                </ThemedText>
              </View>
            ) : (
              <View style={styles.recipeListContainer}>
                {filteredRecipes.map((recipe) => (
                  <Pressable
                    key={recipe.id}
                    style={styles.recipeListItem}
                    onPress={() => addRecipeToDay(recipe)}
                  >
                    {recipe.image_url || recipe.imageUrl ? (
                      <Image
                        source={{ uri: recipe.image_url || recipe.imageUrl || undefined }}
                        style={styles.recipeListImage}
                      />
                    ) : (
                      <View style={[styles.recipeListImage, styles.recipeListImagePlaceholder]}>
                        <Ionicons name="image-outline" size={32} color={c.fgSubtle} />
                      </View>
                    )}
                    <View style={styles.recipeListInfo}>
                      <ThemedText style={styles.recipeListTitle}>{recipe.title}</ThemedText>
                      <View style={styles.recipeListMeta}>
                        {recipe.servings && (
                          <View style={styles.recipeMetaItem}>
                            <Ionicons name="people-outline" size={14} color={c.fgMuted} />
                            <ThemedText style={styles.recipeMetaText}>{recipe.servings}</ThemedText>
                          </View>
                        )}
                        {(recipe.cook_time || recipe.cookTime) && (
                          <View style={styles.recipeMetaItem}>
                            <Ionicons name="time-outline" size={14} color={c.fgMuted} />
                            <ThemedText style={styles.recipeMetaText}>
                              {recipe.cook_time || recipe.cookTime} min
                            </ThemedText>
                          </View>
                        )}
                      </View>
                    </View>
                    <Ionicons name="add-circle" size={28} color={tintColor} />
                  </Pressable>
                ))}
              </View>
            )}
          </ScrollView>
        </ThemedView>
      </Modal>

      {/* Cancel Drag Overlay */}
      {draggedRecipe && (
        <View style={styles.dragOverlay}>
          <Pressable style={styles.cancelDragButton} onPress={cancelDrag}>
            <Ionicons name="close-circle" size={60} color={c.bg} />
            <ThemedText style={styles.cancelDragText}>Cancel</ThemedText>
          </Pressable>
        </View>
      )}

        {/* Delete Confirmation Modal */}
        <Modal
            visible={showDeleteConfirm}
            transparent
            animationType="fade"
            onRequestClose={() => setShowDeleteConfirm(false)}
        >
            <Pressable 
            style={styles.confirmOverlay}
            onPress={() => setShowDeleteConfirm(false)}
            >
            <Pressable 
                style={styles.confirmModal}
                onPress={(e) => e.stopPropagation()}
            >
                <ThemedView style={styles.confirmContent}>
                <ThemedText style={styles.confirmTitle}>Reset Meal Plan</ThemedText>
                <ThemedText style={styles.confirmMessage}>
                    Are you sure you want to reset your meal plan? This action cannot be undone.
                </ThemedText>
                <View style={styles.confirmButtons}>
                    <Pressable
                    style={[styles.confirmButton, styles.cancelButton]}
                    onPress={() => setShowDeleteConfirm(false)}
                    >
                    <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
                    </Pressable>
                    <Pressable
                    style={[styles.confirmButton, styles.deleteButton]}
                    onPress={() => {
                        setShowDeleteConfirm(false);
                        resetMealPlan();
                    }}
                    >
                    <ThemedText style={styles.deleteButtonText}>Reset</ThemedText>
                    </Pressable>
                </View>
                </ThemedView>
            </Pressable>
            </Pressable>
        </Modal>

        {/* Recipe Detail Modal */}
        <Modal
          visible={showRecipeDetailModal}
          transparent
          animationType="slide"
          onRequestClose={closeRecipeDetail}
        >
          <Pressable 
            style={styles.recipeDetailOverlay}
            onPress={closeRecipeDetail}
          >
            <Pressable 
              style={styles.recipeDetailModal}
              onPress={(e) => e.stopPropagation()}
            >
              <ThemedView style={styles.recipeDetailContent}>
                {loadingRecipeDetail ? (
                  <View style={styles.recipeDetailLoading}>
                    <ActivityIndicator size="large" color={c.accent} />
                    <ThemedText style={styles.loadingText}>Loading recipe...</ThemedText>
                  </View>
                ) : selectedRecipeDetail ? (
                  <>
                    {/* Close Button */}
                    <Pressable style={styles.recipeDetailClose} onPress={closeRecipeDetail}>
                      <Ionicons name="close" size={28} color={c.fgMuted} />
                    </Pressable>

                    <ScrollView 
                      showsVerticalScrollIndicator={false}
                      contentContainerStyle={styles.recipeDetailScrollContent}
                    >
                      {/* Recipe Image */}
                      {selectedRecipeDetail.image_url && (
                        <Image 
                          source={{ uri: selectedRecipeDetail.image_url }}
                          style={styles.recipeDetailImage}
                        />
                      )}

                      {/* Recipe Title */}
                      <ThemedText style={styles.recipeDetailTitle}>
                        {selectedRecipeDetail.title}
                      </ThemedText>

                      {/* Recipe Meta */}
                      <View style={styles.recipeDetailMeta}>
                        {selectedRecipeDetail.servings && (
                          <View style={styles.recipeDetailMetaItem}>
                            <Ionicons name="people" size={18} color={c.accent} />
                            <ThemedText style={styles.recipeDetailMetaText}>
                              {selectedRecipeDetail.servings} servings
                            </ThemedText>
                          </View>
                        )}
                        {(selectedRecipeDetail.cook_time || selectedRecipeDetail.cookTime) && (
                          <View style={styles.recipeDetailMetaItem}>
                            <Ionicons name="time" size={18} color={c.accent} />
                            <ThemedText style={styles.recipeDetailMetaText}>
                              {selectedRecipeDetail.cook_time || selectedRecipeDetail.cookTime} min
                            </ThemedText>
                          </View>
                        )}
                      </View>

                      {/* Ingredients */}
                      {selectedRecipeDetail.ingredients && selectedRecipeDetail.ingredients.length > 0 && (
                        <View style={styles.recipeDetailSection}>
                          <ThemedText style={styles.recipeDetailSectionTitle}>
                            Ingredients
                          </ThemedText>
                          {selectedRecipeDetail.ingredients.map((ingredient, index) => (
                            <View key={index} style={styles.recipeDetailIngredient}>
                              <View style={styles.recipeDetailBullet} />
                              <ThemedText style={styles.recipeDetailIngredientText}>
                                {ingredient.text}
                              </ThemedText>
                            </View>
                          ))}
                        </View>
                      )}

                      {/* Steps */}
                      {selectedRecipeDetail.steps && selectedRecipeDetail.steps.length > 0 && (
                        <View style={styles.recipeDetailSection}>
                          <ThemedText style={styles.recipeDetailSectionTitle}>
                            Instructions
                          </ThemedText>
                          {selectedRecipeDetail.steps.map((step, index) => (
                            <View key={index} style={styles.recipeDetailStep}>
                              <View style={styles.recipeDetailStepNumber}>
                                <ThemedText style={styles.recipeDetailStepNumberText}>
                                  {index + 1}
                                </ThemedText>
                              </View>
                              <ThemedText style={styles.recipeDetailStepText}>
                                {step}
                              </ThemedText>
                            </View>
                          ))}
                        </View>
                      )}
                    </ScrollView>

                    {/* Fixed Button with Gradient Overlay */}
                    <View style={styles.recipeDetailButtonContainer}>
                      <View style={styles.recipeDetailButtonGradient} />
                      <Pressable 
                        style={styles.recipeDetailButton}
                        onPress={navigateToRecipe}
                      >
                        <ThemedText style={styles.recipeDetailButtonText}>
                          View Full Recipe
                        </ThemedText>
                        <Ionicons name="arrow-forward" size={20} color={c.accentFg} />
                      </Pressable>
                    </View>
                  </>
                ) : null}
              </ThemedView>
            </Pressable>
          </Pressable>
        </Modal>
    </ThemedView>
  );
}

function makeStyles(theme: Theme) {
  const c = theme.colors;
  return StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingTop: 10,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    lineHeight: 32,
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.7,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: c.dangerMuted,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: c.danger,
  },
  resetButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: c.danger,
  },
  calendarContainer: {
    marginBottom: 20,
    paddingVertical: 12,
  },
  calendarScroll: {
    paddingHorizontal: 16,
    gap: 12,
  },
  dayCard: {
    flex: 1,
    height: 420, // Increased height: header (~60px) + 2.5 rows of recipes (~280px) + button (~50px) + padding
    backgroundColor: c.bgMuted,
    borderRadius: 16,
    padding: 16,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
    flexDirection: 'column',
  },
  dayCardToday: {
    backgroundColor: c.accent,
    transform: [{ scale: 1.05 }],
  },
  dayCardWithRecipes: {
    backgroundColor: c.secondaryMuted,
  },
  dayCardHeader: {
    marginBottom: 16,
    alignItems: 'center',
  },
  dayCardDay: {
    fontSize: 11,
    fontWeight: '700',
    color: c.fgMuted,
    letterSpacing: 1,
  },
  dayCardDate: {
    fontSize: 36,
    fontWeight: 'bold',
    color: c.fg,
    marginTop: 4,
    lineHeight: 40,
  },
  todayText: {
    color: c.accent,
  },
  todayDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: c.accent,
    marginTop: 8,
  },
  dayCardContent: {
    flex: 1,
    marginBottom: 8,
    maxHeight: 280, // Max height for 2.5 rows of recipes
  },
  addRecipeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: c.bgHover,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: c.borderStrong,
    borderStyle: 'dashed',
  },
  addRecipeButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: c.fgMuted,
  },
  addRecipeButtonTextToday: {
    color: c.accent,
  },
  emptyDay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyDayText: {
    fontSize: 12,
    marginTop: 8,
    color: c.fgSubtle,
    textAlign: 'center',
  },
  emptyDayTextToday: {
    color: c.accent,
    fontWeight: '600',
  },
  recipesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    alignContent: 'flex-start',
  },
  recipeChip: {
    width: 148,
    height: 130, // Increased height for larger content
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'space-between', // Space between top and bottom
    backgroundColor: c.bgElevated,
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: c.border,
  },
  recipeChipDragging: {
    backgroundColor: c.secondaryMuted,
    borderColor: c.accent,
    borderWidth: 2,
  },
  recipeChipTop: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  recipeChipImageContainer: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recipeChipImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: c.secondaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  recipeChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: c.fg,
    lineHeight: 16,
    textAlign: 'center',
  },
  chipRemove: {
    paddingVertical: 0,
    marginTop: 5,
    paddingHorizontal: 8,
    alignSelf: 'center',
  },
  chipRemoveText: {
    fontSize: 11,
    color: c.fgSubtle,
    fontWeight: '500',
  },
  shoppingListSection: {
    margin: 20,
    marginTop: 0,
    padding: 20,
    backgroundColor: c.secondaryMuted,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: c.secondary,
  },
  shoppingListHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  shoppingListTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    flex: 1,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: c.accent,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: c.accent,
  },
  generateButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: c.accentFg,
  },
  shoppingListContent: {
    paddingLeft: 36,
  },
  shoppingListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  shoppingListItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  shoppingListItemText: {
    fontSize: 16,
    flex: 1,
  },
  shoppingListItemTextChecked: {
    textDecorationLine: 'line-through',
    opacity: 0.5,
  },
  shoppingListItemDragging: {
    backgroundColor: c.secondaryMuted,
    borderLeftWidth: 4,
    borderLeftColor: c.accent,
  },
  cancelShoppingDragButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
    padding: 12,
    backgroundColor: c.fg,
    borderRadius: 8,
  },
  cancelShoppingDragText: {
    color: c.bg,
    fontSize: 14,
    fontWeight: '600',
  },
  shoppingListItemSources: {
    backgroundColor: c.secondaryMuted,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  shoppingListItemSourcesText: {
    fontSize: 12,
    color: c.accent,
    fontWeight: '500',
  },
  placeholderText: {
    fontSize: 15,
    opacity: 0.5,
    fontStyle: 'italic',
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  modalContent: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.bgMuted,
    borderRadius: 12,
    margin: 16,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
  },
  clearButton: {
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    opacity: 0.6,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    opacity: 0.6,
    marginTop: 8,
    textAlign: 'center',
  },
  recipeListContainer: {
    padding: 16,
    paddingTop: 0,
    gap: 12,
  },
  recipeListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.bgMuted,
    borderRadius: 12,
    padding: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: c.border,
  },
  recipeListImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  recipeListImagePlaceholder: {
    backgroundColor: c.bgHover,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recipeListInfo: {
    flex: 1,
  },
  recipeListTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    color: c.fg,
  },
  recipeListMeta: {
    flexDirection: 'row',
    gap: 12,
  },
  recipeMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  recipeMetaText: {
    fontSize: 13,
    opacity: 0.6,
    color: c.fg,
  },
  shortListSection: {
    margin: 20,
    marginTop: 0,
    padding: 16,
    backgroundColor: c.bgMuted,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: c.borderStrong,
  },
  shortListHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  shortListTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
  },
  addToShortListButton: {
    padding: 4,
  },
  shortListEmpty: {
    padding: 20,
    alignItems: 'center',
  },
  shortListScroll: {
    gap: 12,
    paddingVertical: 4,
  },
  shortListCard: {
    width: 160,
    backgroundColor: c.accent,
    borderRadius: 12,
    padding: 12,
    minHeight: 100,
    justifyContent: 'space-between',
  },
  shortListCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: c.accentFg,
    marginBottom: 8,
  },
  shortListCardMeta: {
    gap: 4,
  },
  shortListCardMetaText: {
    fontSize: 11,
    color: c.accentFg,
  },
  shortListCardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  shortListCardRemove: {
    padding: 4,
  },
  dayCardDropTarget: {
    borderColor: c.accent,
    borderWidth: 3,
  },
  shortListCardDragging: {
    opacity: 0.5,
    borderColor: c.accentFg,
    borderWidth: 2,
  },
  shortListDropTarget: {
    borderColor: c.accent,
    borderWidth: 3,
  },
  dragOverlay: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    zIndex: 1000,
  },
  cancelDragButton: {
    backgroundColor: c.fg,
    borderRadius: 50,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  cancelDragText: {
    color: c.bg,
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 8,
  },
  confirmOverlay: {
    flex: 1,
    backgroundColor: c.overlay,
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
    backgroundColor: c.bgMuted,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: c.fg,
  },
  deleteButton: {
    backgroundColor: c.danger,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: c.dangerFg,
  },
  recipeDetailOverlay: {
    flex: 1,
    backgroundColor: c.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  recipeDetailModal: {
    width: '100%',
    maxWidth: 600,
    maxHeight: '90%',
  },
  recipeDetailContent: {
    borderRadius: 16,
    maxHeight: '100%',
    overflow: 'hidden',
  },
  recipeDetailScrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  recipeDetailLoading: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recipeDetailClose: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    backgroundColor: c.bgElevated,
    borderRadius: 20,
    padding: 4,
  },
  recipeDetailImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 16,
  },
  recipeDetailTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  recipeDetailMeta: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
  },
  recipeDetailMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  recipeDetailMetaText: {
    fontSize: 14,
    opacity: 0.8,
  },
  recipeDetailSection: {
    marginBottom: 24,
  },
  recipeDetailSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  recipeDetailIngredient: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    paddingLeft: 8,
  },
  recipeDetailBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: c.accent,
    marginTop: 7,
    marginRight: 12,
  },
  recipeDetailIngredientText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
  },
  recipeDetailStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  recipeDetailStepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: c.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  recipeDetailStepNumberText: {
    color: c.accentFg,
    fontSize: 14,
    fontWeight: 'bold',
  },
  recipeDetailStepText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
  },
  recipeDetailButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 40,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  recipeDetailButtonGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 60,
    backgroundColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
  },
  recipeDetailButton: {
    backgroundColor: c.accent,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  recipeDetailButtonText: {
    color: c.accentFg,
    fontSize: 16,
    fontWeight: 'bold',
  },
  });
}