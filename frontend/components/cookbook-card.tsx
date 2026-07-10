import { useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Menu, MenuOptions, MenuOption, MenuTrigger } from 'react-native-popup-menu';
import { Ionicons } from '@expo/vector-icons';

import { Text } from './ui/Text';
import { Sheet } from './ui/Sheet';
import { Button } from './ui/Button';
import { useTheme } from '@/hooks/use-theme';

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
export function CookbookCard({
  name,
  description,
  cover_color = '#E07856',
  recipe_count = 0,
  onPress,
  onEdit,
  onDelete,
}: CookbookCardProps) {
  const theme = useTheme();
  const c = theme.colors;
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  return (
    <>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.container, pressed && { opacity: 0.92 }]}
      >
        {/* Book spine — offset behind the cover */}
        <View style={[styles.spine, { backgroundColor: cover_color }]} />

        {/* Cover */}
        <View style={[styles.cover, { backgroundColor: cover_color, borderRadius: theme.radius.lg, ...theme.shadow.md }]}>
          <View style={styles.decor}>
            <View style={styles.decorLine} />
            <View style={styles.decorLine} />
          </View>

          <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 4 }}>
            <Text variant="h1" style={styles.title} numberOfLines={2}>
              {name}
            </Text>
            {description ? (
              <Text variant="small" style={styles.description} numberOfLines={2}>
                {description}
              </Text>
            ) : null}
          </View>

          <View style={styles.badge}>
            <Ionicons name="restaurant" size={12} color="#fff" />
            <Text variant="caption" style={{ color: '#fff', fontWeight: '600' }}>
              {recipe_count} {recipe_count === 1 ? 'recipe' : 'recipes'}
            </Text>
          </View>
        </View>

        {(onEdit || onDelete) && (
          <View style={styles.menuWrap}>
            <Menu>
              <MenuTrigger customStyles={{ triggerWrapper: styles.menuButton }}>
                <Ionicons name="ellipsis-vertical" size={16} color="#fff" />
              </MenuTrigger>
              <MenuOptions
                customStyles={{
                  optionsContainer: {
                    borderRadius: theme.radius.md,
                    padding: 4,
                    minWidth: 160,
                    backgroundColor: c.bgElevated,
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
          "{name}" will be removed. The recipes inside will not be deleted.
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
  container: { position: 'relative', margin: 6, aspectRatio: 3 / 4 },
  spine: {
    position: 'absolute',
    left: -4,
    top: 8,
    bottom: 8,
    width: 8,
    borderRadius: 4,
    opacity: 0.85,
  },
  cover: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
  },
  title: {
    color: '#fff',
    textAlign: 'center',
  },
  description: {
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    marginTop: 6,
  },
  badge: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: 'rgba(0,0,0,0.28)',
    borderRadius: 999,
  },
  decor: { gap: 4 },
  decorLine: {
    height: 1.5,
    backgroundColor: 'rgba(255,255,255,0.35)',
    borderRadius: 999,
  },
  menuWrap: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 999,
  },
  menuButton: { padding: 6 },
  menuItem: { padding: 12 },
});
