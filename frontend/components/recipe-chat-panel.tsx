import { useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
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
        { id: uid(), role: 'assistant', text: '⚠️ Sorry — something went wrong. Try again?' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const apply = async (msg: ChatMessage) => {
    if (!msg.proposal || applyingId) return;
    setApplyingId(msg.id);
    try {
      const updated = await applyRecipeEdit(recipe.id, msg.proposal);
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
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: c.border }]}>
          <View style={{ flex: 1 }}>
            <Text variant="h3" numberOfLines={1}>Ask about this recipe</Text>
            <Text variant="small" color="fgSubtle" numberOfLines={1}>{recipe.title}</Text>
          </View>
          <Pressable onPress={onClose} hitSlop={8} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color={c.fgMuted} />
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
                <View style={[styles.introIcon, { backgroundColor: c.accentMuted }]}>
                  <Ionicons name="chatbubbles-outline" size={24} color={c.accent} />
                </View>
                <Text variant="body" color="fgMuted" style={{ textAlign: 'center', marginTop: theme.spacing.md }}>
                  Ask anything about this recipe — subs, timing, technique — or ask me to tweak it.
                </Text>
                <View style={styles.suggestRow}>
                  {SUGGESTIONS.map((s) => (
                    <Pressable key={s} onPress={() => send(s)}>
                      <Chip size="sm" tone={c.secondary}>{s}</Chip>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {messages.map((m) => (
              <View key={m.id}>
                <View
                  style={[
                    styles.bubble,
                    m.role === 'user'
                      ? [styles.userBubble, { backgroundColor: c.accent }]
                      : [styles.assistantBubble, { backgroundColor: c.bgMuted }],
                  ]}>
                  <Text variant="body" style={{ color: m.role === 'user' ? c.accentFg : c.fg }}>
                    {m.text}
                  </Text>
                </View>

                {/* Inline preview of the revised recipe, with an apply action. */}
                {m.proposal && (
                  <AiRecipePreviewCard
                    recipe={m.proposal}
                    showSteps
                    footer={
                      m.applied ? (
                        <View style={[styles.appliedPill, { marginTop: theme.spacing.md }]}>
                          <Ionicons name="checkmark-circle" size={16} color={c.success} />
                          <Text variant="smallMedium" style={{ color: c.success }}>Changes applied to your recipe</Text>
                        </View>
                      ) : (
                        <Button
                          onPress={() => apply(m)}
                          loading={applyingId === m.id}
                          fullWidth
                          style={{ marginTop: theme.spacing.md }}
                          icon={<Ionicons name="checkmark" size={18} color={c.accentFg} />}>
                          Apply changes
                        </Button>
                      )
                    }
                  />
                )}
              </View>
            ))}

            {loading && (
              <View style={[styles.bubble, styles.assistantBubble, { backgroundColor: c.bgMuted, flexDirection: 'row', gap: 8 }]}>
                <ActivityIndicator size="small" color={c.accent} />
                <Text variant="body" color="fgMuted">Thinking…</Text>
              </View>
            )}
          </ScrollView>

          <View style={[styles.composer, { backgroundColor: c.bgElevated, borderTopColor: c.border, paddingBottom: Math.max(insets.bottom, 10) }]}>
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="Ask or request a change…"
              placeholderTextColor={c.fgSubtle}
              style={[styles.composerInput, { backgroundColor: c.bgMuted, color: c.fg }]}
              multiline
              editable={!loading}
              onSubmitEditing={() => send(input)}
              returnKeyType="send"
              blurOnSubmit
            />
            <Pressable
              onPress={() => send(input)}
              disabled={loading || !input.trim()}
              style={[styles.sendButton, { backgroundColor: input.trim() && !loading ? c.accent : c.border }]}>
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
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  closeBtn: { padding: 4 },
  thread: { padding: 16, gap: 12, flexGrow: 1 },
  intro: { alignItems: 'center', paddingTop: 24, paddingHorizontal: 12 },
  introIcon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  suggestRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 18, justifyContent: 'center' },
  bubble: { maxWidth: '88%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  userBubble: { alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  assistantBubble: { alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
  appliedPill: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  composerInput: {
    flex: 1,
    maxHeight: 120,
    minHeight: 44,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: 16,
  },
  sendButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
