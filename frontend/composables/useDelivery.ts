import { ref, computed } from 'vue'
import { useAuth } from './useAuth'

// ─── Types ────────────────────────────────────────────────────────────────────

export type DeliveryStatus =
  | 'PENDIENTE'
  | 'ASIGNADO'
  | 'RECOGIENDO'
  | 'EN_CAMINO'
  | 'ENTREGADO'
  | 'CANCELADO'
  | 'FALLIDO'

export type DriverStatus = 'DISPONIBLE' | 'EN_ENTREGA' | 'DESCANSO' | 'INACTIVO'

export type VehicleType =
  | 'MOTO'
  | 'BICICLETA'
  | 'BICICLETA_ELECTRICA'
  | 'CARRO'
  | 'SCOOTER'
  | 'A_PIE'

export interface Driver {
  id: string
  name: string
  phone?: string
  vehicleType: VehicleType
  vehiclePlate?: string
  vehicleModel?: string
  status: DriverStatus
  isActive: boolean
  rating: number
  totalDeliveries: number
  restaurantId: string
  createdAt: string
  updatedAt: string
  _count?: { deliveries: number }
}

export interface DeliveryDriver {
  id: string
  name: string
  vehicleType: VehicleType
  vehicleModel?: string
  phone?: string
  status: DriverStatus
}

export interface Delivery {
  id: string
  orderNumber: string
  customerName: string
  customerPhone?: string
  deliveryAddress: string
  notes?: string
  total: number
  deliveryFee: number
  status: DeliveryStatus
  estimatedTime?: number
  pickedUpAt?: string
  deliveredAt?: string
  driverId?: string
  driver?: DeliveryDriver
  restaurantId: string
  createdAt: string
  updatedAt: string
}

export interface DeliveryStats {
  activeDeliveries: number
  todayDeliveries: number
  totalDrivers: number
  onlineDrivers: number
  deliveredToday: number
  pendingDeliveries: number
  cancelledToday: number
  avgDeliveryTime: number
}

export interface DeliveryPage {
  items: Delivery[]
  total: number
  page: number
  limit: number
}

export interface DeliveryFilters {
  status?: DeliveryStatus
  driverId?: string
  dateFrom?: string
  dateTo?: string
  page?: number
  limit?: number
}

export interface CreateDriverPayload {
  name: string
  phone?: string
  vehicleType?: VehicleType
  vehiclePlate?: string
  vehicleModel?: string
  status?: DriverStatus
}

export interface CreateDeliveryPayload {
  orderNumber: string
  customerName: string
  customerPhone?: string
  deliveryAddress: string
  notes?: string
  total: number
  deliveryFee?: number
  estimatedTime?: number
  driverId?: string
  status?: DeliveryStatus
}

// ─── Status metadata ──────────────────────────────────────────────────────────

export const DELIVERY_STATUS_LABELS: Record<DeliveryStatus, string> = {
  PENDIENTE: 'Pendiente',
  ASIGNADO: 'Asignado',
  RECOGIENDO: 'Recogiendo',
  EN_CAMINO: 'En camino',
  ENTREGADO: 'Entregado',
  CANCELADO: 'Cancelado',
  FALLIDO: 'Fallido',
}

export const DELIVERY_STATUS_CLASSES: Record<DeliveryStatus, string> = {
  PENDIENTE: 'bg-yellow-100 text-yellow-800',
  ASIGNADO: 'bg-purple-100 text-purple-800',
  RECOGIENDO: 'bg-orange-100 text-orange-800',
  EN_CAMINO: 'bg-blue-100 text-blue-800',
  ENTREGADO: 'bg-green-100 text-green-800',
  CANCELADO: 'bg-red-100 text-red-800',
  FALLIDO: 'bg-gray-100 text-gray-700',
}

export const DRIVER_STATUS_LABELS: Record<DriverStatus, string> = {
  DISPONIBLE: 'Disponible',
  EN_ENTREGA: 'En entrega',
  DESCANSO: 'Descanso',
  INACTIVO: 'Inactivo',
}

export const DRIVER_STATUS_CLASSES: Record<DriverStatus, string> = {
  DISPONIBLE: 'bg-green-100 text-green-800',
  EN_ENTREGA: 'bg-blue-100 text-blue-800',
  DESCANSO: 'bg-yellow-100 text-yellow-800',
  INACTIVO: 'bg-gray-100 text-gray-700',
}

export const VEHICLE_LABELS: Record<VehicleType, string> = {
  MOTO: 'Moto',
  BICICLETA: 'Bicicleta',
  BICICLETA_ELECTRICA: 'Bicicleta Eléctrica',
  CARRO: 'Carro',
  SCOOTER: 'Scooter',
  A_PIE: 'A pie',
}

// ─── Global reactive state ────────────────────────────────────────────────────

const deliveries = ref<Delivery[]>([])
const drivers = ref<Driver[]>([])
const stats = ref<DeliveryStats>({
  activeDeliveries: 0,
  todayDeliveries: 0,
  totalDrivers: 0,
  onlineDrivers: 0,
  deliveredToday: 0,
  pendingDeliveries: 0,
  cancelledToday: 0,
  avgDeliveryTime: 0,
})
const loading = ref(false)
const loadingDrivers = ref(false)
const error = ref<string | null>(null)
const totalCount = ref(0)

// ─── Composable ───────────────────────────────────────────────────────────────

export const useDelivery = () => {
  const { getHeaders, refreshAccessToken } = useAuth()
  const config = useRuntimeConfig()
  const apiUrl = config.public.apiUrl as string
  const router = useRouter()

  // ─── Computed ──────────────────────────────────────────────────────────────

  const activeDeliveries = computed(() =>
    deliveries.value.filter((d) =>
      ['ASIGNADO', 'RECOGIENDO', 'EN_CAMINO'].includes(d.status),
    ),
  )

  const availableDrivers = computed(() =>
    drivers.value.filter((d) => d.status === 'DISPONIBLE'),
  )

  // ─── API helper ────────────────────────────────────────────────────────────

  function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers = {
      'Content-Type': 'application/json',
      ...getHeaders(),
      ...(options.headers as Record<string, string> || {}),
    }
    return $fetch<T>(`${apiUrl}/api/delivery${path}`, { ...options, headers } as Parameters<typeof $fetch>[1])
  }

  async function withAuthRetry<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn()
    } catch (err: unknown) {
      const status = (err as { status?: number; statusCode?: number })?.status
        ?? (err as { status?: number; statusCode?: number })?.statusCode
      if (status === 401) {
        const refreshed = await refreshAccessToken()
        if (!refreshed) {
          router.push('/login')
          throw err
        }
        return await fn()
      }
      throw err
    }
  }

  function extractMessage(err: unknown, fallback: string): string {
    return (err as { data?: { message?: string } })?.data?.message ?? fallback
  }

  // ─── Load stats ────────────────────────────────────────────────────────────

  async function loadStats() {
    try {
      stats.value = await withAuthRetry(() => apiFetch<DeliveryStats>('/stats'))
    } catch (err) {
      error.value = extractMessage(err, 'Error al cargar estadísticas')
    }
  }

  // ─── Load deliveries ───────────────────────────────────────────────────────

  async function loadDeliveries(filters: DeliveryFilters = {}) {
    loading.value = true
    error.value = null
    try {
      const params = new URLSearchParams()
      if (filters.status) params.set('status', filters.status)
      if (filters.driverId) params.set('driverId', filters.driverId)
      if (filters.dateFrom) params.set('dateFrom', filters.dateFrom)
      if (filters.dateTo) params.set('dateTo', filters.dateTo)
      if (filters.page) params.set('page', String(filters.page))
      if (filters.limit) params.set('limit', String(filters.limit))

      const query = params.toString() ? `?${params.toString()}` : ''
      const [page, statsData] = await withAuthRetry(() =>
        Promise.all([
          apiFetch<DeliveryPage>(query),
          apiFetch<DeliveryStats>('/stats'),
        ]),
      )
      deliveries.value = page.items
      totalCount.value = page.total
      stats.value = statsData
    } catch (err) {
      error.value = extractMessage(err, 'Error al cargar las entregas')
    } finally {
      loading.value = false
    }
  }

  // ─── Load drivers ──────────────────────────────────────────────────────────

  async function loadDrivers() {
    loadingDrivers.value = true
    try {
      drivers.value = await withAuthRetry(() => apiFetch<Driver[]>('/drivers'))
    } catch (err) {
      error.value = extractMessage(err, 'Error al cargar los repartidores')
    } finally {
      loadingDrivers.value = false
    }
  }

  // ─── Delivery CRUD ─────────────────────────────────────────────────────────

  async function createDelivery(payload: CreateDeliveryPayload): Promise<Delivery | null> {
    try {
      const item = await withAuthRetry(() =>
        apiFetch<Delivery>('', { method: 'POST', body: JSON.stringify(payload) }),
      )
      deliveries.value.unshift(item)
      totalCount.value++
      await loadStats()
      return item
    } catch (err) {
      error.value = extractMessage(err, 'Error al crear la entrega')
      return null
    }
  }

  async function updateDelivery(id: string, payload: Partial<CreateDeliveryPayload>): Promise<Delivery | null> {
    try {
      const item = await withAuthRetry(() =>
        apiFetch<Delivery>(`/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
      )
      const idx = deliveries.value.findIndex((d) => d.id === id)
      if (idx !== -1) deliveries.value[idx] = item
      return item
    } catch (err) {
      error.value = extractMessage(err, 'Error al actualizar la entrega')
      return null
    }
  }

  async function deleteDelivery(id: string): Promise<boolean> {
    try {
      await withAuthRetry(() => apiFetch(`/${id}`, { method: 'DELETE' }))
      deliveries.value = deliveries.value.filter((d) => d.id !== id)
      totalCount.value = Math.max(0, totalCount.value - 1)
      await loadStats()
      return true
    } catch (err) {
      error.value = extractMessage(err, 'Error al eliminar la entrega')
      return false
    }
  }

  async function updateDeliveryStatus(id: string, status: DeliveryStatus): Promise<Delivery | null> {
    try {
      const item = await withAuthRetry(() =>
        apiFetch<Delivery>(`/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
      )
      const idx = deliveries.value.findIndex((d) => d.id === id)
      if (idx !== -1) deliveries.value[idx] = item
      // Refresh stats and drivers to reflect status changes
      await Promise.all([loadStats(), loadDrivers()])
      return item
    } catch (err) {
      error.value = extractMessage(err, 'Error al cambiar el estado de la entrega')
      return null
    }
  }

  async function assignDriver(deliveryId: string, driverId: string): Promise<Delivery | null> {
    try {
      const item = await withAuthRetry(() =>
        apiFetch<Delivery>(`/${deliveryId}/assign`, { method: 'PATCH', body: JSON.stringify({ driverId }) }),
      )
      const idx = deliveries.value.findIndex((d) => d.id === deliveryId)
      if (idx !== -1) deliveries.value[idx] = item
      await Promise.all([loadStats(), loadDrivers()])
      return item
    } catch (err) {
      error.value = extractMessage(err, 'Error al asignar repartidor')
      return null
    }
  }

  // ─── Driver CRUD ───────────────────────────────────────────────────────────

  async function createDriver(payload: CreateDriverPayload): Promise<Driver | null> {
    try {
      const driver = await withAuthRetry(() =>
        apiFetch<Driver>('/drivers', { method: 'POST', body: JSON.stringify(payload) }),
      )
      drivers.value.push(driver)
      await loadStats()
      return driver
    } catch (err) {
      error.value = extractMessage(err, 'Error al crear el repartidor')
      return null
    }
  }

  async function updateDriver(id: string, payload: Partial<CreateDriverPayload & { isActive?: boolean }>): Promise<Driver | null> {
    try {
      const driver = await withAuthRetry(() =>
        apiFetch<Driver>(`/drivers/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
      )
      const idx = drivers.value.findIndex((d) => d.id === id)
      if (idx !== -1) drivers.value[idx] = driver
      return driver
    } catch (err) {
      error.value = extractMessage(err, 'Error al actualizar el repartidor')
      return null
    }
  }

  async function deleteDriver(id: string): Promise<boolean> {
    try {
      await withAuthRetry(() => apiFetch(`/drivers/${id}`, { method: 'DELETE' }))
      drivers.value = drivers.value.filter((d) => d.id !== id)
      await loadStats()
      return true
    } catch (err) {
      error.value = extractMessage(err, 'Error al eliminar el repartidor')
      return false
    }
  }

  async function updateDriverStatus(id: string, status: DriverStatus): Promise<Driver | null> {
    try {
      const driver = await withAuthRetry(() =>
        apiFetch<Driver>(`/drivers/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
      )
      const idx = drivers.value.findIndex((d) => d.id === id)
      if (idx !== -1) drivers.value[idx] = driver
      await loadStats()
      return driver
    } catch (err) {
      error.value = extractMessage(err, 'Error al cambiar el estado del repartidor')
      return null
    }
  }

  return {
    // state
    deliveries,
    drivers,
    stats,
    loading,
    loadingDrivers,
    error,
    totalCount,
    // computed
    activeDeliveries,
    availableDrivers,
    // actions
    loadDeliveries,
    loadDrivers,
    loadStats,
    createDelivery,
    updateDelivery,
    deleteDelivery,
    updateDeliveryStatus,
    assignDriver,
    createDriver,
    updateDriver,
    deleteDriver,
    updateDriverStatus,
  }
}
