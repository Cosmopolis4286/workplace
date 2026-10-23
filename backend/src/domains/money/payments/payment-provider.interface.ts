import {
  ExternalPaymentProvider,
  ExternalPaymentStatus,
  ExternalSettlementMode,
} from '@prisma/client';

export interface CreateProviderCheckoutInput {
  paymentIntentId: string;
  idempotencyKey: string;
  amount: string;
  currency: 'VES' | 'USD';
  description: string;
  returnUrl: string;
  webhookUrl: string;
  metadata?: Record<string, string>;
}

export interface ProviderCheckoutResult {
  providerPaymentId: string;
  checkoutUrl?: string;
  status: ExternalPaymentStatus;
  expiresAt?: Date;
  rawResponse?: unknown;
}

export interface VerifiedProviderEvent {
  provider: ExternalPaymentProvider;
  providerEventId: string;
  eventType: string;
  paymentIntentId?: string;
  providerPaymentId?: string;
  status?: ExternalPaymentStatus;
  signatureVerified: true;
  payload: Record<string, unknown>;
}

export interface ProviderCapabilities {
  checkout: boolean;
  verifiedWebhooks: boolean;
  marketplaceSplit: boolean;
  sellerPayouts: boolean;
  partialRefunds: boolean;
  fullRefunds: boolean;
  settlementCurrencies: Array<'VES' | 'USD'>;
  settlementMode: ExternalSettlementMode[];
}

/** Implement signature and response semantics from each vendor's current API contract. */
export interface PaymentProviderAdapter {
  readonly provider: ExternalPaymentProvider;
  readonly capabilities: ProviderCapabilities;
  createCheckout(
    input: CreateProviderCheckoutInput,
  ): Promise<ProviderCheckoutResult>;
  verifyAndParseWebhook(
    rawBody: Buffer,
    headers: Record<string, string | string[] | undefined>,
  ): Promise<VerifiedProviderEvent>;
  refund(input: {
    providerPaymentId: string;
    amount: string;
    currency: 'VES' | 'USD';
    idempotencyKey: string;
    reason: string;
  }): Promise<{
    providerRefundId?: string;
    status: 'PROCESSING' | 'SUCCEEDED';
  }>;
}
