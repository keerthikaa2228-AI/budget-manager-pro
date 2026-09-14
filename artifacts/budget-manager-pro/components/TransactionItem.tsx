import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { Transaction, categoryById } from '@/contexts/BudgetContext';

interface Props {
  item: Transaction;
  onDelete: (id: string) => void;
}

function formatDate(dateStr: string): string {
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().split('T')[0];
  if (dateStr === today) return 'Today';
  if (dateStr === yesterday) return 'Yesterday';
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function TransactionItem({ item, onDelete }: Props) {
  const colors = useColors();
  const cat = categoryById(item.categoryId);
  const isIncome = item.type === 'income';
  const amountColor = isIncome ? colors.success : colors.destructive;
  const sign = isIncome ? '+' : '-';

  return (
    <TouchableOpacity
      style={[styles.row, { borderBottomColor: colors.border }]}
      onLongPress={() => onDelete(item.id)}
      activeOpacity={0.7}
      delayLongPress={400}
    >
      <View style={[styles.iconWrap, { backgroundColor: cat.color + '20' }]}>
        <Feather name={cat.icon as any} size={18} color={cat.color} />
      </View>

      <View style={styles.middle}>
        <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={1}>
          {item.title}
        </Text>
        <View style={styles.meta}>
          <Text style={[styles.category, { color: colors.mutedForeground }]}>
            {cat.name}
          </Text>
          <Text style={[styles.dot, { color: colors.mutedForeground }]}>·</Text>
          <Text style={[styles.date, { color: colors.mutedForeground }]}>
            {formatDate(item.date)}
          </Text>
        </View>
      </View>

      <Text style={[styles.amount, { color: amountColor }]}>
        {sign}${item.amount.toFixed(2)}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  middle: {
    flex: 1,
    gap: 3,
  },
  title: {
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  category: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  dot: {
    fontSize: 12,
  },
  date: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  amount: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    flexShrink: 0,
  },
});
