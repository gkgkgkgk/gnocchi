import { useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { View, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { supabase } from '@/lib/supabase';
import * as Linking from 'expo-linking';

export default function LoginCallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  useEffect(() => {
    // Handle the OAuth callback
    const handleCallback = async () => {
      try {
        console.log('Login callback triggered');
        console.log('Params:', params);
        
        // For mobile, we need to extract tokens from the URL
        if (Platform.OS !== 'web') {
          const url = await Linking.getInitialURL();
          console.log('Initial URL:', url);
          
          if (url) {
            // Parse the URL to extract tokens from fragment
            const urlObj = new URL(url);
            const fragment = urlObj.hash.substring(1); // Remove the '#'
            const fragmentParams = new URLSearchParams(fragment);
            
            const accessToken = fragmentParams.get('access_token');
            const refreshToken = fragmentParams.get('refresh_token');
            
            console.log('Access token found:', !!accessToken);
            console.log('Refresh token found:', !!refreshToken);
            
            if (accessToken && refreshToken) {
              // Set the session with the tokens
              const { data, error } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              });
              
              if (error) {
                console.error('Error setting session:', error);
                router.replace('/(auth)/login');
                return;
              }
              
              if (data.session) {
                console.log('Session established:', data.session.user.email);
                router.replace('/(tabs)' as any);
                return;
              }
            }
          }
        }
        
        // Fallback: try to get existing session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          router.replace('/(auth)/login');
          return;
        }

        if (session) {
          console.log('Session found:', session.user.email);
          router.replace('/(tabs)' as any);
        } else {
          console.log('No session found, redirecting to login');
          router.replace('/(auth)/login' as any);
        }
      } catch (error) {
        console.error('Error in callback:', error);
        router.replace('/(auth)/login');
      }
    };

    handleCallback();
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#4CAF50" />
      <ThemedText style={styles.text}>Completing sign in...</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    backgroundColor: '#fff',
  },
  text: {
    fontSize: 16,
    opacity: 0.7,
  },
});
