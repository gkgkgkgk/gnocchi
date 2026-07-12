import { useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { AiRecipePreviewCard } from '@/components/ai-recipe-preview-card';
import { generateRecipeFromPitch, type PitchChatTurn } from '@/services/recipe-service';
import { useTheme } from '@/hooks/use-theme';

const EXAMPLES = [
  'A cozy one-pot autumn dinner with squash',
  'Quick weeknight pasta, under 30 minutes',
  'Use up leftover roast chicken',
  'An impressive but easy dinner-party dessert',
];

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  recipe?: any; // AIRecipePayload attached to assistant turns that produced one
}

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export default function PitchScreen() {
  const router = useRouter();
  const theme = useTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  // The most recent recipe the model produced — what "Edit & save" commits.
  const latestRecipe = [...messages].reverse().find((m) => m.recipe)?.recipe ?? null;
  const started = messages.length > 0;

  const scrollToEnd = () => {
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
  };

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsg: ChatMessage = { id: uid(), role: 'user', text: trimmed };
    const history: PitchChatTurn[] = messages.map((m) => ({ role: m.role, text: m.text }));
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    scrollToEnd();

    try {
      const { recipe, reply } = await generateRecipeFromPitch(trimmed, latestRecipe ?? undefined, history);
      setMessages((prev) => [
        ...prev,
        { id: uid(), role: 'assistant', text: reply || 'Here you go!', recipe },
      ]);
      scrollToEnd();
    } catch (error: any) {
      console.error('Pitch failed:', error);
      setMessages((prev) => [
        ...prev,
        { id: uid(), role: 'assistant', text: '⚠️ Sorry — I couldn’t come up with that. Try rephrasing?' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const useRecipe = (recipe: any) => {
    const md = recipe.metadata ?? {};
    const importData = {
      title: recipe.title,
      ingredients: (recipe.ingredients ?? []).map((ing: any) => ({
        text: ing.text,
        id: '',
        quantity: String(ing.quantity ?? ''),
        unit: ing.unit ?? '',
      })),
      steps: recipe.instructions ?? recipe.steps ?? [],
      notes: recipe.notes ?? '',
      imageUrl: '',
      prepTime: String(md.prep_time ?? ''),
      cookTime: String(md.cook_time ?? ''),
      servings: String(md.servings ?? ''),
      source: '',
    };
    (global as any).__pendingRecipeImport = importData;
    router.push({ pathname: '/new-recipe', params: { fromImport: 'true' } } as any);
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
      <ScreenHeader title="Pitch me a recipe" onBack={() => router.back()} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={insets.top + 52}>
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={styles.thread}
          onContentSizeChange={scrollToEnd}>
          {!started && (
            <View style={styles.intro}>
              <View style={[styles.introIcon, { backgroundColor: c.accentMuted }]}>
                <Ionicons name="sparkles" size={26} color={c.accent} />
              </View>
              <Text variant="h2" style={{ textAlign: 'center', marginTop: theme.spacing.md }}>
                What are you in the mood for?
              </Text>
              <Text variant="body" color="fgMuted" style={{ textAlign: 'center', marginTop: theme.spacing.sm }}>
                Pitch a craving, an occasion, or a few ingredients. Then keep chatting to tweak it —
                &quot;make it vegan&quot;, &quot;less spicy&quot;, &quot;no oven&quot;.
              </Text>
              <View style={styles.exampleRow}>
                {EXAMPLES.map((ex) => (
                  <Pressable key={ex} onPress={() => send(ex)}>
                    <Chip size="sm" tone={c.secondary}>{ex}</Chip>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {messages.map((m, i) => {
            const isLast = i === messages.length - 1;
            return (
              <View key={m.id}>
                {m.role === 'user' ? (
                  <View style={[styles.bubble, styles.userBubble, { backgroundColor: c.accent }]}>
                    <Text variant="body" style={{ color: c.accentFg }}>{m.text}</Text>
                  </View>
                ) : (
                  <View style={[styles.bubble, styles.assistantBubble, { backgroundColor: c.bgMuted }]}>
                    <Text variant="body" style={{ color: c.fg }}>{m.text}</Text>
                  </View>
                )}

                {/* Recipe card attached to an assistant turn */}
                {m.recipe && (
                  <AiRecipePreviewCard
                    recipe={m.recipe}
                    footer={
                      // Only the newest recipe is committable — older ones are history.
                      isLast ? (
                        <Button
                          onPress={() => useRecipe(m.recipe)}
                          fullWidth
                          style={{ marginTop: theme.spacing.lg }}
                          iconRight={<Ionicons name="arrow-forward" size={18} color={c.accentFg} />}>
                          Edit &amp; save
                        </Button>
                      ) : null
                    }
                  />
                )}
              </View>
            );
          })}

          {loading && (
            <View style={[styles.bubble, styles.assistantBubble, { backgroundColor: c.bgMuted, flexDirection: 'row', gap: 8 }]}>
              <ActivityIndicator size="small" color={c.accent} />
              <Text variant="body" color="fgMuted">
                {started ? 'Reworking it…' : 'Dreaming up a recipe…'}
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Bottom-pinned composer */}
        <View style={[styles.composer, { backgroundColor: c.bgElevated, borderTopColor: c.border, paddingBottom: Math.max(insets.bottom, 10) }]}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder={started ? 'Ask for a change…' : 'Pitch a dish…'}
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
            <Ionicons name="sparkles" size={20} color={input.trim() && !loading ? c.accentFg : c.fgSubtle} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  thread: { padding: 16, gap: 12, flexGrow: 1 },
  intro: { alignItems: 'center', paddingTop: 32, paddingHorizontal: 12 },
  introIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  exampleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 20, justifyContent: 'center' },
  bubble: { maxWidth: '88%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  userBubble: { alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  assistantBubble: { alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
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
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
