import { Prisma } from '@prisma/client';

/**
 * Los montos migrados a Decimal se siguen enviando como number en el JSON.
 *
 * decimal.js serializa como string ("20"), lo que rompería al frontend (que
 * hace toFixed, sumas, comparaciones sobre number) y a quien lea respuestas
 * cacheadas en Redis. La exactitud importa al operar y guardar — eso ocurre en
 * el backend con Decimal (common/money/money.ts) —; para mostrar, un number
 * con 2 decimales basta. Todos los Decimal (los de Prisma y el clon de
 * money.ts) comparten este prototipo.
 *
 * Se importa una vez al arrancar (main.ts), antes de servir requests.
 */
Prisma.Decimal.prototype.toJSON = function toJSON(this: Prisma.Decimal) {
  return this.toNumber();
} as unknown as () => string;
