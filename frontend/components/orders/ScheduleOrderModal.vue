<template>
  <Teleport to="body">
    <Transition enter-active-class="ease-out duration-200" enter-from-class="opacity-0" enter-to-class="opacity-100"
      leave-active-class="ease-in duration-150" leave-from-class="opacity-100" leave-to-class="opacity-0">
      <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center p-4" @click.self="$emit('close')">
        <div class="absolute inset-0 bg-black/40" @click="$emit('close')" />
        <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
          <div class="flex items-center justify-between mb-5">
            <h3 class="text-base font-semibold text-gray-900">Programar Servicio</h3>
            <button class="p-1 text-gray-400 hover:text-gray-600 rounded-lg" @click="$emit('close')"><XMarkIcon class="h-5 w-5" /></button>
          </div>
          <p class="text-xs text-gray-500 mb-4">Se creará un pedido de tipo <strong>Programado</strong> con la fecha indicada.</p>
          <div class="space-y-4">
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">Cliente <span class="text-red-500">*</span></label>
              <input v-model="form.customerName" type="text" placeholder="Nombre" class="input-field" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">Teléfono</label>
              <input v-model="form.customerPhone" type="tel" placeholder="Teléfono" class="input-field" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">Fecha y hora <span class="text-red-500">*</span></label>
              <input v-model="form.scheduledAt" type="datetime-local" class="input-field" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">Descripción del servicio <span class="text-red-500">*</span></label>
              <input v-model="form.serviceName" type="text" placeholder="Ej: Catering para 20 personas" class="input-field" />
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Precio unitario</label>
                <input v-model.number="form.unitPrice" type="number" min="0" step="0.01" placeholder="0.00" class="input-field" />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Método de pago</label>
                <select v-model="form.paymentMethod" class="input-field">
                  <option v-for="(label, key) in PAYMENT_METHOD_LABELS" :key="key" :value="key">{{ label }}</option>
                </select>
              </div>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">Notas</label>
              <textarea v-model="form.notes" rows="2" placeholder="Detalles adicionales..." class="input-field resize-none" />
            </div>
            <div class="flex gap-3 pt-2">
              <button class="btn-secondary flex-1" @click="$emit('close')">Cancelar</button>
              <button class="btn-primary flex-1" :disabled="loading || !form.customerName || !form.scheduledAt || !form.serviceName" @click="submit">
                {{ loading ? 'Programando...' : 'Programar' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { XMarkIcon } from '@heroicons/vue/24/outline'
import { PAYMENT_METHOD_LABELS, type CreateOrderPayload, type PaymentMethod } from '~/composables/catalog/useMerchantOrders'

const props = defineProps<{
  show: boolean
  loading: boolean
}>()

const emit = defineEmits<{
  close: []
  submit: [payload: CreateOrderPayload]
}>()

function defaultForm() {
  return { customerName: '', customerPhone: '', scheduledAt: '', serviceName: '', unitPrice: 0, paymentMethod: 'CASH' as PaymentMethod, notes: '' }
}

const form = ref(defaultForm())

watch(() => props.show, (visible) => {
  if (visible) form.value = defaultForm()
})

function submit() {
  const f = form.value
  if (!f.customerName.trim() || !f.scheduledAt || !f.serviceName.trim()) return
  emit('submit', {
    customerName: f.customerName, customerPhone: f.customerPhone || undefined,
    orderType: 'SCHEDULED', paymentMethod: f.paymentMethod, scheduledAt: f.scheduledAt,
    notes: f.notes || undefined, items: [{ productName: f.serviceName, quantity: 1, unitPrice: f.unitPrice || 0 }],
  })
}
</script>
