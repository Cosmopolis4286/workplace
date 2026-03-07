<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">

    <!-- Header -->
    <div class="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 text-white p-6 rounded-b-3xl shadow-2xl">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-4">
          <div class="p-3 bg-white/20 rounded-2xl backdrop-blur-sm animate-float">
            <ShoppingCart class="w-8 h-8" />
          </div>
          <div>
            <h1 class="text-3xl font-bold">Gestión de Pedidos</h1>
            <p class="text-blue-100">Sistema de pedidos y programación de servicios</p>
          </div>
        </div>
        <div class="flex items-center space-x-3">
          <!-- Filter bar -->
          <div class="relative hidden md:block">
            <Search class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/60" />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Buscar pedido…"
              class="pl-9 pr-3 py-2 bg-white/20 backdrop-blur-sm rounded-xl text-white placeholder-white/60 text-sm focus:outline-none focus:ring-2 focus:ring-white/40 w-52"
              @keydown.enter="applyFilters"
            />
          </div>
          <button @click="applyFilters" title="Refrescar" class="p-2 bg-white/20 rounded-xl backdrop-blur-sm hover:scale-110 transition-transform">
            <RefreshCw class="w-5 h-5" :class="{ 'animate-spin': loading }" />
          </button>
        </div>
      </div>
    </div>

    <div class="p-6">

      <!-- Error banner -->
      <div v-if="error" class="mb-6 bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center justify-between">
        <p class="text-red-700 text-sm">{{ error }}</p>
        <button @click="error = null" class="text-red-500 hover:text-red-700 text-lg leading-none">×</button>
      </div>

      <!-- Stats Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <!-- Total active -->
        <div class="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 border border-white/20">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-gray-600 text-sm font-medium">Pedidos Activos</p>
              <p class="text-3xl font-bold text-gray-800">
                <span v-if="loadingStats" class="h-8 w-16 bg-gray-200 rounded animate-pulse inline-block" />
                <template v-else>{{ stats.activeOrders }}</template>
              </p>
              <p class="text-blue-500 text-sm flex items-center mt-1">
                <Clock class="w-4 h-4 mr-1" />
                {{ stats.pendingOrders }} pendientes
              </p>
            </div>
            <div class="p-3 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl shadow-lg">
              <ShoppingCart class="w-8 h-8 text-white" />
            </div>
          </div>
        </div>

        <!-- Scheduled -->
        <div class="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 border border-white/20">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-gray-600 text-sm font-medium">Programados</p>
              <p class="text-3xl font-bold text-gray-800">
                <span v-if="loadingStats" class="h-8 w-16 bg-gray-200 rounded animate-pulse inline-block" />
                <template v-else>{{ scheduledCount }}</template>
              </p>
              <p class="text-green-500 text-sm flex items-center mt-1">
                <Calendar class="w-4 h-4 mr-1" />
                En cola
              </p>
            </div>
            <div class="p-3 bg-gradient-to-br from-green-400 to-green-600 rounded-xl shadow-lg">
              <Calendar class="w-8 h-8 text-white" />
            </div>
          </div>
        </div>

        <!-- Monthly revenue -->
        <div class="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 border border-white/20">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-gray-600 text-sm font-medium">Ingresos del Mes</p>
              <p class="text-3xl font-bold text-gray-800">
                <span v-if="loadingStats" class="h-8 w-24 bg-gray-200 rounded animate-pulse inline-block" />
                <template v-else>{{ formatCurrency(stats.monthlyRevenue) }}</template>
              </p>
              <p class="text-purple-500 text-sm flex items-center mt-1">
                <DollarSign class="w-4 h-4 mr-1" />
                Ticket avg: {{ formatCurrency(stats.avgTicket) }}
              </p>
            </div>
            <div class="p-3 bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl shadow-lg">
              <DollarSign class="w-8 h-8 text-white" />
            </div>
          </div>
        </div>

        <!-- Completed -->
        <div class="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 border border-white/20">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-gray-600 text-sm font-medium">Completados</p>
              <p class="text-3xl font-bold text-gray-800">
                <span v-if="loadingStats" class="h-8 w-16 bg-gray-200 rounded animate-pulse inline-block" />
                <template v-else>{{ stats.completedOrders }}</template>
              </p>
              <p class="text-orange-500 text-sm flex items-center mt-1">
                <CheckCircle class="w-4 h-4 mr-1" />
                {{ stats.cancelledOrders }} cancelados
              </p>
            </div>
            <div class="p-3 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl shadow-lg">
              <CheckCircle class="w-8 h-8 text-white" />
            </div>
          </div>
        </div>
      </div>

      <!-- Quick Actions + Filters -->
      <div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 mb-8 border border-white/20">
        <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <h2 class="text-xl font-bold text-gray-800 flex items-center">
            <Plus class="w-5 h-5 mr-2 text-blue-500" />
            Acciones Rápidas
          </h2>
          <!-- Status filter chips -->
          <div class="flex flex-wrap gap-2">
            <button
              v-for="chip in statusChips"
              :key="chip.value ?? 'all'"
              @click="setStatusFilter(chip.value)"
              :class="[
                'px-3 py-1 rounded-full text-xs font-semibold transition-all',
                activeStatusFilter === chip.value
                  ? 'bg-indigo-600 text-white shadow'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              ]"
            >
              {{ chip.label }}
            </button>
          </div>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
          <button @click="openNewOrderModal()" class="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 rounded-xl hover:scale-105 transition-transform shadow-lg">
            <ShoppingCart class="w-7 h-7 mx-auto mb-1" />
            <span class="block text-xs font-semibold">Nuevo Pedido</span>
          </button>
          <button @click="openScheduleModal()" class="bg-gradient-to-r from-green-500 to-green-600 text-white p-4 rounded-xl hover:scale-105 transition-transform shadow-lg">
            <Calendar class="w-7 h-7 mx-auto mb-1" />
            <span class="block text-xs font-semibold">Programar Servicio</span>
          </button>
          <NuxtLink to="/clientes" class="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-4 rounded-xl hover:scale-105 transition-transform shadow-lg flex flex-col items-center justify-center">
            <Users class="w-7 h-7 mb-1" />
            <span class="block text-xs font-semibold">Gestionar Clientes</span>
          </NuxtLink>
          <NuxtLink to="/analytics" class="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-4 rounded-xl hover:scale-105 transition-transform shadow-lg flex flex-col items-center justify-center">
            <BarChart3 class="w-7 h-7 mb-1" />
            <span class="block text-xs font-semibold">Ver Reportes</span>
          </NuxtLink>
        </div>
      </div>

      <!-- Orders panels -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">

        <!-- Active Orders -->
        <div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-white/20">
          <div class="flex items-center justify-between mb-5">
            <h2 class="text-xl font-bold text-gray-800 flex items-center">
              <Clock class="w-5 h-5 mr-2 text-green-500" />
              Pedidos Activos
            </h2>
            <span class="bg-gradient-to-r from-green-500 to-green-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow">
              {{ activeOrders.length }}
            </span>
          </div>

          <!-- Skeleton -->
          <div v-if="loading" class="space-y-3">
            <div v-for="i in 3" :key="i" class="h-24 bg-gray-100 rounded-xl animate-pulse" />
          </div>

          <!-- Empty -->
          <div v-else-if="!activeOrders.length" class="text-center py-10 text-gray-400">
            <ShoppingCart class="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p class="text-sm">No hay pedidos activos</p>
          </div>

          <!-- List -->
          <div v-else class="space-y-3 max-h-[460px] overflow-y-auto pr-1">
            <div
              v-for="order in activeOrders"
              :key="order.id"
              class="bg-gradient-to-br from-white to-gray-50 p-4 rounded-xl shadow hover:shadow-md transition-all border border-gray-100"
            >
              <div class="flex items-start justify-between mb-2">
                <div class="flex items-center space-x-3">
                  <div class="w-9 h-9 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0">
                    {{ order.customerName.charAt(0).toUpperCase() }}
                  </div>
                  <div>
                    <h3 class="font-semibold text-gray-800 text-sm">{{ order.customerName }}</h3>
                    <p class="text-xs text-gray-400">{{ order.orderNumber }}</p>
                  </div>
                </div>
                <span :class="ORDER_STATUS_CLASSES[order.status]" class="px-2 py-0.5 rounded-full text-xs font-medium shrink-0">
                  {{ ORDER_STATUS_LABELS[order.status] }}
                </span>
              </div>

              <div class="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-500 mb-3">
                <span class="flex items-center gap-1">
                  <Clock class="w-3 h-3" />{{ formatDate(order.createdAt) }}
                </span>
                <span class="flex items-center gap-1">
                  <DollarSign class="w-3 h-3" />{{ formatCurrency(order.total) }}
                </span>
                <span class="flex items-center gap-1">
                  <Tag class="w-3 h-3" />{{ ORDER_TYPE_LABELS[order.orderType] }}
                </span>
                <span class="flex items-center gap-1">
                  <Package class="w-3 h-3" />{{ order.itemCount ?? order.items?.length ?? 0 }} ítems
                </span>
              </div>

              <div class="flex gap-2">
                <button @click="openDetailsModal(order)" class="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-1.5 px-2 rounded-lg text-xs font-semibold transition-colors">
                  Ver detalles
                </button>
                <!-- Next-status buttons from NEXT_STATUS map -->
                <button
                  v-for="nextStatus in (NEXT_STATUS[order.status] ?? [])"
                  :key="nextStatus"
                  @click="doUpdateStatus(order, nextStatus)"
                  :class="[
                    'flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-colors',
                    nextStatus === 'CANCELADO'
                      ? 'bg-red-100 hover:bg-red-200 text-red-700'
                      : 'bg-indigo-100 hover:bg-indigo-200 text-indigo-700'
                  ]"
                >
                  → {{ ORDER_STATUS_LABELS[nextStatus] }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Scheduled / Programmed Orders -->
        <div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-white/20">
          <div class="flex items-center justify-between mb-5">
            <h2 class="text-xl font-bold text-gray-800 flex items-center">
              <Calendar class="w-5 h-5 mr-2 text-purple-500" />
              Servicios Programados
            </h2>
            <span class="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow">
              {{ scheduledOrders.length }}
            </span>
          </div>

          <div v-if="loading" class="space-y-3">
            <div v-for="i in 3" :key="i" class="h-24 bg-gray-100 rounded-xl animate-pulse" />
          </div>

          <div v-else-if="!scheduledOrders.length" class="text-center py-10 text-gray-400">
            <Calendar class="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p class="text-sm">No hay servicios programados</p>
          </div>

          <div v-else class="space-y-3 max-h-[460px] overflow-y-auto pr-1">
            <div
              v-for="order in scheduledOrders"
              :key="order.id"
              class="bg-gradient-to-br from-white to-purple-50 p-4 rounded-xl shadow hover:shadow-md transition-all border border-purple-100"
            >
              <div class="flex items-start justify-between mb-2">
                <div class="flex items-center space-x-3">
                  <div class="w-9 h-9 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0">
                    {{ order.customerName.charAt(0).toUpperCase() }}
                  </div>
                  <div>
                    <h3 class="font-semibold text-gray-800 text-sm">{{ order.customerName }}</h3>
                    <p class="text-xs text-gray-400">{{ order.orderNumber }}</p>
                  </div>
                </div>
                <span :class="ORDER_STATUS_CLASSES[order.status]" class="px-2 py-0.5 rounded-full text-xs font-medium shrink-0">
                  {{ ORDER_STATUS_LABELS[order.status] }}
                </span>
              </div>

              <div class="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-500 mb-3">
                <span class="flex items-center gap-1 text-purple-600 font-medium">
                  <CalendarClock class="w-3 h-3" />{{ formatDate(order.scheduledAt) }}
                </span>
                <span class="flex items-center gap-1">
                  <DollarSign class="w-3 h-3" />{{ formatCurrency(order.total) }}
                </span>
              </div>

              <div class="flex gap-2">
                <button @click="openDetailsModal(order)" class="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-1.5 px-2 rounded-lg text-xs font-semibold transition-colors">
                  Ver detalles
                </button>
                <button
                  v-for="nextStatus in (NEXT_STATUS[order.status] ?? [])"
                  :key="nextStatus"
                  @click="doUpdateStatus(order, nextStatus)"
                  :class="[
                    'flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-colors',
                    nextStatus === 'CANCELADO'
                      ? 'bg-red-100 hover:bg-red-200 text-red-700'
                      : 'bg-indigo-100 hover:bg-indigo-200 text-indigo-700'
                  ]"
                >
                  → {{ ORDER_STATUS_LABELS[nextStatus] }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Pedidos del Marketplace ─────────────────────────────────────── -->
      <div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-white/20 mb-8">
        <div class="flex items-center justify-between mb-5">
          <h2 class="text-xl font-bold text-gray-800 flex items-center gap-2">
            <span class="text-2xl">🛒</span>
            Pedidos del Marketplace
            <span v-if="mktPending > 0" class="ml-1 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full animate-pulse">{{ mktPending }} nuevos</span>
          </h2>
          <div class="flex items-center gap-2">
            <select v-model="mktStatusFilter" class="text-xs border border-gray-200 rounded-xl px-3 py-1.5 bg-white text-gray-700 outline-none" @change="loadMktOrders">
              <option value="">Todos</option>
              <option value="PENDIENTE">Pendiente</option>
              <option value="VISTO">Visto</option>
              <option value="CONTACTADO">Contactado</option>
              <option value="CERRADO">Cerrado</option>
            </select>
            <button @click="loadMktOrders" class="p-1.5 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">
              <RefreshCw class="w-4 h-4 text-gray-500" :class="{ 'animate-spin': mktLoading }" />
            </button>
          </div>
        </div>

        <!-- Skeleton -->
        <div v-if="mktLoading" class="space-y-3">
          <div v-for="i in 3" :key="i" class="h-16 bg-gray-100 rounded-xl animate-pulse" />
        </div>

        <!-- Vacío -->
        <div v-else-if="!mktOrders.length" class="text-center py-10 text-gray-400">
          <span class="text-4xl block mb-3">🛍️</span>
          <p class="text-sm">No hay pedidos del marketplace{{ mktStatusFilter ? ' con este filtro' : '' }}</p>
        </div>

        <!-- Lista -->
        <div v-else class="space-y-3">
          <div
            v-for="mo in mktOrders"
            :key="mo.id"
            class="flex flex-col sm:flex-row sm:items-center gap-3 p-4 bg-gradient-to-br from-orange-50 to-red-50 rounded-xl border border-orange-100"
          >
            <!-- Avatar + info -->
            <div class="flex items-center gap-3 flex-1 min-w-0">
              <div class="w-10 h-10 bg-gradient-to-br from-red-400 to-orange-500 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0">
                {{ mo.buyerName.charAt(0).toUpperCase() }}
              </div>
              <div class="min-w-0">
                <p class="font-semibold text-gray-800 text-sm truncate">{{ mo.buyerName }}</p>
                <p class="text-xs text-gray-500 truncate">{{ mo.productName }} × {{ mo.quantity }}</p>
                <p class="text-xs text-gray-400">{{ mo.buyerPhone }}<span v-if="mo.buyerEmail"> · {{ mo.buyerEmail }}</span></p>
              </div>
            </div>
            <!-- Meta -->
            <div class="flex items-center gap-3 shrink-0 flex-wrap">
              <div class="text-right">
                <p v-if="mo.totalEstimate" class="text-sm font-black text-red-600">${{ formatMktPrice(mo.totalEstimate) }}</p>
                <p class="text-xs text-gray-400">{{ MKT_DELIVERY_LABELS[mo.deliveryType] }}</p>
                <p class="text-[11px] text-gray-400">{{ formatMktDate(mo.createdAt) }}</p>
              </div>
              <span :class="MKT_STATUS_CLASSES[mo.status]" class="px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap">
                {{ MKT_STATUS_LABELS[mo.status] }}
              </span>
              <!-- Acciones -->
              <div class="flex gap-1">
                <button
                  v-for="ns in MKT_NEXT_STATUS[mo.status]"
                  :key="ns"
                  @click="updateMktStatus(mo.id, ns)"
                  class="text-xs px-2.5 py-1 rounded-lg font-semibold transition-colors"
                  :class="ns === 'CERRADO' ? 'bg-gray-200 hover:bg-gray-300 text-gray-700' : 'bg-red-100 hover:bg-red-200 text-red-700'"
                >
                  {{ MKT_STATUS_LABELS[ns] }}
                </button>
                <a v-if="mo.buyerPhone" :href="`https://wa.me/${mo.buyerPhone.replace(/\D/g,'')}`" target="_blank"
                  class="text-xs px-2.5 py-1 rounded-lg font-semibold bg-green-100 hover:bg-green-200 text-green-700 transition-colors">
                  WhatsApp
                </a>
              </div>
            </div>
            <!-- Dirección / notas -->
            <div v-if="mo.address || mo.notes" class="w-full text-xs text-gray-500 border-t border-orange-100 pt-2 mt-1">
              <span v-if="mo.address">📍 {{ mo.address }}{{ mo.city ? `, ${mo.city}` : '' }}</span>
              <span v-if="mo.address && mo.notes"> · </span>
              <span v-if="mo.notes">📝 {{ mo.notes }}</span>
            </div>
          </div>
        </div>

        <!-- Paginación -->
        <div v-if="mktTotalPages > 1" class="flex items-center justify-center gap-2 mt-4 text-sm text-gray-500">
          <button @click="mktChangePage(mktPage - 1)" :disabled="mktPage <= 1" class="px-2 py-1 rounded-lg bg-gray-100 disabled:opacity-40 hover:bg-gray-200">‹</button>
          <span>{{ mktPage }} / {{ mktTotalPages }}</span>
          <button @click="mktChangePage(mktPage + 1)" :disabled="mktPage >= mktTotalPages" class="px-2 py-1 rounded-lg bg-gray-100 disabled:opacity-40 hover:bg-gray-200">›</button>
        </div>
      </div>

      <!-- Recent (terminal) orders table -->
      <div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-white/20 mb-8">
        <div class="flex items-center justify-between mb-5">
          <h2 class="text-xl font-bold text-gray-800 flex items-center">
            <HistoryIcon class="w-5 h-5 mr-2 text-gray-400" />
            Historial Reciente
          </h2>
          <!-- Pagination -->
          <div class="flex items-center gap-2 text-sm text-gray-500">
            <button
              @click="goPage(currentPage - 1)"
              :disabled="currentPage <= 1"
              class="px-2 py-1 rounded-lg bg-gray-100 disabled:opacity-40 hover:bg-gray-200 transition-colors"
            >‹</button>
            <span>{{ currentPage }} / {{ totalPages }}</span>
            <button
              @click="goPage(currentPage + 1)"
              :disabled="currentPage >= totalPages"
              class="px-2 py-1 rounded-lg bg-gray-100 disabled:opacity-40 hover:bg-gray-200 transition-colors"
            >›</button>
          </div>
        </div>

        <div v-if="loading" class="space-y-2">
          <div v-for="i in 5" :key="i" class="h-10 bg-gray-100 rounded animate-pulse" />
        </div>

        <div v-else-if="!recentOrders.length" class="text-center py-10 text-gray-400">
          <p class="text-sm">Sin historial reciente</p>
        </div>

        <div v-else class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-left text-xs text-gray-500 uppercase border-b border-gray-100">
                <th class="pb-2 pr-4">Pedido</th>
                <th class="pb-2 pr-4">Cliente</th>
                <th class="pb-2 pr-4">Tipo</th>
                <th class="pb-2 pr-4">Total</th>
                <th class="pb-2 pr-4">Pago</th>
                <th class="pb-2 pr-4">Estado</th>
                <th class="pb-2">Fecha</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-50">
              <tr
                v-for="order in recentOrders"
                :key="order.id"
                @click="openDetailsModal(order)"
                class="hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <td class="py-2 pr-4 font-medium text-indigo-600">{{ order.orderNumber }}</td>
                <td class="py-2 pr-4 text-gray-700">{{ order.customerName }}</td>
                <td class="py-2 pr-4 text-gray-500">{{ ORDER_TYPE_LABELS[order.orderType] }}</td>
                <td class="py-2 pr-4 font-semibold text-gray-800">{{ formatCurrency(order.total) }}</td>
                <td class="py-2 pr-4 text-gray-500">{{ PAYMENT_METHOD_LABELS[order.paymentMethod] }}</td>
                <td class="py-2 pr-4">
                  <span :class="ORDER_STATUS_CLASSES[order.status]" class="px-2 py-0.5 rounded-full text-xs font-medium">
                    {{ ORDER_STATUS_LABELS[order.status] }}
                  </span>
                </td>
                <td class="py-2 text-gray-400 text-xs">{{ formatDate(order.createdAt) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div><!-- /p-6 -->


    <!-- ─────────────────────── NEW ORDER MODAL ─────────────────────────────── -->
    <div v-if="showNewOrderModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-2xl w-full max-w-xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div class="sticky top-0 bg-white px-6 pt-6 pb-4 border-b border-gray-100 flex items-center justify-between">
          <h3 class="text-xl font-bold text-gray-800">Nuevo Pedido</h3>
          <button @click="showNewOrderModal = false" class="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>

        <div class="p-6 space-y-4">
          <!-- Customer info -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-gray-600 mb-1">Cliente *</label>
              <input v-model="newOrder.customerName" type="text" placeholder="Nombre del cliente" class="w-full p-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-gray-600 mb-1">Teléfono</label>
              <input v-model="newOrder.customerPhone" type="tel" placeholder="Teléfono" class="w-full p-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-gray-600 mb-1">Tipo de Pedido</label>
              <select v-model="newOrder.orderType" class="w-full p-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <option v-for="(label, key) in ORDER_TYPE_LABELS" :key="key" :value="key">{{ label }}</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-gray-600 mb-1">Método de Pago</label>
              <select v-model="newOrder.paymentMethod" class="w-full p-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <option v-for="(label, key) in PAYMENT_METHOD_LABELS" :key="key" :value="key">{{ label }}</option>
              </select>
            </div>
          </div>

          <!-- Scheduled datetime (only if PROGRAMADO) -->
          <div v-if="newOrder.orderType === 'PROGRAMADO'">
            <label class="block text-xs font-semibold text-gray-600 mb-1">Fecha y hora programada</label>
            <input v-model="newOrder.scheduledAt" type="datetime-local" class="w-full p-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </div>

          <!-- Delivery address (only if EN_ENTREGA type) -->
          <div v-if="newOrder.orderType === 'PARA_LLEVAR'">
            <label class="block text-xs font-semibold text-gray-600 mb-1">Dirección de entrega</label>
            <input v-model="newOrder.deliveryAddress" type="text" placeholder="Calle, número, colonia…" class="w-full p-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </div>

          <!-- Order items -->
          <div>
            <div class="flex items-center justify-between mb-2">
              <label class="block text-xs font-semibold text-gray-600">Ítems del pedido *</label>
              <button @click="addItem" class="text-xs text-blue-600 hover:underline flex items-center gap-1">
                <Plus class="w-3 h-3" /> Agregar ítem
              </button>
            </div>
            <div class="space-y-2">
              <div v-for="(item, idx) in newOrder.items" :key="idx" class="flex gap-2 items-start">
                <input v-model="item.productName" type="text" placeholder="Nombre del producto" class="flex-1 p-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                <input v-model.number="item.quantity" type="number" min="1" placeholder="Cant." class="w-16 p-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 text-center" />
                <input v-model.number="item.unitPrice" type="number" min="0" step="0.01" placeholder="Precio" class="w-24 p-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
                <button @click="removeItem(idx)" class="p-2 text-red-400 hover:text-red-600 transition-colors">
                  <Trash2 class="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <!-- Delivery fee + discount -->
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-gray-600 mb-1">Costo de envío</label>
              <input v-model.number="newOrder.deliveryFee" type="number" min="0" step="0.01" placeholder="0.00" class="w-full p-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-gray-600 mb-1">Descuento</label>
              <input v-model.number="newOrder.discount" type="number" min="0" step="0.01" placeholder="0.00" class="w-full p-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          <!-- Order total preview -->
          <div class="bg-gray-50 rounded-xl p-3 text-sm space-y-1">
            <div class="flex justify-between text-gray-500">
              <span>Subtotal</span><span>{{ formatCurrency(newOrderSubtotal) }}</span>
            </div>
            <div v-if="newOrder.deliveryFee" class="flex justify-between text-gray-500">
              <span>Envío</span><span>{{ formatCurrency(newOrder.deliveryFee ?? 0) }}</span>
            </div>
            <div v-if="newOrder.discount" class="flex justify-between text-red-500">
              <span>Descuento</span><span>-{{ formatCurrency(newOrder.discount ?? 0) }}</span>
            </div>
            <div class="flex justify-between font-bold text-gray-800 border-t border-gray-200 pt-1 mt-1">
              <span>Total estimado</span><span>{{ formatCurrency(newOrderTotal) }}</span>
            </div>
          </div>

          <!-- Notes -->
          <div>
            <label class="block text-xs font-semibold text-gray-600 mb-1">Notas adicionales</label>
            <textarea v-model="newOrder.notes" rows="2" placeholder="Instrucciones especiales…" class="w-full p-2.5 border rounded-lg text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </div>
        </div>

        <div class="sticky bottom-0 bg-white px-6 py-4 border-t border-gray-100 flex gap-3">
          <button @click="showNewOrderModal = false" class="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors text-sm">
            Cancelar
          </button>
          <button
            @click="submitNewOrder"
            :disabled="loading || !newOrder.customerName || !newOrder.items.length"
            class="flex-1 py-2.5 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-600 transition-colors text-sm disabled:opacity-50"
          >
            <span v-if="loading" class="flex items-center justify-center gap-2"><RefreshCw class="w-4 h-4 animate-spin" /> Creando…</span>
            <span v-else>Crear Pedido</span>
          </button>
        </div>
      </div>
    </div>


    <!-- ─────────────────────── SCHEDULE MODAL ───────────────────────────────── -->
    <div v-if="showScheduleModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div class="px-6 pt-6 pb-4 border-b border-gray-100 flex items-center justify-between">
          <h3 class="text-xl font-bold text-gray-800">Programar Servicio</h3>
          <button @click="showScheduleModal = false" class="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>
        <div class="p-6 space-y-4">
          <p class="text-sm text-gray-500">Se creará un pedido de tipo <strong>Programado</strong> con la fecha indicada.</p>

          <div>
            <label class="block text-xs font-semibold text-gray-600 mb-1">Cliente *</label>
            <input v-model="scheduleForm.customerName" type="text" placeholder="Nombre" class="w-full p-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500" />
          </div>
          <div>
            <label class="block text-xs font-semibold text-gray-600 mb-1">Teléfono</label>
            <input v-model="scheduleForm.customerPhone" type="tel" placeholder="Teléfono" class="w-full p-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500" />
          </div>
          <div>
            <label class="block text-xs font-semibold text-gray-600 mb-1">Fecha y hora programada *</label>
            <input v-model="scheduleForm.scheduledAt" type="datetime-local" class="w-full p-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500" />
          </div>
          <div>
            <label class="block text-xs font-semibold text-gray-600 mb-1">Descripción del servicio *</label>
            <input v-model="scheduleForm.serviceName" type="text" placeholder="Ej: Catering para 20 personas" class="w-full p-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500" />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-gray-600 mb-1">Precio unitario</label>
              <input v-model.number="scheduleForm.unitPrice" type="number" min="0" step="0.01" placeholder="0.00" class="w-full p-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-gray-600 mb-1">Método de pago</label>
              <select v-model="scheduleForm.paymentMethod" class="w-full p-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500">
                <option v-for="(label, key) in PAYMENT_METHOD_LABELS" :key="key" :value="key">{{ label }}</option>
              </select>
            </div>
          </div>
          <div>
            <label class="block text-xs font-semibold text-gray-600 mb-1">Notas</label>
            <textarea v-model="scheduleForm.notes" rows="2" placeholder="Detalles adicionales…" class="w-full p-2.5 border rounded-lg text-sm resize-none focus:ring-2 focus:ring-purple-500" />
          </div>
        </div>
        <div class="px-6 py-4 border-t border-gray-100 flex gap-3">
          <button @click="showScheduleModal = false" class="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors text-sm">
            Cancelar
          </button>
          <button
            @click="submitSchedule"
            :disabled="loading || !scheduleForm.customerName || !scheduleForm.scheduledAt || !scheduleForm.serviceName"
            class="flex-1 py-2.5 bg-purple-500 text-white rounded-xl font-semibold hover:bg-purple-600 transition-colors text-sm disabled:opacity-50"
          >
            <span v-if="loading" class="flex items-center justify-center gap-2"><RefreshCw class="w-4 h-4 animate-spin" /> Programando…</span>
            <span v-else>Programar</span>
          </button>
        </div>
      </div>
    </div>


    <!-- ─────────────────────── ORDER DETAILS MODAL ──────────────────────────── -->
    <div v-if="showDetailsModal && selectedOrder" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-2xl w-full max-w-xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div class="sticky top-0 bg-white px-6 pt-6 pb-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 class="text-xl font-bold text-gray-800">Detalles del Pedido</h3>
            <p class="text-xs text-gray-400">{{ selectedOrder.orderNumber }}</p>
          </div>
          <button @click="showDetailsModal = false" class="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>

        <div class="p-6">
          <!-- Header info -->
          <div class="grid grid-cols-2 gap-4 mb-5">
            <div>
              <p class="text-xs text-gray-500 font-semibold uppercase mb-0.5">Cliente</p>
              <p class="font-semibold text-gray-800">{{ selectedOrder.customerName }}</p>
              <p v-if="selectedOrder.customerPhone" class="text-xs text-gray-400">{{ selectedOrder.customerPhone }}</p>
            </div>
            <div>
              <p class="text-xs text-gray-500 font-semibold uppercase mb-0.5">Estado</p>
              <span :class="ORDER_STATUS_CLASSES[selectedOrder.status]" class="px-3 py-1 rounded-full text-sm font-semibold inline-block">
                {{ ORDER_STATUS_LABELS[selectedOrder.status] }}
              </span>
            </div>
            <div>
              <p class="text-xs text-gray-500 font-semibold uppercase mb-0.5">Tipo</p>
              <p class="text-sm text-gray-700">{{ ORDER_TYPE_LABELS[selectedOrder.orderType] }}</p>
            </div>
            <div>
              <p class="text-xs text-gray-500 font-semibold uppercase mb-0.5">Pago</p>
              <p class="text-sm text-gray-700">{{ PAYMENT_METHOD_LABELS[selectedOrder.paymentMethod] }}</p>
              <span :class="selectedOrder.paymentStatus === 'PAGADO' ? 'text-green-600' : 'text-yellow-600'" class="text-xs font-medium">
                {{ selectedOrder.paymentStatus === 'PAGADO' ? '✓ Pagado' : selectedOrder.paymentStatus === 'REEMBOLSADO' ? '↩ Reembolsado' : '⏳ Pendiente' }}
              </span>
            </div>
            <div v-if="selectedOrder.scheduledAt">
              <p class="text-xs text-gray-500 font-semibold uppercase mb-0.5">Programado para</p>
              <p class="text-sm text-purple-600 font-medium">{{ formatDate(selectedOrder.scheduledAt) }}</p>
            </div>
            <div v-if="selectedOrder.deliveryAddress">
              <p class="text-xs text-gray-500 font-semibold uppercase mb-0.5">Dirección</p>
              <p class="text-sm text-gray-700">{{ selectedOrder.deliveryAddress }}</p>
            </div>
          </div>

          <!-- Items -->
          <div class="mb-5">
            <p class="text-xs text-gray-500 font-semibold uppercase mb-2">Ítems</p>
            <div class="space-y-2">
              <div
                v-for="item in selectedOrder.items"
                :key="item.id"
                class="flex justify-between items-center bg-gray-50 rounded-lg p-3 text-sm"
              >
                <div>
                  <p class="font-medium text-gray-800">{{ item.productName }}</p>
                  <p v-if="item.notes" class="text-xs text-gray-400">{{ item.notes }}</p>
                </div>
                <div class="text-right">
                  <p class="font-semibold text-gray-800">{{ formatCurrency(item.subtotal) }}</p>
                  <p class="text-xs text-gray-400">{{ item.quantity }} × {{ formatCurrency(item.unitPrice) }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Totals -->
          <div class="bg-gray-50 rounded-xl p-3 text-sm space-y-1 mb-5">
            <div class="flex justify-between text-gray-500"><span>Subtotal</span><span>{{ formatCurrency(selectedOrder.subtotal) }}</span></div>
            <div class="flex justify-between text-gray-500"><span>Impuesto</span><span>{{ formatCurrency(selectedOrder.tax) }}</span></div>
            <div v-if="selectedOrder.deliveryFee" class="flex justify-between text-gray-500"><span>Envío</span><span>{{ formatCurrency(selectedOrder.deliveryFee) }}</span></div>
            <div v-if="selectedOrder.discount" class="flex justify-between text-red-500"><span>Descuento</span><span>-{{ formatCurrency(selectedOrder.discount) }}</span></div>
            <div class="flex justify-between font-bold text-gray-800 border-t border-gray-200 pt-1 mt-1"><span>Total</span><span>{{ formatCurrency(selectedOrder.total) }}</span></div>
          </div>

          <!-- Notes -->
          <div v-if="selectedOrder.notes" class="mb-5">
            <p class="text-xs text-gray-500 font-semibold uppercase mb-1">Notas</p>
            <p class="text-sm text-gray-600 bg-yellow-50 border border-yellow-100 rounded-lg p-3">{{ selectedOrder.notes }}</p>
          </div>

          <!-- Cancel reason -->
          <div v-if="selectedOrder.cancelReason" class="mb-5">
            <p class="text-xs text-red-500 font-semibold uppercase mb-1">Motivo de cancelación</p>
            <p class="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg p-3">{{ selectedOrder.cancelReason }}</p>
          </div>

          <!-- Status progression -->
          <div v-if="NEXT_STATUS[selectedOrder.status]?.length">
            <p class="text-xs text-gray-500 font-semibold uppercase mb-2">Avanzar estado</p>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="nextStatus in NEXT_STATUS[selectedOrder.status]"
                :key="nextStatus"
                @click="doUpdateStatus(selectedOrder, nextStatus); showDetailsModal = false"
                :class="[
                  'px-4 py-2 rounded-xl text-sm font-semibold transition-colors',
                  nextStatus === 'CANCELADO'
                    ? 'bg-red-100 hover:bg-red-200 text-red-700'
                    : 'bg-indigo-100 hover:bg-indigo-200 text-indigo-700'
                ]"
              >
                → {{ ORDER_STATUS_LABELS[nextStatus] }}
              </button>
            </div>
          </div>
        </div>

        <div class="px-6 py-4 border-t border-gray-100 flex gap-3">
          <button @click="showDetailsModal = false" class="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors text-sm">
            Cerrar
          </button>
          <button
            @click="confirmDelete(selectedOrder)"
            class="px-5 py-2.5 bg-red-50 text-red-600 rounded-xl font-semibold hover:bg-red-100 transition-colors text-sm"
          >
            Eliminar
          </button>
        </div>
      </div>
    </div>


    <!-- ─────────────────────── CANCEL CONFIRM MODAL ─────────────────────────── -->
    <div v-if="showCancelConfirm && selectedOrder" class="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
      <div class="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6">
        <h3 class="text-lg font-bold text-gray-800 mb-1">¿Eliminar pedido?</h3>
        <p class="text-sm text-gray-500 mb-4">Esta acción no se puede deshacer. Se eliminará <strong>{{ selectedOrder.orderNumber }}</strong>.</p>
        <div class="flex gap-3">
          <button @click="showCancelConfirm = false" class="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 text-sm">
            Cancelar
          </button>
          <button @click="doDelete" :disabled="loading" class="flex-1 py-2.5 bg-red-500 text-white rounded-xl font-semibold hover:bg-red-600 text-sm disabled:opacity-50">
            Eliminar
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  ShoppingCart, Calendar, Clock, Plus, Users, BarChart3,
  DollarSign, RefreshCw, Search, CheckCircle, Package, Tag,
  Trash2, CalendarClock, History as HistoryIcon,
} from 'lucide-vue-next'
import {
  useClienteDashboard,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_CLASSES,
  ORDER_TYPE_LABELS,
  PAYMENT_METHOD_LABELS,
  NEXT_STATUS,
  type Order,
  type CreateOrderPayload,
  type OrderStatus,
  type OrderType,
  type PaymentMethod,
} from '~/composables/useClienteDashboard'

// ── Composable ────────────────────────────────────────────────────────────────
const {
  orders, stats, loading, loadingStats, error,
  totalCount, currentPage,
  activeOrders, recentOrders,
  loadOrders, loadStats, createOrder, updateStatus, deleteOrder,
  formatCurrency, formatDate,
} = useClienteDashboard()

// ── Computed helpers ──────────────────────────────────────────────────────────
const scheduledOrders = computed(() =>
  orders.value.filter(o => o.orderType === 'PROGRAMADO' && o.scheduledAt && !['ENTREGADO','CANCELADO'].includes(o.status))
)
const scheduledCount = computed(() =>
  stats.value ? orders.value.filter(o => o.orderType === 'PROGRAMADO' && !['ENTREGADO','CANCELADO'].includes(o.status)).length : 0
)
const totalPages = computed(() => Math.max(1, Math.ceil(totalCount.value / 20)))

// ── Status filter ─────────────────────────────────────────────────────────────
const statusChips = [
  { label: 'Todos', value: undefined },
  { label: 'Pendiente', value: 'PENDIENTE' as OrderStatus },
  { label: 'Confirmado', value: 'CONFIRMADO' as OrderStatus },
  { label: 'Preparando', value: 'PREPARANDO' as OrderStatus },
  { label: 'Listo', value: 'LISTO' as OrderStatus },
  { label: 'En Entrega', value: 'EN_ENTREGA' as OrderStatus },
  { label: 'Entregado', value: 'ENTREGADO' as OrderStatus },
  { label: 'Cancelado', value: 'CANCELADO' as OrderStatus },
]
const activeStatusFilter = ref<OrderStatus | undefined>(undefined)
const searchQuery = ref('')

function setStatusFilter(val: OrderStatus | undefined) {
  activeStatusFilter.value = val
  applyFilters()
}

function applyFilters() {
  loadOrders({ status: activeStatusFilter.value, search: searchQuery.value || undefined, page: 1 })
}

function goPage(page: number) {
  loadOrders({ status: activeStatusFilter.value, search: searchQuery.value || undefined, page })
}

// ── Modals ─────────────────────────────────────────────────────────────────────
const showNewOrderModal  = ref(false)
const showScheduleModal  = ref(false)
const showDetailsModal   = ref(false)
const showCancelConfirm  = ref(false)
const selectedOrder      = ref<Order | null>(null)

function openDetailsModal(order: Order) {
  selectedOrder.value = order
  showDetailsModal.value = true
}

function confirmDelete(order: Order) {
  selectedOrder.value = order
  showDetailsModal.value = false
  showCancelConfirm.value = true
}

async function doDelete() {
  if (!selectedOrder.value) return
  await deleteOrder(selectedOrder.value.id)
  showCancelConfirm.value = false
  selectedOrder.value = null
}

// ── Status update ─────────────────────────────────────────────────────────────
async function doUpdateStatus(order: Order, nextStatus: OrderStatus) {
  await updateStatus(order.id, nextStatus)
}

// ── New Order form ─────────────────────────────────────────────────────────────
const defaultNewOrder = (): CreateOrderPayload & { orderType: OrderType; paymentMethod: PaymentMethod } => ({
  customerName: '',
  customerPhone: '',
  orderType: 'INMEDIATO',
  paymentMethod: 'EFECTIVO',
  deliveryFee: 0,
  discount: 0,
  items: [{ productName: '', quantity: 1, unitPrice: 0 }],
})
const newOrder = ref(defaultNewOrder())

const newOrderSubtotal = computed(() =>
  newOrder.value.items.reduce((sum, i) => sum + (i.quantity || 0) * (i.unitPrice || 0), 0)
)
const newOrderTotal = computed(() =>
  Math.max(0, newOrderSubtotal.value + (newOrder.value.deliveryFee ?? 0) - (newOrder.value.discount ?? 0))
)

function openNewOrderModal() {
  newOrder.value = defaultNewOrder()
  showNewOrderModal.value = true
}

function addItem() {
  newOrder.value.items.push({ productName: '', quantity: 1, unitPrice: 0 })
}

function removeItem(idx: number) {
  if (newOrder.value.items.length > 1) newOrder.value.items.splice(idx, 1)
}

async function submitNewOrder() {
  const validItems = newOrder.value.items.filter(i => i.productName.trim() && i.unitPrice > 0)
  if (!newOrder.value.customerName.trim() || !validItems.length) return

  const payload: CreateOrderPayload = {
    ...newOrder.value,
    customerPhone: newOrder.value.customerPhone || undefined,
    items: validItems,
  }
  const created = await createOrder(payload)
  if (created) showNewOrderModal.value = false
}

// ── Schedule form ──────────────────────────────────────────────────────────────
const defaultSchedule = () => ({
  customerName: '',
  customerPhone: '',
  scheduledAt: '',
  serviceName: '',
  unitPrice: 0,
  paymentMethod: 'EFECTIVO' as PaymentMethod,
  notes: '',
})
const scheduleForm = ref(defaultSchedule())

function openScheduleModal() {
  scheduleForm.value = defaultSchedule()
  showScheduleModal.value = true
}

async function submitSchedule() {
  const f = scheduleForm.value
  if (!f.customerName.trim() || !f.scheduledAt || !f.serviceName.trim()) return

  const payload: CreateOrderPayload = {
    customerName: f.customerName,
    customerPhone: f.customerPhone || undefined,
    orderType: 'PROGRAMADO',
    paymentMethod: f.paymentMethod,
    scheduledAt: f.scheduledAt,
    notes: f.notes || undefined,
    items: [{ productName: f.serviceName, quantity: 1, unitPrice: f.unitPrice || 0 }],
  }
  const created = await createOrder(payload)
  if (created) showScheduleModal.value = false
}

// ── Marketplace orders ─────────────────────────────────────────────────────────
type MktOrderStatus = 'PENDIENTE' | 'VISTO' | 'CONTACTADO' | 'CERRADO'
type MktDeliveryType = 'DOMICILIO' | 'RECOGER' | 'DIGITAL'

interface MktOrder {
  id: string
  productId: string
  productName: string
  quantity: number
  deliveryType: MktDeliveryType
  address?: string
  city?: string
  buyerName: string
  buyerPhone: string
  buyerEmail?: string
  notes?: string
  totalEstimate?: number
  status: MktOrderStatus
  createdAt: string
}

const MKT_STATUS_LABELS: Record<MktOrderStatus, string> = {
  PENDIENTE: 'Pendiente',
  VISTO: 'Visto',
  CONTACTADO: 'Contactado',
  CERRADO: 'Cerrado',
}
const MKT_STATUS_CLASSES: Record<MktOrderStatus, string> = {
  PENDIENTE: 'bg-orange-100 text-orange-700',
  VISTO: 'bg-blue-100 text-blue-700',
  CONTACTADO: 'bg-green-100 text-green-700',
  CERRADO: 'bg-gray-100 text-gray-500',
}
const MKT_NEXT_STATUS: Record<MktOrderStatus, MktOrderStatus[]> = {
  PENDIENTE: ['VISTO', 'CONTACTADO'],
  VISTO: ['CONTACTADO'],
  CONTACTADO: ['CERRADO'],
  CERRADO: [],
}
const MKT_DELIVERY_LABELS: Record<MktDeliveryType, string> = {
  DOMICILIO: '🛵 Domicilio',
  RECOGER: '🏪 Recoger',
  DIGITAL: '💻 Digital',
}

const mktOrders = ref<MktOrder[]>([])
const mktLoading = ref(false)
const mktPage = ref(1)
const mktTotalPages = ref(1)
const mktStatusFilter = ref('')

const mktPending = computed(() => mktOrders.value.filter(o => o.status === 'PENDIENTE').length)

const config = useRuntimeConfig()
const apiUrl = config.public.apiUrl as string
const { getHeaders } = useAuth()

async function loadMktOrders() {
  mktLoading.value = true
  try {
    const params = new URLSearchParams({ page: String(mktPage.value), limit: '50' })
    if (mktStatusFilter.value) params.set('status', mktStatusFilter.value)
    const res = await $fetch<{ data: MktOrder[]; totalPages: number }>(`${apiUrl}/api/catalog/orders/mine?${params}`, {
      headers: getHeaders(),
    })
    mktOrders.value = res.data
    mktTotalPages.value = res.totalPages
  } catch {
    // non-fatal
  } finally {
    mktLoading.value = false
  }
}

async function updateMktStatus(id: string, status: MktOrderStatus) {
  try {
    await $fetch(`${apiUrl}/api/catalog/orders/${id}/status`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: { status },
    })
    const order = mktOrders.value.find(o => o.id === id)
    if (order) order.status = status
  } catch {
    // non-fatal
  }
}

function mktChangePage(page: number) {
  mktPage.value = page
  loadMktOrders()
}

function formatMktPrice(price: number) {
  return new Intl.NumberFormat('es-CO', { minimumFractionDigits: 0 }).format(price)
}

function formatMktDate(date: string) {
  return new Date(date).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

// ── Init ───────────────────────────────────────────────────────────────────────
onMounted(() => {
  loadOrders({ page: 1, limit: 20 })
  loadStats()
  loadMktOrders()
})
</script>

<style scoped>
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50%       { transform: translateY(-8px); }
}
.animate-float { animation: float 3s ease-in-out infinite; }
</style>
