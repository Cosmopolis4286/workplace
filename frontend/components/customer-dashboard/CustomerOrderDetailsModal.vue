<template>
  <Teleport to="body">
    <div v-if="show && order" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <!-- Sticky header -->
        <div class="sticky top-0 bg-white px-6 py-4 border-b border-gray-100 flex items-center justify-between z-10">
          <div>
            <h3 class="text-xl font-bold text-gray-800">{{ order.orderNumber }}</h3>
            <span :class="ORDER_STATUS_CLASSES[order.status]" class="text-xs font-semibold px-2 py-0.5 rounded-full">
              {{ ORDER_STATUS_LABELS[order.status] }}
            </span>
          </div>
          <button @click="$emit('close')" class="text-gray-400 hover:text-gray-700 text-2xl leading-none">×</button>
        </div>

        <div class="p-6 space-y-6">
          <!-- Grid info -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <p class="text-xs text-gray-500 font-medium uppercase">Cliente</p>
              <p class="font-semibold text-gray-800">{{ order.customerName }}</p>
              <p v-if="order.customerPhone" class="text-sm text-gray-500">{{ order.customerPhone }}</p>
              <p v-if="order.customerEmail" class="text-sm text-gray-500">{{ order.customerEmail }}</p>
            </div>
            <div>
              <p class="text-xs text-gray-500 font-medium uppercase">Pago</p>
              <p class="font-semibold text-gray-800">{{ PAYMENT_METHOD_LABELS[order.paymentMethod] }}</p>
              <span :class="order.paymentStatus === 'PAID' ? 'text-green-600' : 'text-yellow-600'" class="text-sm font-medium">
                {{ order.paymentStatus === 'PAID' ? 'Pagado' : order.paymentStatus === 'REFUNDED' ? 'Reembolsado' : 'Pendiente de pago' }}
              </span>
            </div>
            <div>
              <p class="text-xs text-gray-500 font-medium uppercase">Tipo</p>
              <p class="font-semibold text-gray-800">{{ ORDER_TYPE_LABELS[order.orderType] }}</p>
            </div>
            <div>
              <p class="text-xs text-gray-500 font-medium uppercase">Creado</p>
              <p class="font-semibold text-gray-800">{{ formatDate(order.createdAt) }}</p>
            </div>
            <div v-if="order.deliveryAddress" class="col-span-2">
              <p class="text-xs text-gray-500 font-medium uppercase">Dirección de entrega</p>
              <p class="text-gray-800">{{ order.deliveryAddress }}</p>
            </div>
            <div v-if="order.scheduledAt" class="col-span-2">
              <p class="text-xs text-gray-500 font-medium uppercase">Fecha programada</p>
              <p class="text-gray-800">{{ formatDate(order.scheduledAt) }}</p>
            </div>
          </div>

          <!-- Items table -->
          <div>
            <p class="text-xs text-gray-500 font-medium uppercase mb-2">Ítems del pedido</p>
            <div class="border border-gray-100 rounded-xl overflow-hidden">
              <table class="w-full text-sm">
                <thead class="bg-gray-50 text-gray-500 text-xs uppercase">
                  <tr>
                    <th class="text-left px-3 py-2">Producto</th>
                    <th class="text-center px-3 py-2">Cant.</th>
                    <th class="text-right px-3 py-2">Precio</th>
                    <th class="text-right px-3 py-2">Subtotal</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-50">
                  <tr v-for="item in order.items" :key="item.id" class="hover:bg-gray-50">
                    <td class="px-3 py-2">
                      <p class="font-medium text-gray-800">{{ item.productName }}</p>
                      <p v-if="item.notes" class="text-xs text-gray-400">{{ item.notes }}</p>
                    </td>
                    <td class="px-3 py-2 text-center text-gray-600">{{ item.quantity }}</td>
                    <td class="px-3 py-2 text-right text-gray-600">{{ formatCurrency(item.unitPrice) }}</td>
                    <td class="px-3 py-2 text-right font-semibold text-gray-800">{{ formatCurrency(item.subtotal) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Totals -->
          <div class="bg-gray-50 rounded-xl p-4 space-y-2">
            <div class="flex justify-between text-sm text-gray-600">
              <span>Subtotal</span><span>{{ formatCurrency(order.subtotal) }}</span>
            </div>
            <div class="flex justify-between text-sm text-gray-600">
              <span>Impuestos</span><span>{{ formatCurrency(order.tax) }}</span>
            </div>
            <div v-if="order.deliveryFee > 0" class="flex justify-between text-sm text-gray-600">
              <span>Envío</span><span>{{ formatCurrency(order.deliveryFee) }}</span>
            </div>
            <div v-if="order.discount > 0" class="flex justify-between text-sm text-green-600">
              <span>Descuento</span><span>-{{ formatCurrency(order.discount) }}</span>
            </div>
            <div class="flex justify-between text-base font-bold text-gray-800 border-t border-gray-200 pt-2">
              <span>Total</span><span class="text-green-700">{{ formatCurrency(order.total) }}</span>
            </div>
          </div>

          <!-- Notes -->
          <div v-if="order.notes || order.cancelReason">
            <p class="text-xs text-gray-500 font-medium uppercase mb-1">
              {{ order.cancelReason ? 'Motivo de cancelación' : 'Notas' }}
            </p>
            <p class="text-gray-700 bg-gray-50 p-3 rounded-lg text-sm">
              {{ order.cancelReason ?? order.notes }}
            </p>
          </div>
        </div>

        <!-- Footer actions -->
        <div class="px-6 pb-6 flex gap-3">
          <button @click="$emit('close')" class="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-semibold text-sm">
            Cerrar
          </button>
          <button
            v-if="order.status === 'PENDING'"
            @click="$emit('cancel', order)"
            class="flex-1 py-2.5 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors font-semibold text-sm"
          >
            Cancelar Pedido
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ORDER_STATUS_LABELS, ORDER_STATUS_CLASSES, ORDER_TYPE_LABELS, PAYMENT_METHOD_LABELS, type Order } from '~/composables/catalog/useMerchantOrders'

defineProps<{
  show: boolean
  order: Order | null
  formatCurrency: (n: number) => string
  formatDate: (d: string) => string
}>()

defineEmits<{
  close: []
  cancel: [order: Order]
}>()
</script>
