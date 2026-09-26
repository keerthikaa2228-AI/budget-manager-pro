import assert from 'node:assert/strict';
import test from 'node:test';
import { selectAIAssistantOffering } from '../lib/revenuecatSelection';

function packageFixture(
  identifier: string,
  packageType: string,
  productIdentifier: string,
  subscriptionPeriod: string | null,
) {
  return {
    identifier,
    packageType,
    product: {
      identifier: productIdentifier,
      title: 'Assistant monthly access',
      description: 'Monthly access to the budget assistant',
      subscriptionPeriod,
    },
  };
}

function offeringFixture(
  identifier: string,
  packages: ReturnType<typeof packageFixture>[],
  metadata: Record<string, unknown> = {},
) {
  return {
    identifier,
    metadata,
    availablePackages: packages,
    monthly: packages.find((pkg) => pkg.packageType === 'MONTHLY') ?? null,
  };
}

test('selects the monthly premium offer from explicit offering metadata', () => {
  const standard = offeringFixture(
    'opaque-a',
    [packageFixture('$rc_monthly', 'MONTHLY', 'sku-a', 'P1M')],
    { feature: 'ai_assistant', tier: 'standard' },
  );
  const premium = offeringFixture(
    'opaque-b',
    [packageFixture('$rc_monthly', 'MONTHLY', 'sku-b', 'P1M')],
    { feature: 'ai_assistant', tier: 'discounted' },
  );
  const offerings = { current: standard, all: { standard, premium } };

  const selection = selectAIAssistantOffering(offerings, true);

  assert.equal(selection.offering, premium);
  assert.equal(selection.package?.product.identifier, 'sku-b');
  assert.equal(selection.isDiscounted, true);
  assert.ok(selection.diagnostics.some((message) => message.includes('only monthly package')));
});

test('does not fall back to a standard package for a premium customer', () => {
  const standard = offeringFixture(
    'ai_assistant_standard',
    [packageFixture('$rc_monthly', 'MONTHLY', 'ai_assistant_monthly', 'P1M')],
  );

  const selection = selectAIAssistantOffering(
    { current: standard, all: { standard } },
    true,
  );

  assert.equal(selection.offering, null);
  assert.equal(selection.package, null);
  assert.ok(selection.diagnostics.some((message) => message.includes('No discounted')));
});

test('does not select an annual package when a monthly package is absent', () => {
  const annual = offeringFixture(
    'ai_assistant_standard',
    [packageFixture('$rc_annual', 'ANNUAL', 'ai_assistant_annual', 'P1Y')],
  );

  const selection = selectAIAssistantOffering(
    { current: annual, all: { annual } },
    false,
  );

  assert.equal(selection.package, null);
  assert.ok(selection.diagnostics.some((message) => message.includes('no monthly package')));
});

test('does not trust a monthly package label when the store product is annual', () => {
  const mislabeled = offeringFixture(
    'ai_assistant_standard',
    [packageFixture('$rc_monthly', 'MONTHLY', 'ai_assistant_annual', 'P1Y')],
  );

  const selection = selectAIAssistantOffering(
    { current: mislabeled, all: { mislabeled } },
    false,
  );

  assert.equal(selection.package, null);
  assert.ok(selection.diagnostics.some((message) => message.includes('no monthly package was identified')));
});

test('recognizes AI assistant package details when offering id is opaque', () => {
  const aiOffer = offeringFixture(
    'opaque-offer',
    [packageFixture('$rc_monthly', 'UNKNOWN', 'sku-monthly', 'P1M')],
    { feature: 'AI Assistant' },
  );

  const selection = selectAIAssistantOffering(
    { current: aiOffer, all: { aiOffer } },
    false,
  );

  assert.equal(selection.offering, aiOffer);
  assert.equal(selection.package?.product.identifier, 'sku-monthly');
});

test('prefers an explicitly discounted package over an unmarked monthly package', () => {
  const unmarked = packageFixture('$rc_monthly', 'MONTHLY', 'sku-monthly-a', 'P1M');
  const discounted = packageFixture(
    'discount-monthly',
    'MONTHLY',
    'ai_assistant_monthly_premium',
    'P1M',
  );
  const premium = {
    ...offeringFixture(
      'opaque-premium-offer',
      [unmarked, discounted],
      { feature: 'ai_assistant' },
    ),
    monthly: unmarked,
  };

  const selection = selectAIAssistantOffering(
    { current: premium, all: { premium } },
    true,
  );

  assert.equal(selection.package?.product.identifier, 'ai_assistant_monthly_premium');
});

test('refuses to guess when multiple unmarked monthly packages are available', () => {
  const monthlyA = packageFixture('$rc_monthly', 'MONTHLY', 'sku-a', 'P1M');
  const monthlyB = packageFixture('custom-monthly', 'CUSTOM', 'sku-b', 'P1M');
  const ambiguous = {
    ...offeringFixture('opaque-offer', [monthlyA, monthlyB], { feature: 'ai_assistant' }),
    monthly: null,
  };

  const selection = selectAIAssistantOffering(
    { current: null, all: { ambiguous } },
    false,
  );

  assert.equal(selection.package, null);
  assert.ok(selection.diagnostics.some((message) => message.includes('unambiguous')));
});