import { useState } from 'react';
import { View, StyleSheet, Pressable, Image, useWindowDimensions } from 'react-native';
import { Menu, MenuOptions, MenuOption, MenuTrigger } from 'react-native-popup-menu';
import { Ionicons } from '@expo/vector-icons';

import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Text } from '@/components/ui/Text';
import { Sheet } from '@/components/ui/Sheet';
import { Button } from '@/components/ui/Button';
import { StarRating } from '@/components/ui/StarRating';
import { EditRecipeTagsModal } from './edit-recipe-tags-modal';
import { updateRecipeTags } from '@/services/recipe-service';
import { RecipeTag } from '@/services/profile-service';
import { useTheme } from '@/hooks/use-theme';

interface RecipeCardProps {
  id: string;
  title: string;
  imageUrl?: string | null;
  image_url?: string | null;
  metadata?: any;
  ingredients?: any[];
  rating?: number | null;
  tags?: string[];
  userTags?: RecipeTag[];
  onPress?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onTagsChange?: (tagIds: string[]) => void;
}

export function RecipeCard(props: RecipeCardProps) {
  const {
    id,
    title,
    imageUrl,
    image_url,
    metadata,
    ingredients,
    rating,
    tags = [],
    userTags = [],
    onPress,
    onEdit,
    onDelete,
    onTagsChange,
  } = props;

  const theme = useTheme();
  const c = theme.colors;
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const image = imageUrl || image_url;
  const prep = Number(metadata?.prepTime) || 0;
  const cook = Number(metadata?.cookTime) || 0;
  const totalTime = prep + cook;
  const numIngredients = ingredients?.length ?? 0;

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEditTags, setShowEditTags] = useState(false);

  const tagDetails = tags
    .map((tid) => userTags.find((t) => t.id === tid))
    .filter((t): t is RecipeTag => !!t)
    .slice(0, 3);

  return (
    <>
      <Card onPress={onPress} style={styles.card}>
        {image ? (
          <Image source={{ uri: image }} style={styles.image} />
        ) : (
          <View style={[styles.imagePlaceholder, { backgroundColor: c.bgMuted }]}>
            <Text variant="display" color="fgSubtle" style={{ fontSize: 44 }}>
              🍽️
            </Text>
          </View>
        )}

        <View style={[styles.info, { padding: theme.spacing.md }]}>
          <View style={styles.titleRow}>
            <Text variant="h3" numberOfLines={2} style={styles.title}>
              {title}
            </Text>
            <Menu>
              <MenuTrigger customStyles={{ triggerWrapper: styles.menuButton }}>
                <Ionicons name="ellipsis-vertical" size={18} color={c.fgMuted} />
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
                <MenuOption onSelect={() => setShowEditTags(true)} customStyles={{ optionWrapper: styles.menuItem }}>
                  <Text variant="bodyMedium">Edit tags</Text>
                </MenuOption>
                {onDelete && (
                  <MenuOption onSelect={() => setShowDeleteConfirm(true)} customStyles={{ optionWrapper: styles.menuItem }}>
                    <Text variant="bodyMedium" color="danger">Delete</Text>
                  </MenuOption>
                )}
              </MenuOptions>
            </Menu>
          </View>

          {/* Meta / rating / tags float to the bottom of the card so they line
              up across cards regardless of whether the title wraps to 2 lines. */}
          <View style={styles.footer}>
            {(totalTime > 0 || numIngredients > 0) && (
              <View style={[styles.metaRow, { gap: theme.spacing.md }]}>
                {totalTime > 0 && (
                  <View style={styles.metaItem}>
                    <Ionicons name="time-outline" size={13} color={c.fgSubtle} />
                    <Text variant="caption" color="fgMuted">{totalTime}m</Text>
                  </View>
                )}
                {numIngredients > 0 && (
                  <View style={styles.metaItem}>
                    <Ionicons name="list-outline" size={13} color={c.fgSubtle} />
                    <Text variant="caption" color="fgMuted">{numIngredients} items</Text>
                  </View>
                )}
              </View>
            )}

            {!!rating && rating > 0 && (
              <View style={{ marginTop: theme.spacing.xs }}>
                <StarRating value={rating} size={13} gap={1} />
              </View>
            )}

            {tagDetails.length > 0 && (
              <View
                style={[
                  styles.tagsRow,
                  {
                    marginTop: theme.spacing.sm,
                    gap: theme.spacing.xs,
                    flexDirection: isMobile ? 'column' : 'row',
                  },
                ]}
              >
                {tagDetails.map((tag) => (
                  <Chip key={tag.id} tone={tag.color} size="sm" icon={<Ionicons name={tag.icon as any} size={11} color={tag.color} />}>
                    {tag.name}
                  </Chip>
                ))}
              </View>
            )}
          </View>
        </View>
      </Card>

      <Sheet visible={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)}>
        <Text variant="h2" style={{ marginBottom: theme.spacing.sm }}>Delete recipe?</Text>
        <Text variant="body" color="fgMuted" style={{ marginBottom: theme.spacing.xl }}>
          "{title}" will be permanently removed.
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

      <EditRecipeTagsModal
        visible={showEditTags}
        onClose={() => setShowEditTags(false)}
        currentTags={tags}
        onSave={async (tagIds) => {
          try {
            await updateRecipeTags(id, tagIds);
            onTagsChange?.(tagIds);
          } catch (error) {
            console.error('Failed to update recipe tags:', error);
          }
        }}
        recipeName={title}
      />
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    margin: 6,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 160,
    resizeMode: 'cover',
  },
  imagePlaceholder: {
    width: '100%',
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: { flex: 1 },
  footer: { marginTop: 'auto', paddingTop: 8 },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  title: { flex: 1, lineHeight: 22 },
  menuButton: {
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  menuItem: {
    padding: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
});
