export type FreelancerApplicationStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export interface FreelancerApplication {
  id: string
  userId: string
  categoryId: string
  category?: { id: string; name: string; icon?: string | null }
  subcategoryId: string | null
  subcategory?: { id: string; name: string } | null
  message: string | null
  status: FreelancerApplicationStatus
  rejectionReason: string | null
  reviewedBy: string | null
  reviewedAt: string | null
  createdAt: string
  updatedAt: string
  user?: { id: string; firstName: string; lastName: string; email: string; role: string; kycStatus: string }
}

const mine = ref<FreelancerApplication[]>([])
const loading = ref(false)

export function useFreelancerApplication() {
  async function fetchMine() {
    loading.value = true
    try {
      const { get } = useApi()
      mine.value = await get<FreelancerApplication[]>('/freelancer-applications/mine')
    } finally {
      loading.value = false
    }
  }

  async function create(payload: { categoryId: string; subcategoryId?: string; message?: string }): Promise<FreelancerApplication> {
    const { post } = useApi()
    const result = await post<FreelancerApplication>('/freelancer-applications', payload)
    await fetchMine()
    return result
  }

  // ─── Admin ────────────────────────────────────────────────────────────────────

  async function fetchPending(page = 1, limit = 20) {
    const { get } = useApi()
    return get<{ data: FreelancerApplication[]; total: number; page: number; limit: number }>(
      `/freelancer-applications/admin/pending?page=${page}&limit=${limit}`,
    )
  }

  async function review(id: string, status: 'APPROVED' | 'REJECTED', rejectionReason?: string) {
    const { patch } = useApi()
    return patch<FreelancerApplication>(`/freelancer-applications/admin/${id}/review`, { status, rejectionReason })
  }

  return {
    mine,
    loading,
    fetchMine,
    create,
    fetchPending,
    review,
  }
}
