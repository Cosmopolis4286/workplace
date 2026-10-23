import { BadRequestException } from '@nestjs/common';

export type PaymentSourceType =
  | 'CATALOG_ORDER'
  | 'SERVICE_REQUEST'
  | 'RIDE'
  | 'SUBSCRIPTION';

export type PaymentCurrency = 'VES' | 'USD';

/**
 * Server-derived checkout facts. Implementations must load the source from the
 * database, verify payer access and payable state, and derive the price from
 * trusted persisted data. Never construct this object from request-body prices.
 */
export interface ResolvedPaymentSource {
  sourceType: PaymentSourceType;
  sourceId: string;
  payerUserId: string;
  sellerUserId: string;
  currency: PaymentCurrency;
  baseAmount: string;
  description: string;
  /** Optional stable revision/version used to detect a changed quote. */
  quoteVersion?: string;
}

export interface PaymentSourceResolver {
  readonly sourceType: PaymentSourceType;
  resolve(
    sourceId: string,
    payerUserId: string,
  ): Promise<ResolvedPaymentSource>;
}

export const PAYMENT_SOURCE_RESOLVERS = Symbol('PAYMENT_SOURCE_RESOLVERS');

export function assertResolvedPaymentSource(
  resolved: ResolvedPaymentSource,
  expectedType: PaymentSourceType,
  expectedId: string,
  payerUserId: string,
): ResolvedPaymentSource {
  if (
    resolved.sourceType !== expectedType ||
    resolved.sourceId !== expectedId ||
    resolved.payerUserId !== payerUserId ||
    !resolved.sellerUserId?.trim() ||
    !resolved.description?.trim() ||
    (resolved.currency !== 'VES' && resolved.currency !== 'USD')
  ) {
    throw new BadRequestException('El origen no devolvió datos de pago válidos');
  }

  // Decimal validation stays provider-independent and avoids JS floating point.
  if (!/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(resolved.baseAmount)) {
    throw new BadRequestException('El origen devolvió un importe inválido');
  }
  const [whole, fraction = ''] = resolved.baseAmount.split('.');
  if (whole === '0' && Number(fraction || '0') === 0) {
    throw new BadRequestException('El importe del origen debe ser positivo');
  }

  return resolved;
}
