import { Inject, Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PermissionsFacade, PERMISSIONS_FACADE } from '../../identity-access/permissions/permissions.facade';
import { PlanLimitsFacade, PLAN_LIMITS_FACADE } from '../../money/plans/plan-limits.facade';
import { AccountTypeResolver } from '../../../common/account-type/account-type.resolver';
import { EXTRA_PROTECTED_ROUTES, NAVIGATION_TREE } from './navigation-tree.data';
import { NavItemDef, NavigationResponse } from './navigation.types';

@Injectable()
export class NavigationService {
  constructor(
    @Inject(PERMISSIONS_FACADE) private readonly permissionsService: PermissionsFacade,
    @Inject(PLAN_LIMITS_FACADE) private readonly planLimitsService: PlanLimitsFacade,
    private readonly accountTypeResolver: AccountTypeResolver,
  ) {}

  async buildNavigationForUser(user: { id: string; role: Role }): Promise<NavigationResponse> {
    const { role } = user;
    const isSuperAdmin = role === Role.SUPERADMIN;
    // Tipo de cuenta real vía AccountTypeResolver (UserProfile ACTIVE, con
    // fallback a Role) en vez del Role crudo del JWT — Role es un espejo
    // derivado (ver RoleResolverService) que puede quedar desactualizado
    // hasta 15min tras un cambio de perfil reciente. La query extra por
    // request es el trade-off aceptado a cambio de no depender de ese
    // espejo potencialmente obsoleto.
    //
    // can() replica exactamente el orden de PermissionsService.hasEffectiveP
    // ermission (override → permisos de ROL → permisos de los UserProfile
    // ACTIVE del usuario) — antes solo miraba el rol, y como Role.PROFESIONAL
    // es a propósito la unión COMMERCE∪FREELANCER, el árbol dependía de
    // exclusiones manuales (excludeAccountTypes) ítem por ítem para no
    // mostrar de más. Usar la misma fuente que ya autoriza el acceso real
    // evita esa divergencia.
    const [rolePermKeys, profilePermKeys, overrides, limits, accountType] = await Promise.all([
      this.permissionsService.getRolePermissions(role),
      this.permissionsService.getActiveProfilePermissions(user.id),
      this.permissionsService.getUserOverrides(user.id),
      this.planLimitsService.getPlanLimits(user.id),
      this.accountTypeResolver.resolve(user.id),
    ]);

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
      if (c.rolesOnly && !c.rolesOnly.includes(role)) return false;
      if (c.excludeRoles && c.excludeRoles.includes(role)) return false;
      if (c.accountTypeOnly && (!accountType || !c.accountTypeOnly.includes(accountType))) return false;
      if (c.excludeAccountTypes && accountType && c.excludeAccountTypes.includes(accountType)) return false;
      if (!can(c.permission)) return false;
      if (c.requiresModule && c.permission && !hasModule(c.permission)) return false;
      if (c.requiresAnyModule && !c.requiresAnyModule.some((m) => limits.effectiveModules.includes(m))) return false;
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
