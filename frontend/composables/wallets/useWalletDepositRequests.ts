export type DepositRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export interface WalletDepositRequest {
  id: string
  userId: string
  amount: number
  paymentMethod: string
  reference: string | null
  proofImageUrl: string
  status: DepositRequestStatus
  rejectionReason: string | null
  reviewedBy: string | null
  reviewedAt: string | null
  resultingTransactionId: string | null
  createdAt: string
  updatedAt: string
  user?: { id: string; firstName: string; lastName: string; email: string; role: string }
}

const mine = ref<WalletDepositRequest[]>([])
const loading = ref(false)

export function useWalletDepositRequests() {
  async function fetchMine() {
    loading.value = true
    try {
      const { get } = useApi()
      mine.value = await get<WalletDepositRequest[]>('/wallet-deposit-requests/mine')
    } finally {
      loading.value = false
    }
  }

  async function create(payload: { amount: number; paymentMethod: string; reference?: string; proofImage: File }): Promise<WalletDepositRequest> {
    const form = new FormData()
    form.append('amount', String(payload.amount))
    form.append('paymentMethod', payload.paymentMethod)
    if (payload.reference) form.append('reference', payload.reference)
    form.append('proofImage', payload.proofImage)

    const { post } = useApi()
    const result = await post<WalletDepositRequest>('/wallet-deposit-requests', form)
    await fetchMine()
    return result
  }

  /** El comprobante no es público — hay que pedirlo con el token y convertirlo en blob URL. */
  async function fetchProofImageBlobUrl(id: string): Promise<string> {
    const { get } = useApi()
    const blob = await get<Blob>(`/wallet-deposit-requests/${id}/proof-image`, { parseAs: 'blob' })
    return URL.createObjectURL(blob)
  }

  // ─── Admin ────────────────────────────────────────────────────────────────────

  async function fetchPending(page = 1, limit = 20) {
    const { get } = useApi()
    return get<{ data: WalletDepositRequest[]; total: number; page: number; limit: number }>(
      `/wallet-deposit-requests/admin/pending?page=${page}&limit=${limit}`,
    )
  }

  async function review(id: string, status: 'APPROVED' | 'REJECTED', rejectionReason?: string) {
    const { patch } = useApi()
    return patch<WalletDepositRequest>(`/wallet-deposit-requests/admin/${id}/review`, { status, rejectionReason })
  }

  return {
    mine,
    loading,
    fetchMine,
    create,
    fetchProofImageBlobUrl,
    fetchPending,
    review,
  }
}
