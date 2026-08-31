<template>
  <Teleport to="body">
    <Transition enter-active-class="ease-out duration-200" enter-from-class="opacity-0" enter-to-class="opacity-100"
      leave-active-class="ease-in duration-150" leave-from-class="opacity-100" leave-to-class="opacity-0">
      <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center p-4" @click.self="$emit('close')">
        <div class="absolute inset-0 bg-black/40" @click="$emit('close')" />
        <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
          <div class="flex items-center justify-between mb-5">
            <h3 class="text-base font-semibold text-gray-900">{{ editing ? 'Editar Entrega' : 'Nueva Entrega' }}</h3>
            <button class="p-1 text-gray-400 hover:text-gray-600 rounded-lg" @click="$emit('close')"><XMarkIcon class="h-5 w-5" /></button>
          </div>
          <form @submit.prevent="$emit('submit')" class="space-y-4">
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">N° de Orden <span class="text-red-500">*</span></label>
                <input v-model="form.orderNumber" required placeholder="ORD-001" class="input-field" />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Total <span class="text-red-500">*</span></label>
                <input v-model.number="form.total" type="number" step="0.01" min="0.01" required class="input-field" />
              </div>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">Nombre del Cliente <span class="text-red-500">*</span></label>
              <input v-model="form.customerName" required placeholder="Juan García" class="input-field" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">Teléfono del Cliente</label>
              <input v-model="form.customerPhone" placeholder="+58 412 000 0000" class="input-field" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">Dirección de Entrega <span class="text-red-500">*</span></label>
              <input v-model="form.deliveryAddress" required placeholder="Calle, número..." class="input-field" />
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Costo de Envío</label>
                <input v-model.number="form.deliveryFee" type="number" step="0.01" min="0" class="input-field" />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Tiempo Est. (min)</label>
                <input v-model.number="form.estimatedTime" type="number" min="1" class="input-field" />
              </div>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">Repartidor</label>
              <select v-model="form.driverId" class="input-field">
                <option value="">Sin asignar</option>
                <option v-for="d in drivers" :key="d.id" :value="d.id">
                  {{ d.name }} — {{ VEHICLE_LABELS[d.vehicleType] }} ({{ DRIVER_STATUS_LABELS[d.status] }})
                </option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">Notas</label>
              <textarea v-model="form.notes" rows="2" placeholder="Instrucciones especiales..." class="input-field resize-none" />
            </div>

            <details class="border border-gray-200 rounded-lg p-3">
              <summary class="text-xs font-medium text-gray-700 cursor-pointer select-none">
                Seguimiento en vivo (opcional)
              </summary>
              <p class="text-xs text-gray-400 mt-2 mb-3">
                Solo necesario si el cliente va a ver la ubicación del repartidor en tiempo real. Copia las coordenadas desde Google Maps (clic derecho sobre el punto → coordenadas).
              </p>
              <div class="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Latitud recogida</label>
                  <input v-model.number="form.pickupLat" type="number" step="any" placeholder="10.4806" class="input-field" />
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Longitud recogida</label>
                  <input v-model.number="form.pickupLng" type="number" step="any" placeholder="-66.9036" class="input-field" />
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Latitud destino</label>
                  <input v-model.number="form.destLat" type="number" step="any" placeholder="10.4906" class="input-field" />
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Longitud destino</label>
                  <input v-model.number="form.destLng" type="number" step="any" placeholder="-66.8936" class="input-field" />
                </div>
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">ID de usuario del cliente</label>
                <input v-model="form.customerUserId" placeholder="Solo si el cliente tiene cuenta en WorkPlace" class="input-field" />
                <p class="text-xs text-gray-400 mt-1">Sin esto, el cliente no podrá ver el seguimiento aunque haya coordenadas.</p>
              </div>
            </details>

            <div class="flex gap-3 pt-2">
              <button type="button" class="btn-secondary flex-1" @click="$emit('close')">Cancelar</button>
              <button type="submit" class="btn-primary flex-1" :disabled="saving">
                {{ saving ? 'Guardando...' : (editing ? 'Actualizar' : 'Crear Entrega') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { XMarkIcon } from '@heroicons/vue/24/outline'
import {
  DRIVER_STATUS_LABELS, VEHICLE_LABELS,
  type Driver, type CreateDeliveryPayload,
} from '~/composables/delivery/useDelivery'

defineProps<{
  show: boolean
  editing: boolean
  saving: boolean
  drivers: Driver[]
  form: CreateDeliveryPayload
}>()

defineEmits<{
  close: []
  submit: []
}>()
</script>
