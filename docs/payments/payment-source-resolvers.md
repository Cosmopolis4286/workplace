# Payment source resolver contract

Every payable domain must resolve amount, currency, seller and payer authorization from trusted database records. Browser-supplied price, seller ID and currency must never be trusted.

## Resolver responsibilities

1. Load the source and authoritative price/line items from the database.
2. Verify the authenticated payer can pay for the source.
3. Verify the source is payable and not already paid or cancelled.
4. Derive seller, currency and amount from persisted data.
5. Return a stable source identity and description; revalidate mutable prices before checkout.
6. Use decimal strings with at most two decimal places, never floating-point money arithmetic.

## Rollout

The registry must fail closed for unregistered source types and reject duplicate resolvers, mismatched payer/source identity, unsupported currency and invalid amounts. Catalog orders, service requests, rides and subscriptions remain disabled until each has a domain-specific resolver and tests. Implement catalog orders first, wire each resolver only after integration tests pass, and keep provider checkout disabled until official provider integration, signature verification and reconciliation are validated.
