import assert from 'node:assert/strict';
import test from 'node:test';
import { analyzeBudget, answerAssistantQuestion } from '../lib/budgetAssistant';
import {
  REFERENCE_DATE,
  healthySaverHistory,
  highOverspenderHistory,
  sparseNewUserHistory,
} from './fixtures/assistantHistories';

test('high overspender averages only months with recorded category spending', () => {
  const analysis = analyzeBudget(highOverspenderHistory, REFERENCE_DATE);
  const food = analysis.overspending.find((item) => item.categoryId === 'food');

  assert.ok(food);
  assert.equal(food.averageSpend, 1500);
  assert.equal(food.currentSpend, 3500);
  assert.equal(food.increasePercent, 133);
  assert.equal(analysis.savings.kind, 'warning');
  assert.match(
    answerAssistantQuestion(highOverspenderHistory, 'Show my spending', REFERENCE_DATE),
    /Food & Dining: ₹3,500/,
  );
});

test('healthy saver gets an accurate savings response and recurring-income tip', () => {
  const analysis = analyzeBudget(healthySaverHistory, REFERENCE_DATE);
  const incomeTip = analysis.tips.find((tip) => tip.id === 'income-nudge');

  assert.equal(analysis.savings.savingsRate, 0.76);
  assert.equal(analysis.incomeNudge.triggered, true);
  assert.ok(incomeTip);
  assert.match(
    answerAssistantQuestion(healthySaverHistory, 'How can I save?', REFERENCE_DATE),
    /saving 76% this month/i,
  );
});

test('sparse new user receives no false overspend or recurring-income tip', () => {
  const analysis = analyzeBudget(sparseNewUserHistory, REFERENCE_DATE);

  assert.equal(analysis.overspending.length, 0);
  assert.equal(analysis.incomeNudge.triggered, false);
  assert.equal(analysis.tips.some((tip) => tip.id.startsWith('income-nudge')), false);
  assert.match(
    answerAssistantQuestion(sparseNewUserHistory, 'How much have I spent?', REFERENCE_DATE),
    /Food & Dining: ₹1,200/,
  );
  assert.match(
    answerAssistantQuestion(sparseNewUserHistory, 'How much am I saving?', REFERENCE_DATE),
    /at least one income entry/i,
  );
});