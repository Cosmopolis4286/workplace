import { ref, computed } from 'vue'
import { useApi } from './useApi'

// ─── Types ────────────────────────────────────────────────────────────────────

export type DeliveryStatus =
  | 'PENDING'
  | 'ASSIGNED'
  | 'PICKING_UP'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'FAILED'

export type DriverStatus = 'AVAILABLE' | 'ON_DELIVERY' | 'ON_BREAK' | 'INACTIVE'

export type VehicleType =
  | 'MOTORCYCLE'
  | 'BICYCLE'
  | 'ELECTRIC_BICYCLE'
  | 'CAR'
  | 'SCOOTER'
  | 'ON_FOOT'

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
  commerceId: string
  userId?: string | null
  graceUntil?: string | null
  // true si puede recibir nuevas asignaciones: tiene cuenta con KYC aprobado,
  // o sigue dentro de su periodo de gracia como driver legado sin cuenta.
  isAssignable?: boolean
  createdAt: string
  updatedAt: string
  _count?: { deliveries: number }
}

export type DriverInvitationStatus = 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'CANCELLED'

export interface DriverInvitation {
  id: string
  token: string
  commerceId: string
  email: string
  phone?: string
  name?: string
  status: DriverInvitationStatus
  driverId?: string | null
  expiresAt: string
  acceptedAt?: string | null
  createdAt: string
}

export interface InviteDriverPayload {
  email: string
  phone?: string
  name?: string
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
  commerceId: string
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
  PENDING: 'Pendiente',
  ASSIGNED: 'Asignado',
  PICKING_UP: 'Recogiendo',
  IN_TRANSIT: 'En camino',
  DELIVERED: 'Entregado',
  CANCELLED: 'Cancelado',
  FAILED: 'Fallido',
}

export const DELIVERY_STATUS_CLASSES: Record<DeliveryStatus, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  ASSIGNED: 'bg-purple-100 text-purple-800',
  PICKING_UP: 'bg-orange-100 text-orange-800',
  IN_TRANSIT: 'bg-blue-100 text-blue-800',
  DELIVERED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
  FAILED: 'bg-gray-100 text-gray-700',
}

export const DRIVER_STATUS_LABELS: Record<DriverStatus, string> = {
  AVAILABLE: 'Disponible',
  ON_DELIVERY: 'En entrega',
  ON_BREAK: 'Descanso',
  INACTIVE: 'Inactivo',
}

export const DRIVER_STATUS_CLASSES: Record<DriverStatus, string> = {
  AVAILABLE: 'bg-green-100 text-green-800',
  ON_DELIVERY: 'bg-blue-100 text-blue-800',
  ON_BREAK: 'bg-yellow-100 text-yellow-800',
  INACTIVE: 'bg-gray-100 text-gray-700',
}

export const VEHICLE_LABELS: Record<VehicleType, string> = {
  MOTORCYCLE: 'Moto',
  BICYCLE: 'Bicicleta',
  ELECTRIC_BICYCLE: 'Bicicleta Eléctrica',
  CAR: 'Carro',
  SCOOTER: 'Scooter',
  ON_FOOT: 'A pie',
}

// ─── Global reactive state ────────────────────────────────────────────────────

const deliveries = ref<Delivery[]>([])
const drivers = ref<Driver[]>([])
const invitations = ref<DriverInvitation[]>([])
const loadingInvitations = ref(false)
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
  const { get, post, put, patch, del } = useApi()
  const router = useRouter()

  // ─── Computed ──────────────────────────────────────────────────────────────

  const activeDeliveries = computed(() =>
    deliveries.value.filter((d) =>
      ['ASSIGNED', 'PICKING_UP', 'IN_TRANSIT'].includes(d.status),
    ),
  )

  const availableDrivers = computed(() =>
    drivers.value.filter((d) => d.status === 'AVAILABLE'),
  )

  function extractMessage(err: any, fallback: string): string {
    if (err?.status === 401) router.push('/login')
    return err?.message ?? fallback
  }

  // ─── Load stats ────────────────────────────────────────────────────────────

  async function loadStats() {
    try {
      stats.value = await get<DeliveryStats>('/delivery/stats')
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
      const [page, statsData] = await Promise.all([
        get<DeliveryPage>(`/delivery${query}`),
        get<DeliveryStats>('/delivery/stats'),
      ])
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
      drivers.value = await get<Driver[]>('/delivery/drivers')
    } catch (err) {
      error.value = extractMessage(err, 'Error al cargar los repartidores')
    } finally {
      loadingDrivers.value = false
    }
  }

  // ─── Delivery CRUD ─────────────────────────────────────────────────────────

  async function createDelivery(payload: CreateDeliveryPayload): Promise<Delivery | null> {
    try {
      const item = await post<Delivery>('/delivery', payload)
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
      const item = await put<Delivery>(`/delivery/${id}`, payload)
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
      await del(`/delivery/${id}`)
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
      const item = await patch<Delivery>(`/delivery/${id}/status`, { status })
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
      const item = await patch<Delivery>(`/delivery/${deliveryId}/assign`, { driverId })
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
      const driver = await post<Driver>('/delivery/drivers', payload)
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
      const driver = await put<Driver>(`/delivery/drivers/${id}`, payload)
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
      await del(`/delivery/drivers/${id}`)
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
      const driver = await patch<Driver>(`/delivery/drivers/${id}/status`, { status })
      const idx = drivers.value.findIndex((d) => d.id === id)
      if (idx !== -1) drivers.value[idx] = driver
      await loadStats()
      return driver
    } catch (err) {
      error.value = extractMessage(err, 'Error al cambiar el estado del repartidor')
      return null
    }
  }

  // ─── Driver invitations ────────────────────────────────────────────────────

  async function loadInvitations() {
    loadingInvitations.value = true
    try {
      invitations.value = await get<DriverInvitation[]>('/delivery/driver-invitations')
    } catch (err) {
      error.value = extractMessage(err, 'Error al cargar las invitaciones')
    } finally {
      loadingInvitations.value = false
    }
  }

  async function inviteDriver(payload: InviteDriverPayload): Promise<DriverInvitation | null> {
    try {
      const invitation = await post<DriverInvitation>('/delivery/driver-invitations', payload)
      invitations.value.unshift(invitation)
      return invitation
    } catch (err) {
      error.value = extractMessage(err, 'Error al enviar la invitación')
      return null
    }
  }

  async function cancelInvitation(id: string): Promise<boolean> {
    try {
      const updated = await post<DriverInvitation>(`/delivery/driver-invitations/${id}/cancel`, {})
      const idx = invitations.value.findIndex((i) => i.id === id)
      if (idx !== -1) invitations.value[idx] = updated
      return true
    } catch (err) {
      error.value = extractMessage(err, 'Error al cancelar la invitación')
      return false
    }
  }

  // Contexto público (sin sesión) de una invitación, para /driver-invitation/:token
  async function previewInvitation(token: string): Promise<{ commerceName: string; status: DriverInvitationStatus }> {
    return get(`/delivery/driver-invitations/${token}`)
  }

  // El invitado, ya logueado, reclama la invitación con su propia cuenta
  async function acceptInvitation(token: string): Promise<Driver> {
    return post<Driver>(`/delivery/driver-invitations/${token}/accept`, {})
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
    invitations,
    loadingInvitations,
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
    loadInvitations,
    inviteDriver,
    cancelInvitation,
    previewInvitation,
    acceptInvitation,
  }
}
