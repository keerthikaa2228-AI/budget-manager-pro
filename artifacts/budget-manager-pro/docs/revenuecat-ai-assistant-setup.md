# RevenueCat AI Assistant setup

The app-side integration is complete. The following RevenueCat dashboard entries are
required for the AI subscription to resolve to a real price and purchase flow.

## Entitlement

Create this entitlement:

- Identifier: `ai_assistant`
- Display name: `AI Assistant`

Keep the existing `premium` entitlement for the lifetime purchase. The app checks
these entitlements independently:

- `premium`: lifetime Pro features
- `ai_assistant`: monthly AI Assistant access

## Products

Create two auto-renewing monthly products so RevenueCat can present a real
discounted variant to existing lifetime customers. A product's store price cannot
be changed dynamically from client code.

| Store identifier | Type | Duration | Attach to |
| --- | --- | --- | --- |
| `ai_assistant_monthly` | Auto-renewable subscription | 1 month | `ai_assistant` |
| `ai_assistant_monthly_premium` | Auto-renewable subscription | 1 month | `ai_assistant` |

Set the second product's price to 50% of the standard product price in the store
catalog. Use the same billing period for both products. Choose the standard
monthly price in RevenueCat; the app reads the localized `priceString` from the
selected package and never invents a price.

## Offerings

Create these current offerings. Each offering should contain one package using its
matching monthly product:

- `ai_assistant_standard`
  - package identifier: `$rc_monthly`
  - product: `ai_assistant_monthly`
- `ai_assistant_premium`
  - package identifier: `$rc_monthly`
  - product: `ai_assistant_monthly_premium`

The app selects `ai_assistant_premium` only when RevenueCat reports the active
`premium` entitlement. Otherwise it selects `ai_assistant_standard`. Both
offerings must be available from the current offering response for the app user.

## How the client selects the discount

`lib/revenuecat.tsx`:

1. Reads `customerInfo.entitlements.active.premium`.
2. Finds an AI offering from `offerings.all`.
3. Selects an offering whose identifier contains `premium` or `discount` when
   `premium` is active.
4. Selects the standard AI offering otherwise.
5. Presents the selected offering through `RevenueCatUI.presentPaywall`.

The `isAIAssistantDiscounted` value is only true when both the premium entitlement
and a matching AI package are present. The selected package's `product.priceString`
is exposed as `aiAssistantPriceString`.

## Testing

1. Configure the Test Store versions of both monthly products and attach them to
   `ai_assistant`.
2. Make `ai_assistant_standard` the current offering while testing the free path.
3. Use a fresh RevenueCat test user without `premium`; tapping the dashboard bot
   or AI Insights card should show the standard AI paywall.
4. Purchase or restore the lifetime product for the same test user, then reload
   offerings. The app should select `ai_assistant_premium`, set
   `isAIAssistantDiscounted` to `true`, and show the 50%-off package price.
5. Purchase the monthly AI package. `hasAIAssistant` becomes true and the chat
   screen opens with local rule-based responses.

RevenueCat product/entitlement creation is intentionally not performed by the
mobile client. This prevents secret management and keeps RevenueCat as the source
of truth for products and prices.