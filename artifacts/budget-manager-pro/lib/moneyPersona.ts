import type { Transaction } from '@/contexts/BudgetContext';

export type MoneyPersonaId =
  | 'weekend-splurger'
  | 'small-leak-spender'
  | 'big-ticket-spender'
  | 'steady-saver'
  | 'impulse-shopper';

export interface MoneyPersona {
  id: MoneyPersonaId;
  name: string;
  description: string;
  supportingStats: [string, string, ...string[]];
  suggestedAction: string;
  matchedRule: string;
}

export interface MoneyPatternAnalysis {
  status: 'ready' | 'building';
  persona: MoneyPersona | null;
  reason: string | null;
  dataSummary: {
    expenseCount: number;
    discretionaryCount: number;
    trackedDays: number;
  };
}

export const MONEY_PATTERN_THRESHOLDS = {
  minimumExpenseCount: 10,
  minimumDiscretionaryCount: 5,
  minimumTrackedDays: 30,
  weekendShare: 0.45,
  smallLeakExpenseCount: 20,
  smallLeakAverageExpense: 500,
  smallLeakDiscretionaryCount: 15,
  smallLeakDiscretionarySpend: 5_000,
  bigTicketExpenseCount: 15,
  bigTicketLargeExpenseCount: 3,
  steadySaverRate: 0.2,
  steadySaverMonths: 3,
  steadySaverVolatility: 0.35,
  impulseDiscretionaryCount: 18,
  impulseMonthlyFrequency: 8,
  impulseShoppingCount: 8,
} as const;

const DAY_MS = 24 * 60 * 60 * 1_000;
const DISCRETIONARY_CATEGORY_IDS = new Set([
  'food',
  'transport',
  'shopping',
  'entertainment',
  'other',
]);
const SHOPPING_CATEGORY_IDS = new Set(['shopping', 'entertainment']);

type ValidTransaction = Transaction & { timestamp: number };

function parseIsoDate(date: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;

  const [year, month, day] = date.split('-').map(Number);
  const timestamp = Date.UTC(year, month - 1, day);
  const parsed = new Date(timestamp);

  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return null;
  }

  return timestamp;
}

function validTransactions(transactions: readonly Transaction[]): ValidTransaction[] {
  return transactions.flatMap((transaction) => {
    const timestamp = parseIsoDate(transaction.date);
    return timestamp === null ? [] : [{ ...transaction, timestamp }];
  });
}

function money(amount: number): string {
  return `₹${Math.round(Math.max(0, amount)).toLocaleString('en-IN')}`;
}

function percentage(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function average(values: number[]): number {
  return values.length === 0
    ? 0
    : values.reduce((sum, value) => sum + value, 0) / values.length;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

function isDiscretionary(transaction: ValidTransaction): boolean {
  return DISCRETIONARY_CATEGORY_IDS.has(transaction.categoryId);
}

function monthKey(transaction: ValidTransaction): string {
  return transaction.date.slice(0, 7);
}

function monthlyExpenseTotals(expenses: ValidTransaction[]): number[] {
  const totals = new Map<string, number>();
  for (const transaction of expenses) {
    totals.set(
      monthKey(transaction),
      (totals.get(monthKey(transaction)) ?? 0) + transaction.amount,
    );
  }
  return Array.from(totals.values());
}

function makePersona(
  id: MoneyPersonaId,
  name: string,
  description: string,
  supportingStats: [string, string, ...string[]],
  suggestedAction: string,
  matchedRule: string,
): MoneyPersona {
  return {
    id,
    name,
    description,
    supportingStats,
    suggestedAction,
    matchedRule,
  };
}

/**
 * Classifies a sufficiently large local transaction history into one of five
 * transparent patterns. The rule order is deterministic when multiple rules
 * match: Weekend, Small-Leak, Big-Ticket, Steady Saver, then Impulse.
 */
export function analyzeMoneyPattern(
  transactions: readonly Transaction[],
): MoneyPatternAnalysis {
  const valid = validTransactions(transactions);
  const expenses = valid.filter(
    (transaction) =>
      transaction.type === 'expense' &&
      Number.isFinite(transaction.amount) &&
      transaction.amount > 0,
  );
  const incomes = valid.filter(
    (transaction) =>
      transaction.type === 'income' &&
      Number.isFinite(transaction.amount) &&
      transaction.amount > 0,
  );
  const discretionary = expenses.filter(isDiscretionary);
  const timestamps = valid.map((transaction) => transaction.timestamp);
  const trackedDays =
    timestamps.length > 0
      ? Math.floor((Math.max(...timestamps) - Math.min(...timestamps)) / DAY_MS) + 1
      : 0;
  const dataSummary = {
    expenseCount: expenses.length,
    discretionaryCount: discretionary.length,
    trackedDays,
  };

  if (
    expenses.length < MONEY_PATTERN_THRESHOLDS.minimumExpenseCount ||
    discretionary.length < MONEY_PATTERN_THRESHOLDS.minimumDiscretionaryCount ||
    trackedDays < MONEY_PATTERN_THRESHOLDS.minimumTrackedDays
  ) {
    return {
      status: 'building',
      persona: null,
      reason: `Keep tracking for at least ${MONEY_PATTERN_THRESHOLDS.minimumTrackedDays} days and a few more expenses to reveal a reliable pattern.`,
      dataSummary,
    };
  }

  const expenseAmounts = expenses.map((transaction) => transaction.amount);
  const averageExpense = average(expenseAmounts);
  const medianExpense = median(expenseAmounts);
  const unusuallyLargeThreshold = Math.max(medianExpense * 2, 2_000);
  const largeExpenses = expenses.filter(
    (transaction) => transaction.amount > unusuallyLargeThreshold,
  );
  const largeDiscretionary = largeExpenses.filter(isDiscretionary);
  const totalDiscretionary = discretionary.reduce(
    (sum, transaction) => sum + transaction.amount,
    0,
  );
  const weekendDiscretionary = discretionary.filter((transaction) => {
    const day = new Date(transaction.timestamp).getUTCDay();
    return day === 0 || day === 6;
  });
  const weekendSpend = weekendDiscretionary.reduce(
    (sum, transaction) => sum + transaction.amount,
    0,
  );
  const weekendShare =
    totalDiscretionary > 0 ? weekendSpend / totalDiscretionary : 0;
  const smallPurchases = discretionary.filter(
    (transaction) => transaction.amount <= MONEY_PATTERN_THRESHOLDS.smallLeakAverageExpense,
  );
  const shoppingCount = discretionary.filter((transaction) =>
    SHOPPING_CATEGORY_IDS.has(transaction.categoryId),
  ).length;
  const monthlyFrequency = discretionary.length / (trackedDays / 30);
  const monthlyTotals = monthlyExpenseTotals(expenses);
  const averageMonthlySpend = average(monthlyTotals);
  const monthlyVolatility =
    averageMonthlySpend > 0
      ? Math.sqrt(
          average(
            monthlyTotals.map((total) =>
              Math.pow(total - averageMonthlySpend, 2),
            ),
          ),
        ) / averageMonthlySpend
      : null;
  const totalIncome = incomes.reduce((sum, transaction) => sum + transaction.amount, 0);
  const totalExpenses = expenses.reduce((sum, transaction) => sum + transaction.amount, 0);
  const savingsRate =
    totalIncome > 0 ? (totalIncome - totalExpenses) / totalIncome : null;

  const matches: Array<MoneyPersona | null> = [
    weekendShare > MONEY_PATTERN_THRESHOLDS.weekendShare &&
    discretionary.length >= MONEY_PATTERN_THRESHOLDS.minimumDiscretionaryCount &&
    totalDiscretionary >= 2_000
      ? makePersona(
          'weekend-splurger',
          'Weekend Splurger',
          'Most of your flexible spending lands on Saturdays and Sundays.',
          [
            `${percentage(weekendShare)} of discretionary spend on weekends`,
            `${money(weekendSpend)} spent on weekends`,
            `${weekendDiscretionary.length} weekend purchases`,
          ],
          'Set a weekend spending cap before Friday.',
          'Weekend discretionary share is above 45%.',
        )
      : null,
    expenses.length >= MONEY_PATTERN_THRESHOLDS.smallLeakExpenseCount &&
    averageExpense <= MONEY_PATTERN_THRESHOLDS.smallLeakAverageExpense &&
    discretionary.length >= MONEY_PATTERN_THRESHOLDS.smallLeakDiscretionaryCount &&
    totalDiscretionary >= MONEY_PATTERN_THRESHOLDS.smallLeakDiscretionarySpend
      ? makePersona(
          'small-leak-spender',
          'Small-Leak Spender',
          'Frequent small purchases are quietly adding up across the month.',
          [
            `${smallPurchases.length} purchases at or below ${money(MONEY_PATTERN_THRESHOLDS.smallLeakAverageExpense)}`,
            `Average expense: ${money(averageExpense)}`,
            `${money(totalDiscretionary)} in discretionary spending`,
            `${discretionary.length} discretionary purchases`,
          ],
          'Use a 24-hour pause for non-essential purchases under ₹500.',
          '20+ expenses, average expense at or below ₹500, and high cumulative discretionary spend.',
        )
      : null,
    expenses.length <= MONEY_PATTERN_THRESHOLDS.bigTicketExpenseCount &&
    largeExpenses.length >= MONEY_PATTERN_THRESHOLDS.bigTicketLargeExpenseCount
      ? makePersona(
          'big-ticket-spender',
          'Big-Ticket Spender',
          'A small number of unusually large purchases drive most of your movement.',
          [
            `${largeExpenses.length} unusually large purchases`,
            `Largest purchase: ${money(Math.max(...expenseAmounts))}`,
            `Average expense: ${money(averageExpense)}`,
            `${expenses.length} total expense transactions`,
          ],
          'Create a sinking fund before your next large purchase.',
          '15 or fewer expenses with at least 3 unusually large purchases.',
        )
      : null,
    savingsRate !== null &&
    savingsRate >= MONEY_PATTERN_THRESHOLDS.steadySaverRate &&
    monthlyTotals.length >= MONEY_PATTERN_THRESHOLDS.steadySaverMonths &&
    monthlyVolatility !== null &&
    monthlyVolatility <= MONEY_PATTERN_THRESHOLDS.steadySaverVolatility &&
    largeDiscretionary.length <= 1
      ? makePersona(
          'steady-saver',
          'Steady Saver',
          'You keep a consistent spending rhythm while preserving a healthy surplus.',
          [
            `${percentage(savingsRate)} overall savings rate`,
            `${monthlyTotals.length} months tracked`,
            `Monthly spending volatility: ${percentage(monthlyVolatility ?? 0)}`,
            `${largeDiscretionary.length} large discretionary purchases`,
          ],
          'Automatically move part of each surplus into a goal.',
          '20%+ savings rate, 3+ months, volatility at or below 35%, and few large discretionary purchases.',
        )
      : null,
    discretionary.length >= MONEY_PATTERN_THRESHOLDS.impulseDiscretionaryCount &&
    monthlyFrequency >= MONEY_PATTERN_THRESHOLDS.impulseMonthlyFrequency &&
    shoppingCount >= MONEY_PATTERN_THRESHOLDS.impulseShoppingCount
      ? makePersona(
          'impulse-shopper',
          'Impulse Shopper',
          'Frequent shopping and entertainment purchases are shaping your spending pace.',
          [
            `${discretionary.length} discretionary purchases`,
            `${Math.round(monthlyFrequency)} purchases per 30 days`,
            `${shoppingCount} shopping or entertainment purchases`,
            `${money(totalDiscretionary)} in discretionary spending`,
          ],
          'Keep a 24-hour wishlist before buying non-essentials.',
          '18+ discretionary purchases, 8+ per 30 days, and 8+ shopping or entertainment purchases.',
        )
      : null,
  ];
  const persona = matches.find((match): match is MoneyPersona => match !== null) ?? null;

  return {
    status: persona ? 'ready' : 'building',
    persona,
    reason: persona
      ? null
      : 'Your spending does not match one clear pattern yet. Keep tracking and check back soon.',
    dataSummary,
  };
}