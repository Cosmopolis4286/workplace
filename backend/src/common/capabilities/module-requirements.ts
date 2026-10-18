/**
 * Hechos ESTRUCTURALES sobre los módulos de negocio — no política. La
 * política ("qué papel puede qué") vive en la matriz de permisos (DB,
 * editable por admin) y el techo de rubro/plan en effectiveModules. Esto es
 * lo único que tiene que vivir en código porque lo impone el esquema.
 *
 * Reemplaza a MODULE_ACCOUNT_TYPE (require-account-type.decorator.ts), que
 * mezclaba "es de tipo COMMERCE" con "necesita un Commerce" y además listaba
 * claves que ni siquiera existen en system_modules.
 */

/**
 * Módulos cuyos datos tienen FK obligatoria a Commerce (Product, Order,
 * Customer, Delivery, Expense...). ModuleAccessGuard exige HAS_COMMERCE para
 * cualquier @RequireModule(...) de esta lista, y NavigationService los oculta
 * a quien no tiene Commerce.
 */
export const COMMERCE_BOUND_MODULES: readonly string[] = [
  'menu',
  'inventory',
  'orders',
  'customers',
  'delivery',
  'expenses',
];

/**
 * Módulos de venta de producto físico. Si la categoría de un perfil
 * PROFESSIONAL incluye alguno, al aprobarlo se le crea su Commerce
 * (decisión "opción 2", 2026-09-28). A propósito NO incluye customers/
 * expenses/delivery: TODAS las categorías de servicios los traen (y
 * Transporte trae delivery para conductores), así que usarlos como disparador
 * le crearía un Commerce a cualquier diseñador o repartidor. Esos módulos se
 * usan si el Commerce ya existe.
 */
export const PRODUCT_MODULES: readonly string[] = [
  'menu',
  'inventory',
  'orders',
];

export const isCommerceBoundModule = (module: string) =>
  COMMERCE_BOUND_MODULES.includes(module);
export const includesProductModule = (modules: readonly string[]) =>
  modules.some((m) => PRODUCT_MODULES.includes(m));
