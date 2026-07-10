import { Tabs } from 'expo-router';
import React from 'react';

import { Ionicons } from '@expo/vector-icons';

import { HapticTab } from '@/components/haptic-tab';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
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
