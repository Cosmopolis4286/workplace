import { Role } from '@prisma/client';
import type { Capability } from '../../../common/capabilities/capabilities.service';

export type NavIconKey =
  | 'dashboard'
  | 'payments'
  | 'menu'
  | 'inventory'
  | 'services'
  | 'requests'
  | 'rides'
  | 'wallet'
  | 'sales'
  | 'analytics'
  | 'reports'
  | 'ventas_group'
  | 'ops_group'
  | 'empresa_group'
  | 'orders'
  | 'appointments'
  | 'customers'
  | 'profile'
  | 'home'
  | 'delivery'
  | 'employees'
  | 'jobs'
  | 'branches'
  | 'modules'
  | 'cash'
  | 'opportunities'
  | 'ai_assistant'
  // Íconos únicos por concepto (evitan compartir glifo entre conceptos no
  // relacionados — ver auditoría de sidebar que motivó esta separación)
  | 'users_admin'
  | 'kyc'
  | 'plan'
  | 'commissions'
  | 'categories'
  | 'pricing'
  | 'search_tabs'
  | 'permissions'
  | 'report_issue'
  | 'locations'
  | 'audit'
  | 'logs'
  | 'purchases'
  | 'suppliers'
  | 'accounts';

export interface NavNodeCondition {
  /** Permission key requerida (formato "modulo:accion"); null = sin requisito */
  permission: string | null;
  /** Además de can(permission), exige hasModule(permission.split(':')[0]) */
  requiresModule?: boolean;
  /**
   * Exige que al menos uno de estos módulos (nombres, no "modulo:accion")
   * esté en effectiveModules — a diferencia de requiresModule (que mira el
   * módulo del propio `permission` del ítem), esto chequea el módulo de
   * OTRO concepto. Uso: /jobs solo debe verse si el usuario tiene 'employees'
   * habilitado (gestiona personal), no solo por ser FREELANCER/COMMERCE.
   */
  requiresAnyModule?: string[];
  /** RBAC puro (SUPERADMIN/ADMIN/NORMAL) */
  rolesOnly?: Role[];
  /** RBAC puro */
  excludeRoles?: Role[];
  /**
   * Prerrequisito operativo (CapabilitiesService) — mismo que exige el
   * controller real. Reemplaza excludeAccountTypes: ['FREELANCER']: "solo
   * comercio" mezclaba el papel (eso ya lo dice `permission`, desde que los
   * permisos de comercio son exclusivos del perfil BUSINESS) con "tiene
   * Commerce" (esto).
   */
  requiresCapability?: Capability;
  /** Al menos una de estas capacidades (ej. "tiene algún perfil de negocio"). */
  requiresAnyCapability?: Capability[];
  /** Se oculta si tiene cualquiera de estas capacidades. */
  excludeAnyCapability?: Capability[];
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
  | 'top'
  | 'catalog'
  | 'activity'
  | 'sales'
  | 'operations'
  | 'company'
  | 'administration-people'
  | 'administration-catalog'
  | 'administration-money'
  | 'administration-system'
  | 'my-account'
  | 'business';

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
  /** Ruta → capacidad requerida (ej. '/orders' → 'HAS_COMMERCE'), para los middlewares. */
  routeCapabilities: Record<string, Capability>;
  /** Ruta → módulos alternativos (basta uno, con su permiso `:view`), ej. '/jobs' → ['employees']. */
  routeAnyModules: Record<string, string[]>;
  generatedAt: string;
}
