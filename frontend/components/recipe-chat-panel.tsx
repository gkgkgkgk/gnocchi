import { useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  KeyboardAvoidingView,
  Platform,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from './ui/Text';
import { Button } from './ui/Button';
import { Chip } from './ui/Chip';
import { AiRecipePreviewCard } from './ai-recipe-preview-card';
import { chatAboutRecipe, applyRecipeEdit, type Recipe } from '@/services/recipe-service';
import { useTheme } from '@/hooks/use-theme';
import { inputStyle } from './ui/Input';
import { blockPress, type PressState } from './ui/press';
import { Mascot } from './kitchen/mascot';
import { Pot } from './kitchen/shapes';
import { Tablecloth } from './kitchen/tablecloth';
import { easeColors, Rise, Sizzle } from './kitchen/motion';

interface RecipeChatPanelProps {
  visible: boolean;
  recipe: Recipe;
  onClose: () => void;
  /** Called with the refreshed recipe after an AI edit is applied. */
  onApplied: (updated: Recipe) => void;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  /** Present on assistant turns that proposed a change. */
  proposal?: any;
  applied?: boolean;
}

const SUGGESTIONS = [
  'What can I substitute for…?',
  'Make it vegetarian',
  'Scale it to 8 servings',
  'How do I know when it’s done?',
];

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function RecipeChatPanel({ visible, recipe, onClose, onApplied }: RecipeChatPanelProps) {
  const theme = useTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const started = messages.length > 0;
  const scrollToEnd = () => requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    const history = messages.map((m) => ({ role: m.role, text: m.text }));
    setMessages((prev) => [...prev, { id: uid(), role: 'user', text: trimmed }]);
    setInput('');
    setLoading(true);
    scrollToEnd();
    try {
      const { reply, changed, recipe: proposal } = await chatAboutRecipe(recipe, trimmed, history);
      setMessages((prev) => [
        ...prev,
        { id: uid(), role: 'assistant', text: reply || '…', proposal: changed ? proposal : undefined },
      ]);
      scrollToEnd();
    } catch (error: any) {
      console.error('Recipe chat failed:', error);
      setMessages((prev) => [
        ...prev,
        { id: uid(), role: 'assistant', text: error?.status === 503 ? 'AI is not configured for this kitchen yet.' : 'Sorry — I couldn’t answer that. Please try again.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const apply = async (msg: ChatMessage) => {
    if (!msg.proposal || applyingId) return;
    setApplyingId(msg.id);
    try {
      const updated = await applyRecipeEdit(recipe, msg.proposal);
      onApplied(updated);
      setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, applied: true } : m)));
    } catch (error: any) {
      console.error('Failed to apply edit:', error);
    } finally {
      setApplyingId(null);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="fullScreen">
      <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
        <Tablecloth />
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: c.outline, backgroundColor: c.bg }]}>
          <Mascot size={44} />
          <View style={{ flex: 1 }}>
            <Text variant="h3" numberOfLines={1}>Ask about this recipe</Text>
            <Text variant="small" color="fgSubtle" numberOfLines={1}>{recipe.title}</Text>
          </View>
          <Pressable onPress={onClose} hitSlop={8} accessibilityRole="button" accessibilityLabel="Close"
            style={(state) => [styles.closeBtn, { borderColor: c.outline, backgroundColor: c.bgElevated }, blockPress(theme, state as PressState, 2, 2)]}>
            <Ionicons name="close" size={20} color={c.fg} />
          </Pressable>
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={insets.top + 56}>
          <ScrollView
            ref={scrollRef}
            style={{ flex: 1 }}
            contentContainerStyle={styles.thread}
            onContentSizeChange={scrollToEnd}>
            {!started && (
              <View style={styles.intro}>
                <Text variant="h2" style={{ textAlign: 'center' }}>What would you like to know?</Text>
                <Text variant="body" color="fgMuted" style={{ textAlign: 'center', marginTop: theme.spacing.sm }}>
                  Ask anything about this recipe — subs, timing, technique — or ask me to tweak it.
                </Text>
                <View style={styles.suggestRow}>
                  {SUGGESTIONS.map((s) => (
                    <Chip key={s} variant="outline" onPress={() => send(s)}>{s}</Chip>
                  ))}
                </View>
              </View>
            )}

            {messages.map((m) => (
              <View key={m.id}>
                <Rise
                  style={[
                    styles.bubble,
                    { borderColor: c.outline },
                    m.role === 'user'
                      ? [styles.userBubble, { backgroundColor: c.accent }]
                      : [styles.assistantBubble, { backgroundColor: c.bgElevated }],
                  ]}>
                  <Text variant="body" style={{ color: m.role === 'user' ? c.accentFg : c.fg }}>
                    {m.text}
                  </Text>
                </Rise>

                {/* Inline preview of the revised recipe, with an apply action. */}
                {m.proposal && (
                  <AiRecipePreviewCard
                    recipe={m.proposal}
                    showSteps
                    footer={
                      m.applied ? (
                        <View style={[styles.appliedPill, { marginTop: theme.spacing.md }]}>
                          <Ionicons name="checkmark-circle" size={16} color={c.success} />
                          <Text variant="smallMedium" style={{ color: c.success }}>Saved as a new variation</Text>
                        </View>
                      ) : (
                        <Button
                          onPress={() => apply(m)}
                          loading={applyingId === m.id}
                          fullWidth
                          style={{ marginTop: theme.spacing.md }}
                          icon={<Ionicons name="checkmark" size={18} color={c.accentFg} />}>
                          Save as variation
                        </Button>
                      )
                    }
                  />
                )}
              </View>
            ))}

            {loading && (
              <View style={[styles.bubble, styles.assistantBubble, { backgroundColor: c.bgElevated, borderColor: c.outline, flexDirection: 'row', alignItems: 'center', gap: 8 }]}>
                <Sizzle><Pot size={30} /></Sizzle>
                <Text variant="body" color="fgMuted">Thinking…</Text>
              </View>
            )}
          </ScrollView>

          <View style={[styles.composer, { backgroundColor: c.bg, borderTopColor: c.outline, paddingBottom: Math.max(insets.bottom, 10) }]}>
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="Ask or request a change…"
              placeholderTextColor={c.fgSubtle}
              style={[inputStyle(theme), styles.composerInput]}
              multiline
              editable={!loading}
              onSubmitEditing={() => send(input)}
              returnKeyType="send"
              blurOnSubmit
            />
            <Pressable
              onPress={() => send(input)}
              disabled={loading || !input.trim()}
              accessibilityRole="button"
              accessibilityLabel="Send"
              style={[styles.sendButton, easeColors, { borderColor: c.outline, backgroundColor: input.trim() && !loading ? c.accent : c.bgMuted }, !!input.trim() && !loading && theme.shadow.sm]}>
              <Ionicons name="arrow-up" size={20} color={input.trim() && !loading ? c.accentFg : c.fgSubtle} />
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 2,
    gap: 12,
  },
  closeBtn: { width: 40, height: 40, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  thread: { padding: 16, gap: 12, flexGrow: 1 },
  intro: { alignItems: 'center', paddingTop: 24, paddingHorizontal: 12 },
  suggestRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 18, justifyContent: 'center' },
  bubble: { maxWidth: '88%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18, borderWidth: 2 },
  userBubble: { alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  assistantBubble: { alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
  appliedPill: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 12,
    paddingTop: 10,
    borderTopWidth: 2,
  },
  composerInput: {
    flex: 1,
    maxHeight: 120,
    minHeight: 44,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: 16,
  },
  sendButton: { width: 46, height: 46, borderRadius: 14, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
});
