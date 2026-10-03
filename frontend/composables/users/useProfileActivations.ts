export type ProfileActivationType = 'CUSTOMER' | 'PROFESSIONAL' | 'JOB_SEEKER' | 'BUSINESS'
export type ProfessionalSubtype = 'FREELANCER' | 'SERVICE_PROVIDER'
export type ProfileActivationStatus = 'PENDING' | 'ACTIVE' | 'REJECTED' | 'SUSPENDED'

export interface ProfileActivation {
  id: string
  userId: string
  type: ProfileActivationType
  subtype: ProfessionalSubtype | null
  categoryId: string | null
  category?: { id: string; name: string; icon?: string | null }
  subcategoryId: string | null
  subcategory?: { id: string; name: string } | null
  pendingCommerceName: string | null
  pendingPlanId: string | null
  pendingPlan?: { id: string; name: string; price: number; color?: string } | null
  pendingPlanInterval: 'MONTHLY' | 'ANNUAL' | null
  status: ProfileActivationStatus
  // true si el propio usuario se auto-desactivó (puede reactivarse sin
  // aprobación); false/undefined si un admin lo suspendió.
  suspendedBySelf?: boolean
  rejectionReason: string | null
  reviewedBy: string | null
  reviewedAt: string | null
  createdAt: string
  updatedAt: string
  user?: { id: string; firstName: string; lastName: string; email: string; role: string; kycStatus: string }
}

const mine = ref<ProfileActivation[]>([])
const loading = ref(false)

export function useProfileActivations() {
  async function fetchMine() {
    loading.value = true
    try {
      const { get } = useApi()
      mine.value = await get<ProfileActivation[]>('/profile-activations/mine')
    } finally {
      loading.value = false
    }
  }

  async function create(payload: {
    type: ProfileActivationType
    subtype?: ProfessionalSubtype
    categoryId?: string
    subcategoryId?: string
    commerceName?: string
    message?: string
    planId?: string
    planInterval?: 'MONTHLY' | 'ANNUAL'
  }): Promise<ProfileActivation> {
    const { post } = useApi()
    const result = await post<ProfileActivation>('/profile-activations', payload)
    await fetchMine()
    return result
  }

  // ─── Admin ────────────────────────────────────────────────────────────────────

  async function fetchPending(page = 1, limit = 20) {
    const { get } = useApi()
    return get<{ data: ProfileActivation[]; total: number; page: number; limit: number }>(
      `/profile-activations/admin/pending?page=${page}&limit=${limit}`,
    )
  }

  async function review(id: string, status: 'ACTIVE' | 'REJECTED', rejectionReason?: string) {
    const { patch } = useApi()
    return patch<ProfileActivation>(`/profile-activations/admin/${id}/review`, { status, rejectionReason })
  }

  // Contexto de UX activo ("estoy usando WorkPlace como..."). No afecta
  // permisos/capacidades — el perfil debe ya estar ACTIVE. Actualiza el
  // usuario en sesión localmente en vez de refetchear /auth/me completo.
  async function setActiveProfile(profileId: string): Promise<ProfileActivation> {
    const { patch } = useApi()
    const result = await patch<ProfileActivation>('/profile-activations/active', { profileId })
    const { updateLocalUser } = useAuth()
    updateLocalUser({ activeProfileId: result.id })
    // El perfil activo cambia qué categoría/módulos aplican (ver
    // AccountTypeResolver/PlanLimitsService). invalidate() solo pone
    // loaded=false — si el sidebar ya está montado (sin recarga de página),
    // nadie vuelve a llamar loadNavigation()/loadModules() reactivamente, así
    // que se disparan acá explícitamente (son no-op si loaded ya es true, por
    // eso es seguro encadenarlos siempre justo después de invalidar).
    const nav = useNavigation()
    nav.invalidate()
    nav.loadNavigation()
    const mods = useModules()
    mods.invalidate()
    mods.loadModules()
    return result
  }

  // Desactiva un perfil propio ACTIVE (pasa a SUSPENDED, conserva historial).
  // Si era PROFESSIONAL/BUSINESS, el rol se recalcula automáticamente en el
  // backend (RoleResolverService) — puede volver a NORMAL.
  async function deactivate(profileId: string): Promise<ProfileActivation> {
    const { patch } = useApi()
    const result = await patch<ProfileActivation>(`/profile-activations/${profileId}/deactivate`, {})
    await fetchMine()
    const nav = useNavigation()
    nav.invalidate()
    nav.loadNavigation()
    const mods = useModules()
    mods.invalidate()
    mods.loadModules()
    return result
  }

  // Solo funciona si suspendedBySelf es true (validado en el backend) —
  // reactivación directa sin volver a pasar por aprobación admin.
  async function reactivate(profileId: string): Promise<ProfileActivation> {
    const { patch } = useApi()
    const result = await patch<ProfileActivation>(`/profile-activations/${profileId}/reactivate`, {})
    await fetchMine()
    const nav = useNavigation()
    nav.invalidate()
    nav.loadNavigation()
    const mods = useModules()
    mods.invalidate()
    mods.loadModules()
    return result
  }

  return {
    mine,
    loading,
    fetchMine,
    create,
    fetchPending,
    review,
    setActiveProfile,
    deactivate,
    reactivate,
  }
}
