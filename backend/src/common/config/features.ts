import { appConfig } from '../../config/app-config';

/**
 * Interruptores de funciones con implicaciones legales o regulatorias.
 * La definición (nombres de variable, valores por defecto) vive en
 * src/config/app-config.ts; esto es un alias para el código existente.
 */
export const features = appConfig.features;

export const PROTECTED_PAYMENTS_DISABLED_MESSAGE =
  'El Pago Protegido no está disponible: paga directo al proveedor';
