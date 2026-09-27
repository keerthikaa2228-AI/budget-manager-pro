import assert from 'node:assert/strict';
import test from 'node:test';
import type { Budget, Transaction } from '../contexts/BudgetContext';
import {
  calculateSpendingTwin,
  describeSpendingTwinChange,
} from '../lib/spendingTwin';

const REFERENCE_DATE = new Date(2026, 8, 10, 12);

function transaction(
  id: string,
  date: string,
  amount: number,
  type: Transaction['type'] = 'expense',
): Transaction {
  return {
    id,
    title: id,
    amount,
    type,
    categoryId: type === 'expense' ? 'food' : 'salary',
    date,
    note: '',
  };
}

function budget(id: string, limit: number): Budget {
  return {
    id,
    name: id,
    categoryId: 'food',
    limit,
    icon: 'coffee',
    color: '#F59E0B',
  };
}

test('projects the current pace and reports a budget buffer', () => {
  const result = calculateSpendingTwin(
    [
      transaction('one', '2026-09-02', 100),
      transaction('two', '2026-09-10', 200),
    ],
    [budget('food', 1_000)],
    REFERENCE_DATE,
  );

  assert.equal(result.monthKey, '2026-09');
  assert.equal(result.spendingSoFar, 300);
  assert.equal(result.elapsedDays, 10);
  assert.equal(result.remainingDays, 20);
  assert.equal(result.averageDailyExpensePace, 30);
  assert.equal(result.projectedMonthEnd, 900);
  assert.equal(result.monthlyBudget, 1_000);
  assert.equal(result.budgetVariance, 100);
  assert.equal(result.trajectoryStatus, 'on-track');
});

test('handles the first day and zero spending without invalid values', () => {
  const result = calculateSpendingTwin(
    [transaction('future', '2026-09-02', 500)],
    [budget('food', 1_000)],
    new Date(2026, 8, 1, 12),
  );

  assert.equal(result.spendingSoFar, 0);
  assert.equal(result.elapsedDays, 1);
  assert.equal(result.remainingDays, 29);
  assert.equal(result.averageDailyExpensePace, 0);
  assert.equal(result.projectedMonthEnd, 0);
  assert.equal(result.budgetVariance, 1_000);
  assert.equal(result.trajectoryStatus, 'on-track');
});

test('excludes future, non-expense, invalid, and out-of-month transactions', () => {
  const result = calculateSpendingTwin(
    [
      transaction('current', '2026-09-10', 250),
      transaction('future', '2026-09-11', 900),
      transaction('income', '2026-09-05', 5_000, 'income'),
      transaction('previous', '2026-08-31', 800),
      transaction('invalid', '2026-09-31', 700),
    ],
    [],
    REFERENCE_DATE,
  );

  assert.equal(result.spendingSoFar, 250);
  assert.equal(result.projectedMonthEnd, 750);
  assert.equal(result.monthlyBudget, null);
  assert.equal(result.budgetVariance, null);
  assert.equal(result.trajectoryStatus, 'no-budget');
});

test('handles incomplete history and invalid budget limits safely', () => {
  const result = calculateSpendingTwin(
    [],
    [budget('invalid-zero', 0), budget('invalid-negative', -100)],
    new Date(2026, 1, 28, 12),
  );

  assert.equal(result.spendingSoFar, 0);
  assert.equal(result.elapsedDays, 28);
  assert.equal(result.remainingDays, 0);
  assert.equal(result.averageDailyExpensePace, 0);
  assert.equal(result.projectedMonthEnd, 0);
  assert.equal(result.monthlyBudget, null);
  assert.equal(result.budgetVariance, null);
  assert.equal(result.trajectoryStatus, 'no-budget');
});

test('marks a projection over budget and combines valid category budgets', () => {
  const result = calculateSpendingTwin(
    [transaction('one', '2026-09-10', 600)],
    [budget('food', 500), budget('shopping', 250)],
    REFERENCE_DATE,
  );

  assert.equal(result.monthlyBudget, 750);
  assert.equal(result.projectedMonthEnd, 1_800);
  assert.equal(result.budgetVariance, -1_050);
  assert.equal(result.trajectoryStatus, 'over-budget');
});

test('describes a category running above its usual recent pace', () => {
  const result = describeSpendingTwinChange(
    [
      transaction('old-food-1', '2026-08-25', 100),
      transaction('old-food-2', '2026-08-18', 120),
      transaction('old-food-3', '2026-08-11', 80),
      transaction('old-food-4', '2026-08-04', 100),
      transaction('recent-food', '2026-09-10', 400),
    ],
    REFERENCE_DATE,
  );

  assert.ok(result);
  assert.equal(result.categoryId, 'food');
  assert.equal(result.currentWeekSpend, 400);
  assert.equal(result.usualWeeklySpend, 100);
  assert.equal(result.changeAmount, 300);
  assert.match(result.description, /Food & Dining is up ₹300/);
});

test('does not invent a usual pace when recent history is incomplete', () => {
  const result = describeSpendingTwinChange(
    [transaction('recent-food', '2026-09-10', 400)],
    REFERENCE_DATE,
  );

  assert.ok(result);
  assert.equal(result.usualWeeklySpend, null);
  assert.match(result.description, /More history will sharpen the comparison/);
});