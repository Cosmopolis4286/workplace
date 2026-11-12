import { Prisma } from '@prisma/client';

// 1 crédito = 1 USD. Los paquetes se pagan en la moneda de la cuenta de la
// plataforma elegida (VES a tasa BCV vigente, o USD).
export const USAGE_CREDIT_PACKAGES = [
  { code: 'P10', units: 10, priceUsd: 10 },
  { code: 'P20', units: 20, priceUsd: 20 },
  { code: 'P50', units: 50, priceUsd: 50 },
] as const;

export type UsageCreditPackageCode =
  (typeof USAGE_CREDIT_PACKAGES)[number]['code'];

// Bono de bienvenida: solo en la primera compra confirmada, como créditos
// promocionales que vencen.
export const FIRST_PURCHASE_BONUS_RATE = new Prisma.Decimal('0.20');
export const PROMOTIONAL_EXPIRY_DAYS = 90;

// Prevención de legitimación de capitales: tope de compras por mes (USD) y de
// compras simultáneas pendientes de revisión.
export const MONTHLY_PURCHASE_LIMIT_USD = 200;
export const MAX_PENDING_PURCHASES = 2;

/**
 * Cargo por oportunidad aceptada, escalonado según el precio del servicio
 * (USD), para que en pedidos chicos no pese más que la propia comisión.
 * Precio desconocido → tramo mínimo.
 */
export function leadFeeUnits(serviceAmountUsd: Prisma.Decimal | number | null) {
  const amount = new Prisma.Decimal(serviceAmountUsd ?? 0);
  if (amount.lt(10)) return new Prisma.Decimal('0.25');
  if (amount.lte(30)) return new Prisma.Decimal('0.50');
  return new Prisma.Decimal('1.00');
}

/**
 * Versión de la política de cargo por oportunidad que se le muestra al
 * proveedor antes de aceptar. Cambiarla invalida las cotizaciones abiertas:
 * el proveedor tiene que volver a ver y aceptar el cargo vigente.
 */
export const LEAD_FEE_POLICY_VERSION = '2026-11-v1';
