import { Tabs } from 'expo-router';
import React from 'react';

import { Ionicons } from '@expo/vector-icons';

import { ResponsiveTabBar, RAIL_WIDTH } from '@/components/responsive-tab-bar';
import { useResponsive } from '@/hooks/use-responsive';

export default function TabLayout() {
  const { isWide } = useResponsive();

  return (
    <Tabs
      tabBar={(props) => <ResponsiveTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: isWide ? { paddingLeft: RAIL_WIDTH } : undefined,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Recipes',
          tabBarIcon: ({ color }) => <Ionicons size={26} name="restaurant" color={color} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Cookbooks',
          tabBarIcon: ({ color }) => <Ionicons size={26} name="book" color={color} />,
        }}
      />
      <Tabs.Screen
        name="planning"
        options={{
          title: 'Planning',
          tabBarIcon: ({ color }) => <Ionicons size={26} name="calendar" color={color} />,
        }}
      />
    </Tabs>
  );
}
