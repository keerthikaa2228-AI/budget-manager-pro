import type { Transaction } from '@/contexts/BudgetContext';

function transaction(
  id: string,
  date: string,
  type: Transaction['type'],
  amount: number,
  categoryId: string,
  title: string,
): Transaction {
  return { id, date, type, amount, categoryId, title, note: '' };
}

export const REFERENCE_DATE = new Date('2026-09-15T12:00:00');

export const highOverspenderHistory: Transaction[] = [
  transaction('food-jun', '2026-06-10', 'expense', 1000, 'food', 'Groceries'),
  transaction('food-aug', '2026-08-10', 'expense', 2000, 'food', 'Groceries'),
  transaction('food-sep', '2026-09-08', 'expense', 3500, 'food', 'Groceries'),
  transaction('bills-sep', '2026-09-04', 'expense', 7000, 'bills', 'Utilities'),
  transaction('income-sep', '2026-09-01', 'income', 10000, 'salary', 'Salary'),
];

export const healthySaverHistory: Transaction[] = [
  transaction('food-jun', '2026-06-10', 'expense', 9000, 'food', 'Groceries'),
  transaction('food-jul', '2026-07-10', 'expense', 10000, 'food', 'Groceries'),
  transaction('food-aug', '2026-08-10', 'expense', 11000, 'food', 'Groceries'),
  transaction('transport-jun', '2026-06-12', 'expense', 5000, 'transport', 'Transit'),
  transaction('transport-jul', '2026-07-12', 'expense', 5000, 'transport', 'Transit'),
  transaction('transport-aug', '2026-08-12', 'expense', 5000, 'transport', 'Transit'),
  transaction('food-sep', '2026-09-10', 'expense', 8000, 'food', 'Groceries'),
  transaction('transport-sep', '2026-09-12', 'expense', 4000, 'transport', 'Transit'),
  transaction('salary-jun', '2026-06-01', 'income', 50000, 'salary', 'Salary'),
  transaction('salary-jul', '2026-07-01', 'income', 50000, 'salary', 'Salary'),
  transaction('salary-aug', '2026-08-01', 'income', 50000, 'salary', 'Salary'),
  transaction('salary-sep', '2026-09-01', 'income', 50000, 'salary', 'Salary'),
];

export const sparseNewUserHistory: Transaction[] = [
  transaction('food-sep', '2026-09-08', 'expense', 1200, 'food', 'Lunch'),
];