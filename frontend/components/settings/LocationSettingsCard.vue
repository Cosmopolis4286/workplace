<template>
  <div class="card-premium p-6">
    <div class="flex items-center mb-6">
      <div class="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg mr-3">
        <MapPinIcon class="h-6 w-6 text-white" />
      </div>
      <div>
        <h3 class="text-xl font-bold text-gray-900">Ubicación</h3>
        <p class="text-xs text-gray-500">Usada para mostrarte primero a compradores cercanos en las búsquedas</p>
      </div>
    </div>
    <div class="space-y-4">
      <ClientOnly>
        <LocationPickerMap v-model="point" />
        <template #fallback>
          <div class="h-72 w-full rounded-lg bg-gray-100 animate-pulse" />
        </template>
      </ClientOnly>
      <button :disabled="saving || !point" class="btn-save btn-blue" @click="handleSave">
        <span v-if="saving" class="flex items-center justify-center gap-2">
          <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          Guardando...
        </span>
        <span v-else>Guardar Ubicación</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { MapPinIcon } from '@heroicons/vue/24/outline'
import LocationPickerMap from '~/components/ui/LocationPickerMap.vue'

const props = defineProps<{
  latitude?: number | null
  longitude?: number | null
  saving: boolean
}>()

const emit = defineEmits<{
  save: [{ latitude: number; longitude: number }]
}>()

const point = ref<{ lat: number; lng: number } | null>(
  props.latitude != null && props.longitude != null ? { lat: props.latitude, lng: props.longitude } : null,
)

watch(() => [props.latitude, props.longitude], ([lat, lng]) => {
  if (lat != null && lng != null) point.value = { lat, lng }
})

function handleSave() {
  if (!point.value) return
  emit('save', { latitude: point.value.lat, longitude: point.value.lng })
}
</script>

<style scoped>
.btn-save {
  @apply w-full px-6 py-3 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100;
}
.btn-blue { @apply bg-gradient-to-r from-blue-500 to-blue-600; }
</style>
