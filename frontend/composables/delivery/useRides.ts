import type { AsyncData } from '#app'

export type RideServiceType = 'PASSENGER' | 'FREIGHT'
export type RideVehicleType = 'MOTORCYCLE' | 'CAR' | 'PICKUP_TRUCK' | 'TRUCK'

export interface Ride {
  id: string
  serviceType: RideServiceType
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
  vehicleType: RideVehicleType
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

export interface CreateRideDto {
  serviceType?: RideServiceType
  origin: string
  destination: string
  originLat?: number
  originLng?: number
  destinationLat?: number
  destinationLng?: number
  vehicleType: RideVehicleType
  notes?: string
  recipientName?: string
  recipientPhone?: string
  cargoDescription?: string
  cargoWeight?: number
  declaredValue?: number
}

export interface UpdateRideStatusDto {
  status: Ride['status']
}

export function useRides() {
  const { get, post, patch } = useApi()
  const { can } = usePermissions()

  // ─── Estado ─────────────────────────────────────────────────────────────────
  const corridas = ref<Ride[]>([])
  const myCorridas = ref<Ride[]>([])
  const activeCorrida = ref<Ride | null>(null)
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
  async function fetchAvailableCorridas(serviceType?: RideServiceType): Promise<Ride[]> {
    if (!can('corridas:view')) {
      throw new Error('No tienes permiso para ver corridas')
    }
    loading.value = true
    clearError()
    try {
      const query = serviceType ? `?serviceType=${serviceType}` : ''
      const data = await get<Ride[]>(`/rides/available${query}`)
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
  async function fetchMyCorridas(): Promise<Ride[]> {
    // Usuarios con corridas:view o corridas:create pueden ver sus propias corridas
    if (!can('corridas:view') && !can('corridas:create')) {
      throw new Error('No tienes permiso para ver tus corridas')
    }
    loading.value = true
    clearError()
    try {
      const data = await get<Ride[]>('/rides/mine')
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
  async function fetchDriverCorridas(): Promise<Ride[]> {
    if (!can('corridas:manage')) {
      throw new Error('No tienes permiso para gestionar corridas')
    }
    loading.value = true
    clearError()
    try {
      const data = await get<Ride[]>('/rides/driver')
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
  async function createCorrida(dto: CreateRideDto): Promise<Ride> {
    if (!can('corridas:create')) {
      throw new Error('No tienes permiso para solicitar corridas')
    }
    loading.value = true
    clearError()
    try {
      const data = await post<Ride>('/rides', dto)
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
  async function acceptCorrida(corridaId: string): Promise<Ride> {
    if (!can('corridas:manage')) {
      throw new Error('No tienes permiso para aceptar corridas')
    }
    loading.value = true
    clearError()
    try {
      const data = await post<Ride>(`/rides/${corridaId}/accept`, {})
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
    status: Ride['status']
  ): Promise<Ride> {
    if (!can('corridas:manage') && !can('corridas:create')) {
      throw new Error('No tienes permiso para actualizar corridas')
    }
    loading.value = true
    clearError()
    try {
      const data = await patch<Ride>(`/rides/${corridaId}/status`, { status })
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
      await post(`/rides/${corridaId}/cancel`, {})
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
  async function fetchCorridaById(corridaId: string): Promise<Ride> {
    clearError()
    try {
      const data = await get<Ride>(`/rides/${corridaId}`)
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
    vehicleType: RideVehicleType
  ): Promise<{ price: number; distance: number; duration: number }> {
    try {
      return await post('/rides/calculate-price', {
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
