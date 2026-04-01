import type { AsyncData } from '#app'

export interface Corrida {
  id: string
  origin: string
  destination: string
  originLat?: number
  originLng?: number
  destinationLat?: number
  destinationLng?: number
  status: 'PENDING' | 'ACCEPTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  price?: number
  distance?: number
  duration?: number
  passengerId: string
  passengerName?: string
  passengerPhone?: string
  driverId?: string
  driverName?: string
  driverPhone?: string
  vehicleType: 'MOTO' | 'AUTO'
  notes?: string
  createdAt: string
  updatedAt: string
  completedAt?: string
}

export interface CreateCorridaDto {
  origin: string
  destination: string
  originLat?: number
  originLng?: number
  destinationLat?: number
  destinationLng?: number
  vehicleType: 'MOTO' | 'AUTO'
  notes?: string
}

export interface UpdateCorridaStatusDto {
  status: Corrida['status']
}

export function useCorridas() {
  const { apiFetch } = usePlans()
  const { can } = usePermissions()

  // ─── Estado ─────────────────────────────────────────────────────────────────
  const corridas = ref<Corrida[]>([])
  const myCorridas = ref<Corrida[]>([])
  const activeCorrida = ref<Corrida | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  // ─── Helpers ─────────────────────────────────────────────────────────────────
  function clearError() {
    error.value = null
  }

  function handleError(e: any) {
    error.value = e?.message || 'Error desconocido'
    console.error('Corridas error:', e)
  }

  // ─── API Methods ────────────────────────────────────────────────────────────

  /**
   * Obtener todas las corridas disponibles (para conductores)
   */
  async function fetchAvailableCorridas(): Promise<Corrida[]> {
    if (!can('corridas:view')) {
      throw new Error('No tienes permiso para ver corridas')
    }
    loading.value = true
    clearError()
    try {
      const data = await apiFetch<Corrida[]>('/corridas/available')
      corridas.value = data
      return data
    } catch (e: any) {
      handleError(e)
      throw e
    } finally {
      loading.value = false
    }
  }

  /**
   * Obtener mis corridas (como pasajero)
   */
  async function fetchMyCorridas(): Promise<Corrida[]> {
    if (!can('corridas:create')) {
      throw new Error('No tienes permiso para ver tus corridas')
    }
    loading.value = true
    clearError()
    try {
      const data = await apiFetch<Corrida[]>('/corridas/mine')
      myCorridas.value = data
      return data
    } catch (e: any) {
      handleError(e)
      throw e
    } finally {
      loading.value = false
    }
  }

  /**
   * Obtener corridas asignadas al conductor actual
   */
  async function fetchDriverCorridas(): Promise<Corrida[]> {
    if (!can('corridas:manage')) {
      throw new Error('No tienes permiso para gestionar corridas')
    }
    loading.value = true
    clearError()
    try {
      const data = await apiFetch<Corrida[]>('/corridas/driver')
      corridas.value = data
      return data
    } catch (e: any) {
      handleError(e)
      throw e
    } finally {
      loading.value = false
    }
  }

  /**
   * Crear una nueva corrida (solicitar viaje)
   */
  async function createCorrida(dto: CreateCorridaDto): Promise<Corrida> {
    if (!can('corridas:create')) {
      throw new Error('No tienes permiso para solicitar corridas')
    }
    loading.value = true
    clearError()
    try {
      const data = await apiFetch<Corrida>('/corridas', {
        method: 'POST',
        body: dto,
      })
      myCorridas.value.unshift(data)
      activeCorrida.value = data
      return data
    } catch (e: any) {
      handleError(e)
      throw e
    } finally {
      loading.value = false
    }
  }

  /**
   * Aceptar una corrida (como conductor)
   */
  async function acceptCorrida(corridaId: string): Promise<Corrida> {
    if (!can('corridas:manage')) {
      throw new Error('No tienes permiso para aceptar corridas')
    }
    loading.value = true
    clearError()
    try {
      const data = await apiFetch<Corrida>(`/corridas/${corridaId}/accept`, {
        method: 'POST',
      })
      const idx = corridas.value.findIndex(c => c.id === corridaId)
      if (idx >= 0) corridas.value[idx] = data
      activeCorrida.value = data
      return data
    } catch (e: any) {
      handleError(e)
      throw e
    } finally {
      loading.value = false
    }
  }

  /**
   * Actualizar estado de una corrida
   */
  async function updateCorridaStatus(
    corridaId: string,
    status: Corrida['status']
  ): Promise<Corrida> {
    if (!can('corridas:manage') && !can('corridas:create')) {
      throw new Error('No tienes permiso para actualizar corridas')
    }
    loading.value = true
    clearError()
    try {
      const data = await apiFetch<Corrida>(`/corridas/${corridaId}/status`, {
        method: 'PATCH',
        body: { status },
      })
      // Actualizar en todas las listas
      const idx1 = corridas.value.findIndex(c => c.id === corridaId)
      if (idx1 >= 0) corridas.value[idx1] = data
      const idx2 = myCorridas.value.findIndex(c => c.id === corridaId)
      if (idx2 >= 0) myCorridas.value[idx2] = data
      if (activeCorrida.value?.id === corridaId) {
        activeCorrida.value = data
      }
      return data
    } catch (e: any) {
      handleError(e)
      throw e
    } finally {
      loading.value = false
    }
  }

  /**
   * Cancelar una corrida
   */
  async function cancelCorrida(corridaId: string): Promise<void> {
    loading.value = true
    clearError()
    try {
      await apiFetch(`/corridas/${corridaId}/cancel`, {
        method: 'POST',
      })
      // Actualizar estado localmente
      const idx1 = corridas.value.findIndex(c => c.id === corridaId)
      if (idx1 >= 0) corridas.value[idx1].status = 'CANCELLED'
      const idx2 = myCorridas.value.findIndex(c => c.id === corridaId)
      if (idx2 >= 0) myCorridas.value[idx2].status = 'CANCELLED'
      if (activeCorrida.value?.id === corridaId) {
        activeCorrida.value.status = 'CANCELLED'
      }
    } catch (e: any) {
      handleError(e)
      throw e
    } finally {
      loading.value = false
    }
  }

  /**
   * Obtener detalle de una corrida
   */
  async function fetchCorridaById(corridaId: string): Promise<Corrida> {
    clearError()
    try {
      const data = await apiFetch<Corrida>(`/corridas/${corridaId}`)
      activeCorrida.value = data
      return data
    } catch (e: any) {
      handleError(e)
      throw e
    }
  }

  /**
   * Calcular precio estimado de una corrida
   */
  async function calculatePrice(
    originLat: number,
    originLng: number,
    destinationLat: number,
    destinationLng: number,
    vehicleType: 'MOTO' | 'AUTO'
  ): Promise<{ price: number; distance: number; duration: number }> {
    try {
      return await apiFetch('/corridas/calculate-price', {
        method: 'POST',
        body: {
          originLat,
          originLng,
          destinationLat,
          destinationLng,
          vehicleType,
        },
      })
    } catch (e: any) {
      handleError(e)
      throw e
    }
  }

  // ─── Estado computado ───────────────────────────────────────────────────────
  const hasActiveCorrida = computed(() => {
    return activeCorrida.value?.status === 'PENDING' ||
           activeCorrida.value?.status === 'ACCEPTED' ||
           activeCorrida.value?.status === 'IN_PROGRESS'
  })

  const canRequestCorrida = computed(() => {
    return can('corridas:create') && !hasActiveCorrida.value
  })

  const canManageCorridas = computed(() => {
    return can('corridas:manage')
  })

  return {
    // Estado
    corridas,
    myCorridas,
    activeCorrida,
    loading,
    error,
    
    // Computados
    hasActiveCorrida,
    canRequestCorrida,
    canManageCorridas,
    
    // Métodos
    fetchAvailableCorridas,
    fetchMyCorridas,
    fetchDriverCorridas,
    createCorrida,
    acceptCorrida,
    updateCorridaStatus,
    cancelCorrida,
    fetchCorridaById,
    calculatePrice,
    clearError,
  }
}
