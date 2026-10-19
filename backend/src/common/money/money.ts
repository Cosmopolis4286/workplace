import { Prisma } from '@prisma/client';

/**
 * Aritmética de dinero sin errores de coma flotante (0.1 + 0.2 === 0.3).
 *
 * Usa el Decimal que ya trae Prisma (decimal.js), clonado con redondeo
 * comercial (ROUND_HALF_UP: 0.005 → 0.01) y precisión de sobra para montos
 * grandes en Bs multiplicados por tasas de 8 decimales. El clon no toca la
 * configuración global de Prisma.Decimal.
 *
 * Acepta number | string | Decimal, así que sirve igual antes y después de
 * migrar cada columna de Float a Decimal: se puede adoptar modelo por modelo.
 *
 * Escalas (las mismas que las columnas destino):
 *   - montos:              2 decimales → Decimal @db.Decimal(20, 2)
 *   - tasas / porcentajes: 8 decimales → Decimal @db.Decimal(20, 8)
 */
const D = Prisma.Decimal.clone({
  precision: 40,
  rounding: Prisma.Decimal.ROUND_HALF_UP,
});

export type MoneyInput = number | string | Prisma.Decimal;

export const MONEY_SCALE = 2;
export const RATE_SCALE = 8;

export function toDecimal(value: MoneyInput): Prisma.Decimal {
  if (typeof value === 'number' && !Number.isFinite(value)) {
    throw new RangeError(`Monto inválido: ${value}`);
  }
  return new D(value);
}

/**
 * true si hay un monto > 0. Reemplaza los `if (x.amount)` de cuando era Float:
 * un Decimal en cero es un objeto y por lo tanto truthy.
 */
export function isPositive(
  value: MoneyInput | null | undefined
): value is MoneyInput {
  return value != null && toDecimal(value).gt(0);
}

/**
 * Monto como string para interpolar en $queryRaw/$executeRaw (`${sqlNumeric(x)}::numeric`).
 *
 * Nunca pasar un Decimal directo a una consulta raw: Prisma lo serializa con
 * toJSON(), que decimal-json.ts redefine para devolver number, y el motor
 * rechaza el parámetro. Un string con ::numeric es exacto y siempre funciona.
 */
export function sqlNumeric(value: MoneyInput): string {
  return toDecimal(value).toFixed();
}

/** Redondea a `places` decimales (2 por defecto, HALF_UP). */
export function round(
  value: MoneyInput,
  places: number = MONEY_SCALE
): Prisma.Decimal {
  return toDecimal(value).toDecimalPlaces(places, D.ROUND_HALF_UP);
}

/** Redondea una tasa o porcentaje a 8 decimales. */
export function roundRate(value: MoneyInput): Prisma.Decimal {
  return round(value, RATE_SCALE);
}

export function add(...values: MoneyInput[]): Prisma.Decimal {
  return values.reduce<Prisma.Decimal>(
    (acc, v) => acc.plus(toDecimal(v)),
    new D(0)
  );
}

/** Suma una lista (ej. ítems de un pedido, movimientos de caja). */
export function sum(values: readonly MoneyInput[]): Prisma.Decimal {
  return add(...values);
}

/** Promedio simple. Lanza con lista vacía: el caller decide qué significa "sin datos". */
export function average(values: readonly MoneyInput[]): Prisma.Decimal {
  if (values.length === 0) throw new RangeError('Promedio de lista vacía');
  return sum(values).dividedBy(values.length);
}

/**
 * Variación % de `from` a `to`, redondeada a `places` decimales.
 * null si `from` no es positivo: no hay base contra la cual medir (evita
 * Infinity/NaN cuando la referencia es 0).
 */
export function percentChange(
  from: MoneyInput,
  to: MoneyInput,
  places = 1
): number | null {
  if (!isPositive(from)) return null;
  return toNumber(mul(div(sub(to, from), from), 100), places);
}

export function sub(a: MoneyInput, b: MoneyInput): Prisma.Decimal {
  return toDecimal(a).minus(toDecimal(b));
}

export function mul(a: MoneyInput, b: MoneyInput): Prisma.Decimal {
  return toDecimal(a).times(toDecimal(b));
}

export function div(a: MoneyInput, b: MoneyInput): Prisma.Decimal {
  const divisor = toDecimal(b);
  if (divisor.isZero()) throw new RangeError('División por cero');
  return toDecimal(a).dividedBy(divisor);
}

/** Convierte un monto con una tasa y redondea al centavo. */
export function convert(amount: MoneyInput, rate: MoneyInput): Prisma.Decimal {
  return round(mul(amount, rate));
}

export function eq(a: MoneyInput, b: MoneyInput): boolean {
  return toDecimal(a).equals(toDecimal(b));
}

export function gt(a: MoneyInput, b: MoneyInput): boolean {
  return toDecimal(a).greaterThan(toDecimal(b));
}

export function gte(a: MoneyInput, b: MoneyInput): boolean {
  return toDecimal(a).greaterThanOrEqualTo(toDecimal(b));
}

export function lt(a: MoneyInput, b: MoneyInput): boolean {
  return toDecimal(a).lessThan(toDecimal(b));
}

export function lte(a: MoneyInput, b: MoneyInput): boolean {
  return toDecimal(a).lessThanOrEqualTo(toDecimal(b));
}

/**
 * Pasa a number redondeado (2 decimales por defecto). Solo para la salida
 * (respuestas JSON, columnas que todavía son Float) — nunca para seguir
 * operando con el resultado.
 */
export function toNumber(
  value: MoneyInput,
  places: number = MONEY_SCALE
): number {
  return round(value, places).toNumber();
}
