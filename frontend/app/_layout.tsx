import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { MenuProvider } from 'react-native-popup-menu';
import 'react-native-reanimated';
import {
  HostGrotesk_700Bold,
  HostGrotesk_800ExtraBold,
  useFonts as useHostGrotesk,
} from '@expo-google-fonts/host-grotesk';
import {
  InstrumentSans_400Regular,
  InstrumentSans_500Medium,
  InstrumentSans_600SemiBold,
  InstrumentSans_700Bold,
  useFonts as useInstrumentSans,
} from '@expo-google-fonts/instrument-sans';
import { ActivityIndicator, Platform, View } from 'react-native';

import { ThemeProvider as ThemePreferenceProvider } from '@/contexts/theme-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';

export const unstable_settings = {
  anchor: '(drawer)',
};

export default function RootLayout() {
  // Web loads these families from Google Fonts in +html.tsx instead.
  const native = Platform.OS !== 'web';
  const [readingLoaded] = useInstrumentSans(native ? {
    InstrumentSans_400Regular, InstrumentSans_500Medium, InstrumentSans_600SemiBold, InstrumentSans_700Bold,
  } : {});
  const [displayLoaded] = useHostGrotesk(native ? { HostGrotesk_700Bold, HostGrotesk_800ExtraBold } : {});

  if (!readingLoaded || !displayLoaded) {
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
