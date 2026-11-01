import { useApi } from '../core/useApi'
import type { Delivery, DeliveryCollectionMethod, DeliveryStatus } from './useDelivery'

export interface DriverStatusUpdate {
  status: DeliveryStatus
  deliveryCode?: string
  failureReason?: string
  amountCollected?: number
  collectedMethod?: DeliveryCollectionMethod
}

// Entregas activas asignadas al Driver vinculado al usuario logueado — ver
// TrackingService.findMyActiveDeliveries en el backend. Devuelve [] (no
// error) si el usuario no tiene un perfil de Driver vinculado.
export function useDriverDeliveries() {
  const { get, post } = useApi()

  const deliveries = ref<Delivery[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchMyDeliveries() {
    loading.value = true
    error.value = null
    try {
      deliveries.value = await get<Delivery[]>('/delivery/driver/my-deliveries')
    } catch (e: any) {
      error.value = e?.message ?? 'No se pudieron cargar tus entregas'
    } finally {
      loading.value = false
    }
  }

  // El repartidor avanza su entrega (DeliveryService.driverUpdateStatus).
  async function updateStatus(id: string, payload: DriverStatusUpdate) {
    const updated = await post<Delivery>(`/delivery/driver/${id}/status`, payload)
    const active = ['ASSIGNED', 'PICKING_UP', 'IN_TRANSIT']
    deliveries.value = active.includes(updated.status)
      ? deliveries.value.map(d => (d.id === id ? { ...d, ...updated } : d))
      : deliveries.value.filter(d => d.id !== id)
    return updated
  }

  return {
    deliveries,
    loading,
    error,
    fetchMyDeliveries,
    updateStatus,
  }
}
