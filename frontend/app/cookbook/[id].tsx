import { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, Pressable, useWindowDimensions, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { fetchCookbookRecipes, Cookbook } from '@/services/cookbook-service';
import { Recipe } from '@/services/recipe-service';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/use-theme';
import { type Theme } from '@/constants/theme';

export default function CookbookDetailScreen() {
  const router = useRouter();
  const theme = useTheme();
  const styles = makeStyles(theme);
  const c = theme.colors;
  const { id } = useLocalSearchParams();
  const [cookbook, setCookbook] = useState<Cookbook | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (id) {
      loadCookbookRecipes();
    }
  }, [id]);

  const loadCookbookRecipes = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchCookbookRecipes(id as string);
      setCookbook(data.cookbook);
      setRecipes(data.recipes);
    } catch (err) {
      console.error('Failed to load cookbook recipes:', err);
      setError('Failed to load cookbook');
    } finally {
      setLoading(false);
    }
  };

  const handleRecipePress = (recipeId: string) => {
    router.push(`/recipe/${recipeId}` as any);
  };

  const scrollToPage = (pageIndex: number) => {
    scrollViewRef.current?.scrollTo({
      x: pageIndex * width,
      animated: true,
    });
    setCurrentPage(pageIndex);
  };

  const goToPreviousPage = () => {
    if (currentPage > 0) {
      scrollToPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages - 1) {
      scrollToPage(currentPage + 1);
    }
  };

  if (loading) {
    return (
      <ThemedView style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" />
        <ThemedText style={styles.loadingText}>Loading cookbook...</ThemedText>
      </ThemedView>
    );
  }

  if (error || !cookbook) {
    return (
      <ThemedView style={[styles.container, styles.centered]}>
        <ThemedText style={styles.errorText}>{error || 'Cookbook not found'}</ThemedText>
      </ThemedView>
    );
  }

  // Total pages = 1 (table of contents) + number of recipes
  const totalPages = 1 + recipes.length;

  return (
    <ThemedView style={styles.container}>
      {/* Header with page indicator and navigation */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        {/* Back to cookbooks button */}
        <Pressable 
          style={styles.backButton} 
          onPress={() => router.push('/(drawer)/(tabs)/explore' as any)}
        >
          <Ionicons name="arrow-back" size={24} color={c.fg} />
        </Pressable>

        {/* Page navigation group */}
        <View style={styles.pageNavigation}>
          {/* Left arrow */}
          <Pressable 
            style={styles.headerArrow} 
            onPress={goToPreviousPage}
            disabled={currentPage === 0}
          >
            {currentPage > 0 && (
              <Ionicons name="chevron-back" size={24} color={c.fgMuted} />
            )}
          </Pressable>

          {/* Page indicator */}
          <ThemedText style={styles.pageText}>
            Page {currentPage + 1} of {totalPages}
          </ThemedText>

          {/* Right arrow */}
          <Pressable 
            style={styles.headerArrow} 
            onPress={goToNextPage}
            disabled={currentPage === totalPages - 1}
          >
            {currentPage < totalPages - 1 && (
              <Ionicons name="chevron-forward" size={24} color={c.fgMuted} />
            )}
          </Pressable>
        </View>

        {/* Spacer to balance layout */}
        <View style={styles.backButton} />
      </View>

      {/* Horizontal scrollable pages */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(event) => {
          const pageIndex = Math.round(event.nativeEvent.contentOffset.x / width);
          setCurrentPage(pageIndex);
        }}
        style={styles.scrollView}
      >
        {/* Page 1: Table of Contents */}
        <View style={[styles.page, { width, backgroundColor: cookbook.cover_color || '#E07856' }]}>
          <View style={styles.pageContent}>
            <ThemedText style={styles.tocTitle}>{cookbook.name}</ThemedText>
            {cookbook.description && (
              <ThemedText style={styles.tocDescription}>{cookbook.description}</ThemedText>
            )}
            
            <View style={styles.divider} />
            
            <ThemedText style={styles.tocHeader}>Table of Contents</ThemedText>
            
            <ScrollView style={styles.tocList} showsVerticalScrollIndicator={false}>
              {recipes.map((recipe, index) => (
                <Pressable
                  key={recipe.id}
                  style={styles.tocItem}
                  onPress={() => scrollToPage(index + 1)}
                >
                  <ThemedText style={styles.tocNumber}>{index + 1}.</ThemedText>
                  <ThemedText style={styles.tocRecipeName}>{recipe.title}</ThemedText>
                </Pressable>
              ))}
              {recipes.length === 0 && (
                <ThemedText style={styles.tocEmpty}>No recipes yet</ThemedText>
              )}
            </ScrollView>
          </View>
        </View>

        {/* Recipe pages */}
        {recipes.map((recipe, index) => (
          <View key={recipe.id} style={[styles.page, { width }]}>
            <ScrollView style={styles.pageContent} showsVerticalScrollIndicator={false}>
              {/* Recipe image */}
              {(recipe.image_url || recipe.imageUrl) ? (
                <Image
                  source={{ uri: recipe.image_url || recipe.imageUrl }}
                  style={styles.recipeImage}
                  contentFit="cover"
                />
              ) : (
                <View style={styles.recipeImagePlaceholder}>
                  <ThemedText style={styles.placeholderEmoji}>🍽️</ThemedText>
                </View>
              )}

              {/* Recipe title */}
              <ThemedText style={styles.recipeTitle}>{recipe.title}</ThemedText>

              {/* Metadata */}
              <View style={styles.metadata}>
                {recipe.metadata?.prepTime > 0 && (
                  <View style={styles.metadataItem}>
                    <ThemedText style={styles.metadataLabel}>Prep:</ThemedText>
                    <ThemedText style={styles.metadataValue}>{recipe.metadata.prepTime} min</ThemedText>
                  </View>
                )}
                {recipe.metadata?.cookTime > 0 && (
                  <View style={styles.metadataItem}>
                    <ThemedText style={styles.metadataLabel}>Cook:</ThemedText>
                    <ThemedText style={styles.metadataValue}>{recipe.metadata.cookTime} min</ThemedText>
                  </View>
                )}
                {recipe.metadata?.servings > 0 && (
                  <View style={styles.metadataItem}>
                    <ThemedText style={styles.metadataLabel}>Servings:</ThemedText>
                    <ThemedText style={styles.metadataValue}>{recipe.metadata.servings}</ThemedText>
                  </View>
                )}
              </View>

              {/* Ingredients */}
              {recipe.ingredients && recipe.ingredients.length > 0 && (
                <View style={styles.section}>
                  <ThemedText style={styles.sectionTitle}>Ingredients</ThemedText>
                  {recipe.ingredients.slice(0, 8).map((ing: any, idx: number) => (
                    <ThemedText key={idx} style={styles.ingredientItem}>
                      • {ing.text}
                    </ThemedText>
                  ))}
                  {recipe.ingredients.length > 8 && (
                    <ThemedText style={styles.moreText}>
                      +{recipe.ingredients.length - 8} more...
                    </ThemedText>
                  )}
                </View>
              )}

              {/* Instructions preview */}
              {recipe.steps && recipe.steps.length > 0 && (
                <View style={styles.section}>
                  <ThemedText style={styles.sectionTitle}>Instructions</ThemedText>
                  {recipe.steps.slice(0, 3).map((step: string, idx: number) => (
                    <ThemedText key={idx} style={styles.stepItem}>
                      {idx + 1}. {step}
                    </ThemedText>
                  ))}
                  {recipe.steps.length > 3 && (
                    <ThemedText style={styles.moreText}>
                      +{recipe.steps.length - 3} more steps...
                    </ThemedText>
                  )}
                </View>
              )}

              {/* View full recipe button */}
              <Pressable
                style={styles.viewFullButton}
                onPress={() => router.push(`/recipe/${recipe.id}?from=cookbook&cookbookId=${id}` as any)}
              >
                <ThemedText style={styles.viewFullButtonText}>View Full Recipe</ThemedText>
              </Pressable>
            </ScrollView>
          </View>
        ))}
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
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  errorText: {
    fontSize: 16,
    color: c.danger,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: c.bgMuted,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerArrow: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageText: {
    fontSize: 14,
    fontWeight: '600',
    opacity: 0.6,
    minWidth: 100,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  page: {
    flex: 1,
  },
  pageContent: {
    flex: 1,
    padding: 24,
    paddingTop: 40,
  },
  // Table of Contents styles
  tocTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  tocDescription: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
    marginBottom: 24,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  divider: {
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginVertical: 24,
  },
  tocHeader: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  tocList: {
    flex: 1,
  },
  tocItem: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
  },
  tocNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    width: 40,
  },
  tocRecipeName: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
  },
  tocEmpty: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.7,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 20,
  },
  // Recipe page styles
  recipeImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 20,
  },
  recipeImagePlaceholder: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: c.bgMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  placeholderEmoji: {
    fontSize: 64,
  },
  recipeTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  metadata: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
    flexWrap: 'wrap',
  },
  metadataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metadataLabel: {
    fontSize: 14,
    fontWeight: '600',
    opacity: 0.6,
  },
  metadataValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  ingredientItem: {
    fontSize: 15,
    lineHeight: 24,
    marginBottom: 4,
  },
  stepItem: {
    fontSize: 15,
    lineHeight: 24,
    marginBottom: 12,
  },
  moreText: {
    fontSize: 14,
    fontStyle: 'italic',
    opacity: 0.6,
    marginTop: 8,
  },
  viewFullButton: {
    backgroundColor: c.accent,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 40,
  },
  viewFullButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: c.accentFg,
  },
  });
}
