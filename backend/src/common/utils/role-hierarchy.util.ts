import { Role } from '@prisma/client';

// Orden de privilegio: menor numero = mayor privilegio.
export const ROLE_HIERARCHY: Record<Role, number> = {
  [Role.SUPERADMIN]: 0,
  [Role.ADMIN]: 1,
  [Role.COMMERCE]: 2,
  [Role.FREELANCER]: 3,
  [Role.NORMAL]: 4,
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
