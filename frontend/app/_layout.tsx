import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { MenuProvider } from 'react-native-popup-menu';
import 'react-native-reanimated';
import {
  Fraunces_400Regular,
  Fraunces_500Medium,
  Fraunces_700Bold,
  useFonts as useFraunces,
} from '@expo-google-fonts/fraunces';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts as useInter,
} from '@expo-google-fonts/inter';
import { ActivityIndicator, View } from 'react-native';

import { ThemeProvider as ThemePreferenceProvider } from '@/contexts/theme-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';

export const unstable_settings = {
  anchor: '(drawer)',
};

export default function RootLayout() {
  const [interLoaded] = useInter({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold });
  const [frLoaded] = useFraunces({ Fraunces_400Regular, Fraunces_500Medium, Fraunces_700Bold });

  if (!interLoaded || !frLoaded) {
    return <FontsLoading />;
  }

  return (
    <ThemePreferenceProvider>
      <RootNavigation />
    </ThemePreferenceProvider>
  );
}

function RootNavigation() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <MenuProvider>
        <Slot />
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      </MenuProvider>
    </ThemeProvider>
  );
}

function FontsLoading() {
  const theme = useTheme();
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.bg }}>
      <ActivityIndicator color={theme.colors.accent} />
    </View>
  );
}
