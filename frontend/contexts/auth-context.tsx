import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { Platform } from 'react-native';

WebBrowser.maybeCompleteAuthSession();

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Initial session:', session?.user?.email || 'No session');
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false); // Set loading false after initial session check
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, session?.user?.email || 'No session');
      setSession(session);
      setUser(session?.user ?? null);
      
      // Ensure loading is false after any auth state change
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    // Get the appropriate redirect URL for the platform
    const redirectUrl = Platform.OS === 'web' 
      ? `${window.location.protocol}//${window.location.host}`
      : AuthSession.makeRedirectUri({
          scheme: 'gnocchi',
          path: 'login-callback'
        });

    console.log('Redirect URL:', redirectUrl);

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        skipBrowserRedirect: Platform.OS !== 'web',
      },
    });

    if (error) throw error;

    // For mobile platforms, open the OAuth URL in a browser
    if (Platform.OS !== 'web' && data?.url) {
      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectUrl
      );

      if (result.type === 'success') {
        const url = result.url;
        console.log('OAuth callback URL:', url);
        
        // Extract tokens from URL fragment (hash), not query params
        const urlObj = new URL(url);
        const fragment = urlObj.hash.substring(1); // Remove the '#'
        const params = new URLSearchParams(fragment);
        
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');

        console.log('Tokens extracted - Access:', !!accessToken, 'Refresh:', !!refreshToken);

        if (accessToken && refreshToken) {
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          
          if (error) {
            console.error('Error setting session:', error);
            throw error;
          }
          
          if (data.session) {
            console.log('Session set successfully:', data.session.user.email);
            // Manually update state to ensure immediate update
            setSession(data.session);
            setUser(data.session.user);
          }
        } else {
          console.error('No tokens found in callback URL');
        }
      }
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        loading,
        signInWithGoogle,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
