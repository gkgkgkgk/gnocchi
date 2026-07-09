import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Modal, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedView } from './themed-view';
import { ThemedText } from './themed-text';
import { getUserTags, RecipeTag } from '@/services/profile-service';

interface EditRecipeTagsModalProps {
  visible: boolean;
  onClose: () => void;
  currentTags?: string[]; // Array of tag IDs
  onSave: (tagIds: string[]) => void;
  recipeName?: string;
}

export function EditRecipeTagsModal({
  visible,
  onClose,
  currentTags = [],
  onSave,
  recipeName,
}: EditRecipeTagsModalProps) {
  const [availableTags, setAvailableTags] = useState<RecipeTag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(currentTags);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (visible) {
      loadTags();
      setSelectedTagIds(currentTags);
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
                <Ionicons name="close" size={24} color="#666" />
              </Pressable>
            </View>

            {recipeName && (
              <ThemedText style={styles.recipeName}>{recipeName}</ThemedText>
            )}

            <ThemedText style={styles.subtitle}>
              Select up to 3 tags ({(selectedTagIds || []).length}/3)
            </ThemedText>

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

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
  subtitle: {
    fontSize: 14,
    marginBottom: 16,
    opacity: 0.6,
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
    borderColor: '#E07856',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
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
    borderColor: '#E07856',
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
    backgroundColor: '#f5f5f5',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  saveButton: {
    backgroundColor: '#E07856',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
