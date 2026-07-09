import { useState } from 'react';
import { Modal, View, StyleSheet, Pressable, ActivityIndicator, TextInput, useColorScheme } from 'react-native';
import { ThemedView } from './themed-view';
import { ThemedText } from './themed-text';
import { AITool } from '@/services/ai-tools-service';

interface ToolExecutionModalProps {
  visible: boolean;
  tool: AITool | null;
  loading: boolean;
  recipeReady: boolean;
  onConfirm: (userGuidance: string) => void;
  onOpenRecipe: () => void;
  onClose: () => void;
}

export function ToolExecutionModal({
  visible,
  tool,
  loading,
  recipeReady,
  onConfirm,
  onOpenRecipe,
  onClose,
}: ToolExecutionModalProps) {
  const [userGuidance, setUserGuidance] = useState('');
  const colorScheme = useColorScheme();
  const textColor = colorScheme === 'dark' ? '#fff' : '#000';
  
  const formatToolName = (toolName: string): string => {
    return toolName
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const handleConfirm = () => {
    onConfirm(userGuidance);
    setUserGuidance(''); // Reset for next use
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable 
        style={styles.overlay}
        onPress={onClose}
      >
        <Pressable 
          style={styles.modalContainer}
          onPress={(e) => e.stopPropagation()}
        >
          <ThemedView style={styles.modalContent}>
            {/* Header */}
            <View style={styles.header}>
              <ThemedText style={styles.icon}>{tool?.icon || '🤖'}</ThemedText>
              <ThemedText style={styles.title}>
                {tool ? formatToolName(tool.name) : 'Processing...'}
              </ThemedText>
              <ThemedText style={styles.subtitle}>
                {tool?.description || 'Generating your recipe'}
              </ThemedText>
            </View>

            {/* Content based on state */}
            {!loading && !recipeReady ? (
              // Confirmation step
              <View style={styles.confirmContainer}>
                <ThemedText style={styles.confirmText}>
                  Ready to transform your recipe?
                </ThemedText>
                <ThemedText style={styles.confirmSubtext}>
                  This will use AI to modify your recipe based on the selected tool.
                </ThemedText>
                
                {/* User Guidance Input */}
                <View style={styles.inputContainer}>
                  <ThemedText style={styles.inputLabel}>
                    Additional guidance (optional)
                  </ThemedText>
                  <TextInput
                    style={[styles.textInput, { color: textColor }]}
                    value={userGuidance}
                    onChangeText={(text) => setUserGuidance(text.slice(0, 50))}
                    placeholder="e.g., use almond milk, make it spicy"
                    placeholderTextColor="#999"
                    maxLength={50}
                  />
                  <ThemedText style={styles.charCount}>
                    {userGuidance.length}/50
                  </ThemedText>
                </View>
              </View>
            ) : loading ? (
              // Loading state
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#E07856" />
                <ThemedText style={styles.loadingText}>
                  Creating your modified recipe...
                </ThemedText>
                <ThemedText style={styles.loadingSubtext}>
                  This may take a few seconds
                </ThemedText>
              </View>
            ) : (
              // Success state
              <View style={styles.successContainer}>
                <View style={styles.checkmark}>
                  <ThemedText style={styles.checkmarkText}>✓</ThemedText>
                </View>
                <ThemedText style={styles.successText}>
                  Recipe ready!
                </ThemedText>
                <ThemedText style={styles.successSubtext}>
                  Your modified recipe has been generated
                </ThemedText>
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
              {!loading && !recipeReady ? (
                // Confirmation buttons
                <>
                  <Pressable
                    style={[styles.button, styles.primaryButton]}
                    onPress={handleConfirm}
                  >
                    <ThemedText style={styles.primaryButtonText}>
                      Generate Recipe
                    </ThemedText>
                  </Pressable>

                  <Pressable
                    style={[styles.button, styles.secondaryButton]}
                    onPress={onClose}
                  >
                    <ThemedText style={styles.secondaryButtonText}>
                      Cancel
                    </ThemedText>
                  </Pressable>
                </>
              ) : recipeReady ? (
                // Recipe ready button
                <Pressable
                  style={[styles.button, styles.primaryButton]}
                  onPress={onOpenRecipe}
                >
                  <ThemedText style={styles.primaryButtonText}>
                    Open Recipe
                  </ThemedText>
                </Pressable>
              ) : null}
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
  modalContent: {
    borderRadius: 16,
    padding: 24,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  icon: {
    fontSize: 48,
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.7,
    textAlign: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  loadingSubtext: {
    fontSize: 13,
    opacity: 0.6,
    marginTop: 8,
    textAlign: 'center',
  },
  confirmContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  confirmText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  confirmSubtext: {
    fontSize: 13,
    opacity: 0.6,
    textAlign: 'center',
    marginBottom: 16,
  },
  inputContainer: {
    width: '100%',
    marginTop: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    opacity: 0.8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#fff',
  },
  charCount: {
    fontSize: 11,
    opacity: 0.5,
    marginTop: 4,
    textAlign: 'right',
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  checkmark: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E07856',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  checkmarkText: {
    fontSize: 36,
    color: '#fff',
    fontWeight: 'bold',
  },
  successText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  successSubtext: {
    fontSize: 13,
    opacity: 0.6,
    textAlign: 'center',
  },
  buttonContainer: {
    gap: 12,
    marginTop: 8,
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#E07856',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.2)',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
