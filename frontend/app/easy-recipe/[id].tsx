import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CookTimers, TimerSuggestion } from '@/components/cook-timers';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { blockPress, type PressState } from '@/components/ui/press';
import { Mascot } from '@/components/kitchen/mascot';
import { Board, Pot } from '@/components/kitchen/shapes';
import { Bob, FadeIn, Pop, Rise, easeColors } from '@/components/kitchen/motion';
import { Tablecloth } from '@/components/kitchen/tablecloth';
import { fetchRecipeById, Recipe } from '@/services/recipe-service';
import { fetchUnits, Unit } from '@/services/unit-service';
import { getUnitPreference, type UnitPreference } from '@/services/profile-service';
import { scaleForDisplay } from '@/utils/unit-conversion';
import { formatAmount, groupBySection } from '@/utils/ingredient-formatter';
import { useTheme } from '@/hooks/use-theme';
import { useResponsive } from '@/hooks/use-responsive';
import { fonts } from '@/constants/theme';

const VERB_RE = /\b(bake|roast|simmer|boil|cook|fry|sauté|saute|steam|chill|rest|marinate|proof|rise|grill|braise|poach|refrigerate|freeze|knead|whisk|reduce|toast|broil|steep|soak)\b/i;
const TIME_RE = /(\d+)\s*(hours?|hrs?|minutes?|mins?|seconds?|secs?)/gi;

/** Pull "cook for 20 minutes"-style durations out of steps into quick-add
 *  timer chips. First number of a range wins; deduped by duration. */
function deriveTimerSuggestions(steps: string[]): TimerSuggestion[] {
  const out: TimerSuggestion[] = [];
  const seen = new Set<number>();
  steps.forEach((step, i) => {
    if (!step) return;
    TIME_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = TIME_RE.exec(step)) !== null) {
      const n = parseInt(m[1], 10);
      if (!n) continue;
      const unit = m[2].toLowerCase();
      const seconds = unit.startsWith('h') ? n * 3600 : unit.startsWith('m') ? n * 60 : n;
      if (seconds < 30 || seconds > 6 * 3600 || seen.has(seconds)) continue;
      seen.add(seconds);
      const verb = step.match(VERB_RE)?.[1];
      const label = verb ? verb[0].toUpperCase() + verb.slice(1).toLowerCase() : `Step ${i + 1}`;
      out.push({ label, seconds });
    }
  });
  return out.slice(0, 5);
}

const SCALES: [number, string][] = [[0.5, '½×'], [1, '1×'], [1.5, '1½×'], [2, '2×'], [3, '3×']];

/**
 * Cook mode: big type to read from the stove, the mise en place to tick off,
 * and the method one burner at a time. The current step is lit; "Done" moves
 * the heat to the next one. Timers sit with the method.
 */
export default function CookMode() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const c = theme.colors;
  const { isWide } = useResponsive();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [multiplier, setMultiplier] = useState(1);
  const [units, setUnits] = useState<Unit[]>([]);
  const [unitPref, setUnitPref] = useState<UnitPreference>('as_written');
  const [prepped, setPrepped] = useState<Set<number>>(new Set());
  const [current, setCurrent] = useState(0);
  const [view, setView] = useState<'prep' | 'method'>('prep');

  const timerSuggestions = useMemo(() => deriveTimerSuggestions(recipe?.steps ?? []), [recipe?.steps]);

  useEffect(() => {
    (async () => {
      try {
        setRecipe(await fetchRecipeById(id as string));
      } catch (error) {
        console.error('Failed to load recipe:', error);
      } finally {
        setLoading(false);
      }
    })();
    fetchUnits().then(setUnits).catch(() => {});
    getUnitPreference().then(setUnitPref).catch(() => {});
  }, [id]);

  if (loading || !recipe) {
    return (
      <View style={[styles.fill, styles.center, { backgroundColor: c.bg }]}>
        <Bob><Mascot size={110} /></Bob>
        {loading ? <ActivityIndicator color={c.accent} style={{ marginTop: 18 }} /> : <Text variant="h2" style={{ marginTop: 18 }}>Recipe not found</Text>}
      </View>
    );
  }

  const steps = recipe.steps ?? [];
  const finished = current >= steps.length;
  const togglePrep = (i: number) => setPrepped((prev) => {
    const next = new Set(prev);
    next.has(i) ? next.delete(i) : next.add(i);
    return next;
  });

  const prepPanel = (
    <View style={[styles.panel, { backgroundColor: c.bgElevated, borderColor: c.outline, ...theme.shadow.md }]}>
      <View style={styles.panelHead}>
        <Board size={42} rotate={-10} />
        <Text variant="h2" accessibilityRole="header">Mise en place</Text>
        <View style={{ flex: 1 }} />
        <Text variant="label" color="fgMuted">{prepped.size}/{recipe.ingredients.length}</Text>
      </View>
      <View style={styles.scaleRow} accessibilityRole="radiogroup" accessibilityLabel="Recipe size">
        {SCALES.map(([value, label]) => (
          <Pressable key={label} onPress={() => setMultiplier(value)} accessibilityRole="radio" accessibilityState={{ checked: multiplier === value }}
            style={[styles.scaleChip, easeColors, { borderColor: multiplier === value ? c.outline : c.borderStrong, backgroundColor: multiplier === value ? c.accentMuted : c.bgElevated }]}>
            <Text variant="label" style={{ fontSize: 14 }}>{label}</Text>
          </Pressable>
        ))}
      </View>
      {groupBySection(recipe.ingredients).map((group, gi) => (
        <View key={gi}>
          {group.section && <Text variant="label" color="accent" style={styles.section}>{group.section}</Text>}
          {group.items.map(({ item, index }) => {
            const name = item.ingredient?.name || item.text || 'Unknown';
            const scaled = scaleForDisplay(item.quantity, item.unit, multiplier, units, unitPref);
            const amount = formatAmount(scaled.quantity, scaled.unit);
            const done = prepped.has(index);
            return (
              <Pressable key={index} onPress={() => togglePrep(index)} accessibilityRole="checkbox" accessibilityState={{ checked: done }} style={styles.prepRow}>
                <Pop trigger={done} style={[styles.bowl, easeColors, { borderColor: c.outline, backgroundColor: done ? c.butter : c.bgElevated }]}>
                  {done && <Ionicons name="checkmark" size={16} color={c.outline} />}
                </Pop>
                <Text style={[styles.prepText, { color: c.fgMuted }, done && { textDecorationLine: 'line-through', opacity: 0.6 }]}>
                  <Text style={[styles.prepText, { color: c.fg, fontFamily: fonts.sansSb, fontWeight: '600' }]}>{name}</Text>
                  {amount ? `, ${amount}` : ''}
                  {item.optional ? ' (optional)' : ''}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );

  const methodPanel = (
    <View style={{ gap: 20 }}>
      <CookTimers suggestions={timerSuggestions} />
      <View style={[styles.panel, { backgroundColor: c.bgElevated, borderColor: c.outline, ...theme.shadow.md }]}>
        <View style={styles.panelHead}>
          <Pot size={44} />
          <Text variant="h2" accessibilityRole="header">Method</Text>
          <View style={{ flex: 1 }} />
          <Text variant="label" color="fgMuted">{Math.min(current + 1, steps.length)}/{steps.length}</Text>
        </View>
        {steps.map((step, i) => {
          const lit = i === current;
          const done = i < current;
          return (
            <Pressable
              key={i}
              onPress={() => setCurrent(i)}
              accessibilityRole="button"
              accessibilityLabel={`Step ${i + 1}${done ? ', done' : lit ? ', current' : ''}`}
              style={[styles.step, easeColors, lit && [styles.stepLit, { backgroundColor: c.butterMuted, borderColor: c.outline, ...theme.shadow.sm }], done && { opacity: 0.45 }]}
            >
              <Pop trigger={lit}>
                <View style={[styles.burner, easeColors, { borderColor: c.outline, backgroundColor: lit ? c.tomato : done ? c.bgMuted : c.bgElevated }]}>
                  <View style={[styles.burnerRing, { borderColor: lit ? c.accentFg : c.borderStrong }]} />
                  {done ? <Ionicons name="checkmark" size={18} color={c.fgMuted} />
                    : <Text variant="label" style={{ color: lit ? c.accentFg : c.fg, fontSize: 15 }}>{i + 1}</Text>}
                </View>
              </Pop>
              <View style={{ flex: 1, gap: 12 }}>
                <Text style={[lit ? styles.stepTextLit : styles.stepText, !isWide && lit && { fontSize: 19, lineHeight: 29 }, { color: c.fg, fontFamily: theme.type.body.fontFamily }]}>{step}</Text>
                {lit && (
                  <Button onPress={() => setCurrent(i + 1)} icon={<Ionicons name="checkmark" size={18} color={c.accentFg} />}>
                    {i + 1 < steps.length ? 'Done, next step' : 'Done'}
                  </Button>
                )}
              </View>
            </Pressable>
          );
        })}
        {finished && steps.length > 0 && (
          <Rise style={[styles.finished, { borderColor: c.outline, backgroundColor: c.basilMuted }]}>
            <Bob><Mascot size={72} /></Bob>
            <View style={{ flex: 1, gap: 8 }}>
              <Text variant="h2">Dinner&apos;s up!</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                <Button size="sm" onPress={() => router.replace(`/recipe/${id}` as any)}>Back to the recipe</Button>
                <Button size="sm" variant="secondary" onPress={() => setCurrent(0)}>Start over</Button>
              </View>
            </View>
          </Rise>
        )}
      </View>
    </View>
  );

  return (
    <FadeIn style={[styles.fill, { backgroundColor: c.bg }]}>
      <Tablecloth />
      <View style={[styles.topBar, { paddingTop: insets.top + 10, borderBottomColor: c.outline, backgroundColor: c.bg }]}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace(`/recipe/${id}` as any))}
          accessibilityRole="button"
          accessibilityLabel="Back to the recipe"
          style={(state) => [styles.iconBlock, { backgroundColor: c.bgElevated, borderColor: c.outline }, blockPress(theme, state as PressState, 2, 2)]}
        >
          <Ionicons name="chevron-back" size={20} color={c.fg} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text variant="label" color="accent">COOKING</Text>
          <Text variant="h2" numberOfLines={1}>{recipe.title}</Text>
        </View>
      </View>

      {!isWide && (
        <View style={[styles.segment, { borderColor: c.outline, backgroundColor: c.bgElevated }]} accessibilityRole="tablist">
          {(['prep', 'method'] as const).map((v) => (
            <Pressable key={v} onPress={() => setView(v)} accessibilityRole="tab" accessibilityState={{ selected: view === v }}
              style={[styles.segmentItem, easeColors, view === v && { backgroundColor: c.accent }]}>
              <Text variant="button" style={{ color: view === v ? c.accentFg : c.fg }}>{v === 'prep' ? 'Mise en place' : 'Method'}</Text>
            </Pressable>
          ))}
        </View>
      )}

      <ScrollView contentContainerStyle={[styles.content, isWide && styles.contentWide]}>
        {isWide ? (
          <View style={styles.twoPane}>
            <Rise index={0} style={{ flex: 5, minWidth: 0 }}>{prepPanel}</Rise>
            <Rise index={1} style={{ flex: 7, minWidth: 0 }}>{methodPanel}</Rise>
          </View>
        ) : (
          <Rise key={view}>{view === 'prep' ? prepPanel : methodPanel}</Rise>
        )}
      </ScrollView>
    </FadeIn>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 2 },
  iconBlock: { width: 42, height: 42, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  segment: { flexDirection: 'row', margin: 16, marginBottom: 0, borderWidth: 2, borderRadius: 14, overflow: 'hidden' },
  segmentItem: { flex: 1, alignItems: 'center', paddingVertical: 11 },
  content: { padding: 16, paddingBottom: 64 },
  contentWide: { width: '100%', maxWidth: 1240, alignSelf: 'center', padding: 28 },
  twoPane: { flexDirection: 'row', gap: 24, alignItems: 'flex-start' },
  panel: { borderRadius: 24, borderWidth: 2, padding: 20 },
  panelHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  scaleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  scaleChip: { borderWidth: 2, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 },
  section: { textTransform: 'uppercase', letterSpacing: 0.8, fontSize: 14, marginTop: 18, marginBottom: 4 },
  prepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, paddingVertical: 8 },
  bowl: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  prepText: { flex: 1, fontSize: 19, lineHeight: 28 },
  step: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, padding: 12, borderRadius: 18, borderWidth: 2, borderColor: 'transparent', marginBottom: 6 },
  stepLit: { padding: 16 },
  burner: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  burnerRing: { position: 'absolute', width: 32, height: 32, borderRadius: 16, borderWidth: 1.5, opacity: 0.8 },
  stepText: { fontSize: 18, lineHeight: 28, paddingTop: 8 },
  stepTextLit: { fontSize: 22, lineHeight: 33, paddingTop: 4 },
  finished: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 18, borderWidth: 2, marginTop: 8 },
});
