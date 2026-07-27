// Fuente única de verdad para labels/colores de roles de usuario.
// Antes duplicado en users.vue, permissions/users.vue y otros.
export type Role = 'SUPERADMIN' | 'ADMIN' | 'COMMERCE' | 'FREELANCER' | 'NORMAL'

export const ROLE_LABELS: Record<Role, string> = {
  SUPERADMIN: 'SuperAdmin',
  ADMIN: 'Admin',
  COMMERCE: 'Comercio',
  FREELANCER: 'Freelancer',
  NORMAL: 'Normal',
}

export const ROLE_BADGE_CLASSES: Record<Role, string> = {
  SUPERADMIN: 'bg-purple-100 text-purple-800',
  ADMIN: 'bg-blue-100 text-blue-800',
  COMMERCE: 'bg-green-100 text-green-800',
  FREELANCER: 'bg-yellow-100 text-yellow-800',
  NORMAL: 'bg-gray-100 text-gray-600',
}

export const ROLE_AVATAR_COLORS: Record<Role, string> = {
  SUPERADMIN: 'bg-purple-600',
  ADMIN: 'bg-blue-600',
  COMMERCE: 'bg-green-600',
  FREELANCER: 'bg-yellow-500',
  NORMAL: 'bg-gray-500',
}
