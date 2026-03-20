import { ref, computed } from 'vue'
import { useAuth } from './useAuth'

export type BranchStatus = 'ACTIVA' | 'INACTIVA' | 'EN_CONSTRUCCION' | 'CERRADA'

export interface Branch {
  id: string
  name: string
  address?: string
  phone?: string
  email?: string
  type?: string
  managerName?: string
  managerPhone?: string
  status: BranchStatus
  color: string
  notes?: string
  commerceId: string
  createdAt: string
  updatedAt: string
}

export interface BranchStats {
  total: number
  active: number
  byStatus: Partial<Record<BranchStatus, number>>
}

export interface CreateBranchPayload {
  name: string
  address?: string
  phone?: string
  email?: string
  type?: string
  managerName?: string
  managerPhone?: string
  status?: BranchStatus
  color?: string
  notes?: string
}

export interface UpdateBranchPayload extends Partial<CreateBranchPayload> {}

export const BRANCH_STATUS_LABELS: Record<BranchStatus, string> = {
  ACTIVA: 'Activa',
  INACTIVA: 'Inactiva',
  EN_CONSTRUCCION: 'En Construcción',
  CERRADA: 'Cerrada',
}

export const BRANCH_STATUS_CLASSES: Record<BranchStatus, string> = {
  ACTIVA: 'bg-green-100 text-green-800',
  INACTIVA: 'bg-gray-100 text-gray-700',
  EN_CONSTRUCCION: 'bg-yellow-100 text-yellow-800',
  CERRADA: 'bg-red-100 text-red-800',
}

export const BRANCH_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899',
  '#6b7280',
]

// Estado global compartido
const branches = ref<Branch[]>([])
const stats = ref<BranchStats>({ total: 0, active: 0, byStatus: {} })
const loading = ref(false)
const error = ref<string | null>(null)

export const useSucursales = () => {
  const { getHeaders, refreshAccessToken } = useAuth()
  const config = useRuntimeConfig()
  const apiUrl = config.public.apiUrl as string
  const router = useRouter()

  // ─── Computed ──────────────────────────────────────────────────────────────

  const totalBranches = computed(() => branches.value.length)
  const activeBranches = computed(() => branches.value.filter((b) => b.status === 'ACTIVA').length)
  const inConstructionCount = computed(() => branches.value.filter((b) => b.status === 'EN_CONSTRUCCION').length)

  // ─── API helper ────────────────────────────────────────────────────────────

  async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers = {
      'Content-Type': 'application/json',
      ...getHeaders(),
      ...(options.headers as Record<string, string> || {}),
    }
    return $fetch<T>(`${apiUrl}/branches${path}`, { ...options, headers } as Parameters<typeof $fetch>[1])
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

  async function loadSucursales() {
    loading.value = true
    error.value = null
    try {
      const [data, statsData] = await withAuthRetry(() =>
        Promise.all([
          apiFetch<Branch[]>(''),
          apiFetch<BranchStats>('/stats'),
        ]),
      )
      branches.value = data
      stats.value = statsData
    } catch (err: unknown) {
      error.value = (err as { data?: { message?: string } })?.data?.message ?? 'Error al cargar las sucursales'
    } finally {
      loading.value = false
    }
  }

  // ─── CRUD ──────────────────────────────────────────────────────────────────

  async function createSucursal(payload: CreateBranchPayload): Promise<Branch | null> {
    try {
      const branch = await withAuthRetry(() =>
        apiFetch<Branch>('', { method: 'POST', body: JSON.stringify(payload) }),
      )
      branches.value.push(branch)
      stats.value.total++
      if (branch.status === 'ACTIVA') stats.value.active++
      return branch
    } catch (err: unknown) {
      error.value = (err as { data?: { message?: string } })?.data?.message ?? 'Error al crear la sucursal'
      return null
    }
  }

  async function updateSucursal(id: string, payload: UpdateBranchPayload): Promise<Branch | null> {
    try {
      const branch = await withAuthRetry(() =>
        apiFetch<Branch>(`/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
      )
      const idx = branches.value.findIndex((b) => b.id === id)
      if (idx !== -1) branches.value[idx] = branch
      stats.value.active = branches.value.filter((b) => b.status === 'ACTIVA').length
      return branch
    } catch (err: unknown) {
      error.value = (err as { data?: { message?: string } })?.data?.message ?? 'Error al actualizar la sucursal'
      return null
    }
  }

  async function deleteSucursal(id: string): Promise<boolean> {
    try {
      await withAuthRetry(() => apiFetch(`/${id}`, { method: 'DELETE' }))
      const removed = branches.value.find((b) => b.id === id)
      branches.value = branches.value.filter((b) => b.id !== id)
      stats.value.total = Math.max(0, stats.value.total - 1)
      if (removed?.status === 'ACTIVA') stats.value.active = Math.max(0, stats.value.active - 1)
      return true
    } catch (err: unknown) {
      error.value = (err as { data?: { message?: string } })?.data?.message ?? 'Error al eliminar la sucursal'
      return false
    }
  }

  async function updateStatus(id: string, status: BranchStatus): Promise<Branch | null> {
    try {
      const branch = await withAuthRetry(() =>
        apiFetch<Branch>(`/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
      )
      const idx = branches.value.findIndex((b) => b.id === id)
      if (idx !== -1) branches.value[idx] = branch
      stats.value.active = branches.value.filter((b) => b.status === 'ACTIVA').length
      return branch
    } catch (err: unknown) {
      error.value = (err as { data?: { message?: string } })?.data?.message ?? 'Error al cambiar el estado'
      return null
    }
  }

  return {
    // state
    branches,
    stats,
    loading,
    error,
    // computed
    totalBranches,
    activeBranches,
    inConstructionCount,
    // actions
    loadSucursales,
    createSucursal,
    updateSucursal,
    deleteSucursal,
    updateStatus,
  }
}
