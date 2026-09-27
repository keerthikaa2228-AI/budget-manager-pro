import { categoryById } from '@/contexts/BudgetContext';
import type { Budget, Transaction } from '@/contexts/BudgetContext';

export type SpendingTwinTrajectory = 'on-track' | 'over-budget' | 'no-budget';

export interface SpendingTwinProjection {
  monthKey: string;
  spendingSoFar: number;
  elapsedDays: number;
  remainingDays: number;
  averageDailyExpensePace: number;
  projectedMonthEnd: number;
  monthlyBudget: number | null;
  /** Positive values are projected budget buffer; negative values are projected overage. */
  budgetVariance: number | null;
  trajectoryStatus: SpendingTwinTrajectory;
}

export interface SpendingTwinChange {
  categoryId: string;
  categoryName: string;
  currentWeekSpend: number;
  usualWeeklySpend: number | null;
  changeAmount: number | null;
  changePercent: number | null;
  transactionCount: number;
  description: string;
}

const DAY_MS = 24 * 60 * 60 * 1_000;

function monthKey(referenceDate: Date): string {
  return `${referenceDate.getFullYear()}-${String(referenceDate.getMonth() + 1).padStart(2, '0')}`;
}

function daysInMonth(referenceDate: Date): number {
  return new Date(
    Date.UTC(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0),
  ).getUTCDate();
}

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

function isCurrentDateOrEarlier(
  date: string,
  referenceDate: Date,
): boolean {
  const transactionTimestamp = parseIsoDate(date);
  if (transactionTimestamp === null) return false;

  const referenceTimestamp = Date.UTC(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate(),
  );

  return transactionTimestamp <= referenceTimestamp;
}

function categoryTotalsBetween(
  transactions: readonly Transaction[],
  startTimestamp: number,
  endTimestamp: number,
): Map<string, { amount: number; count: number }> {
  const totals = new Map<string, { amount: number; count: number }>();

  for (const transaction of transactions) {
    if (
      transaction.type !== 'expense' ||
      !Number.isFinite(transaction.amount) ||
      transaction.amount <= 0
    ) {
      continue;
    }

    const timestamp = parseIsoDate(transaction.date);
    if (
      timestamp === null ||
      timestamp < startTimestamp ||
      timestamp > endTimestamp
    ) {
      continue;
    }

    const current = totals.get(transaction.categoryId) ?? { amount: 0, count: 0 };
    totals.set(transaction.categoryId, {
      amount: current.amount + transaction.amount,
      count: current.count + 1,
    });
  }

  return totals;
}

function referenceDayTimestamp(referenceDate: Date): number {
  return Date.UTC(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate(),
  );
}

/**
 * Explains the most useful local spending change for the last seven days.
 *
 * When at least two prior windows contain spending for the category, the
 * comparison uses that category's average weekly spend. With less history, it
 * reports the largest recent category without inventing a baseline.
 */
export function describeSpendingTwinChange(
  transactions: readonly Transaction[],
  referenceDate: Date = new Date(),
): SpendingTwinChange | null {
  const referenceTimestamp = referenceDayTimestamp(referenceDate);
  const currentWeek = categoryTotalsBetween(
    transactions,
    referenceTimestamp - 6 * DAY_MS,
    referenceTimestamp,
  );
  const currentCategories = Array.from(currentWeek.entries())
    .map(([categoryId, totals]) => ({ categoryId, ...totals }))
    .sort((a, b) => b.amount - a.amount);

  if (currentCategories.length === 0) return null;

  const candidates = currentCategories.map((category) => {
    const historicalValues = Array.from({ length: 4 }, (_, index) => {
      const weeksAgo = index + 1;
      const window = categoryTotalsBetween(
        transactions,
        referenceTimestamp - (6 + weeksAgo * 7) * DAY_MS,
        referenceTimestamp - weeksAgo * 7 * DAY_MS,
      );
      return window.get(category.categoryId)?.amount ?? 0;
    }).filter((amount) => amount > 0);
    const usualWeeklySpend =
      historicalValues.length >= 2
        ? historicalValues.reduce((sum, amount) => sum + amount, 0) /
          historicalValues.length
        : null;
    const changeAmount =
      usualWeeklySpend === null ? null : category.amount - usualWeeklySpend;
    const changePercent =
      usualWeeklySpend && changeAmount !== null
        ? changeAmount / usualWeeklySpend
        : null;
    const isSignificantlyAboveUsual =
      changeAmount !== null &&
      changeAmount > 0 &&
      (changeAmount >= 100 || (changePercent ?? 0) >= 0.25);

    return {
      ...category,
      usualWeeklySpend,
      changeAmount,
      changePercent,
      isSignificantlyAboveUsual,
    };
  });

  const selected = [...candidates]
    .filter((candidate) => candidate.isSignificantlyAboveUsual)
    .sort((a, b) => (b.changeAmount ?? 0) - (a.changeAmount ?? 0))[0] ??
    candidates[0];
  const categoryName = categoryById(selected.categoryId).name;
  const money = (amount: number) =>
    `₹${Math.round(amount).toLocaleString('en-IN')}`;

  let description: string;
  if (selected.usualWeeklySpend === null) {
    description = `${categoryName} is your biggest recent category at ${money(selected.amount)} across ${selected.count} transaction${selected.count === 1 ? '' : 's'}. More history will sharpen the comparison.`;
  } else if ((selected.changeAmount ?? 0) > 0) {
    description = `${categoryName} is up ${money(selected.changeAmount ?? 0)} this week versus its usual ${money(selected.usualWeeklySpend)} weekly pace.`;
  } else if ((selected.changeAmount ?? 0) < 0) {
    description = `${categoryName} is down ${money(Math.abs(selected.changeAmount ?? 0))} this week versus its usual ${money(selected.usualWeeklySpend)} weekly pace.`;
  } else {
    description = `${categoryName} is at its usual weekly pace: ${money(selected.amount)} so far.`;
  }

  return {
    categoryId: selected.categoryId,
    categoryName,
    currentWeekSpend: selected.amount,
    usualWeeklySpend: selected.usualWeeklySpend,
    changeAmount: selected.changeAmount,
    changePercent: selected.changePercent,
    transactionCount: selected.count,
    description,
  };
}

function monthlyBudgetTotal(budgets: readonly Budget[]): number | null {
  const total = budgets.reduce((sum, budget) => {
    return Number.isFinite(budget.limit) && budget.limit > 0
      ? sum + budget.limit
      : sum;
  }, 0);

  return total > 0 ? total : null;
}

/**
 * Calculates the current month's expense trajectory from local transaction data.
 *
 * The reference date is injectable so callers and tests can remain deterministic.
 * Category budgets are monthly limits in the existing data model; when multiple
 * budgets exist, their valid positive limits are treated as the total monthly
 * budget available for this projection.
 */
export function calculateSpendingTwin(
  transactions: readonly Transaction[],
  budgets: readonly Budget[] = [],
  referenceDate: Date = new Date(),
): SpendingTwinProjection {
  const referenceDay = referenceDate.getDate();
  const totalDays = daysInMonth(referenceDate);
  const elapsedDays = Math.min(Math.max(referenceDay, 1), totalDays);
  const remainingDays = totalDays - elapsedDays;
  const currentMonthKey = monthKey(referenceDate);
  const spendingSoFar = transactions.reduce((total, transaction) => {
    if (
      transaction.type !== 'expense' ||
      !Number.isFinite(transaction.amount) ||
      transaction.amount <= 0 ||
      !transaction.date.startsWith(currentMonthKey) ||
      !isCurrentDateOrEarlier(transaction.date, referenceDate)
    ) {
      return total;
    }

    return total + transaction.amount;
  }, 0);
  const averageDailyExpensePace = spendingSoFar / elapsedDays;
  const projectedMonthEnd =
    spendingSoFar + averageDailyExpensePace * remainingDays;
  const monthlyBudget = monthlyBudgetTotal(budgets);
  const budgetVariance =
    monthlyBudget === null ? null : monthlyBudget - projectedMonthEnd;

  return {
    monthKey: currentMonthKey,
    spendingSoFar,
    elapsedDays,
    remainingDays,
    averageDailyExpensePace,
    projectedMonthEnd,
    monthlyBudget,
    budgetVariance,
    trajectoryStatus:
      monthlyBudget === null
        ? 'no-budget'
        : projectedMonthEnd <= monthlyBudget
          ? 'on-track'
          : 'over-budget',
  };
}