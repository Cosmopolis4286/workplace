<template>
  <div class="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-green-50">

    <!-- Header -->
    <div class="bg-gradient-to-r from-green-500 via-teal-500 to-blue-500 text-white p-6 rounded-b-3xl shadow-2xl">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-4">
          <div class="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
            <ShoppingBag class="w-8 h-8" />
          </div>
          <div>
            <h1 class="text-3xl font-bold">Mi Panel de Cliente</h1>
            <p class="text-green-100">Gestiona tus pedidos y compras</p>
          </div>
        </div>
        <div class="flex items-center space-x-3">
          <button
            @click="loadAll"
            :disabled="loading || loadingStats"
            class="p-2 bg-white/20 rounded-xl backdrop-blur-sm hover:scale-110 transition-transform duration-200 disabled:opacity-50"
            title="Actualizar"
          >
            <RefreshCw class="w-5 h-5" :class="{ 'animate-spin': loading || loadingStats }" />
          </button>
          <NuxtLink to="/profile" class="p-2 bg-white/20 rounded-xl backdrop-blur-sm hover:scale-110 transition-transform duration-200">
            <User class="w-6 h-6" />
          </NuxtLink>
        </div>
      </div>
    </div>

    <div class="p-6 max-w-7xl mx-auto space-y-8">

      <!-- Error banner -->
      <div v-if="error" class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center justify-between">
        <span class="text-sm">{{ error }}</span>
        <button @click="error = null" class="text-red-500 hover:text-red-700 font-bold text-lg leading-none">×</button>
      </div>

      <!-- Stats cards -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div v-for="card in statCards" :key="card.label"
             class="bg-white/80 backdrop-blur-sm p-5 rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 border border-white/20">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-gray-500 text-xs font-medium uppercase tracking-wide">{{ card.label }}</p>
              <p class="text-3xl font-bold text-gray-800 mt-1">
                <span v-if="loadingStats" class="inline-block w-12 h-7 bg-gray-200 rounded animate-pulse" />
                <template v-else>{{ card.value }}</template>
              </p>
              <p :class="card.subClass" class="text-xs flex items-center gap-1 mt-1">
                <component :is="card.icon" class="w-3.5 h-3.5" />
                {{ card.sub }}
              </p>
            </div>
            <div :class="card.bgClass" class="p-3 rounded-xl shadow-lg">
              <component :is="card.bigIcon" class="w-7 h-7 text-white" />
            </div>
          </div>
        </div>
      </div>

      <!-- Filters + search bar -->
      <div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-5 border border-white/20">
        <div class="flex flex-wrap gap-3 items-center justify-between">
          <div class="flex gap-2 flex-wrap">
            <button
              v-for="f in filterTabs"
              :key="f.value"
              @click="setFilter(f.value)"
              :class="filters.status === f.value
                ? 'bg-green-500 text-white shadow-md'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
              class="px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150"
            >
              {{ f.label }}
              <span v-if="f.value && statusCount[f.value]" class="ml-1 text-xs opacity-80">({{ statusCount[f.value] }})</span>
            </button>
          </div>
          <div class="flex gap-2">
            <input
              v-model="searchQuery"
              @input="debouncedSearch"
              type="text"
              placeholder="Buscar por número, cliente..."
              class="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-400 focus:border-transparent w-52"
            />
            <button
              @click="showNewOrderModal = true"
              class="flex items-center gap-2 bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-1.5 rounded-lg text-sm font-semibold hover:scale-105 transition-transform shadow-md"
            >
              <Plus class="w-4 h-4" />
              Nuevo Pedido
            </button>
          </div>
        </div>
      </div>

      <!-- Active orders -->
      <div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-white/20">
        <div class="flex items-center justify-between mb-5">
          <h2 class="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Zap class="w-5 h-5 text-yellow-500" />
            Pedidos Activos
          </h2>
          <span class="bg-gradient-to-r from-green-500 to-green-600 text-white px-3 py-1 rounded-full text-sm font-bold shadow">
            {{ activeOrders.length }}
          </span>
        </div>

        <!-- Loading skeleton -->
        <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <div v-for="i in 3" :key="i" class="animate-pulse bg-gray-100 rounded-xl h-44" />
        </div>

        <div v-else-if="activeOrders.length === 0" class="text-center py-12">
          <ShoppingBag class="w-14 h-14 text-gray-300 mx-auto mb-3" />
          <p class="text-gray-500 font-medium">No hay pedidos activos</p>
          <p class="text-gray-400 text-sm mt-1">Crea un nuevo pedido para empezar</p>
        </div>

        <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <div
            v-for="order in activeOrders"
            :key="order.id"
            class="bg-gradient-to-br from-white to-gray-50 p-4 rounded-xl shadow hover:shadow-lg transition-all duration-300 border border-gray-100"
          >
            <!-- Header row -->
            <div class="flex items-start justify-between mb-3">
              <div class="flex items-center gap-2">
                <div class="w-9 h-9 bg-gradient-to-br from-green-400 to-teal-500 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  {{ order.customerName.charAt(0).toUpperCase() }}
                </div>
                <div>
                  <p class="font-semibold text-gray-800 text-sm leading-tight">{{ order.orderNumber }}</p>
                  <p class="text-xs text-gray-500">{{ order.customerName }}</p>
                </div>
              </div>
              <span :class="ORDER_STATUS_CLASSES[order.status]" class="px-2 py-0.5 rounded-full text-xs font-semibold flex-shrink-0">
                {{ ORDER_STATUS_LABELS[order.status] }}
              </span>
            </div>

            <!-- Metrics -->
            <div class="grid grid-cols-3 gap-2 mb-3 text-center">
              <div class="bg-green-50 rounded-lg py-1.5">
                <p class="text-xs text-gray-500">Total</p>
                <p class="text-sm font-bold text-green-700">{{ formatCurrency(order.total) }}</p>
              </div>
              <div class="bg-blue-50 rounded-lg py-1.5">
                <p class="text-xs text-gray-500">Ítems</p>
                <p class="text-sm font-bold text-blue-700">{{ order.itemCount ?? order.items.length }}</p>
              </div>
              <div class="bg-purple-50 rounded-lg py-1.5">
                <p class="text-xs text-gray-500">Tipo</p>
                <p class="text-xs font-semibold text-purple-700 leading-tight">{{ ORDER_TYPE_LABELS[order.orderType] }}</p>
              </div>
            </div>

            <!-- Status progression buttons -->
            <div v-if="NEXT_STATUS[order.status]?.length" class="flex gap-1 mb-2">
              <button
                v-for="next in NEXT_STATUS[order.status]"
                :key="next"
                @click="patchStatus(order.id, next)"
                :class="next === 'CANCELLED'
                  ? 'flex-1 bg-red-100 text-red-700 hover:bg-red-200'
                  : 'flex-1 bg-green-100 text-green-700 hover:bg-green-200'"
                class="py-1 rounded-lg text-xs font-semibold transition-colors"
              >
                {{ ORDER_STATUS_LABELS[next] }}
              </button>
            </div>

            <button
              @click="openDetails(order)"
              class="w-full border border-gray-200 text-gray-600 hover:border-green-400 hover:text-green-600 py-1.5 rounded-lg text-xs font-semibold transition-colors"
            >
              Ver Detalles
            </button>
          </div>
        </div>
      </div>

      <!-- Order history -->
      <div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-white/20">
        <div class="flex items-center justify-between mb-5">
          <h2 class="text-xl font-bold text-gray-800 flex items-center gap-2">
            <History class="w-5 h-5 text-blue-500" />
            Historial de Pedidos
          </h2>
        </div>

        <div v-if="loading" class="space-y-2">
          <div v-for="i in 4" :key="i" class="animate-pulse bg-gray-100 rounded-lg h-14" />
        </div>

        <div v-else-if="recentOrders.length === 0" class="text-center py-8 text-gray-400">
          <p>Sin historial aún</p>
        </div>

        <div v-else class="space-y-2">
          <div
            v-for="order in recentOrders"
            :key="order.id"
            class="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer border border-transparent hover:border-gray-200"
            @click="openDetails(order)"
          >
            <div :class="orderTypeDot(order.orderType)" class="w-2.5 h-2.5 rounded-full flex-shrink-0" />
            <div class="flex-1 min-w-0">
              <p class="font-semibold text-gray-800 text-sm truncate">{{ order.orderNumber }}</p>
              <p class="text-xs text-gray-400">{{ formatDate(order.completedAt ?? order.cancelledAt ?? order.createdAt) }}</p>
            </div>
            <div class="text-right flex-shrink-0">
              <p class="font-bold text-gray-800 text-sm">{{ formatCurrency(order.total) }}</p>
              <span :class="ORDER_STATUS_CLASSES[order.status]" class="text-xs font-semibold px-2 py-0.5 rounded-full">
                {{ ORDER_STATUS_LABELS[order.status] }}
              </span>
            </div>
          </div>
        </div>

        <!-- Pagination -->
        <div v-if="totalPages > 1" class="flex items-center justify-center gap-2 mt-6">
          <button
            @click="changePage(currentPage - 1)"
            :disabled="currentPage <= 1"
            class="px-3 py-1.5 rounded-lg border text-sm disabled:opacity-40 hover:bg-gray-100 transition-colors"
          >
            ‹ Anterior
          </button>
          <span class="text-sm text-gray-600">{{ currentPage }} / {{ totalPages }}</span>
          <button
            @click="changePage(currentPage + 1)"
            :disabled="currentPage >= totalPages"
            class="px-3 py-1.5 rounded-lg border text-sm disabled:opacity-40 hover:bg-gray-100 transition-colors"
          >
            Siguiente ›
          </button>
        </div>
      </div>
    </div>

    <!-- ── Order Details Modal ──────────────────────────────────────────────── -->
    <Teleport to="body">
      <div v-if="showDetailsModal && selectedOrder" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div class="bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
          <!-- Sticky header -->
          <div class="sticky top-0 bg-white px-6 py-4 border-b border-gray-100 flex items-center justify-between z-10">
            <div>
              <h3 class="text-xl font-bold text-gray-800">{{ selectedOrder.orderNumber }}</h3>
              <span :class="ORDER_STATUS_CLASSES[selectedOrder.status]" class="text-xs font-semibold px-2 py-0.5 rounded-full">
                {{ ORDER_STATUS_LABELS[selectedOrder.status] }}
              </span>
            </div>
            <button @click="closeDetailsModal" class="text-gray-400 hover:text-gray-700 text-2xl leading-none">×</button>
          </div>

          <div class="p-6 space-y-6">
            <!-- Grid info -->
            <div class="grid grid-cols-2 gap-4">
              <div>
                <p class="text-xs text-gray-500 font-medium uppercase">Cliente</p>
                <p class="font-semibold text-gray-800">{{ selectedOrder.customerName }}</p>
                <p v-if="selectedOrder.customerPhone" class="text-sm text-gray-500">{{ selectedOrder.customerPhone }}</p>
                <p v-if="selectedOrder.customerEmail" class="text-sm text-gray-500">{{ selectedOrder.customerEmail }}</p>
              </div>
              <div>
                <p class="text-xs text-gray-500 font-medium uppercase">Pago</p>
                <p class="font-semibold text-gray-800">{{ PAYMENT_METHOD_LABELS[selectedOrder.paymentMethod] }}</p>
                <span :class="selectedOrder.paymentStatus === 'PAID' ? 'text-green-600' : 'text-yellow-600'" class="text-sm font-medium">
                  {{ selectedOrder.paymentStatus === 'PAID' ? 'Pagado' : selectedOrder.paymentStatus === 'REFUNDED' ? 'Reembolsado' : 'Pendiente de pago' }}
                </span>
              </div>
              <div>
                <p class="text-xs text-gray-500 font-medium uppercase">Tipo</p>
                <p class="font-semibold text-gray-800">{{ ORDER_TYPE_LABELS[selectedOrder.orderType] }}</p>
              </div>
              <div>
                <p class="text-xs text-gray-500 font-medium uppercase">Creado</p>
                <p class="font-semibold text-gray-800">{{ formatDate(selectedOrder.createdAt) }}</p>
              </div>
              <div v-if="selectedOrder.deliveryAddress" class="col-span-2">
                <p class="text-xs text-gray-500 font-medium uppercase">Dirección de entrega</p>
                <p class="text-gray-800">{{ selectedOrder.deliveryAddress }}</p>
              </div>
              <div v-if="selectedOrder.scheduledAt" class="col-span-2">
                <p class="text-xs text-gray-500 font-medium uppercase">Fecha programada</p>
                <p class="text-gray-800">{{ formatDate(selectedOrder.scheduledAt) }}</p>
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
                    <tr v-for="item in selectedOrder.items" :key="item.id" class="hover:bg-gray-50">
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
                <span>Subtotal</span><span>{{ formatCurrency(selectedOrder.subtotal) }}</span>
              </div>
              <div class="flex justify-between text-sm text-gray-600">
                <span>Impuestos</span><span>{{ formatCurrency(selectedOrder.tax) }}</span>
              </div>
              <div v-if="selectedOrder.deliveryFee > 0" class="flex justify-between text-sm text-gray-600">
                <span>Envío</span><span>{{ formatCurrency(selectedOrder.deliveryFee) }}</span>
              </div>
              <div v-if="selectedOrder.discount > 0" class="flex justify-between text-sm text-green-600">
                <span>Descuento</span><span>-{{ formatCurrency(selectedOrder.discount) }}</span>
              </div>
              <div class="flex justify-between text-base font-bold text-gray-800 border-t border-gray-200 pt-2">
                <span>Total</span><span class="text-green-700">{{ formatCurrency(selectedOrder.total) }}</span>
              </div>
            </div>

            <!-- Notes -->
            <div v-if="selectedOrder.notes || selectedOrder.cancelReason">
              <p class="text-xs text-gray-500 font-medium uppercase mb-1">
                {{ selectedOrder.cancelReason ? 'Motivo de cancelación' : 'Notas' }}
              </p>
              <p class="text-gray-700 bg-gray-50 p-3 rounded-lg text-sm">
                {{ selectedOrder.cancelReason ?? selectedOrder.notes }}
              </p>
            </div>
          </div>

          <!-- Footer actions -->
          <div class="px-6 pb-6 flex gap-3">
            <button @click="closeDetailsModal" class="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-semibold text-sm">
              Cerrar
            </button>
            <button
              v-if="selectedOrder.status === 'PENDING'"
              @click="cancelOrder(selectedOrder)"
              class="flex-1 py-2.5 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors font-semibold text-sm"
            >
              Cancelar Pedido
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ── New Order Modal ──────────────────────────────────────────────────── -->
    <Teleport to="body">
      <div v-if="showNewOrderModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div class="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
          <div class="sticky top-0 bg-white px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 class="text-xl font-bold text-gray-800">Nuevo Pedido</h3>
            <button @click="closeNewOrderModal" class="text-gray-400 hover:text-gray-700 text-2xl leading-none">×</button>
          </div>

          <form @submit.prevent="submitNewOrder" class="p-6 space-y-4">
            <!-- Customer info -->
            <div class="grid grid-cols-2 gap-3">
              <div class="col-span-2">
                <label class="text-xs font-medium text-gray-600 uppercase tracking-wide">Nombre del cliente *</label>
                <input
                  v-model="newOrder.customerName"
                  required
                  type="text"
                  placeholder="Nombre completo"
                  class="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-400 focus:border-transparent"
                />
              </div>
              <div>
                <label class="text-xs font-medium text-gray-600 uppercase tracking-wide">Teléfono</label>
                <input
                  v-model="newOrder.customerPhone"
                  type="tel"
                  placeholder="555-0000"
                  class="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-400 focus:border-transparent"
                />
              </div>
              <div>
                <label class="text-xs font-medium text-gray-600 uppercase tracking-wide">Email</label>
                <input
                  v-model="newOrder.customerEmail"
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
                  v-model="newOrder.orderType"
                  class="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-400 focus:border-transparent"
                >
                  <option v-for="(label, val) in ORDER_TYPE_LABELS" :key="val" :value="val">{{ label }}</option>
                </select>
              </div>
              <div>
                <label class="text-xs font-medium text-gray-600 uppercase tracking-wide">Método de pago</label>
                <select
                  v-model="newOrder.paymentMethod"
                  class="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-400 focus:border-transparent"
                >
                  <option v-for="(label, val) in PAYMENT_METHOD_LABELS" :key="val" :value="val">{{ label }}</option>
                </select>
              </div>
            </div>

            <!-- Delivery address (if needed) -->
            <div v-if="newOrder.orderType === 'IMMEDIATE' || newOrder.orderType === 'SCHEDULED'">
              <label class="text-xs font-medium text-gray-600 uppercase tracking-wide">Dirección de entrega</label>
              <input
                v-model="newOrder.deliveryAddress"
                type="text"
                placeholder="Calle, número, colonia"
                class="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-400 focus:border-transparent"
              />
            </div>

            <!-- Scheduled date -->
            <div v-if="newOrder.orderType === 'SCHEDULED'">
              <label class="text-xs font-medium text-gray-600 uppercase tracking-wide">Fecha programada *</label>
              <input
                v-model="newOrder.scheduledAt"
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

              <div v-for="(item, idx) in newOrder.items" :key="idx" class="flex gap-2 mb-2 items-start">
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
                  v-if="newOrder.items.length > 1"
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
                v-model="newOrder.notes"
                placeholder="Instrucciones especiales..."
                rows="2"
                class="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-400 focus:border-transparent resize-none"
              />
            </div>

            <div class="flex gap-3 pt-2">
              <button
                type="button"
                @click="closeNewOrderModal"
                class="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-semibold text-sm"
              >
                Cancelar
              </button>
              <button
                type="submit"
                :disabled="loading || !isNewOrderValid"
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

  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

import { ref, computed, onMounted } from 'vue'
import {
  ShoppingBag, User, DollarSign, Clock, CheckCircle,
  Plus, History, TrendingUp, RefreshCw, Zap, XCircle
} from 'lucide-vue-next'
import {
  useMerchantOrders,
  type OrderStatus,
  type OrderType,
  type PaymentMethod,
  type CreateOrderPayload,
} from '~/composables/useMerchantOrders'

const {
  orders,
  stats,
  loading,
  loadingStats,
  error,
  totalCount,
  currentPage,
  activeOrders,
  recentOrders,
  loadOrders,
  loadStats,
  createOrder,
  updateStatus,
  formatCurrency,
  formatDate,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_CLASSES,
  ORDER_TYPE_LABELS,
  PAYMENT_METHOD_LABELS,
  NEXT_STATUS,
} = useMerchantOrders()

// ── UI state ────────────────────────────────────────────────────────────────
const showDetailsModal  = ref(false)
const showNewOrderModal = ref(false)
const selectedOrder     = ref<any>(null)

// ── Filters ─────────────────────────────────────────────────────────────────
const filters     = ref<{ status?: OrderStatus }>({})
const searchQuery = ref('')
let   searchTimer: ReturnType<typeof setTimeout> | null = null

const filterTabs = [
  { label: 'Todos',      value: undefined },
  { label: 'Pendientes', value: 'PENDING' as OrderStatus },
  { label: 'Activos',    value: 'PREPARING' as OrderStatus },
  { label: 'Entregados', value: 'DELIVERED'  as OrderStatus },
  { label: 'Cancelados', value: 'CANCELLED'  as OrderStatus },
]

const statusCount = computed(() => {
  const map: Record<string, number> = {}
  orders.value.forEach(o => { map[o.status] = (map[o.status] ?? 0) + 1 })
  return map
})

const totalPages = computed(() => Math.ceil(totalCount.value / 20))

function setFilter(status?: OrderStatus) {
  filters.value.status = status
  loadOrders({ status, search: searchQuery.value || undefined })
}

function debouncedSearch() {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    loadOrders({ status: filters.value.status, search: searchQuery.value || undefined })
  }, 350)
}

function changePage(page: number) {
  loadOrders({ status: filters.value.status, search: searchQuery.value || undefined, page })
}

// ── Stat cards config ────────────────────────────────────────────────────────
const statCards = computed(() => [
  {
    label:   'Mis Pedidos',
    value:   stats.value.totalOrders,
    sub:     `Activos: ${stats.value.activeOrders}`,
    subClass:'text-green-500',
    icon:    TrendingUp,
    bigIcon: ShoppingBag,
    bgClass: 'bg-gradient-to-br from-green-400 to-green-600',
  },
  {
    label:   'Ingresos del Mes',
    value:   formatCurrency(stats.value.monthlyRevenue),
    sub:     `Ticket promedio: ${formatCurrency(stats.value.avgTicket)}`,
    subClass:'text-blue-500',
    icon:    DollarSign,
    bigIcon: DollarSign,
    bgClass: 'bg-gradient-to-br from-blue-400 to-blue-600',
  },
  {
    label:   'Pendientes',
    value:   stats.value.pendingOrders,
    sub:     'En espera',
    subClass:'text-yellow-500',
    icon:    Clock,
    bigIcon: Clock,
    bgClass: 'bg-gradient-to-br from-yellow-400 to-yellow-600',
  },
  {
    label:   'Completados',
    value:   stats.value.completedOrders,
    sub:     `Cancelados: ${stats.value.cancelledOrders}`,
    subClass:'text-emerald-500',
    icon:    CheckCircle,
    bigIcon: CheckCircle,
    bgClass: 'bg-gradient-to-br from-emerald-400 to-emerald-600',
  },
])

// ── Order actions ────────────────────────────────────────────────────────────
function openDetails(order: any) {
  selectedOrder.value = order
  showDetailsModal.value = true
}

function closeDetailsModal() {
  showDetailsModal.value = false
  selectedOrder.value = null
}

async function patchStatus(id: string, status: OrderStatus) {
  await updateStatus(id, status)
}

async function cancelOrder(order: any) {
  const ok = await updateStatus(order.id, 'CANCELLED')
  if (ok) closeDetailsModal()
}

function orderTypeDot(type: OrderType) {
  const map: Record<OrderType, string> = {
    IMMEDIATE: 'bg-green-400',
    SCHEDULED: 'bg-blue-400',
    TAKEAWAY:  'bg-purple-400',
    DINE_IN:   'bg-orange-400',
  }
  return map[type] ?? 'bg-gray-400'
}

// ── New order form ────────────────────────────────────────────────────────────
const defaultItem = () => ({ productName: '', quantity: 1, unitPrice: 0 })

const newOrder = ref<CreateOrderPayload & { items: { productName: string; quantity: number; unitPrice: number }[] }>({
  customerName:    '',
  customerPhone:   '',
  customerEmail:   '',
  deliveryAddress: '',
  notes:           '',
  orderType:       'IMMEDIATE',
  paymentMethod:   'CASH',
  scheduledAt:     '',
  items:           [defaultItem()],
})

const newOrderTotal = computed(() =>
  newOrder.value.items.reduce((s, i) => s + (i.unitPrice || 0) * (i.quantity || 0), 0)
)

const isNewOrderValid = computed(() =>
  newOrder.value.customerName.trim().length > 0 &&
  newOrder.value.items.every(i => i.productName.trim() && i.quantity > 0 && i.unitPrice >= 0)
)

function addItem() { newOrder.value.items.push(defaultItem()) }
function removeItem(idx: number) { newOrder.value.items.splice(idx, 1) }

function closeNewOrderModal() {
  showNewOrderModal.value = false
  newOrder.value = {
    customerName: '', customerPhone: '', customerEmail: '', deliveryAddress: '',
    notes: '', orderType: 'IMMEDIATE', paymentMethod: 'CASH', scheduledAt: '',
    items: [defaultItem()],
  }
}

async function submitNewOrder() {
  const payload: CreateOrderPayload = {
    ...newOrder.value,
    scheduledAt: newOrder.value.scheduledAt || undefined,
    deliveryAddress: newOrder.value.deliveryAddress || undefined,
    customerPhone: newOrder.value.customerPhone || undefined,
    customerEmail: newOrder.value.customerEmail || undefined,
    notes: newOrder.value.notes || undefined,
    items: newOrder.value.items.map(i => ({
      productName: i.productName,
      quantity:    i.quantity,
      unitPrice:   i.unitPrice,
    })),
  }
  const result = await createOrder(payload)
  if (result) closeNewOrderModal()
}

// ── Load on mount ─────────────────────────────────────────────────────────────
async function loadAll() {
  await Promise.all([loadStats(), loadOrders()])
}

onMounted(() => loadAll())
</script>
