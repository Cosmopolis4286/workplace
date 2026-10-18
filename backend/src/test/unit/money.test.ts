import { Prisma } from '@prisma/client';
import {
  add,
  convert,
  div,
  eq,
  gte,
  isPositive,
  lt,
  mul,
  round,
  roundRate,
  sqlNumeric,
  sub,
  sum,
  toDecimal,
  toNumber,
} from '../../common/money/money';

describe('money', () => {
  it('suma sin error de coma flotante', () => {
    expect(0.1 + 0.2).not.toBe(0.3);
    expect(add(0.1, 0.2).toString()).toBe('0.3');
    expect(eq(add(0.1, 0.2), 0.3)).toBe(true);
  });

  it('suma 1000 montos de 0.1 exactamente', () => {
    const values = Array.from({ length: 1000 }, () => 0.1);
    expect(values.reduce((a, b) => a + b, 0)).not.toBe(100);
    expect(sum(values).toString()).toBe('100');
  });

  it('un saldo que cuadra al centavo pasa la validación saldo >= monto', () => {
    const balance = sub(add(10.1, 20.2), 10.3); // en Float: 19.999999999999996
    expect(10.1 + 20.2 - 10.3 >= 20).toBe(false);
    expect(gte(balance, 20)).toBe(true);
  });

  it('redondea medios hacia arriba (HALF_UP), no al par', () => {
    expect(round('0.125').toString()).toBe('0.13');
    expect(round('0.135').toString()).toBe('0.14');
    expect(round('-0.125').toString()).toBe('-0.13');
    // Float da 1.00 porque 1.005 se guarda como 1.00499999...
    expect((1.005).toFixed(2)).toBe('1.00');
    expect(round('1.005').toString()).toBe('1.01');
  });

  it('redondea tasas a 8 decimales', () => {
    expect(roundRate('36.123456789').toString()).toBe('36.12345679');
  });

  it('convierte montos grandes en Bs con tasa y redondea al centavo', () => {
    // 1.234.567,89 USD × 36,12345678 Bs/USD = 44.596.859,8163907942
    expect(convert('1234567.89', '36.12345678').toString()).toBe('44596859.82');
    expect(toNumber(convert(10, '36.5'))).toBe(365);
  });

  it('acepta number, string y Prisma.Decimal', () => {
    const fromPrisma = new Prisma.Decimal('19.99');
    expect(add(fromPrisma, '0.01', 0).toString()).toBe('20');
    expect(mul(fromPrisma, 3).toString()).toBe('59.97');
    expect(lt(fromPrisma, 20)).toBe(true);
  });

  it('no altera la configuración global de Prisma.Decimal', () => {
    round('1.005');
    expect(Prisma.Decimal.rounding).toBe(Prisma.Decimal.ROUND_HALF_UP);
    expect(Prisma.Decimal.precision).toBe(20);
  });

  it('rechaza división por cero y números no finitos', () => {
    expect(() => div(10, 0)).toThrow(RangeError);
    expect(() => toDecimal(NaN)).toThrow(RangeError);
    expect(() => toDecimal(Infinity)).toThrow(RangeError);
  });

  it('toNumber redondea para la salida', () => {
    expect(toNumber(div(10, 3))).toBe(3.33);
    expect(toNumber(div(10, 3), 4)).toBe(3.3333);
  });
});

describe('isPositive', () => {
  it('trata un Decimal en cero como "sin monto" (un objeto siempre es truthy)', () => {
    const zero = new Prisma.Decimal('0.00');
    expect(Boolean(zero)).toBe(true);
    expect(isPositive(zero)).toBe(false);
    expect(isPositive(null)).toBe(false);
    expect(isPositive(undefined)).toBe(false);
    expect(isPositive(-1)).toBe(false);
    expect(isPositive(new Prisma.Decimal('0.01'))).toBe(true);
  });
});

describe('sqlNumeric', () => {
  it('devuelve el monto exacto como string para consultas raw', () => {
    expect(sqlNumeric(add(0.1, 0.2))).toBe('0.3');
    expect(sqlNumeric(new Prisma.Decimal('12345678901234567.89'))).toBe(
      '12345678901234567.89'
    );
    expect(sqlNumeric(5)).toBe('5');
  });
});

describe('decimal-json', () => {
  it('serializa Decimal como number en JSON (contrato de la API)', () => {
    require('../../common/money/decimal-json');
    const body = {
      balance: new Prisma.Decimal('20.00'),
      amount: add('0.1', '0.2'),
    };
    expect(JSON.stringify(body)).toBe('{"balance":20,"amount":0.3}');
  });
});
