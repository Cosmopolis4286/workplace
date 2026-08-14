<template>
  <Teleport to="body">
    <div v-if="show" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        <div class="sticky top-0 bg-white px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 class="text-xl font-bold text-gray-800">Nuevo Pedido</h3>
          <button @click="$emit('close')" class="text-gray-400 hover:text-gray-700 text-2xl leading-none">×</button>
        </div>

        <form @submit.prevent="submit" class="p-6 space-y-4">
          <!-- Customer info -->
          <div class="grid grid-cols-2 gap-3">
            <div class="col-span-2">
              <label class="text-xs font-medium text-gray-600 uppercase tracking-wide">Nombre del cliente *</label>
              <input
                v-model="form.customerName"
                required
                type="text"
                placeholder="Nombre completo"
                class="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-400 focus:border-transparent"
              />
            </div>
            <div>
              <label class="text-xs font-medium text-gray-600 uppercase tracking-wide">Teléfono</label>
              <input
                v-model="form.customerPhone"
                type="tel"
                placeholder="555-0000"
                class="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-400 focus:border-transparent"
              />
            </div>
            <div>
              <label class="text-xs font-medium text-gray-600 uppercase tracking-wide">Email</label>
              <input
                v-model="form.customerEmail"
                type="email"
                placeholder="cliente@email.com"
                class="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-400 focus:border-transparent"
              />
            </div>
          </div>

          <!-- Type & payment -->
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-xs font-medium text-gray-600 uppercase tracking-wide">Tipo de pedido</label>
              <select
                v-model="form.orderType"
                class="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-400 focus:border-transparent"
              >
                <option v-for="(label, val) in ORDER_TYPE_LABELS" :key="val" :value="val">{{ label }}</option>
              </select>
            </div>
            <div>
              <label class="text-xs font-medium text-gray-600 uppercase tracking-wide">Método de pago</label>
              <select
                v-model="form.paymentMethod"
                class="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-400 focus:border-transparent"
              >
                <option v-for="(label, val) in PAYMENT_METHOD_LABELS" :key="val" :value="val">{{ label }}</option>
              </select>
            </div>
          </div>

          <!-- Delivery address (if needed) -->
          <div v-if="form.orderType === 'IMMEDIATE' || form.orderType === 'SCHEDULED'">
            <label class="text-xs font-medium text-gray-600 uppercase tracking-wide">Dirección de entrega</label>
            <input
              v-model="form.deliveryAddress"
              type="text"
              placeholder="Calle, número, colonia"
              class="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-400 focus:border-transparent"
            />
          </div>

          <!-- Scheduled date -->
          <div v-if="form.orderType === 'SCHEDULED'">
            <label class="text-xs font-medium text-gray-600 uppercase tracking-wide">Fecha programada *</label>
            <input
              v-model="form.scheduledAt"
              type="datetime-local"
              class="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-400 focus:border-transparent"
            />
          </div>

          <!-- Items -->
          <div>
            <div class="flex items-center justify-between mb-2">
              <label class="text-xs font-medium text-gray-600 uppercase tracking-wide">Ítems del pedido *</label>
              <button type="button" @click="addItem" class="text-xs text-green-600 hover:text-green-800 font-semibold flex items-center gap-1">
                <Plus class="w-3.5 h-3.5" />Agregar ítem
              </button>
            </div>

            <div v-for="(item, idx) in form.items" :key="idx" class="flex gap-2 mb-2 items-start">
              <input
                v-model="item.productName"
                required
                type="text"
                placeholder="Producto"
                class="flex-1 px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-400 focus:border-transparent"
              />
              <input
                v-model.number="item.quantity"
                required
                type="number"
                min="1"
                placeholder="Cant."
                class="w-16 px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-400 focus:border-transparent"
              />
              <input
                v-model.number="item.unitPrice"
                required
                type="number"
                min="0"
                step="0.01"
                placeholder="Precio"
                class="w-24 px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-400 focus:border-transparent"
              />
              <button
                v-if="form.items.length > 1"
                type="button"
                @click="removeItem(idx)"
                class="text-red-400 hover:text-red-600 p-1"
              >×</button>
            </div>

            <!-- Live total -->
            <div class="text-right text-sm font-semibold text-green-700 mt-1">
              Total estimado: {{ formatCurrency(newOrderTotal) }}
            </div>
          </div>

          <!-- Notes -->
          <div>
            <label class="text-xs font-medium text-gray-600 uppercase tracking-wide">Notas</label>
            <textarea
              v-model="form.notes"
              placeholder="Instrucciones especiales..."
              rows="2"
              class="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-400 focus:border-transparent resize-none"
            />
          </div>

          <div class="flex gap-3 pt-2">
            <button
              type="button"
              @click="$emit('close')"
              class="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-semibold text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              :disabled="loading || !isValid"
              class="flex-1 py-2.5 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition-all font-semibold text-sm disabled:opacity-50 shadow-md"
            >
              <span v-if="loading">Creando...</span>
              <span v-else>Crear Pedido</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Plus } from 'lucide-vue-next'
import { ORDER_TYPE_LABELS, PAYMENT_METHOD_LABELS, type CreateOrderPayload } from '~/composables/catalog/useMerchantOrders'

const props = defineProps<{
  show: boolean
  loading: boolean
  formatCurrency: (n: number) => string
}>()

const emit = defineEmits<{
  close: []
  submit: [payload: CreateOrderPayload]
}>()

const defaultItem = () => ({ productName: '', quantity: 1, unitPrice: 0 })

function defaultForm() {
  return {
    customerName:    '',
    customerPhone:   '',
    customerEmail:   '',
    deliveryAddress: '',
    notes:           '',
    orderType:       'IMMEDIATE' as CreateOrderPayload['orderType'],
    paymentMethod:   'CASH' as CreateOrderPayload['paymentMethod'],
    scheduledAt:     '',
    items:           [defaultItem()],
  }
}

const form = ref(defaultForm())

watch(() => props.show, (visible) => {
  if (visible) form.value = defaultForm()
})

const newOrderTotal = computed(() =>
  form.value.items.reduce((s, i) => s + (i.unitPrice || 0) * (i.quantity || 0), 0)
)

const isValid = computed(() =>
  form.value.customerName.trim().length > 0 &&
  form.value.items.every(i => i.productName.trim() && i.quantity > 0 && i.unitPrice >= 0)
)

function addItem() { form.value.items.push(defaultItem()) }
function removeItem(idx: number) { form.value.items.splice(idx, 1) }

function submit() {
  const payload: CreateOrderPayload = {
    ...form.value,
    scheduledAt: form.value.scheduledAt || undefined,
    deliveryAddress: form.value.deliveryAddress || undefined,
    customerPhone: form.value.customerPhone || undefined,
    customerEmail: form.value.customerEmail || undefined,
    notes: form.value.notes || undefined,
    items: form.value.items.map(i => ({
      productName: i.productName,
      quantity:    i.quantity,
      unitPrice:   i.unitPrice,
    })),
  }
  emit('submit', payload)
}
</script>
