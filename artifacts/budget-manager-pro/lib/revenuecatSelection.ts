type RevenueCatPackageLike = {
  identifier: string;
  packageType?: string;
  product: {
    identifier: string;
    title?: string;
    description?: string;
    subscriptionPeriod?: string | null;
  };
};

type RevenueCatOfferingLike<TPackage extends RevenueCatPackageLike> = {
  identifier: string;
  metadata?: Record<string, unknown>;
  availablePackages: TPackage[];
  monthly?: TPackage | null;
};

export interface AIAssistantSelection<TOffering, TPackage> {
  offering: TOffering | null;
  package: TPackage | null;
  isDiscounted: boolean;
  diagnostics: string[];
}

const AI_MARKERS = ['aiassistant', 'budgetassistant', 'aibudget'];
const DISCOUNT_MARKERS = ['premium', 'discount', 'lifetime'];
const STANDARD_MARKERS = ['standard', 'regular', 'fullprice'];

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function collectText(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(collectText);
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, nestedValue]) => [
      key,
      ...collectText(nestedValue),
    ]);
  }
  return [];
}

function containsMarker(values: string[], markers: string[]): boolean {
  const searchable = normalize(values.join(' '));
  return markers.some((marker) => searchable.includes(normalize(marker)));
}

function packageText(pkg: RevenueCatPackageLike): string[] {
  return [
    pkg.identifier,
    pkg.packageType ?? '',
    pkg.product.identifier,
    pkg.product.title ?? '',
    pkg.product.description ?? '',
    pkg.product.subscriptionPeriod ?? '',
  ];
}

function offeringText<TPackage extends RevenueCatPackageLike>(
  offering: RevenueCatOfferingLike<TPackage>,
): string[] {
  return [
    offering.identifier,
    ...collectText(offering.metadata ?? {}),
    ...offering.availablePackages.flatMap(packageText),
  ];
}

function offeringIdentityText<TPackage extends RevenueCatPackageLike>(
  offering: RevenueCatOfferingLike<TPackage>,
): string[] {
  return [offering.identifier, ...collectText(offering.metadata ?? {})];
}

function isAIOffering<TPackage extends RevenueCatPackageLike>(
  offering: RevenueCatOfferingLike<TPackage>,
): boolean {
  return containsMarker(offeringText(offering), AI_MARKERS);
}

function offeringTierSignal<TPackage extends RevenueCatPackageLike>(
  offering: RevenueCatOfferingLike<TPackage>,
): boolean | null {
  const values = offeringIdentityText(offering);
  if (containsMarker(values, DISCOUNT_MARKERS)) return true;
  if (containsMarker(values, STANDARD_MARKERS)) return false;
  return null;
}

function packageTierSignal(pkg: RevenueCatPackageLike): boolean | null {
  const values = packageText(pkg);
  if (containsMarker(values, DISCOUNT_MARKERS)) return true;
  if (containsMarker(values, STANDARD_MARKERS)) return false;
  return null;
}

function isMonthlyPackage(pkg: RevenueCatPackageLike): boolean {
  const productPeriod = pkg.product.subscriptionPeriod?.toUpperCase();
  if (productPeriod) return productPeriod === 'P1M';
  return pkg.packageType?.toUpperCase() === 'MONTHLY';
}

export function selectAIAssistantOffering<
  TPackage extends RevenueCatPackageLike,
  TOffering extends RevenueCatOfferingLike<TPackage>,
>(
  offerings: { current: TOffering | null; all: Record<string, TOffering> } | null | undefined,
  hasPremium: boolean,
): AIAssistantSelection<TOffering, TPackage> {
  const diagnostics: string[] = [];
  const empty: AIAssistantSelection<TOffering, TPackage> = {
    offering: null,
    package: null,
    isDiscounted: false,
    diagnostics,
  };

  if (!offerings) return empty;

  const allOffers = Object.values(offerings.all);
  const candidates = offerings.current
    ? [...allOffers, offerings.current].filter(
        (offering, index, list) => list.indexOf(offering) === index,
      )
    : allOffers;
  const aiCandidates = candidates.filter(isAIOffering);

  if (aiCandidates.length === 0) {
    diagnostics.push(
      '[RevenueCat] No AI Assistant offering or product was identified. Add AI Assistant metadata or descriptive offering/product details; no unrelated offering was selected.',
    );
    return empty;
  }

  const monthlyChoices = aiCandidates.flatMap((offering) => {
    const offeringTier = offeringTierSignal(offering);
    return offering.availablePackages
      .filter(isMonthlyPackage)
      .flatMap((pkg) => {
        const pkgTier = packageTierSignal(pkg);
        if (offeringTier !== null && pkgTier !== null && offeringTier !== pkgTier) return [];
        const tier = pkgTier ?? offeringTier;
        if (hasPremium ? tier !== true : tier === true) return [];
        return [{
          offering,
          package: pkg,
          tier,
          specificity: pkgTier !== null ? 2 : offeringTier !== null ? 1 : 0,
        }];
      });
  });

  if (monthlyChoices.length === 0) {
    const hasAnyMonthlyPackage = aiCandidates.some((offering) =>
      offering.availablePackages.some(isMonthlyPackage),
    );
    diagnostics.push(
      hasAnyMonthlyPackage
        ? hasPremium
          ? '[RevenueCat] No discounted AI Assistant offering or monthly package was identified for this premium customer. The standard-priced offering was not selected.'
          : '[RevenueCat] No standard AI Assistant offering or monthly package was identified. A discounted or unrelated offering was not selected.'
          : '[RevenueCat] AI Assistant offerings were found, but no monthly package was identified. No other package type was selected.',
    );
    return empty;
  }

  const highestSpecificity = Math.max(...monthlyChoices.map((choice) => choice.specificity));
  const preferredChoices = monthlyChoices.filter(
    (choice) => choice.specificity === highestSpecificity,
  );
  let selectedChoice = preferredChoices.length === 1 ? preferredChoices[0] : null;

  if (!selectedChoice && offerings.current) {
    const currentChoices = preferredChoices.filter(
      (choice) => choice.offering === offerings.current,
    );
    if (currentChoices.length === 1) {
      selectedChoice = currentChoices[0];
    } else if (
      currentChoices.length > 1 &&
      offerings.current.monthly &&
      currentChoices.some((choice) => choice.package === offerings.current?.monthly)
    ) {
      selectedChoice = currentChoices.find(
        (choice) => choice.package === offerings.current?.monthly,
      ) ?? null;
    }
    if (selectedChoice && preferredChoices.length > 1) {
      diagnostics.push(
        `[RevenueCat] Multiple ${hasPremium ? 'discounted' : 'standard'} AI Assistant monthly choices matched; using the current offering's matching monthly package.`,
      );
    }
  }

  if (!selectedChoice) {
    diagnostics.push(
      `[RevenueCat] Could not identify one unambiguous ${hasPremium ? 'discounted' : 'standard'} monthly AI Assistant package. Configure an explicit tier or a single suitable package.`,
    );
    return { ...empty, diagnostics };
  }

  if (packageTierSignal(selectedChoice.package) === null && selectedChoice.tier !== null) {
    diagnostics.push(
      `[RevenueCat] No tier-specific package marker was found in AI Assistant offering "${selectedChoice.offering.identifier}"; using its only monthly package within the selected offering tier.`,
    );
  } else if (!hasPremium && selectedChoice.tier === null) {
    diagnostics.push(
      `[RevenueCat] No explicit standard-tier marker was found for AI Assistant offering "${selectedChoice.offering.identifier}"; using its unambiguous monthly package.`,
    );
  }

  return {
    offering: selectedChoice.offering,
    package: selectedChoice.package,
    isDiscounted: selectedChoice.tier === true,
    diagnostics,
  };
}