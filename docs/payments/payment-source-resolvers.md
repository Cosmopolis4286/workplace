# Payment source resolver contract

Every payable domain must resolve amount, currency, seller and payer authorization from trusted database records. Browser-supplied price, seller ID and currency must never be trusted.

## Resolver responsibilities

1. Load the source and authoritative price/line items from the database.
2. Verify the authenticated payer can pay for the source.
3. Verify the source is payable and not already paid or cancelled.
4. Derive seller, currency and amount from persisted data.
5. Return a stable source identity and description; revalidate mutable prices before checkout.
6. Use decimal strings with at most two decimal places, never floating-point money arithmetic.

## Current rollout

- **Catalog orders:** resolver registered. It checks the authenticated requester, rejects cancelled/closed orders, reads the persisted order total and derives the seller from the commerce record.
- **Service requests:** resolver registered for requests in `CONTACTED` state with a positive, persisted agreed price. It verifies the authenticated requester, confirms the service still belongs to the persisted provider, and reads currency from commerce/freelancer settings. Conflicting, missing or unsupported currencies fail closed. Requests already using or having used internal escrow are rejected to avoid charging the same work twice.
- **Currency guard:** only VES and USD are accepted. Existing commerce settings default to MXN, so those orders fail closed until the commerce currency is explicitly configured to a supported currency. Amounts are never silently converted or relabeled.
- **Rides and subscriptions:** remain disabled until each has a domain-specific resolver and tests.
- **Provider checkout:** remains disabled. These resolvers only produce trusted source facts; they do not create an external checkout or move money.

Before enabling checkout, implement provider-specific API integration, signature verification, idempotent state transitions and reconciliation, and revalidate the source's payable status and amount immediately before checkout.
