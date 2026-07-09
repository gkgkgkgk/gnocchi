import { useState, useEffect } from 'react';
import { Modal, View, StyleSheet, Pressable, TextInput, FlatList, ActivityIndicator } from 'react-native';
import { ThemedView } from './themed-view';
import { ThemedText } from './themed-text';
import { fetchUnits, Unit } from '@/services/unit-service';
import { useTheme } from '@/hooks/use-theme';
import { type Theme } from '@/constants/theme';

interface UnitPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectUnit: (unit: Unit) => void;
  selectedUnitId?: string;
}

export function UnitPickerModal({
  visible,
  onClose,
  onSelectUnit,
  selectedUnitId,
}: UnitPickerModalProps) {
  const [units, setUnits] = useState<Unit[]>([]);
  const [filteredUnits, setFilteredUnits] = useState<Unit[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const theme = useTheme();
  const styles = makeStyles(theme);
  const c = theme.colors;
  const backgroundColor = c.bgElevated;
  const textColor = c.fg;
  const borderColor = c.border;
  const placeholderColor = c.fgSubtle;

  useEffect(() => {
    if (visible) {
      loadUnits();
    }
  }, [visible]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredUnits(units);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = units.filter(
        (unit) =>
          unit.abbreviation.toLowerCase().includes(query) ||
          unit.name?.toLowerCase().includes(query)
      );
      setFilteredUnits(filtered);
    }
  }, [searchQuery, units]);

  const loadUnits = async () => {
    setLoading(true);
    try {
      const data = await fetchUnits();
      setUnits(data);
      setFilteredUnits(data);
    } catch (error) {
      console.error('Failed to load units:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectUnit = (unit: Unit) => {
    onSelectUnit(unit);
    setSearchQuery('');
    onClose();
  };

  const handleUseTypedUnit = () => {
    const typed = searchQuery.trim();
    if (!typed) return;
    handleSelectUnit({ id: typed, abbreviation: typed, name: typed });
  };

  const showCustomButton =
    searchQuery.trim() !== '' &&
    !filteredUnits.some(
      (u) => u.abbreviation.toLowerCase() === searchQuery.trim().toLowerCase(),
    );

  const renderUnitItem = ({ item }: { item: Unit }) => (
    <Pressable
      style={[
        styles.unitItem,
        { backgroundColor, borderColor },
        item.id === selectedUnitId && styles.unitItemSelected,
      ]}
      onPress={() => handleSelectUnit(item)}
    >
      <View style={styles.unitItemContent}>
        <ThemedText style={styles.unitAbbreviation}>{item.abbreviation}</ThemedText>
        {item.name && (
          <ThemedText style={styles.unitName}>{item.name}</ThemedText>
        )}
      </View>
      {item.id === selectedUnitId && (
        <ThemedText style={styles.checkmark}>✓</ThemedText>
      )}
    </Pressable>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.modalContainer} onPress={(e) => e.stopPropagation()}>
          <ThemedView style={styles.modal}>
            {/* Header */}
            <View style={styles.header}>
              <ThemedText style={styles.title}>Select Unit</ThemedText>
              <Pressable onPress={onClose} style={styles.closeButton}>
                <ThemedText style={styles.closeButtonText}>✕</ThemedText>
              </Pressable>
            </View>

            {/* Search Input */}
            <TextInput
              style={[styles.searchInput, { backgroundColor, borderColor, color: textColor }]}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search units..."
              placeholderTextColor={placeholderColor}
              autoCapitalize="none"
            />

            {/* Units List */}
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={c.accent} />
              </View>
            ) : (
              <>
                {showCustomButton && (
                  <Pressable
                    style={[styles.unitItem, styles.customUnitButton]}
                    onPress={handleUseTypedUnit}
                  >
                    <ThemedText style={styles.unitAbbreviation}>
                      Use "{searchQuery.trim()}"
                    </ThemedText>
                  </Pressable>
                )}
                <FlatList
                  data={filteredUnits}
                  renderItem={renderUnitItem}
                  keyExtractor={(item) => item.id}
                  style={styles.list}
                  contentContainerStyle={styles.listContent}
                  showsVerticalScrollIndicator={true}
                  ListEmptyComponent={
                    showCustomButton ? null : (
                      <View style={styles.emptyContainer}>
                        <ThemedText style={styles.emptyText}>
                          Type a unit like "cup" or "tbsp" to add one
                        </ThemedText>
                      </View>
                    )
                  }
                />
              </>
            )}
          </ThemedView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function makeStyles(theme: Theme) {
  const c = theme.colors;
  return StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: c.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  modal: {
    borderRadius: 16,
    padding: 24,
    maxHeight: '100%',
    ...theme.shadow.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  closeButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 24,
    opacity: 0.6,
  },
  searchInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  list: {
    maxHeight: 400,
  },
  listContent: {
    gap: 8,
  },
  unitItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  unitItemSelected: {
    borderColor: c.accent,
    backgroundColor: c.accentMuted,
  },
  customUnitButton: {
    borderColor: c.accent,
    borderStyle: 'dashed',
    marginBottom: 8,
  },
  unitItemContent: {
    flex: 1,
  },
  unitAbbreviation: {
    fontSize: 16,
    fontWeight: '600',
  },
  unitName: {
    fontSize: 14,
    opacity: 0.6,
    marginTop: 2,
  },
  checkmark: {
    fontSize: 20,
    color: c.accent,
    fontWeight: 'bold',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    opacity: 0.6,
  },
  });
}
