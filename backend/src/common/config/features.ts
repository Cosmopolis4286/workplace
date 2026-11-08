/**
 * Interruptores de funciones con implicaciones legales o regulatorias.
 * Todos apagados por defecto: se encienden explícitamente por variable de
 * entorno ('true') una vez validados por asesoría legal/contable.
 *
 * - PROTECTED_PAYMENTS_ENABLED: Pago Protegido (garantía). La plataforma
 *   retiene dinero del comprador hasta liberarlo: es custodia de fondos de
 *   terceros. Apagado, no se crean garantías nuevas; las ya retenidas se
 *   siguen liberando, reembolsando o disputando.
 * - BNPL_ENABLED: financiamiento Cashea/Krece (sin integración real aún).
 * - USAGE_CREDITS_ENABLED: créditos de uso prepagados (pendiente de dictamen).
 */
const on = (name: string) => process.env[name] === 'true';

export const features = {
  protectedPayments: () => on('PROTECTED_PAYMENTS_ENABLED'),
  bnpl: () => on('BNPL_ENABLED'),
  usageCredits: () => on('USAGE_CREDITS_ENABLED'),
};

export const PROTECTED_PAYMENTS_DISABLED_MESSAGE =
  'El Pago Protegido no está disponible: paga directo al proveedor';
