import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface Transaction {
  id: string;
  title: string;
  amount: number; // always positive
  type: 'income' | 'expense';
  categoryId: string;
  date: string; // YYYY-MM-DD
  note: string;
}

export interface Budget {
  id: string;
  name: string;
  categoryId: string;
  limit: number;
  icon: string;
  color: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  transactionType: 'income' | 'expense' | 'both';
}

// ---------------------------------------------------------------------------
// Preset categories
// ---------------------------------------------------------------------------
export const CATEGORIES: Category[] = [
  { id: 'food', name: 'Food & Dining', icon: 'coffee', color: '#F59E0B', transactionType: 'expense' },
  { id: 'transport', name: 'Transport', icon: 'navigation', color: '#3B82F6', transactionType: 'expense' },
  { id: 'shopping', name: 'Shopping', icon: 'shopping-bag', color: '#8B5CF6', transactionType: 'expense' },
  { id: 'entertainment', name: 'Entertainment', icon: 'film', color: '#EC4899', transactionType: 'expense' },
  { id: 'health', name: 'Health', icon: 'heart', color: '#EF4444', transactionType: 'expense' },
  { id: 'bills', name: 'Bills', icon: 'zap', color: '#6B7280', transactionType: 'expense' },
  { id: 'salary', name: 'Salary', icon: 'briefcase', color: '#059669', transactionType: 'income' },
  { id: 'investment', name: 'Investment', icon: 'trending-up', color: '#14B8A6', transactionType: 'income' },
  { id: 'other', name: 'Other', icon: 'more-horizontal', color: '#94A3B8', transactionType: 'both' },
];

export const FREE_BUDGET_LIMIT = 3;

const TRANSACTIONS_KEY = '@bmp:transactions';
const BUDGETS_KEY = '@bmp:budgets';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeId() {
  return Date.now().toString() + Math.random().toString(36).substring(2, 9);
}

function currentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function categoryById(id: string): Category {
  return CATEGORIES.find(c => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1];
}

export { categoryById };

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------
interface BudgetContextValue {
  transactions: Transaction[];
  budgets: Budget[];
  isLoading: boolean;
  addTransaction: (data: Omit<Transaction, 'id'>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  addBudget: (data: Omit<Budget, 'id'>) => Promise<void>;
  deleteBudget: (id: string) => Promise<void>;
  getMonthlyTotals: (monthKey?: string) => { income: number; expense: number; net: number };
  getBudgetSpending: (budget: Budget, monthKey?: string) => number;
  recentTransactions: Transaction[];
  currentMonthKey: string;
}

const BudgetContext = createContext<BudgetContextValue | null>(null);

export function BudgetProvider({ children }: { children: React.ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load from AsyncStorage on mount
  useEffect(() => {
    const load = async () => {
      try {
        const [txRaw, budgetRaw] = await Promise.all([
          AsyncStorage.getItem(TRANSACTIONS_KEY),
          AsyncStorage.getItem(BUDGETS_KEY),
        ]);
        if (txRaw) setTransactions(JSON.parse(txRaw));
        if (budgetRaw) setBudgets(JSON.parse(budgetRaw));
      } catch (e) {
        console.warn('[BudgetContext] Load error:', e);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const saveTransactions = async (data: Transaction[]) => {
    setTransactions(data);
    await AsyncStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(data));
  };

  const saveBudgets = async (data: Budget[]) => {
    setBudgets(data);
    await AsyncStorage.setItem(BUDGETS_KEY, JSON.stringify(data));
  };

  const addTransaction = useCallback(async (data: Omit<Transaction, 'id'>) => {
    const next = [{ ...data, id: makeId() }, ...transactions];
    await saveTransactions(next);
  }, [transactions]);

  const deleteTransaction = useCallback(async (id: string) => {
    await saveTransactions(transactions.filter(t => t.id !== id));
  }, [transactions]);

  const addBudget = useCallback(async (data: Omit<Budget, 'id'>) => {
    await saveBudgets([...budgets, { ...data, id: makeId() }]);
  }, [budgets]);

  const deleteBudget = useCallback(async (id: string) => {
    await saveBudgets(budgets.filter(b => b.id !== id));
  }, [budgets]);

  const getMonthlyTotals = useCallback((monthKey?: string) => {
    const key = monthKey ?? currentMonthKey();
    const monthTxns = transactions.filter(t => t.date.startsWith(key));
    const income = monthTxns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = monthTxns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    return { income, expense, net: income - expense };
  }, [transactions]);

  const getBudgetSpending = useCallback((budget: Budget, monthKey?: string) => {
    const key = monthKey ?? currentMonthKey();
    return transactions
      .filter(t => t.type === 'expense' && t.categoryId === budget.categoryId && t.date.startsWith(key))
      .reduce((s, t) => s + t.amount, 0);
  }, [transactions]);

  const recentTransactions = [...transactions]
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))
    .slice(0, 10);

  return (
    <BudgetContext.Provider value={{
      transactions,
      budgets,
      isLoading,
      addTransaction,
      deleteTransaction,
      addBudget,
      deleteBudget,
      getMonthlyTotals,
      getBudgetSpending,
      recentTransactions,
      currentMonthKey: currentMonthKey(),
    }}>
      {children}
    </BudgetContext.Provider>
  );
}

export function useBudget() {
  const ctx = useContext(BudgetContext);
  if (!ctx) throw new Error('useBudget must be used within BudgetProvider');
  return ctx;
}
