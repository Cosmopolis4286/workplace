<template>
  <Teleport to="body">
    <Transition enter-active-class="ease-out duration-200" enter-from-class="opacity-0" enter-to-class="opacity-100"
      leave-active-class="ease-in duration-150" leave-from-class="opacity-100" leave-to-class="opacity-0">
      <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center p-4" @click.self="$emit('close')">
        <div class="absolute inset-0 bg-black/40" @click="$emit('close')" />
        <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
          <div class="sticky top-0 bg-white px-6 pt-5 pb-4 border-b border-gray-100 flex items-center justify-between">
            <h3 class="text-base font-semibold text-gray-900">Nuevo Pedido</h3>
            <button class="p-1 text-gray-400 hover:text-gray-600 rounded-lg" @click="$emit('close')"><XMarkIcon class="h-5 w-5" /></button>
          </div>
          <div class="p-6 space-y-4">
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Cliente <span class="text-red-500">*</span></label>
                <input v-model="form.customerName" type="text" placeholder="Nombre del cliente" class="input-field" />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Teléfono</label>
                <input v-model="form.customerPhone" type="tel" placeholder="Teléfono" class="input-field" />
              </div>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Tipo de Pedido</label>
                <select v-model="form.orderType" class="input-field">
                  <option v-for="(label, key) in ORDER_TYPE_LABELS" :key="key" :value="key">{{ label }}</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Método de Pago</label>
                <select v-model="form.paymentMethod" class="input-field">
                  <option v-for="(label, key) in PAYMENT_METHOD_LABELS" :key="key" :value="key">{{ label }}</option>
                </select>
              </div>
            </div>
            <div v-if="form.orderType === 'SCHEDULED'">
              <label class="block text-xs font-medium text-gray-700 mb-1">Fecha y hora programada</label>
              <input v-model="form.scheduledAt" type="datetime-local" class="input-field" />
            </div>
            <div v-if="form.orderType === 'TAKEAWAY'">
              <label class="block text-xs font-medium text-gray-700 mb-1">Dirección de entrega</label>
              <input v-model="form.deliveryAddress" type="text" placeholder="Calle, número..." class="input-field" />
            </div>
            <div>
              <div class="flex items-center justify-between mb-2">
                <label class="text-xs font-medium text-gray-700">Ítems del pedido <span class="text-red-500">*</span></label>
                <button class="text-xs text-red-600 hover:underline flex items-center gap-1" @click="addItem">
                  <PlusIcon class="h-3 w-3" />Agregar ítem
                </button>
              </div>
              <div class="space-y-2">
                <div v-for="(item, idx) in form.items" :key="idx" class="flex gap-2">
                  <input v-model="item.productName" type="text" placeholder="Producto" class="input-field flex-1" />
                  <input v-model.number="item.quantity" type="number" min="1" placeholder="Cant." class="input-field w-16 text-center" />
                  <input v-model.number="item.unitPrice" type="number" min="0" step="0.01" placeholder="Precio" class="input-field w-24" />
                  <button class="p-2 text-gray-400 hover:text-red-500 transition-colors" @click="removeItem(idx)">
                    <TrashIcon class="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Costo de envío</label>
                <input v-model.number="form.deliveryFee" type="number" min="0" step="0.01" placeholder="0.00" class="input-field" />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Descuento</label>
                <input v-model.number="form.discount" type="number" min="0" step="0.01" placeholder="0.00" class="input-field" />
              </div>
            </div>
            <div class="bg-gray-50 rounded-xl p-3 text-sm space-y-1">
              <div class="flex justify-between text-gray-500"><span>Subtotal</span><span>{{ formatCurrency(subtotal) }}</span></div>
              <div v-if="form.deliveryFee" class="flex justify-between text-gray-500"><span>Envío</span><span>{{ formatCurrency(form.deliveryFee ?? 0) }}</span></div>
              <div v-if="form.discount" class="flex justify-between text-red-500"><span>Descuento</span><span>-{{ formatCurrency(form.discount ?? 0) }}</span></div>
              <div class="flex justify-between font-bold text-gray-900 border-t border-gray-200 pt-1 mt-1"><span>Total estimado</span><span>{{ formatCurrency(total) }}</span></div>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">Notas</label>
              <textarea v-model="form.notes" rows="2" placeholder="Instrucciones especiales..." class="input-field resize-none" />
            </div>
          </div>
          <div class="sticky bottom-0 bg-white px-6 py-4 border-t border-gray-100 flex gap-3">
            <button class="btn-secondary flex-1" @click="$emit('close')">Cancelar</button>
            <button class="btn-primary flex-1" :disabled="loading || !form.customerName || !form.items.length" @click="submit">
              {{ loading ? 'Creando...' : 'Crear Pedido' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { XMarkIcon, PlusIcon, TrashIcon } from '@heroicons/vue/24/outline'
import {
  ORDER_TYPE_LABELS, PAYMENT_METHOD_LABELS,
  type CreateOrderPayload, type OrderType, type PaymentMethod,
} from '~/composables/catalog/useMerchantOrders'

const props = defineProps<{
  show: boolean
  loading: boolean
  formatCurrency: (n: number) => string
}>()

const emit = defineEmits<{
  close: []
  submit: [payload: CreateOrderPayload]
}>()

function defaultForm(): CreateOrderPayload & { orderType: OrderType; paymentMethod: PaymentMethod } {
  return {
    customerName: '', customerPhone: '', orderType: 'IMMEDIATE', paymentMethod: 'CASH',
    deliveryFee: 0, discount: 0, items: [{ productName: '', quantity: 1, unitPrice: 0 }],
  }
}

const form = ref(defaultForm())

watch(() => props.show, (visible) => {
  if (visible) form.value = defaultForm()
})

const subtotal = computed(() => form.value.items.reduce((s, i) => s + (i.quantity || 0) * (i.unitPrice || 0), 0))
const total = computed(() => Math.max(0, subtotal.value + (form.value.deliveryFee ?? 0) - (form.value.discount ?? 0)))

function addItem() { form.value.items.push({ productName: '', quantity: 1, unitPrice: 0 }) }
function removeItem(idx: number) { if (form.value.items.length > 1) form.value.items.splice(idx, 1) }

function submit() {
  const validItems = form.value.items.filter(i => i.productName.trim() && i.unitPrice > 0)
  if (!form.value.customerName.trim() || !validItems.length) return
  emit('submit', { ...form.value, customerPhone: form.value.customerPhone || undefined, items: validItems })
}
</script>
