import { ref, computed } from 'vue'
import { useAuth } from './useAuth'

export type CustomerSegment = 'VIP' | 'PREMIUM' | 'REGULAR' | 'NUEVO'

export interface Customer {
  id: string
  name: string
  email?: string
  phone?: string
  address?: string
  notes?: string
  segment: CustomerSegment
  totalOrders: number
  totalSpent: number
  isActive: boolean
  commerceId: string
  createdAt: string
  updatedAt: string
}

export interface CustomerStats {
  totalClients: number
  activeClients: number
  avgSpent: number
}

export interface CreateCustomerPayload {
  name: string
  email?: string
  phone?: string
  address?: string
  notes?: string
  segment?: CustomerSegment
}

export interface UpdateCustomerPayload extends Partial<CreateCustomerPayload> {
  isActive?: boolean
}

// Estado global compartido
const customers = ref<Customer[]>([])
const stats = ref<CustomerStats>({ totalClients: 0, activeClients: 0, avgSpent: 0 })
const loading = ref(false)
const error = ref<string | null>(null)

export const useClientes = () => {
  const { getHeaders, refreshAccessToken } = useAuth()
  const config = useRuntimeConfig()
  const apiUrl = config.public.apiUrl as string
  const router = useRouter()

  // ─── Computed ──────────────────────────────────────────────────────────────

  const totalClients = computed(() => customers.value.length)
  const activeClients = computed(() => customers.value.filter((c) => c.isActive).length)
  const vipClients = computed(() => customers.value.filter((c) => c.segment === 'VIP').length)

  // ─── API helper ────────────────────────────────────────────────────────────

  async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers = {
      'Content-Type': 'application/json',
      ...getHeaders(),
      ...(options.headers as Record<string, string> || {}),
    }
    return $fetch<T>(`${apiUrl}/api/customers${path}`, { ...options, headers } as Parameters<typeof $fetch>[1])
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

  async function loadClientes() {
    loading.value = true
    error.value = null
    try {
      const [data, statsData] = await withAuthRetry(() =>
        Promise.all([
          apiFetch<Customer[]>(''),
          apiFetch<CustomerStats>('/stats'),
        ]),
      )
      customers.value = data
      stats.value = statsData
    } catch (err: unknown) {
      error.value = (err as { data?: { message?: string } })?.data?.message ?? 'Error al cargar los clientes'
    } finally {
      loading.value = false
    }
  }

  // ─── CRUD ──────────────────────────────────────────────────────────────────

  async function createCliente(payload: CreateCustomerPayload): Promise<Customer | null> {
    try {
      const customer = await withAuthRetry(() =>
        apiFetch<Customer>('', { method: 'POST', body: JSON.stringify(payload) }),
      )
      customers.value.push(customer)
      stats.value.totalClients++
      if (customer.isActive) stats.value.activeClients++
      return customer
    } catch (err: unknown) {
      error.value = (err as { data?: { message?: string } })?.data?.message ?? 'Error al crear el cliente'
      return null
    }
  }

  async function updateCliente(id: string, payload: UpdateCustomerPayload): Promise<Customer | null> {
    try {
      const customer = await withAuthRetry(() =>
        apiFetch<Customer>(`/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
      )
      const idx = customers.value.findIndex((c) => c.id === id)
      if (idx !== -1) customers.value[idx] = customer
      return customer
    } catch (err: unknown) {
      error.value = (err as { data?: { message?: string } })?.data?.message ?? 'Error al actualizar el cliente'
      return null
    }
  }

  async function deleteCliente(id: string): Promise<boolean> {
    try {
      await withAuthRetry(() => apiFetch(`/${id}`, { method: 'DELETE' }))
      const removed = customers.value.find((c) => c.id === id)
      customers.value = customers.value.filter((c) => c.id !== id)
      stats.value.totalClients = Math.max(0, stats.value.totalClients - 1)
      if (removed?.isActive) stats.value.activeClients = Math.max(0, stats.value.activeClients - 1)
      return true
    } catch (err: unknown) {
      error.value = (err as { data?: { message?: string } })?.data?.message ?? 'Error al eliminar el cliente'
      return false
    }
  }

  async function toggleStatus(id: string): Promise<Customer | null> {
    try {
      const customer = await withAuthRetry(() =>
        apiFetch<Customer>(`/${id}/toggle-status`, { method: 'PATCH' }),
      )
      const idx = customers.value.findIndex((c) => c.id === id)
      if (idx !== -1) customers.value[idx] = customer
      // recalculate active count
      stats.value.activeClients = customers.value.filter((c) => c.isActive).length
      return customer
    } catch (err: unknown) {
      error.value = (err as { data?: { message?: string } })?.data?.message ?? 'Error al cambiar el estado'
      return null
    }
  }

  return {
    // state
    customers,
    stats,
    loading,
    error,
    // computed
    totalClients,
    activeClients,
    vipClients,
    // actions
    loadClientes,
    createCliente,
    updateCliente,
    deleteCliente,
    toggleStatus,
  }
}
