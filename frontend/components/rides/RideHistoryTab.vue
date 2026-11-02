<template>
  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

    <div class="lg:col-span-2 space-y-4">
      <div class="flex items-center justify-between">
        <p class="text-sm text-gray-500">{{ subtitle }}</p>
        <button @click="$emit('refresh')" :disabled="loading" class="btn-secondary text-sm flex items-center gap-1.5">
          <ArrowPathIcon class="w-4 h-4" :class="{ 'animate-spin': loading }" />
          Actualizar
        </button>
      </div>

      <div class="card divide-y divide-gray-100">
        <!-- Skeleton -->
        <template v-if="loading">
          <div v-for="n in 4" :key="n" class="p-4 flex items-center gap-4">
            <div class="skeleton h-10 w-10 rounded-full flex-shrink-0" />
            <div class="flex-1 space-y-2">
              <div class="skeleton h-4 w-40 rounded" />
              <div class="skeleton h-3 w-56 rounded" />
            </div>
            <div class="skeleton h-6 w-16 rounded" />
          </div>
        </template>

        <div v-else-if="rides.length === 0" class="p-12 text-center">
          <ClockIcon class="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p class="text-gray-500 font-medium">No tienes viajes registrados</p>
        </div>

        <template v-else>
          <div v-for="corrida in rides" :key="corrida.id" class="p-4 hover:bg-gray-50 transition-colors">
            <div class="flex items-start gap-4">
              <!-- Icono estado -->
              <div
                class="h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0"
                :class="{
                  'bg-yellow-100': corrida.status === 'PENDING',
                  'bg-blue-100':   corrida.status === 'ACCEPTED',
                  'bg-indigo-100': corrida.status === 'IN_PROGRESS',
                  'bg-green-100':  corrida.status === 'COMPLETED',
                  'bg-red-100':    corrida.status === 'CANCELLED',
                }"
              >
                <span class="text-lg">{{ vehicleEmoji(corrida.vehicleType) }}</span>
              </div>

              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 flex-wrap mb-0.5">
                  <span class="badge" :class="statusBadgeClass(corrida.status)">
                    {{ statusText(corrida.status) }}
                  </span>
                  <span v-if="corrida.serviceType === 'FREIGHT'" class="badge bg-amber-100 text-amber-800">📦 Flete</span>
                  <span v-if="corrida.driverName && !isDriver" class="text-xs text-gray-400">
                    {{ corrida.serviceType === 'FREIGHT' ? 'Transportista' : 'Conductor' }}: {{ corrida.driverName }}
                  </span>
                  <span v-if="corrida.passengerName && isDriver" class="text-xs text-gray-400">
                    {{ corrida.serviceType === 'FREIGHT' ? 'Remitente' : 'Pasajero' }}: {{ corrida.passengerName }}
                  </span>
                </div>
                <div class="text-xs text-gray-500 mt-1 space-y-0.5">
                  <p class="flex items-center gap-1.5">
                    <span class="w-3 h-3 bg-green-500 rounded-full inline-block flex-shrink-0"></span>
                    {{ corrida.origin }}
                  </p>
                  <p class="flex items-center gap-1.5">
                    <span class="w-3 h-3 bg-red-500 rounded-full inline-block flex-shrink-0"></span>
                    {{ corrida.destination }}
                  </p>
                </div>
                <p v-if="corrida.serviceType === 'FREIGHT' && corrida.recipientName" class="text-[10px] text-gray-400 mt-1">
                  Destinatario: {{ corrida.recipientName }}
                </p>
                <p class="text-[10px] text-gray-400 mt-1.5">{{ formatDate(corrida.createdAt) }}</p>
              </div>

              <div class="flex-shrink-0 text-right space-y-2">
                <p class="font-bold text-gray-900">${{ corrida.price ?? '--' }}</p>
                <p v-if="isDriver && corrida.platformFeePayer === 'PROVIDER' && corrida.platformFeeAmount" class="text-[10px] text-amber-600">
                  -${{ corrida.platformFeeAmount.toFixed(2) }} comisión
                </p>

                <!-- Código de entrega del envío: solo lo ve el remitente -->
                <p v-if="!isDriver && corrida.deliveryCode && ['PENDING','ACCEPTED','IN_PROGRESS'].includes(corrida.status)" class="text-[11px] text-emerald-700">
                  Código para quien recibe: <span class="font-mono font-bold tracking-widest">{{ corrida.deliveryCode }}</span>
                </p>
                <p v-if="corrida.status === 'CANCELLED' && corrida.cancelReason" class="text-[10px] text-gray-400">
                  "{{ corrida.cancelReason }}"
                </p>

                <!-- Acciones pasajero -->
                <button
                  v-if="!isDriver && (corrida.status === 'PENDING' || corrida.status === 'ACCEPTED')"
                  @click="$emit('cancel', corrida.id)"
                  class="text-xs text-red-600 hover:underline"
                >Cancelar</button>

                <!-- Acciones conductor -->
                <div v-if="isDriver && (corrida.status === 'ACCEPTED' || corrida.status === 'IN_PROGRESS')" class="flex gap-1">
                  <button
                    v-if="corrida.status === 'ACCEPTED'"
                    @click="$emit('update-status', corrida.id, 'IN_PROGRESS')"
                    :disabled="updatingId === corrida.id"
                    class="text-xs px-2 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
                  >Iniciar</button>
                  <button
                    v-if="corrida.status === 'ACCEPTED'"
                    @click="$emit('driver-cancel', corrida.id)"
                    :disabled="updatingId === corrida.id"
                    class="text-xs px-2 py-1 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 disabled:opacity-50 font-medium"
                  >Soltar</button>
                  <button
                    v-if="corrida.status === 'IN_PROGRESS'"
                    @click="$emit('update-status', corrida.id, 'COMPLETED')"
                    :disabled="updatingId === corrida.id"
                    class="text-xs px-2 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
                  >Completar</button>
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>

    <!-- Sidebar historial -->
    <div class="space-y-4">
      <div class="card p-5">
        <h3 class="text-sm font-semibold text-gray-700 mb-4">Resumen</h3>
        <div class="space-y-3">
          <div v-for="s in summary" :key="s.status" class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="w-2 h-2 rounded-full flex-shrink-0" :class="s.dot" />
              <span class="text-sm text-gray-600">{{ s.label }}</span>
            </div>
            <span class="text-sm font-bold text-gray-900">{{ s.count }}</span>
          </div>
        </div>
      </div>

      <div v-if="totalEarnings > 0 || isDriver" class="card p-5 border-l-4 border-l-red-400">
        <p class="text-xs text-gray-500 mb-1">{{ isDriver ? 'Ingresos totales' : 'Total gastado' }}</p>
        <p class="text-2xl font-black text-red-600">${{ formatPrice(totalEarnings) }}</p>
        <p class="text-xs text-gray-400 mt-1">en {{ rides.length }} viaje{{ rides.length !== 1 ? 's' : '' }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ArrowPathIcon, ClockIcon } from '@heroicons/vue/24/outline'
import type { Ride } from '~/composables/delivery/useRides'
import { useRideHelpers } from '~/composables/delivery/useRideHelpers'

const props = defineProps<{
  rides: Ride[]
  loading: boolean
  isDriver: boolean
  subtitle: string
  updatingId: string | null
}>()

defineEmits<{
  refresh: []
  cancel: [id: string]
  'update-status': [id: string, status: 'IN_PROGRESS' | 'COMPLETED']
  'driver-cancel': [id: string]
}>()

const { vehicleEmoji, statusText, statusBadgeClass, formatDate, formatPrice } = useRideHelpers()

const totalEarnings = computed(() =>
  props.rides.reduce((sum, c) => sum + (c.status === 'COMPLETED' ? (c.price ?? 0) : 0), 0)
)

const summary = computed(() => [
  { status: 'PENDING',     label: 'Pendientes',   count: props.rides.filter(c => c.status === 'PENDING').length,     dot: 'bg-yellow-400' },
  { status: 'ACCEPTED',    label: 'Aceptados',    count: props.rides.filter(c => c.status === 'ACCEPTED').length,    dot: 'bg-blue-400'   },
  { status: 'IN_PROGRESS', label: 'En progreso',  count: props.rides.filter(c => c.status === 'IN_PROGRESS').length, dot: 'bg-indigo-400' },
  { status: 'COMPLETED',   label: 'Completados',  count: props.rides.filter(c => c.status === 'COMPLETED').length,   dot: 'bg-green-400'  },
  { status: 'CANCELLED',   label: 'Cancelados',   count: props.rides.filter(c => c.status === 'CANCELLED').length,   dot: 'bg-red-400'    },
])
</script>
