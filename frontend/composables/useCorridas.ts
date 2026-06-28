import type { AsyncData } from '#app'

export type CorridaServiceType = 'PASAJERO' | 'FLETE'
export type CorridaVehicleType = 'MOTO' | 'AUTO' | 'CAMIONETA' | 'CAMION'

export interface Corrida {
  id: string
  serviceType: CorridaServiceType
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
  vehicleType: CorridaVehicleType
  notes?: string
  recipientName?: string
  recipientPhone?: string
  cargoDescription?: string
  cargoWeight?: number
  declaredValue?: number
  createdAt: string
  updatedAt: string
  completedAt?: string
  platformFeeRate?: number | null
  platformFeeAmount?: number | null
  platformFeePayer?: 'CLIENT' | 'PROVIDER' | null
}

export interface CreateCorridaDto {
  serviceType?: CorridaServiceType
  origin: string
  destination: string
  originLat?: number
  originLng?: number
  destinationLat?: number
  destinationLng?: number
  vehicleType: CorridaVehicleType
  notes?: string
  recipientName?: string
  recipientPhone?: string
  cargoDescription?: string
  cargoWeight?: number
  declaredValue?: number
}

export interface UpdateCorridaStatusDto {
  status: Corrida['status']
}

export function useCorridas() {
  const { get, post, patch } = useApi()
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
    const msg = e?.message
    // NestJS puede devolver message como string[] en errores de validación
    error.value = Array.isArray(msg) ? msg.join(', ') : (typeof msg === 'string' ? msg : 'Error desconocido')
    console.error('Corridas error:', e)
  }

  // ─── API Methods ────────────────────────────────────────────────────────────

  /**
   * Obtener todas las corridas disponibles (para conductores)
   */
  async function fetchAvailableCorridas(serviceType?: CorridaServiceType): Promise<Corrida[]> {
    if (!can('corridas:view')) {
      throw new Error('No tienes permiso para ver corridas')
    }
    loading.value = true
    clearError()
    try {
      const query = serviceType ? `?serviceType=${serviceType}` : ''
      const data = await get<Corrida[]>(`/corridas/available${query}`)
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
    // Usuarios con corridas:view o corridas:create pueden ver sus propias corridas
    if (!can('corridas:view') && !can('corridas:create')) {
      throw new Error('No tienes permiso para ver tus corridas')
    }
    loading.value = true
    clearError()
    try {
      const data = await get<Corrida[]>('/corridas/mine')
      myCorridas.value = data
      // Restaurar corrida activa desde el historial al cargar
      const active = data.find(c =>
        c.status === 'PENDING' || c.status === 'ACCEPTED' || c.status === 'IN_PROGRESS'
      )
      activeCorrida.value = active ?? null
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
      const data = await get<Corrida[]>('/corridas/driver')
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
      const data = await post<Corrida>('/corridas', dto)
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
      const data = await post<Corrida>(`/corridas/${corridaId}/accept`, {})
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
      const data = await patch<Corrida>(`/corridas/${corridaId}/status`, { status })
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
      await post(`/corridas/${corridaId}/cancel`, {})
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
      const data = await get<Corrida>(`/corridas/${corridaId}`)
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
    vehicleType: CorridaVehicleType
  ): Promise<{ price: number; distance: number; duration: number }> {
    try {
      return await post('/corridas/calculate-price', {
        originLat,
        originLng,
        destinationLat,
        destinationLng,
        vehicleType,
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
