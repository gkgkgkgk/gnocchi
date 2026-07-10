import { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, Pressable, Alert, ScrollView, ActivityIndicator, Modal, Dimensions, FlatList, Platform } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { pickImage } from '@/services/image-service';
import {
  uploadRecipePhoto,
  deleteRecipePhoto,
  setPhotoAsCover,
  reorderRecipePhotos,
  fetchRecipeById,
  type Recipe,
  type RecipePhoto,
} from '@/services/recipe-service';
import { api } from '@/lib/api';
import { useTheme } from '@/hooks/use-theme';
import { type Theme } from '@/constants/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface RecipePhotoGalleryProps {
  recipeId: string;
  photos: RecipePhoto[];
  /** recipe.cover_image — the storage key of the current cover photo. */
  coverKey: string | null;
  /** Called with the freshly-refetched recipe after any mutation. */
  onChange: (recipe: Recipe) => void;
}

export function RecipePhotoGallery({ recipeId, photos, coverKey, onChange }: RecipePhotoGalleryProps) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const c = theme.colors;
  const [busy, setBusy] = useState(false);
  const [galleryVisible, setGalleryVisible] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [photoToDelete, setPhotoToDelete] = useState<RecipePhoto | null>(null);
  const flatListRef = useRef<FlatList>(null);

  // Ordered copy; the backend orders by `ord`, but be defensive.
  const ordered = [...photos].sort((a, b) => a.ord - b.ord);
  const isCover = (p: RecipePhoto) => !!coverKey && p.key === coverKey;
  const urlFor = (p: RecipePhoto) => api.imageUrl(p.key) ?? '';

  const refresh = async () => {
    const fresh = await fetchRecipeById(recipeId);
    if (fresh) onChange(fresh);
  };

  const withBusy = async (fn: () => Promise<void>, failMsg: string) => {
    try {
      setBusy(true);
      await fn();
      await refresh();
    } catch (error: any) {
      console.error(failMsg, error);
      Alert.alert('Error', error?.message || failMsg);
    } finally {
      setBusy(false);
    }
  };

  const handleAddFromFile = () =>
    withBusy(async () => {
      const uri = await pickImage();
      if (!uri) return;
      await uploadRecipePhoto(recipeId, uri);
    }, 'Failed to upload photo');

  const handleSetCover = (p: RecipePhoto) =>
    withBusy(() => setPhotoAsCover(recipeId, p.id).then(() => {}), 'Failed to set cover');

  const move = (index: number, dir: -1 | 1) => {
    const next = index + dir;
    if (next < 0 || next >= ordered.length) return;
    const reordered = [...ordered];
    const [item] = reordered.splice(index, 1);
    reordered.splice(next, 0, item);
    return withBusy(
      () => reorderRecipePhotos(recipeId, reordered.map((p) => p.id)).then(() => {}),
      'Failed to reorder photos',
    );
  };

  const handleRemove = (p: RecipePhoto) => {
    setPhotoToDelete(p);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    const p = photoToDelete;
    setShowDeleteConfirm(false);
    setPhotoToDelete(null);
    setGalleryVisible(false);
    if (!p) return;
    await withBusy(() => deleteRecipePhoto(recipeId, p.id), 'Failed to delete photo');
  };

  const openGallery = (index: number) => {
    setCurrentImageIndex(index);
    setGalleryVisible(true);
    setTimeout(() => {
      flatListRef.current?.scrollToIndex({ index, animated: false });
    }, 100);
  };

  const navigateImage = (direction: 'prev' | 'next') => {
    const n = ordered.length;
    if (n === 0) return;
    const newIndex =
      direction === 'prev'
        ? (currentImageIndex > 0 ? currentImageIndex - 1 : n - 1)
        : (currentImageIndex < n - 1 ? currentImageIndex + 1 : 0);
    setCurrentImageIndex(newIndex);
    flatListRef.current?.scrollToIndex({ index: newIndex, animated: true });
  };

  // Keyboard navigation for web.
  useEffect(() => {
    if (Platform.OS !== 'web' || !galleryVisible) return;
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') navigateImage('prev');
      else if (event.key === 'ArrowRight') navigateImage('next');
      else if (event.key === 'Escape') setGalleryVisible(false);
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [galleryVisible, currentImageIndex, ordered.length]);

  const carouselUris = ordered.map(urlFor);

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText style={styles.title}>Photos</ThemedText>
        <Pressable style={styles.addButton} onPress={handleAddFromFile} disabled={busy}>
          {busy ? (
            <ActivityIndicator size="small" color={c.accent} />
          ) : (
            <Ionicons name="add-circle" size={28} color={c.accent} />
          )}
        </Pressable>
      </View>

      {ordered.length === 0 ? (
        <Pressable style={styles.emptyState} onPress={handleAddFromFile} disabled={busy}>
          <Ionicons name="images-outline" size={48} color={c.fgSubtle} />
          <ThemedText style={styles.emptyText}>No photos yet</ThemedText>
          <ThemedText style={styles.emptySubtext}>Tap to add a photo of this dish</ThemedText>
        </Pressable>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.gallery}>
          {ordered.map((photo, index) => (
            <View key={photo.id} style={styles.photoContainer}>
              <Pressable onPress={() => openGallery(index)}>
                <Image source={{ uri: urlFor(photo) }} style={styles.photo} contentFit="cover" />
              </Pressable>

              {isCover(photo) && (
                <View style={styles.coverBadge}>
                  <Ionicons name="star" size={12} color={c.accentFg} />
                  <ThemedText style={styles.coverBadgeText}>Cover</ThemedText>
                </View>
              )}

              {/* Set cover */}
              {!isCover(photo) && (
                <Pressable style={styles.starButton} onPress={() => handleSetCover(photo)} disabled={busy}>
                  <Ionicons name="star-outline" size={20} color="#fff" />
                </Pressable>
              )}

              {/* Remove */}
              <Pressable style={styles.removeButton} onPress={() => handleRemove(photo)} disabled={busy}>
                <Ionicons name="close-circle" size={22} color="#fff" />
              </Pressable>

              {/* Reorder */}
              <View style={styles.reorderRow}>
                <Pressable
                  style={[styles.reorderButton, index === 0 && styles.reorderDisabled]}
                  onPress={() => move(index, -1)}
                  disabled={busy || index === 0}>
                  <Ionicons name="chevron-back" size={18} color="#fff" />
                </Pressable>
                <Pressable
                  style={[styles.reorderButton, index === ordered.length - 1 && styles.reorderDisabled]}
                  onPress={() => move(index, 1)}
                  disabled={busy || index === ordered.length - 1}>
                  <Ionicons name="chevron-forward" size={18} color="#fff" />
                </Pressable>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Fullscreen viewer */}
      <Modal
        visible={galleryVisible}
        transparent={false}
        animationType="fade"
        onRequestClose={() => setGalleryVisible(false)}
        statusBarTranslucent
        presentationStyle="fullScreen">
        <View style={styles.galleryModal}>
          <Pressable style={styles.closeButton} onPress={() => setGalleryVisible(false)}>
            <Ionicons name="close" size={32} color="#fff" />
          </Pressable>

          <View style={styles.carouselContainer}>
            <FlatList
              ref={flatListRef}
              data={carouselUris}
              horizontal
              pagingEnabled={Platform.OS !== 'web'}
              scrollEnabled={Platform.OS !== 'web'}
              showsHorizontalScrollIndicator={false}
              initialScrollIndex={currentImageIndex}
              contentContainerStyle={styles.flatListContent}
              getItemLayout={(_, index) => ({ length: SCREEN_WIDTH, offset: SCREEN_WIDTH * index, index })}
              onMomentumScrollEnd={(event) => {
                const index = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
                setCurrentImageIndex(index);
              }}
              renderItem={({ item }) => (
                <View style={styles.imageViewer}>
                  <Image source={{ uri: item }} style={styles.fullscreenImage} contentFit="contain" />
                </View>
              )}
              keyExtractor={(item, index) => `${item}-${index}`}
            />
          </View>

          {(Platform.OS === 'web' || ordered.length > 1) && (
            <>
              <Pressable style={[styles.navButton, styles.navButtonLeft]} onPress={() => navigateImage('prev')}>
                <Ionicons name="chevron-back" size={40} color="#fff" />
              </Pressable>
              <Pressable style={[styles.navButton, styles.navButtonRight]} onPress={() => navigateImage('next')}>
                <Ionicons name="chevron-forward" size={40} color="#fff" />
              </Pressable>
            </>
          )}

          <View style={styles.imageCounter}>
            <ThemedText style={styles.counterText}>
              {currentImageIndex + 1} / {ordered.length}
            </ThemedText>
          </View>

          <View style={styles.galleryActions}>
            {ordered[currentImageIndex] && !isCover(ordered[currentImageIndex]) && (
              <Pressable style={styles.actionButton} onPress={() => handleSetCover(ordered[currentImageIndex])}>
                <Ionicons name="star-outline" size={28} color="#fff" />
                <ThemedText style={styles.actionButtonText}>Set Cover</ThemedText>
              </Pressable>
            )}
            {ordered[currentImageIndex] && (
              <Pressable style={styles.actionButton} onPress={() => handleRemove(ordered[currentImageIndex])}>
                <Ionicons name="trash" size={28} color="#fff" />
                <ThemedText style={styles.actionButtonText}>Delete</ThemedText>
              </Pressable>
            )}
          </View>
        </View>
      </Modal>

      {/* Delete confirmation */}
      <Modal visible={showDeleteConfirm} transparent animationType="fade" onRequestClose={() => setShowDeleteConfirm(false)}>
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmModal}>
            <ThemedView style={styles.confirmContent}>
              <ThemedText style={styles.confirmTitle}>Delete Photo</ThemedText>
              <ThemedText style={styles.confirmMessage}>
                Are you sure you want to delete this photo? This action cannot be undone.
              </ThemedText>
              <View style={styles.confirmButtons}>
                <Pressable
                  style={[styles.confirmButton, styles.cancelButton]}
                  onPress={() => {
                    setShowDeleteConfirm(false);
                    setPhotoToDelete(null);
                  }}>
                  <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
                </Pressable>
                <Pressable style={[styles.confirmButton, styles.deleteButton]} onPress={confirmDelete}>
                  <ThemedText style={styles.deleteButtonText}>Delete</ThemedText>
                </Pressable>
              </View>
            </ThemedView>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

function makeStyles(theme: Theme) {
  const c = theme.colors;
  return StyleSheet.create({
    container: {
      padding: 16,
      borderRadius: 12,
      marginBottom: 16,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    title: {
      fontSize: 20,
      fontWeight: 'bold',
    },
    addButton: {
      padding: 4,
    },
    emptyState: {
      alignItems: 'center',
      padding: 32,
    },
    emptyText: {
      fontSize: 16,
      fontWeight: '600',
      marginTop: 12,
      opacity: 0.6,
    },
    emptySubtext: {
      fontSize: 14,
      marginTop: 4,
      opacity: 0.4,
    },
    gallery: {
      marginTop: 8,
    },
    photoContainer: {
      position: 'relative',
      marginRight: 12,
      borderRadius: 12,
      overflow: 'hidden',
    },
    photo: {
      width: 200,
      height: 200,
      borderRadius: 12,
    },
    coverBadge: {
      position: 'absolute',
      top: 8,
      left: 8,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: c.accent,
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    coverBadgeText: {
      color: c.accentFg,
      fontSize: 11,
      fontWeight: '700',
    },
    starButton: {
      position: 'absolute',
      top: 8,
      left: 8,
      backgroundColor: 'rgba(0, 0, 0, 0.45)',
      borderRadius: 20,
      padding: 6,
    },
    removeButton: {
      position: 'absolute',
      top: 8,
      right: 8,
      backgroundColor: 'rgba(0, 0, 0, 0.45)',
      borderRadius: 20,
      padding: 4,
    },
    reorderRow: {
      position: 'absolute',
      bottom: 8,
      right: 8,
      flexDirection: 'row',
      gap: 6,
    },
    reorderButton: {
      backgroundColor: 'rgba(0, 0, 0, 0.45)',
      borderRadius: 16,
      padding: 5,
    },
    reorderDisabled: {
      opacity: 0.3,
    },
    galleryModal: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.95)',
    },
    closeButton: {
      position: 'absolute',
      top: 50,
      right: 20,
      zIndex: 10,
      padding: 8,
    },
    imageViewer: {
      width: SCREEN_WIDTH,
      height: SCREEN_HEIGHT * 0.7,
      justifyContent: 'center',
      alignItems: 'center',
    },
    carouselContainer: {
      width: SCREEN_WIDTH,
      height: SCREEN_HEIGHT,
      overflow: 'hidden',
      justifyContent: 'center',
    },
    flatListContent: {
      alignItems: 'center',
    },
    fullscreenImage: {
      width: SCREEN_WIDTH,
      height: SCREEN_HEIGHT * 0.7,
    },
    navButton: {
      position: 'absolute',
      top: '50%',
      padding: 12,
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      borderRadius: 30,
    },
    navButtonLeft: {
      left: 20,
    },
    navButtonRight: {
      right: 20,
    },
    imageCounter: {
      position: 'absolute',
      top: 60,
      alignSelf: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
    },
    counterText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '600',
    },
    galleryActions: {
      position: 'absolute',
      bottom: 40,
      flexDirection: 'row',
      gap: 20,
      alignSelf: 'center',
    },
    actionButton: {
      alignItems: 'center',
      padding: 12,
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      borderRadius: 12,
      minWidth: 100,
    },
    actionButtonText: {
      color: '#fff',
      fontSize: 12,
      marginTop: 4,
      fontWeight: '600',
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
  });
}
