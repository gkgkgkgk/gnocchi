import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Drawer } from 'expo-router/drawer';

export default function DrawerLayout() {
  // The drawer is now an inert wrapper: primary navigation lives in the
  // responsive tab bar (bottom bar on phone, left rail on tablet/desktop),
  // which also hosts Settings. No hamburger, no swipe-to-open.
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Drawer
        screenOptions={{
          headerShown: false,
          swipeEnabled: false,
          drawerType: 'front',
        }}>
        <Drawer.Screen name="(tabs)" />
      </Drawer>
    </GestureHandlerRootView>
  );
}
