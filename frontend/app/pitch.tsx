import { useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
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
import { inputStyle } from '@/components/ui/Input';
import { Mascot } from '@/components/kitchen/mascot';
import { Tablecloth } from '@/components/kitchen/tablecloth';
import { Pot } from '@/components/kitchen/shapes';
import { Bob, easeColors, Rise, Sizzle } from '@/components/kitchen/motion';

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

  const openRecipeDraft = (recipe: any) => {
    const md = recipe.metadata ?? {};
    const importData = {
      title: recipe.title,
      ingredients: (recipe.ingredients ?? []).map((ing: any) => ({
        text: ing.text,
        id: '',
        quantity: String(ing.quantity ?? ''),
        unit: ing.unit ?? '',
        optional: !!ing.optional,
        section: ing.section ?? null,
      })),
      steps: recipe.instructions ?? recipe.steps ?? [],
      notes: recipe.notes ?? '',
      imageUrl: '',
      prepTime: String(md.prep_time ?? ''),
      cookTime: String(md.cook_time ?? ''),
      servings: String(md.servings ?? ''),
      source: '',
      sourceType: 'ai',
    };
    (global as any).__pendingRecipeImport = importData;
    router.push({ pathname: '/new-recipe', params: { fromImport: 'true' } } as any);
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
      <Tablecloth />
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
              <View style={styles.introArt} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                <Bob><Mascot size={104} /></Bob>
                <Sizzle active={loading} style={{ marginLeft: -14, marginBottom: -4 }}><Pot size={78} /></Sizzle>
              </View>
              <Text variant="h1" style={{ textAlign: 'center', marginTop: theme.spacing.lg }}>
                What are you in the mood for?
              </Text>
              <Text variant="body" color="fgMuted" style={{ textAlign: 'center', marginTop: theme.spacing.sm }}>
                Pitch a craving, an occasion, or a few ingredients. Then keep chatting to tweak it —
                &quot;make it vegan&quot;, &quot;less spicy&quot;, &quot;no oven&quot;.
              </Text>
              <View style={styles.exampleRow}>
                {EXAMPLES.map((ex) => (
                  <Chip key={ex} variant="outline" onPress={() => send(ex)}>{ex}</Chip>
                ))}
              </View>
            </View>
          )}

          {messages.map((m, i) => {
            const isLast = i === messages.length - 1;
            return (
              <View key={m.id}>
                {m.role === 'user' ? (
                  <Rise style={[styles.bubble, styles.userBubble, { backgroundColor: c.accent, borderColor: c.outline }]}>
                    <Text variant="body" style={{ color: c.accentFg }}>{m.text}</Text>
                  </Rise>
                ) : (
                  <Rise style={[styles.bubble, styles.assistantBubble, { backgroundColor: c.bgElevated, borderColor: c.outline }]}>
                    <Text variant="body" style={{ color: c.fg }}>{m.text}</Text>
                  </Rise>
                )}

                {/* Recipe card attached to an assistant turn */}
                {m.recipe && (
                  <AiRecipePreviewCard
                    recipe={m.recipe}
                    footer={
                      // Only the newest recipe is committable — older ones are history.
                      isLast ? (
                        <Button
                          onPress={() => openRecipeDraft(m.recipe)}
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
            <View style={[styles.bubble, styles.assistantBubble, { backgroundColor: c.bgElevated, borderColor: c.outline, flexDirection: 'row', alignItems: 'center', gap: 8 }]}>
              <Sizzle><Pot size={30} /></Sizzle>
              <Text variant="body" color="fgMuted">
                {started ? 'Reworking it…' : 'Dreaming up a recipe…'}
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Bottom-pinned composer */}
        <View style={[styles.composer, { backgroundColor: c.bg, borderTopColor: c.outline, paddingBottom: Math.max(insets.bottom, 10) }]}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder={started ? 'Ask for a change…' : 'Pitch a dish…'}
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
  introArt: { flexDirection: 'row', alignItems: 'flex-end' },
  exampleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 20, justifyContent: 'center' },
  bubble: { maxWidth: '88%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18, borderWidth: 2 },
  userBubble: { alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  assistantBubble: { alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
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
  sendButton: {
    width: 46,
    height: 46,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
