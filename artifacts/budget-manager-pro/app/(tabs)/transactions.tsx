import React, { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useBudget } from '@/contexts/BudgetContext';
import { TransactionItem } from '@/components/TransactionItem';
import { AddTransactionModal } from '@/components/AddTransactionModal';

type Filter = 'all' | 'income' | 'expense';

export default function TransactionsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { transactions, deleteTransaction, addTransaction } = useBudget();
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  const topPad = Platform.OS === 'web' ? Math.max(insets.top, 67) : insets.top;
  const bottomPad = Platform.OS === 'web' ? 84 + 34 : 84;

  const filtered = useMemo(() => {
    let list = [...transactions].sort(
      (a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id),
    );
    if (filter !== 'all') list = list.filter(t => t.type === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        t =>
          t.title.toLowerCase().includes(q) ||
          t.categoryId.toLowerCase().includes(q) ||
          t.note.toLowerCase().includes(q),
      );
    }
    return list;
  }, [transactions, filter, search]);

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

  const FILTERS: { key: Filter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'expense', label: 'Expenses' },
    { key: 'income', label: 'Income' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Sticky header */}
      <View style={[styles.topBar, { paddingTop: topPad + 8, backgroundColor: colors.background }]}>
        <Text style={[styles.screenTitle, { color: colors.foreground }]}>Transactions</Text>

        {/* Search */}
        <View style={[styles.searchRow, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          <Feather name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            value={search}
            onChangeText={setSearch}
            placeholder="Search transactions…"
            placeholderTextColor={colors.mutedForeground}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={8}>
              <Feather name="x" size={15} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter pills */}
        <View style={styles.filterRow}>
          {FILTERS.map(f => (
            <TouchableOpacity
              key={f.key}
              style={[
                styles.filterPill,
                {
                  backgroundColor: filter === f.key ? colors.primary : colors.muted,
                  borderColor: filter === f.key ? colors.primary : colors.border,
                },
              ]}
              onPress={() => { setFilter(f.key); Haptics.selectionAsync(); }}
            >
              <Text style={[styles.filterLabel, { color: filter === f.key ? '#fff' : colors.mutedForeground }]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
          <Text style={[styles.countBadge, { color: colors.mutedForeground }]}>
            {filtered.length} item{filtered.length !== 1 ? 's' : ''}
          </Text>
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={({ item }) => <TransactionItem item={item} onDelete={handleDelete} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="list" size={40} color={colors.border} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              {search ? 'No results found' : 'No transactions yet'}
            </Text>
            <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
              {search ? 'Try a different search term' : 'Tap + to add your first transaction'}
            </Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: bottomPad, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
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
  topBar: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 10,
  },
  screenTitle: {
    fontSize: 28,
    fontFamily: 'Inter_700Bold',
    paddingHorizontal: 4,
    paddingBottom: 4,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    padding: 0,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterLabel: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
  },
  countBadge: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginLeft: 'auto',
  },
  empty: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 80,
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
