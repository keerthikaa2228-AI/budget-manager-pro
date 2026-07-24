import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useExpenses } from '@/contexts/ExpenseContext';
import { useSubscription } from '@/lib/revenuecat';
import { DonutChart } from '@/components/DonutChart';
import { TrendChart } from '@/components/TrendChart';
import { PaywallModal } from '@/components/PaywallModal';
import { MonthNavigator } from '@/components/MonthNavigator';
import * as Haptics from 'expo-haptics';

export default function StatsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { isSubscribed } = useSubscription();
  const { filteredExpenses, categories, monthlyTotal, totalByCategory, lastSixMonths, currentMonth, setCurrentMonth, categoryById } = useExpenses();
  const [showPaywall, setShowPaywall] = useState(false);

  const topPad = Platform.OS === 'web' ? Math.max(insets.top, 67) : insets.top;
  const bottomPad = Platform.OS === 'web' ? 84 + 34 : 84;

  const handlePrevMonth = () => {
    const d = new Date(currentMonth);
    d.setMonth(d.getMonth() - 1);
    setCurrentMonth(d);
    Haptics.selectionAsync();
  };
  const handleNextMonth = () => {
    const now = new Date();
    const d = new Date(currentMonth);
    d.setMonth(d.getMonth() + 1);
    if (d <= now) { setCurrentMonth(d); Haptics.selectionAsync(); }
  };

  const chartSegments = categories
    .filter(cat => (totalByCategory[cat.id] ?? 0) > 0)
    .map(cat => ({
      value: totalByCategory[cat.id] ?? 0,
      color: cat.color,
      label: cat.name,
    }))
    .sort((a, b) => b.value - a.value);

  const trendData = lastSixMonths.map(m => ({ label: m.label, total: m.total }));

  if (!isSubscribed) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Blurred preview */}
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingTop: topPad + 16, paddingBottom: bottomPad }]}
          pointerEvents="none"
          style={{ opacity: 0.18 }}
        >
          <View style={styles.previewSection}>
            <DonutChart segments={[{ value: 40, color: '#EF4444', label: 'Food' }, { value: 30, color: '#3B82F6', label: 'Transport' }, { value: 30, color: '#8B5CF6', label: 'Shopping' }]} total={100} size={200} />
          </View>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.dummyBar, { backgroundColor: colors.border, width: '80%' }]} />
            <View style={[styles.dummyBar, { backgroundColor: colors.border, width: '60%' }]} />
            <View style={[styles.dummyBar, { backgroundColor: colors.border, width: '40%' }]} />
          </View>
        </ScrollView>

        {/* Lock overlay */}
        <View style={[StyleSheet.absoluteFill, styles.lockOverlay]}>
          <View style={[styles.lockCard, { backgroundColor: colors.card }]}>
            <View style={[styles.lockIconBg, { backgroundColor: `${colors.accent}18` }]}>
              <Feather name="lock" size={28} color={colors.accent} />
            </View>
            <Text style={[styles.lockTitle, { color: colors.foreground }]}>
              Charts & Analytics
            </Text>
            <Text style={[styles.lockSubtitle, { color: colors.mutedForeground }]}>
              Upgrade to Premium to unlock spending charts, category breakdowns, and monthly trend comparisons.
            </Text>
            <TouchableOpacity
              style={[styles.unlockBtn, { backgroundColor: colors.primary }]}
              onPress={() => setShowPaywall(true)}
              activeOpacity={0.85}
            >
              <Feather name="star" size={16} color="#fff" />
              <Text style={styles.unlockBtnText}>Unlock Premium · $1.99</Text>
            </TouchableOpacity>
          </View>
        </View>

        <PaywallModal visible={showPaywall} onClose={() => setShowPaywall(false)} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingTop: topPad + 16, paddingBottom: bottomPad }]}
      >
        {/* Month nav */}
        <View style={styles.monthNavRow}>
          <MonthNavigator currentMonth={currentMonth} onPrev={handlePrevMonth} onNext={handleNextMonth} />
        </View>

        {filteredExpenses.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="bar-chart-2" size={40} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No data this month</Text>
            <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>Add expenses to see your spending breakdown</Text>
          </View>
        ) : (
          <>
            {/* Donut chart */}
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Spending by Category</Text>
              <View style={styles.chartCenter}>
                <DonutChart segments={chartSegments} total={monthlyTotal} size={210} />
              </View>
              {/* Legend */}
              <View style={styles.legend}>
                {chartSegments.map((seg, i) => {
                  const pct = monthlyTotal > 0 ? ((seg.value / monthlyTotal) * 100).toFixed(0) : '0';
                  return (
                    <View key={i} style={styles.legendRow}>
                      <View style={[styles.legendDot, { backgroundColor: seg.color }]} />
                      <Text style={[styles.legendLabel, { color: colors.foreground }]}>{seg.label}</Text>
                      <Text style={[styles.legendPct, { color: colors.mutedForeground }]}>{pct}%</Text>
                      <Text style={[styles.legendAmount, { color: colors.foreground }]}>${seg.value.toFixed(2)}</Text>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Trend chart */}
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Monthly Trend</Text>
              <Text style={[styles.cardSubtitle, { color: colors.mutedForeground }]}>Last 6 months</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.trendScroll}>
                <TrendChart data={trendData} width={360} height={180} />
              </ScrollView>
            </View>

            {/* Monthly summary */}
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Summary</Text>
              <View style={styles.summaryGrid}>
                <View style={[styles.summaryItem, { backgroundColor: colors.muted, borderRadius: 12 }]}>
                  <Text style={[styles.summaryValue, { color: colors.primary }]}>${monthlyTotal.toFixed(2)}</Text>
                  <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Total Spent</Text>
                </View>
                <View style={[styles.summaryItem, { backgroundColor: colors.muted, borderRadius: 12 }]}>
                  <Text style={[styles.summaryValue, { color: colors.foreground }]}>
                    {filteredExpenses.length}
                  </Text>
                  <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Transactions</Text>
                </View>
                <View style={[styles.summaryItem, { backgroundColor: colors.muted, borderRadius: 12 }]}>
                  <Text style={[styles.summaryValue, { color: colors.foreground }]}>
                    ${filteredExpenses.length > 0 ? (monthlyTotal / filteredExpenses.length).toFixed(2) : '0.00'}
                  </Text>
                  <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Avg / Entry</Text>
                </View>
                <View style={[styles.summaryItem, { backgroundColor: colors.muted, borderRadius: 12 }]}>
                  <Text style={[styles.summaryValue, { color: colors.foreground }]}>
                    {chartSegments.length}
                  </Text>
                  <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Categories</Text>
                </View>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16, gap: 16 },
  monthNavRow: { alignItems: 'center', marginBottom: 4 },
  card: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    gap: 12,
  },
  cardTitle: { fontSize: 17, fontFamily: 'Inter_600SemiBold' },
  cardSubtitle: { fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: -8 },
  chartCenter: { alignItems: 'center' },
  legend: { gap: 10 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  legendDot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  legendLabel: { flex: 1, fontSize: 14, fontFamily: 'Inter_500Medium' },
  legendPct: { fontSize: 13, fontFamily: 'Inter_400Regular', width: 36, textAlign: 'right' },
  legendAmount: { fontSize: 14, fontFamily: 'Inter_600SemiBold', width: 70, textAlign: 'right' },
  trendScroll: { marginHorizontal: -4 },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  summaryItem: { flex: 1, minWidth: '45%', padding: 14, alignItems: 'center', gap: 4 },
  summaryValue: { fontSize: 20, fontFamily: 'Inter_700Bold' },
  summaryLabel: { fontSize: 12, fontFamily: 'Inter_400Regular', textAlign: 'center' },
  emptyState: { alignItems: 'center', gap: 12, paddingVertical: 60 },
  emptyTitle: { fontSize: 18, fontFamily: 'Inter_600SemiBold' },
  emptySubtitle: { fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center', paddingHorizontal: 32 },
  previewSection: { alignItems: 'center', paddingVertical: 20 },
  dummyBar: { height: 16, borderRadius: 8, marginBottom: 8 },
  lockOverlay: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  lockCard: {
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
    maxWidth: 320,
    width: '100%',
  },
  lockIconBg: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  lockTitle: { fontSize: 22, fontFamily: 'Inter_700Bold', textAlign: 'center' },
  lockSubtitle: { fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 22 },
  unlockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 4,
  },
  unlockBtnText: { color: '#fff', fontSize: 16, fontFamily: 'Inter_700Bold' },
});
