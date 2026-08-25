import { Role } from '@prisma/client';

// Orden de privilegio: menor numero = mayor privilegio.
export const ROLE_HIERARCHY: Record<Role, number> = {
  [Role.SUPERADMIN]: 0,
  [Role.ADMIN]: 1,
  [Role.PROFESIONAL]: 2,
  [Role.NORMAL]: 3,
};

/**
 * Determina si `callerRole` puede asignar/gestionar `targetRole`.
 * El caller solo puede operar sobre roles con ordinal estrictamente mayor
 * (privilegio estrictamente menor) que el suyo, excepto SUPERADMIN, que
 * puede gestionar cualquier rol (incluido SUPERADMIN).
 */
export function canAssignRole(callerRole: Role, targetRole: Role): boolean {
  if (callerRole === Role.SUPERADMIN) return true;
  return ROLE_HIERARCHY[targetRole] > ROLE_HIERARCHY[callerRole];
}

/**
 * Determina si `callerRole` puede gestionar (ver/editar/eliminar/cambiar
 * estado de) un usuario que actualmente tiene `targetCurrentRole`.
 */
export const canManageUserWithRole = canAssignRole;

/**
 * Roles de negocio/consumidor que un ADMIN puede listar/gestionar — nunca
 * otros SUPERADMIN/ADMIN. SUPERADMIN no tiene esta restricción (ve todos).
 * Usado en listados de usuarios (users.controller.ts, permissions.controller.ts)
 * que antes repetían este mismo array inline en cada endpoint.
 */
export function assignableRolesFor(callerRole: Role): Role[] | undefined {
  return callerRole === Role.SUPERADMIN
    ? undefined
    : [Role.PROFESIONAL, Role.NORMAL];
}
