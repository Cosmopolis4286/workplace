import { ref, computed } from 'vue'
import { useApi } from '../core/useApi'

export type AppointmentStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'SEATED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW'

export interface AppointmentCustomer {
  id: string
  name: string
  phone?: string
  segment?: string
}

export interface Appointment {
  id: string
  customerName: string
  customerPhone?: string
  customerId?: string
  customer?: AppointmentCustomer
  date: string
  partySize: number
  tableNumber?: number
  notes?: string
  status: AppointmentStatus
  commerceId: string
  createdAt: string
  updatedAt: string
}

export interface AppointmentStats {
  total: number
  todayTotal: number
  confirmed: number
  pending: number
  cancelled: number
  noShow: number
}

export interface CreateAppointmentPayload {
  customerName: string
  customerPhone?: string
  customerId?: string
  date: string
  partySize: number
  tableNumber?: number
  notes?: string
  status?: AppointmentStatus
}

export interface UpdateAppointmentPayload extends Partial<CreateAppointmentPayload> {}

export interface AppointmentPage {
  items: Appointment[]
  total: number
  page: number
  limit: number
}

export interface AppointmentFilters {
  status?: AppointmentStatus
  dateFrom?: string
  dateTo?: string
  page?: number
  limit?: number
}

// ─── Global reactive state ────────────────────────────────────────────────────
const appointments = ref<Appointment[]>([])
const stats = ref<AppointmentStats>({
  total: 0,
  todayTotal: 0,
  confirmed: 0,
  pending: 0,
  cancelled: 0,
  noShow: 0,
})
const loading = ref(false)
const error = ref<string | null>(null)
const totalCount = ref(0)

// ─── Status labels / colors ───────────────────────────────────────────────────
export const STATUS_LABELS: Record<AppointmentStatus, string> = {
  PENDING: 'Pendiente',
  CONFIRMED: 'Confirmada',
  SEATED: 'Sentada',
  COMPLETED: 'Completada',
  CANCELLED: 'Cancelada',
  NO_SHOW: 'No Show',
}

export const STATUS_CLASSES: Record<AppointmentStatus, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  CONFIRMED: 'bg-green-100 text-green-800',
  SEATED: 'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-gray-100 text-gray-700',
  CANCELLED: 'bg-red-100 text-red-800',
  NO_SHOW: 'bg-orange-100 text-orange-800',
}

export const useAppointments = () => {
  const { get, post, put, patch, del } = useApi()
  const router = useRouter()

  // ─── Computed ──────────────────────────────────────────────────────────────

  const pendingCount = computed(() => appointments.value.filter((a) => a.status === 'PENDING').length)
  const confirmedCount = computed(() => appointments.value.filter((a) => a.status === 'CONFIRMED').length)

  // ─── Load ──────────────────────────────────────────────────────────────────

  async function loadAgendamientos(filters: AppointmentFilters = {}) {
    loading.value = true
    error.value = null
    try {
      const params = new URLSearchParams()
      if (filters.status) params.set('status', filters.status)
      if (filters.dateFrom) params.set('dateFrom', filters.dateFrom)
      if (filters.dateTo) params.set('dateTo', filters.dateTo)
      if (filters.page) params.set('page', String(filters.page))
      if (filters.limit) params.set('limit', String(filters.limit))

      const query = params.toString() ? `?${params.toString()}` : ''
      const [page, statsData] = await Promise.all([
        get<AppointmentPage>(`/appointments${query}`),
        get<AppointmentStats>('/appointments/stats'),
      ])
      appointments.value = page.items
      totalCount.value = page.total
      stats.value = statsData
    } catch (err: any) {
      error.value = err?.message ?? 'Error al cargar los agendamientos'
      if (err?.status === 401) router.push('/login')
    } finally {
      loading.value = false
    }
  }

  // ─── CRUD ──────────────────────────────────────────────────────────────────

  async function createAgendamiento(payload: CreateAppointmentPayload): Promise<Appointment | null> {
    try {
      const item = await post<Appointment>('/appointments', payload)
      appointments.value.unshift(item)
      totalCount.value++
      stats.value.total++
      if (item.status === 'PENDING') stats.value.pending++
      else if (item.status === 'CONFIRMED') stats.value.confirmed++
      return item
    } catch (err: any) {
      error.value = err?.message ?? 'Error al crear el agendamiento'
      return null
    }
  }

  async function updateAgendamiento(id: string, payload: UpdateAppointmentPayload): Promise<Appointment | null> {
    try {
      const item = await put<Appointment>(`/appointments/${id}`, payload)
      const idx = appointments.value.findIndex((a) => a.id === id)
      if (idx !== -1) appointments.value[idx] = item
      return item
    } catch (err: any) {
      error.value = err?.message ?? 'Error al actualizar el agendamiento'
      return null
    }
  }

  async function deleteAgendamiento(id: string): Promise<boolean> {
    try {
      await del(`/appointments/${id}`)
      const removed = appointments.value.find((a) => a.id === id)
      appointments.value = appointments.value.filter((a) => a.id !== id)
      totalCount.value = Math.max(0, totalCount.value - 1)
      if (removed) {
        stats.value.total = Math.max(0, stats.value.total - 1)
        if (removed.status === 'PENDING') stats.value.pending = Math.max(0, stats.value.pending - 1)
        else if (removed.status === 'CONFIRMED') stats.value.confirmed = Math.max(0, stats.value.confirmed - 1)
        else if (removed.status === 'CANCELLED') stats.value.cancelled = Math.max(0, stats.value.cancelled - 1)
      }
      return true
    } catch (err: any) {
      error.value = err?.message ?? 'Error al eliminar el agendamiento'
      return false
    }
  }

  async function updateStatus(id: string, status: AppointmentStatus): Promise<Appointment | null> {
    try {
      const item = await patch<Appointment>(`/appointments/${id}/status`, { status })
      const idx = appointments.value.findIndex((a) => a.id === id)
      if (idx !== -1) appointments.value[idx] = item
      // Refresh stats from server to keep accurate
      const statsData = await get<AppointmentStats>('/appointments/stats')
      stats.value = statsData
      return item
    } catch (err: any) {
      error.value = err?.message ?? 'Error al cambiar el estado'
      return null
    }
  }

  return {
    // state
    appointments,
    stats,
    loading,
    error,
    totalCount,
    // computed
    pendingCount,
    confirmedCount,
    // actions
    loadAgendamientos,
    createAgendamiento,
    updateAgendamiento,
    deleteAgendamiento,
    updateStatus,
  }
}
