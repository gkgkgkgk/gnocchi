import { useState } from 'react';
import { Modal, View, StyleSheet, Pressable, ActivityIndicator, TextInput } from 'react-native';
import { ThemedView } from './themed-view';
import { ThemedText } from './themed-text';
import { AITool } from '@/services/ai-tools-service';
import { useTheme } from '@/hooks/use-theme';
import { type Theme } from '@/constants/theme';

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
  const theme = useTheme();
  const styles = makeStyles(theme);
  const c = theme.colors;
  const textColor = c.fg;
  
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
                    placeholderTextColor={c.fgSubtle}
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
                <ActivityIndicator size="large" color={c.accent} />
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

function makeStyles(theme: Theme) {
  const c = theme.colors;
  return StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: c.overlay,
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
    ...theme.shadow.lg,
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
    borderColor: c.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: c.bgElevated,
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
    backgroundColor: c.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  checkmarkText: {
    fontSize: 36,
    color: c.accentFg,
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
    backgroundColor: c.accent,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: c.accentFg,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: c.border,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  });
}
