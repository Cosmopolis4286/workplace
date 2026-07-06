<template>
  <TransitionRoot appear :show="isOpen" as="template">
    <Dialog as="div" class="relative z-50" @close="$emit('close')">
      <div class="fixed inset-0 bg-black/30" />
      <div class="fixed inset-0 flex items-start justify-center p-4 overflow-y-auto">
        <DialogPanel class="bg-white rounded-2xl shadow-xl w-full max-w-lg my-8">
          <!-- Header -->
          <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <DialogTitle class="text-lg font-semibold text-gray-900">
                Pedido #{{ order?.orderNumber }}
              </DialogTitle>
              <p class="text-xs text-gray-400 mt-0.5">{{ formatDate(order?.createdAt) }}</p>
            </div>
            <button class="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400" @click="$emit('close')">
              <XMarkIcon class="h-5 w-5" />
            </button>
          </div>

          <div v-if="order" class="divide-y divide-gray-100">
            <!-- Status flow -->
            <div class="px-6 py-4">
              <div class="flex items-center justify-between mb-3">
                <h4 class="text-sm font-semibold text-gray-700">Estado del Pedido</h4>
                <span class="badge" :class="ORDER_STATUS_CLASSES[order.status]">
                  {{ ORDER_STATUS_LABELS[order.status] }}
                </span>
              </div>

              <!-- Progress bar -->
              <div class="flex items-center gap-1 mb-4">
                <template v-for="(step, idx) in statusFlow" :key="step">
                  <div
                    class="flex-1 h-1.5 rounded-full transition-all duration-300"
                    :class="isStepReached(step) ? 'bg-indigo-500' : 'bg-gray-200'"
                  />
                  <div v-if="idx < statusFlow.length - 1" />
                </template>
              </div>

              <!-- Action buttons -->
              <div v-if="NEXT_STATUS[order.status]?.length" class="flex flex-wrap gap-2">
                <button
                  v-for="next in NEXT_STATUS[order.status]"
                  :key="next"
                  class="text-sm px-3 py-1.5 rounded-lg font-medium transition-colors"
                  :class="next === 'CANCELADO'
                    ? 'bg-red-50 text-red-700 hover:bg-red-100'
                    : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'"
                  :disabled="transitioning"
                  @click="handleStatusChange(next)"
                >
                  <span v-if="transitioning && pendingStatus === next" class="inline-block h-3 w-3 border-2 border-current/30 border-t-current rounded-full animate-spin mr-1" />
                  {{ next === 'CANCELADO' ? 'Cancelar' : ORDER_STATUS_LABELS[next] }}
                </button>
              </div>
              <p v-else-if="order.status === 'CANCELADO'" class="text-sm text-red-600">
                Pedido cancelado{{ order.cancelReason ? `: ${order.cancelReason}` : '' }}
              </p>
              <p v-else class="text-sm text-gray-400">Pedido completado.</p>
            </div>

            <!-- Customer info -->
            <div class="px-6 py-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <p class="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">Cliente</p>
                <p class="font-medium text-gray-800">{{ order.customerName }}</p>
                <p v-if="order.customerPhone" class="text-gray-500">{{ order.customerPhone }}</p>
              </div>
              <div>
                <p class="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">Tipo</p>
                <p class="font-medium text-gray-800">{{ ORDER_TYPE_LABELS[order.orderType] }}</p>
                <p class="text-gray-500">{{ PAYMENT_METHOD_LABELS[order.paymentMethod] }}</p>
              </div>
              <div v-if="order.deliveryAddress" class="col-span-2">
                <p class="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">Dirección</p>
                <p class="text-gray-700">{{ order.deliveryAddress }}</p>
              </div>
              <div v-if="order.notes" class="col-span-2">
                <p class="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">Notas</p>
                <p class="text-gray-700 italic">{{ order.notes }}</p>
              </div>
            </div>

            <!-- Items -->
            <div class="px-6 py-4">
              <p class="text-xs text-gray-400 font-medium uppercase tracking-wide mb-3">Productos</p>
              <div class="space-y-2">
                <div
                  v-for="item in order.items"
                  :key="item.id"
                  class="flex items-center justify-between text-sm"
                >
                  <div class="flex items-center gap-2">
                    <span class="bg-gray-100 text-gray-600 text-xs font-semibold rounded px-1.5 py-0.5">×{{ item.quantity }}</span>
                    <span class="text-gray-800">{{ item.productName }}</span>
                    <span v-if="item.notes" class="text-xs text-gray-400 italic">({{ item.notes }})</span>
                  </div>
                  <span class="text-gray-700 font-medium">{{ formatCurrency(item.subtotal) }}</span>
                </div>
              </div>
            </div>

            <!-- Totals -->
            <div class="px-6 py-4 bg-gray-50">
              <div class="space-y-1.5 text-sm">
                <div class="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>{{ formatCurrency(order.subtotal) }}</span>
                </div>
                <div v-if="order.tax > 0" class="flex justify-between text-gray-600">
                  <span>IVA</span>
                  <span>{{ formatCurrency(order.tax) }}</span>
                </div>
                <div v-if="order.discount > 0" class="flex justify-between text-green-600">
                  <span>Descuento</span>
                  <span>-{{ formatCurrency(order.discount) }}</span>
                </div>
                <div v-if="order.deliveryFee > 0" class="flex justify-between text-gray-600">
                  <span>Envío</span>
                  <span>+{{ formatCurrency(order.deliveryFee) }}</span>
                </div>
                <div class="flex justify-between font-bold text-gray-900 text-base pt-2 border-t border-gray-200">
                  <span>Total</span>
                  <span>{{ formatCurrency(order.total) }}</span>
                </div>
              </div>

              <!-- Comisión de plataforma (solo si la paga el comercio) -->
              <div v-if="order.platformFeePayer === 'PROVIDER' && order.platformFeeAmount" class="mt-3 bg-amber-50 border border-amber-100 rounded-xl p-3 space-y-1">
                <div class="flex items-center justify-between text-xs">
                  <span class="text-amber-700 font-semibold">Comisión de plataforma ({{ order.platformFeeRate }}%)</span>
                  <span class="text-red-600 font-medium">-{{ formatCurrency(order.platformFeeAmount) }}</span>
                </div>
                <div class="flex items-center justify-between text-sm">
                  <span class="text-amber-800 font-bold">Recibirás</span>
                  <span class="text-amber-800 font-bold">{{ formatCurrency(order.total - order.platformFeeAmount) }}</span>
                </div>
              </div>

              <!-- Payment status badge -->
              <div class="mt-3 flex items-center gap-2">
                <span
                  class="text-xs px-2 py-0.5 rounded-full font-medium"
                  :class="order.paymentStatus === 'PAGADO' ? 'bg-green-100 text-green-700' : order.paymentStatus === 'REEMBOLSADO' ? 'bg-orange-100 text-orange-700' : 'bg-yellow-100 text-yellow-700'"
                >
                  Pago: {{ PAYMENT_STATUS_LABELS[order.paymentStatus] }}
                </span>
                <button
                  v-if="order.paymentStatus === 'PENDIENTE' && order.status !== 'CANCELADO'"
                  class="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                  :disabled="transitioning"
                  @click="handleMarkPaid"
                >
                  Marcar como pagado
                </button>
              </div>
            </div>

            <!-- Footer actions -->
            <div class="px-6 py-4 flex justify-between items-center">
              <button
                v-if="order.status !== 'ENTREGADO' && order.status !== 'CANCELADO'"
                class="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1.5"
                @click="$emit('edit', order)"
              >
                <PencilIcon class="h-4 w-4" />
                Editar pedido
              </button>
              <div v-else />
              <div class="flex items-center gap-2">
                <button
                  v-if="order.status !== 'CANCELADO'"
                  class="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1.5"
                  :disabled="downloadingReceipt"
                  @click="handleDownloadReceipt"
                >
                  <DocumentArrowDownIcon class="h-4 w-4" />
                  {{ downloadingReceipt ? 'Generando...' : 'Comprobante' }}
                </button>
                <button class="btn-secondary text-sm" @click="$emit('close')">Cerrar</button>
              </div>
            </div>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  </TransitionRoot>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Dialog, DialogPanel, DialogTitle, TransitionRoot } from '@headlessui/vue'
import { XMarkIcon, PencilIcon, DocumentArrowDownIcon } from '@heroicons/vue/24/outline'
import { useUserPreferences } from '~/composables/useUserPreferences'
import { useReceipts } from '~/composables/useReceipts'
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_CLASSES,
  ORDER_TYPE_LABELS,
  PAYMENT_METHOD_LABELS,
  NEXT_STATUS,
  type Order,
  type OrderStatus,
} from '~/composables/useClienteDashboard'

const { formatCurrency: _fmt } = useUserPreferences()

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  PENDIENTE:   'Pendiente',
  PAGADO:      'Pagado',
  REEMBOLSADO: 'Reembolsado',
}

// Flow for the progress bar (non-delivery path)
const statusFlow: OrderStatus[] = ['PENDIENTE', 'CONFIRMADO', 'PREPARANDO', 'LISTO', 'ENTREGADO']

const props = defineProps<{
  isOpen: boolean
  order: Order | null
}>()

const emit = defineEmits<{
  close: []
  edit: [order: Order]
  statusChange: [id: string, status: OrderStatus, cancelReason?: string]
  markPaid: [id: string]
}>()

const transitioning = ref(false)
const pendingStatus = ref<OrderStatus | null>(null)

const { loading: downloadingReceipt, getOrCreateAndDownload } = useReceipts()

async function handleDownloadReceipt() {
  if (!props.order) return
  await getOrCreateAndDownload(props.order.id)
}

function isStepReached(step: OrderStatus) {
  if (!props.order) return false
  const order = props.order
  if (order.status === 'CANCELADO') return step === 'PENDIENTE'
  return statusFlow.indexOf(step) <= statusFlow.indexOf(order.status as any)
}

async function handleStatusChange(status: OrderStatus) {
  if (!props.order) return
  transitioning.value = true
  pendingStatus.value = status
  emit('statusChange', props.order.id, status)
  // Parent handles async, so we clear the spinner after a short delay
  setTimeout(() => {
    transitioning.value = false
    pendingStatus.value = null
  }, 800)
}

async function handleMarkPaid() {
  if (!props.order) return
  transitioning.value = true
  emit('markPaid', props.order.id)
  setTimeout(() => { transitioning.value = false }, 800)
}

function formatCurrency(v?: number) { return _fmt.value(v ?? 0) }

function formatDate(dateStr?: string) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('es-MX', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}
</script>

<style scoped>
.badge {
  @apply inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium;
}
</style>
