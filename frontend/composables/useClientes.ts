import { ref, computed } from 'vue'
import { useApi } from './useApi'

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
  telegramChatId?: string | null
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
  const { get, post, put, patch, del } = useApi()
  const router = useRouter()

  // ─── Computed ──────────────────────────────────────────────────────────────

  const totalClients = computed(() => customers.value.length)
  const activeClients = computed(() => customers.value.filter((c) => c.isActive).length)
  const vipClients = computed(() => customers.value.filter((c) => c.segment === 'VIP').length)

  // ─── Load ──────────────────────────────────────────────────────────────────

  async function loadClientes() {
    loading.value = true
    error.value = null
    try {
      const [data, statsData] = await Promise.all([
        get<Customer[]>('/customers'),
        get<CustomerStats>('/customers/stats'),
      ])
      customers.value = data
      stats.value = statsData
    } catch (err: any) {
      error.value = err?.message ?? 'Error al cargar los clientes'
      if (err?.status === 401) router.push('/login')
    } finally {
      loading.value = false
    }
  }

  // ─── CRUD ──────────────────────────────────────────────────────────────────

  async function createCliente(payload: CreateCustomerPayload): Promise<Customer | null> {
    try {
      const customer = await post<Customer>('/customers', payload)
      customers.value.push(customer)
      stats.value.totalClients++
      if (customer.isActive) stats.value.activeClients++
      return customer
    } catch (err: any) {
      error.value = err?.message ?? 'Error al crear el cliente'
      return null
    }
  }

  async function updateCliente(id: string, payload: UpdateCustomerPayload): Promise<Customer | null> {
    try {
      const customer = await put<Customer>(`/customers/${id}`, payload)
      const idx = customers.value.findIndex((c) => c.id === id)
      if (idx !== -1) customers.value[idx] = customer
      return customer
    } catch (err: any) {
      error.value = err?.message ?? 'Error al actualizar el cliente'
      return null
    }
  }

  async function deleteCliente(id: string): Promise<boolean> {
    try {
      await del(`/customers/${id}`)
      const removed = customers.value.find((c) => c.id === id)
      customers.value = customers.value.filter((c) => c.id !== id)
      stats.value.totalClients = Math.max(0, stats.value.totalClients - 1)
      if (removed?.isActive) stats.value.activeClients = Math.max(0, stats.value.activeClients - 1)
      return true
    } catch (err: any) {
      error.value = err?.message ?? 'Error al eliminar el cliente'
      return false
    }
  }

  async function toggleStatus(id: string): Promise<Customer | null> {
    try {
      const customer = await patch<Customer>(`/customers/${id}/toggle-status`, {})
      const idx = customers.value.findIndex((c) => c.id === id)
      if (idx !== -1) customers.value[idx] = customer
      // recalculate active count
      stats.value.activeClients = customers.value.filter((c) => c.isActive).length
      return customer
    } catch (err: any) {
      error.value = err?.message ?? 'Error al cambiar el estado'
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
