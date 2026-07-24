import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Platform, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useExpenses, Expense } from '@/contexts/ExpenseContext';
import { ExpenseItem } from '@/components/ExpenseItem';
import { MonthNavigator } from '@/components/MonthNavigator';
import { AddExpenseModal } from '@/components/AddExpenseModal';

export default function ExpensesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    filteredExpenses, categories, monthlyTotal,
    currentMonth, setCurrentMonth,
    addExpense, updateExpense, deleteExpense,
    categoryById, isLoading,
  } = useExpenses();

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  const handlePrevMonth = useCallback(() => {
    const d = new Date(currentMonth);
    d.setMonth(d.getMonth() - 1);
    setCurrentMonth(d);
    Haptics.selectionAsync();
  }, [currentMonth, setCurrentMonth]);

  const handleNextMonth = useCallback(() => {
    const now = new Date();
    const d = new Date(currentMonth);
    d.setMonth(d.getMonth() + 1);
    if (d <= now) {
      setCurrentMonth(d);
      Haptics.selectionAsync();
    }
  }, [currentMonth, setCurrentMonth]);

  const handleEdit = useCallback((expense: Expense) => {
    setEditingExpense(expense);
    setShowAddModal(true);
  }, []);

  const handleSave = useCallback((data: Omit<Expense, 'id' | 'createdAt'>) => {
    if (editingExpense) {
      updateExpense(editingExpense.id, data);
    } else {
      addExpense(data);
    }
    setEditingExpense(null);
  }, [editingExpense, addExpense, updateExpense]);

  const handleCloseModal = useCallback(() => {
    setShowAddModal(false);
    setEditingExpense(null);
  }, []);

  const topPad = Platform.OS === 'web'
    ? Math.max(insets.top, 67)
    : insets.top;
  const bottomPad = Platform.OS === 'web' ? 84 + 34 : 84;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 16, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <MonthNavigator
          currentMonth={currentMonth}
          onPrev={handlePrevMonth}
          onNext={handleNextMonth}
        />
        <View style={styles.totalContainer}>
          {isLoading ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <>
              <Text style={[styles.totalLabel, { color: colors.mutedForeground }]}>
                Monthly Total
              </Text>
              <Text style={[styles.totalAmount, { color: colors.foreground }]}>
                ${monthlyTotal.toFixed(2)}
              </Text>
              {filteredExpenses.length > 0 && (
                <Text style={[styles.expenseCount, { color: colors.mutedForeground }]}>
                  {filteredExpenses.length} expense{filteredExpenses.length !== 1 ? 's' : ''}
                </Text>
              )}
            </>
          )}
        </View>
      </View>

      {/* Expense list */}
      <FlatList
        data={filteredExpenses}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <ExpenseItem
            expense={item}
            category={categoryById(item.categoryId)}
            onDelete={deleteExpense}
            onEdit={handleEdit}
          />
        )}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: bottomPad },
          filteredExpenses.length === 0 && styles.emptyContainer,
        ]}
        ListEmptyComponent={
          isLoading ? null : (
            <View style={styles.emptyState}>
              <View style={[styles.emptyIcon, { backgroundColor: colors.muted }]}>
                <Feather name="inbox" size={32} color={colors.mutedForeground} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                No expenses yet
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
                Tap the + button to add your first expense
              </Text>
            </View>
          )
        }
        showsVerticalScrollIndicator={false}
        scrollEnabled={filteredExpenses.length > 0}
      />

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary, bottom: bottomPad - 64 }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setShowAddModal(true);
        }}
        activeOpacity={0.85}
      >
        <Feather name="plus" size={28} color="#fff" />
      </TouchableOpacity>

      <AddExpenseModal
        visible={showAddModal}
        onClose={handleCloseModal}
        onSave={handleSave}
        categories={categories}
        editingExpense={editingExpense}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    alignItems: 'center',
    gap: 16,
  },
  totalContainer: {
    alignItems: 'center',
    gap: 2,
  },
  totalLabel: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  totalAmount: {
    fontSize: 40,
    fontFamily: 'Inter_700Bold',
  },
  expenseCount: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
  },
  listContent: {
    padding: 16,
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 40,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    paddingHorizontal: 32,
    lineHeight: 22,
  },
  fab: {
    position: 'absolute',
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
});
