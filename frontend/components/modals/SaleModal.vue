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
                  <option
                    v-for="[val, label] in paymentMethodOptions"
                    :key="val"
                    :value="val"
                    :disabled="isBnplProvider(val) && hasIneligibleItems"
                  >
                    {{ label }}
                  </option>
                </select>
                <p v-if="isBnplProvider(form.paymentMethod) && hasIneligibleItems" class="mt-1 text-xs text-amber-600">
                  Este pedido incluye productos no financiables con Cashea/Krece.
                </p>
              </div>
              <div v-if="form.orderType === 'SCHEDULED'" class="col-span-2">
                <label class="label-field">Programado para</label>
                <input v-model="form.scheduledAt" type="datetime-local" class="input-field" />
              </div>
              <div v-if="form.orderType === 'DINE_IN' || form.orderType === 'TAKEAWAY'" class="col-span-2 sm:col-span-1">
                <!-- No delivery address needed for dine-in or takeaway -->
              </div>
              <div v-if="form.orderType === 'IMMEDIATE' || form.orderType === 'SCHEDULED'" class="col-span-2">
                <label class="label-field">Dirección de Entrega</label>
                <input v-model="form.deliveryAddress" type="text" class="input-field" placeholder="Calle, número, colonia..." />
              </div>
            </div>

            <SaleModalItemsSection
              :items="form.items"
              :products="products"
              :filtered-products="filteredProducts"
              :product-search="productSearch"
              :show-product-dropdown="showProductDropdown"
              :format-currency="formatCurrency"
              @add-item="addItem"
              @remove-item="removeItem"
              @update-subtotal="updateItemSubtotal"
              @select-product="selectProduct"
              @update:product-search="productSearch = $event"
              @update:show-product-dropdown="showProductDropdown = $event"
              @hide-dropdown-delayed="hideDropdownDelayed"
            />

            <SaleModalTotals
              :discount="form.discount"
              :delivery-fee="form.deliveryFee"
              :subtotal="computedSubtotal"
              :total="computedTotal"
              :format-currency="formatCurrency"
              @update:discount="form.discount = $event"
              @update:delivery-fee="form.deliveryFee = $event"
            />

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
import { XMarkIcon } from '@heroicons/vue/24/outline'
import {
  ORDER_TYPE_LABELS,
  PAYMENT_METHOD_LABELS,
  type Order,
  type CreateOrderPayload,
  type OrderType,
  type PaymentMethod,
} from '~/composables/catalog/useMerchantOrders'
import type { ProductSelectorItem } from '~/composables/catalog/useMenu'
import { useUserPreferences } from '~/composables/users/useUserPreferences'
import SaleModalItemsSection, { type SaleModalFormItem } from '~/components/modals/sale-modal/SaleModalItemsSection.vue'
import SaleModalTotals from '~/components/modals/sale-modal/SaleModalTotals.vue'

const { formatCurrency: _fmt } = useUserPreferences()

// ── Props & Emits ────────────────────────────────────────────────────────────

const props = defineProps<{
  isOpen: boolean
  order: Order | null
  products: ProductSelectorItem[]
  saving: boolean
  eligibleBnplProviders?: PaymentMethod[]
}>()

const emit = defineEmits<{
  close: []
  save: [payload: CreateOrderPayload]
}>()

// ── Form state ───────────────────────────────────────────────────────────────

const defaultForm = () => ({
  customerName:    '',
  customerPhone:   '',
  deliveryAddress: '',
  notes:           '',
  orderType:       'IMMEDIATE' as OrderType,
  paymentMethod:   'CASH' as PaymentMethod,
  discount:        0,
  deliveryFee:     0,
  scheduledAt:     '',
  items:           [] as SaleModalFormItem[],
})

const form = ref(defaultForm())

// ── Product catalog search ───────────────────────────────────────────────────

const productSearch       = ref('')
const showProductDropdown = ref(false)

const filteredProducts = computed(() => {
  const q = productSearch.value.toLowerCase()
  return props.products
    .filter(p => p.status === 'AVAILABLE' && (!q || p.name.toLowerCase().includes(q)))
    .slice(0, 8)
})

function selectProduct(p: ProductSelectorItem) {
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

// ── BNPL (Cashea / Krece) ────────────────────────────────────────────────────

const eligibleBnplProviders = computed(() => props.eligibleBnplProviders ?? [])

function isBnplProvider(method: PaymentMethod): boolean {
  return method === 'CASHEA' || method === 'KRECE'
}

// Cashea/Krece solo aparecen si el comercio los tiene habilitados (y el
// backend con BNPL_ENABLED); si no, ni se muestran.
const paymentMethodOptions = computed(() =>
  (Object.entries(PAYMENT_METHOD_LABELS) as [PaymentMethod, string][]).filter(
    ([val]) => !isBnplProvider(val) || eligibleBnplProviders.value.includes(val),
  ),
)

const hasIneligibleItems = computed(() =>
  form.value.items.some(i => {
    if (!i.productId) return false
    const product = props.products.find(p => p.id === i.productId)
    return product && (product as any).bnplEligible === false
  }),
)

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
