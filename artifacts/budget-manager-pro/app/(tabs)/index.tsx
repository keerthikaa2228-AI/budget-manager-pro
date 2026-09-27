import React, { useState } from 'react';
import {
  Alert,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useBudget } from '@/contexts/BudgetContext';
import { TransactionItem } from '@/components/TransactionItem';
import { AddTransactionModal } from '@/components/AddTransactionModal';
import { AIAssistantCard } from '@/components/AIAssistantCard';
import { SpendingTwinCard } from '@/components/SpendingTwinCard';
import { WhatIfSimulator } from '@/components/WhatIfSimulator';
import { MoneyPatternCard } from '@/components/MoneyPatternCard';
import { getRotatingTips } from '@/lib/budgetAssistant';
import { analyzeMoneyPattern } from '@/lib/moneyPersona';
import {
  calculateSpendingTwin,
  describeSpendingTwinChange,
} from '@/lib/spendingTwin';
import { useSubscription } from '@/lib/revenuecat';
import { router } from 'expo-router';

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    transactions,
    budgets,
    recentTransactions,
    getMonthlyTotals,
    deleteTransaction,
    addTransaction,
  } = useBudget();
  const { hasAIAssistant, showAIAssistantPaywall } = useSubscription();
  const [showAdd, setShowAdd] = useState(false);

  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const { income, expense, net } = getMonthlyTotals(monthKey);
  const isPositive = net >= 0;
  const spendingTwin = calculateSpendingTwin(transactions, budgets, now);
  const spendingTwinChange = describeSpendingTwinChange(transactions, now);
  const moneyPattern = analyzeMoneyPattern(transactions);

  const topPad = Platform.OS === 'web' ? Math.max(insets.top, 67) : insets.top;
  const bottomPad = Platform.OS === 'web' ? 84 + 34 : 84;
  const aiTips = getRotatingTips(transactions);

  const openAssistant = async () => {
    if (hasAIAssistant) {
      router.push('/assistant');
    } else {
        const outcome = await showAIAssistantPaywall();
        if (outcome === 'unavailable' || outcome === 'error') {
        Alert.alert(
            outcome === 'unavailable' ? 'AI Assistant is unavailable' : 'Could not open purchase',
            outcome === 'unavailable'
              ? 'A suitable monthly AI offering is not available yet. Please try again later.'
              : 'The AI Assistant purchase screen could not be opened. Please try again.',
        );
      }
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete Transaction', 'Remove this transaction?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: () => {
          deleteTransaction(id);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={recentTransactions}
        keyExtractor={item => item.id}
        ListHeaderComponent={
          <>
            {/* Header */}
            <View style={[styles.header, { paddingTop: topPad + 8 }]}>
              <View>
                <Text style={[styles.greeting, { color: colors.mutedForeground }]}>
                  {greeting()} 👋
                </Text>
                <Text style={[styles.headerTitle, { color: colors.foreground }]}>
                  Budget Manager
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.botButton, { backgroundColor: colors.accent + '18' }]}
                onPress={openAssistant}
                activeOpacity={0.8}
                accessibilityLabel="Open Budget Assistant"
              >
                <Feather name="message-circle" size={21} color={colors.accent} />
                {!hasAIAssistant && (
                  <View style={[styles.botLock, { backgroundColor: colors.accent }]}>
                    <Feather name="lock" size={8} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* Balance card */}
            <LinearGradient
              colors={['#1A3A6E', '#1A56DB']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.balanceCard}
            >
              <Text style={styles.balanceLabel}>
                {MONTHS[now.getMonth()]} {now.getFullYear()}
              </Text>
              <Text style={styles.balanceAmount}>
                {isPositive ? '+' : '-'}${Math.abs(net).toFixed(2)}
              </Text>
              <Text style={styles.balanceSub}>Net this month</Text>

              <View style={styles.balanceRow}>
                <View style={styles.balancePill}>
                  <Feather name="arrow-down-left" size={14} color="#4ADE80" />
                  <View>
                    <Text style={styles.pillLabel}>Income</Text>
                    <Text style={styles.pillAmount}>${income.toFixed(2)}</Text>
                  </View>
                </View>
                <View style={[styles.balanceDivider]} />
                <View style={styles.balancePill}>
                  <Feather name="arrow-up-right" size={14} color="#F87171" />
                  <View>
                    <Text style={styles.pillLabel}>Expenses</Text>
                    <Text style={styles.pillAmount}>${expense.toFixed(2)}</Text>
                  </View>
                </View>
              </View>
            </LinearGradient>

            <SpendingTwinCard
              projection={spendingTwin}
              change={spendingTwinChange}
            />
            <WhatIfSimulator
              projection={spendingTwin}
              transactions={transactions}
              budgets={budgets}
              referenceDate={now}
            />
            <MoneyPatternCard
              analysis={moneyPattern}
              locked={!hasAIAssistant}
              onUnlock={openAssistant}
            />

            {/* Proactive local insights */}
            <AIAssistantCard
              tips={aiTips}
              locked={!hasAIAssistant}
              onPress={openAssistant}
            />

            {/* Recent transactions header */}
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                Recent Transactions
              </Text>
              {recentTransactions.length > 0 && (
                <TouchableOpacity onPress={() => router.navigate('/transactions')}>
                  <Text style={[styles.seeAll, { color: colors.primary }]}>See all</Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        }
        renderItem={({ item }) => (
          <TransactionItem item={item} onDelete={handleDelete} />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="inbox" size={40} color={colors.border} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              No transactions yet
            </Text>
            <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
              Tap + to add your first transaction
            </Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: bottomPad }}
        showsVerticalScrollIndicator={false}
      />

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary, bottom: bottomPad - 60 }]}
        onPress={() => { setShowAdd(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
        activeOpacity={0.85}
      >
        <Feather name="plus" size={24} color="#fff" />
      </TouchableOpacity>

      <AddTransactionModal
        visible={showAdd}
        onClose={() => setShowAdd(false)}
        onSave={addTransaction}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  greeting: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
  },
  botButton: {
    width: 44,
    height: 44,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  botLock: {
    position: 'absolute',
    right: 4,
    top: 3,
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceCard: {
    marginHorizontal: 16,
    borderRadius: 20,
    padding: 24,
    gap: 4,
    marginBottom: 8,
  },
  balanceLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
  balanceAmount: {
    color: '#FFFFFF',
    fontSize: 48,
    fontFamily: 'Inter_700Bold',
    letterSpacing: -1,
  },
  balanceSub: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    marginBottom: 16,
  },
  balanceRow: {
    flexDirection: 'row',
    gap: 0,
    marginTop: 8,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 14,
    padding: 16,
  },
  balancePill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  balanceDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginHorizontal: 16,
  },
  pillLabel: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
  },
  pillAmount: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
  },
  seeAll: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
  empty: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: 17,
    fontFamily: 'Inter_600SemiBold',
    marginTop: 8,
  },
  emptySub: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1A56DB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
});
