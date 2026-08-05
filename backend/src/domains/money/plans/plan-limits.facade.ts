export interface PlanLimits {
  maxProducts: number;
  maxEmployees: number;
  maxBranches: number;
  maxOrders: number; // per month, -1 = unlimited
  maxStorage: number;
  maxServices: number; // active services at once (freelancer), -1 = unlimited
  maxServiceRequests: number; // received per month (freelancer), -1 = unlimited
  maxJobs: number; // active jobs published at once, -1 = unlimited
  enabledModules: string[]; // modules included in the plan
  effectiveModules: string[]; // plan ∩ category (what the user actually sees)
  planName: string;
  categoryName: string | null;
}

/**
 * Contrato público de PlanLimitsService para consumidores de otros
 * dominios (orders, menu, employees, branches en Operations/Commerce Core;
 * settings, navigation en Platform). No expone los helpers internos de
 * intersección de módulos (intersectWithCategory/intersectWithCommercePreference)
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
  assertServiceLimit(userId: string): Promise<void>;
  assertServiceRequestLimit(providerId: string): Promise<void>;
  assertJobLimit(userId: string): Promise<void>;
  getUsage(
    userId: string,
    commerceId: string
  ): Promise<{ limits: PlanLimits; usage: { products: number; employees: number; branches: number; ordersThisMonth: number } }>;
}

export const PLAN_LIMITS_FACADE = Symbol('PLAN_LIMITS_FACADE');
