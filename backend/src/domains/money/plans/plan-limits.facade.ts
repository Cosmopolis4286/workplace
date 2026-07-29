export interface PlanLimits {
  maxProducts: number;
  maxEmployees: number;
  maxBranches: number;
  maxOrders: number; // per month, -1 = unlimited
  maxStorage: number;
  enabledModules: string[]; // modules included in the plan
  effectiveModules: string[]; // plan ∩ category (what the user actually sees)
  planName: string;
  categoryName: string | null;
}

/**
 * Contrato público de PlanLimitsService para consumidores de otros
 * dominios (orders, menu, employees, branches en Operations/Commerce Core;
 * settings, navigation en Platform). No expone los helpers internos de
 * intersección de módulos (intersectWithCategory/intersectWithRestaurantPreference)
 * ni assertModuleAccess/hasModule, que hoy no tienen consumidores fuera de
 * este módulo — si llegan a necesitarse, se agregan acá explícitamente.
 */
export interface PlanLimitsFacade {
  getPlanLimits(userId: string): Promise<PlanLimits>;
  getSelectableModules(userId: string): Promise<string[]>;
  assertProductLimit(userId: string, commerceId: string): Promise<void>;
  assertEmployeeLimit(userId: string, commerceId: string): Promise<void>;
  assertBranchLimit(userId: string, commerceId: string): Promise<void>;
  assertOrderLimit(userId: string, commerceId: string): Promise<void>;
  getUsage(
    userId: string,
    commerceId: string
  ): Promise<{ limits: PlanLimits; usage: { products: number; employees: number; branches: number; ordersThisMonth: number } }>;
}

export const PLAN_LIMITS_FACADE = Symbol('PLAN_LIMITS_FACADE');
