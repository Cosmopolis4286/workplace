import { computed } from 'vue'
import { useAuth } from '../auth/useAuth'
import type { ProfileActivation, ProfileActivationType, ProfessionalSubtype } from './useProfileActivations'

// Orden de prioridad para inferir el perfil activo por defecto cuando el
// usuario no eligió uno explícitamente — mismo orden que AccountTypeResolver
// usa en el backend para colapsar accountType (BUSINESS gana sobre
// PROFESSIONAL). Puramente de UX: no determina permisos ni capacidades, esos
// siguen siendo la unión de TODOS los perfiles ACTIVE.
const DEFAULT_PROFILE_PRIORITY: ProfileActivationType[] = ['BUSINESS', 'PROFESSIONAL', 'JOB_SEEKER', 'CUSTOMER']

/**
 * Helpers de solo lectura sobre `useAuth().user.profiles` (ver
 * IDENTITY_ARCHITECTURE_PLAN.md, paso 6). No reemplaza los checks existentes
 * de `role`/`accountType` — es aditivo, para gating nuevo que necesite la
 * granularidad de UserProfile (ej. distinguir FREELANCER de SERVICE_PROVIDER,
 * o detectar perfiles CUSTOMER/JOB_SEEKER que accountType nunca expone).
 *
 * `profiles` solo viene poblado tras GET /auth/me (igual que accountType) —
 * en login/register puede venir undefined, por eso todos los helpers
 * devuelven `false`/`null` en vez de lanzar cuando la lista no está.
 */
export const useProfileContext = () => {
  const { user } = useAuth()

  const profiles = computed<ProfileActivation[]>(() => user.value?.profiles ?? [])

  function hasProfile(type: ProfileActivationType): boolean {
    return profiles.value.some((p) => p.type === type)
  }

  function hasProfessionalType(subtype: ProfessionalSubtype): boolean {
    return profiles.value.some((p) => p.type === 'PROFESSIONAL' && p.subtype === subtype)
  }

  function getProfile(type: ProfileActivationType): ProfileActivation | null {
    return profiles.value.find((p) => p.type === type) ?? null
  }

  // Perfil por defecto para UX (qué dashboard/vista mostrar) cuando el
  // usuario no fijó uno explícito — ver User.activeProfileId en el backend
  // (todavía sin selector de UI que lo escriba).
  const defaultProfile = computed<ProfileActivation | null>(() => {
    for (const type of DEFAULT_PROFILE_PRIORITY) {
      const match = profiles.value.find((p) => p.type === type)
      if (match) return match
    }
    return null
  })

  const hasMultipleProfiles = computed(() => profiles.value.length > 1)

  return {
    profiles,
    hasProfile,
    hasProfessionalType,
    getProfile,
    defaultProfile,
    hasMultipleProfiles,
  }
}
