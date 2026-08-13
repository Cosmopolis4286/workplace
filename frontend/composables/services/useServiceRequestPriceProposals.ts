import { ref } from 'vue'
import { useApi } from '../core/useApi'
import { getApiErrorMessage } from '../core/useApiErrors'

export interface ServiceRequestProposalItem {
  id: string
  fields: Record<string, string>
  notes?: string | null
  photos: string[]
  videos: string[]
}

export interface ServiceRequestPriceChangeProposal {
  id: string
  serviceRequestId: string
  status: 'PENDING' | 'APPROVED' | 'APPROVED_PENDING_FUNDS' | 'REJECTED' | 'INVALIDATED'
  previousPrice: number
  proposedPrice: number
  deltaAmount: number
  note?: string | null
  proposedBy: string
  resolvedBy?: string | null
  resolvedAt?: string | null
  rejectionReason?: string | null
  items: ServiceRequestProposalItem[]
  createdAt: string
}

export interface ProposePriceChangePayload {
  proposedPrice: number
  note?: string
  items: { fields?: Record<string, string>; notes?: string; photos?: string[]; videos?: string[] }[]
}

export function useServiceRequestPriceProposals() {
  const { get, post } = useApi()

  const submitting = ref(false)
  const error = ref('')

  async function fetchProposals(serviceRequestId: string) {
    return get<ServiceRequestPriceChangeProposal[]>(`/services/requests/${serviceRequestId}/price-change-proposals`)
  }

  async function propose(serviceRequestId: string, payload: ProposePriceChangePayload) {
    submitting.value = true
    error.value = ''
    try {
      return await post<ServiceRequestPriceChangeProposal>(
        `/services/requests/${serviceRequestId}/price-change-proposals`,
        payload
      )
    } catch (e: any) {
      error.value = getApiErrorMessage(e, 'No se pudo enviar la propuesta')
      throw e
    } finally {
      submitting.value = false
    }
  }

  async function approve(serviceRequestId: string, proposalId: string) {
    submitting.value = true
    error.value = ''
    try {
      return await post<ServiceRequestPriceChangeProposal>(
        `/services/requests/${serviceRequestId}/price-change-proposals/${proposalId}/approve`,
        {}
      )
    } catch (e: any) {
      error.value = getApiErrorMessage(e, 'No se pudo aprobar la propuesta')
      throw e
    } finally {
      submitting.value = false
    }
  }

  async function reject(serviceRequestId: string, proposalId: string, reason?: string) {
    submitting.value = true
    error.value = ''
    try {
      return await post<ServiceRequestPriceChangeProposal>(
        `/services/requests/${serviceRequestId}/price-change-proposals/${proposalId}/reject`,
        { reason }
      )
    } catch (e: any) {
      error.value = getApiErrorMessage(e, 'No se pudo rechazar la propuesta')
      throw e
    } finally {
      submitting.value = false
    }
  }

  return { submitting, error, fetchProposals, propose, approve, reject }
}
