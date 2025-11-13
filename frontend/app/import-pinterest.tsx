import { useState } from 'react';
import { View, StyleSheet, TextInput, Pressable, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { importFromPinterest } from '@/services/pinterest-service';
import { useThemeColor } from '@/hooks/use-theme-color';

export default function ImportPinterestScreen() {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  
  const backgroundColor = useThemeColor({}, 'background');
  const borderColor = useThemeColor({ light: 'rgba(0,0,0,0.2)', dark: 'rgba(255,255,255,0.2)' }, 'text');

  const handleImport = async () => {
    if (!url.trim()) {
      Alert.alert('Error', 'Please enter a Pinterest URL');
      return;
    }

    setLoading(true);
    try {
      const result = await importFromPinterest(url.trim());
      
      // Navigate to new-recipe with the scraped data
      router.push({
        pathname: '/new-recipe',
        params: {
          importedData: JSON.stringify({
            title: result.recipe.title,
            ingredients: result.recipe.ingredients.map(ing => ({
              text: ing.text,
              id: ing.id || '',
              quantity: ing.quantity.toString(),
              unit: ing.unit,
            })),
            steps: result.recipe.instructions,
            notes: result.recipe.notes,
            imageUrl: result.source_image || '',
            prepTime: result.recipe.metadata.prep_time.toString(),
            cookTime: result.recipe.metadata.cook_time.toString(),
            servings: result.recipe.metadata.servings.toString(),
            source: result.source_url,
          }),
        },
      } as any);
    } catch (error: any) {
      console.error('Import failed:', error);
      Alert.alert('Import Failed', error.message || 'Failed to import recipe from Pinterest');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <ThemedText style={styles.backButtonText}>← Back</ThemedText>
        </Pressable>
        <ThemedText style={styles.headerTitle}>Import from Pinterest</ThemedText>
        <View style={styles.backButton} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        <ThemedText style={styles.title}>📌 Pinterest Recipe Import</ThemedText>
        <ThemedText style={styles.description}>
          Paste a Pinterest link to a recipe and we'll automatically extract all the details for you.
        </ThemedText>

        <View style={styles.inputContainer}>
          <ThemedText style={styles.label}>Pinterest URL</ThemedText>
          <TextInput
            style={[styles.input, { backgroundColor, borderColor }]}
            value={url}
            onChangeText={setUrl}
            placeholder="https://pin.it/..."
            placeholderTextColor="#999"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            editable={!loading}
          />
        </View>

        <Pressable
          style={[styles.importButton, loading && styles.importButtonDisabled]}
          onPress={handleImport}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <ThemedText style={styles.importButtonText}>Import Recipe</ThemedText>
          )}
        </Pressable>

        <ThemedText style={styles.hint}>
          💡 Tip: This works with Pinterest pins that link to recipe websites.
        </ThemedText>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  backButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    opacity: 0.7,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
  },
  importButton: {
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  importButtonDisabled: {
    opacity: 0.6,
  },
  importButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  hint: {
    fontSize: 14,
    opacity: 0.6,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
