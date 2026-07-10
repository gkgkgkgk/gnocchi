import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { useTheme } from '@/hooks/use-theme';
import { useResponsive } from '@/hooks/use-responsive';

/** Width of the vertical nav rail shown on tablet / desktop. */
export const RAIL_WIDTH = 96;

/**
 * Responsive primary navigation. On phones it renders the familiar bottom
 * tab bar; at `isWide` (tablet landscape / desktop) it becomes a left-hand
 * nav rail with a wordmark and a Settings shortcut. The scene is padded via
 * `sceneStyle` in the Tabs layout so content clears the absolute rail.
 */
export function ResponsiveTabBar(props: BottomTabBarProps) {
  const { isWide } = useResponsive();
  return isWide ? <NavRail {...props} /> : <BottomBar {...props} />;
}

function tapHaptic() {
  if (Platform.OS === 'ios') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

// --- Bottom bar (phone) -------------------------------------------------

function BottomBar({ state, descriptors, navigation, insets }: BottomTabBarProps) {
  const theme = useTheme();
  const c = theme.colors;

  return (
    <View
      style={[
        styles.bottomBar,
        {
          backgroundColor: c.bgElevated,
          borderTopColor: c.border,
          paddingBottom: Math.max(insets.bottom, 8),
        },
      ]}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const focused = state.index === index;
        const color = focused ? c.accent : c.tabIconDefault;
        const label = (options.title ?? route.name) as string;

        const onPress = () => {
          tapHaptic();
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
        };

        return (
          <Pressable key={route.key} onPress={onPress} style={styles.bottomItem} accessibilityRole="button">
            {options.tabBarIcon?.({ focused, color, size: 26 })}
            <Text style={[styles.bottomLabel, { color }]} numberOfLines={1}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// --- Nav rail (tablet / desktop) ----------------------------------------

function NavRail({ state, descriptors, navigation, insets }: BottomTabBarProps) {
  const theme = useTheme();
  const c = theme.colors;

  return (
    <View
      style={[
        styles.rail,
        {
          width: RAIL_WIDTH,
          backgroundColor: c.bgElevated,
          borderRightColor: c.border,
          paddingTop: Math.max(insets.top, 12) + 8,
          paddingBottom: Math.max(insets.bottom, 12),
        },
      ]}>
      <Text style={[styles.wordmark, { color: c.accent }]}>gn.</Text>

      <View style={styles.railItems}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const focused = state.index === index;
          const color = focused ? c.accent : c.tabIconDefault;
          const label = (options.title ?? route.name) as string;

          const onPress = () => {
            tapHaptic();
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
          };

          return (
            <Pressable key={route.key} onPress={onPress} style={styles.railItem} accessibilityRole="button">
              <View style={[styles.railIcon, focused && { backgroundColor: c.accentMuted }]}>
                {options.tabBarIcon?.({ focused, color, size: 24 })}
              </View>
              <Text style={[styles.railLabel, { color }]} numberOfLines={1}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        onPress={() => {
          tapHaptic();
          router.navigate('/(drawer)/settings');
        }}
        style={styles.railItem}
        accessibilityRole="button">
        <View style={styles.railIcon}>
          <Ionicons name="settings-outline" size={24} color={c.tabIconDefault} />
        </View>
        <Text style={[styles.railLabel, { color: c.tabIconDefault }]} numberOfLines={1}>
          Settings
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  // Bottom bar
  bottomBar: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
  },
  bottomItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  bottomLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  // Rail
  rail: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRightWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  wordmark: {
    fontFamily: 'Fraunces_700Bold',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 24,
  },
  railItems: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
    width: '100%',
  },
  railItem: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 6,
    width: '100%',
  },
  railIcon: {
    width: 52,
    height: 34,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  railLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
});
