import { useState, useEffect } from 'react';
import { View, StyleSheet, Modal, Pressable, TextInput, ActivityIndicator, Animated } from 'react-native';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { type Theme } from '@/constants/theme';

interface Question {
  id: string;
  question: string;
  type: 'text' | 'multiselect';
  options?: string[];
  isDisplayName?: boolean;
}

const QUESTIONS: Question[] = [
  {
    id: 'display_name',
    question: 'What should we call you?',
    type: 'text',
    isDisplayName: true,
  },
  {
    id: 'favorite_food',
    question: 'What is your favorite food?',
    type: 'text',
  },
  {
    id: 'dietary_restrictions',
    question: 'Do you have any dietary restrictions?',
    type: 'multiselect',
    options: [
      'None',
      'Vegetarian',
      'Vegan',
      'Gluten-Free',
      'Dairy-Free',
      'Nut Allergy',
      'Kosher',
      'Halal',
    ],
  },
];

interface ProfileQuestionnaireModalProps {
  visible: boolean;
  onComplete: (answers: Record<string, any>) => void;
}

export function ProfileQuestionnaireModal({ visible, onComplete }: ProfileQuestionnaireModalProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [currentAnswer, setCurrentAnswer] = useState<string>('');
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(1));
  const theme = useTheme();
  const styles = makeStyles(theme);
  const c = theme.colors;

  const currentQuestion = QUESTIONS[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === QUESTIONS.length - 1;
  const textColor = c.fg;

  // No user auth in this build; default the display-name suggestion to "Chef".
  useEffect(() => {
    if (visible && currentQuestionIndex === 0 && !currentAnswer) {
      setCurrentAnswer('Chef');
    }
  }, [visible, currentQuestionIndex, currentAnswer]);

  const handleNext = async () => {
    // Save current answer
    const newAnswers = { ...answers };
    if (currentQuestion.type === 'text') {
      newAnswers[currentQuestion.id] = currentAnswer;
    } else if (currentQuestion.type === 'multiselect') {
      newAnswers[currentQuestion.id] = selectedOptions;
    }
    setAnswers(newAnswers);

    if (isLastQuestion) {
      // Submit all answers
      try {
        setSubmitting(true);
        await onComplete(newAnswers);
      } catch (error) {
        console.error('Failed to create profile:', error);
      } finally {
        setSubmitting(false);
      }
    } else {
      // Fade out, move to next question, fade in
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      setTimeout(() => {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
        // Load saved answer if going back
        const nextQuestion = QUESTIONS[currentQuestionIndex + 1];
        if (nextQuestion.type === 'text') {
          setCurrentAnswer(newAnswers[nextQuestion.id] || '');
        } else if (nextQuestion.type === 'multiselect') {
          setSelectedOptions(newAnswers[nextQuestion.id] || []);
        }
      }, 200);
    }
  };

  const handleBack = () => {
    if (currentQuestionIndex > 0) {
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      setTimeout(() => {
        setCurrentQuestionIndex(currentQuestionIndex - 1);
        const prevQuestion = QUESTIONS[currentQuestionIndex - 1];
        if (prevQuestion.type === 'text') {
          setCurrentAnswer(answers[prevQuestion.id] || '');
        } else if (prevQuestion.type === 'multiselect') {
          setSelectedOptions(answers[prevQuestion.id] || []);
        }
      }, 200);
    }
  };

  const toggleOption = (option: string) => {
    if (selectedOptions.includes(option)) {
      setSelectedOptions(selectedOptions.filter(o => o !== option));
    } else {
      setSelectedOptions([...selectedOptions, option]);
    }
  };

  const canProceed = () => {
    if (currentQuestion.type === 'text') {
      return currentAnswer.trim().length > 0;
    } else if (currentQuestion.type === 'multiselect') {
      return selectedOptions.length > 0;
    }
    return false;
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => {}} // Prevent closing by back button
    >
      <View style={styles.overlay}>
        <ThemedView style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <ThemedText style={styles.emoji}>👋</ThemedText>
            <ThemedText style={styles.title}>Welcome to Gnocchi!</ThemedText>
            <ThemedText style={styles.subtitle}>
              Question {currentQuestionIndex + 1} of {QUESTIONS.length}
            </ThemedText>
          </View>

          {/* Question Card */}
          <Animated.View style={[styles.questionCard, { opacity: fadeAnim }]}>
            <ThemedText style={styles.questionText}>
              {currentQuestion.question}
            </ThemedText>

            {/* Answer Input */}
            {currentQuestion.type === 'text' ? (
              <TextInput
                style={[styles.textInput, { color: textColor }]}
                value={currentAnswer}
                onChangeText={setCurrentAnswer}
                placeholder={currentQuestion.isDisplayName ? "Your name" : "Type your answer..."}
                placeholderTextColor={c.fgSubtle}
                multiline={!currentQuestion.isDisplayName}
                autoFocus
              />
            ) : (
              <View style={styles.optionsContainer}>
                {currentQuestion.options?.map((option) => (
                  <Pressable
                    key={option}
                    style={[
                      styles.optionButton,
                      selectedOptions.includes(option) && styles.optionButtonSelected,
                    ]}
                    onPress={() => toggleOption(option)}
                  >
                    <ThemedText
                      style={[
                        styles.optionText,
                        selectedOptions.includes(option) && styles.optionTextSelected,
                      ]}
                    >
                      {option}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>
            )}
          </Animated.View>

          {/* Navigation Buttons */}
          <View style={styles.navigationButtons}>
            {currentQuestionIndex > 0 && (
              <Pressable style={styles.backButton} onPress={handleBack}>
                <ThemedText style={styles.backButtonText}>← Back</ThemedText>
              </Pressable>
            )}
            
            <Pressable
              style={[
                styles.nextButton,
                !canProceed() && styles.nextButtonDisabled,
                currentQuestionIndex === 0 && styles.nextButtonFull,
              ]}
              onPress={handleNext}
              disabled={!canProceed() || submitting}
            >
              {submitting ? (
                <ActivityIndicator color={c.accentFg} />
              ) : (
                <ThemedText style={styles.nextButtonText}>
                  {isLastQuestion ? 'Complete' : 'Next →'}
                </ThemedText>
              )}
            </Pressable>
          </View>
        </ThemedView>
      </View>
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
    maxWidth: 500,
    borderRadius: 16,
    padding: 24,
    ...theme.shadow.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  emoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.6,
    textAlign: 'center',
  },
  questionCard: {
    marginBottom: 24,
    minHeight: 200,
  },
  questionText: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 20,
    lineHeight: 28,
  },
  textInput: {
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
    backgroundColor: c.bgElevated,
  },
  optionsContainer: {
    gap: 12,
  },
  optionButton: {
    borderWidth: 2,
    borderColor: c.border,
    borderRadius: 12,
    padding: 16,
    backgroundColor: 'transparent',
  },
  optionButtonSelected: {
    borderColor: c.accent,
    backgroundColor: c.accentMuted,
  },
  optionText: {
    fontSize: 16,
    textAlign: 'center',
  },
  optionTextSelected: {
    fontWeight: '600',
    color: c.accent,
  },
  navigationButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  backButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  nextButton: {
    flex: 2,
    backgroundColor: c.accent,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  nextButtonFull: {
    flex: 1,
  },
  nextButtonDisabled: {
    opacity: 0.5,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: c.accentFg,
  },
  });
}
