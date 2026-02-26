import { ref, computed } from 'vue'
import { useAuth } from './useAuth'

export type AppointmentStatus =
  | 'PENDIENTE'
  | 'CONFIRMADA'
  | 'SENTADA'
  | 'COMPLETADA'
  | 'CANCELADA'
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
  restaurantId: string
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
  PENDIENTE: 'Pendiente',
  CONFIRMADA: 'Confirmada',
  SENTADA: 'Sentada',
  COMPLETADA: 'Completada',
  CANCELADA: 'Cancelada',
  NO_SHOW: 'No Show',
}

export const STATUS_CLASSES: Record<AppointmentStatus, string> = {
  PENDIENTE: 'bg-yellow-100 text-yellow-800',
  CONFIRMADA: 'bg-green-100 text-green-800',
  SENTADA: 'bg-blue-100 text-blue-800',
  COMPLETADA: 'bg-gray-100 text-gray-700',
  CANCELADA: 'bg-red-100 text-red-800',
  NO_SHOW: 'bg-orange-100 text-orange-800',
}

export const useAgendamientos = () => {
  const { getHeaders, refreshAccessToken } = useAuth()
  const config = useRuntimeConfig()
  const apiUrl = config.public.apiUrl as string
  const router = useRouter()

  // ─── Computed ──────────────────────────────────────────────────────────────

  const pendingCount = computed(() => appointments.value.filter((a) => a.status === 'PENDIENTE').length)
  const confirmedCount = computed(() => appointments.value.filter((a) => a.status === 'CONFIRMADA').length)

  // ─── API helper ────────────────────────────────────────────────────────────

  async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers = {
      'Content-Type': 'application/json',
      ...getHeaders(),
      ...(options.headers as Record<string, string> || {}),
    }
    return $fetch<T>(`${apiUrl}/api/appointments${path}`, { ...options, headers } as Parameters<typeof $fetch>[1])
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
      const [page, statsData] = await withAuthRetry(() =>
        Promise.all([
          apiFetch<AppointmentPage>(query),
          apiFetch<AppointmentStats>('/stats'),
        ]),
      )
      appointments.value = page.items
      totalCount.value = page.total
      stats.value = statsData
    } catch (err: unknown) {
      error.value = (err as { data?: { message?: string } })?.data?.message ?? 'Error al cargar los agendamientos'
    } finally {
      loading.value = false
    }
  }

  // ─── CRUD ──────────────────────────────────────────────────────────────────

  async function createAgendamiento(payload: CreateAppointmentPayload): Promise<Appointment | null> {
    try {
      const item = await withAuthRetry(() =>
        apiFetch<Appointment>('', { method: 'POST', body: JSON.stringify(payload) }),
      )
      appointments.value.unshift(item)
      totalCount.value++
      stats.value.total++
      if (item.status === 'PENDIENTE') stats.value.pending++
      else if (item.status === 'CONFIRMADA') stats.value.confirmed++
      return item
    } catch (err: unknown) {
      error.value = (err as { data?: { message?: string } })?.data?.message ?? 'Error al crear el agendamiento'
      return null
    }
  }

  async function updateAgendamiento(id: string, payload: UpdateAppointmentPayload): Promise<Appointment | null> {
    try {
      const item = await withAuthRetry(() =>
        apiFetch<Appointment>(`/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
      )
      const idx = appointments.value.findIndex((a) => a.id === id)
      if (idx !== -1) appointments.value[idx] = item
      return item
    } catch (err: unknown) {
      error.value = (err as { data?: { message?: string } })?.data?.message ?? 'Error al actualizar el agendamiento'
      return null
    }
  }

  async function deleteAgendamiento(id: string): Promise<boolean> {
    try {
      await withAuthRetry(() => apiFetch(`/${id}`, { method: 'DELETE' }))
      const removed = appointments.value.find((a) => a.id === id)
      appointments.value = appointments.value.filter((a) => a.id !== id)
      totalCount.value = Math.max(0, totalCount.value - 1)
      if (removed) {
        stats.value.total = Math.max(0, stats.value.total - 1)
        if (removed.status === 'PENDIENTE') stats.value.pending = Math.max(0, stats.value.pending - 1)
        else if (removed.status === 'CONFIRMADA') stats.value.confirmed = Math.max(0, stats.value.confirmed - 1)
        else if (removed.status === 'CANCELADA') stats.value.cancelled = Math.max(0, stats.value.cancelled - 1)
      }
      return true
    } catch (err: unknown) {
      error.value = (err as { data?: { message?: string } })?.data?.message ?? 'Error al eliminar el agendamiento'
      return false
    }
  }

  async function updateStatus(id: string, status: AppointmentStatus): Promise<Appointment | null> {
    try {
      const item = await withAuthRetry(() =>
        apiFetch<Appointment>(`/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
      )
      const idx = appointments.value.findIndex((a) => a.id === id)
      if (idx !== -1) appointments.value[idx] = item
      // Refresh stats from server to keep accurate
      const statsData = await withAuthRetry(() => apiFetch<AppointmentStats>('/stats'))
      stats.value = statsData
      return item
    } catch (err: unknown) {
      error.value = (err as { data?: { message?: string } })?.data?.message ?? 'Error al cambiar el estado'
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
