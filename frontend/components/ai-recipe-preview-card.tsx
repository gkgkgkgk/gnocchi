import { ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Text } from './ui/Text';
import { Chip } from './ui/Chip';
import { useTheme } from '@/hooks/use-theme';

interface AiRecipePreviewCardProps {
  /** AIRecipePayload shape: { title, ingredients:[{quantity,unit,text}], instructions|steps, notes, metadata }. */
  recipe: any;
  /** Show the full instruction list too (used in the chat so edits are visible). */
  showSteps?: boolean;
  /** Optional action row rendered at the bottom (e.g. Apply / Edit & save). */
  footer?: ReactNode;
}

/**
 * Compact recipe preview used by the "Pitch me a recipe" and per-recipe "Ask
 * AI" chats. Renders title, meta chips, the ingredient list, and (optionally)
 * the steps, with a caller-supplied action footer.
 */
export function AiRecipePreviewCard({ recipe, showSteps, footer }: AiRecipePreviewCardProps) {
  const theme = useTheme();
  const c = theme.colors;
  const md = recipe.metadata ?? {};
  const ingredients = recipe.ingredients ?? [];
  const steps = recipe.instructions ?? recipe.steps ?? [];
  const totalTime = (md.prep_time ?? 0) + (md.cook_time ?? 0);

  return (
    <View style={[styles.card, { backgroundColor: c.bgElevated, borderColor: c.border }]}>
      <Text variant="h3">{recipe.title || 'Untitled recipe'}</Text>

      <View style={styles.metaRow}>
        <Chip size="sm" icon={<Ionicons name="list-outline" size={13} color={c.fg} />}>
          {`${ingredients.length} ${ingredients.length === 1 ? 'ingredient' : 'ingredients'}`}
        </Chip>
        <Chip size="sm" icon={<Ionicons name="footsteps-outline" size={13} color={c.fg} />}>
          {`${steps.length} ${steps.length === 1 ? 'step' : 'steps'}`}
        </Chip>
        {!!md.servings && (
          <Chip size="sm" icon={<Ionicons name="people-outline" size={13} color={c.fg} />}>
            {`${md.servings} servings`}
          </Chip>
        )}
        {totalTime > 0 && (
          <Chip size="sm" tone={c.accent} icon={<Ionicons name="time-outline" size={13} color={c.accent} />}>
            {`${totalTime} min`}
          </Chip>
        )}
      </View>

      {ingredients.length > 0 && (
        <View style={styles.block}>
          <Text variant="label" color="fgMuted" style={styles.blockLabel}>Ingredients</Text>
          <View style={{ gap: 3 }}>
            {ingredients.map((ing: any, i: number) => {
              // Cap noisy floats (e.g. scaled amounts) at 2 decimals.
              const qty = typeof ing.quantity === 'number' ? Math.round(ing.quantity * 100) / 100 : ing.quantity;
              return (
                <Text key={i} variant="small" color="fgMuted">
                  {`• ${[qty, ing.unit, ing.text].filter(Boolean).join(' ')}`}
                </Text>
              );
            })}
          </View>
        </View>
      )}

      {showSteps && steps.length > 0 && (
        <View style={styles.block}>
          <Text variant="label" color="fgMuted" style={styles.blockLabel}>Steps</Text>
          <View style={{ gap: 6 }}>
            {steps.map((s: string, i: number) => (
              <Text key={i} variant="small" color="fgMuted">
                {`${i + 1}. ${s}`}
              </Text>
            ))}
          </View>
        </View>
      )}

      {footer}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 8,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    alignSelf: 'stretch',
  },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  block: { marginTop: 14 },
  blockLabel: { marginBottom: 6 },
});
