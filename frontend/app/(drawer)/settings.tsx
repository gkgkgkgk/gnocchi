import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Modal, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { useThemePreference, type ThemePreference } from '@/contexts/theme-context';
import { getUserTags, saveUserTags, RecipeTag, generateUUID, getDietaryRestrictions, saveDietaryRestrictions, getFavoriteFood, saveFavoriteFood } from '@/services/profile-service';

// Available icons for tags
const AVAILABLE_ICONS = [
  'flash', 'leaf', 'heart', 'nutrition', 'ice-cream', 'flame',
  'pizza', 'restaurant', 'cafe', 'fish', 'wine', 'beer',
  'star', 'sunny', 'moon', 'snow', 'water', 'time',
];

// Color palette for tags
const AVAILABLE_COLORS = [
  '#FF9800', '#E07856', '#F44336', '#8BC34A', '#E91E63', '#FF5722',
  '#2196F3', '#9C27B0', '#00BCD4', '#FFC107', '#795548', '#607D8B',
];

// Helper function to get emoji based on food name
const getFoodEmoji = (food: string | null): string => {
  if (!food) return '🍽️';
  
  const foodLower = food.toLowerCase();
  
  // Pizza
  if (foodLower.includes('pizza')) return '🍕';
  // Burgers
  if (foodLower.includes('burger') || foodLower.includes('hamburger')) return '🍔';
  // Pasta
  if (foodLower.includes('pasta') || foodLower.includes('spaghetti') || foodLower.includes('noodle')) return '🍝';
  // Sushi
  if (foodLower.includes('sushi') || foodLower.includes('sashimi')) return '🍣';
  // Tacos
  if (foodLower.includes('taco')) return '🌮';
  // Ramen
  if (foodLower.includes('ramen')) return '🍜';
  // Rice
  if (foodLower.includes('rice') || foodLower.includes('fried rice')) return '🍚';
  // Steak
  if (foodLower.includes('steak') || foodLower.includes('beef')) return '🥩';
  // Chicken
  if (foodLower.includes('chicken')) return '🍗';
  // Salad
  if (foodLower.includes('salad')) return '🥗';
  // Sandwich
  if (foodLower.includes('sandwich') || foodLower.includes('sub')) return '🥪';
  // Ice cream
  if (foodLower.includes('ice cream') || foodLower.includes('icecream')) return '🍦';
  // Cake
  if (foodLower.includes('cake')) return '🍰';
  // Cookie
  if (foodLower.includes('cookie')) return '🍪';
  // Donut
  if (foodLower.includes('donut') || foodLower.includes('doughnut')) return '🍩';
  // Chocolate
  if (foodLower.includes('chocolate')) return '🍫';
  // Fruit
  if (foodLower.includes('apple')) return '🍎';
  if (foodLower.includes('banana')) return '🍌';
  if (foodLower.includes('strawberr')) return '🍓';
  if (foodLower.includes('watermelon')) return '🍉';
  if (foodLower.includes('grape')) return '🍇';
  if (foodLower.includes('orange')) return '🍊';
  if (foodLower.includes('peach')) return '🍑';
  if (foodLower.includes('cherry')) return '🍒';
  // Drinks
  if (foodLower.includes('coffee')) return '☕';
  if (foodLower.includes('tea')) return '🍵';
  // Breakfast
  if (foodLower.includes('pancake')) return '🥞';
  if (foodLower.includes('waffle')) return '🧇';
  if (foodLower.includes('bacon')) return '🥓';
  if (foodLower.includes('egg')) return '🍳';
  // Asian
  if (foodLower.includes('dumpling') || foodLower.includes('gyoza')) return '🥟';
  if (foodLower.includes('curry')) return '🍛';
  if (foodLower.includes('bento')) return '🍱';
  // Mexican
  if (foodLower.includes('burrito')) return '🌯';
  if (foodLower.includes('nacho')) return '🧀';
  // Seafood
  if (foodLower.includes('shrimp') || foodLower.includes('prawn')) return '🍤';
  if (foodLower.includes('fish')) return '🐟';
  if (foodLower.includes('lobster')) return '🦞';
  // Bread
  if (foodLower.includes('bread') || foodLower.includes('toast')) return '🍞';
  if (foodLower.includes('croissant')) return '🥐';
  if (foodLower.includes('bagel')) return '🥯';
  // Soup
  if (foodLower.includes('soup')) return '🍲';
  // Hot dog
  if (foodLower.includes('hot dog') || foodLower.includes('hotdog')) return '🌭';
  // Fries
  if (foodLower.includes('fries') || foodLower.includes('french fries')) return '🍟';
  // Popcorn
  if (foodLower.includes('popcorn')) return '🍿';
  
  // Default
  return '🍽️';
};

const APPEARANCE_OPTIONS: { value: ThemePreference; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'system', label: 'System', icon: 'phone-portrait-outline' },
  { value: 'light', label: 'Light', icon: 'sunny-outline' },
  { value: 'dark', label: 'Dark', icon: 'moon-outline' },
];

function AppearanceSection() {
  const theme = useTheme();
  const { preference, setPreference } = useThemePreference();

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <ThemedText style={styles.sectionTitle}>Appearance</ThemedText>
      </View>
      <ThemedText style={styles.sectionDescription}>
        Choose a light or dark look, or follow your device.
      </ThemedText>

      <View
        style={{
          flexDirection: 'row',
          gap: theme.spacing.sm,
          backgroundColor: theme.colors.bgMuted,
          padding: theme.spacing.xs,
          borderRadius: theme.radius.lg,
        }}
      >
        {APPEARANCE_OPTIONS.map((opt) => {
          const active = preference === opt.value;
          return (
            <Pressable
              key={opt.value}
              onPress={() => setPreference(opt.value)}
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: theme.spacing.xs,
                paddingVertical: theme.spacing.md,
                borderRadius: theme.radius.md,
                backgroundColor: active ? theme.colors.accent : 'transparent',
              }}
            >
              <Ionicons
                name={opt.icon}
                size={18}
                color={active ? theme.colors.accentFg : theme.colors.fgMuted}
              />
              <Text
                style={{
                  ...theme.type.button,
                  color: active ? theme.colors.accentFg : theme.colors.fgMuted,
                }}
              >
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function SettingsScreen() {
  const [tags, setTags] = useState<RecipeTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTag, setEditingTag] = useState<RecipeTag | null>(null);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(AVAILABLE_COLORS[0]);
  const [newTagIcon, setNewTagIcon] = useState(AVAILABLE_ICONS[0]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [tagToDelete, setTagToDelete] = useState<string | null>(null);
  const [dietaryRestrictions, setDietaryRestrictions] = useState<string[]>([]);
  const [restrictionInput, setRestrictionInput] = useState('');
  const [favoriteFood, setFavoriteFood] = useState<string | null>(null);
  const [isEditingFood, setIsEditingFood] = useState(false);
  const [foodInput, setFoodInput] = useState('');

  useEffect(() => {
    loadTags();
  }, []);

  const loadTags = async () => {
    setLoading(true);
    const userTags = await getUserTags();
    const restrictions = await getDietaryRestrictions();
    const food = await getFavoriteFood();
    setTags(userTags);
    setDietaryRestrictions(restrictions);
    setFavoriteFood(food);
    setLoading(false);
  };

  const openAddModal = () => {
    setEditingTag(null);
    setNewTagName('');
    setNewTagColor(AVAILABLE_COLORS[0]);
    setNewTagIcon(AVAILABLE_ICONS[0]);
    setShowAddModal(true);
  };

  const openEditModal = (tag: RecipeTag) => {
    setEditingTag(tag);
    setNewTagName(tag.name);
    setNewTagColor(tag.color);
    setNewTagIcon(tag.icon);
    setShowAddModal(true);
  };

  const handleSaveTag = async () => {
    if (!newTagName.trim()) {
      return;
    }

    let updatedTags: RecipeTag[];

    if (editingTag) {
      // Edit existing tag
      updatedTags = tags.map(tag =>
        tag.id === editingTag.id
          ? { ...tag, name: newTagName, color: newTagColor, icon: newTagIcon }
          : tag
      );
    } else {
      // Add new tag
      const newTag: RecipeTag = {
        id: generateUUID(),
        name: newTagName,
        color: newTagColor,
        icon: newTagIcon,
      };
      updatedTags = [...tags, newTag];
    }

    const success = await saveUserTags(updatedTags);
    if (success) {
      setTags(updatedTags);
      setShowAddModal(false);
    }
  };

  const handleDeleteTag = (tagId: string) => {
    setTagToDelete(tagId);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!tagToDelete) return;
    
    const updatedTags = tags.filter(tag => tag.id !== tagToDelete);
    const success = await saveUserTags(updatedTags);
    if (success) {
      setTags(updatedTags);
    }
    setShowDeleteConfirm(false);
    setTagToDelete(null);
  };

  const handleAddRestriction = async () => {
    const trimmed = restrictionInput.trim();
    if (!trimmed || dietaryRestrictions.includes(trimmed)) {
      setRestrictionInput('');
      return;
    }

    // Optimistic UI update
    const updated = [...dietaryRestrictions, trimmed];
    setDietaryRestrictions(updated);
    setRestrictionInput('');

    // Save to DB in background
    const success = await saveDietaryRestrictions(updated);
    if (!success) {
      // Revert on failure
      setDietaryRestrictions(dietaryRestrictions);
    }
  };

  const handleRemoveRestriction = async (restriction: string) => {
    // Optimistic UI update
    const updated = dietaryRestrictions.filter(r => r !== restriction);
    const previous = dietaryRestrictions;
    setDietaryRestrictions(updated);

    // Save to DB in background
    const success = await saveDietaryRestrictions(updated);
    if (!success) {
      // Revert on failure
      setDietaryRestrictions(previous);
    }
  };

  const handleEditFood = () => {
    setFoodInput(favoriteFood || '');
    setIsEditingFood(true);
  };

  const handleSaveFood = async () => {
    const trimmed = foodInput.trim();
    
    // Optimistic UI update
    const previous = favoriteFood;
    setFavoriteFood(trimmed || null);
    setIsEditingFood(false);

    // Save to DB in background
    const success = await saveFavoriteFood(trimmed);
    if (!success) {
      // Revert on failure
      setFavoriteFood(previous);
    }
  };

  const handleCancelEditFood = () => {
    setIsEditingFood(false);
    setFoodInput('');
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
        {/* Appearance Section */}
        <AppearanceSection />

        {/* Favorite Food Section */}
        <View style={styles.favoriteFoodSection}>
          {isEditingFood ? (
            <ThemedView lightColor="#FFF3E0" darkColor="#2d2416" style={styles.foodEditContainer}>
              <TextInput
                style={styles.foodInput}
                value={foodInput}
                onChangeText={setFoodInput}
                placeholder="What's your favorite food? 🤔"
                placeholderTextColor="#999"
                autoFocus
                onSubmitEditing={handleSaveFood}
                returnKeyType="done"
              />
              <View style={styles.foodEditButtons}>
                <Pressable
                  style={[styles.foodButton, styles.foodCancelButton]}
                  onPress={handleCancelEditFood}
                >
                  <ThemedText style={styles.foodCancelText}>Cancel</ThemedText>
                </Pressable>
                <Pressable
                  style={[styles.foodButton, styles.foodSaveButton]}
                  onPress={handleSaveFood}
                >
                  <Text style={styles.foodSaveText}>Save ✨</Text>
                </Pressable>
              </View>
            </ThemedView>
          ) : (
            <Pressable onPress={handleEditFood}>
              <ThemedView lightColor="#FFF3E0" darkColor="#2d2416" style={styles.foodDisplay}>
                <View style={styles.foodContent}>
                  <Text style={styles.foodEmoji}>{getFoodEmoji(favoriteFood)}</Text>
                  <ThemedText style={styles.foodText}>
                    {favoriteFood ? (
                      <>
                        My favorite food is <ThemedText lightColor="#FF6F00" darkColor="#FFB74D" style={styles.foodValue}>{favoriteFood}</ThemedText>!
                      </>
                    ) : (
                      <ThemedText style={styles.foodPlaceholder}>Tap to set your favorite food ✨</ThemedText>
                    )}
                  </ThemedText>
                </View>
                <Ionicons name="create-outline" size={20} color="#FF9800" />
              </ThemedView>
            </Pressable>
          )}
        </View>

        {/* Tags Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText style={styles.sectionTitle}>Recipe Tags</ThemedText>
            <Pressable style={styles.addButton} onPress={openAddModal}>
              <Ionicons name="add-circle" size={24} color="#E07856" />
            </Pressable>
          </View>
          <ThemedText style={styles.sectionDescription}>
            Create custom tags to organize your recipes
          </ThemedText>

          {loading ? (
            <ThemedText style={styles.loadingText}>Loading tags...</ThemedText>
          ) : (
            <View style={styles.tagsContainer}>
              {tags.map((tag) => (
                <ThemedView key={tag.id} lightColor="#fff" darkColor="#2a2a2a" style={[styles.tagCard, { borderLeftColor: tag.color }]}>
                  <View style={styles.tagLeft}>
                    <View style={[styles.tagIconContainer, { backgroundColor: tag.color }]}>
                      <Ionicons name={tag.icon as any} size={20} color="#fff" />
                    </View>
                    <ThemedText style={styles.tagName}>{tag.name}</ThemedText>
                  </View>
                  <View style={styles.tagActions}>
                    <Pressable
                      style={({ pressed }) => [
                        styles.tagActionButton,
                        pressed && { backgroundColor: '#f5f5f5' }
                      ]}
                      onPress={() => openEditModal(tag)}
                    >
                      <Ionicons name="pencil" size={18} color="#666" />
                    </Pressable>
                    <Pressable
                      style={({ pressed }) => [
                        styles.tagActionButton,
                        pressed && { backgroundColor: '#ffebee' }
                      ]}
                      onPress={() => handleDeleteTag(tag.id)}
                    >
                      <Ionicons name="trash-outline" size={18} color="#F44336" />
                    </Pressable>
                  </View>
                </ThemedView>
              ))}
            </View>
          )}
        </View>

        {/* Dietary Restrictions Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText style={styles.sectionTitle}>Dietary Restrictions</ThemedText>
          </View>
          <ThemedText style={styles.sectionDescription}>
            Add any dietary restrictions or allergies
          </ThemedText>

          {/* Input for adding new restriction */}
          <View style={styles.chipInputContainer}>
            <TextInput
              style={styles.chipInput}
              value={restrictionInput}
              onChangeText={setRestrictionInput}
              placeholder="Type and press Enter..."
              placeholderTextColor="#999"
              onSubmitEditing={handleAddRestriction}
              returnKeyType="done"
            />
          </View>

          {/* Display chips */}
          <View style={styles.chipsContainer}>
            {dietaryRestrictions.map((restriction, index) => (
              <ThemedView key={index} lightColor="#e3f2fd" darkColor="#1e3a5f" style={styles.chip}>
                <ThemedText style={styles.chipText}>{restriction}</ThemedText>
                <Pressable
                  onPress={() => handleRemoveRestriction(restriction)}
                  style={styles.chipRemove}
                  hitSlop={8}
                >
                  <Ionicons name="close-circle" size={18} color="#666" />
                </Pressable>
              </ThemedView>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Add/Edit Tag Modal */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowAddModal(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <ThemedView style={styles.modalInner}>
              <ThemedText style={styles.modalTitle}>
                {editingTag ? 'Edit Tag' : 'Add New Tag'}
              </ThemedText>

              {/* Tag Name */}
              <View style={styles.inputGroup}>
                <ThemedText style={styles.inputLabel}>Tag Name</ThemedText>
                <TextInput
                  style={styles.input}
                  value={newTagName}
                  onChangeText={setNewTagName}
                  placeholder="Enter tag name"
                  placeholderTextColor="#999"
                />
              </View>

              {/* Color Picker */}
              <View style={styles.inputGroup}>
                <ThemedText style={styles.inputLabel}>Color</ThemedText>
                <View style={styles.colorPicker}>
                  {AVAILABLE_COLORS.map((color) => (
                    <Pressable
                      key={color}
                      style={[
                        styles.colorOption,
                        { backgroundColor: color },
                        newTagColor === color && styles.colorOptionSelected,
                      ]}
                      onPress={() => setNewTagColor(color)}
                    >
                      {newTagColor === color && (
                        <Ionicons name="checkmark" size={16} color="#fff" />
                      )}
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Icon Picker */}
              <View style={styles.inputGroup}>
                <ThemedText style={styles.inputLabel}>Icon</ThemedText>
                <View style={styles.iconPickerContainer}>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={Platform.OS === 'web'}
                    style={styles.iconPicker}
                    contentContainerStyle={styles.iconPickerContent}
                  >
                    {AVAILABLE_ICONS.map((icon) => (
                      <Pressable
                        key={icon}
                        style={[
                          styles.iconOption,
                          newTagIcon === icon && styles.iconOptionSelected,
                        ]}
                        onPress={() => setNewTagIcon(icon)}
                      >
                        <Ionicons name={icon as any} size={24} color="#666" />
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              </View>

              {/* Preview */}
              <View style={styles.previewSection}>
                <ThemedText style={styles.inputLabel}>Preview</ThemedText>
                <ThemedView lightColor="#fff" darkColor="#2a2a2a" style={[styles.tagPreview, { borderLeftColor: newTagColor }]}>
                  <View style={[styles.tagIconContainer, { backgroundColor: newTagColor }]}>
                    <Ionicons name={newTagIcon as any} size={20} color="#fff" />
                  </View>
                  <ThemedText style={styles.tagName}>
                    {newTagName || 'Tag Name'}
                  </ThemedText>
                </ThemedView>
              </View>

              {/* Buttons */}
              <View style={styles.modalButtons}>
                <Pressable
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setShowAddModal(false)}
                >
                  <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
                </Pressable>
                <Pressable
                  style={[styles.modalButton, styles.saveButton]}
                  onPress={handleSaveTag}
                >
                  <ThemedText style={styles.saveButtonText}>
                    {editingTag ? 'Save' : 'Add'}
                  </ThemedText>
                </Pressable>
              </View>
            </ThemedView>
          </Pressable>
        </Pressable>
      </Modal>

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
              <ThemedText style={styles.confirmTitle}>Delete Tag</ThemedText>
              <ThemedText style={styles.confirmMessage}>
                Are you sure you want to delete this tag? This action cannot be undone.
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
                  onPress={confirmDelete}
                >
                  <ThemedText style={styles.deleteButtonText}>Delete</ThemedText>
                </Pressable>
              </View>
            </ThemedView>
          </Pressable>
        </Pressable>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  sectionDescription: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 16,
  },
  addButton: {
    padding: 4,
  },
  loadingText: {
    textAlign: 'center',
    padding: 20,
    opacity: 0.6,
  },
  tagsContainer: {
    gap: 12,
  },
  tagCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tagLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  tagIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagName: {
    fontSize: 16,
    fontWeight: '600',
  },
  tagActions: {
    flexDirection: 'row',
    gap: 8,
  },
  tagActionButton: {
    padding: 8,
    borderRadius: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 500,
  },
  modalInner: {
    borderRadius: 16,
    padding: 24,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    opacity: 0.8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  colorPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorOption: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorOptionSelected: {
    borderColor: '#333',
  },
  iconPickerContainer: {
    maxHeight: 120,
  },
  iconPicker: {
    flexDirection: 'row',
  },
  iconPickerContent: {
    paddingRight: 8,
  },
  iconOption: {
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    marginRight: 8,
    backgroundColor: '#f5f5f5',
  },
  iconOptionSelected: {
    borderColor: '#E07856',
    backgroundColor: '#e8f5e9',
  },
  previewSection: {
    marginBottom: 20,
  },
  tagPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
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
  saveButton: {
    backgroundColor: '#E07856',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
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
  deleteButton: {
    backgroundColor: '#ff3b30',
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  chipInputContainer: {
    marginBottom: 16,
  },
  chipInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingLeft: 12,
    paddingRight: 8,
    borderRadius: 20,
    gap: 6,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  chipRemove: {
    padding: 2,
  },
  favoriteFoodSection: {
    marginBottom: 24,
  },
  foodDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#FFB74D',
    shadowColor: '#FF9800',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  foodContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  foodEmoji: {
    fontSize: 32,
  },
  foodText: {
    fontSize: 17,
    flex: 1,
    lineHeight: 24,
  },
  foodValue: {
    fontWeight: '700',
    color: '#FF6F00',
  },
  foodPlaceholder: {
    opacity: 0.6,
    fontStyle: 'italic',
  },
  foodEditContainer: {
    gap: 12,
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#FFB74D',
  },
  foodInput: {
    borderWidth: 2,
    borderColor: '#FFB74D',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  foodEditButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  foodButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  foodCancelButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  foodCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  foodSaveButton: {
    backgroundColor: '#FF9800',
    shadowColor: '#FF9800',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  foodSaveText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
