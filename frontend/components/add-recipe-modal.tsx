import { Modal, View, StyleSheet, Pressable } from 'react-native';
import { ThemedView } from './themed-view';
import { ThemedText } from './themed-text';

interface AddRecipeModalProps {
  visible: boolean;
  onClose: () => void;
  onAddFromPinterest: () => void;
  onAddManually: () => void;
  onAddFromWebsite: () => void;
  onScanPhoto: () => void;
}

export function AddRecipeModal({
  visible,
  onClose,
  onAddFromPinterest,
  onAddManually,
  onAddFromWebsite,
  onScanPhoto,
}: AddRecipeModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.modalContainer} onPress={(e) => e.stopPropagation()}>
          <ThemedView style={styles.modal}>
            {/* Header */}
            <View style={styles.header}>
              <ThemedText style={styles.title}>Add Recipe</ThemedText>
              <Pressable onPress={onClose} style={styles.closeButton}>
                <ThemedText style={styles.closeButtonText}>✕</ThemedText>
              </Pressable>
            </View>

            {/* Options */}
            <View style={styles.optionsContainer}>
              <Pressable
                style={styles.optionButton}
                onPress={onAddFromPinterest}
              >
                <ThemedText style={styles.optionIcon}>📌</ThemedText>
                <View style={styles.optionTextContainer}>
                  <ThemedText style={styles.optionTitle}>Add from Pinterest</ThemedText>
                  <ThemedText style={styles.optionSubtitle}>
                    Import a recipe from Pinterest
                  </ThemedText>
                </View>
              </Pressable>

              <Pressable
                style={styles.optionButton}
                onPress={onAddFromWebsite}
              >
                <ThemedText style={styles.optionIcon}>🌐</ThemedText>
                <View style={styles.optionTextContainer}>
                  <ThemedText style={styles.optionTitle}>Add from Website</ThemedText>
                  <ThemedText style={styles.optionSubtitle}>
                    Import from any recipe website
                  </ThemedText>
                </View>
              </Pressable>

              <Pressable
                style={styles.optionButton}
                onPress={onScanPhoto}
              >
                <ThemedText style={styles.optionIcon}>📸</ThemedText>
                <View style={styles.optionTextContainer}>
                  <ThemedText style={styles.optionTitle}>Scan Photo</ThemedText>
                  <ThemedText style={styles.optionSubtitle}>
                    Take a photo or upload an image
                  </ThemedText>
                </View>
              </Pressable>

              <Pressable
                style={styles.optionButton}
                onPress={onAddManually}
              >
                <ThemedText style={styles.optionIcon}>✏️</ThemedText>
                <View style={styles.optionTextContainer}>
                  <ThemedText style={styles.optionTitle}>Add Manually</ThemedText>
                  <ThemedText style={styles.optionSubtitle}>
                    Create a recipe from scratch
                  </ThemedText>
                </View>
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 400,
  },
  modal: {
    borderRadius: 16,
    padding: 24,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  closeButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 24,
    opacity: 0.6,
  },
  optionsContainer: {
    gap: 12,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: 'transparent',
  },
  optionIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  optionSubtitle: {
    fontSize: 14,
    opacity: 0.6,
  },
});
