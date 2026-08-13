import { ref, computed } from 'vue'
import { useApi } from '../core/useApi'

export type BranchStatus = 'ACTIVE' | 'INACTIVE' | 'UNDER_CONSTRUCTION' | 'CLOSED'

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
  ACTIVE: 'Activa',
  INACTIVE: 'Inactiva',
  UNDER_CONSTRUCTION: 'En Construcción',
  CLOSED: 'Cerrada',
}

export const BRANCH_STATUS_CLASSES: Record<BranchStatus, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  INACTIVE: 'bg-gray-100 text-gray-700',
  UNDER_CONSTRUCTION: 'bg-yellow-100 text-yellow-800',
  CLOSED: 'bg-red-100 text-red-800',
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

export const useBranches = () => {
  const { get, post, put, patch, del } = useApi()
  const router = useRouter()

  // ─── Computed ──────────────────────────────────────────────────────────────

  const totalBranches = computed(() => branches.value.length)
  const activeBranches = computed(() => branches.value.filter((b) => b.status === 'ACTIVE').length)
  const inConstructionCount = computed(() => branches.value.filter((b) => b.status === 'UNDER_CONSTRUCTION').length)

  // ─── Load ──────────────────────────────────────────────────────────────────

  async function loadSucursales() {
    loading.value = true
    error.value = null
    try {
      const [data, statsData] = await Promise.all([
        get<Branch[]>('/branches'),
        get<BranchStats>('/branches/stats'),
      ])
      branches.value = data
      stats.value = statsData
    } catch (err: any) {
      error.value = err?.message ?? 'Error al cargar las sucursales'
      if (err?.status === 401) router.push('/login')
    } finally {
      loading.value = false
    }
  }

  // ─── CRUD ──────────────────────────────────────────────────────────────────

  async function createSucursal(payload: CreateBranchPayload): Promise<Branch | null> {
    try {
      const branch = await post<Branch>('/branches', payload)
      branches.value.push(branch)
      stats.value.total++
      if (branch.status === 'ACTIVE') stats.value.active++
      return branch
    } catch (err: any) {
      error.value = err?.message ?? 'Error al crear la sucursal'
      return null
    }
  }

  async function updateSucursal(id: string, payload: UpdateBranchPayload): Promise<Branch | null> {
    try {
      const branch = await put<Branch>(`/branches/${id}`, payload)
      const idx = branches.value.findIndex((b) => b.id === id)
      if (idx !== -1) branches.value[idx] = branch
      stats.value.active = branches.value.filter((b) => b.status === 'ACTIVE').length
      return branch
    } catch (err: any) {
      error.value = err?.message ?? 'Error al actualizar la sucursal'
      return null
    }
  }

  async function deleteSucursal(id: string): Promise<boolean> {
    try {
      await del(`/branches/${id}`)
      const removed = branches.value.find((b) => b.id === id)
      branches.value = branches.value.filter((b) => b.id !== id)
      stats.value.total = Math.max(0, stats.value.total - 1)
      if (removed?.status === 'ACTIVE') stats.value.active = Math.max(0, stats.value.active - 1)
      return true
    } catch (err: any) {
      error.value = err?.message ?? 'Error al eliminar la sucursal'
      return false
    }
  }

  async function updateStatus(id: string, status: BranchStatus): Promise<Branch | null> {
    try {
      const branch = await patch<Branch>(`/branches/${id}/status`, { status })
      const idx = branches.value.findIndex((b) => b.id === id)
      if (idx !== -1) branches.value[idx] = branch
      stats.value.active = branches.value.filter((b) => b.status === 'ACTIVE').length
      return branch
    } catch (err: any) {
      error.value = err?.message ?? 'Error al cambiar el estado'
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
