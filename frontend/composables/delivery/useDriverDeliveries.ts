import { useApi } from '../core/useApi'
import type { Delivery } from './useDelivery'

// Entregas activas asignadas al Driver vinculado al usuario logueado — ver
// TrackingService.findMyActiveDeliveries en el backend. Devuelve [] (no
// error) si el usuario no tiene un perfil de Driver vinculado.
export function useDriverDeliveries() {
  const { get } = useApi()

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

  return {
    deliveries,
    loading,
    error,
    fetchMyDeliveries,
  }
}
