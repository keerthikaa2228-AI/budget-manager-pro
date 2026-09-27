import assert from 'node:assert/strict';
import test from 'node:test';
import type { Transaction } from '../contexts/BudgetContext';
import {
  analyzeMoneyPattern,
  MONEY_PATTERN_THRESHOLDS,
} from '../lib/moneyPersona';

function transaction(
  id: string,
  date: string,
  amount: number,
  categoryId = 'shopping',
  type: Transaction['type'] = 'expense',
): Transaction {
  return {
    id,
    title: id,
    amount,
    type,
    categoryId,
    date,
    note: '',
  };
}

function weekdaysBetween(startDay: number, count: number, month = '2026-08'): string[] {
  const dates: string[] = [];
  for (let day = startDay; dates.length < count; day += 1) {
    const date = new Date(`${month}-${String(day).padStart(2, '0')}T00:00:00Z`);
    const weekday = date.getUTCDay();
    if (weekday > 0 && weekday < 6) {
      dates.push(`${month}-${String(day).padStart(2, '0')}`);
    }
  }
  return dates;
}

test('classifies a weekend-heavy history as Weekend Splurger', () => {
  const history = [
    ...['2026-08-01', '2026-08-02', '2026-08-08', '2026-08-09', '2026-08-15', '2026-08-16']
      .map((date, index) => transaction(`weekend-${index}`, date, 600, 'entertainment')),
    ...['2026-08-03', '2026-08-10', '2026-08-20', '2026-09-01']
      .map((date, index) => transaction(`weekday-${index}`, date, 100, 'food')),
  ];
  const analysis = analyzeMoneyPattern(history);

  assert.equal(analysis.persona?.id, 'weekend-splurger');
  assert.equal(analysis.persona?.supportingStats.length, 3);
  assert.ok(analysis.persona?.suggestedAction);
});

test('classifies frequent low-value cumulative spending as Small-Leak Spender', () => {
  const dates = [
    ...weekdaysBetween(3, 19),
    '2026-09-02',
  ];
  const analysis = analyzeMoneyPattern(
    dates.map((date, index) => transaction(`small-${index}`, date, 300, 'food')),
  );

  assert.equal(analysis.persona?.id, 'small-leak-spender');
  assert.equal(analysis.persona?.supportingStats.length, 4);
});

test('classifies a few unusually large expenses as Big-Ticket Spender', () => {
  const smallDates = weekdaysBetween(3, 7);
  const history = [
    ...smallDates.map((date, index) => transaction(`small-${index}`, date, 300, 'food')),
    transaction('large-1', '2026-08-17', 5_000, 'shopping'),
    transaction('large-2', '2026-08-24', 6_000, 'shopping'),
    transaction('large-3', '2026-09-03', 7_000, 'shopping'),
  ];
  const analysis = analyzeMoneyPattern(history);

  assert.equal(analysis.persona?.id, 'big-ticket-spender');
  assert.equal(analysis.persona?.supportingStats.length, 4);
});

test('classifies consistent saving as Steady Saver', () => {
  const history: Transaction[] = [];
  for (const [month, incomeId] of [['2026-06', 'jun'], ['2026-07', 'jul'], ['2026-08', 'aug']]) {
    history.push(
      transaction(`${incomeId}-income`, `${month}-01`, 5_000, 'salary', 'income'),
      transaction(`${incomeId}-food-1`, `${month}-05`, 500, 'food'),
      transaction(`${incomeId}-food-2`, `${month}-12`, 500, 'food'),
      transaction(`${incomeId}-food-3`, `${month}-19`, 500, 'food'),
      transaction(`${incomeId}-food-4`, `${month}-26`, 500, 'food'),
    );
  }
  const analysis = analyzeMoneyPattern(history);

  assert.equal(analysis.persona?.id, 'steady-saver');
  assert.equal(analysis.persona?.supportingStats.length, 4);
});

test('classifies high-frequency shopping as Impulse Shopper', () => {
  const dates = [
    ...weekdaysBetween(3, 19),
    '2026-09-02',
  ];
  const analysis = analyzeMoneyPattern(
    dates.map((date, index) =>
      transaction(`impulse-${index}`, date, 800, index % 2 === 0 ? 'shopping' : 'entertainment'),
    ),
  );

  assert.equal(analysis.persona?.id, 'impulse-shopper');
  assert.equal(analysis.persona?.supportingStats.length, 4);
});

test('returns a neutral building state when history is insufficient', () => {
  const analysis = analyzeMoneyPattern([
    transaction('one', '2026-09-01', 500, 'food'),
    transaction('two', '2026-09-10', 500, 'food'),
  ]);

  assert.equal(analysis.status, 'building');
  assert.equal(analysis.persona, null);
  assert.match(analysis.reason ?? '', /30 days/i);
  assert.equal(MONEY_PATTERN_THRESHOLDS.minimumExpenseCount, 10);
});