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

export type EnhancedReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'REVOKED'

export interface EnhancedReviewRequest {
  id: string
  userId: string
  status: EnhancedReviewStatus
  requestReason: string
  decisionReason: string | null
  reviewedAt: string | null
  expiresAt: string | null
  revokedAt: string | null
  revocationReason: string | null
  createdAt: string
  updatedAt: string
  user?: { id: string; firstName: string; lastName: string; email: string; role: string; kycStatus: KycStatus }
}

export interface MyKycStatus {
  kycStatus: KycStatus
  latestSubmission: IdentityVerification | null
  enhancedReview: EnhancedReviewRequest | null
}

const myStatus = ref<MyKycStatus | null>(null)
const loading = ref(false)

export function useKyc() {
  async function fetchMyStatus() {
    loading.value = true
    try {
      const { get } = useApi()
      myStatus.value = await get<MyKycStatus>('/kyc/me')
    } finally {
      loading.value = false
    }
  }

  async function requestEnhancedReview(reason: string) {
    const { post } = useApi()
    const result = await post<EnhancedReviewRequest>('/kyc/me/enhanced-review/request', { reason })
    await fetchMyStatus()
    return result
  }

  async function fetchPendingEnhancedReviews(page = 1, limit = 20) {
    const { get } = useApi()
    return get<{ data: EnhancedReviewRequest[]; total: number; page: number; limit: number }>(
      `/kyc/admin/enhanced-review/pending?page=${page}&limit=${limit}`,
    )
  }

  async function fetchActiveEnhancedReviews(page = 1, limit = 20) {
    const { get } = useApi()
    return get<{ data: EnhancedReviewRequest[]; total: number; page: number; limit: number }>(
      `/kyc/admin/enhanced-review/active?page=${page}&limit=${limit}`,
    )
  }

  async function reviewEnhancedRequest(
    id: string,
    status: 'APPROVED' | 'REJECTED',
    reason: string,
    expiresAt?: string,
  ) {
    const { patch } = useApi()
    return patch<EnhancedReviewRequest>(`/kyc/admin/enhanced-review/${id}/review`, {
      status,
      reason,
      expiresAt,
    })
  }

  async function revokeEnhancedReview(id: string, reason: string) {
    const { patch } = useApi()
    return patch<EnhancedReviewRequest>(`/kyc/admin/enhanced-review/${id}/revoke`, { reason })
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

    const { post } = useApi()
    const result = await post<IdentityVerification>('/kyc/me/submit', form)
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

  /**
   * Las imágenes de KYC no son públicas — hay que pedirlas con el token y
   * convertirlas en un blob URL para poder usarlas en un <img src>.
   */
  async function fetchImageBlobUrl(verificationId: string, field: 'frontImageUrl' | 'backImageUrl' | 'selfieImageUrl'): Promise<string> {
    const { get } = useApi()
    const blob = await get<Blob>(`/kyc/${verificationId}/image/${field}`, { parseAs: 'blob' })
    return URL.createObjectURL(blob)
  }

  return {
    myStatus,
    loading,
    fetchMyStatus,
    submitVerification,
    requestEnhancedReview,
    fetchPendingEnhancedReviews,
    fetchActiveEnhancedReviews,
    reviewEnhancedRequest,
    revokeEnhancedReview,
    fetchPending,
    fetchOne,
    review,
    fetchImageBlobUrl,
  }
}
