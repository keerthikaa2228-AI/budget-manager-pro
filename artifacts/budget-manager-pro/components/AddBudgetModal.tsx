import React, { useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { CATEGORIES, Budget } from '@/contexts/BudgetContext';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSave: (data: Omit<Budget, 'id'>) => void;
}

// Expense-only categories make sense for budgets
const BUDGET_CATEGORIES = CATEGORIES.filter(
  c => c.transactionType === 'expense' || c.transactionType === 'both',
);

export function AddBudgetModal({ visible, onClose, onSave }: Props) {
  const colors = useColors();
  const [name, setName] = useState('');
  const [limit, setLimit] = useState('');
  const [categoryId, setCategoryId] = useState(BUDGET_CATEGORIES[0].id);

  const selectedCat = BUDGET_CATEGORIES.find(c => c.id === categoryId) ?? BUDGET_CATEGORIES[0];

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Missing name', 'Please enter a budget name.');
      return;
    }
    const num = parseFloat(limit.replace(',', '.'));
    if (!limit || isNaN(num) || num <= 0) {
      Alert.alert('Invalid limit', 'Please enter a monthly spending limit greater than 0.');
      return;
    }
    onSave({
      name: name.trim(),
      categoryId,
      limit: num,
      icon: selectedCat.icon,
      color: selectedCat.color,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    reset();
    onClose();
  };

  const reset = () => {
    setName('');
    setLimit('');
    setCategoryId(BUDGET_CATEGORIES[0].id);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={handleClose} />
      <View style={[styles.sheet, { backgroundColor: colors.card }]}>
        <View style={[styles.handle, { backgroundColor: colors.border }]} />

        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>New Budget</Text>
          <TouchableOpacity onPress={handleClose} hitSlop={12}>
            <Feather name="x" size={22} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.body}
        >
          {/* Budget name */}
          <Text style={[styles.label, { color: colors.mutedForeground }]}>Budget Name</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.muted }]}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Groceries"
            placeholderTextColor={colors.mutedForeground}
            autoFocus
          />

          {/* Category */}
          <Text style={[styles.label, { color: colors.mutedForeground }]}>Category</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.catScroll}
          >
            {BUDGET_CATEGORIES.map(cat => {
              const selected = categoryId === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.catChip,
                    { backgroundColor: selected ? cat.color : cat.color + '18', borderColor: cat.color },
                  ]}
                  onPress={() => {
                    setCategoryId(cat.id);
                    Haptics.selectionAsync();
                  }}
                >
                  <Feather name={cat.icon as any} size={14} color={selected ? '#fff' : cat.color} />
                  <Text style={[styles.catLabel, { color: selected ? '#fff' : cat.color }]}>
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Monthly limit */}
          <Text style={[styles.label, { color: colors.mutedForeground }]}>Monthly Limit ($)</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.muted }]}
            value={limit}
            onChangeText={setLimit}
            placeholder="500.00"
            placeholderTextColor={colors.mutedForeground}
            keyboardType="decimal-pad"
          />

          {/* Preview */}
          {name.trim() && limit && !isNaN(parseFloat(limit)) && (
            <View style={[styles.preview, { backgroundColor: selectedCat.color + '12', borderColor: selectedCat.color + '30' }]}>
              <View style={[styles.previewIcon, { backgroundColor: selectedCat.color + '20' }]}>
                <Feather name={selectedCat.icon as any} size={20} color={selectedCat.color} />
              </View>
              <View>
                <Text style={[styles.previewName, { color: colors.foreground }]}>{name}</Text>
                <Text style={[styles.previewLimit, { color: colors.mutedForeground }]}>
                  ${parseFloat(limit).toFixed(2)} / month
                </Text>
              </View>
            </View>
          )}

          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: colors.primary }]}
            onPress={handleSave}
            activeOpacity={0.85}
          >
            <Feather name="plus" size={18} color="#fff" />
            <Text style={styles.saveBtnText}>Create Budget</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1 },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    maxHeight: '85%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
  },
  body: {
    padding: 20,
    paddingTop: 0,
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 14,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
  },
  catScroll: {
    gap: 8,
    paddingHorizontal: 2,
    paddingBottom: 4,
  },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  catLabel: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
  },
  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 8,
  },
  previewIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewName: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  previewLimit: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 14,
    marginTop: 20,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
  },
});
