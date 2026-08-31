// Publica la posición GPS del repartidor mientras una entrega está activa.
// Usa watchPosition (no polling manual) y aplica el mismo throttling que el
// backend (TrackingService: ~15m o ~4s) para no generar tráfico WS/DB
// innecesario — el backend igual descarta silenciosamente cualquier update
// que no cumpla el umbral, esto solo evita mandarlo desde el origen.

import { useSocketIO } from '../../plugins/socket.io.client'

const MIN_DISTANCE_METERS = 15
const MIN_INTERVAL_MS = 4000

function haversineMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

export function useDriverLocationPublisher(deliveryId: string) {
  const $socketio = useSocketIO()
  const { token } = useAuth()

  const active = ref(false)
  const permissionDenied = ref(false)
  const error = ref<string | null>(null)
  const lastSent = ref<{ lat: number; lng: number; at: number } | null>(null)

  let watchId: number | null = null

  function publish(position: GeolocationPosition) {
    const { latitude: lat, longitude: lng, heading, speed, accuracy } = position.coords
    const now = Date.now()

    if (lastSent.value) {
      const movedMeters = haversineMeters(lastSent.value, { lat, lng })
      const elapsedMs = now - lastSent.value.at
      if (movedMeters < MIN_DISTANCE_METERS && elapsedMs < MIN_INTERVAL_MS) return
    }

    lastSent.value = { lat, lng, at: now }

    const socket = $socketio.socket
    socket?.emit('driver:location', {
      deliveryId,
      lat,
      lng,
      accuracy: accuracy ?? undefined,
      heading: heading ?? undefined,
      speed: speed ?? undefined,
    })
  }

  function start() {
    if (!navigator.geolocation) {
      error.value = 'Este dispositivo no soporta geolocalización'
      return
    }

    $socketio.connect('/tracking', { token: token.value })

    watchId = navigator.geolocation.watchPosition(
      (position) => {
        active.value = true
        permissionDenied.value = false
        publish(position)
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          permissionDenied.value = true
          error.value = 'Activa la ubicación para continuar con el tracking.'
        } else {
          error.value = err.message
        }
        active.value = false
      },
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
    )
  }

  function stop() {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId)
      watchId = null
    }
    active.value = false
    $socketio.disconnect('/tracking')
  }

  onUnmounted(() => stop())

  return {
    active,
    permissionDenied,
    error,
    start,
    stop,
  }
}
