import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, TextInput,
  ScrollView, Animated, Platform, KeyboardAvoidingView,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { Expense, Category } from '@/contexts/ExpenseContext';
import * as Haptics from 'expo-haptics';

interface AddExpenseModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (data: Omit<Expense, 'id' | 'createdAt'>) => void;
  categories: Category[];
  editingExpense?: Expense | null;
}

function toDateStr(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatDisplayDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const now = new Date();
  const todayStr = toDateStr(now);
  const yest = new Date(now); yest.setDate(yest.getDate() - 1);
  if (dateStr === todayStr) return 'Today';
  if (dateStr === toDateStr(yest)) return 'Yesterday';
  return `${MONTH_SHORT[month - 1]} ${day}, ${year}`;
}

export function AddExpenseModal({ visible, onClose, onSave, categories, editingExpense }: AddExpenseModalProps) {
  const colors = useColors();
  const slideAnim = useRef(new Animated.Value(700)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const [amount, setAmount] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState(categories[0]?.id ?? '');
  const [date, setDate] = useState(new Date());
  const [note, setNote] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  const amountRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      if (editingExpense) {
        setAmount(editingExpense.amount.toFixed(2));
        setSelectedCategoryId(editingExpense.categoryId);
        const [y, m, d] = editingExpense.date.split('-').map(Number);
        setDate(new Date(y, m - 1, d));
        setNote(editingExpense.note);
      } else {
        setAmount('');
        setSelectedCategoryId(categories[0]?.id ?? '');
        setDate(new Date());
        setNote('');
      }
      setShowDatePicker(false);
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, damping: 28, stiffness: 300 }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start(() => amountRef.current?.focus());
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 700, duration: 250, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, editingExpense]);

  const handleSave = async () => {
    const parsed = parseFloat(amount.replace(/,/g, ''));
    if (!amount.trim() || isNaN(parsed) || parsed <= 0) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSave({
      amount: parsed,
      categoryId: selectedCategoryId,
      date: toDateStr(date),
      note: note.trim(),
    });
    onClose();
  };

  const canSave = !!amount.trim() && !isNaN(parseFloat(amount)) && parseFloat(amount) > 0;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kav}
        pointerEvents="box-none"
      >
        <Animated.View
          style={[styles.sheet, { backgroundColor: colors.card, transform: [{ translateY: slideAnim }] }]}
        >
          {/* Handle */}
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>
              {editingExpense ? 'Edit Expense' : 'Add Expense'}
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <Feather name="x" size={22} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          {/* Amount input */}
          <View style={[styles.amountRow, { borderColor: colors.border, backgroundColor: colors.muted }]}>
            <Text style={[styles.currencySign, { color: colors.primary }]}>$</Text>
            <TextInput
              ref={amountRef}
              style={[styles.amountInput, { color: colors.foreground }]}
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="decimal-pad"
              returnKeyType="done"
              selectTextOnFocus
            />
          </View>

          {/* Category picker */}
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Category</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.catScroll}
          >
            {categories.map(cat => {
              const isSelected = cat.id === selectedCategoryId;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.catChip,
                    {
                      backgroundColor: isSelected ? cat.color : colors.muted,
                      borderColor: isSelected ? cat.color : colors.border,
                    },
                  ]}
                  onPress={() => {
                    setSelectedCategoryId(cat.id);
                    Haptics.selectionAsync();
                  }}
                >
                  <Feather name={cat.icon as any} size={13} color={isSelected ? '#fff' : colors.mutedForeground} />
                  <Text style={[styles.catChipText, { color: isSelected ? '#fff' : colors.mutedForeground }]}>
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Date */}
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Date</Text>
          <TouchableOpacity
            style={[styles.dateRow, { backgroundColor: colors.muted, borderColor: colors.border }]}
            onPress={() => setShowDatePicker(prev => !prev)}
          >
            <Feather name="calendar" size={16} color={colors.mutedForeground} />
            <Text style={[styles.dateText, { color: colors.foreground }]}>
              {formatDisplayDate(toDateStr(date))}
            </Text>
            <Feather name="chevron-down" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              value={date}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              maximumDate={new Date()}
              onChange={(_, selectedDate) => {
                if (Platform.OS === 'android') setShowDatePicker(false);
                if (selectedDate) setDate(selectedDate);
              }}
              style={Platform.OS === 'ios' ? styles.iosPicker : undefined}
            />
          )}

          {/* Note */}
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Note (optional)</Text>
          <TextInput
            style={[styles.noteInput, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground }]}
            value={note}
            onChangeText={setNote}
            placeholder="e.g. Lunch with Sarah"
            placeholderTextColor={colors.mutedForeground}
            returnKeyType="done"
            maxLength={80}
          />

          {/* Save button */}
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: canSave ? colors.primary : colors.border, borderRadius: 14 }]}
            onPress={handleSave}
            disabled={!canSave}
            activeOpacity={0.85}
          >
            <Text style={[styles.saveBtnText, { color: canSave ? '#fff' : colors.mutedForeground }]}>
              {editingExpense ? 'Update' : 'Add Expense'}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  kav: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 36 : 20,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 20,
    gap: 8,
  },
  currencySign: {
    fontSize: 28,
    fontFamily: 'Inter_700Bold',
  },
  amountInput: {
    flex: 1,
    fontSize: 32,
    fontFamily: 'Inter_700Bold',
  },
  sectionLabel: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  catScroll: {
    gap: 8,
    paddingRight: 8,
    marginBottom: 18,
  },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  catChipText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 18,
  },
  dateText: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
  },
  iosPicker: {
    marginBottom: 8,
    marginHorizontal: -8,
  },
  noteInput: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    marginBottom: 20,
  },
  saveBtn: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    fontSize: 17,
    fontFamily: 'Inter_700Bold',
  },
});
