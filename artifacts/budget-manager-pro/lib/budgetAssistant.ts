import { CATEGORIES, categoryById } from '@/contexts/BudgetContext';
import type { Transaction } from '@/contexts/BudgetContext';

export interface AssistantTip {
  id: string;
  title: string;
  body: string;
  kind: 'warning' | 'success' | 'education';
}

export interface AssistantAnalysis {
  overspending: Array<{
    categoryId: string;
    categoryName: string;
    currentSpend: number;
    averageSpend: number;
    increasePercent: number;
    message: string;
  }>;
  savings: {
    income: number;
    expenses: number;
    netSavings: number;
    savingsRate: number | null;
    message: string | null;
    kind: 'warning' | 'success' | 'neutral';
  };
  incomeNudge: {
    triggered: boolean;
    monthlyExtraTarget: number | null;
    message: string;
  };
  tips: AssistantTip[];
}

const money = (value: number) => `₹${Math.round(Math.max(0, value)).toLocaleString('en-IN')}`;

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function shiftMonth(date: Date, amount: number): Date {
  const next = new Date(date);
  next.setDate(1);
  next.setMonth(next.getMonth() + amount);
  return next;
}

function monthKeysBeforeCurrent(count: number, referenceDate: Date): string[] {
  return Array.from({ length: count }, (_, index) =>
    monthKey(shiftMonth(referenceDate, -(index + 1))),
  );
}

function expenseTotal(transactions: Transaction[], key: string, categoryId?: string): number {
  return transactions
    .filter(
      (transaction) =>
        transaction.type === 'expense' &&
        transaction.date.startsWith(key) &&
        (!categoryId || transaction.categoryId === categoryId),
    )
    .reduce((total, transaction) => total + transaction.amount, 0);
}

function currentTotals(transactions: Transaction[], referenceDate: Date) {
  const key = monthKey(referenceDate);
  const current = transactions.filter((transaction) => transaction.date.startsWith(key));
  const income = current
    .filter((transaction) => transaction.type === 'income')
    .reduce((total, transaction) => total + transaction.amount, 0);
  const expenses = current
    .filter((transaction) => transaction.type === 'expense')
    .reduce((total, transaction) => total + transaction.amount, 0);
  return { key, income, expenses };
}

function buildOverspending(transactions: Transaction[], currentKey: string, referenceDate: Date) {
  const historyKeys = monthKeysBeforeCurrent(3, referenceDate);
  const categoriesWithHistory = CATEGORIES.filter((category) =>
    historyKeys.some((key) => expenseTotal(transactions, key, category.id) > 0),
  );

  return categoriesWithHistory
    .map((category) => {
      // Months without recorded spending in this category are not observations
      // and must not lower the category's typical-spend average.
      const historicalValues = historyKeys
        .map((key) => expenseTotal(transactions, key, category.id))
        .filter((value) => value > 0);
      const averageSpend =
        historicalValues.length > 0
          ? historicalValues.reduce((total, value) => total + value, 0) / historicalValues.length
          : 0;
      const currentSpend = expenseTotal(transactions, currentKey, category.id);
      const increasePercent =
        averageSpend > 0 ? Math.round(((currentSpend - averageSpend) / averageSpend) * 100) : 0;

      return {
        categoryId: category.id,
        categoryName: category.name,
        currentSpend,
        averageSpend,
        increasePercent,
        message: `Your ${category.name} spending is ${increasePercent}% higher than usual this month — you've spent ${money(currentSpend)} so far.`,
      };
    })
    .filter((item) => item.currentSpend >= item.averageSpend * 1.2)
    .sort((a, b) => b.increasePercent - a.increasePercent);
}

function buildIncomeNudge(
  transactions: Transaction[],
  referenceDate: Date,
): AssistantAnalysis['incomeNudge'] {
  const incomeTransactions = transactions.filter((transaction) => transaction.type === 'income');
  const historyKeys = monthKeysBeforeCurrent(3, referenceDate);
  const recurring = incomeTransactions.filter((transaction) => {
    const matchingMonths = new Set(
      incomeTransactions
        .filter(
          (candidate) =>
            candidate.title.trim().toLowerCase() === transaction.title.trim().toLowerCase() &&
            candidate.categoryId === transaction.categoryId &&
            Math.abs(candidate.amount - transaction.amount) < 0.01,
        )
        .map((candidate) => candidate.date.slice(0, 7)),
    );
    return historyKeys.filter((key) => matchingMonths.has(key)).length >= 2;
  });
  const patterns = new Set(
    recurring.map(
      (transaction) =>
        `${transaction.title.trim().toLowerCase()}|${transaction.categoryId}|${transaction.amount.toFixed(2)}`,
    ),
  );
  const currentKey = monthKey(referenceDate);
  const hasOnlyOneRecurringSource =
    patterns.size === 1 &&
    historyKeys.some((key) => recurring.some((transaction) => transaction.date.startsWith(key))) &&
    !incomeTransactions.some(
      (transaction) =>
        transaction.date.startsWith(currentKey) &&
        !recurring.some((recurringTransaction) => recurringTransaction.id === transaction.id),
    );

  const recurringMonthlyAverage =
    recurring.length > 0
      ? recurring.reduce((total, transaction) => total + transaction.amount, 0) /
        Math.max(new Set(recurring.map((transaction) => transaction.date.slice(0, 7))).size, 1)
      : 0;
  const monthlyExtraTarget = recurringMonthlyAverage > 0 ? recurringMonthlyAverage * 0.1 : null;

  return {
    triggered: hasOnlyOneRecurringSource,
    monthlyExtraTarget,
    message: monthlyExtraTarget
      ? `Consider adding a second income stream — even ${money(monthlyExtraTarget)}/month extra compounds fast toward your goals.`
      : 'Consider adding a second income stream — reviewing side-hustle ideas can help you move toward your goals.',
  };
}

export function analyzeBudget(
  transactions: Transaction[],
  referenceDate: Date = new Date(),
): AssistantAnalysis {
  const totals = currentTotals(transactions, referenceDate);
  const overspending = buildOverspending(transactions, totals.key, referenceDate);
  const netSavings = totals.income - totals.expenses;
  const savingsRate = totals.income > 0 ? netSavings / totals.income : null;
  const highestOverspend = overspending[0];
  const highestCurrentCategory = CATEGORIES.map((category) => ({
    category,
    amount: expenseTotal(transactions, totals.key, category.id),
  })).sort((a, b) => b.amount - a.amount)[0];
  const savingsKind =
    savingsRate === null ? 'neutral' : savingsRate >= 0.2 ? 'success' : savingsRate < 0.1 ? 'warning' : 'neutral';
  const savingsMessage =
    savingsRate !== null && savingsRate < 0.1
      ? `You're saving less than 10% this month. Try cutting ${money(
          Math.max(totals.income * 0.2 - netSavings, 0),
        )} from ${(highestOverspend?.categoryName ?? highestCurrentCategory?.category.name ?? 'your top spending category')} to hit a healthier savings rate.`
      : savingsRate !== null && savingsRate >= 0.2
        ? `Great job — you're saving ${Math.round(savingsRate * 100)}% this month, above the recommended 20%.`
        : null;
  const incomeNudge = buildIncomeNudge(transactions, referenceDate);

  const tips: AssistantTip[] = [];
  if (overspending[0]) {
    tips.push({
      id: `overspend-${overspending[0].categoryId}`,
      title: 'Spending is trending up',
      body: overspending[0].message,
      kind: 'warning',
    });
  }
  if (savingsMessage) {
    tips.push({
      id: 'savings',
      title: savingsKind === 'success' ? 'Savings milestone' : 'Savings opportunity',
      body: savingsMessage,
      kind: savingsKind === 'success' ? 'success' : 'warning',
    });
  }
  if (tips.length < 2 && incomeNudge.triggered) {
    tips.push({
      id: 'income-nudge',
      title: 'Income idea',
      body: incomeNudge.message,
      kind: 'education',
    });
  }
  return {
    overspending,
    savings: {
      income: totals.income,
      expenses: totals.expenses,
      netSavings,
      savingsRate,
      message: savingsMessage,
      kind: savingsKind,
    },
    incomeNudge,
    tips,
  };
}

export function getRotatingTips(
  transactions: Transaction[],
  referenceDate: Date = new Date(),
): AssistantTip[] {
  const tips = analyzeBudget(transactions, referenceDate).tips;
  if (tips.length < 2) return tips;
  const day = referenceDate.getDate();
  const start = day % tips.length;
  return [tips[start], tips[(start + 1) % tips.length]];
}

export function answerAssistantQuestion(
  transactions: Transaction[],
  question: string,
  referenceDate: Date = new Date(),
): string {
  const normalized = question.trim().toLowerCase();
  const analysis = analyzeBudget(transactions, referenceDate);
  const currentKey = monthKey(referenceDate);

  if (
    normalized.includes('expense') ||
    normalized.includes('spend') ||
    normalized.includes('spent')
  ) {
    const topCategories = CATEGORIES.map((category) => ({
      name: category.name,
      amount: expenseTotal(transactions, currentKey, category.id),
    }))
      .filter((item) => item.amount > 0)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 3);
    if (topCategories.length === 0) {
      return 'There are no expenses recorded this month yet. Add a transaction and I can break down your spending.';
    }
    const breakdown = topCategories.map((item) => `${item.name}: ${money(item.amount)}`).join('\n');
    const overspend = analysis.overspending[0]
      ? `\n\n${analysis.overspending[0].message}`
      : '';
    return `Here are your top spending categories this month:\n${breakdown}${overspend}`;
  }

  if (normalized.includes('saving') || normalized.includes('save more') || normalized.includes('save')) {
    if (analysis.savings.message) return analysis.savings.message;
    if (analysis.savings.income <= 0) {
      return 'I need at least one income entry this month to calculate a savings rate. Add your income and I can suggest a target from your own numbers.';
    }
    return `You are saving ${Math.round((analysis.savings.savingsRate ?? 0) * 100)}% this month. Keep tracking your expenses to find the categories with the most room to improve.`;
  }

  if (normalized.includes('income') || normalized.includes('earn more')) {
    return analysis.incomeNudge.message;
  }

  return 'I can help with spending breakdowns, savings tips, and income ideas — try asking about one of those!';
}

export function assistantCategoryName(categoryId: string): string {
  return categoryById(categoryId).name;
}