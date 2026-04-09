<template>
  <TransitionRoot appear :show="isOpen" as="template">
    <Dialog as="div" class="relative z-50" @close="$emit('close')">
      <div class="fixed inset-0 bg-black/30" />
      <div class="fixed inset-0 flex items-start justify-center p-4 overflow-y-auto">
        <DialogPanel class="bg-white rounded-2xl shadow-xl w-full max-w-2xl my-8">
          <!-- Header -->
          <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <DialogTitle class="text-lg font-semibold text-gray-900">
              {{ order ? 'Editar Pedido' : 'Nueva Venta' }}
            </DialogTitle>
            <button class="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400" @click="$emit('close')">
              <XMarkIcon class="h-5 w-5" />
            </button>
          </div>

          <form @submit.prevent="handleSubmit" class="divide-y divide-gray-100">
            <!-- Customer & Type -->
            <div class="px-6 py-4 grid grid-cols-2 gap-4">
              <div class="col-span-2 sm:col-span-1">
                <label class="label-field">Cliente <span class="text-red-500">*</span></label>
                <input v-model="form.customerName" type="text" class="input-field" placeholder="Nombre del cliente" required />
              </div>
              <div>
                <label class="label-field">Teléfono</label>
                <input v-model="form.customerPhone" type="tel" class="input-field" placeholder="+52 000 000 0000" />
              </div>
              <div>
                <label class="label-field">Tipo de Pedido</label>
                <select v-model="form.orderType" class="input-field">
                  <option v-for="(label, val) in ORDER_TYPE_LABELS" :key="val" :value="val">{{ label }}</option>
                </select>
              </div>
              <div>
                <label class="label-field">Método de Pago</label>
                <select v-model="form.paymentMethod" class="input-field">
                  <option v-for="(label, val) in PAYMENT_METHOD_LABELS" :key="val" :value="val">{{ label }}</option>
                </select>
              </div>
              <div v-if="form.orderType === 'PROGRAMADO'" class="col-span-2">
                <label class="label-field">Programado para</label>
                <input v-model="form.scheduledAt" type="datetime-local" class="input-field" />
              </div>
              <div v-if="form.orderType === 'EN_SITIO' || form.orderType === 'PARA_LLEVAR'" class="col-span-2 sm:col-span-1">
                <!-- No delivery address needed for dine-in or takeaway -->
              </div>
              <div v-if="form.orderType === 'INMEDIATO' || form.orderType === 'PROGRAMADO'" class="col-span-2">
                <label class="label-field">Dirección de Entrega</label>
                <input v-model="form.deliveryAddress" type="text" class="input-field" placeholder="Calle, número, colonia..." />
              </div>
            </div>

            <!-- Items -->
            <div class="px-6 py-4">
              <div class="flex items-center justify-between mb-3">
                <h4 class="text-sm font-semibold text-gray-700">Productos</h4>
                <button type="button" class="text-sm text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1" @click="addItem">
                  <PlusIcon class="h-4 w-4" />
                  Agregar
                </button>
              </div>

              <!-- Product selector (quick add from catalog) -->
              <div v-if="products.length > 0" class="mb-3">
                <div class="relative">
                  <input
                    v-model="productSearch"
                    type="text"
                    class="input-field pr-8"
                    placeholder="Buscar producto del catálogo..."
                    @focus="showProductDropdown = true"
                    @blur="hideDropdownDelayed"
                  />
                  <MagnifyingGlassIcon class="h-4 w-4 text-gray-400 absolute right-2.5 top-2.5 pointer-events-none" />
                </div>
                <div
                  v-if="showProductDropdown && filteredProducts.length > 0"
                  class="mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto z-10 relative"
                >
                  <button
                    v-for="p in filteredProducts"
                    :key="p.id"
                    type="button"
                    class="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm flex items-center justify-between"
                    @mousedown.prevent="selectProduct(p)"
                  >
                    <span>{{ p.name }}</span>
                    <span class="text-gray-500 text-xs">{{ formatCurrency(p.price) }}</span>
                  </button>
                </div>
              </div>

              <!-- Items list -->
              <div v-if="form.items.length === 0" class="text-center py-6 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-lg">
                Sin productos. Agrega items al pedido.
              </div>
              <div v-else class="space-y-2">
                <div v-for="(item, idx) in form.items" :key="idx" class="flex items-start gap-2 p-2 bg-gray-50 rounded-lg">
                  <div class="flex-1 grid grid-cols-6 gap-2 items-center">
                    <div class="col-span-3">
                      <input
                        v-model="item.productName"
                        type="text"
                        class="input-field text-sm py-1.5"
                        placeholder="Nombre del producto"
                        required
                      />
                    </div>
                    <div class="col-span-1">
                      <input
                        v-model.number="item.quantity"
                        type="number"
                        min="1"
                        class="input-field text-sm py-1.5 text-center"
                        required
                        @input="updateItemSubtotal(idx)"
                      />
                    </div>
                    <div class="col-span-2">
                      <div class="relative">
                        <span class="absolute left-2.5 top-1.5 text-gray-400 text-sm">$</span>
                        <input
                          v-model.number="item.unitPrice"
                          type="number"
                          min="0"
                          step="0.01"
                          class="input-field text-sm py-1.5 pl-6"
                          required
                          @input="updateItemSubtotal(idx)"
                        />
                      </div>
                    </div>
                  </div>
                  <button type="button" class="p-1.5 text-gray-400 hover:text-red-500 mt-0.5" @click="removeItem(idx)">
                    <XMarkIcon class="h-4 w-4" />
                  </button>
                </div>

                <!-- Column labels -->
                <div class="grid grid-cols-6 gap-2 px-2 text-xs text-gray-400">
                  <span class="col-span-3">Producto</span>
                  <span class="col-span-1 text-center">Cant.</span>
                  <span class="col-span-2">Precio Unit.</span>
                </div>
              </div>
            </div>

            <!-- Totals -->
            <div class="px-6 py-4 bg-gray-50">
              <div class="grid grid-cols-2 gap-4 mb-3">
                <div>
                  <label class="label-field">Descuento ($)</label>
                  <input v-model.number="form.discount" type="number" min="0" step="0.01" class="input-field" />
                </div>
                <div>
                  <label class="label-field">Costo Envío ($)</label>
                  <input v-model.number="form.deliveryFee" type="number" min="0" step="0.01" class="input-field" />
                </div>
              </div>
              <div class="space-y-1.5 text-sm border-t border-gray-200 pt-3">
                <div class="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>{{ formatCurrency(computedSubtotal) }}</span>
                </div>
                <div v-if="form.discount > 0" class="flex justify-between text-green-600">
                  <span>Descuento</span>
                  <span>-{{ formatCurrency(form.discount) }}</span>
                </div>
                <div v-if="form.deliveryFee > 0" class="flex justify-between text-gray-600">
                  <span>Envío</span>
                  <span>+{{ formatCurrency(form.deliveryFee) }}</span>
                </div>
                <div class="flex justify-between font-bold text-gray-900 text-base pt-1 border-t border-gray-200">
                  <span>Total</span>
                  <span>{{ formatCurrency(computedTotal) }}</span>
                </div>
              </div>
            </div>

            <!-- Notes -->
            <div class="px-6 py-4">
              <label class="label-field">Notas</label>
              <textarea v-model="form.notes" rows="2" class="input-field resize-none" placeholder="Instrucciones especiales, alergias, preferencias..." />
            </div>

            <!-- Actions -->
            <div class="px-6 py-4 flex justify-end gap-3">
              <button type="button" class="btn-secondary" @click="$emit('close')">Cancelar</button>
              <button type="submit" class="btn-primary flex items-center gap-2" :disabled="saving || form.items.length === 0">
                <span v-if="saving" class="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                {{ order ? 'Guardar cambios' : 'Crear Pedido' }}
              </button>
            </div>
          </form>
        </DialogPanel>
      </div>
    </Dialog>
  </TransitionRoot>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Dialog, DialogPanel, DialogTitle, TransitionRoot } from '@headlessui/vue'
import { XMarkIcon, PlusIcon, MagnifyingGlassIcon } from '@heroicons/vue/24/outline'
import {
  ORDER_TYPE_LABELS,
  PAYMENT_METHOD_LABELS,
  type Order,
  type CreateOrderPayload,
  type OrderType,
  type PaymentMethod,
} from '~/composables/useClienteDashboard'
import type { Product } from '~/composables/useMenu'
import { useUserPreferences } from '~/composables/useUserPreferences'

const { formatCurrency: _fmt } = useUserPreferences()

// ── Props & Emits ────────────────────────────────────────────────────────────

const props = defineProps<{
  isOpen: boolean
  order: Order | null
  products: Product[]
  saving: boolean
}>()

const emit = defineEmits<{
  close: []
  save: [payload: CreateOrderPayload]
}>()

// ── Form state ───────────────────────────────────────────────────────────────

interface FormItem {
  productId?: string
  productName: string
  quantity: number
  unitPrice: number
  subtotal: number
  notes?: string
}

const defaultForm = () => ({
  customerName:    '',
  customerPhone:   '',
  deliveryAddress: '',
  notes:           '',
  orderType:       'INMEDIATO' as OrderType,
  paymentMethod:   'EFECTIVO' as PaymentMethod,
  discount:        0,
  deliveryFee:     0,
  scheduledAt:     '',
  items:           [] as FormItem[],
})

const form = ref(defaultForm())

// ── Product catalog search ───────────────────────────────────────────────────

const productSearch       = ref('')
const showProductDropdown = ref(false)

const filteredProducts = computed(() => {
  const q = productSearch.value.toLowerCase()
  return props.products
    .filter(p => p.status === 'DISPONIBLE' && (!q || p.name.toLowerCase().includes(q)))
    .slice(0, 8)
})

function selectProduct(p: Product) {
  const existing = form.value.items.find(i => i.productId === p.id)
  if (existing) {
    existing.quantity++
    existing.subtotal = existing.quantity * existing.unitPrice
  } else {
    form.value.items.push({
      productId:   p.id,
      productName: p.name,
      quantity:    1,
      unitPrice:   p.price,
      subtotal:    p.price,
    })
  }
  productSearch.value       = ''
  showProductDropdown.value = false
}

function hideDropdownDelayed() {
  setTimeout(() => { showProductDropdown.value = false }, 150)
}

// ── Items management ─────────────────────────────────────────────────────────

function addItem() {
  form.value.items.push({ productName: '', quantity: 1, unitPrice: 0, subtotal: 0 })
}

function removeItem(idx: number) {
  form.value.items.splice(idx, 1)
}

function updateItemSubtotal(idx: number) {
  const item = form.value.items[idx]
  item.subtotal = Math.max(0, item.quantity * item.unitPrice)
}

// ── Computed totals ──────────────────────────────────────────────────────────

const computedSubtotal = computed(() =>
  form.value.items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0),
)

const computedTotal = computed(() =>
  Math.max(0, computedSubtotal.value - (form.value.discount || 0) + (form.value.deliveryFee || 0)),
)

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(v: number) { return _fmt.value(v) }

// ── Submit ───────────────────────────────────────────────────────────────────

function handleSubmit() {
  const payload: CreateOrderPayload = {
    customerName:    form.value.customerName,
    customerPhone:   form.value.customerPhone  || undefined,
    deliveryAddress: form.value.deliveryAddress || undefined,
    notes:           form.value.notes           || undefined,
    orderType:       form.value.orderType,
    paymentMethod:   form.value.paymentMethod,
    discount:        form.value.discount  || 0,
    deliveryFee:     form.value.deliveryFee || 0,
    scheduledAt:     form.value.scheduledAt || undefined,
    items:           form.value.items.map(i => ({
      productId:   i.productId,
      productName: i.productName,
      quantity:    i.quantity,
      unitPrice:   i.unitPrice,
      notes:       i.notes,
    })),
  }
  emit('save', payload)
}

// ── Populate form when editing ───────────────────────────────────────────────

watch(() => props.isOpen, (open) => {
  if (!open) return
  if (props.order) {
    form.value = {
      customerName:    props.order.customerName,
      customerPhone:   props.order.customerPhone   ?? '',
      deliveryAddress: props.order.deliveryAddress ?? '',
      notes:           props.order.notes           ?? '',
      orderType:       props.order.orderType,
      paymentMethod:   props.order.paymentMethod,
      discount:        props.order.discount,
      deliveryFee:     props.order.deliveryFee,
      scheduledAt:     props.order.scheduledAt
        ? props.order.scheduledAt.slice(0, 16)
        : '',
      items: props.order.items.map(i => ({
        productId:   i.productId,
        productName: i.productName,
        quantity:    i.quantity,
        unitPrice:   i.unitPrice,
        subtotal:    i.subtotal,
        notes:       i.notes,
      })),
    }
  } else {
    form.value = defaultForm()
  }
  productSearch.value       = ''
  showProductDropdown.value = false
})
</script>

<style scoped>
.label-field {
  @apply block text-xs font-medium text-gray-600 mb-1;
}
</style>
