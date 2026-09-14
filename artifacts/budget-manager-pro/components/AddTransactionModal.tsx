import React, { useRef, useState } from 'react';
import {
  Alert,
  Keyboard,
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
import { CATEGORIES, Transaction } from '@/contexts/BudgetContext';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSave: (data: Omit<Transaction, 'id'>) => void;
}

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

export function AddTransactionModal({ visible, onClose, onSave }: Props) {
  const colors = useColors();
  const [amount, setAmount] = useState('');
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [categoryId, setCategoryId] = useState('food');
  const [date, setDate] = useState(todayStr());
  const amountRef = useRef<TextInput>(null);

  const filteredCategories = CATEGORIES.filter(
    c => c.transactionType === type || c.transactionType === 'both',
  );

  const handleSave = () => {
    const num = parseFloat(amount.replace(',', '.'));
    if (!amount || isNaN(num) || num <= 0) {
      Alert.alert('Invalid amount', 'Please enter a valid amount greater than 0.');
      return;
    }
    if (!title.trim()) {
      Alert.alert('Missing title', 'Please enter a description for this transaction.');
      return;
    }
    onSave({ title: title.trim(), amount: num, type, categoryId, date, note: note.trim() });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    reset();
    onClose();
  };

  const reset = () => {
    setAmount('');
    setTitle('');
    setNote('');
    setType('expense');
    setCategoryId('food');
    setDate(todayStr());
  };

  const handleClose = () => {
    Keyboard.dismiss();
    reset();
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={handleClose} />
      <View style={[styles.sheet, { backgroundColor: colors.card }]}>
        <View style={[styles.handle, { backgroundColor: colors.border }]} />

        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Add Transaction</Text>
          <TouchableOpacity onPress={handleClose} hitSlop={12}>
            <Feather name="x" size={22} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.body}
        >
          {/* Type toggle */}
          <View style={[styles.toggle, { backgroundColor: colors.muted }]}>
            {(['expense', 'income'] as const).map(t => (
              <TouchableOpacity
                key={t}
                style={[
                  styles.toggleBtn,
                  type === t && {
                    backgroundColor: t === 'income' ? colors.success : colors.destructive,
                  },
                ]}
                onPress={() => {
                  setType(t);
                  setCategoryId(t === 'income' ? 'salary' : 'food');
                  Haptics.selectionAsync();
                }}
              >
                <Text
                  style={[
                    styles.toggleText,
                    { color: type === t ? '#fff' : colors.mutedForeground },
                  ]}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Amount */}
          <View style={[styles.amountRow, { borderColor: colors.border }]}>
            <Text style={[styles.currencySign, { color: colors.mutedForeground }]}>$</Text>
            <TextInput
              ref={amountRef}
              style={[styles.amountInput, { color: colors.foreground }]}
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              placeholderTextColor={colors.border}
              keyboardType="decimal-pad"
              autoFocus
            />
          </View>

          {/* Categories */}
          <Text style={[styles.label, { color: colors.mutedForeground }]}>Category</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.catScroll}
          >
            {filteredCategories.map(cat => {
              const selected = categoryId === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.catChip,
                    {
                      backgroundColor: selected ? cat.color : cat.color + '18',
                      borderColor: cat.color,
                    },
                  ]}
                  onPress={() => { setCategoryId(cat.id); Haptics.selectionAsync(); }}
                >
                  <Feather name={cat.icon as any} size={14} color={selected ? '#fff' : cat.color} />
                  <Text style={[styles.catLabel, { color: selected ? '#fff' : cat.color }]}>
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Title */}
          <Text style={[styles.label, { color: colors.mutedForeground }]}>Description</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.muted }]}
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Lunch at Chipotle"
            placeholderTextColor={colors.mutedForeground}
            returnKeyType="next"
          />

          {/* Date */}
          <Text style={[styles.label, { color: colors.mutedForeground }]}>Date (YYYY-MM-DD)</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.muted }]}
            value={date}
            onChangeText={setDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.mutedForeground}
            keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default'}
          />

          {/* Note */}
          <Text style={[styles.label, { color: colors.mutedForeground }]}>Note (optional)</Text>
          <TextInput
            style={[styles.input, styles.noteInput, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.muted }]}
            value={note}
            onChangeText={setNote}
            placeholder="Add a note…"
            placeholderTextColor={colors.mutedForeground}
            multiline
            numberOfLines={2}
          />

          {/* Save button */}
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: colors.primary }]}
            onPress={handleSave}
            activeOpacity={0.85}
          >
            <Feather name="check" size={18} color="#fff" />
            <Text style={styles.saveBtnText}>Add Transaction</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    maxHeight: '90%',
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
    gap: 8,
    paddingTop: 0,
  },
  toggle: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    marginBottom: 8,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 9,
    alignItems: 'center',
  },
  toggleText: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 2,
    paddingBottom: 8,
    marginBottom: 20,
    gap: 4,
  },
  currencySign: {
    fontSize: 36,
    fontFamily: 'Inter_600SemiBold',
  },
  amountInput: {
    flex: 1,
    fontSize: 48,
    fontFamily: 'Inter_700Bold',
    padding: 0,
  },
  label: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 12,
    marginBottom: 6,
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
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    marginBottom: 4,
  },
  noteInput: {
    minHeight: 64,
    textAlignVertical: 'top',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 14,
    marginTop: 16,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
  },
});
