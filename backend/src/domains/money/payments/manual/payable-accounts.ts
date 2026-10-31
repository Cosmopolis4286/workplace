import { Prisma } from '@prisma/client';
import type { ExchangeRatesFacade } from '../../exchange-rates/exchange-rates.facade';

// Campos comunes de una cuenta donde se paga (del vendedor o de la plataforma).
export interface PayableAccountFields {
  method: string;
  currency: string;
  bankCode: string | null;
  bankName: string | null;
  holderName: string;
  holderDocument: string;
  phone: string | null;
  accountNumber: string | null;
  email: string | null;
}

/**
 * Monto a pagar en la moneda de cada cuenta. Si difiere de la del cobro se
 * convierte con la tasa vigente del servidor (rateToUsd = unidades de la
 * moneda por 1 USD); sin tasa, amount queda null y esa cuenta no se puede
 * usar. Compartido por el pago directo al vendedor y el pago del estado de
 * cuenta a la plataforma.
 */
export async function withPayableAmounts<T extends PayableAccountFields>(
  rates: ExchangeRatesFacade,
  accounts: T[],
  currency: string,
  amount: Prisma.Decimal
) {
  const rateCache = new Map<string, Prisma.Decimal | null>();
  const rateOf = async (code: string) => {
    if (code === 'USD') return new Prisma.Decimal(1);
    if (!rateCache.has(code)) {
      const r = await rates.resolveRateToUsd(code);
      rateCache.set(code, r && r.rateToUsd.gt(0) ? r.rateToUsd : null);
    }
    return rateCache.get(code)!;
  };

  return Promise.all(
    accounts.map(async (account) => {
      if (account.currency === currency) {
        return { ...account, amount, exchangeRate: null };
      }
      const from = await rateOf(currency);
      const to = await rateOf(account.currency);
      if (!from || !to) {
        return {
          ...account,
          amount: null as Prisma.Decimal | null,
          exchangeRate: null,
        };
      }
      const exchangeRate = to.div(from).toDecimalPlaces(8);
      return {
        ...account,
        amount: amount
          .mul(exchangeRate)
          .toDecimalPlaces(
            2,
            Prisma.Decimal.ROUND_HALF_UP
          ) as Prisma.Decimal | null,
        exchangeRate: exchangeRate as Prisma.Decimal | null,
      };
    })
  );
}

/** Copia inmutable de la cuenta de destino para guardar junto al pago. */
export function snapshotAccount(
  account: PayableAccountFields
): Prisma.InputJsonValue {
  return {
    method: account.method,
    currency: account.currency,
    bankCode: account.bankCode,
    bankName: account.bankName,
    holderName: account.holderName,
    holderDocument: account.holderDocument,
    phone: account.phone,
    accountNumber: account.accountNumber,
    email: account.email,
  };
}

/** Referencia bancaria normalizada (sin espacios, mayúsculas) o null si es inválida. */
export function normalizeReference(value: string): string | null {
  const reference = (value ?? '').toUpperCase().replace(/\s+/g, '');
  return /^[A-Z0-9-]{4,30}$/.test(reference) ? reference : null;
}

export const PAID_AT_MAX_AGE_DAYS = 30;

/** Fecha de un pago reportado: no futura (1 h de tolerancia) ni de hace más de 30 días. */
export function parsePaidAt(value: string): Date | string {
  const paidAt = new Date(value);
  const now = Date.now();
  if (
    Number.isNaN(paidAt.getTime()) ||
    paidAt.getTime() > now + 60 * 60 * 1000
  ) {
    return 'La fecha del pago no puede ser futura';
  }
  if (now - paidAt.getTime() > PAID_AT_MAX_AGE_DAYS * 24 * 60 * 60 * 1000) {
    return `La fecha del pago no puede tener más de ${PAID_AT_MAX_AGE_DAYS} días`;
  }
  return paidAt;
}
