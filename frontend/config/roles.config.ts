// Fuente única de verdad para labels/colores de roles de usuario.
// Antes duplicado en users.vue, permissions/users.vue y otros.
// COMMERCE/FREELANCER se fusionaron en PROFESIONAL (backend, 2026-08-25) —
// role ya no distingue "tiene Commerce" de "es freelancer/service
// provider". Esa distinción vive en UserProfile.type/subtype
// (useProfileActivations) o AccountTypeResolver, no acá.
export type Role = 'SUPERADMIN' | 'ADMIN' | 'PROFESIONAL' | 'NORMAL'

export const ROLE_LABELS: Record<Role, string> = {
  SUPERADMIN: 'SuperAdmin',
  ADMIN: 'Admin',
  PROFESIONAL: 'Profesional',
  NORMAL: 'Normal',
}

export const ROLE_BADGE_CLASSES: Record<Role, string> = {
  SUPERADMIN: 'bg-purple-100 text-purple-800',
  ADMIN: 'bg-blue-100 text-blue-800',
  PROFESIONAL: 'bg-green-100 text-green-800',
  NORMAL: 'bg-gray-100 text-gray-600',
}

export const ROLE_AVATAR_COLORS: Record<Role, string> = {
  SUPERADMIN: 'bg-purple-600',
  ADMIN: 'bg-blue-600',
  PROFESIONAL: 'bg-green-600',
  NORMAL: 'bg-gray-500',
}

// ─── Tipo de perfil de negocio (Comercio/Freelancer/Prestador de servicio) ────
// Distinción real que Role ya no captura — vive en UserProfile.type/subtype.
// Mismo esquema visual usado en DemoCredentials.vue (cuentas demo).
export type ProfileKindKey = 'BUSINESS' | 'FREELANCER' | 'SERVICE_PROVIDER'

export interface ProfileKind {
  label: string
  badge: string
  dot: string
}

export const PROFILE_KIND_LABELS: Record<ProfileKindKey, ProfileKind> = {
  BUSINESS: { label: 'Comercio', badge: 'bg-orange-100 text-orange-700', dot: 'bg-orange-400' },
  FREELANCER: { label: 'Freelancer', badge: 'bg-teal-100 text-teal-700', dot: 'bg-teal-500' },
  SERVICE_PROVIDER: { label: 'Trabajador autónomo', badge: 'bg-cyan-100 text-cyan-700', dot: 'bg-cyan-500' },
}

// Un usuario PROFESIONAL sin UserProfile ACTIVE (huérfano: rol asignado
// pero sin perfil de negocio) devuelve null — la UI debe permitir
// asignarle uno, no asumir un tipo por defecto.
export function profileKindOf(profile?: { type: string; subtype?: string | null } | null): ProfileKind | null {
  if (!profile) return null
  if (profile.type === 'BUSINESS') return PROFILE_KIND_LABELS.BUSINESS
  if (profile.type === 'PROFESSIONAL' && profile.subtype === 'SERVICE_PROVIDER') return PROFILE_KIND_LABELS.SERVICE_PROVIDER
  if (profile.type === 'PROFESSIONAL') return PROFILE_KIND_LABELS.FREELANCER
  return null
}
