import { SetMetadata } from '@nestjs/common';

export const ACCOUNT_TYPE_KEY = 'required_account_type';

// Fuente única: todo módulo de negocio (el mismo nombre usado en
// SystemModule.name / plan.enabledModules / userCategory.allowedModules)
// que esté 100% gateado a un accountType a nivel de CLASE de controller.
// PlanLimitsService.intersectWithCategory() lee este registro para que
// effectiveModules (sidebar/dashboard) nunca prometa un módulo que
// AccountTypeGuard va a rechazar con 403 al primer request real.
//
// Solo módulos donde @RequireAccountType(...) decora la CLASE entera del
// controller pertenecen acá — un @RequireAccountType en un método suelto
// (ej. catalog.controller.ts) protege una acción puntual dentro de un
// módulo que sigue siendo usable en general, no el módulo completo, así que
// no aplica un veto de sidebar.
//
// menu/orders/customers/delivery/expenses NO están acá a propósito, aunque
// también tuvieron @RequireAccountType('COMMERCE') hasta hace poco: su eje
// real de acceso es la categoría de negocio (¿vende producto físico?), no si
// el usuario tiene un Commerce formal — hay COMMERCE de categoría
// "Tecnología" que no deben verlos, y FREELANCER de categoría "Comida" que
// sí. Los 5 controllers ahora usan @RequireModule(...) + ModuleAccessGuard,
// que valida contra effectiveModules (plan ∩ categoría, ya correcto por
// categoría) en vez de accountType — ver require-module.decorator.ts. Todos
// comparten el mismo indicio técnico: su *.service.ts resuelve commerceId
// vía CommerceResolverService.resolve()/resolveOrCreate() (fallback a
// userId, o auto-crea un Commerce), nunca asume que ya existe uno.
//
// Al agregar @RequireAccountType(...) a nivel de CLASE en un controller
// nuevo, sumar su módulo acá en el mismo commit — si no, el sidebar seguirá
// mostrándolo como disponible aunque el backend lo rechace. Si el módulo en
// cambio depende de categoría (como los 4 de arriba), no va acá: usar
// @RequireModule(...) en el controller en su lugar.
export const MODULE_ACCOUNT_TYPE: Record<string, 'COMMERCE' | 'FREELANCER'> = {
  branches: 'COMMERCE',
  employees: 'COMMERCE',
  group_buying: 'COMMERCE',
  accounts: 'COMMERCE',
  bnpl: 'COMMERCE',
  purchasing_power: 'COMMERCE',
  alert_engine: 'COMMERCE',
  appointments: 'COMMERCE',
  cash: 'COMMERCE',
  price_guard: 'COMMERCE',
  purchases: 'COMMERCE',
  receipts: 'COMMERCE',
  suppliers: 'COMMERCE',
};

/**
 * Marca un endpoint como exclusivo de un tipo de cuenta de negocio
 * (COMMERCE/FREELANCER). Reemplaza los `if (role === 'FREELANCER') throw...`
 * que antes vivían duplicados dentro de cada service (ver menu.service.ts,
 * settings.service.ts). RBAC ya suele negar el acceso vía @RequirePermission,
 * esto es defensa en profundidad para el caso de un UserPermission
 * individual que lo sobreescriba.
 * Usage: @RequireAccountType('COMMERCE')
 */
export const RequireAccountType = (accountType: 'COMMERCE' | 'FREELANCER') =>
  SetMetadata(ACCOUNT_TYPE_KEY, accountType);
