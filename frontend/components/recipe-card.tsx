import { useState } from 'react';
import { View, StyleSheet, Pressable, Image, Modal } from 'react-native';
import { Menu, MenuOptions, MenuOption, MenuTrigger } from 'react-native-popup-menu';
import { ThemedView } from './themed-view';
import { ThemedText } from './themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';

interface RecipeCardProps {
  id: string;
  title: string;
  imageUrl?: string;
  image_url?: string;
  metadata?: any;
  prepTime?: number;
  prep_time?: number;
  cookTime?: number;
  cook_time?: number;
  servings?: number;
  ingredients?: any[];
  onPress?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function RecipeCard(props: RecipeCardProps) {
  const {
    title,
    imageUrl,
    image_url,
    metadata,
    ingredients,
    onPress,
    onEdit,
    onDelete,
  } = props;
  console.log(props);

  const {
    cookTime,
    prepTime,
    servings
  } = metadata;

  // Handle both camelCase and snake_case from database
  const image = imageUrl || image_url;
  const prep = parseInt(prepTime) || 0;
  const cook = parseInt(cookTime) || 0;
  const totalTime = prep + cook;
  
  // Get theme colors
  const menuBackgroundColor = useThemeColor({}, 'background');
  const menuTextColor = useThemeColor({}, 'text');
  
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  return (
    <>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.card,
          pressed && styles.cardPressed,
        ]}
      >
        <ThemedView style={styles.cardContent}>
        {image ? (
          <Image source={{ uri: image }} style={styles.image} />
        ) : (
          <View style={styles.imagePlaceholder}>
            <ThemedText style={styles.placeholderText}>🍽️</ThemedText>
          </View>
        )}
        
        <View style={styles.info}>
          <View style={styles.titleRow}>
            <ThemedText style={styles.title} numberOfLines={3}>
              {title}
            </ThemedText>
            <Menu>
              <MenuTrigger
                customStyles={{
                  triggerWrapper: styles.menuButton,
                }}
              >
                <ThemedText style={[styles.menuIcon, { color: menuTextColor }]}>⋮</ThemedText>
              </MenuTrigger>
              <MenuOptions
                customStyles={{
                  optionsContainer: {
                    ...styles.menuOptionsContainer,
                    backgroundColor: menuBackgroundColor,
                  },
                }}
              >
                {onEdit && (
                  <MenuOption
                    onSelect={onEdit}
                    customStyles={{
                      optionWrapper: styles.menuItem,
                    }}
                  >
                    <ThemedText style={styles.menuItemText}>✏️ Edit</ThemedText>
                  </MenuOption>
                )}
                {onDelete && (
                  <MenuOption
                    onSelect={() => setShowDeleteConfirm(true)}
                    customStyles={{
                      optionWrapper: styles.menuItem,
                    }}
                  >
                    <ThemedText style={[styles.menuItemText, styles.menuItemTextDanger]}>
                      🗑️ Delete
                    </ThemedText>
                  </MenuOption>
                )}
              </MenuOptions>
            </Menu>
          </View>
          
          <View style={styles.metadata}>
            {totalTime > 0 && (
              <ThemedText style={styles.metadataText}>
                ⏱️ {totalTime} min
              </ThemedText>
            )}
            {ingredients && ingredients.length > 0 && (
              <ThemedText style={styles.metadataText}>
                🥘 {ingredients.length} ingredients
              </ThemedText>
            )}
          </View>
        </View>
      </ThemedView>
    </Pressable>
      
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
              <ThemedText style={styles.confirmTitle}>Delete Recipe</ThemedText>
              <ThemedText style={styles.confirmMessage}>
                Are you sure you want to delete this recipe? This action cannot be undone.
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
                    if (onDelete) {
                      onDelete();
                    }
                  }}
                >
                  <ThemedText style={styles.deleteButtonText}>Delete</ThemedText>
                </Pressable>
              </View>
            </ThemedView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    margin: 8,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardPressed: {
    opacity: 0.7,
  },
  cardContent: {
    flex: 1,
  },
  image: {
    width: '100%',
    height: 150,
    resizeMode: 'cover',
  },
  imagePlaceholder: {
    width: '100%',
    height: 150,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 48,
  },
  info: {
    padding: 12,
    minHeight: 80,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
    lineHeight: 22,
  },
  menuButton: {
    padding: 4,
  },
  menuIcon: {
    fontSize: 20,
    fontWeight: 'bold',
    opacity: 0.6,
  },
  menuOptionsContainer: {
    borderRadius: 8,
    padding: 4,
    minWidth: 140,
  },
  metadata: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  metadataText: {
    fontSize: 12,
    opacity: 0.7,
  },
  menuItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  menuItemDanger: {
    borderBottomWidth: 0,
  },
  menuItemText: {
    fontSize: 16,
  },
  menuItemTextDanger: {
    color: '#ff3b30',
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
