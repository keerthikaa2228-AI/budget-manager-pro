import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Expense {
  id: string;
  amount: number;
  categoryId: string;
  date: string; // YYYY-MM-DD
  note: string;
  createdAt: number;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
  isDefault: boolean;
}

const DEFAULT_CATEGORIES: Category[] = [
  { id: 'c1', name: 'Food & Drink', color: '#EF4444', icon: 'coffee', isDefault: true },
  { id: 'c2', name: 'Transport', color: '#3B82F6', icon: 'navigation', isDefault: true },
  { id: 'c3', name: 'Shopping', color: '#8B5CF6', icon: 'shopping-bag', isDefault: true },
  { id: 'c4', name: 'Bills', color: '#F59E0B', icon: 'file-text', isDefault: true },
  { id: 'c5', name: 'Entertainment', color: '#EC4899', icon: 'film', isDefault: true },
];

const FREE_CATEGORY_LIMIT = 5;

const STORAGE_KEYS = {
  EXPENSES: '@et_expenses_v1',
  CATEGORIES: '@et_categories_v1',
};

export const CATEGORY_ICON_OPTIONS = [
  'coffee', 'navigation', 'shopping-bag', 'file-text', 'film',
  'home', 'heart', 'briefcase', 'book', 'music', 'camera', 'gift',
  'monitor', 'phone', 'car', 'sun', 'umbrella', 'scissors', 'star',
];

export const CATEGORY_COLOR_OPTIONS = [
  '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16',
  '#22C55E', '#10B981', '#14B8A6', '#06B6D4', '#3B82F6',
  '#6366F1', '#8B5CF6', '#A855F7', '#EC4899', '#F43F5E',
];

interface ExpenseContextValue {
  expenses: Expense[];
  categories: Category[];
  currentMonth: Date;
  setCurrentMonth: (date: Date) => void;
  filteredExpenses: Expense[];
  monthlyTotal: number;
  addExpense: (expense: Omit<Expense, 'id' | 'createdAt'>) => void;
  updateExpense: (id: string, updates: Partial<Expense>) => void;
  deleteExpense: (id: string) => void;
  addCategory: (category: Omit<Category, 'id' | 'isDefault'>, isPremium: boolean) => 'ok' | 'limit';
  deleteCategory: (id: string) => void;
  categoryById: (id: string) => Category | undefined;
  totalByCategory: Record<string, number>;
  lastSixMonths: Array<{ label: string; year: number; month: number; total: number }>;
  isLoading: boolean;
}

const ExpenseContext = createContext<ExpenseContextValue | null>(null);

function generateId(): string {
  return Date.now().toString() + Math.random().toString(36).substring(2, 9);
}

function getMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function getDateMonthKey(dateStr: string): string {
  return dateStr.substring(0, 7); // YYYY-MM
}

export function ExpenseProvider({ children }: { children: React.ReactNode }) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [isLoading, setIsLoading] = useState(true);

  // Load from AsyncStorage
  useEffect(() => {
    (async () => {
      try {
        const [expStr, catStr] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.EXPENSES),
          AsyncStorage.getItem(STORAGE_KEYS.CATEGORIES),
        ]);
        if (expStr) setExpenses(JSON.parse(expStr));
        if (catStr) setCategories(JSON.parse(catStr));
      } catch (e) {
        console.error('Failed to load data', e);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const saveExpenses = useCallback(async (updated: Expense[]) => {
    try { await AsyncStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(updated)); } catch {}
  }, []);

  const saveCategories = useCallback(async (updated: Category[]) => {
    try { await AsyncStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(updated)); } catch {}
  }, []);

  const addExpense = useCallback((expense: Omit<Expense, 'id' | 'createdAt'>) => {
    const newExpense: Expense = { ...expense, id: generateId(), createdAt: Date.now() };
    setExpenses(prev => {
      const updated = [newExpense, ...prev];
      saveExpenses(updated);
      return updated;
    });
  }, [saveExpenses]);

  const updateExpense = useCallback((id: string, updates: Partial<Expense>) => {
    setExpenses(prev => {
      const updated = prev.map(e => e.id === id ? { ...e, ...updates } : e);
      saveExpenses(updated);
      return updated;
    });
  }, [saveExpenses]);

  const deleteExpense = useCallback((id: string) => {
    setExpenses(prev => {
      const updated = prev.filter(e => e.id !== id);
      saveExpenses(updated);
      return updated;
    });
  }, [saveExpenses]);

  const addCategory = useCallback((
    category: Omit<Category, 'id' | 'isDefault'>,
    isPremium: boolean
  ): 'ok' | 'limit' => {
    const nonDefaultCount = categories.filter(c => !c.isDefault).length;
    if (!isPremium && categories.length >= FREE_CATEGORY_LIMIT) {
      return 'limit';
    }
    const newCat: Category = { ...category, id: generateId(), isDefault: false };
    setCategories(prev => {
      const updated = [...prev, newCat];
      saveCategories(updated);
      return updated;
    });
    return 'ok';
  }, [categories, saveCategories]);

  const deleteCategory = useCallback((id: string) => {
    setCategories(prev => {
      const updated = prev.filter(c => c.id !== id);
      saveCategories(updated);
      return updated;
    });
  }, [saveCategories]);

  const categoryById = useCallback((id: string) => {
    return categories.find(c => c.id === id);
  }, [categories]);

  const currentMonthKey = getMonthKey(currentMonth);

  const filteredExpenses = useMemo(() =>
    expenses
      .filter(e => getDateMonthKey(e.date) === currentMonthKey)
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt),
    [expenses, currentMonthKey]
  );

  const monthlyTotal = useMemo(() =>
    filteredExpenses.reduce((sum, e) => sum + e.amount, 0),
    [filteredExpenses]
  );

  const totalByCategory = useMemo(() => {
    const totals: Record<string, number> = {};
    filteredExpenses.forEach(e => {
      totals[e.categoryId] = (totals[e.categoryId] ?? 0) + e.amount;
    });
    return totals;
  }, [filteredExpenses]);

  const lastSixMonths = useMemo(() => {
    const months: Array<{ label: string; year: number; month: number; total: number }> = [];
    const now = new Date();
    const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = getMonthKey(d);
      const total = expenses
        .filter(e => getDateMonthKey(e.date) === key)
        .reduce((sum, e) => sum + e.amount, 0);
      months.push({ label: MONTH_LABELS[d.getMonth()], year: d.getFullYear(), month: d.getMonth(), total });
    }
    return months;
  }, [expenses]);

  return (
    <ExpenseContext.Provider value={{
      expenses, categories, currentMonth, setCurrentMonth,
      filteredExpenses, monthlyTotal, addExpense, updateExpense, deleteExpense,
      addCategory, deleteCategory, categoryById, totalByCategory, lastSixMonths, isLoading,
    }}>
      {children}
    </ExpenseContext.Provider>
  );
}

export function useExpenses() {
  const ctx = useContext(ExpenseContext);
  if (!ctx) throw new Error('useExpenses must be used within an ExpenseProvider');
  return ctx;
}

export { FREE_CATEGORY_LIMIT };
