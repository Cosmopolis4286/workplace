# External payments foundation

This module is a provider-independent foundation for external checkout, commissions, refunds, seller settlements, webhook inboxing and reconciliation.
It does not hold customer funds and does not replace WalletsModule, EscrowModule, PlatformFeesModule or the existing BNPL/Cashea integration.

## Safety boundary
- No live provider adapter is enabled in this change. VEXPay, PagoLink and Banco de Venezuela remain candidates until account approval, current API contract, credentials, settlement currencies and regulatory responsibilities are confirmed.
- prepareIntent() is an internal service method. Its caller must load and authorize the source record and derive amount/currency server-side. Never pass arbitrary browser-supplied prices.
- GET /api/payments/intents/:id only returns an intent to its recorded payer or seller.
- recordVerifiedWebhook() may only be called after a provider-specific adapter verifies the provider's actual signature.
- An intent starts as DRAFT. No checkout is created and no order is marked paid by this foundation alone.
- A settlement row is an operational record, not proof money was paid. Mark it PAID only after trusted provider/bank confirmation.
- VES and USD remain separate. Never net balances across currencies. Snapshot source and date for any future conversion.
- This schema does not authorize custody, escrow, FX conversion or payouts. Obtain Venezuelan legal/accounting review before live processing.

## Commission calculation
commissionRateBps is basis points: 800 means 8%. CLIENT adds commission to the buyer's charge; PROVIDER deducts it from seller net. Prisma Decimal and half-up rounding are used to two decimal places. Processor fees remain separate unless the provider contract says otherwise.

## Next integration gates
1. Obtain sandbox/live credentials and current provider API documentation.
2. Implement one provider adapter: checkout, exact signature verification, status lookup, refunds and only split/payout capabilities confirmed by contract.
3. Add server-side source resolvers for catalog orders, service requests, rides and subscription invoices; each resolver owns pricing and authorization.
4. Add contract tests using official sandbox payloads, duplicate/out-of-order webhooks, timeouts, ambiguous outcomes, refund limits and reconciliation fixtures.
5. Review invoicing and SENIAT requirements with Venezuelan counsel/accountant. Existing receipts are documented as non-fiscal.