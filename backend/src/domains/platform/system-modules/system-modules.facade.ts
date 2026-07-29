/**
 * Contrato público de SystemModulesService para consumidores de otros
 * dominios (plans en Money, que necesita el kill-switch global para
 * calcular los módulos efectivamente disponibles de un usuario). No expone
 * administración (listAll/toggle), que queda privada al propio módulo
 * platform/system-modules — solo SUPERADMIN/ADMIN administran el
 * kill-switch vía SystemModulesController.
 */
export interface SystemModulesFacade {
  getDisabledModules(): Promise<string[]>;
}

export const SYSTEM_MODULES_FACADE = Symbol('SYSTEM_MODULES_FACADE');
