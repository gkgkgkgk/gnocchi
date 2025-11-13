import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Drawer } from 'expo-router/drawer';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function DrawerLayout() {
  const colorScheme = useColorScheme();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Drawer
        screenOptions={{
          drawerActiveTintColor: Colors[colorScheme ?? 'light'].tint,
          headerShown: true,
        }}>
        <Drawer.Screen
          name="(tabs)"
          options={{
            drawerLabel: 'Home',
            title: 'Home',
            drawerIcon: ({ color, size }) => (
              <IconSymbol size={size} name="house.fill" color={color} />
            ),
          }}
        />
        <Drawer.Screen
          name="settings"
          options={{
            drawerLabel: 'Settings',
            title: 'Settings',
            drawerIcon: ({ color, size }) => (
              <IconSymbol size={size} name="gearshape.fill" color={color} />
            ),
          }}
        />
        <Drawer.Screen
          name="account"
          options={{
            drawerLabel: 'Account',
            title: 'Account',
            drawerIcon: ({ color, size }) => (
              <IconSymbol size={size} name="person.fill" color={color} />
            ),
          }}
        />
      </Drawer>
    </GestureHandlerRootView>
  );
}
