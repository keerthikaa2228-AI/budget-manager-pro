import React, { useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated, Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { Expense, Category } from '@/contexts/ExpenseContext';

interface ExpenseItemProps {
  expense: Expense;
  category: Category | undefined;
  onDelete: (id: string) => void;
  onEdit: (expense: Expense) => void;
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yd = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

  if (dateStr === today) return 'Today';
  if (dateStr === yd) return 'Yesterday';
  return `${MONTH_NAMES[month - 1]} ${day}`;
}

export function ExpenseItem({ expense, category, onDelete, onEdit }: ExpenseItemProps) {
  const colors = useColors();
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 30 }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30 }).start();
  };

  const handleLongPress = () => {
    Alert.alert(
      expense.note || 'Expense',
      `$${expense.amount.toFixed(2)} · ${category?.name ?? 'Unknown'}`,
      [
        { text: 'Edit', onPress: () => onEdit(expense) },
        { text: 'Delete', style: 'destructive', onPress: () => onDelete(expense.id) },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={() => onEdit(expense)}
      onLongPress={handleLongPress}
      delayLongPress={400}
    >
      <Animated.View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border, transform: [{ scale }] }]}>
        {/* Category dot */}
        <View style={[styles.iconDot, { backgroundColor: category?.color ?? colors.muted }]}>
          <Feather name={(category?.icon as any) ?? 'circle'} size={14} color="#fff" />
        </View>

        {/* Info */}
        <View style={styles.info}>
          <Text style={[styles.category, { color: colors.foreground }]} numberOfLines={1}>
            {category?.name ?? 'Unknown'}
          </Text>
          {expense.note ? (
            <Text style={[styles.note, { color: colors.mutedForeground }]} numberOfLines={1}>
              {expense.note}
            </Text>
          ) : (
            <Text style={[styles.note, { color: colors.mutedForeground }]}>
              {formatDate(expense.date)}
            </Text>
          )}
        </View>

        {/* Right side */}
        <View style={styles.right}>
          <Text style={[styles.amount, { color: colors.foreground }]}>
            ${expense.amount.toFixed(2)}
          </Text>
          {expense.note ? (
            <Text style={[styles.date, { color: colors.mutedForeground }]}>
              {formatDate(expense.date)}
            </Text>
          ) : null}
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    gap: 12,
  },
  iconDot: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  category: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
  },
  note: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
  },
  right: {
    alignItems: 'flex-end',
    gap: 2,
  },
  amount: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
  },
  date: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
});
