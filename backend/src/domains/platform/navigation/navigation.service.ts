import { Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PermissionsService } from '../../../permissions/permissions.service';
import { PlanLimitsService } from '../../../plans/plan-limits.service';
import { EXTRA_PROTECTED_ROUTES, NAVIGATION_TREE } from './navigation-tree.data';
import { NavItemDef, NavigationResponse } from './navigation.types';

@Injectable()
export class NavigationService {
  constructor(
    private readonly permissionsService: PermissionsService,
    private readonly planLimitsService: PlanLimitsService,
  ) {}

  async buildNavigationForUser(user: { id: string; role: Role }): Promise<NavigationResponse> {
    const { role } = user;
    const isSuperAdmin = role === Role.SUPERADMIN;
    // accountType se deriva de role (mismo valor hoy) sin query extra —
    // navigation es un endpoint de alta frecuencia, no amerita ir a la DB
    // solo para leer lo que el JWT ya trae. Ver AccountTypeResolver para el
    // mismo criterio de fallback usado donde sí hace falta la fuente de verdad.
    const accountType = role === Role.COMMERCE || role === Role.FREELANCER ? role : null;

    const [rolePermKeys, overrides, limits] = await Promise.all([
      this.permissionsService.getRolePermissions(role),
      this.permissionsService.getUserOverrides(user.id),
      this.planLimitsService.getPlanLimits(user.id),
    ]);

    const can = (key: string | null): boolean => {
      if (key === null) return true;
      if (isSuperAdmin) return true;
      if (key in overrides) return overrides[key];
      return rolePermKeys.includes(key);
    };
    const hasModule = (permissionKey: string): boolean =>
      limits.effectiveModules.includes(permissionKey.split(':')[0]);

    const visible = (item: NavItemDef): boolean => {
      const c = item.condition;
      if (c.rolesOnly && !c.rolesOnly.includes(role)) return false;
      if (c.excludeRoles && c.excludeRoles.includes(role)) return false;
      if (c.accountTypeOnly && (!accountType || !c.accountTypeOnly.includes(accountType))) return false;
      if (c.excludeAccountTypes && accountType && c.excludeAccountTypes.includes(accountType)) return false;
      if (c.requiresCategory && limits.categoryName !== c.requiresCategory) return false;
      if (!can(c.permission)) return false;
      if (c.requiresModule && c.permission && !hasModule(c.permission)) return false;
      return true;
    };

    const sections = NAVIGATION_TREE
      .map((section) => ({
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

    const { routePermissions, routeModules } = this.getRouteMaps();

    return {
      sections,
      routePermissions,
      routeModules,
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
  getRouteMaps(): { routePermissions: Record<string, string | null>; routeModules: Record<string, string> } {
    const routePermissions: Record<string, string | null> = {};
    const routeModules: Record<string, string> = {};
    const allItems = [
      ...NAVIGATION_TREE.flatMap((section) => section.items),
      ...EXTRA_PROTECTED_ROUTES,
    ];
    for (const item of allItems) {
      routePermissions[item.to] = item.condition.permission;
      if (item.condition.requiresModule && item.condition.permission) {
        routeModules[item.to] = item.condition.permission.split(':')[0];
      }
    }
    return { routePermissions, routeModules };
  }
}
