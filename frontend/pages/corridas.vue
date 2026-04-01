<template>
  <div class="min-h-screen bg-gray-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900">Corridas</h1>
        <p class="mt-2 text-gray-600">
          {{ subtitleText }}
        </p>
      </div>

      <!-- Error -->
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
            :class="[
              activeTab === 'request'
                ? 'border-red-500 text-red-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
              'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm'
            ]"
          >
            Solicitar Viaje
          </button>
          <button
            v-if="canManageCorridas"
            @click="activeTab = 'available'"
            :class="[
              activeTab === 'available'
                ? 'border-red-500 text-red-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
              'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm'
            ]"
          >
            Corridas Disponibles
          </button>
          <button
            @click="activeTab = 'history'"
            :class="[
              activeTab === 'history'
                ? 'border-red-500 text-red-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
              'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm'
            ]"
          >
            {{ canManageCorridas ? 'Mis Asignaciones' : 'Mis Viajes' }}
          </button>
        </nav>
      </div>

      <!-- Solicitar Viaje Tab -->
      <div v-if="activeTab === 'request' && canRequestCorrida" class="space-y-6">
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">Nuevo Viaje</h2>
          
          <form @submit.prevent="handleSubmitRequest" class="space-y-4">
            <!-- Origen -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Punto de Origen <span class="text-red-500">*</span>
              </label>
              <input
                v-model="requestForm.origin"
                type="text"
                required
                placeholder="Ej: Av. Principal 123, Centro"
                class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
              />
            </div>

            <!-- Destino -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Destino <span class="text-red-500">*</span>
              </label>
              <input
                v-model="requestForm.destination"
                type="text"
                required
                placeholder="Ej: Calle Secundaria 456, Norte"
                class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
              />
            </div>

            <!-- Tipo de Vehículo -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Vehículo <span class="text-red-500">*</span>
              </label>
              <div class="flex gap-4">
                <label class="flex items-center">
                  <input
                    v-model="requestForm.vehicleType"
                    type="radio"
                    value="MOTO"
                    class="h-4 w-4 text-red-600 focus:ring-red-500"
                  />
                  <span class="ml-2 text-sm text-gray-700">🏍️ Moto (más rápido)</span>
                </label>
                <label class="flex items-center">
                  <input
                    v-model="requestForm.vehicleType"
                    type="radio"
                    value="AUTO"
                    class="h-4 w-4 text-red-600 focus:ring-red-500"
                  />
                  <span class="ml-2 text-sm text-gray-700">🚗 Auto (más espacio)</span>
                </label>
              </div>
            </div>

            <!-- Notas -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Notas para el conductor (opcional)
              </label>
              <textarea
                v-model="requestForm.notes"
                rows="2"
                placeholder="Ej: Llevaré una maleta grande, soy alérgico a perros..."
                class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
              />
            </div>

            <!-- Precio estimado -->
            <div v-if="priceEstimate" class="bg-gray-50 rounded-lg p-4">
              <div class="flex justify-between items-center">
                <div>
                  <p class="text-sm text-gray-600">Distancia: {{ priceEstimate.distance }} km</p>
                  <p class="text-sm text-gray-600">Duración estimada: {{ priceEstimate.duration }} min</p>
                </div>
                <div class="text-right">
                  <p class="text-2xl font-bold text-red-600">${{ priceEstimate.price }}</p>
                  <p class="text-xs text-gray-500">Precio estimado</p>
                </div>
              </div>
            </div>

            <!-- Botones -->
            <div class="flex gap-3">
              <button
                type="button"
                @click="calculateEstimatedPrice"
                :disabled="calculatingPrice || !isFormValid"
                class="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <span v-if="calculatingPrice">Calculando...</span>
                <span v-else>Calcular Precio</span>
              </button>
              <button
                type="submit"
                :disabled="loading || !priceEstimate"
                class="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <span v-if="loading">Solicitando...</span>
                <span v-else>Solicitar Viaje</span>
              </button>
            </div>
          </form>
        </div>

        <!-- Corrida Activa -->
        <div v-if="activeCorrida && hasActiveCorrida" class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-semibold text-gray-900">Viaje en Progreso</h2>
            <span
              :class="{
                'bg-yellow-100 text-yellow-800': activeCorrida.status === 'PENDING',
                'bg-blue-100 text-blue-800': activeCorrida.status === 'ACCEPTED',
                'bg-green-100 text-green-800': activeCorrida.status === 'IN_PROGRESS',
              }"
              class="px-3 py-1 rounded-full text-xs font-medium"
            >
              {{ statusText(activeCorrida.status) }}
            </span>
          </div>

          <div class="space-y-3">
            <div class="flex items-start gap-3">
              <div class="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span class="text-green-600 text-xs">A</span>
              </div>
              <div>
                <p class="text-sm font-medium text-gray-900">Origen</p>
                <p class="text-sm text-gray-600">{{ activeCorrida.origin }}</p>
              </div>
            </div>
            <div class="flex items-start gap-3">
              <div class="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span class="text-red-600 text-xs">B</span>
              </div>
              <div>
                <p class="text-sm font-medium text-gray-900">Destino</p>
                <p class="text-sm text-gray-600">{{ activeCorrida.destination }}</p>
              </div>
            </div>

            <!-- Info del conductor si está asignado -->
            <div v-if="activeCorrida.driverName" class="mt-4 pt-4 border-t border-gray-100">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                  <svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                  </svg>
                </div>
                <div>
                  <p class="text-sm font-medium text-gray-900">{{ activeCorrida.driverName }}</p>
                  <p class="text-sm text-gray-600">{{ activeCorrida.driverPhone }}</p>
                </div>
              </div>
            </div>
          </div>

          <div class="mt-6 flex gap-3">
            <button
              v-if="activeCorrida.status === 'PENDING'"
              @click="handleCancel(activeCorrida.id)"
              :disabled="cancelling"
              class="flex-1 px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 disabled:opacity-50"
            >
              {{ cancelling ? 'Cancelando...' : 'Cancelar Viaje' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Corridas Disponibles Tab (Driver) -->
      <div v-if="activeTab === 'available' && canManageCorridas" class="space-y-4">
        <div class="flex justify-between items-center">
          <p class="text-gray-600">Corrida disponibles cerca de ti</p>
          <button
            @click="refreshAvailable"
            :disabled="loading"
            class="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <svg class="w-4 h-4 inline mr-1" :class="{ 'animate-spin': loading }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            Actualizar
          </button>
        </div>

        <div v-if="corridas.length === 0 && !loading" class="text-center py-12 bg-white rounded-xl border border-gray-200">
          <svg class="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0121 18.382V7.618a1 1 0 01-.447-.894L15 9m0 13V9"/>
          </svg>
          <p class="text-gray-500">No hay corridas disponibles en este momento</p>
        </div>

        <div v-else class="grid gap-4">
          <div
            v-for="corrida in availableCorridas"
            :key="corrida.id"
            class="bg-white rounded-xl shadow-sm border border-gray-200 p-4"
          >
            <div class="flex justify-between items-start mb-3">
              <div class="flex items-center gap-2">
                <span class="px-2 py-1 bg-gray-100 rounded text-xs font-medium text-gray-700">
                  {{ corrida.vehicleType === 'MOTO' ? '🏍️ Moto' : '🚗 Auto' }}
                </span>
                <span v-if="corrida.price" class="text-sm font-semibold text-red-600">
                  ${{ corrida.price }}
                </span>
              </div>
              <span class="text-xs text-gray-500">{{ timeAgo(corrida.createdAt) }}</span>
            </div>

            <div class="space-y-2 mb-4">
              <div class="flex items-start gap-2">
                <span class="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center text-xs text-green-600 flex-shrink-0">A</span>
                <p class="text-sm text-gray-700">{{ corrida.origin }}</p>
              </div>
              <div class="flex items-start gap-2">
                <span class="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center text-xs text-red-600 flex-shrink-0">B</span>
                <p class="text-sm text-gray-700">{{ corrida.destination }}</p>
              </div>
            </div>

            <button
              @click="handleAccept(corrida.id)"
              :disabled="acceptingId === corrida.id"
              class="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {{ acceptingId === corrida.id ? 'Aceptando...' : 'Aceptar Viaje' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Historial Tab -->
      <div v-if="activeTab === 'history'" class="space-y-4">
        <div class="flex justify-between items-center">
          <p class="text-gray-600">{{ historySubtitle }}</p>
          <button
            @click="refreshHistory"
            :disabled="loading"
            class="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <svg class="w-4 h-4 inline mr-1" :class="{ 'animate-spin': loading }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            Actualizar
          </button>
        </div>

        <div v-if="(canManageCorridas ? corridas : myCorridas).length === 0 && !loading" class="text-center py-12 bg-white rounded-xl border border-gray-200">
          <svg class="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <p class="text-gray-500">No tienes viajes registrados</p>
        </div>

        <div v-else class="grid gap-4">
          <div
            v-for="corrida in (canManageCorridas ? corridas : myCorridas)"
            :key="corrida.id"
            class="bg-white rounded-xl shadow-sm border border-gray-200 p-4"
          >
            <div class="flex justify-between items-start mb-3">
              <div class="flex items-center gap-2">
                <span
                  :class="{
                    'bg-green-100 text-green-800': corrida.status === 'COMPLETED',
                    'bg-red-100 text-red-800': corrida.status === 'CANCELLED',
                    'bg-blue-100 text-blue-800': corrida.status === 'IN_PROGRESS',
                    'bg-yellow-100 text-yellow-800': corrida.status === 'PENDING',
                    'bg-purple-100 text-purple-800': corrida.status === 'ACCEPTED',
                  }"
                  class="px-2 py-1 rounded text-xs font-medium"
                >
                  {{ statusText(corrida.status) }}
                </span>
                <span class="px-2 py-1 bg-gray-100 rounded text-xs text-gray-600">
                  {{ corrida.vehicleType === 'MOTO' ? '🏍️ Moto' : '🚗 Auto' }}
                </span>
              </div>
              <span class="text-sm font-semibold text-red-600">
                ${{ corrida.price || '--' }}
              </span>
            </div>

            <div class="space-y-2">
              <div class="flex items-start gap-2">
                <span class="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center text-xs text-green-600 flex-shrink-0">A</span>
                <p class="text-sm text-gray-700">{{ corrida.origin }}</p>
              </div>
              <div class="flex items-start gap-2">
                <span class="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center text-xs text-red-600 flex-shrink-0">B</span>
                <p class="text-sm text-gray-700">{{ corrida.destination }}</p>
              </div>
            </div>

            <div class="mt-3 pt-3 border-t border-gray-100 flex justify-between items-center text-xs text-gray-500">
              <span>{{ formatDate(corrida.createdAt) }}</span>
              <span v-if="corrida.driverName && !canManageCorridas">
                Conductor: {{ corrida.driverName }}
              </span>
              <span v-if="corrida.passengerName && canManageCorridas">
                Pasajero: {{ corrida.passengerName }}
              </span>
            </div>

            <!-- Botones de acción para conductor -->
            <div v-if="canManageCorridas && (corrida.status === 'ACCEPTED' || corrida.status === 'IN_PROGRESS')" class="mt-3 flex gap-2">
              <button
                v-if="corrida.status === 'ACCEPTED'"
                @click="handleUpdateStatus(corrida.id, 'IN_PROGRESS')"
                :disabled="updatingId === corrida.id"
                class="flex-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Iniciar Viaje
              </button>
              <button
                v-if="corrida.status === 'IN_PROGRESS'"
                @click="handleUpdateStatus(corrida.id, 'COMPLETED')"
                :disabled="updatingId === corrida.id"
                class="flex-1 px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                Completar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

definePageMeta({ middleware: 'auth' })

const {
  corridas,
  myCorridas,
  activeCorrida,
  loading,
  error,
  hasActiveCorrida,
  canRequestCorrida,
  canManageCorridas,
  fetchAvailableCorridas,
  fetchMyCorridas,
  fetchDriverCorridas,
  createCorrida,
  acceptCorrida,
  updateCorridaStatus,
  cancelCorrida,
  calculatePrice,
  clearError,
} = useCorridas()

const { user } = useAuth()
const role = computed(() => user.value?.role)

// ─── Estado Local ────────────────────────────────────────────────────────────
const activeTab = ref('request')
const calculatingPrice = ref(false)
const priceEstimate = ref<{ price: number; distance: number; duration: number } | null>(null)
const cancelling = ref(false)
const acceptingId = ref<string | null>(null)
const updatingId = ref<string | null>(null)

const requestForm = ref({
  origin: '',
  destination: '',
  originLat: undefined as number | undefined,
  originLng: undefined as number | undefined,
  destinationLat: undefined as number | undefined,
  destinationLng: undefined as number | undefined,
  vehicleType: 'MOTO' as 'MOTO' | 'AUTO',
  notes: '',
})

// ─── Computados ───────────────────────────────────────────────────────────────
const isFormValid = computed(() => {
  return requestForm.value.origin && requestForm.value.destination
})

const subtitleText = computed(() => {
  if (canManageCorridas.value && canRequestCorrida.value) {
    return 'Solicita viajes o acepta corridas como conductor'
  } else if (canManageCorridas.value) {
    return 'Gestiona corridas como conductor'
  } else {
    return 'Solicita viajes rápidos y seguros'
  }
})

const historySubtitle = computed(() => {
  return canManageCorridas.value ? 'Tus asignaciones como conductor' : 'Tus viajes solicitados'
})

const availableCorridas = computed(() => {
  return corridas.value.filter(c => c.status === 'PENDING')
})

// ─── Métodos ──────────────────────────────────────────────────────────────────

function statusText(status: string): string {
  const statusMap: Record<string, string> = {
    PENDING: 'Pendiente',
    ACCEPTED: 'Aceptado',
    IN_PROGRESS: 'En Progreso',
    COMPLETED: 'Completado',
    CANCELLED: 'Cancelado',
  }
  return statusMap[status] || status
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function timeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000)
  
  if (diff < 60) return 'Hace un momento'
  if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `Hace ${Math.floor(diff / 3600)} h`
  return formatDate(dateString)
}

async function calculateEstimatedPrice() {
  if (!isFormValid.value) return
  
  calculatingPrice.value = true
  try {
    // Simulación de cálculo - en producción usar coordenadas reales
    const originLat = requestForm.value.originLat || -34.6037
    const originLng = requestForm.value.originLng || -58.3816
    const destLat = requestForm.value.destinationLat || -34.6158
    const destLng = requestForm.value.destinationLng || -58.4359
    
    const estimate = await calculatePrice(
      originLat,
      originLng,
      destLat,
      destLng,
      requestForm.value.vehicleType
    )
    priceEstimate.value = estimate
  } catch (e) {
    console.error('Error calculando precio:', e)
  } finally {
    calculatingPrice.value = false
  }
}

async function handleSubmitRequest() {
  if (!priceEstimate.value) {
    await calculateEstimatedPrice()
    if (!priceEstimate.value) return
  }

  try {
    await createCorrida({
      origin: requestForm.value.origin,
      destination: requestForm.value.destination,
      originLat: requestForm.value.originLat,
      originLng: requestForm.value.originLng,
      destinationLat: requestForm.value.destinationLat,
      destinationLng: requestForm.value.destinationLng,
      vehicleType: requestForm.value.vehicleType,
      notes: requestForm.value.notes,
    })
    
    // Limpiar formulario
    requestForm.value = {
      origin: '',
      destination: '',
      originLat: undefined,
      originLng: undefined,
      destinationLat: undefined,
      destinationLng: undefined,
      vehicleType: 'MOTO',
      notes: '',
    }
    priceEstimate.value = null
    
    // Cambiar a historial
    activeTab.value = 'history'
    refreshHistory()
  } catch (e) {
    console.error('Error solicitando viaje:', e)
  }
}

async function handleCancel(corridaId: string) {
  if (!confirm('¿Estás seguro de cancelar este viaje?')) return
  
  cancelling.value = true
  try {
    await cancelCorrida(corridaId)
  } catch (e) {
    console.error('Error cancelando:', e)
  } finally {
    cancelling.value = false
  }
}

async function handleAccept(corridaId: string) {
  acceptingId.value = corridaId
  try {
    await acceptCorrida(corridaId)
    await refreshAvailable()
    activeTab.value = 'history'
  } catch (e) {
    console.error('Error aceptando:', e)
  } finally {
    acceptingId.value = null
  }
}

async function handleUpdateStatus(corridaId: string, status: 'IN_PROGRESS' | 'COMPLETED') {
  updatingId.value = corridaId
  try {
    await updateCorridaStatus(corridaId, status)
    await refreshHistory()
  } catch (e) {
    console.error('Error actualizando estado:', e)
  } finally {
    updatingId.value = null
  }
}

async function refreshAvailable() {
  try {
    await fetchAvailableCorridas()
  } catch (e) {
    console.error('Error cargando disponibles:', e)
  }
}

async function refreshHistory() {
  try {
    if (canManageCorridas.value) {
      await fetchDriverCorridas()
    } else {
      await fetchMyCorridas()
    }
  } catch (e) {
    console.error('Error cargando historial:', e)
  }
}

// ─── Ciclo de Vida ───────────────────────────────────────────────────────────
onMounted(() => {
  // Determinar tab inicial según permisos
  if (!canRequestCorrida.value && canManageCorridas.value) {
    activeTab.value = 'available'
  }
  
  // Cargar datos iniciales
  refreshHistory()
  if (canManageCorridas.value) {
    refreshAvailable()
  }
})
</script>
