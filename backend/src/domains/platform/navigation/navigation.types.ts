import { Role } from '@prisma/client';

export type NavIconKey =
  | 'dashboard' | 'menu' | 'inventory' | 'services' | 'requests' | 'rides'
  | 'wallet' | 'sales' | 'analytics' | 'reports' | 'ventas_group' | 'ops_group'
  | 'empresa_group' | 'orders' | 'appointments' | 'customers' | 'profile'
  | 'home' | 'delivery' | 'employees' | 'jobs' | 'branches' | 'modules' | 'cash'
  | 'opportunities' | 'ai_assistant'
  // Íconos únicos por concepto (evitan compartir glifo entre conceptos no
  // relacionados — ver auditoría de sidebar que motivó esta separación)
  | 'users_admin' | 'kyc' | 'plan' | 'commissions' | 'categories' | 'pricing'
  | 'search_tabs' | 'permissions' | 'report_issue' | 'locations' | 'audit' | 'logs'
  | 'purchases' | 'suppliers' | 'accounts';

export type BusinessAccountType = 'COMMERCE' | 'FREELANCER';

export interface NavNodeCondition {
  /** Permission key requerida (formato "modulo:accion"); null = sin requisito */
  permission: string | null;
  /** Además de can(permission), exige hasModule(permission.split(':')[0]) */
  requiresModule?: boolean;
  /** RBAC puro (SUPERADMIN/ADMIN/NORMAL) — no usar para COMMERCE/FREELANCER, ver accountTypeOnly */
  rolesOnly?: Role[];
  /** RBAC puro — ver excludeAccountTypes para excluir por tipo de cuenta de negocio */
  excludeRoles?: Role[];
  /** Tipo de cuenta de negocio requerido (COMMERCE/FREELANCER) */
  accountTypeOnly?: BusinessAccountType[];
  /** Tipo(s) de cuenta de negocio excluido(s) */
  excludeAccountTypes?: BusinessAccountType[];
}

export interface NavItemDef {
  id: string;
  to: string;
  label: string;
  icon: NavIconKey;
  condition: NavNodeCondition;
  order: number;
}

export type NavSectionId =
  | 'top' | 'sales' | 'operations' | 'company'
  | 'administration-people' | 'administration-catalog'
  | 'administration-money' | 'administration-system'
  | 'my-account' | 'business';

export interface NavSectionDef {
  id: NavSectionId;
  /** null solo para 'top' (sin header visible en el sidebar) */
  label: string | null;
  order: number;
  /** true = layout plano (top-level), false = grupo con header colapsable */
  flat: boolean;
  items: NavItemDef[];
}

export interface NavItemResponse {
  id: string;
  to: string;
  label: string;
  icon: NavIconKey;
  permission: string | null;
}

export interface NavSectionResponse {
  id: NavSectionId;
  label: string | null;
  flat: boolean;
  items: NavItemResponse[];
}

export interface NavigationResponse {
  sections: NavSectionResponse[];
  routePermissions: Record<string, string | null>;
  routeModules: Record<string, string>;
  generatedAt: string;
}
