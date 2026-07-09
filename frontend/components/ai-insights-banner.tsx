import { useState, useEffect } from 'react';
import { View, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Card } from './ui/Card';
import { Text } from './ui/Text';
import { Button } from './ui/Button';
import { fetchAITools, AITool } from '@/services/ai-tools-service';
import { useTheme } from '@/hooks/use-theme';

interface AIInsightsBannerProps {
  insight?: string;
  recommendedAction?: string;
  loading?: boolean;
  onActionPress?: () => void;
  onToolPress?: (tool: AITool) => void;
  onRefresh?: () => void;
}

const formatToolName = (n: string) =>
  n.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

export function AIInsightsBanner({
  insight,
  recommendedAction,
  loading,
  onActionPress,
  onToolPress,
  onRefresh,
}: AIInsightsBannerProps) {
  const theme = useTheme();
  const c = theme.colors;
  const [tools, setTools] = useState<AITool[]>([]);
  const [toolsLoading, setToolsLoading] = useState(true);

  useEffect(() => {
    fetchAITools().then(setTools).catch(console.error).finally(() => setToolsLoading(false));
  }, []);

  if (loading) {
    return (
      <Card style={[styles.container, { backgroundColor: c.secondaryMuted, borderColor: c.secondary }]}>
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={c.secondary} />
          <Text variant="small" color="fgMuted">Analyzing recipe…</Text>
        </View>
      </Card>
    );
  }

  if (!insight) return null;

  return (
    <Card style={[styles.container, { backgroundColor: c.secondaryMuted, borderColor: c.secondary }]}>
      <View style={styles.row}>
        <View style={[styles.badge, { backgroundColor: c.secondary }]}>
          <Text style={{ fontSize: 22 }}>🥟</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.headerRow}>
            <Text variant="label" color="fgMuted">Chef Gnocchi's note</Text>
            {onRefresh && (
              <Pressable hitSlop={8} onPress={onRefresh} style={{ padding: 4 }}>
                <Ionicons name="refresh" size={14} color={c.fgMuted} />
              </Pressable>
            )}
          </View>
          <Text variant="body" style={{ marginTop: 4 }}>{insight}</Text>

          {recommendedAction && (
            <Button
              variant="secondary"
              size="sm"
              onPress={onActionPress}
              iconRight={<Ionicons name="arrow-forward" size={14} color={c.fg} />}
              style={{ marginTop: theme.spacing.md, alignSelf: 'flex-start' }}
            >
              {recommendedAction}
            </Button>
          )}
        </View>
      </View>

      {!toolsLoading && tools.length > 0 && (
        <>
          <View style={[styles.divider, { backgroundColor: c.border }]} />
          <Text variant="label" color="fgMuted" style={{ marginBottom: theme.spacing.sm }}>
            Try a tool
          </Text>
          <View style={styles.toolGrid}>
            {tools.map((tool) => (
              <Pressable
                key={tool.id}
                onPress={() => onToolPress?.(tool)}
                style={({ pressed }) => [
                  styles.toolButton,
                  {
                    backgroundColor: pressed ? c.bgHover : c.bgElevated,
                    borderColor: c.border,
                    borderRadius: theme.radius.md,
                  },
                ]}
              >
                <Text style={{ fontSize: 18 }}>{tool.icon}</Text>
                <Text variant="smallMedium" numberOfLines={1}>{formatToolName(tool.name)}</Text>
              </Pressable>
            ))}
          </View>
        </>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  row: { flexDirection: 'row', gap: 12 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badge: {
    width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center',
  },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  divider: { height: 1, marginVertical: 16 },
  toolGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  toolButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
  },
});
