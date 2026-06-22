export type ProposedCategoryTarget = 'PRODUCTO' | 'SERVICIO' | 'EMPLEO'
export type ProposalStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export interface ProposedCategory {
  id: string
  name: string
  description: string | null
  color: string | null
  icon: string | null
  target: ProposedCategoryTarget
  proposedBy: string
  status: ProposalStatus
  rejectionReason: string | null
  reviewedBy: string | null
  reviewedAt: string | null
  resultingCategoryId: string | null
  createdAt: string
  updatedAt: string
  proposer?: { id: string; firstName: string; lastName: string; email: string; role: string }
}

const mine = ref<ProposedCategory[]>([])
const loading = ref(false)

export function useProposedCategories() {
  async function propose(payload: {
    name: string
    description?: string
    color?: string
    icon?: string
    target: ProposedCategoryTarget
  }): Promise<ProposedCategory> {
    const { post } = useApi()
    const result = await post<ProposedCategory>('/proposed-categories', payload)
    await fetchMine()
    return result
  }

  async function fetchMine() {
    loading.value = true
    try {
      const { get } = useApi()
      mine.value = await get<ProposedCategory[]>('/proposed-categories/me')
    } finally {
      loading.value = false
    }
  }

  // ─── Admin ────────────────────────────────────────────────────────────────────

  async function fetchPending(page = 1, limit = 20) {
    const { get } = useApi()
    return get<{ data: ProposedCategory[]; total: number; page: number; limit: number }>(
      `/proposed-categories/admin/pending?page=${page}&limit=${limit}`,
    )
  }

  async function review(id: string, status: 'APPROVED' | 'REJECTED', rejectionReason?: string) {
    const { patch } = useApi()
    return patch<ProposedCategory>(`/proposed-categories/admin/${id}/review`, { status, rejectionReason })
  }

  return {
    mine,
    loading,
    propose,
    fetchMine,
    fetchPending,
    review,
  }
}
