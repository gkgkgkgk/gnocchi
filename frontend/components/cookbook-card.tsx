import { useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Menu, MenuOptions, MenuOption, MenuTrigger } from 'react-native-popup-menu';
import { Ionicons } from '@expo/vector-icons';

import { Text } from './ui/Text';
import { Sheet } from './ui/Sheet';
import { Button } from './ui/Button';
import { useTheme } from '@/hooks/use-theme';
import { type ColorTokens } from '@/constants/theme';
import { blockPress, type PressState } from './ui/press';

interface CookbookCardProps {
  id: string;
  name: string;
  description?: string | null;
  cover_color?: string;
  recipe_count?: number;
  onPress: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

/** A stylized "book cover" tile: colored cover + spine, title in serif,
 *  small recipe-count pill, top-right menu. Uses the theme palette for
 *  contrast text so wild cover colors still stay readable. */
/** A cookbook's cloth colour from the kitchen palette, picked by name so it keeps its look. */
export function clothFor(name: string, c: ColorTokens): { bg: string; fg: string } {
  const cloths = [
    { bg: c.tomato, fg: '#FFFFFF' },
    { bg: c.butter, fg: c.fg },
    { bg: c.basil, fg: '#FFFFFF' },
    { bg: c.cocoa, fg: '#FFFFFF' },
  ];
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return cloths[h % cloths.length];
}

export function CookbookCard({
  name,
  description,
  recipe_count = 0,
  onPress,
  onEdit,
  onDelete,
}: CookbookCardProps) {
  const theme = useTheme();
  const c = theme.colors;
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const cloth = clothFor(name, c);

  return (
    <>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${name}, ${recipe_count} ${recipe_count === 1 ? 'recipe' : 'recipes'}`}
        style={(state) => [styles.container, blockPress(theme, state as PressState, 4)]}
      >
        <View style={[styles.cover, { backgroundColor: cloth.bg, borderColor: c.outline }]}>
          {/* the spine */}
          <View style={[styles.spine, { borderColor: c.outline }]} />
          <View style={[styles.label, { backgroundColor: c.bgElevated, borderColor: c.outline }]}>
            <Text variant="h2" style={styles.title} numberOfLines={3}>
              {name}
            </Text>
            {description ? (
              <Text variant="small" color="fgMuted" style={styles.description} numberOfLines={2}>
                {description}
              </Text>
            ) : null}
          </View>
          <View style={[styles.badge, { backgroundColor: c.bgElevated, borderColor: c.outline }]}>
            <Ionicons name="restaurant" size={12} color={c.accent} />
            <Text variant="label" style={{ fontSize: 12 }}>
              {recipe_count} {recipe_count === 1 ? 'recipe' : 'recipes'}
            </Text>
          </View>
        </View>

        {(onEdit || onDelete) && (
          <View style={styles.menuWrap}>
            <Menu>
              <MenuTrigger customStyles={{ triggerWrapper: styles.menuButton }}>
                <Ionicons name="ellipsis-vertical" size={16} color={cloth.fg} />
              </MenuTrigger>
              <MenuOptions
                customStyles={{
                  optionsContainer: {
                    borderRadius: theme.radius.md,
                    padding: 4,
                    minWidth: 160,
                    backgroundColor: c.bgElevated,
                    borderWidth: 2,
                    borderColor: c.outline,
                    ...theme.shadow.md,
                  },
                }}
              >
                {onEdit && (
                  <MenuOption onSelect={onEdit} customStyles={{ optionWrapper: styles.menuItem }}>
                    <Text variant="bodyMedium">Edit</Text>
                  </MenuOption>
                )}
                {onDelete && (
                  <MenuOption onSelect={() => setShowDeleteConfirm(true)} customStyles={{ optionWrapper: styles.menuItem }}>
                    <Text variant="bodyMedium" color="danger">Delete</Text>
                  </MenuOption>
                )}
              </MenuOptions>
            </Menu>
          </View>
        )}
      </Pressable>

      <Sheet visible={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)}>
        <Text variant="h2">Delete cookbook?</Text>
        <Text variant="body" color="fgMuted" style={{ marginTop: theme.spacing.sm, marginBottom: theme.spacing.xl }}>
          &ldquo;{name}&rdquo; will be removed. The recipes inside will not be deleted.
        </Text>
        <View style={{ flexDirection: 'row', gap: theme.spacing.md, justifyContent: 'flex-end' }}>
          <Button variant="ghost" onPress={() => setShowDeleteConfirm(false)}>Cancel</Button>
          <Button
            variant="danger"
            onPress={() => {
              setShowDeleteConfirm(false);
              onDelete?.();
            }}
          >
            Delete
          </Button>
        </View>
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  container: { margin: 10, aspectRatio: 3 / 4, borderRadius: 18 },
  cover: {
    flex: 1, borderRadius: 18, borderWidth: 2, overflow: 'hidden',
    paddingVertical: 18, paddingLeft: 30, paddingRight: 16, justifyContent: 'space-between',
  },
  spine: {
    position: 'absolute', left: 0, top: 0, bottom: 0, width: 16,
    borderRightWidth: 2, backgroundColor: 'rgba(0,0,0,0.14)',
  },
  label: { borderWidth: 2, borderRadius: 12, padding: 12, marginTop: 6 },
  title: { textAlign: 'center' },
  description: { textAlign: 'center', marginTop: 6 },
  badge: {
    alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 2,
  },
  menuWrap: {
    position: 'absolute', top: 8, right: 8,
  },
  menuButton: { padding: 6, borderRadius: 999 },
  menuItem: { padding: 12 },
});
