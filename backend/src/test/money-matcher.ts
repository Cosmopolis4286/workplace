import { eq, type MoneyInput } from '../common/money/money';

/**
 * Matcher asimétrico para montos Decimal: `money(200)` acepta 200, '200' o
 * Prisma.Decimal('200.00'). Uso: expect(fn).toHaveBeenCalledWith(money(100)).
 */
export function money(expected: MoneyInput) {
  return {
    asymmetricMatch: (actual: unknown) => {
      try {
        return eq(actual as MoneyInput, expected);
      } catch {
        return false;
      }
    },
    toString: () => `Money(${String(expected)})`,
    toAsymmetricMatcher: () => `Money(${String(expected)})`,
  };
}
