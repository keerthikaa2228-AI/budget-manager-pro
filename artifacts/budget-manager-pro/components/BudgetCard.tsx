import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { Budget } from '@/contexts/BudgetContext';

interface Props {
  budget: Budget;
  spent: number;
}

export function BudgetCard({ budget, spent }: Props) {
  const colors = useColors();
  const pct = budget.limit > 0 ? Math.min(spent / budget.limit, 1) : 0;
  const isOver = spent > budget.limit;
  const barColor = isOver ? colors.destructive : pct > 0.8 ? '#F59E0B' : colors.primary;
  const remaining = Math.max(budget.limit - spent, 0);

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.iconWrap, { backgroundColor: budget.color + '20' }]}>
          <Feather name={budget.icon as any} size={18} color={budget.color} />
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
            {budget.name}
          </Text>
          <Text style={[styles.remaining, { color: colors.mutedForeground }]}>
            {isOver
              ? `$${(spent - budget.limit).toFixed(2)} over`
              : `$${remaining.toFixed(2)} left`}
          </Text>
        </View>
        <Text style={[styles.pct, { color: isOver ? colors.destructive : colors.mutedForeground }]}>
          {Math.round(pct * 100)}%
        </Text>
      </View>

      {/* Progress bar */}
      <View style={[styles.barBg, { backgroundColor: colors.muted }]}>
        <View
          style={[
            styles.barFill,
            { width: `${pct * 100}%` as any, backgroundColor: barColor },
          ]}
        />
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
          Spent{' '}
          <Text style={{ color: isOver ? colors.destructive : colors.foreground, fontFamily: 'Inter_600SemiBold' }}>
            ${spent.toFixed(2)}
          </Text>
        </Text>
        <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
          of <Text style={{ color: colors.foreground, fontFamily: 'Inter_600SemiBold' }}>${budget.limit.toFixed(2)}</Text>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
  },
  remaining: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
  },
  pct: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  barBg: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: 6,
    borderRadius: 3,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
  },
});
