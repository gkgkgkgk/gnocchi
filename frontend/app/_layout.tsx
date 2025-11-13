import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Slot, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { MenuProvider } from 'react-native-popup-menu';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider, useAuth } from '@/contexts/auth-context';

export const unstable_settings = {
  anchor: '(drawer)',
};

function RootLayoutNav() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const colorScheme = useColorScheme();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inDrawerGroup = segments[0] === '(drawer)' as any;

    if (!user && !inAuthGroup) {
      // Redirect to login if not authenticated
      router.replace('/(auth)/login' as any);
    } else if (user && inAuthGroup) {
      // Redirect to main app if authenticated
      router.replace('/(drawer)/(tabs)' as any);
    } else if (!user && inDrawerGroup) {
      // Handle sign out - redirect from drawer to login
      router.replace('/(auth)/login' as any);
    }
  }, [user, loading, segments]);

  // Show loading screen while initializing auth OR during redirect
  const inAuthGroup = segments[0] === '(auth)';
  const inDrawerGroup = segments[0] === '(drawer)' as any;
  const needsRedirect = (!user && !inAuthGroup) || (user && inAuthGroup) || (!user && inDrawerGroup);
  
  if (loading || needsRedirect) {
    return (
      <View style={[
        styles.loadingContainer,
        { backgroundColor: colorScheme === 'dark' ? '#000' : '#fff' }
      ]}>
        <ActivityIndicator size="large" color={colorScheme === 'dark' ? '#fff' : '#000'} />
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <MenuProvider>
        <Slot />
        <StatusBar style="auto" />
      </MenuProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}
