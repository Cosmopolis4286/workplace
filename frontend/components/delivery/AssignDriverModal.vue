<template>
  <Teleport to="body">
    <Transition enter-active-class="ease-out duration-200" enter-from-class="opacity-0" enter-to-class="opacity-100"
      leave-active-class="ease-in duration-150" leave-from-class="opacity-100" leave-to-class="opacity-0">
      <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center p-4" @click.self="$emit('close')">
        <div class="absolute inset-0 bg-black/40" @click="$emit('close')" />
        <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-base font-semibold text-gray-900">Asignar Repartidor</h3>
            <button class="p-1 text-gray-400 hover:text-gray-600 rounded-lg" @click="$emit('close')"><XMarkIcon class="h-5 w-5" /></button>
          </div>
          <p class="text-sm text-gray-500 mb-4">Orden <strong>{{ delivery?.orderNumber }}</strong> → {{ delivery?.customerName }}</p>
          <div class="space-y-2 mb-4 max-h-60 overflow-y-auto">
            <button
              v-for="driver in drivers"
              :key="driver.id"
              class="w-full flex items-center gap-3 p-3 border border-gray-100 rounded-xl hover:border-red-300 hover:bg-red-50 transition-colors text-left"
              @click="$emit('assign', driver.id)"
            >
              <div class="h-9 w-9 rounded-full bg-red-100 flex items-center justify-center font-bold text-sm text-red-700 flex-shrink-0">
                {{ driver.name.charAt(0) }}
              </div>
              <div>
                <p class="text-sm font-medium text-gray-900">{{ driver.name }}</p>
                <p class="text-xs text-gray-500">{{ VEHICLE_LABELS[driver.vehicleType] }} · <span class="badge px-1" :class="DRIVER_STATUS_CLASSES[driver.status]">{{ DRIVER_STATUS_LABELS[driver.status] }}</span></p>
              </div>
            </button>
            <p v-if="drivers.length === 0" class="text-center text-sm text-gray-400 py-4">No hay repartidores disponibles</p>
          </div>
          <button class="btn-secondary w-full" @click="$emit('close')">Cancelar</button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { XMarkIcon } from '@heroicons/vue/24/outline'
import {
  DRIVER_STATUS_LABELS, DRIVER_STATUS_CLASSES, VEHICLE_LABELS,
  type Driver, type Delivery,
} from '~/composables/delivery/useDelivery'

defineProps<{
  show: boolean
  delivery: Delivery | null
  drivers: Driver[]
}>()

defineEmits<{
  close: []
  assign: [driverId: string]
}>()
</script>
