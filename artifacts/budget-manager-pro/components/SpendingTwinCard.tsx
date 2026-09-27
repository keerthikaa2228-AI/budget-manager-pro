import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import type {
  SpendingTwinChange,
  SpendingTwinProjection,
} from '@/lib/spendingTwin';

interface Props {
  projection: SpendingTwinProjection;
  change: SpendingTwinChange | null;
}

const money = (amount: number) =>
  `₹${Math.round(Math.max(0, amount)).toLocaleString('en-IN')}`;

export function SpendingTwinCard({ projection, change }: Props) {
  const colors = useColors();
  const isOverBudget = projection.trajectoryStatus === 'over-budget';
  const statusColor =
    projection.trajectoryStatus === 'no-budget'
      ? colors.accent
      : isOverBudget
        ? colors.destructive
        : colors.success;
  const statusLabel =
    projection.trajectoryStatus === 'no-budget'
      ? 'No budget set'
      : isOverBudget
        ? 'Over projected budget'
        : 'On track';
  const varianceLabel =
    projection.budgetVariance === null
      ? 'Set a budget to see your buffer'
      : projection.budgetVariance >= 0
        ? `${money(projection.budgetVariance)} buffer`
        : `${money(Math.abs(projection.budgetVariance))} over`;
  const budgetProgress =
    projection.monthlyBudget === null
      ? 0
      : Math.min(projection.projectedMonthEnd / projection.monthlyBudget, 1);

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.header}>
        <View style={[styles.iconWrap, { backgroundColor: colors.primary + '14' }]}>
          <Feather name="activity" size={18} color={colors.primary} />
        </View>
        <View style={styles.headerCopy}>
          <Text style={[styles.title, { color: colors.foreground }]}>Spending Twin</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Live pace from your on-device transactions
          </Text>
        </View>
        <View style={[styles.statusPill, { backgroundColor: statusColor + '18' }]}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
        </View>
      </View>

      <View style={styles.metricRow}>
        <View style={styles.metric}>
          <Text style={[styles.metricLabel, { color: colors.mutedForeground }]}>Spent this month</Text>
          <Text style={[styles.metricValue, { color: colors.foreground }]}>
            {money(projection.spendingSoFar)}
          </Text>
        </View>
        <View style={[styles.metricDivider, { backgroundColor: colors.border }]} />
        <View style={styles.metric}>
          <Text style={[styles.metricLabel, { color: colors.mutedForeground }]}>Projected month-end</Text>
          <Text style={[styles.metricValue, { color: statusColor }]}>
            {money(projection.projectedMonthEnd)}
          </Text>
        </View>
      </View>

      <View style={styles.budgetLine}>
        <View style={styles.budgetCopy}>
          <Text style={[styles.budgetLabel, { color: colors.mutedForeground }]}>
            {projection.monthlyBudget === null ? 'Monthly budget' : `Budget · ${varianceLabel}`}
          </Text>
          <Text style={[styles.budgetValue, { color: colors.foreground }]}>
            {projection.monthlyBudget === null ? 'Not set' : money(projection.monthlyBudget)}
          </Text>
        </View>
        <Text style={[styles.daysLeft, { color: colors.mutedForeground }]}>
          {projection.remainingDays} day{projection.remainingDays === 1 ? '' : 's'} left
        </Text>
      </View>

      {projection.monthlyBudget !== null && (
        <View style={[styles.progressTrack, { backgroundColor: colors.muted }]}>
          <View
            style={[
              styles.progressFill,
              { width: `${budgetProgress * 100}%`, backgroundColor: statusColor },
            ]}
          />
        </View>
      )}

      <View style={[styles.changeBox, { backgroundColor: colors.muted }]}>
        <Feather name="zap" size={15} color={colors.accent} />
        <View style={styles.changeCopy}>
          <Text style={[styles.changeLabel, { color: colors.foreground }]}>What changed this week</Text>
          <Text style={[styles.changeText, { color: colors.mutedForeground }]} numberOfLines={2}>
            {change?.description ?? 'No recent expense pattern to call out yet.'}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    gap: 14,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: { flex: 1, gap: 2 },
  title: { fontSize: 16, fontFamily: 'Inter_700Bold' },
  subtitle: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 10, fontFamily: 'Inter_700Bold' },
  metricRow: { flexDirection: 'row', alignItems: 'center' },
  metric: { flex: 1, gap: 4 },
  metricDivider: { width: 1, height: 34, marginHorizontal: 14 },
  metricLabel: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  metricValue: { fontSize: 21, fontFamily: 'Inter_700Bold' },
  budgetLine: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  budgetCopy: { gap: 3 },
  budgetLabel: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  budgetValue: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  daysLeft: { fontSize: 11, fontFamily: 'Inter_500Medium' },
  progressTrack: { height: 7, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  changeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    padding: 11,
    borderRadius: 12,
  },
  changeCopy: { flex: 1, gap: 3 },
  changeLabel: { fontSize: 12, fontFamily: 'Inter_700Bold' },
  changeText: { fontSize: 12, lineHeight: 17, fontFamily: 'Inter_400Regular' },
});