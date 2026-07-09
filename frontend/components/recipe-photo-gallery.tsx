import { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, Pressable, TextInput, Alert, ScrollView, ActivityIndicator, Modal, Dimensions, FlatList, Platform } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { pickImage } from '@/services/image-service';
import { uploadRecipePhoto } from '@/services/recipe-service';
import { api } from '@/lib/api';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface RecipePhotoGalleryProps {
  recipeId: string;
  images: string[];
  chosenImage: string | null;
  onUpdate: (images: string[], chosenImage: string | null) => void;
}

export function RecipePhotoGallery({ recipeId, images, chosenImage, onUpdate }: RecipePhotoGalleryProps) {
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const [galleryVisible, setGalleryVisible] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [imageToDelete, setImageToDelete] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);

  const handleAddFromUrl = async () => {
    if (!urlInput.trim()) {
      Alert.alert('Error', 'Please enter a valid URL');
      return;
    }

    const newImages = [...images, urlInput.trim()];
    const newChosenImage = chosenImage || urlInput.trim(); // Set as chosen if first image
    
    await updateRecipeImages(newImages, newChosenImage);
    setUrlInput('');
    setShowAddMenu(false);
  };

  const handleAddFromFile = async () => {
    try {
      setUploading(true);
      const uri = await pickImage();
      
      if (!uri) {
        setUploading(false);
        return;
      }

      // Upload to gnocchi-api; server returns {id, key, ord} and the
      // image is fetched via GET /images/{key}.
      const photo = await uploadRecipePhoto(recipeId, uri);
      const url = api.imageUrl(photo.key) ?? '';

      const newImages = [...images, url];
      const newChosenImage = chosenImage || url;
      
      await updateRecipeImages(newImages, newChosenImage);
      setShowAddMenu(false);
    } catch (error: any) {
      console.error('Failed to upload image:', error);
      Alert.alert('Error', error.message || 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleSetChosen = async (imageUrl: string) => {
    await updateRecipeImages(images, imageUrl);
  };

  const handleRemoveImage = async (imageUrl: string) => {
    setImageToDelete(imageUrl);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!imageToDelete) return;
    
    const newImages = images.filter((img: string) => img !== imageToDelete);
    const newChosenImage = chosenImage === imageToDelete 
      ? (newImages[0] || null) 
      : chosenImage;
    
    await updateRecipeImages(newImages, newChosenImage);
    setShowDeleteConfirm(false);
    setImageToDelete(null);
    setGalleryVisible(false);
  };

  const openGallery = (index: number) => {
    setCurrentImageIndex(index);
    setGalleryVisible(true);
    // Scroll to the selected image after modal opens
    setTimeout(() => {
      flatListRef.current?.scrollToIndex({ index, animated: false });
    }, 100);
  };

  const navigateImage = (direction: 'prev' | 'next') => {
    const newIndex = direction === 'prev'
      ? (currentImageIndex > 0 ? currentImageIndex - 1 : images.length - 1)
      : (currentImageIndex < images.length - 1 ? currentImageIndex + 1 : 0);
    
    setCurrentImageIndex(newIndex);
    flatListRef.current?.scrollToIndex({ index: newIndex, animated: true });
  };

  // Keyboard navigation for web
  useEffect(() => {
    if (Platform.OS !== 'web' || !galleryVisible) return;

    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') {
        navigateImage('prev');
      } else if (event.key === 'ArrowRight') {
        navigateImage('next');
      } else if (event.key === 'Escape') {
        setGalleryVisible(false);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [galleryVisible, currentImageIndex, images.length]);

  const updateRecipeImages = async (newImages: string[], newChosenImage: string | null) => {
    try {
      // The gnocchi-api schema doesn't track a URL list — photos are
      // uploaded via /recipes/{id}/photos and become RecipePhoto rows.
      // Cover image is a photo key (or, for URL-added images, a raw URL
      // string kept in cover_image). For URL adds we set cover_image only.
      await api.patch(`/recipes/${recipeId}`, { cover_image: newChosenImage });
      onUpdate(newImages, newChosenImage);
    } catch (error) {
      console.error('Failed to update images:', error);
      Alert.alert('Error', 'Failed to update images');
    }
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText style={styles.title}>Photos</ThemedText>
        <Pressable
          style={styles.addButton}
          onPress={() => setShowAddMenu(!showAddMenu)}
        >
          <Ionicons name="add-circle" size={28} color="#4CAF50" />
        </Pressable>
      </View>

      {/* Add Photo Menu */}
      {showAddMenu && (
        <View style={styles.addMenu}>
          <View style={styles.urlInputContainer}>
            <TextInput
              style={styles.urlInput}
              value={urlInput}
              onChangeText={setUrlInput}
              placeholder="Paste image URL..."
              placeholderTextColor="#999"
            />
            <Pressable style={styles.addUrlButton} onPress={handleAddFromUrl}>
              <ThemedText style={styles.addUrlButtonText}>Add</ThemedText>
            </Pressable>
          </View>

          <ThemedText style={styles.orText}>or</ThemedText>

          <Pressable
            style={styles.uploadButton}
            onPress={handleAddFromFile}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="cloud-upload" size={20} color="#fff" />
                <ThemedText style={styles.uploadButtonText}>Upload from Device</ThemedText>
              </>
            )}
          </Pressable>
        </View>
      )}

      {/* Photo Grid */}
      {images.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="images-outline" size={48} color="#ccc" />
          <ThemedText style={styles.emptyText}>No photos yet</ThemedText>
          <ThemedText style={styles.emptySubtext}>Add photos to showcase this recipe</ThemedText>
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.gallery}>
          {images.map((imageUrl: string, index: number) => (
            <Pressable key={index} onPress={() => openGallery(index)}>
              <View style={styles.photoContainer}>
                <Image
                  source={{ uri: imageUrl }}
                  style={styles.photo}
                  contentFit="cover"
                />
                
                {/* Star/Chosen indicator */}
                <Pressable
                  style={styles.starButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleSetChosen(imageUrl);
                  }}
                >
                  <Ionicons
                    name={chosenImage === imageUrl ? "star" : "star-outline"}
                    size={24}
                    color={chosenImage === imageUrl ? "#FFD700" : "#fff"}
                  />
                </Pressable>

                {/* Remove button */}
                <Pressable
                  style={styles.removeButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleRemoveImage(imageUrl);
                  }}
                >
                  <Ionicons name="close-circle" size={24} color="#ff4444" />
                </Pressable>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {/* Fullscreen Gallery Modal */}
      <Modal
        visible={galleryVisible}
        transparent={false}
        animationType="fade"
        onRequestClose={() => setGalleryVisible(false)}
        statusBarTranslucent
        presentationStyle="fullScreen"
      >
        <View style={styles.galleryModal}>
          {/* Close button */}
          <Pressable
            style={styles.closeButton}
            onPress={() => setGalleryVisible(false)}
          >
            <Ionicons name="close" size={32} color="#fff" />
          </Pressable>

          {/* Image carousel with FlatList */}
          <View style={styles.carouselContainer}>
            <FlatList
              ref={flatListRef}
              data={images}
              horizontal
              pagingEnabled={Platform.OS !== 'web'}
              scrollEnabled={Platform.OS !== 'web'} // Disable scroll on web, use arrows only
              showsHorizontalScrollIndicator={false}
              initialScrollIndex={currentImageIndex}
              contentContainerStyle={styles.flatListContent}
              getItemLayout={(_, index) => ({
                length: SCREEN_WIDTH,
                offset: SCREEN_WIDTH * index,
                index,
              })}
              onMomentumScrollEnd={(event) => {
                const index = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
                setCurrentImageIndex(index);
              }}
              renderItem={({ item }) => (
                <View style={styles.imageViewer}>
                  <Image
                    source={{ uri: item }}
                    style={styles.fullscreenImage}
                    contentFit="contain"
                  />
                </View>
              )}
              keyExtractor={(item, index) => `${item}-${index}`}
            />
          </View>

          {/* Navigation arrows - always visible on web, conditional on mobile */}
          {(Platform.OS === 'web' || images.length > 1) && (
            <>
              <Pressable
                style={[styles.navButton, styles.navButtonLeft]}
                onPress={() => navigateImage('prev')}
              >
                <Ionicons name="chevron-back" size={40} color="#fff" />
              </Pressable>
              <Pressable
                style={[styles.navButton, styles.navButtonRight]}
                onPress={() => navigateImage('next')}
              >
                <Ionicons name="chevron-forward" size={40} color="#fff" />
              </Pressable>
            </>
          )}

          {/* Image counter */}
          <View style={styles.imageCounter}>
            <ThemedText style={styles.counterText}>
              {currentImageIndex + 1} / {images.length}
            </ThemedText>
          </View>

          {/* Action buttons */}
          <View style={styles.galleryActions}>
            <Pressable
              style={styles.actionButton}
              onPress={() => handleSetChosen(images[currentImageIndex])}
            >
              <Ionicons
                name={chosenImage === images[currentImageIndex] ? "star" : "star-outline"}
                size={28}
                color={chosenImage === images[currentImageIndex] ? "#FFD700" : "#fff"}
              />
              <ThemedText style={styles.actionButtonText}>
                {chosenImage === images[currentImageIndex] ? 'Default' : 'Set Default'}
              </ThemedText>
            </Pressable>

            <Pressable
              style={styles.actionButton}
              onPress={() => handleRemoveImage(images[currentImageIndex])}
            >
              <Ionicons name="trash" size={28} color="#ff4444" />
              <ThemedText style={styles.actionButtonText}>Delete</ThemedText>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteConfirm(false)}
      >
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
                    setImageToDelete(null);
                  }}
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
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
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
  addMenu: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 8,
  },
  urlInputContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  urlInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
  },
  addUrlButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
  },
  addUrlButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  orText: {
    textAlign: 'center',
    opacity: 0.5,
    marginVertical: 8,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  uploadButtonText: {
    color: '#fff',
    fontWeight: '600',
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
  starButton: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: 4,
  },
  removeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: 4,
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
  cancelButton: {
    backgroundColor: '#e0e0e0',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  deleteButton: {
    backgroundColor: '#ff3b30',
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
