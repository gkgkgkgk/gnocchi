import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { useTheme } from '@/hooks/use-theme';
import { useResponsive } from '@/hooks/use-responsive';

/** Width of the vertical nav rail shown on tablet / desktop. */
export const RAIL_WIDTH = 96;

const LOGO = require('@/assets/images/gnocchi_logo.png');

/**
 * Responsive primary navigation. On phones it renders the familiar bottom
 * tab bar; at `isWide` (tablet landscape / desktop) it becomes a left-hand
 * nav rail (logo on top, Settings pinned at the bottom). The scene is padded
 * via `sceneStyle` in the Tabs layout so content clears the absolute rail.
 */
export function ResponsiveTabBar(props: BottomTabBarProps) {
  const { isWide } = useResponsive();
  return isWide ? <NavRail {...props} /> : <BottomBar {...props} />;
}

function tapHaptic() {
  if (Platform.OS === 'ios') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

function useTabPress({ navigation, state }: BottomTabBarProps) {
  return (routeKey: string, routeName: string, focused: boolean) => {
    tapHaptic();
    const event = navigation.emit({ type: 'tabPress', target: routeKey, canPreventDefault: true });
    if (!focused && !event.defaultPrevented) navigation.navigate(routeName);
  };
}

// --- Bottom bar (phone) -------------------------------------------------

function BottomBar(props: BottomTabBarProps) {
  const { state, descriptors, insets } = props;
  const theme = useTheme();
  const c = theme.colors;
  const onPress = useTabPress(props);

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

        return (
          <Pressable
            key={route.key}
            onPress={() => onPress(route.key, route.name, focused)}
            style={styles.bottomItem}
            accessibilityRole="button">
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

function NavRail(props: BottomTabBarProps) {
  const { state, descriptors, insets } = props;
  const theme = useTheme();
  const c = theme.colors;
  const onPress = useTabPress(props);

  const renderItem = (routeKey: string, index: number) => {
    const route = state.routes[index];
    const { options } = descriptors[routeKey];
    const focused = state.index === index;
    const color = focused ? c.accent : c.tabIconDefault;
    const label = (options.title ?? route.name) as string;

    return (
      <Pressable
        key={routeKey}
        onPress={() => onPress(routeKey, route.name, focused)}
        style={styles.railItem}
        accessibilityRole="button">
        <View style={[styles.railIcon, focused && { backgroundColor: c.accentMuted }]}>
          {options.tabBarIcon?.({ focused, color, size: 24 })}
        </View>
        <Text style={[styles.railLabel, { color }]} numberOfLines={1}>
          {label}
        </Text>
      </Pressable>
    );
  };

  // Settings is pinned at the bottom; everything else fills the top group.
  const mainIndexes = state.routes.map((_, i) => i).filter((i) => state.routes[i].name !== 'settings');
  const settingsIndex = state.routes.findIndex((r) => r.name === 'settings');

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
      <Image source={LOGO} style={styles.logo} resizeMode="contain" />

      <View style={styles.railItems}>
        {mainIndexes.map((i) => renderItem(state.routes[i].key, i))}
      </View>

      {settingsIndex >= 0 && renderItem(state.routes[settingsIndex].key, settingsIndex)}
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
  logo: {
    width: 48,
    height: 48,
    marginBottom: 20,
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
