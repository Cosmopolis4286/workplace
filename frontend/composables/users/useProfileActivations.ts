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
  status: ProfileActivationStatus
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
    message?: string
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
  }
}
