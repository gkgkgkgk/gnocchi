import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Modal, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedView } from './themed-view';
import { ThemedText } from './themed-text';
import { getUserTags, saveUserTags, generateUUID, RecipeTag } from '@/services/profile-service';
import { suggestRecipeTags } from '@/services/recipe-service';
import { useTheme } from '@/hooks/use-theme';
import { type Theme } from '@/constants/theme';

// Palette used when materializing an AI-suggested tag that doesn't exist yet.
const SUGGEST_COLORS = ['#E07856', '#7A9B76', '#D89533', '#8BC34A', '#E91E63', '#2196F3', '#9C27B0', '#00BCD4'];

interface EditRecipeTagsModalProps {
  visible: boolean;
  onClose: () => void;
  currentTags?: string[]; // Array of tag IDs
  onSave: (tagIds: string[]) => void;
  recipeName?: string;
  /** Ingredient texts — used to power AI tag suggestions. */
  ingredients?: string[];
}

export function EditRecipeTagsModal({
  visible,
  onClose,
  currentTags = [],
  onSave,
  recipeName,
  ingredients = [],
}: EditRecipeTagsModalProps) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const c = theme.colors;
  const [availableTags, setAvailableTags] = useState<RecipeTag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(currentTags);
  const [loading, setLoading] = useState(true);
  const [suggesting, setSuggesting] = useState(false);
  // AI-suggested tag names that don't match an existing tag yet.
  const [newSuggestions, setNewSuggestions] = useState<string[]>([]);

  useEffect(() => {
    if (visible) {
      loadTags();
      setSelectedTagIds(currentTags);
      setNewSuggestions([]);
    }
  }, [visible, currentTags]);

  const loadTags = async () => {
    try {
      setLoading(true);
      const tags = await getUserTags();
      setAvailableTags(tags);
    } catch (error) {
      console.error('Failed to load tags:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleTag = (tagId: string) => {
    const currentIds = selectedTagIds || [];
    if (currentIds.includes(tagId)) {
      // Remove tag
      setSelectedTagIds(currentIds.filter(id => id !== tagId));
    } else {
      // Add tag (max 3)
      if (currentIds.length < 3) {
        setSelectedTagIds([...currentIds, tagId]);
      }
    }
  };

  const handleSuggest = async () => {
    try {
      setSuggesting(true);
      const names = await suggestRecipeTags(
        recipeName ?? '',
        ingredients,
        availableTags.map((t) => t.name),
      );
      const selected = [...(selectedTagIds || [])];
      const unmatched: string[] = [];
      for (const name of names) {
        const match = availableTags.find((t) => t.name.toLowerCase() === name.toLowerCase());
        if (match) {
          if (!selected.includes(match.id) && selected.length < 3) selected.push(match.id);
        } else if (!unmatched.some((n) => n.toLowerCase() === name.toLowerCase())) {
          unmatched.push(name);
        }
      }
      setSelectedTagIds(selected);
      setNewSuggestions(unmatched);
    } catch (error) {
      console.error('Failed to suggest tags:', error);
    } finally {
      setSuggesting(false);
    }
  };

  // Materialize an AI-suggested new tag into the household catalog + select it.
  const createFromSuggestion = async (name: string) => {
    if ((selectedTagIds || []).length >= 3) return;
    const color = SUGGEST_COLORS[availableTags.length % SUGGEST_COLORS.length];
    const tag: RecipeTag = { id: generateUUID(), name, color, icon: 'pricetag' };
    const updated = [...availableTags, tag];
    setAvailableTags(updated);
    setSelectedTagIds([...(selectedTagIds || []), tag.id]);
    setNewSuggestions((prev) => prev.filter((n) => n !== name));
    try {
      await saveUserTags(updated);
    } catch (error) {
      console.error('Failed to save new tag:', error);
    }
  };

  const handleSave = () => {
    onSave(selectedTagIds);
    onClose();
  };

  const handleCancel = () => {
    setSelectedTagIds(currentTags);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleCancel}
    >
      <Pressable style={styles.overlay} onPress={handleCancel}>
        <Pressable style={styles.modalContainer} onPressIn={(e) => e.stopPropagation()}>
          <ThemedView style={styles.modal}>
            {/* Header */}
            <View style={styles.header}>
              <ThemedText style={styles.title}>Tags</ThemedText>
              <Pressable onPress={handleCancel} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={c.fgMuted} />
              </Pressable>
            </View>

            {recipeName && (
              <ThemedText style={styles.recipeName}>{recipeName}</ThemedText>
            )}

            <View style={styles.subtitleRow}>
              <ThemedText style={styles.subtitle}>
                Select up to 3 tags ({(selectedTagIds || []).length}/3)
              </ThemedText>
              <Pressable style={styles.suggestButton} onPress={handleSuggest} disabled={suggesting}>
                <Ionicons
                  name={suggesting ? 'sync' : 'sparkles'}
                  size={14}
                  color={c.accent}
                />
                <ThemedText style={styles.suggestButtonText}>
                  {suggesting ? 'Thinking…' : 'Suggest with AI'}
                </ThemedText>
              </Pressable>
            </View>

            {/* AI-suggested new tags (not in the catalog yet) */}
            {newSuggestions.length > 0 && (
              <View style={styles.suggestionChips}>
                {newSuggestions.map((name) => (
                  <Pressable
                    key={name}
                    style={styles.suggestionChip}
                    onPress={() => createFromSuggestion(name)}
                    disabled={(selectedTagIds || []).length >= 3}>
                    <Ionicons name="add" size={14} color={c.accent} />
                    <ThemedText style={styles.suggestionChipText}>{name}</ThemedText>
                  </Pressable>
                ))}
              </View>
            )}

            {/* Tags List */}
            <ScrollView style={styles.tagsList} showsVerticalScrollIndicator={false}>
              {loading ? (
                <ThemedText style={styles.loadingText}>Loading tags...</ThemedText>
              ) : availableTags.length === 0 ? (
                <View style={styles.emptyState}>
                  <ThemedText style={styles.emptyText}>No tags available</ThemedText>
                  <ThemedText style={styles.emptySubtext}>
                    Create tags in Settings to organize your recipes
                  </ThemedText>
                </View>
              ) : (
                availableTags.map((tag) => {
                  const currentIds = selectedTagIds || [];
                  const isSelected = currentIds.includes(tag.id);
                  const isDisabled = !isSelected && currentIds.length >= 3;

                  return (
                    <Pressable
                      key={tag.id}
                      onPress={() => !isDisabled && toggleTag(tag.id)}
                      style={[
                        styles.tagItem,
                        isSelected && styles.tagItemSelected,
                        isDisabled && styles.tagItemDisabled,
                      ]}
                      disabled={isDisabled}
                    >
                      <View style={styles.tagLeft}>
                        <View style={[styles.tagIconContainer, { backgroundColor: tag.color }]}>
                          <Ionicons name={tag.icon as any} size={18} color="#fff" />
                        </View>
                        <ThemedText style={styles.tagName}>{tag.name}</ThemedText>
                      </View>
                      <View style={[
                        styles.checkbox,
                        isSelected && styles.checkboxSelected,
                        { borderColor: tag.color, backgroundColor: isSelected ? tag.color : 'transparent' }
                      ]}>
                        {isSelected && <Ionicons name="checkmark" size={16} color="#fff" />}
                      </View>
                    </Pressable>
                  );
                })
              )}
            </ScrollView>

            {/* Action Buttons */}
            <View style={styles.actions}>
              <Pressable
                style={[styles.button, styles.cancelButton]}
                onPress={handleCancel}
              >
                <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
              </Pressable>
              <Pressable
                style={[styles.button, styles.saveButton]}
                onPress={handleSave}
              >
                <ThemedText style={styles.saveButtonText}>Save</ThemedText>
              </Pressable>
            </View>
          </ThemedView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function makeStyles(theme: Theme) {
  const c = theme.colors;
  return StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: c.overlay,
    justifyContent: 'flex-end',
  },
  modalContainer: {
    maxHeight: '80%',
  },
  modal: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  closeButton: {
    padding: 4,
  },
  recipeName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    opacity: 0.7,
  },
  subtitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.6,
    flex: 1,
  },
  suggestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: c.accent,
  },
  suggestButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: c.accent,
  },
  suggestionChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: c.accentMuted,
    borderWidth: 1,
    borderColor: c.accent,
    borderStyle: 'dashed',
  },
  suggestionChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: c.fg,
  },
  tagsList: {
    maxHeight: 400,
    marginBottom: 20,
  },
  loadingText: {
    textAlign: 'center',
    padding: 20,
    opacity: 0.6,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    opacity: 0.6,
    textAlign: 'center',
  },
  tagItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  tagItemSelected: {
    borderColor: c.accent,
    backgroundColor: c.accentMuted,
  },
  tagItemDisabled: {
    opacity: 0.4,
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  tagName: {
    fontSize: 16,
    fontWeight: '500',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    borderColor: c.accent,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
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
  saveButton: {
    backgroundColor: c.accent,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: c.accentFg,
  },
  });
}
