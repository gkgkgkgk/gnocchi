import { useState, useEffect } from 'react';
import { View, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedView } from './themed-view';
import { ThemedText } from './themed-text';
import { fetchAITools, AITool } from '@/services/ai-tools-service';

interface AIInsightsBannerProps {
  insight?: string;
  recommendedAction?: string;
  loading?: boolean;
  onActionPress?: () => void;
  onToolPress?: (tool: AITool) => void;
  onRefresh?: () => void;
}


export function AIInsightsBanner({ 
  insight, 
  recommendedAction, 
  loading,
  onActionPress,
  onToolPress,
  onRefresh
}: AIInsightsBannerProps) {
  const [tools, setTools] = useState<AITool[]>([]);
  const [toolsLoading, setToolsLoading] = useState(true);

  useEffect(() => {
    loadTools();
  }, []);

  const loadTools = async () => {
    try {
      const data = await fetchAITools();
      setTools(data);
    } catch (error) {
      console.error('Failed to load AI tools:', error);
    } finally {
      setToolsLoading(false);
    }
  };

  const formatToolName = (toolName: string): string => {
    // Convert snake_case to Title Case
    return toolName
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" />
          <ThemedText style={styles.loadingText}>Analyzing recipe...</ThemedText>
        </View>
      </ThemedView>
    );
  }

  if (!insight) {
    return null;
  }

  return (
    <ThemedView style={styles.container}>
      {/* Main Insight */}
      <View style={styles.mainInsight}>
        <View style={styles.iconContainer}>
          <ThemedText style={styles.logo}>🥟</ThemedText>
        </View>
        
        <View style={styles.insightContent}>
          <View style={styles.insightHeader}>
            <ThemedText style={styles.insightLabel}>Chef Gnocchi's Note:</ThemedText>
            {onRefresh && (
              <Pressable style={styles.refreshButton} onPress={onRefresh}>
                <Ionicons name="refresh" size={16} color="#666" />
              </Pressable>
            )}
          </View>
          <ThemedText style={styles.insightText}>{insight}</ThemedText>
          
          {recommendedAction && (
            <Pressable 
              style={styles.actionButton}
              onPress={onActionPress}
            >
              <ThemedText style={styles.actionButtonText}>
                {recommendedAction}
              </ThemedText>
              <ThemedText style={styles.actionArrow}>→</ThemedText>
            </Pressable>
          )}
        </View>
      </View>

      {/* AI Functions Grid */}
      {!toolsLoading && tools.length > 0 && (
        <>
          <View style={styles.divider} />
          <View style={styles.functionsSection}>
            <ThemedText style={styles.functionsTitle}>Available AI-Powered Tools</ThemedText>
            <View style={styles.functionsGrid}>
              {tools.map((tool) => (
                <Pressable
                  key={tool.id}
                  style={styles.functionButton}
                  onPress={() => {
                    if (onToolPress) {
                      onToolPress(tool);
                    }
                  }}
                >
                  <ThemedText style={styles.functionIcon}>{tool.icon}</ThemedText>
                  <ThemedText style={styles.functionLabel}>{formatToolName(tool.name)}</ThemedText>
                </Pressable>
              ))}
            </View>
          </View>
        </>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  insightHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  insightLabel: {
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.7,
    fontStyle: 'italic',
  },
  refreshButton: {
    padding: 4,
    opacity: 0.7,
  },
  container: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.3)',
    backgroundColor: 'rgba(76, 175, 80, 0.05)',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 8,
  },
  loadingText: {
    fontSize: 14,
    opacity: 0.7,
  },
  mainInsight: {
    flexDirection: 'row',
    gap: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    fontSize: 28,
  },
  insightContent: {
    flex: 1,
    gap: 12,
  },
  insightText: {
    fontSize: 15,
    lineHeight: 22,
    opacity: 0.9,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#4CAF50',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginRight: 8,
  },
  actionArrow: {
    fontSize: 16,
    color: '#fff',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    marginVertical: 16,
  },
  functionsSection: {
    gap: 12,
  },
  functionsTitle: {
    fontSize: 13,
    fontWeight: '600',
    opacity: 0.7,
    marginBottom: 4,
  },
  functionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  functionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  functionIcon: {
    fontSize: 16,
  },
  functionLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
});
