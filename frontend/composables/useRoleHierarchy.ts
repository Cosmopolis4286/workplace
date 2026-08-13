import type { Role } from '~/config/roles.config'

// Réplica en el cliente de la jerarquía que el backend ya exige
// (PermissionsService.validateUserAccess, UsersController.canAssignRole):
// SUPERADMIN gestiona a cualquiera menos a otro SUPERADMIN; ADMIN gestiona
// solo COMMERCE/FREELANCER/NORMAL, nunca a otro ADMIN ni a SUPERADMIN.
// Sin esto en el frontend, un ADMIN puede abrir acciones de gestión sobre
// otro ADMIN/SUPERADMIN y solo enterarse de que no puede al recibir un 403
// confuso del backend — el backend sigue siendo la fuente de verdad, esto
// es solo para no ofrecer una opción que ya sabemos que será rechazada.
interface HierarchyUser { id: string; role: Role }

export function useRoleHierarchy() {
  const { user: currentUser } = useAuth()

  const isSuperAdmin = computed(() => currentUser.value?.role === 'SUPERADMIN')

  function canManage(target: HierarchyUser): boolean {
    if (target.id === currentUser.value?.id) return false
    if (isSuperAdmin.value) return true
    return !['SUPERADMIN', 'ADMIN'].includes(target.role)
  }

  return { isSuperAdmin, canManage }
}
