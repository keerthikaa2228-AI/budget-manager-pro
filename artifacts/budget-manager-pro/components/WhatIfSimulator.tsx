import React, { useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import type { Budget, Transaction } from '@/contexts/BudgetContext';
import {
  calculateSpendingTwinScenario,
  getSpendingTwinCategories,
  type SpendingTwinProjection,
} from '@/lib/spendingTwin';

interface Props {
  projection: SpendingTwinProjection;
  transactions: readonly Transaction[];
  budgets: readonly Budget[];
  referenceDate: Date;
}

const money = (amount: number) =>
  `₹${Math.round(Math.max(0, amount)).toLocaleString('en-IN')}`;

export function WhatIfSimulator({
  projection,
  transactions,
  budgets,
  referenceDate,
}: Props) {
  const colors = useColors();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [weeklyReduction, setWeeklyReduction] = useState(200);
  const categories = useMemo(
    () => getSpendingTwinCategories(transactions, referenceDate),
    [transactions, referenceDate],
  );
  const selectedCategory = categories.find(
    (category) => category.categoryId === selectedCategoryId,
  ) ?? categories[0];
  const scenario = selectedCategory
    ? calculateSpendingTwinScenario(
        projection,
        transactions,
        selectedCategory.categoryId,
        weeklyReduction,
        referenceDate,
      )
    : null;
  const simulatedTotal = scenario?.projectedMonthEnd ?? projection.projectedMonthEnd;
  const savings = scenario?.projectedSavings ?? 0;

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.header}>
        <View style={[styles.iconWrap, { backgroundColor: colors.accent + '14' }]}>
          <Feather name="sliders" size={17} color={colors.accent} />
        </View>
        <View style={styles.headerCopy}>
          <Text style={[styles.title, { color: colors.foreground }]}>What if?</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Try a change without touching your real transactions
          </Text>
        </View>
      </View>

      {categories.length === 0 ? (
        <View style={[styles.empty, { backgroundColor: colors.muted }]}>
          <Feather name="plus-circle" size={16} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            Add an expense to a category to run a projection experiment.
          </Text>
        </View>
      ) : (
        <>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>
            Reduce spending in
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryRow}
          >
            {categories.map((category) => {
              const selected = category.categoryId === selectedCategory?.categoryId;
              return (
                <TouchableOpacity
                  key={category.categoryId}
                  style={[
                    styles.categoryChip,
                    {
                      backgroundColor: selected ? colors.primary : colors.primary + '12',
                      borderColor: selected ? colors.primary : colors.primary + '30',
                    },
                  ]}
                  onPress={() => setSelectedCategoryId(category.categoryId)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.categoryText,
                      { color: selected ? '#fff' : colors.primary },
                    ]}
                  >
                    {category.categoryName}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={styles.controlRow}>
            <View style={styles.controlCopy}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>
                Weekly reduction
              </Text>
              <Text style={[styles.amount, { color: colors.foreground }]}>
                {money(weeklyReduction)}
                <Text style={[styles.amountSuffix, { color: colors.mutedForeground }]}>
                  {' '} / week
                </Text>
              </Text>
            </View>
            <View style={styles.stepper}>
              <TouchableOpacity
                style={[styles.stepButton, { backgroundColor: colors.muted }]}
                onPress={() => setWeeklyReduction((value) => Math.max(0, value - 50))}
                accessibilityLabel="Reduce weekly amount"
              >
                <Feather name="minus" size={17} color={colors.foreground} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.stepButton, { backgroundColor: colors.primary }]}
                onPress={() => setWeeklyReduction((value) => Math.min(10_000, value + 50))}
                accessibilityLabel="Increase weekly amount"
              >
                <Feather name="plus" size={17} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.compareRow}>
            <View style={[styles.compareBox, { backgroundColor: colors.muted }]}>
              <Text style={[styles.compareLabel, { color: colors.mutedForeground }]}>
                Current projection
              </Text>
              <Text style={[styles.compareValue, { color: colors.foreground }]}>
                {money(projection.projectedMonthEnd)}
              </Text>
            </View>
            <Feather name="arrow-right" size={18} color={colors.mutedForeground} />
            <View style={[styles.compareBox, { backgroundColor: colors.primary + '12' }]}>
              <Text style={[styles.compareLabel, { color: colors.primary }]}>
                With this change
              </Text>
              <Text style={[styles.compareValue, { color: colors.primary }]}>
                {money(simulatedTotal)}
              </Text>
            </View>
          </View>

          <View style={[styles.savingsLine, { borderTopColor: colors.border }]}>
            <Feather name="trending-down" size={15} color={colors.success} />
            <Text style={[styles.savingsText, { color: colors.success }]}>
              {savings > 0
                ? `Projected savings: ${money(savings)} by month-end`
                : 'Increase the reduction to see projected savings'}
            </Text>
          </View>
        </>
      )}
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
    gap: 13,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: { flex: 1, gap: 2 },
  title: { fontSize: 16, fontFamily: 'Inter_700Bold' },
  subtitle: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  label: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    textTransform: 'uppercase',
    letterSpacing: 0.35,
  },
  categoryRow: { gap: 8, paddingRight: 4 },
  categoryChip: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  categoryText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  controlCopy: { gap: 4 },
  amount: { fontSize: 22, fontFamily: 'Inter_700Bold' },
  amountSuffix: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  stepper: { flexDirection: 'row', gap: 8 },
  stepButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compareRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  compareBox: {
    flex: 1,
    minHeight: 66,
    padding: 10,
    borderRadius: 13,
    justifyContent: 'center',
    gap: 4,
  },
  compareLabel: { fontSize: 10, fontFamily: 'Inter_500Medium' },
  compareValue: { fontSize: 18, fontFamily: 'Inter_700Bold' },
  savingsLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderTopWidth: 1,
    paddingTop: 11,
  },
  savingsText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  empty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
  },
  emptyText: { flex: 1, fontSize: 12, lineHeight: 17, fontFamily: 'Inter_400Regular' },
});