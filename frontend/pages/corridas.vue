<template>
  <div class="min-h-screen bg-gray-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900">Corridas</h1>
        <p class="mt-2 text-gray-600">{{ subtitleText }}</p>
      </div>

      <!-- Error global -->
      <div v-if="error" class="mb-6 bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-3">
        <svg class="h-5 w-5 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        <span class="text-sm text-red-700">{{ error }}</span>
        <button @click="clearError" class="ml-auto text-red-500 hover:text-red-700">
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <!-- Tabs -->
      <div class="mb-6 border-b border-gray-200">
        <nav class="-mb-px flex space-x-8">
          <button
            v-if="canRequestCorrida"
            @click="activeTab = 'request'"
            :class="[activeTab === 'request' ? 'border-red-500 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300', 'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors']"
          >Solicitar Viaje</button>
          <button
            v-if="canManageCorridas"
            @click="activeTab = 'available'"
            :class="[activeTab === 'available' ? 'border-red-500 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300', 'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors']"
          >Corridas Disponibles</button>
          <button
            @click="activeTab = 'history'"
            :class="[activeTab === 'history' ? 'border-red-500 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300', 'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors']"
          >{{ canManageCorridas ? 'Mis Asignaciones' : 'Mis Viajes' }}</button>
        </nav>
      </div>

      <!-- ═══════════════════════════════════════════════════════════ -->
      <!--  TAB: Solicitar Viaje                                      -->
      <!-- ═══════════════════════════════════════════════════════════ -->
      <div v-if="activeTab === 'request' && canRequestCorrida" class="space-y-6">
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-5">Nuevo Viaje</h2>

          <form @submit.prevent="handleSubmitRequest" class="space-y-5">

            <!-- Origen -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Punto de Origen <span class="text-red-500">*</span>
              </label>
              <PlaceAutocomplete
                v-model="originPlace"
                placeholder="¿Desde dónde sales?"
                :show-geo="true"
                @selected="onOriginSelected"
              >
                <template #icon>
                  <span class="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-bold">A</span>
                </template>
              </PlaceAutocomplete>
            </div>

            <!-- Destino -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Destino <span class="text-red-500">*</span>
              </label>
              <PlaceAutocomplete
                v-model="destinationPlace"
                placeholder="¿A dónde vas?"
                @selected="onDestinationSelected"
              >
                <template #icon>
                  <span class="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center text-white text-xs font-bold">B</span>
                </template>
              </PlaceAutocomplete>
            </div>

            <!-- Tipo de Vehículo -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Vehículo <span class="text-red-500">*</span>
              </label>
              <div class="grid grid-cols-2 gap-3">
                <label
                  v-for="v in vehicleOptions"
                  :key="v.value"
                  :class="[
                    'flex items-center gap-3 border rounded-xl p-3 cursor-pointer transition-all',
                    vehicleType === v.value
                      ? 'border-red-500 bg-red-50'
                      : 'border-gray-200 hover:border-gray-300'
                  ]"
                >
                  <input
                    v-model="vehicleType"
                    type="radio"
                    :value="v.value"
                    class="hidden"
                  />
                  <span class="text-2xl">{{ v.icon }}</span>
                  <div>
                    <p class="text-sm font-medium text-gray-900">{{ v.label }}</p>
                    <p class="text-xs text-gray-500">{{ v.desc }}</p>
                  </div>
                  <div v-if="vehicleType === v.value" class="ml-auto">
                    <svg class="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                    </svg>
                  </div>
                </label>
              </div>
            </div>

            <!-- Notas -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Notas para el conductor
                <span class="text-gray-400 font-normal">(opcional)</span>
              </label>
              <textarea
                v-model="notes"
                rows="2"
                placeholder="Ej: Llevaré una maleta grande, portón verde..."
                class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
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
                  <div class="space-y-1">
                    <div class="flex items-center gap-2 text-sm text-gray-600">
                      <svg class="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                      </svg>
                      {{ priceEstimate.distance }} km
                    </div>
                    <div class="flex items-center gap-2 text-sm text-gray-600">
                      <svg class="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
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
                @click="recalculatePrice"
                :disabled="calculatingPrice || !canCalculate"
                class="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {{ calculatingPrice ? 'Calculando...' : 'Recalcular Precio' }}
              </button>
              <button
                type="submit"
                :disabled="loading || !priceEstimate || !canSubmit"
                class="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium"
              >
                <span v-if="loading">Solicitando...</span>
                <span v-else>Solicitar Viaje</span>
              </button>
            </div>

          </form>
        </div>

        <!-- Corrida activa en curso -->
        <div v-if="activeCorrida && hasActiveCorrida" class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-semibold text-gray-900">Viaje en Progreso</h2>
            <span :class="statusBadgeClass(activeCorrida.status)" class="px-3 py-1 rounded-full text-xs font-medium">
              {{ statusText(activeCorrida.status) }}
            </span>
          </div>

          <!-- Ruta visual -->
          <div class="relative pl-6 space-y-4">
            <div class="absolute left-2.5 top-3 bottom-3 w-0.5 bg-gray-200"></div>
            <div class="flex items-start gap-3">
              <div class="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 relative z-10">A</div>
              <div>
                <p class="text-xs text-gray-400">Origen</p>
                <p class="text-sm font-medium text-gray-900">{{ activeCorrida.origin }}</p>
              </div>
            </div>
            <div class="flex items-start gap-3">
              <div class="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 relative z-10">B</div>
              <div>
                <p class="text-xs text-gray-400">Destino</p>
                <p class="text-sm font-medium text-gray-900">{{ activeCorrida.destination }}</p>
              </div>
            </div>
          </div>

          <!-- Info conductor -->
          <div v-if="activeCorrida.driverName" class="mt-4 pt-4 border-t border-gray-100 flex items-center gap-3">
            <div class="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <svg class="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
              </svg>
            </div>
            <div>
              <p class="text-sm font-semibold text-gray-900">{{ activeCorrida.driverName }}</p>
              <p class="text-sm text-gray-500">{{ activeCorrida.driverPhone }}</p>
            </div>
            <div class="ml-auto text-right">
              <p class="text-lg font-bold text-red-600">${{ activeCorrida.price }}</p>
            </div>
          </div>

          <div v-if="activeCorrida.status === 'PENDING'" class="mt-4">
            <button
              @click="handleCancel(activeCorrida.id)"
              :disabled="cancelling"
              class="w-full px-4 py-2 border border-red-300 text-red-700 rounded-xl hover:bg-red-50 disabled:opacity-50 text-sm font-medium transition-colors"
            >
              {{ cancelling ? 'Cancelando...' : 'Cancelar Viaje' }}
            </button>
          </div>
        </div>
      </div>

      <!-- ═══════════════════════════════════════════════════════════ -->
      <!--  TAB: Corridas Disponibles (conductor)                     -->
      <!-- ═══════════════════════════════════════════════════════════ -->
      <div v-if="activeTab === 'available' && canManageCorridas" class="space-y-4">
        <div class="flex justify-between items-center">
          <p class="text-gray-600">Corridas disponibles cerca de ti</p>
          <button @click="refreshAvailable" :disabled="loading"
            class="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 flex items-center gap-1.5">
            <svg class="w-4 h-4" :class="{ 'animate-spin': loading }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            Actualizar
          </button>
        </div>

        <div v-if="availableCorridas.length === 0 && !loading" class="text-center py-16 bg-white rounded-xl border border-gray-200">
          <svg class="w-14 h-14 mx-auto mb-3 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0021 18.382V7.618a1 1 0 00-.447-.894L15 9m0 13V9"/>
          </svg>
          <p class="text-gray-400 font-medium">No hay corridas disponibles</p>
          <p class="text-gray-400 text-sm mt-1">Vuelve a intentar en unos minutos</p>
        </div>

        <div v-else class="grid gap-4">
          <div
            v-for="corrida in availableCorridas"
            :key="corrida.id"
            class="bg-white rounded-xl shadow-sm border border-gray-200 p-5"
          >
            <div class="flex justify-between items-start mb-4">
              <div class="flex items-center gap-2">
                <span class="px-2.5 py-1 bg-gray-100 rounded-lg text-xs font-medium text-gray-700">
                  {{ corrida.vehicleType === 'MOTO' ? '🏍️ Moto' : '🚗 Auto' }}
                </span>
              </div>
              <div class="text-right">
                <p class="text-xl font-bold text-red-600">${{ corrida.price ?? '--' }}</p>
                <p class="text-xs text-gray-400">{{ timeAgo(corrida.createdAt) }}</p>
              </div>
            </div>

            <div class="relative pl-5 space-y-3 mb-4">
              <div class="absolute left-2 top-2 bottom-2 w-0.5 bg-gray-200"></div>
              <div class="flex items-start gap-3">
                <span class="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center text-white text-xs flex-shrink-0 relative z-10">A</span>
                <p class="text-sm text-gray-700 leading-snug">{{ corrida.origin }}</p>
              </div>
              <div class="flex items-start gap-3">
                <span class="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-white text-xs flex-shrink-0 relative z-10">B</span>
                <p class="text-sm text-gray-700 leading-snug">{{ corrida.destination }}</p>
              </div>
            </div>

            <div v-if="corrida.distance || corrida.duration" class="flex gap-4 mb-4 text-xs text-gray-500">
              <span v-if="corrida.distance">📍 {{ corrida.distance }} km</span>
              <span v-if="corrida.duration">⏱ ~{{ corrida.duration }} min</span>
            </div>

            <button
              @click="handleAccept(corrida.id)"
              :disabled="acceptingId === corrida.id"
              class="w-full px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50 transition-colors text-sm font-medium"
            >
              {{ acceptingId === corrida.id ? 'Aceptando...' : 'Aceptar Viaje' }}
            </button>
          </div>
        </div>
      </div>

      <!-- ═══════════════════════════════════════════════════════════ -->
      <!--  TAB: Historial                                            -->
      <!-- ═══════════════════════════════════════════════════════════ -->
      <div v-if="activeTab === 'history'" class="space-y-4">
        <div class="flex justify-between items-center">
          <p class="text-gray-600">{{ historySubtitle }}</p>
          <button @click="refreshHistory" :disabled="loading"
            class="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 flex items-center gap-1.5">
            <svg class="w-4 h-4" :class="{ 'animate-spin': loading }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            Actualizar
          </button>
        </div>

        <div v-if="historyList.length === 0 && !loading" class="text-center py-16 bg-white rounded-xl border border-gray-200">
          <svg class="w-14 h-14 mx-auto mb-3 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <p class="text-gray-400 font-medium">No tienes viajes registrados</p>
        </div>

        <div v-else class="grid gap-4">
          <div
            v-for="corrida in historyList"
            :key="corrida.id"
            class="bg-white rounded-xl shadow-sm border border-gray-200 p-5"
          >
            <div class="flex justify-between items-start mb-3">
              <div class="flex items-center gap-2 flex-wrap">
                <span :class="statusBadgeClass(corrida.status)" class="px-2.5 py-1 rounded-lg text-xs font-medium">
                  {{ statusText(corrida.status) }}
                </span>
                <span class="px-2.5 py-1 bg-gray-100 rounded-lg text-xs text-gray-600">
                  {{ corrida.vehicleType === 'MOTO' ? '🏍️ Moto' : '🚗 Auto' }}
                </span>
              </div>
              <p class="text-lg font-bold text-red-600">${{ corrida.price ?? '--' }}</p>
            </div>

            <div class="relative pl-5 space-y-2.5">
              <div class="absolute left-2 top-2 bottom-2 w-0.5 bg-gray-200"></div>
              <div class="flex items-start gap-3">
                <span class="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center text-white text-xs flex-shrink-0 relative z-10">A</span>
                <p class="text-sm text-gray-700 leading-snug">{{ corrida.origin }}</p>
              </div>
              <div class="flex items-start gap-3">
                <span class="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-white text-xs flex-shrink-0 relative z-10">B</span>
                <p class="text-sm text-gray-700 leading-snug">{{ corrida.destination }}</p>
              </div>
            </div>

            <div class="mt-3 pt-3 border-t border-gray-100 flex justify-between items-center text-xs text-gray-400">
              <span>{{ formatDate(corrida.createdAt) }}</span>
              <span v-if="corrida.driverName && !canManageCorridas">Conductor: {{ corrida.driverName }}</span>
              <span v-if="corrida.passengerName && canManageCorridas">Pasajero: {{ corrida.passengerName }}</span>
            </div>

            <!-- Acciones conductor -->
            <div v-if="canManageCorridas && (corrida.status === 'ACCEPTED' || corrida.status === 'IN_PROGRESS')" class="mt-3 flex gap-2">
              <button
                v-if="corrida.status === 'ACCEPTED'"
                @click="handleUpdateStatus(corrida.id, 'IN_PROGRESS')"
                :disabled="updatingId === corrida.id"
                class="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-xl hover:bg-blue-700 disabled:opacity-50 font-medium"
              >Iniciar Viaje</button>
              <button
                v-if="corrida.status === 'IN_PROGRESS'"
                @click="handleUpdateStatus(corrida.id, 'COMPLETED')"
                :disabled="updatingId === corrida.id"
                class="flex-1 px-3 py-2 bg-green-600 text-white text-sm rounded-xl hover:bg-green-700 disabled:opacity-50 font-medium"
              >Completar Viaje</button>
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import type { PlaceSuggestion } from '~/composables/useNominatim'

definePageMeta({ middleware: 'auth' })

const {
  corridas, myCorridas, activeCorrida, loading, error,
  hasActiveCorrida, canRequestCorrida, canManageCorridas,
  fetchAvailableCorridas, fetchMyCorridas, fetchDriverCorridas,
  createCorrida, acceptCorrida, updateCorridaStatus, cancelCorrida,
  calculatePrice, clearError,
} = useCorridas()

const { reloadPermissions } = usePermissions()

// ─── Estado Local ─────────────────────────────────────────────────────────────
const activeTab = ref('request')
const calculatingPrice = ref(false)
const priceEstimate = ref<{ price: number; distance: number; duration: number } | null>(null)
const cancelling = ref(false)
const acceptingId = ref<string | null>(null)
const updatingId = ref<string | null>(null)

// Lugares seleccionados (con coordenadas)
const originPlace = ref<PlaceSuggestion | null>(null)
const destinationPlace = ref<PlaceSuggestion | null>(null)
const vehicleType = ref<'MOTO' | 'AUTO'>('MOTO')
const notes = ref('')

const vehicleOptions = [
  { value: 'MOTO', icon: '🏍️', label: 'Moto', desc: 'Más rápido' },
  { value: 'AUTO', icon: '🚗', label: 'Auto', desc: 'Más espacio' },
]

// ─── Computados ───────────────────────────────────────────────────────────────
const canCalculate = computed(() => !!originPlace.value && !!destinationPlace.value)
const canSubmit = computed(() => canCalculate.value && !!priceEstimate.value)

const availableCorridas = computed(() => corridas.value.filter(c => c.status === 'PENDING'))
const historyList = computed(() => canManageCorridas.value ? corridas.value : myCorridas.value)

const subtitleText = computed(() => {
  if (canManageCorridas.value && canRequestCorrida.value) return 'Solicita viajes o acepta corridas como conductor'
  if (canManageCorridas.value) return 'Gestiona corridas como conductor'
  return 'Solicita viajes rápidos y seguros'
})

const historySubtitle = computed(() =>
  canManageCorridas.value ? 'Tus asignaciones como conductor' : 'Tus viajes solicitados'
)

// Recalcular precio automáticamente cuando cambia vehicleType y hay lugares
watch(vehicleType, () => {
  if (canCalculate.value) autoCalculatePrice()
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusText(status: string): string {
  return ({ PENDING: 'Pendiente', ACCEPTED: 'Aceptado', IN_PROGRESS: 'En Progreso', COMPLETED: 'Completado', CANCELLED: 'Cancelado' })[status] ?? status
}

function statusBadgeClass(status: string): string {
  return ({
    PENDING: 'bg-yellow-100 text-yellow-800',
    ACCEPTED: 'bg-blue-100 text-blue-800',
    IN_PROGRESS: 'bg-indigo-100 text-indigo-800',
    COMPLETED: 'bg-green-100 text-green-800',
    CANCELLED: 'bg-red-100 text-red-800',
  })[status] ?? 'bg-gray-100 text-gray-800'
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function timeAgo(d: string) {
  const diff = Math.floor((Date.now() - new Date(d).getTime()) / 1000)
  if (diff < 60) return 'Hace un momento'
  if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `Hace ${Math.floor(diff / 3600)} h`
  return formatDate(d)
}

// ─── Eventos autocomplete ──────────────────────────────────────────────────────
function onOriginSelected(_: PlaceSuggestion) {
  priceEstimate.value = null
  if (destinationPlace.value) autoCalculatePrice()
}

function onDestinationSelected(_: PlaceSuggestion) {
  priceEstimate.value = null
  if (originPlace.value) autoCalculatePrice()
}

// ─── Precio ───────────────────────────────────────────────────────────────────
async function autoCalculatePrice() {
  if (!originPlace.value || !destinationPlace.value) return
  calculatingPrice.value = true
  priceEstimate.value = null
  try {
    priceEstimate.value = await calculatePrice(
      originPlace.value.lat,
      originPlace.value.lng,
      destinationPlace.value.lat,
      destinationPlace.value.lng,
      vehicleType.value
    )
  } catch {
    // silencioso — el error se muestra en el banner global
  } finally {
    calculatingPrice.value = false
  }
}

async function recalculatePrice() {
  priceEstimate.value = null
  await autoCalculatePrice()
}

// ─── Submit ───────────────────────────────────────────────────────────────────
async function handleSubmitRequest() {
  if (!originPlace.value || !destinationPlace.value) return
  if (!priceEstimate.value) {
    await autoCalculatePrice()
    if (!priceEstimate.value) return
  }

  try {
    await createCorrida({
      origin: originPlace.value.label,
      destination: destinationPlace.value.label,
      originLat: originPlace.value.lat,
      originLng: originPlace.value.lng,
      destinationLat: destinationPlace.value.lat,
      destinationLng: destinationPlace.value.lng,
      vehicleType: vehicleType.value,
      notes: notes.value,
    })
    // Reset
    originPlace.value = null
    destinationPlace.value = null
    notes.value = ''
    priceEstimate.value = null
    activeTab.value = 'history'
    refreshHistory()
  } catch {
    // error se muestra en banner
  }
}

// ─── Acciones ─────────────────────────────────────────────────────────────────
async function handleCancel(id: string) {
  if (!confirm('¿Cancelar este viaje?')) return
  cancelling.value = true
  try { await cancelCorrida(id) } finally { cancelling.value = false }
}

async function handleAccept(id: string) {
  acceptingId.value = id
  try {
    await acceptCorrida(id)
    await refreshAvailable()
    activeTab.value = 'history'
  } finally { acceptingId.value = null }
}

async function handleUpdateStatus(id: string, status: 'IN_PROGRESS' | 'COMPLETED') {
  updatingId.value = id
  try {
    await updateCorridaStatus(id, status)
    await refreshHistory()
  } finally { updatingId.value = null }
}

async function refreshAvailable() {
  try { await fetchAvailableCorridas() } catch {}
}

async function refreshHistory() {
  try {
    if (canManageCorridas.value) await fetchDriverCorridas()
    else await fetchMyCorridas()
  } catch {}
}

// ─── Ciclo de Vida ────────────────────────────────────────────────────────────
onMounted(async () => {
  await reloadPermissions()
  if (!canRequestCorrida.value && canManageCorridas.value) activeTab.value = 'available'
  refreshHistory()
  if (canManageCorridas.value) refreshAvailable()
})
</script>
