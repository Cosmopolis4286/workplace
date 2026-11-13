import { useApi } from '../core/useApi'
import { useSocketIO } from '../../plugins/socket.io.client'

// ─── Types ────────────────────────────────────────────────────────────────────
// Reflejan TrackingSnapshot / LocationSnapshot del backend
// (backend/src/domains/operations/delivery/tracking/tracking.service.ts).

export interface DeliveryLocation {
  lat: number
  lng: number
  accuracy?: number
  heading?: number
  speed?: number
  recordedAt: string
}

export interface DeliveryRoute {
  distanceMeters: number
  durationSeconds: number
  geometry: { type: 'LineString'; coordinates: [number, number][] }
  provider: string
}

export interface DeliveryTrackingDriver {
  id: string
  name: string
  vehicleType: string
}

export interface DeliveryTrackingSnapshot {
  deliveryId: string
  status: string
  trackingActive: boolean
  driver: DeliveryTrackingDriver | null
  location: DeliveryLocation | null
  pickup: { lat: number; lng: number } | null
  destination: { lat: number; lng: number } | null
  route: DeliveryRoute | null
  // Solo para el cliente y el comercio: el código que el cliente le da al
  // repartidor al recibir (prueba de entrega). El repartidor no lo recibe.
  deliveryCode?: string | null
  // Quién mira: decide qué se muestra (código, calificación, chat).
  viewerRole?: 'CUSTOMER' | 'COMMERCE' | 'DRIVER'
  // El chat de la entrega existe solo si el cliente tiene cuenta.
  chatAvailable?: boolean
}

// Estados del enum DeliveryStatus del backend que aún permiten tracking en
// vivo — usado solo para UX (deshabilitar reconexión), la fuente de verdad
// real es siempre trackingActive del snapshot/evento.
const TRACKABLE_STATUSES = new Set(['ASSIGNED', 'PICKING_UP', 'IN_TRANSIT'])

// ─── Composable ───────────────────────────────────────────────────────────────
// Uso: tanto por el cliente final como por el dashboard del comercio para ver
// la posición en vivo de una entrega puntual. La autorización real vive en
// el backend (TrackingService.assertCanView) — este composable no decide
// quién puede ver qué, solo consume lo que el backend ya autorizó.
export function useDeliveryTracking(deliveryId: string) {
  const $socketio = useSocketIO()
  const { token } = useAuth()
  const { get } = useApi()

  const snapshot = ref<DeliveryTrackingSnapshot | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const connected = ref(false)
  // Buffer efímero de posiciones recibidas en esta sesión de tracking — solo
  // para dibujar el trazo recorrido en el mapa. No se persiste ni se manda
  // al backend: se pierde al recargar, a propósito (ver DeliveryTrackingMap).
  const trail = ref<{ lat: number; lng: number }[]>([])
  const MAX_TRAIL_POINTS = 500

  const isTrackable = computed(
    () => !!snapshot.value?.trackingActive && TRACKABLE_STATUSES.has(snapshot.value.status)
  )

  async function fetchSnapshot() {
    loading.value = true
    error.value = null
    try {
      snapshot.value = await get<DeliveryTrackingSnapshot>(`/delivery/${deliveryId}/tracking`)
      if (snapshot.value?.location) {
        trail.value = [{ lat: snapshot.value.location.lat, lng: snapshot.value.location.lng }]
      }
    } catch (e: any) {
      error.value = e?.message ?? 'No se pudo cargar el seguimiento'
    } finally {
      loading.value = false
    }
  }

  function connect() {
    const socket = $socketio.connect('/tracking', { token: token.value })

    socket.on('connect', () => {
      socket.emit('join', { deliveryId }, (ack: { event: string; data: any }) => {
        if (ack?.event === 'joined') {
          connected.value = true
        }
      })
    })

    socket.on('disconnect', () => {
      connected.value = false
    })

    socket.on('DELIVERY_LOCATION_UPDATED', (payload: { deliveryId: string; location: DeliveryLocation }) => {
      if (payload.deliveryId !== deliveryId || !snapshot.value) return
      snapshot.value = { ...snapshot.value, location: payload.location }
      trail.value = [...trail.value, { lat: payload.location.lat, lng: payload.location.lng }].slice(-MAX_TRAIL_POINTS)
    })

    socket.on('DELIVERY_STATUS_UPDATED', (payload: { deliveryId: string; status: string; trackingActive: boolean }) => {
      if (payload.deliveryId !== deliveryId || !snapshot.value) return
      snapshot.value = { ...snapshot.value, status: payload.status, trackingActive: payload.trackingActive }
      // El backend corta la room del lado del servidor cuando trackingActive
      // pasa a false; desconectamos también del lado del cliente para dejar
      // de reintentar el join.
      if (!payload.trackingActive) {
        disconnect()
      }
    })
  }

  function disconnect() {
    $socketio.disconnect('/tracking')
    connected.value = false
  }

  async function init() {
    await fetchSnapshot()
    if (snapshot.value?.trackingActive) {
      connect()
    }
  }

  onUnmounted(() => disconnect())

  return {
    snapshot,
    loading,
    error,
    connected,
    isTrackable,
    trail,
    fetchSnapshot,
    connect,
    disconnect,
    init,
  }
}
