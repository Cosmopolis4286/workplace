export type KycStatus = 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED'
export type KycDocumentType = 'CEDULA' | 'DNI' | 'PASSPORT' | 'DRIVERS_LICENSE'

export interface IdentityVerification {
  id: string
  userId: string
  documentType: KycDocumentType
  documentNumber: string
  fullName: string
  birthDate: string | null
  frontImageUrl: string
  backImageUrl: string | null
  selfieImageUrl: string
  status: KycStatus
  rejectionReason: string | null
  reviewedBy: string | null
  reviewedAt: string | null
  createdAt: string
  updatedAt: string
  user?: { id: string; firstName: string; lastName: string; email: string; role: string }
}

export interface MyKycStatus {
  kycStatus: KycStatus
  latestSubmission: IdentityVerification | null
}

const myStatus = ref<MyKycStatus | null>(null)
const loading = ref(false)

export function useKyc() {
  const config = useRuntimeConfig()
  const apiUrl = config.public.apiUrl as string
  const { getHeaders } = useAuth()

  async function fetchMyStatus() {
    loading.value = true
    try {
      const { get } = useApi()
      myStatus.value = await get<MyKycStatus>('/kyc/me')
    } finally {
      loading.value = false
    }
  }

  async function submitVerification(payload: {
    documentType: KycDocumentType
    documentNumber: string
    fullName: string
    birthDate?: string
    frontImage: File
    backImage?: File
    selfieImage: File
  }): Promise<IdentityVerification> {
    const form = new FormData()
    form.append('documentType', payload.documentType)
    form.append('documentNumber', payload.documentNumber)
    form.append('fullName', payload.fullName)
    if (payload.birthDate) form.append('birthDate', payload.birthDate)
    form.append('frontImage', payload.frontImage)
    if (payload.backImage) form.append('backImage', payload.backImage)
    form.append('selfieImage', payload.selfieImage)

    const result = await $fetch<IdentityVerification>(`${apiUrl}/kyc/me/submit`, {
      method: 'POST',
      credentials: 'include',
      headers: getHeaders(),
      body: form,
    })
    await fetchMyStatus()
    return result
  }

  // ─── Admin ────────────────────────────────────────────────────────────────────

  async function fetchPending(page = 1, limit = 20) {
    const { get } = useApi()
    return get<{ data: IdentityVerification[]; total: number; page: number; limit: number }>(
      `/kyc/admin/pending?page=${page}&limit=${limit}`,
    )
  }

  async function fetchOne(id: string) {
    const { get } = useApi()
    return get<IdentityVerification>(`/kyc/admin/${id}`)
  }

  async function review(id: string, status: 'APPROVED' | 'REJECTED', rejectionReason?: string) {
    const { patch } = useApi()
    return patch<IdentityVerification>(`/kyc/admin/${id}/review`, { status, rejectionReason })
  }

  return {
    myStatus,
    loading,
    fetchMyStatus,
    submitVerification,
    fetchPending,
    fetchOne,
    review,
  }
}
