<template>
  <div>
    <div ref="mapContainer" class="h-72 w-full rounded-lg overflow-hidden border border-gray-200" />
    <div class="flex items-center justify-between mt-2">
      <p class="text-xs text-gray-400">
        {{ modelValue ? `${modelValue.lat.toFixed(5)}, ${modelValue.lng.toFixed(5)}` : 'Toca el mapa para fijar tu ubicación' }}
      </p>
      <button type="button" class="text-xs text-blue-600 hover:text-blue-800 font-medium" @click="useCurrentLocation">
        Usar mi ubicación actual
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
// Mapa Leaflet + OpenStreetMap para fijar manualmente lat/lng (Commerce,
// FreelancerSettings, User — ver MatchingService). Client-only: Leaflet toca
// `window`/`document` y no soporta SSR — este componente se debe importar
// con <ClientOnly> desde la página que lo use, mismo criterio que
// DeliveryTrackingMap.vue.
const props = defineProps<{
  modelValue: { lat: number; lng: number } | null
}>()
const emit = defineEmits<{ 'update:modelValue': [{ lat: number; lng: number }] }>()

const DEFAULT_CENTER = { lat: 10.4806, lng: -66.9036 } // Caracas — mismo fallback que DeliveryTrackingMap

const mapContainer = ref<HTMLElement | null>(null)
let map: any = null
let marker: any = null
let L: typeof import('leaflet') | null = null

onMounted(async () => {
  L = (await import('leaflet')).default
  await import('leaflet/dist/leaflet.css')

  if (!mapContainer.value) return

  const center = props.modelValue ?? DEFAULT_CENTER
  map = L.map(mapContainer.value).setView([center.lat, center.lng], props.modelValue ? 15 : 12)

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19,
  }).addTo(map)

  if (props.modelValue) placeMarker(props.modelValue)

  map.on('click', (e: any) => {
    const point = { lat: e.latlng.lat, lng: e.latlng.lng }
    placeMarker(point)
    emit('update:modelValue', point)
  })
})

onBeforeUnmount(() => {
  map?.remove()
  map = null
})

function placeMarker(point: { lat: number; lng: number }) {
  if (!L || !map) return
  if (!marker) {
    marker = L.marker([point.lat, point.lng], { draggable: true }).addTo(map)
    marker.on('dragend', () => {
      const pos = marker.getLatLng()
      emit('update:modelValue', { lat: pos.lat, lng: pos.lng })
    })
  } else {
    marker.setLatLng([point.lat, point.lng])
  }
}

function useCurrentLocation() {
  if (!navigator.geolocation) return
  navigator.geolocation.getCurrentPosition((pos) => {
    const point = { lat: pos.coords.latitude, lng: pos.coords.longitude }
    placeMarker(point)
    map?.setView([point.lat, point.lng], 15)
    emit('update:modelValue', point)
  })
}
</script>
