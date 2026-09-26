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