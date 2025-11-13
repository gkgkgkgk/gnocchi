import { useState } from 'react';
import { View, StyleSheet, Pressable, Modal } from 'react-native';
import { Menu, MenuOptions, MenuOption, MenuTrigger } from 'react-native-popup-menu';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColor } from '@/hooks/use-theme-color';

interface CookbookCardProps {
  id: string;
  name: string;
  description?: string;
  cover_color?: string;
  recipe_count?: number;
  onPress: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function CookbookCard({
  name,
  description,
  cover_color = '#4CAF50',
  recipe_count = 0,
  onPress,
  onEdit,
  onDelete,
}: CookbookCardProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const menuBackgroundColor = useThemeColor({}, 'background');
  const menuTextColor = useThemeColor({}, 'text');

  return (
    <>
      <Pressable
        style={({ pressed }) => [
          styles.container,
          pressed && styles.pressed,
        ]}
        onPress={onPress}
      >
      {/* Book spine/shadow effect */}
      <View style={[styles.bookSpine, { backgroundColor: cover_color }]} />
      
      {/* Book cover */}
      <View style={[styles.bookCover, { backgroundColor: cover_color }]}>
        {/* Book title */}
        <View style={styles.titleContainer}>
          <ThemedText style={styles.title} numberOfLines={2}>
            {name}
          </ThemedText>
          {description && (
            <ThemedText style={styles.description} numberOfLines={2}>
              {description}
            </ThemedText>
          )}
        </View>
        
        {/* Recipe count badge */}
        <View style={styles.badge}>
          <Ionicons name="restaurant" size={14} color="#fff" />
          <ThemedText style={styles.badgeText}>
            {recipe_count} {recipe_count === 1 ? 'recipe' : 'recipes'}
          </ThemedText>
        </View>
        
        {/* Decorative elements */}
        <View style={styles.decoration}>
          <View style={styles.decorativeLine} />
          <View style={styles.decorativeLine} />
        </View>
      </View>
      
      {/* Menu */}
      {(onEdit || onDelete) && (
        <View style={styles.menuContainer}>
          <Menu>
            <MenuTrigger
              customStyles={{
                triggerWrapper: styles.menuButton,
              }}
            >
              <ThemedText style={styles.menuIcon}>⋮</ThemedText>
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
      )}
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
              <ThemedText style={styles.confirmTitle}>Delete Cookbook</ThemedText>
              <ThemedText style={styles.confirmMessage}>
                Are you sure you want to delete this cookbook? The recipes will not be deleted.
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
  container: {
    width: '100%',
    aspectRatio: 0.7, // Taller than wide, like a book
    position: 'relative',
    marginBottom: 8,
  },
  pressed: {
    opacity: 0.8,
  },
  bookSpine: {
    position: 'absolute',
    left: 0,
    top: 8,
    bottom: 8,
    width: 12,
    borderTopLeftRadius: 4,
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  bookCover: {
    position: 'absolute',
    left: 8,
    top: 0,
    right: 0,
    bottom: 0,
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
    justifyContent: 'space-between',
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  description: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.9,
    fontStyle: 'italic',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
    gap: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  decoration: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    gap: 4,
  },
  decorativeLine: {
    width: 40,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 1,
  },
  menuContainer: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 10,
  },
  menuButton: {
    padding: 8,
    borderRadius: 12,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuIcon: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  menuOptionsContainer: {
    borderRadius: 8,
    padding: 4,
    minWidth: 140,
  },
  menuItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
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
