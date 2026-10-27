<template>
  <div class="card p-6">
    <h2 class="text-base font-semibold text-gray-900 mb-5">{{ serviceType === 'FREIGHT' ? 'Nuevo Flete' : 'Nuevo Viaje' }}</h2>

    <form @submit.prevent="$emit('submit')" class="space-y-5">
      <!-- Tipo de servicio -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">
          Tipo de Servicio <span class="text-red-500">*</span>
        </label>
        <div class="grid grid-cols-2 gap-3">
          <label
            v-for="s in serviceTypeOptions"
            :key="s.value"
            class="flex items-center gap-3 border rounded-xl p-3 cursor-pointer transition-all"
            :class="serviceType === s.value ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-gray-300'"
          >
            <input :checked="serviceType === s.value" type="radio" :value="s.value" class="hidden" @change="$emit('update:serviceType', s.value as 'PASSENGER' | 'FREIGHT')" />
            <span class="text-2xl">{{ s.icon }}</span>
            <div class="flex-1">
              <p class="text-sm font-medium text-gray-900">{{ s.label }}</p>
              <p class="text-xs text-gray-500">{{ s.desc }}</p>
            </div>
            <CheckCircleIcon v-if="serviceType === s.value" class="w-4 h-4 text-red-500 flex-shrink-0" />
          </label>
        </div>
      </div>

      <!-- Origen -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">
          {{ serviceType === 'FREIGHT' ? 'Punto de Recogida' : 'Punto de Origen' }} <span class="text-red-500">*</span>
        </label>
        <PlaceAutocomplete
          :model-value="originPlace"
          :placeholder="serviceType === 'FREIGHT' ? '¿Dónde recogemos la carga?' : '¿Desde dónde sales?'"
          :show-geo="true"
          @update:model-value="$emit('update:originPlace', $event)"
          @selected="$emit('origin-selected', $event)"
        >
          <template #icon>
            <span class="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-bold">A</span>
          </template>
        </PlaceAutocomplete>
      </div>

      <!-- Destino -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">
          {{ serviceType === 'FREIGHT' ? 'Punto de Entrega' : 'Destino' }} <span class="text-red-500">*</span>
        </label>
        <PlaceAutocomplete
          :model-value="destinationPlace"
          :placeholder="serviceType === 'FREIGHT' ? '¿A dónde entregamos?' : '¿A dónde vas?'"
          @update:model-value="$emit('update:destinationPlace', $event)"
          @selected="$emit('destination-selected', $event)"
        >
          <template #icon>
            <span class="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center text-white text-xs font-bold">B</span>
          </template>
        </PlaceAutocomplete>
      </div>

      <!-- Datos del destinatario (solo flete) -->
      <div v-if="serviceType === 'FREIGHT'" class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Nombre del destinatario</label>
          <input :value="recipientName" type="text" placeholder="Quién recibe" class="input-field" @input="$emit('update:recipientName', ($event.target as HTMLInputElement).value)" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Teléfono del destinatario</label>
          <input :value="recipientPhone" type="text" placeholder="Teléfono de contacto" class="input-field" @input="$emit('update:recipientPhone', ($event.target as HTMLInputElement).value)" />
        </div>
      </div>

      <!-- Carga (solo flete) -->
      <div v-if="serviceType === 'FREIGHT'" class="space-y-3">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Descripción de la carga</label>
          <input :value="cargoDescription" type="text" placeholder="Ej: Caja de electrodomésticos" class="input-field" @input="$emit('update:cargoDescription', ($event.target as HTMLInputElement).value)" />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Peso aproximado (kg)</label>
            <input :value="cargoWeight" type="number" min="0" step="0.1" placeholder="Ej: 25" class="input-field" @input="onNumberInput('update:cargoWeight', $event)" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Valor declarado <span class="text-gray-400 font-normal">(opcional)</span></label>
            <input :value="declaredValue" type="number" min="0" step="0.01" placeholder="$" class="input-field" @input="onNumberInput('update:declaredValue', $event)" />
          </div>
        </div>
      </div>

      <!-- Tipo de Vehículo -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">
          Tipo de Vehículo <span class="text-red-500">*</span>
        </label>
        <div class="grid grid-cols-2 gap-3">
          <label
            v-for="v in currentVehicleOptions"
            :key="v.value"
            class="flex items-center gap-3 border rounded-xl p-3 cursor-pointer transition-all"
            :class="vehicleType === v.value ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-gray-300'"
          >
            <input :checked="vehicleType === v.value" type="radio" :value="v.value" class="hidden" @change="$emit('update:vehicleType', v.value as typeof vehicleType)" />
            <span class="text-2xl">{{ v.icon }}</span>
            <div class="flex-1">
              <p class="text-sm font-medium text-gray-900">{{ v.label }}</p>
              <p class="text-xs text-gray-500">{{ v.desc }}</p>
            </div>
            <CheckCircleIcon v-if="vehicleType === v.value" class="w-4 h-4 text-red-500 flex-shrink-0" />
          </label>
        </div>
      </div>

      <!-- Notas -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">
          {{ serviceType === 'FREIGHT' ? 'Notas para el transportista' : 'Notas para el conductor' }} <span class="text-gray-400 font-normal">(opcional)</span>
        </label>
        <textarea
          :value="notes"
          rows="2"
          :placeholder="serviceType === 'FREIGHT' ? 'Ej: Tocar el timbre, preguntar por portería...' : 'Ej: Llevaré una maleta grande, portón verde...'"
          class="input-field resize-none"
          @input="$emit('update:notes', ($event.target as HTMLTextAreaElement).value)"
        />
      </div>

      <!-- Precio estimado -->
      <Transition
        enter-active-class="transition ease-out duration-200"
        enter-from-class="opacity-0 translate-y-1"
        enter-to-class="opacity-100 translate-y-0"
      >
        <div v-if="priceEstimate || calculatingPrice" class="bg-gradient-to-r from-red-50 to-orange-50 border border-red-100 rounded-xl p-4">
          <div v-if="calculatingPrice" class="flex items-center gap-3 text-gray-500">
            <svg class="w-5 h-5 animate-spin text-red-400" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
            <span class="text-sm">Calculando precio...</span>
          </div>
          <div v-else-if="priceEstimate" class="flex justify-between items-center">
            <div class="space-y-1 text-sm text-gray-600">
              <div class="flex items-center gap-2">
                <ArrowTrendingUpIcon class="w-4 h-4 text-red-400" />
                {{ priceEstimate.distance }} km
              </div>
              <div class="flex items-center gap-2">
                <ClockIcon class="w-4 h-4 text-red-400" />
                ~{{ priceEstimate.duration }} min
              </div>
            </div>
            <div class="text-right">
              <p class="text-3xl font-bold text-red-600">${{ priceEstimate.price }}</p>
              <p class="text-xs text-gray-400">precio estimado</p>
            </div>
          </div>
        </div>
      </Transition>

      <!-- Botones -->
      <div class="flex gap-3 pt-1">
        <button
          type="button"
          @click="$emit('recalculate')"
          :disabled="calculatingPrice || !canCalculate"
          class="btn-secondary flex-1 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {{ calculatingPrice ? 'Calculando...' : 'Recalcular Precio' }}
        </button>
        <button
          type="submit"
          :disabled="loading || !priceEstimate || !canSubmit"
          class="btn-primary flex-1 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {{ loading ? 'Solicitando...' : 'Solicitar Viaje' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { CheckCircleIcon, ArrowTrendingUpIcon, ClockIcon } from '@heroicons/vue/24/outline'
import type { PlaceSuggestion } from '~/composables/location/useNominatim'

type ServiceType = 'PASSENGER' | 'FREIGHT'
type VehicleType = 'MOTORCYCLE' | 'CAR' | 'PICKUP_TRUCK' | 'TRUCK'

const props = defineProps<{
  serviceType: ServiceType
  vehicleType: VehicleType
  originPlace: PlaceSuggestion | null
  destinationPlace: PlaceSuggestion | null
  recipientName: string
  recipientPhone: string
  cargoDescription: string
  cargoWeight: number | null
  declaredValue: number | null
  notes: string
  priceEstimate: { price: number; distance: number; duration: number } | null
  calculatingPrice: boolean
  loading: boolean
  canSubmit: boolean
}>()

const emit = defineEmits<{
  'update:serviceType': [value: ServiceType]
  'update:vehicleType': [value: VehicleType]
  'update:originPlace': [value: PlaceSuggestion | null]
  'update:destinationPlace': [value: PlaceSuggestion | null]
  'update:recipientName': [value: string]
  'update:recipientPhone': [value: string]
  'update:cargoDescription': [value: string]
  'update:cargoWeight': [value: number | null]
  'update:declaredValue': [value: number | null]
  'update:notes': [value: string]
  'origin-selected': [place: PlaceSuggestion]
  'destination-selected': [place: PlaceSuggestion]
  submit: []
  recalculate: []
}>()

// Replica la semántica de v-model.number: campo vacío → null, cualquier
// número (incluido 0) se preserva tal cual.
function onNumberInput(event: 'update:cargoWeight' | 'update:declaredValue', e: Event) {
  const raw = (e.target as HTMLInputElement).value
  const value = raw === '' ? null : Number(raw)
  if (event === 'update:cargoWeight') emit('update:cargoWeight', value)
  else emit('update:declaredValue', value)
}

const serviceTypeOptions = [
  { value: 'PASSENGER', icon: '🧍', label: 'Pasajero', desc: 'Viaje de persona a persona' },
  { value: 'FREIGHT',    icon: '📦', label: 'Flete / Entrega', desc: 'Transporte de carga o paquetes' },
]

const passengerVehicleOptions = [
  { value: 'MOTORCYCLE', icon: '🏍️', label: 'Moto', desc: 'Más rápido' },
  { value: 'CAR', icon: '🚗', label: 'Auto', desc: 'Más espacio' },
]

const fleteVehicleOptions = [
  { value: 'MOTORCYCLE',   icon: '🏍️', label: 'Moto',      desc: 'Paquetes pequeños' },
  { value: 'CAR',           icon: '🚗', label: 'Auto',      desc: 'Cargas medianas' },
  { value: 'PICKUP_TRUCK',  icon: '🛻', label: 'Camioneta', desc: 'Cargas grandes' },
  { value: 'TRUCK',         icon: '🚚', label: 'Camión',    desc: 'Mudanzas y carga pesada' },
]

const currentVehicleOptions = computed(() => props.serviceType === 'FREIGHT' ? fleteVehicleOptions : passengerVehicleOptions)
const canCalculate = computed(() => !!props.originPlace && !!props.destinationPlace)
</script>
