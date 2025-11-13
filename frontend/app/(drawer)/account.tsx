import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'expo-router';

export default function AccountScreen() {
  const colorScheme = useColorScheme();
  const { user, signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await signOut();
            router.replace('/(auth)/login' as any);
          },
        },
      ]
    );
  };

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: Colors[colorScheme ?? 'light'].background }]}
      contentContainerStyle={styles.contentContainer}
    >
      <View style={[styles.profileCard, { backgroundColor: Colors[colorScheme ?? 'light'].card }]}>
        <View style={[styles.avatar, { backgroundColor: Colors[colorScheme ?? 'light'].tint }]}>
          <IconSymbol name="person.fill" size={48} color="#fff" />
        </View>
        <Text style={[styles.email, { color: Colors[colorScheme ?? 'light'].text }]}>
          {user?.email || 'Not signed in'}
        </Text>
        <Text style={[styles.userId, { color: Colors[colorScheme ?? 'light'].tabIconDefault }]}>
          User ID: {user?.id?.slice(0, 8)}...
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: Colors[colorScheme ?? 'light'].text }]}>
          Account Settings
        </Text>
        
        <TouchableOpacity style={[styles.menuItem, { backgroundColor: Colors[colorScheme ?? 'light'].card }]}>
          <View style={styles.menuLeft}>
            <IconSymbol name="envelope.fill" size={24} color={Colors[colorScheme ?? 'light'].icon} />
            <Text style={[styles.menuLabel, { color: Colors[colorScheme ?? 'light'].text }]}>
              Email Preferences
            </Text>
          </View>
          <IconSymbol name="chevron.right" size={20} color={Colors[colorScheme ?? 'light'].tabIconDefault} />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.menuItem, { backgroundColor: Colors[colorScheme ?? 'light'].card }]}>
          <View style={styles.menuLeft}>
            <IconSymbol name="key.fill" size={24} color={Colors[colorScheme ?? 'light'].icon} />
            <Text style={[styles.menuLabel, { color: Colors[colorScheme ?? 'light'].text }]}>
              Change Password
            </Text>
          </View>
          <IconSymbol name="chevron.right" size={20} color={Colors[colorScheme ?? 'light'].tabIconDefault} />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.menuItem, { backgroundColor: Colors[colorScheme ?? 'light'].card }]}>
          <View style={styles.menuLeft}>
            <IconSymbol name="shield.fill" size={24} color={Colors[colorScheme ?? 'light'].icon} />
            <Text style={[styles.menuLabel, { color: Colors[colorScheme ?? 'light'].text }]}>
              Privacy & Security
            </Text>
          </View>
          <IconSymbol name="chevron.right" size={20} color={Colors[colorScheme ?? 'light'].tabIconDefault} />
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <TouchableOpacity 
          style={[styles.signOutButton, { backgroundColor: '#ff3b30' }]}
          onPress={handleSignOut}
        >
          <IconSymbol name="arrow.right.square.fill" size={24} color="#fff" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  profileCard: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 16,
    marginBottom: 24,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  email: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  userId: {
    fontSize: 14,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
    paddingLeft: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  signOutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
