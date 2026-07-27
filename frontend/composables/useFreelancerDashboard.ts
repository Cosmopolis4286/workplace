import { ref } from 'vue'
import { useApi } from './useApi'

export interface ProviderServiceRequest {
  id: string
  serviceName: string
  clientName: string
  clientAvatar?: string | null
  status: 'PENDIENTE' | 'VISTO' | 'CONTACTADO' | 'CERRADO' | 'CANCELADO'
  price?: number
  priceUnit?: string
  modality?: string
  createdAt: string
}

const myServiceRequests = ref<ProviderServiceRequest[]>([])
const loadingMyServiceRequests = ref(false)

// Solicitudes de servicio recibidas por el freelancer como proveedor (no las
// que él mismo envía como cliente — esas usan useCustomerDashboard con as=client).
export function useFreelancerDashboard() {
  const { get } = useApi()

  async function loadFreelancerData() {
    loadingMyServiceRequests.value = true
    try {
      const res = await get<{ data: ProviderServiceRequest[] }>('/services/requests/mine?as=provider&limit=10')
      myServiceRequests.value = res?.data ?? []
    } catch (e) {
      console.error('Error loading provider service requests:', e)
    } finally {
      loadingMyServiceRequests.value = false
    }
  }

  return {
    myServiceRequests,
    loadingMyServiceRequests,
    loadFreelancerData,
  }
}
