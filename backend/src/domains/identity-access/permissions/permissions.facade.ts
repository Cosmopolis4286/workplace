import { Role } from '@prisma/client';

/**
 * Contrato público de PermissionsService para consumidores de otros
 * dominios (navigation en Platform, que necesita permisos por rol, por
 * perfil activo y overrides individuales para construir el árbol de
 * navegación completo — no hay borde HTTP que se lo resuelva antes vía
 * @RequirePermission(); reports en Platform, que necesita chequear un
 * permiso "a mano" dentro de un endpoint agregador para omitir una sección
 * sin permiso en vez de fallar toda la respuesta).
 * No expone administración (togglePermission/bulkUpdate/listUsers/etc.),
 * que queda privada al propio módulo identity-access/permissions.
 */
export interface PermissionsFacade {
  getRolePermissions(role: Role): Promise<string[]>;
  getUserOverrides(userId: string): Promise<Record<string, boolean>>;
  getActiveProfilePermissions(userId: string): Promise<string[]>;
  hasEffectivePermission(
    userId: string,
    role: Role,
    permissionKey: string
  ): Promise<boolean>;
}

export const PERMISSIONS_FACADE = Symbol('PERMISSIONS_FACADE');
