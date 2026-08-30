/**
 * Contrato público de SystemModulesService para consumidores de otros
 * dominios (plans en Money, que necesita el kill-switch global y el subset
 * de módulos de negocio para calcular los módulos efectivamente disponibles
 * de un usuario). No expone administración (toggle/create/update/remove),
 * que queda privada al propio módulo platform/system-modules — solo
 * SUPERADMIN/ADMIN administran el catálogo vía SystemModulesController.
 */
export interface SystemModulesFacade {
  getDisabledModules(): Promise<string[]>;
  listBusinessModules(): Promise<string[]>;
}

export const SYSTEM_MODULES_FACADE = Symbol('SYSTEM_MODULES_FACADE');
