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
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useBudget, FREE_BUDGET_LIMIT } from '@/contexts/BudgetContext';
import { useSubscription } from '@/lib/revenuecat';
import { BudgetCard } from '@/components/BudgetCard';
import { AddBudgetModal } from '@/components/AddBudgetModal';

export default function BudgetsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { budgets, addBudget, deleteBudget, getBudgetSpending } = useBudget();
  const { isSubscribed, showPaywall } = useSubscription();
  const [showAdd, setShowAdd] = useState(false);

  const topPad = Platform.OS === 'web' ? Math.max(insets.top, 67) : insets.top;
  const bottomPad = Platform.OS === 'web' ? 84 + 34 : 84;

  const canAddBudget = isSubscribed || budgets.length < FREE_BUDGET_LIMIT;

  const handleAddPress = () => {
    if (!canAddBudget) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      Alert.alert(
        'Upgrade to Premium',
        `Free plan includes up to ${FREE_BUDGET_LIMIT} budgets. Upgrade to add unlimited budgets.`,
        [
          { text: 'Not now', style: 'cancel' },
          { text: 'Upgrade', onPress: showPaywall },
        ],
      );
      return;
    }
    setShowAdd(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleLongPress = (id: string, name: string) => {
    Alert.alert('Delete Budget', `Remove "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: () => {
          deleteBudget(id);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={budgets}
        keyExtractor={item => item.id}
        ListHeaderComponent={
          <View style={[styles.topBar, { paddingTop: topPad + 8 }]}>
            <View style={styles.titleRow}>
              <Text style={[styles.screenTitle, { color: colors.foreground }]}>Budgets</Text>
              {!isSubscribed && (
                <View style={[styles.freeBadge, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                  <Text style={[styles.freeBadgeText, { color: colors.mutedForeground }]}>
                    {budgets.length}/{FREE_BUDGET_LIMIT} free
                  </Text>
                </View>
              )}
            </View>

            {/* Premium upsell banner */}
            {!isSubscribed && budgets.length >= FREE_BUDGET_LIMIT && (
              <TouchableOpacity
                style={[styles.upsellBanner, { backgroundColor: colors.accent + '15', borderColor: colors.accent + '40' }]}
                onPress={showPaywall}
                activeOpacity={0.8}
              >
                <Feather name="star" size={16} color={colors.accent} />
                <Text style={[styles.upsellText, { color: colors.accent }]}>
                  Upgrade for unlimited budgets
                </Text>
                <Feather name="chevron-right" size={14} color={colors.accent} />
              </TouchableOpacity>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.85}
            onLongPress={() => handleLongPress(item.id, item.name)}
            delayLongPress={400}
            style={styles.cardWrapper}
          >
            <BudgetCard budget={item} spent={getBudgetSpending(item)} />
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="target" size={44} color={colors.border} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              No budgets yet
            </Text>
            <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
              Set spending limits to track where your money goes
            </Text>
            <TouchableOpacity
              style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
              onPress={handleAddPress}
            >
              <Text style={styles.emptyBtnText}>Create First Budget</Text>
            </TouchableOpacity>
          </View>
        }
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: bottomPad, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
      />

      {/* FAB */}
      {budgets.length > 0 && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.primary, bottom: bottomPad - 60 }]}
          onPress={handleAddPress}
          activeOpacity={0.85}
        >
          {canAddBudget ? (
            <Feather name="plus" size={24} color="#fff" />
          ) : (
            <Feather name="lock" size={22} color="#fff" />
          )}
        </TouchableOpacity>
      )}

      <AddBudgetModal
        visible={showAdd}
        onClose={() => setShowAdd(false)}
        onSave={addBudget}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    paddingHorizontal: 4,
    paddingBottom: 12,
    gap: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  screenTitle: {
    fontSize: 28,
    fontFamily: 'Inter_700Bold',
  },
  freeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  freeBadgeText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
  },
  upsellBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  upsellText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
  cardWrapper: {
    borderRadius: 16,
  },
  empty: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    marginTop: 8,
  },
  emptySub: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  emptyBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  emptyBtnText: {
    color: '#fff',
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
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
