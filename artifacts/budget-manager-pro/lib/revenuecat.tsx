import React, { createContext, useCallback, useContext } from 'react';
import Purchases, { PurchasesOffering, PurchasesPackage } from 'react-native-purchases';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

const REVENUECAT_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY ?? '';

/** The entitlement identifier configured in your RevenueCat dashboard */
export const REVENUECAT_ENTITLEMENT_IDENTIFIER = 'premium';
export const REVENUECAT_AI_ENTITLEMENT_IDENTIFIER = 'ai_assistant';

const AI_PRODUCT_MARKERS = ['ai_assistant', 'ai-assistant', 'aiassistant'];
const DISCOUNTED_AI_MARKERS = ['premium', 'discount', 'lifetime'];

function packageLooksLikeAI(pkg: PurchasesPackage): boolean {
  const identifier = pkg.product.identifier.toLowerCase();
  return AI_PRODUCT_MARKERS.some((marker) => identifier.includes(marker));
}

function offeringLooksLikeAI(offering: PurchasesOffering): boolean {
  return offering.availablePackages.some(packageLooksLikeAI);
}

function findAIOffering(
  offerings: { current: PurchasesOffering | null; all: Record<string, PurchasesOffering> },
  hasPremium: boolean,
): PurchasesOffering | null {
  const candidates = Object.values(offerings.all).filter(offeringLooksLikeAI);
  const preferred = candidates.find((offering) => {
    const identifier = offering.identifier.toLowerCase();
    const hasDiscountMarker = DISCOUNTED_AI_MARKERS.some((marker) => identifier.includes(marker));
    return hasPremium ? hasDiscountMarker : !hasDiscountMarker;
  });
  return preferred ?? candidates[0] ?? (
    offerings.current && offeringLooksLikeAI(offerings.current)
      ? offerings.current
      : null
  );
}

function findAIPackage(offering: PurchasesOffering | null, hasPremium: boolean): PurchasesPackage | null {
  if (!offering) return null;
  const packages = offering.availablePackages.filter(packageLooksLikeAI);
  const preferred = packages.find((pkg) => {
    const identifier = pkg.product.identifier.toLowerCase();
    const hasDiscountMarker = DISCOUNTED_AI_MARKERS.some((marker) => identifier.includes(marker));
    return hasPremium ? hasDiscountMarker : !hasDiscountMarker;
  });
  return preferred ?? packages[0] ?? null;
}

/**
 * Call once at module level in app/_layout.tsx (outside any component).
 * Throws if the API key env var is missing.
 */
export function initializeRevenueCat() {
  if (!REVENUECAT_API_KEY) {
    throw new Error('[RevenueCat] EXPO_PUBLIC_REVENUECAT_API_KEY is not set');
  }
  Purchases.setLogLevel(
    __DEV__ ? Purchases.LOG_LEVEL.DEBUG : Purchases.LOG_LEVEL.ERROR,
  );
  Purchases.configure({ apiKey: REVENUECAT_API_KEY });
  console.log('[RevenueCat] Initialized successfully');
}

// ---------------------------------------------------------------------------
// Internal hook — do not export; consume via useSubscription()
// ---------------------------------------------------------------------------
function useSubscriptionContext() {
  const queryClient = useQueryClient();

  // Customer info (entitlements, purchase history)
  const customerInfoQuery = useQuery({
    queryKey: ['revenuecat', 'customer-info'],
    queryFn: () => Purchases.getCustomerInfo(),
    staleTime: 60_000,
  });

  // Current offerings from the RevenueCat dashboard
  const offeringsQuery = useQuery({
    queryKey: ['revenuecat', 'offerings'],
    queryFn: () => Purchases.getOfferings(),
    staleTime: 300_000,
  });

  // Manual purchase (used as fallback when paywall UI isn't configured)
  const purchaseMutation = useMutation({
    mutationFn: async (pkg: PurchasesPackage) => {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      return customerInfo;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['revenuecat', 'customer-info'] }),
  });

  // Restore purchases
  const restoreMutation = useMutation({
    mutationFn: () => Purchases.restorePurchases(),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['revenuecat', 'customer-info'] }),
  });

  const isSubscribed =
    customerInfoQuery.data?.entitlements.active?.[REVENUECAT_ENTITLEMENT_IDENTIFIER] !==
    undefined;
  const hasAIAssistant =
    customerInfoQuery.data?.entitlements.active?.[REVENUECAT_AI_ENTITLEMENT_IDENTIFIER] !==
    undefined;
  const hasPremium = isSubscribed;
  const aiAssistantOffering = offeringsQuery.data
    ? findAIOffering(offeringsQuery.data, hasPremium)
    : null;
  const aiAssistantPackage = findAIPackage(aiAssistantOffering, hasPremium);

  /**
   * Present the RevenueCat native Paywall UI (reads your dashboard template).
   * Returns true if the user purchased or restored.
   */
  const showPaywall = useCallback(async (): Promise<boolean> => {
    try {
      const result = await RevenueCatUI.presentPaywall();
      const purchased =
        result === PAYWALL_RESULT.PURCHASED || result === PAYWALL_RESULT.RESTORED;
      if (purchased) {
        queryClient.invalidateQueries({ queryKey: ['revenuecat', 'customer-info'] });
      }
      return purchased;
    } catch (e) {
      console.warn('[RevenueCat] presentPaywall error:', e);
      return false;
    }
  }, [queryClient]);

  /**
   * Presents the AI Assistant offering. RevenueCat should contain two
   * monthly offerings: a standard one and a premium-holder discount variant.
   * The selected offering is based only on the active premium entitlement.
   */
  const showAIAssistantPaywall = useCallback(async (): Promise<boolean> => {
    if (!aiAssistantOffering || !aiAssistantPackage) {
      console.warn(
        '[RevenueCat] AI Assistant offering is not configured. Add the standard and premium monthly offerings before presenting this paywall.',
      );
      return false;
    }
    try {
      const result = await RevenueCatUI.presentPaywall({
        offering: aiAssistantOffering,
        displayCloseButton: true,
      });
      const purchased =
        result === PAYWALL_RESULT.PURCHASED || result === PAYWALL_RESULT.RESTORED;
      if (purchased) {
        queryClient.invalidateQueries({ queryKey: ['revenuecat', 'customer-info'] });
      }
      return purchased;
    } catch (e) {
      console.warn('[RevenueCat] AI Assistant paywall error:', e);
      return false;
    }
  }, [aiAssistantOffering, aiAssistantPackage, queryClient]);

  /** Manual fallback purchase for the exact standard/discounted AI package. */
  const purchaseAIAssistant = useCallback(async () => {
    if (!aiAssistantPackage) {
      throw new Error('The AI Assistant monthly product is not available in the current offering.');
    }
    return purchaseMutation.mutateAsync(aiAssistantPackage);
  }, [aiAssistantPackage, purchaseMutation]);

  /**
   * Only shows the paywall when the user doesn't have the premium entitlement.
   * Returns true if the user already has access OR just purchased.
   */
  const showPaywallIfNeeded = async (): Promise<boolean> => {
    if (isSubscribed) return true;
    return showPaywall();
  };

  /**
   * Present the RevenueCat Customer Center (manage subscription, refunds, support).
   */
  const showCustomerCenter = useCallback(async () => {
    try {
      await RevenueCatUI.presentCustomerCenter();
      // Refresh in case they restored or cancelled
      queryClient.invalidateQueries({ queryKey: ['revenuecat', 'customer-info'] });
    } catch (e) {
      console.warn('[RevenueCat] presentCustomerCenter error:', e);
    }
  }, [queryClient]);

  // Convenience: first available package in the current offering
  const currentPackage =
    offeringsQuery.data?.current?.availablePackages?.[0] ?? null;
  const priceString = currentPackage?.product.priceString ?? '—';
  const aiAssistantPriceString = aiAssistantPackage?.product.priceString ?? '—';

  return {
    customerInfo: customerInfoQuery.data,
    offerings: offeringsQuery.data,
    currentPackage,
    priceString,
    aiAssistantPriceString,
    isSubscribed,
    hasPremium,
    hasAIAssistant,
    aiAssistantOffering,
    aiAssistantPackage,
    isAIAssistantDiscounted: hasPremium && !!aiAssistantPackage,
    isLoading: customerInfoQuery.isLoading || offeringsQuery.isLoading,
    purchase: purchaseMutation.mutateAsync,
    restore: restoreMutation.mutateAsync,
    isPurchasing: purchaseMutation.isPending,
    isRestoring: restoreMutation.isPending,
    showPaywall,
    showAIAssistantPaywall,
    purchaseAIAssistant,
    showPaywallIfNeeded,
    showCustomerCenter,
  };
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------
type SubscriptionContextValue = ReturnType<typeof useSubscriptionContext>;
const Context = createContext<SubscriptionContextValue | null>(null);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const value = useSubscriptionContext();
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useSubscription() {
  const ctx = useContext(Context);
  if (!ctx) throw new Error('useSubscription must be used within a SubscriptionProvider');
  return ctx;
}
