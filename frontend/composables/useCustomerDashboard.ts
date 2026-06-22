import { ref } from 'vue'
import { useAuth } from './useAuth'
import type { Order } from './useClienteDashboard'

export interface MyServiceRequest {
  id: string
  serviceName: string
  providerName: string
  status: 'PENDIENTE' | 'VISTO' | 'CONTACTADO' | 'CERRADO'
  price?: number
  priceUnit?: string
  modality?: string
  createdAt: string
}

const myOrders = ref<Order[]>([])
const myServiceRequests = ref<MyServiceRequest[]>([])
const loadingMyOrders = ref(false)
const loadingMyServiceRequests = ref(false)

// Datos del propio usuario NORMAL (no del comercio): pedidos hechos y
// solicitudes de servicio enviadas como cliente.
export function useCustomerDashboard() {
  const { getHeaders } = useAuth()
  const config = useRuntimeConfig()
  const apiUrl = config.public.apiUrl as string

  async function loadCustomerData() {
    loadingMyOrders.value = true
    loadingMyServiceRequests.value = true

    const [ordersRes, requestsRes] = await Promise.allSettled([
      $fetch<{ data: Order[] }>(`${apiUrl}/orders/mine`, { headers: getHeaders() }),
      $fetch<{ data: MyServiceRequest[] }>(`${apiUrl}/services/requests/mine?as=client`, { headers: getHeaders() }),
    ])

    if (ordersRes.status === 'fulfilled') {
      myOrders.value = ordersRes.value?.data ?? []
    } else {
      console.error('Error loading my orders:', ordersRes.reason)
    }
    loadingMyOrders.value = false

    if (requestsRes.status === 'fulfilled') {
      myServiceRequests.value = requestsRes.value?.data ?? []
    } else {
      console.error('Error loading service requests:', requestsRes.reason)
    }
    loadingMyServiceRequests.value = false
  }

  return {
    myOrders,
    myServiceRequests,
    loadingMyOrders,
    loadingMyServiceRequests,
    loadCustomerData,
  }
}
