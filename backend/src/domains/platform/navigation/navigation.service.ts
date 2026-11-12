import { Inject, Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import {
  PermissionsFacade,
  PERMISSIONS_FACADE,
} from '../../identity-access/permissions/permissions.facade';
import {
  PlanLimitsFacade,
  PLAN_LIMITS_FACADE,
} from '../../money/plans/plan-limits.facade';
import {
  CapabilitiesService,
  Capability,
} from '../../../common/capabilities/capabilities.service';
import {
  EXTRA_PROTECTED_ROUTES,
  NAVIGATION_TREE,
} from './navigation-tree.data';
import { NavItemDef, NavigationResponse } from './navigation.types';
import { features } from '../../../common/config/features';

@Injectable()
export class NavigationService {
  constructor(
    @Inject(PERMISSIONS_FACADE)
    private readonly permissionsService: PermissionsFacade,
    @Inject(PLAN_LIMITS_FACADE)
    private readonly planLimitsService: PlanLimitsFacade,
    private readonly capabilitiesService: CapabilitiesService
  ) {}

  async buildNavigationForUser(user: {
    id: string;
    role: Role;
  }): Promise<NavigationResponse> {
    const { role } = user;
    const isSuperAdmin = role === Role.SUPERADMIN;
    // Cada ítem se evalúa con las MISMAS capas que el controller real, en el
    // mismo orden: rol (RBAC) → permiso efectivo (override → rol base →
    // perfiles ACTIVE, igual que PermissionsService.hasEffectivePermission)
    // → módulo (plan ∩ categoría) → capacidad (¿tiene Commerce?...). Desde
    // que el rol PROFESIONAL concede solo la base común, `can()` ya distingue
    // comercio de profesional y no hacen falta listas de accountType.
    // Capacidades leídas de la DB (no del JWT, que puede tener hasta 15min).
    const [rolePermKeys, profilePermKeys, overrides, limits, capabilities] =
      await Promise.all([
        this.permissionsService.getRolePermissions(role),
        this.permissionsService.getActiveProfilePermissions(user.id),
        this.permissionsService.getUserOverrides(user.id),
        this.planLimitsService.getPlanLimits(user.id),
        this.capabilitiesService.resolve(user.id),
      ]);
    const has = (c: Capability) => capabilities[c];

    const can = (key: string | null): boolean => {
      if (key === null) return true;
      if (isSuperAdmin) return true;
      if (key in overrides) return overrides[key];
      return rolePermKeys.includes(key) || profilePermKeys.includes(key);
    };
    const hasModule = (permissionKey: string): boolean =>
      limits.effectiveModules.includes(permissionKey.split(':')[0]);

    const visible = (item: NavItemDef): boolean => {
      const c = item.condition;
      if (c.requiresFeature && !features[c.requiresFeature]()) return false;
      if (c.rolesOnly && !c.rolesOnly.includes(role)) return false;
      if (c.excludeRoles && c.excludeRoles.includes(role)) return false;
      if (c.requiresCapability && !has(c.requiresCapability)) return false;
      if (c.requiresAnyCapability && !c.requiresAnyCapability.some(has))
        return false;
      if (c.excludeAnyCapability && c.excludeAnyCapability.some(has))
        return false;
      if (!can(c.permission)) return false;
      if (c.requiresModule && c.permission && !hasModule(c.permission))
        return false;
      // El módulo cuenta solo si además el papel puede verlo (`${m}:view`):
      // effectiveModules es plan ∩ categoría y ya no filtra por papel, así
      // que un profesional de "Comida" tiene 'employees' por su categoría
      // aunque su perfil no conceda employees:view — y /jobs ("gestiona
      // personal") no debe aparecerle por eso.
      if (
        c.requiresAnyModule &&
        !c.requiresAnyModule.some(
          (m) => limits.effectiveModules.includes(m) && can(`${m}:view`)
        )
      )
        return false;
      return true;
    };

    const sections = NAVIGATION_TREE.map((section) => ({
      id: section.id,
      label: section.label,
      flat: section.flat,
      order: section.order,
      items: section.items
        .filter(visible)
        .sort((a, b) => a.order - b.order)
        .map((item) => ({
          id: item.id,
          to: item.to,
          label: item.label,
          icon: item.icon,
          permission: item.condition.permission,
        })),
    }))
      .filter((section) => section.items.length > 0)
      .sort((a, b) => a.order - b.order)
      .map(({ order: _order, ...section }) => section);

    const {
      routePermissions,
      routeModules,
      routeCapabilities,
      routeAnyModules,
    } = this.getRouteMaps();

    return {
      sections,
      routePermissions,
      routeModules,
      routeCapabilities,
      routeAnyModules,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Mapa ruta→permiso/módulo, estático (no depende del usuario). Reemplaza
   * PERMISSION_ROUTE_MAP / ROUTE_MODULE_MAP antes hardcoded en los
   * middlewares del frontend. Incluye TODAS las rutas del árbol (no solo las
   * visibles para el usuario actual) porque los middlewares necesitan poder
   * evaluar rutas a las que el usuario no tiene acceso, para redirigir bien.
   */
  getRouteMaps(): {
    routePermissions: Record<string, string | null>;
    routeModules: Record<string, string>;
    routeCapabilities: Record<string, Capability>;
    routeAnyModules: Record<string, string[]>;
  } {
    const routePermissions: Record<string, string | null> = {};
    const routeModules: Record<string, string> = {};
    const routeCapabilities: Record<string, Capability> = {};
    // Ruta → "al menos uno de estos módulos (con su permiso :view)". Sin esto
    // la regla solo existía al armar el sidebar: el acceso rápido y el
    // middleware de rutas dejaban entrar igual (ej. /jobs para un delivery).
    const routeAnyModules: Record<string, string[]> = {};
    const allItems = [
      ...NAVIGATION_TREE.flatMap((section) => section.items),
      ...EXTRA_PROTECTED_ROUTES,
    ];
    for (const item of allItems) {
      routePermissions[item.to] = item.condition.permission;
      if (item.condition.requiresModule && item.condition.permission) {
        routeModules[item.to] = item.condition.permission.split(':')[0];
      }
      if (item.condition.requiresCapability) {
        routeCapabilities[item.to] = item.condition.requiresCapability;
      }
      if (item.condition.requiresAnyModule) {
        routeAnyModules[item.to] = item.condition.requiresAnyModule;
      }
    }
    return {
      routePermissions,
      routeModules,
      routeCapabilities,
      routeAnyModules,
    };
  }
}
