import { useState, useEffect } from 'react';
import { Modal, View, StyleSheet, Pressable, TextInput, FlatList, ActivityIndicator } from 'react-native';
import { ThemedView } from './themed-view';
import { ThemedText } from './themed-text';
import { fetchUnits, Unit } from '@/services/unit-service';
import { useThemeColor } from '@/hooks/use-theme-color';

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
  
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({ light: 'rgba(0,0,0,0.2)', dark: 'rgba(255,255,255,0.2)' }, 'text');
  const placeholderColor = useThemeColor({ light: '#999', dark: '#666' }, 'text');

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
                <ActivityIndicator size="large" color="#E07856" />
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

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    maxHeight: '100%',
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
    borderColor: '#E07856',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
  customUnitButton: {
    borderColor: '#E07856',
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
    color: '#E07856',
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
