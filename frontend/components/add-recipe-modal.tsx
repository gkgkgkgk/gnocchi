import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Sheet } from './ui/Sheet';
import { Text } from './ui/Text';
import { useTheme } from '@/hooks/use-theme';

interface AddRecipeModalProps {
  visible: boolean;
  onClose: () => void;
  onImportLink: () => void;
  onAddManually: () => void;
  onScanPhoto: () => void;
}

interface Option {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
}

export function AddRecipeModal({
  visible,
  onClose,
  onImportLink,
  onAddManually,
  onScanPhoto,
}: AddRecipeModalProps) {
  const theme = useTheme();
  const c = theme.colors;

  const options: Option[] = [
    { icon: 'link-outline',     title: 'Paste a link',    subtitle: 'Pinterest, Instagram, or any recipe site', onPress: onImportLink },
    { icon: 'camera-outline',   title: 'Scan a photo',    subtitle: 'From your camera or gallery',              onPress: onScanPhoto },
    { icon: 'create-outline',   title: 'Type it in',      subtitle: 'Build a recipe from scratch',              onPress: onAddManually },
  ];

  return (
    <Sheet visible={visible} onClose={onClose}>
      <View style={styles.header}>
        <Text variant="h1">Add a recipe</Text>
        <Pressable onPress={onClose} hitSlop={12}>
          <Ionicons name="close" size={24} color={c.fgMuted} />
        </Pressable>
      </View>

      <View style={{ gap: theme.spacing.sm, marginTop: theme.spacing.lg }}>
        {options.map((opt) => (
          <Pressable
            key={opt.title}
            onPress={opt.onPress}
            style={({ pressed }) => [
              styles.option,
              {
                backgroundColor: pressed ? c.bgHover : c.bgMuted,
                borderRadius: theme.radius.lg,
                padding: theme.spacing.lg,
              },
            ]}
          >
            <View style={[styles.iconWrap, { backgroundColor: c.accent }]}>
              <Ionicons name={opt.icon} size={22} color={c.accentFg} />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="bodyMedium">{opt.title}</Text>
              <Text variant="small" color="fgMuted">{opt.subtitle}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={c.fgSubtle} />
          </Pressable>
        ))}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  option: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap: {
    width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center',
  },
});
