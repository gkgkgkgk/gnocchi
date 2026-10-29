import { createElement, useState } from 'react';
import { Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Text } from './ui/Text';
import { Button } from './ui/Button';
import { Chip } from './ui/Chip';
import { inputStyle } from './ui/Input';
import { Rise } from './kitchen/motion';
import { CookHistoryEntry } from '@/services/recipe-service';
import { useTheme } from '@/hooks/use-theme';

function isoDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return isoDay(d);
}
function formatDay(iso: string): string {
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

const QUICK: [string, number][] = [['Today', 0], ['Yesterday', 1], ['2 days ago', 2], ['Last week', 7]];

interface CookLogProps {
  entries: CookHistoryEntry[];
  /** Remove the entry at this index of `entries`. */
  onRemove: (index: number) => void;
  onAdd: (entry: CookHistoryEntry) => Promise<void>;
}

/**
 * Every time the recipe was made, newest first. Entries can be removed (for a
 * mis-tap) and past cooks added with a date and a note.
 */
export function CookLog({ entries, onRemove, onAdd }: CookLogProps) {
  const theme = useTheme();
  const c = theme.colors;
  const [adding, setAdding] = useState(false);
  const [day, setDay] = useState(daysAgo(1));
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const ordered = entries.map((e, index) => ({ e, index })).sort((a, b) => b.e.date.localeCompare(a.e.date));
  const validDay = /^\d{4}-\d{2}-\d{2}$/.test(day) && !isNaN(new Date(`${day}T12:00:00`).getTime());

  const save = async () => {
    if (!validDay) return;
    setSaving(true);
    try {
      await onAdd({ date: new Date(`${day}T12:00:00`).toISOString(), note: note.trim() });
      setAdding(false);
      setNote('');
      setDay(daysAgo(1));
    } finally {
      setSaving(false);
    }
  };

  // The browser's own date picker on web; a typed date on device.
  const dateField = Platform.OS === 'web'
    ? createElement('input', {
        type: 'date',
        value: day,
        max: isoDay(new Date()),
        onChange: (e: any) => setDay(e.target.value),
        'aria-label': 'Date cooked',
        style: {
          ...inputStyle(theme, { focused: false }),
          padding: '9px 12px', fontSize: 16, borderStyle: 'solid', colorScheme: theme.scheme,
        },
      })
    : (
      <TextInput
        value={day}
        onChangeText={setDay}
        placeholder="YYYY-MM-DD"
        placeholderTextColor={c.fgSubtle}
        accessibilityLabel="Date cooked"
        style={[inputStyle(theme, { error: !validDay }), { paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 }]}
      />
    );

  return (
    <View>
      {ordered.length === 0 && !adding && (
        <Text variant="body" color="fgSubtle">Not cooked yet. Tap “I cooked this” after you make it.</Text>
      )}
      <View style={{ gap: 4 }}>
        {ordered.slice(0, 12).map(({ e, index }) => (
          <Rise key={`${e.date}-${index}`} style={styles.row}>
            <View style={[styles.dot, { backgroundColor: c.butter, borderColor: c.outline }]} />
            <View style={{ flex: 1 }}>
              <Text variant="bodyMedium">{formatDay(e.date)}</Text>
              {!!e.note && <Text variant="small" color="fgMuted">{e.note}</Text>}
            </View>
            <Pressable
              onPress={() => onRemove(index)}
              accessibilityRole="button"
              accessibilityLabel={`Remove the cook on ${formatDay(e.date)}`}
              hitSlop={6}
              style={styles.remove}
            >
              <Ionicons name="close" size={18} color={c.fgSubtle} />
            </Pressable>
          </Rise>
        ))}
        {ordered.length > 12 && <Text variant="small" color="fgSubtle" style={{ marginLeft: 24 }}>+ {ordered.length - 12} earlier</Text>}
      </View>

      {adding ? (
        <Rise style={[styles.addBox, { borderColor: c.outline, backgroundColor: c.butterMuted }]}>
          <Text variant="label" color="fgMuted">When did you make it?</Text>
          <View style={styles.quick}>
            {QUICK.map(([label, n]) => (
              <Chip key={label} size="sm" variant={day === daysAgo(n) ? 'accent' : 'outline'} onPress={() => setDay(daysAgo(n))}>{label}</Chip>
            ))}
          </View>
          {dateField}
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="A note, if you like (doubled the garlic…)"
            placeholderTextColor={c.fgSubtle}
            accessibilityLabel="Note"
            style={[inputStyle(theme), { paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, marginTop: 10 }]}
          />
          <View style={styles.addActions}>
            <Button size="sm" variant="ghost" onPress={() => setAdding(false)}>Cancel</Button>
            <Button size="sm" onPress={save} loading={saving} disabled={!validDay}>Add to log</Button>
          </View>
        </Rise>
      ) : (
        <Pressable onPress={() => setAdding(true)} accessibilityRole="button" style={styles.addLink} hitSlop={4}>
          <Ionicons name="add" size={18} color={c.accent} />
          <Text variant="smallMedium" color="accent">Add a past cook</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 2 },
  remove: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  addBox: { marginTop: 12, padding: 14, borderRadius: 16, borderWidth: 2, gap: 8 },
  quick: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  addActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 6 },
  addLink: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: 8, marginTop: 4 },
});
