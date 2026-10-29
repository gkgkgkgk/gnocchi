import { useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Chip } from '@/components/ui/Chip';
import { Card } from '@/components/ui/Card';
import { Board, Plate, Pot, Skillet, Tomato } from '@/components/kitchen/shapes';
import { Mascot } from '@/components/kitchen/mascot';
import { Bob, Rise, Sizzle } from '@/components/kitchen/motion';
import { importFromPinterest, importFromWebsite, importFromText, ImportResponse } from '@/services/pinterest-service';
import { useTheme } from '@/hooks/use-theme';
import { useResponsive } from '@/hooks/use-responsive';

type Source = 'pinterest' | 'instagram' | 'website' | 'text';

const SOURCE_META: Record<Source, { label: string; icon: keyof typeof Ionicons.glyphMap }> = {
  pinterest: { label: 'Pinterest pin', icon: 'logo-pinterest' },
  instagram: { label: 'Instagram post', icon: 'logo-instagram' },
  website:   { label: 'Recipe link', icon: 'link-outline' },
  text:      { label: 'Recipe text', icon: 'document-text-outline' },
};

/** A lone URL is a link to fetch; anything else is recipe text to read. */
function detectSource(input: string): Source | null {
  const s = input.trim();
  if (!s) return null;
  if (/^(https?:\/\/|www\.)\S+$/i.test(s)) {
    const u = s.toLowerCase();
    if (u.includes('pinterest.') || u.includes('pin.it')) return 'pinterest';
    if (u.includes('instagram.')) return 'instagram';
    return 'website';
  }
  return 'text';
}

/**
 * "What's cooking?" — the one place to add a recipe. Paste a link or a whole
 * recipe into the box and it's read straight into the editor to check over;
 * or snap a photo, pitch an idea, or start from a blank board.
 */
export default function AddRecipeScreen() {
  const router = useRouter();
  const theme = useTheme();
  const c = theme.colors;
  const { isWide } = useResponsive();
  const [input, setInput] = useState('');
  // After an Instagram link, the pasted caption keeps the post as its source.
  const [captionFor, setCaptionFor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const source = useMemo(() => detectSource(input), [input]);
  const tooShort = source === 'text' && input.trim().length < 20;
  const canRead = !!source && source !== 'instagram' && !tooShort && !loading;

  const openEditor = (result: ImportResponse, sourceType: string) => {
    const r = result.recipe;
    (global as any).__pendingRecipeImport = {
      title: r.title,
      ingredients: (r.ingredients ?? []).map((ing: any) => ({
        text: ing.text,
        id: '',
        quantity: String(ing.quantity ?? ''),
        unit: ing.unit ?? '',
        optional: !!ing.optional,
        section: ing.section ?? null,
      })),
      steps: r.steps ?? [],
      notes: r.notes ?? '',
      imageUrl: result.source_image ?? '',
      prepTime: String(r.prep_time ?? ''),
      cookTime: String(r.cook_time ?? ''),
      servings: String(r.servings ?? ''),
      source: result.source_url ?? '',
      sourceType: r.source_type ?? sourceType,
    };
    router.replace({ pathname: '/new-recipe', params: { fromImport: 'true' } } as any);
  };

  const read = async () => {
    if (!canRead || !source) return;
    setLoading(true);
    setError(null);
    try {
      const body = input.trim();
      const result =
        source === 'text' ? await importFromText(body, captionFor ?? undefined)
        : source === 'pinterest' ? await importFromPinterest(body)
        : await importFromWebsite(body);
      const r = result.recipe;
      if (!(r.ingredients?.length) && !(r.steps?.length)) {
        setError("Couldn't find ingredients or steps in that. Try the whole page or caption, or start from scratch.");
        return;
      }
      openEditor(result, source);
    } catch (err: any) {
      console.error('Import failed:', err);
      setError(err?.message || "Couldn't read a recipe from that.");
    } finally {
      setLoading(false);
    }
  };

  const ways = [
    { key: 'photo', title: 'Snap a photo', line: 'A cookbook page, a card, a screenshot', Art: Plate, go: () => router.push('/scan-photo' as any) },
    { key: 'pitch', title: 'Pitch an idea', line: 'Describe a craving and AI writes it', Art: Pot, go: () => router.push('/pitch' as any) },
    { key: 'scratch', title: 'Start from scratch', line: 'Type it in yourself', Art: Board, go: () => router.replace('/new-recipe' as any) },
  ];

  return (
    <Screen>
      <ScrollView contentContainerStyle={[styles.content, isWide && styles.contentWide]} keyboardShouldPersistTaps="handled">
        <View style={styles.topRow}>
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Close"
            hitSlop={8}
            style={[styles.close, { borderColor: c.outline, backgroundColor: c.bgElevated, ...theme.shadow.sm }]}
          >
            <Ionicons name="close" size={20} color={c.fg} />
          </Pressable>
        </View>

        <View style={styles.hero}>
          <View style={{ flex: 1 }}>
            <Text variant="display">What&apos;s cooking?</Text>
            <Text variant="body" color="fgMuted" style={{ marginTop: theme.spacing.sm, maxWidth: 420 }}>
              Paste a link or a whole recipe. Gnocchi pulls out the ingredients and steps for you to check over.
            </Text>
          </View>
          <View style={styles.heroArt} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <Bob><Mascot size={isWide ? 120 : 84} /></Bob>
            <Sizzle active={loading} style={{ marginLeft: -18, marginBottom: -6 }}>
              <Skillet size={isWide ? 92 : 64} rotate={-24} />
            </Sizzle>
            <View style={{ position: 'absolute', right: -4, top: -6 }}><Tomato size={isWide ? 34 : 26} /></View>
          </View>
        </View>

        <Card inset elevated style={{ marginTop: theme.spacing.xl }}>
          <View style={styles.labelRow}>
            <Text variant="label" color="fgMuted">{captionFor ? 'Paste the caption' : 'Link or recipe'}</Text>
            {source && (
              <Chip size="sm" icon={<Ionicons name={SOURCE_META[source].icon} size={13} color={c.accent} />}>
                {SOURCE_META[source].label}
              </Chip>
            )}
          </View>
          <Input
            value={input}
            onChangeText={(t) => { setInput(t); setError(null); }}
            placeholder={captionFor
              ? 'Paste the Instagram caption here'
              : 'https://… or paste the ingredients and steps, a caption, a text from a friend'}
            editable={!loading}
            multiline
            autoCapitalize="none"
            autoCorrect={source === 'text'}
            textAlignVertical="top"
            accessibilityLabel="Recipe link or text"
            style={{ marginTop: theme.spacing.sm, minHeight: source === 'text' ? 200 : 96, lineHeight: 22 }}
          />

          {source === 'instagram' && (
            <View style={[styles.note, { backgroundColor: c.butterMuted, borderColor: c.outline }]}>
              <Text variant="bodyMedium">Instagram keeps its posts from being read by apps.</Text>
              <Text variant="small" color="fgMuted">Copy the caption and paste it here, or screenshot it and snap a photo.</Text>
              <View style={styles.noteActions}>
                <Button size="sm" onPress={() => { setCaptionFor(input.trim()); setInput(''); }}>Paste the caption</Button>
                <Button size="sm" variant="secondary" onPress={() => router.push('/scan-photo' as any)}>Scan a screenshot</Button>
              </View>
            </View>
          )}

          {error && (
            <Text variant="small" color="danger" style={{ marginTop: theme.spacing.md }} accessibilityLiveRegion="polite">
              {error}
            </Text>
          )}

          {source !== 'instagram' && (
            <Button
              onPress={read}
              loading={loading}
              disabled={!canRead}
              fullWidth
              size="lg"
              style={{ marginTop: theme.spacing.lg }}
              iconRight={!loading ? <Ionicons name="arrow-forward" size={18} color={c.accentFg} /> : undefined}
            >
              {loading ? 'Reading…' : tooShort ? 'Keep pasting…' : 'Read the recipe'}
            </Button>
          )}
          {loading && (
            <Text variant="small" color="fgMuted" style={{ marginTop: theme.spacing.sm, textAlign: 'center' }}>
              This takes a few seconds.
            </Text>
          )}
        </Card>

        <Text variant="label" color="fgSubtle" style={{ marginTop: theme.spacing['2xl'], marginBottom: theme.spacing.md }}>
          OR
        </Text>
        <View style={[styles.ways, isWide && { flexDirection: 'row' }]}>
          {ways.map(({ key, title, line, Art, go }, i) => (
            <Rise key={key} index={i + 1} style={isWide ? { flex: 1 } : undefined}>
              <Card onPress={go} style={[styles.way, isWide && { flexDirection: 'column', alignItems: 'flex-start', flex: 1 }]}>
                <Art size={56} />
                <View style={{ flex: isWide ? undefined : 1 }}>
                  <Text variant="h3">{title}</Text>
                  <Text variant="small" color="fgMuted">{line}</Text>
                </View>
              </Card>
            </Rise>
          ))}
        </View>

        <Text variant="small" color="fgSubtle" style={{ marginTop: theme.spacing.xl }}>
          You can also tell Claude a recipe out loud; it saves straight into Gnocchi.
        </Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 48 },
  contentWide: { width: '100%', maxWidth: 760, alignSelf: 'center', paddingTop: 32 },
  topRow: { flexDirection: 'row' },
  close: { width: 40, height: 40, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 20 },
  heroArt: { flexDirection: 'row', alignItems: 'flex-end' },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 28 },
  note: { marginTop: 14, padding: 14, borderRadius: 14, borderWidth: 2, gap: 4 },
  noteActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 },
  ways: { gap: 14 },
  way: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
});
