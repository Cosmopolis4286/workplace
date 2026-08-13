import { ref } from 'vue'
import { useApi } from '../core/useApi'

export type VeLocationType = 'MUNICIPIO' | 'CIUDAD' | 'PARROQUIA'

export interface VeLocationNode {
  id: string
  type: VeLocationType
  name: string
  stateName: string | null
  postalCode: string | null
  parentId: string | null
  children?: VeLocationNode[]
}

export interface CreateVeLocationPayload {
  type: VeLocationType
  name: string
  parentId?: string
  stateName?: string
  postalCode?: string
}

export interface UpdateVeLocationPayload {
  name?: string
  stateName?: string
  postalCode?: string
}

// Estado global compartido
const tree = ref<VeLocationNode[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

export const useLocationsAdmin = () => {
  const { get, post, put, del } = useApi()
  const router = useRouter()

  async function loadTree(state?: string) {
    loading.value = true
    error.value = null
    try {
      const qs = state ? `?state=${encodeURIComponent(state)}` : ''
      tree.value = await get<VeLocationNode[]>(`/locations/ve/admin/tree${qs}`)
    } catch (err: any) {
      error.value = err?.message ?? 'Error al cargar el catálogo de ubicaciones'
      if (err?.status === 401) router.push('/login')
    } finally {
      loading.value = false
    }
  }

  async function createNode(payload: CreateVeLocationPayload): Promise<VeLocationNode | null> {
    try {
      const node = await post<VeLocationNode>('/locations/ve', payload)
      return node
    } catch (err: any) {
      error.value = err?.message ?? 'Error al crear la ubicación'
      return null
    }
  }

  async function updateNode(id: string, payload: UpdateVeLocationPayload): Promise<VeLocationNode | null> {
    try {
      const node = await put<VeLocationNode>(`/locations/ve/${id}`, payload)
      return node
    } catch (err: any) {
      error.value = err?.message ?? 'Error al actualizar la ubicación'
      return null
    }
  }

  async function deleteNode(id: string): Promise<boolean> {
    try {
      await del(`/locations/ve/${id}`)
      return true
    } catch (err: any) {
      error.value = err?.message ?? 'Error al eliminar la ubicación'
      return false
    }
  }

  return {
    tree,
    loading,
    error,
    loadTree,
    createNode,
    updateNode,
    deleteNode,
  }
}
