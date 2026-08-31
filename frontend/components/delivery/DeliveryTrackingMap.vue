<template>
  <div ref="mapContainer" class="h-full w-full min-h-[280px] rounded-lg overflow-hidden" />
</template>

<script setup lang="ts">
// Mapa Leaflet + OpenStreetMap (sin Google Maps SDK) para el tracking en
// vivo de una entrega. Client-only: Leaflet toca `window`/`document`
// directamente y no soporta SSR — este componente se debe importar con
// <ClientOnly> desde la página que lo use.
import type { DeliveryLocation, DeliveryRoute } from '~/composables/delivery/useDeliveryTracking'

const props = defineProps<{
  pickup: { lat: number; lng: number } | null
  destination: { lat: number; lng: number } | null
  location: DeliveryLocation | null
  route: DeliveryRoute | null
}>()

const mapContainer = ref<HTMLElement | null>(null)
let map: any = null
let pickupMarker: any = null
let destMarker: any = null
let driverMarker: any = null
let routeLine: any = null
let L: typeof import('leaflet') | null = null

const DRIVER_ICON_HTML = '<div style="font-size:22px;line-height:1">🏍️</div>'

onMounted(async () => {
  L = (await import('leaflet')).default
  await import('leaflet/dist/leaflet.css')

  if (!mapContainer.value) return

  const center = props.location ?? props.pickup ?? props.destination ?? { lat: 10.4806, lng: -66.9036 }
  map = L.map(mapContainer.value).setView([center.lat, center.lng], 14)

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19,
  }).addTo(map)

  render()
})

onBeforeUnmount(() => {
  map?.remove()
  map = null
})

function render() {
  if (!L || !map) return

  if (props.pickup) {
    if (!pickupMarker) {
      pickupMarker = L.marker([props.pickup.lat, props.pickup.lng]).addTo(map).bindPopup('Punto de recogida')
    } else {
      pickupMarker.setLatLng([props.pickup.lat, props.pickup.lng])
    }
  }

  if (props.destination) {
    if (!destMarker) {
      destMarker = L.marker([props.destination.lat, props.destination.lng]).addTo(map).bindPopup('Destino')
    } else {
      destMarker.setLatLng([props.destination.lat, props.destination.lng])
    }
  }

  if (props.location) {
    const latlng: [number, number] = [props.location.lat, props.location.lng]
    if (!driverMarker) {
      const icon = L.divIcon({ html: DRIVER_ICON_HTML, className: '', iconSize: [24, 24], iconAnchor: [12, 12] })
      driverMarker = L.marker(latlng, { icon }).addTo(map).bindPopup('Repartidor')
      map.panTo(latlng)
    } else {
      driverMarker.setLatLng(latlng)
    }
  }

  if (props.route?.geometry?.coordinates?.length) {
    // GeoJSON usa [lng, lat]; Leaflet usa [lat, lng].
    const latlngs = props.route.geometry.coordinates.map(([lng, lat]) => [lat, lng] as [number, number])
    if (routeLine) {
      routeLine.setLatLngs(latlngs)
    } else {
      routeLine = L.polyline(latlngs, { color: '#2563eb', weight: 4, opacity: 0.7 }).addTo(map)
    }
    map.fitBounds(routeLine.getBounds(), { padding: [32, 32] })
  }
}

watch(() => [props.pickup, props.destination, props.location, props.route], render, { deep: true })
</script>
