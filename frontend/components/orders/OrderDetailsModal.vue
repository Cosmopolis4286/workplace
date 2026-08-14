<template>
  <Teleport to="body">
    <Transition enter-active-class="ease-out duration-200" enter-from-class="opacity-0" enter-to-class="opacity-100"
      leave-active-class="ease-in duration-150" leave-from-class="opacity-100" leave-to-class="opacity-0">
      <div v-if="show && order" class="fixed inset-0 z-50 flex items-center justify-center p-4" @click.self="$emit('close')">
        <div class="absolute inset-0 bg-black/40" @click="$emit('close')" />
        <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
          <div class="sticky top-0 bg-white px-6 pt-5 pb-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h3 class="text-base font-semibold text-gray-900">Detalles del Pedido</h3>
              <p class="text-xs text-gray-400">{{ order.orderNumber }}</p>
            </div>
            <button class="p-1 text-gray-400 hover:text-gray-600 rounded-lg" @click="$emit('close')"><XMarkIcon class="h-5 w-5" /></button>
          </div>
          <div class="p-6 space-y-5">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <p class="text-xs text-gray-400 font-medium uppercase mb-0.5">Cliente</p>
                <p class="font-semibold text-gray-900">{{ order.customerName }}</p>
                <p v-if="order.customerPhone" class="text-xs text-gray-400">{{ order.customerPhone }}</p>
              </div>
              <div>
                <p class="text-xs text-gray-400 font-medium uppercase mb-0.5">Estado</p>
                <span class="badge" :class="ORDER_STATUS_CLASSES[order.status]">{{ ORDER_STATUS_LABELS[order.status] }}</span>
              </div>
              <div>
                <p class="text-xs text-gray-400 font-medium uppercase mb-0.5">Tipo</p>
                <p class="text-sm text-gray-700">{{ ORDER_TYPE_LABELS[order.orderType] }}</p>
              </div>
              <div>
                <p class="text-xs text-gray-400 font-medium uppercase mb-0.5">Pago</p>
                <p class="text-sm text-gray-700">{{ PAYMENT_METHOD_LABELS[order.paymentMethod] }}</p>
                <span class="text-xs font-medium" :class="order.paymentStatus === 'PAID' ? 'text-green-600' : 'text-yellow-600'">
                  {{ order.paymentStatus === 'PAID' ? '✓ Pagado' : '⏳ Pendiente' }}
                </span>
              </div>
              <div v-if="order.scheduledAt">
                <p class="text-xs text-gray-400 font-medium uppercase mb-0.5">Programado para</p>
                <p class="text-sm text-purple-600 font-medium">{{ formatDate(order.scheduledAt) }}</p>
              </div>
              <div v-if="order.deliveryAddress">
                <p class="text-xs text-gray-400 font-medium uppercase mb-0.5">Dirección</p>
                <p class="text-sm text-gray-700">{{ order.deliveryAddress }}</p>
              </div>
            </div>
            <div>
              <p class="text-xs text-gray-400 font-medium uppercase mb-2">Ítems</p>
              <div class="space-y-2">
                <div v-for="item in order.items" :key="item.id" class="flex justify-between items-center bg-gray-50 rounded-lg p-3 text-sm">
                  <div>
                    <p class="font-medium text-gray-800">{{ item.productName }}</p>
                    <p v-if="item.notes" class="text-xs text-gray-400">{{ item.notes }}</p>
                  </div>
                  <div class="text-right">
                    <p class="font-semibold text-gray-900">{{ formatCurrency(item.subtotal) }}</p>
                    <p class="text-xs text-gray-400">{{ item.quantity }} × {{ formatCurrency(item.unitPrice) }}</p>
                  </div>
                </div>
              </div>
            </div>
            <div class="bg-gray-50 rounded-xl p-3 text-sm space-y-1">
              <div class="flex justify-between text-gray-500"><span>Subtotal</span><span>{{ formatCurrency(order.subtotal) }}</span></div>
              <div class="flex justify-between text-gray-500"><span>Impuesto</span><span>{{ formatCurrency(order.tax) }}</span></div>
              <div v-if="order.deliveryFee" class="flex justify-between text-gray-500"><span>Envío</span><span>{{ formatCurrency(order.deliveryFee) }}</span></div>
              <div v-if="order.discount" class="flex justify-between text-red-500"><span>Descuento</span><span>-{{ formatCurrency(order.discount) }}</span></div>
              <div class="flex justify-between font-bold text-gray-900 border-t border-gray-200 pt-1 mt-1"><span>Total</span><span>{{ formatCurrency(order.total) }}</span></div>
            </div>
            <div v-if="order.notes" class="bg-yellow-50 border border-yellow-100 rounded-lg p-3 text-sm text-gray-600">
              <p class="text-xs font-medium text-yellow-700 mb-1">Notas</p>{{ order.notes }}
            </div>
            <div v-if="NEXT_STATUS[order.status]?.length">
              <p class="text-xs text-gray-400 font-medium uppercase mb-2">Avanzar estado</p>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="ns in NEXT_STATUS[order.status]"
                  :key="ns"
                  class="px-4 py-2 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  :class="ns === 'CANCELLED' ? 'bg-red-100 hover:bg-red-200 text-red-700' : 'bg-indigo-100 hover:bg-indigo-200 text-indigo-700'"
                  :disabled="updatingOrderId === order.id"
                  @click="$emit('update-status', order, ns)"
                >→ {{ ORDER_STATUS_LABELS[ns] }}</button>
              </div>
            </div>
          </div>
          <div class="sticky bottom-0 bg-white px-6 py-4 border-t border-gray-100 flex gap-3">
            <button class="btn-secondary flex-1" @click="$emit('close')">Cerrar</button>
            <button
              v-if="order.status !== 'CANCELLED'"
              class="px-5 py-2.5 bg-indigo-50 text-indigo-600 rounded-xl text-sm font-medium hover:bg-indigo-100 transition-colors flex items-center gap-1.5"
              :disabled="downloadingReceipt"
              @click="$emit('download-receipt', order)"
            >
              <DocumentArrowDownIcon class="h-4 w-4" />
              {{ downloadingReceipt ? 'Generando...' : 'Comprobante' }}
            </button>
            <button class="px-5 py-2.5 bg-red-50 text-red-600 rounded-xl text-sm font-medium hover:bg-red-100 transition-colors" @click="$emit('delete', order)">
              Eliminar
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { XMarkIcon, DocumentArrowDownIcon } from '@heroicons/vue/24/outline'
import {
  ORDER_STATUS_LABELS, ORDER_STATUS_CLASSES, ORDER_TYPE_LABELS, PAYMENT_METHOD_LABELS, NEXT_STATUS,
  type Order, type OrderStatus,
} from '~/composables/catalog/useMerchantOrders'

defineProps<{
  show: boolean
  order: Order | null
  updatingOrderId: string | null
  downloadingReceipt: boolean
  formatCurrency: (n: number) => string
  formatDate: (d: string) => string
}>()

defineEmits<{
  close: []
  'update-status': [order: Order, nextStatus: OrderStatus]
  'download-receipt': [order: Order]
  delete: [order: Order]
}>()
</script>
