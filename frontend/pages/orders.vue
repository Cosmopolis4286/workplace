<template>
  <div>
    <PageHeader
      title="Gestión de Pedidos"
      description="Sistema de pedidos y programación de servicios"
      :icon="ShoppingCartIcon"
      :breadcrumb="[{ label: 'Pedidos' }]"
      :stats="headerStats"
    >
      <template #actions>
        <HeaderActionButton :icon="ArrowPathIcon" :loading="loading" :disabled="loading" @click="applyFilters">
          Actualizar
        </HeaderActionButton>
        <HeaderActionButton
          variant="primary"
          :icon="CalendarIcon"
          :disabled="kycStatus !== undefined && kycStatus !== 'APPROVED'"
          @click="openScheduleModal"
        >
          Programar
        </HeaderActionButton>
        <HeaderActionButton
          variant="primary"
          :icon="PlusIcon"
          :disabled="kycStatus !== undefined && kycStatus !== 'APPROVED'"
          @click="openNewOrderModal"
        >
          Nuevo Pedido
        </HeaderActionButton>
      </template>
    </PageHeader>

    <!-- Error banner -->
    <div v-if="error" class="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
      <p class="text-red-700 text-sm">{{ error }}</p>
      <button class="text-red-500 hover:text-red-700" @click="error = null"><XMarkIcon class="h-4 w-4" /></button>
    </div>

    <!-- KYC banner -->
    <div v-if="kycStatus && kycStatus !== 'APPROVED'" class="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
      Debes verificar tu identidad antes de crear pedidos.
      <NuxtLink to="/verification" class="font-semibold underline">Completa la verificación</NuxtLink>.
    </div>

    <!-- Plan banner -->
    <PlanUsageBanner :usage="usage" :show="['orders']" />

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

      <!-- ── Columna principal (2/3) ──────────────────────────────────────── -->
      <div class="lg:col-span-2 space-y-4">

        <!-- Filtros de estado (chips) -->
        <div class="card p-1 flex gap-1 overflow-x-auto scrollbar-none">
          <button
            v-for="chip in statusChips"
            :key="chip.value ?? 'all'"
            class="flex-shrink-0 px-3 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap"
            :class="activeStatusFilter === chip.value
              ? 'bg-red-600 text-white shadow-sm'
              : 'text-gray-500 hover:bg-gray-50'"
            @click="setStatusFilter(chip.value)"
          >{{ chip.label }}</button>
        </div>

        <!-- Búsqueda -->
        <div class="card p-4">
          <div class="relative">
            <MagnifyingGlassIcon class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Buscar cliente o número de pedido..."
              class="input-field pl-9"
              @keydown.enter="applyFilters"
            />
          </div>
        </div>

        <!-- Pedidos Activos -->
        <div class="card overflow-hidden">
          <div class="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <ClockIcon class="h-4 w-4 text-green-500" />
              <h2 class="text-sm font-semibold text-gray-900">Pedidos Activos</h2>
            </div>
            <span class="badge bg-green-100 text-green-700">{{ activeOrders.length }}</span>
          </div>

          <div v-if="loading" class="divide-y divide-gray-100">
            <div v-for="i in 3" :key="i" class="p-4 flex items-center gap-4">
              <div class="skeleton h-9 w-9 rounded-full flex-shrink-0" />
              <div class="flex-1 space-y-2"><div class="skeleton h-4 w-40 rounded" /><div class="skeleton h-3 w-56 rounded" /></div>
              <div class="skeleton h-6 w-20 rounded-full" />
            </div>
          </div>

          <div v-else-if="!activeOrders.length" class="p-10 text-center">
            <ShoppingCartIcon class="h-10 w-10 text-gray-200 mx-auto mb-2" />
            <p class="text-sm text-gray-400">No hay pedidos activos</p>
          </div>

          <div v-else class="divide-y divide-gray-100">
            <div
              v-for="order in activeOrders"
              :key="order.id"
              class="p-4 flex items-start gap-3 hover:bg-gray-50 transition-colors group"
            >
              <div class="h-9 w-9 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 font-bold text-sm text-red-700">
                {{ order.customerName.charAt(0).toUpperCase() }}
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <p class="text-sm font-semibold text-gray-900">{{ order.customerName }}</p>
                  <span class="text-xs text-gray-400">{{ order.orderNumber }}</span>
                  <span class="badge" :class="ORDER_STATUS_CLASSES[order.status]">{{ ORDER_STATUS_LABELS[order.status] }}</span>
                </div>
                <p class="text-xs text-gray-400 mt-0.5 flex flex-wrap gap-x-3">
                  <span class="flex items-center gap-1"><ClockIcon class="h-3 w-3" />{{ formatDate(order.createdAt) }}</span>
                  <span>{{ formatCurrency(order.total) }}</span>
                  <span>{{ ORDER_TYPE_LABELS[order.orderType] }}</span>
                  <span>{{ order.itemCount ?? order.items?.length ?? 0 }} ítems</span>
                </p>
              </div>
              <div class="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button class="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg font-medium" @click="openDetailsModal(order)">
                  Detalles
                </button>
                <button
                  v-for="ns in (NEXT_STATUS[order.status] ?? [])"
                  :key="ns"
                  class="text-xs px-2 py-1 rounded-lg font-medium transition-colors"
                  :class="ns === 'CANCELLED' ? 'bg-red-100 hover:bg-red-200 text-red-700' : 'bg-indigo-100 hover:bg-indigo-200 text-indigo-700'"
                  @click="doUpdateStatus(order, ns)"
                >→ {{ ORDER_STATUS_LABELS[ns] }}</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Servicios Programados -->
        <div class="card overflow-hidden">
          <div class="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <CalendarIcon class="h-4 w-4 text-purple-500" />
              <h2 class="text-sm font-semibold text-gray-900">Servicios Programados</h2>
            </div>
            <span class="badge bg-purple-100 text-purple-700">{{ scheduledOrders.length }}</span>
          </div>

          <div v-if="loading" class="divide-y divide-gray-100">
            <div v-for="i in 2" :key="i" class="p-4 flex items-center gap-4">
              <div class="skeleton h-9 w-9 rounded-full flex-shrink-0" />
              <div class="flex-1 space-y-2"><div class="skeleton h-4 w-40 rounded" /><div class="skeleton h-3 w-32 rounded" /></div>
            </div>
          </div>

          <div v-else-if="!scheduledOrders.length" class="p-10 text-center">
            <CalendarIcon class="h-10 w-10 text-gray-200 mx-auto mb-2" />
            <p class="text-sm text-gray-400">No hay servicios programados</p>
          </div>

          <div v-else class="divide-y divide-gray-100">
            <div
              v-for="order in scheduledOrders"
              :key="order.id"
              class="p-4 flex items-start gap-3 hover:bg-gray-50 transition-colors group"
            >
              <div class="h-9 w-9 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0 font-bold text-sm text-purple-700">
                {{ order.customerName.charAt(0).toUpperCase() }}
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <p class="text-sm font-semibold text-gray-900">{{ order.customerName }}</p>
                  <span class="badge" :class="ORDER_STATUS_CLASSES[order.status]">{{ ORDER_STATUS_LABELS[order.status] }}</span>
                </div>
                <p class="text-xs text-purple-600 font-medium mt-0.5 flex items-center gap-1">
                  <CalendarIcon class="h-3 w-3" />{{ formatDate(order.scheduledAt) }} · {{ formatCurrency(order.total) }}
                </p>
              </div>
              <div class="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button class="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg font-medium" @click="openDetailsModal(order)">Detalles</button>
                <button
                  v-for="ns in (NEXT_STATUS[order.status] ?? [])"
                  :key="ns"
                  class="text-xs px-2 py-1 rounded-lg font-medium transition-colors"
                  :class="ns === 'CANCELLED' ? 'bg-red-100 hover:bg-red-200 text-red-700' : 'bg-indigo-100 hover:bg-indigo-200 text-indigo-700'"
                  @click="doUpdateStatus(order, ns)"
                >→ {{ ORDER_STATUS_LABELS[ns] }}</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Pedidos Marketplace (solo si el comercio tiene productos en catálogo) -->
        <div v-if="hasCatalogProducts" class="card overflow-hidden">
          <div class="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="text-base">🛒</span>
              <h2 class="text-sm font-semibold text-gray-900">Pedidos del Marketplace</h2>
              <span v-if="mktPending > 0" class="badge bg-red-100 text-red-700 animate-pulse">{{ mktPending }} nuevos</span>
            </div>
            <div class="flex items-center gap-2">
              <select v-model="mktStatusFilter" class="input-field text-xs py-1 w-auto" @change="loadMktOrders">
                <option value="">Todos</option>
                <option value="PENDING">Pendiente</option>
                <option value="SEEN">Visto</option>
                <option value="CONTACTED">Contactado</option>
                <option value="CLOSED">Cerrado</option>
              </select>
              <button class="p-1.5 hover:bg-gray-100 rounded-lg transition-colors" @click="loadMktOrders">
                <ArrowPathIcon class="h-4 w-4 text-gray-400" :class="{ 'animate-spin': mktLoading }" />
              </button>
            </div>
          </div>

          <div v-if="mktLoading" class="divide-y divide-gray-100">
            <div v-for="i in 3" :key="i" class="p-4 flex items-center gap-4">
              <div class="skeleton h-9 w-9 rounded-full flex-shrink-0" />
              <div class="flex-1 space-y-2"><div class="skeleton h-4 w-40 rounded" /><div class="skeleton h-3 w-56 rounded" /></div>
            </div>
          </div>

          <div v-else-if="!mktOrders.length" class="p-10 text-center">
            <span class="text-3xl block mb-2">🛍️</span>
            <p class="text-sm text-gray-400">No hay pedidos del marketplace{{ mktStatusFilter ? ' con este filtro' : '' }}</p>
          </div>

          <div v-else class="divide-y divide-gray-100">
            <div v-for="mo in mktOrders" :key="mo.id" class="p-4 flex items-start gap-3 hover:bg-gray-50 transition-colors group">
              <div class="h-9 w-9 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0 font-bold text-sm text-orange-700">
                {{ mo.buyerName.charAt(0).toUpperCase() }}
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <p class="text-sm font-semibold text-gray-900 truncate">{{ mo.buyerName }}</p>
                  <span class="badge" :class="MKT_STATUS_CLASSES[mo.status]">{{ MKT_STATUS_LABELS[mo.status] }}</span>
                </div>
                <p class="text-xs text-gray-500 truncate">{{ mo.productName }} × {{ mo.quantity }}</p>
                <p class="text-xs text-gray-400">{{ mo.buyerPhone }}<span v-if="mo.buyerEmail"> · {{ mo.buyerEmail }}</span></p>
                <p v-if="mo.address" class="text-xs text-gray-400 mt-0.5">📍 {{ mo.address }}{{ mo.city ? `, ${mo.city}` : '' }}</p>
              </div>
              <div class="flex-shrink-0 text-right space-y-1">
                <p v-if="mo.totalEstimate" class="text-sm font-bold text-gray-900">${{ formatMktPrice(mo.totalEstimate) }}</p>
                <p class="text-xs text-gray-400">{{ MKT_DELIVERY_LABELS[mo.deliveryType] }}</p>
                <p class="text-[10px] text-gray-400">{{ formatMktDate(mo.createdAt) }}</p>
              </div>
              <div class="flex-shrink-0 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  v-for="ns in MKT_NEXT_STATUS[mo.status]"
                  :key="ns"
                  class="text-xs px-2 py-1 rounded-lg font-medium transition-colors"
                  :class="ns === 'CLOSED' ? 'bg-gray-100 hover:bg-gray-200 text-gray-700' : 'bg-red-100 hover:bg-red-200 text-red-700'"
                  @click="updateMktStatus(mo.id, ns)"
                >{{ MKT_STATUS_LABELS[ns] }}</button>
                <a v-if="mo.buyerPhone" :href="`https://wa.me/${mo.buyerPhone.replace(/\D/g,'')}`" target="_blank"
                  class="text-xs px-2 py-1 rounded-lg font-medium bg-green-100 hover:bg-green-200 text-green-700 transition-colors text-center">
                  WhatsApp
                </a>
              </div>
            </div>
          </div>

          <div v-if="mktTotalPages > 1" class="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
            <span class="text-xs text-gray-400">Página {{ mktPage }} de {{ mktTotalPages }}</span>
            <div class="flex gap-2">
              <button class="btn-secondary text-xs px-2 py-1" :disabled="mktPage <= 1" @click="mktChangePage(mktPage - 1)">‹</button>
              <button class="btn-secondary text-xs px-2 py-1" :disabled="mktPage >= mktTotalPages" @click="mktChangePage(mktPage + 1)">›</button>
            </div>
          </div>
        </div>

        <!-- Historial reciente -->
        <div class="card overflow-hidden">
          <div class="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <ClockIcon class="h-4 w-4 text-gray-400" />
              <h2 class="text-sm font-semibold text-gray-900">Historial Reciente</h2>
            </div>
            <div class="flex gap-2">
              <button class="btn-secondary text-xs px-2 py-1" :disabled="currentPage <= 1" @click="goPage(currentPage - 1)">‹</button>
              <span class="text-xs text-gray-500 px-1 py-1">{{ currentPage }} / {{ totalPages }}</span>
              <button class="btn-secondary text-xs px-2 py-1" :disabled="currentPage >= totalPages" @click="goPage(currentPage + 1)">›</button>
            </div>
          </div>

          <div v-if="loading" class="divide-y divide-gray-100">
            <div v-for="i in 5" :key="i" class="p-4 flex items-center gap-4">
              <div class="skeleton h-4 w-24 rounded" />
              <div class="skeleton h-4 w-32 rounded" />
              <div class="flex-1" />
              <div class="skeleton h-6 w-16 rounded-full" />
            </div>
          </div>

          <div v-else-if="!recentOrders.length" class="p-10 text-center text-sm text-gray-400">Sin historial reciente</div>

          <div v-else class="divide-y divide-gray-100">
            <div
              v-for="order in recentOrders"
              :key="order.id"
              class="p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors cursor-pointer"
              @click="openDetailsModal(order)"
            >
              <span class="text-xs font-bold text-red-600 flex-shrink-0">{{ order.orderNumber }}</span>
              <span class="text-sm text-gray-700 truncate flex-1">{{ order.customerName }}</span>
              <span class="text-xs text-gray-400 hidden sm:block">{{ ORDER_TYPE_LABELS[order.orderType] }}</span>
              <span class="text-sm font-semibold text-gray-900 flex-shrink-0">{{ formatCurrency(order.total) }}</span>
              <span class="badge flex-shrink-0" :class="ORDER_STATUS_CLASSES[order.status]">{{ ORDER_STATUS_LABELS[order.status] }}</span>
              <span class="text-xs text-gray-400 hidden sm:block flex-shrink-0">{{ formatDate(order.createdAt) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Sidebar (1/3) ───────────────────────────────────────────────── -->
      <div class="space-y-4">

        <!-- Acciones rápidas -->
        <div class="card p-5">
          <h3 class="text-sm font-semibold text-gray-700 mb-3">Acciones rápidas</h3>
          <div class="space-y-2">
            <button class="w-full btn-primary text-sm flex items-center gap-2" @click="openNewOrderModal">
              <ShoppingCartIcon class="h-4 w-4" />Nuevo Pedido
            </button>
            <button class="w-full btn-secondary text-sm flex items-center gap-2" @click="openScheduleModal">
              <CalendarIcon class="h-4 w-4" />Programar Servicio
            </button>
            <NuxtLink to="/customers" class="w-full btn-secondary text-sm flex items-center gap-2">
              <UsersIcon class="h-4 w-4" />Gestionar Clientes
            </NuxtLink>
            <NuxtLink to="/analytics" class="w-full btn-secondary text-sm flex items-center gap-2">
              <ChartBarIcon class="h-4 w-4" />Ver Reportes
            </NuxtLink>
          </div>
        </div>

        <!-- Resumen de estados -->
        <div class="card p-5">
          <h3 class="text-sm font-semibold text-gray-700 mb-4">Resumen</h3>
          <div class="space-y-2.5">
            <div v-for="s in orderSummary" :key="s.label" class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="w-2 h-2 rounded-full flex-shrink-0" :class="s.dot" />
                <span class="text-sm text-gray-600">{{ s.label }}</span>
              </div>
              <span class="text-sm font-bold text-gray-900">{{ s.value }}</span>
            </div>
          </div>
        </div>

        <!-- Ingresos -->
        <div v-if="!loadingStats && stats" class="card p-5 border-l-4 border-l-red-400">
          <p class="text-xs text-gray-500 mb-1">Ingresos del mes</p>
          <p class="text-2xl font-black text-red-600">{{ formatCurrency(stats.monthlyRevenue) }}</p>
          <p class="text-xs text-gray-400 mt-1">Ticket prom: {{ formatCurrency(stats.avgTicket) }}</p>
        </div>
      </div>
    </div>

    <!-- ── Modal Nuevo Pedido ──────────────────────────────────────────────── -->
    <Teleport to="body">
      <Transition enter-active-class="ease-out duration-200" enter-from-class="opacity-0" enter-to-class="opacity-100"
        leave-active-class="ease-in duration-150" leave-from-class="opacity-100" leave-to-class="opacity-0">
        <div v-if="showNewOrderModal" class="fixed inset-0 z-50 flex items-center justify-center p-4" @click.self="showNewOrderModal = false">
          <div class="absolute inset-0 bg-black/40" @click="showNewOrderModal = false" />
          <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div class="sticky top-0 bg-white px-6 pt-5 pb-4 border-b border-gray-100 flex items-center justify-between">
              <h3 class="text-base font-semibold text-gray-900">Nuevo Pedido</h3>
              <button class="p-1 text-gray-400 hover:text-gray-600 rounded-lg" @click="showNewOrderModal = false"><XMarkIcon class="h-5 w-5" /></button>
            </div>
            <div class="p-6 space-y-4">
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Cliente <span class="text-red-500">*</span></label>
                  <input v-model="newOrder.customerName" type="text" placeholder="Nombre del cliente" class="input-field" />
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Teléfono</label>
                  <input v-model="newOrder.customerPhone" type="tel" placeholder="Teléfono" class="input-field" />
                </div>
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Tipo de Pedido</label>
                  <select v-model="newOrder.orderType" class="input-field">
                    <option v-for="(label, key) in ORDER_TYPE_LABELS" :key="key" :value="key">{{ label }}</option>
                  </select>
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Método de Pago</label>
                  <select v-model="newOrder.paymentMethod" class="input-field">
                    <option v-for="(label, key) in PAYMENT_METHOD_LABELS" :key="key" :value="key">{{ label }}</option>
                  </select>
                </div>
              </div>
              <div v-if="newOrder.orderType === 'SCHEDULED'">
                <label class="block text-xs font-medium text-gray-700 mb-1">Fecha y hora programada</label>
                <input v-model="newOrder.scheduledAt" type="datetime-local" class="input-field" />
              </div>
              <div v-if="newOrder.orderType === 'TAKEAWAY'">
                <label class="block text-xs font-medium text-gray-700 mb-1">Dirección de entrega</label>
                <input v-model="newOrder.deliveryAddress" type="text" placeholder="Calle, número..." class="input-field" />
              </div>
              <div>
                <div class="flex items-center justify-between mb-2">
                  <label class="text-xs font-medium text-gray-700">Ítems del pedido <span class="text-red-500">*</span></label>
                  <button class="text-xs text-red-600 hover:underline flex items-center gap-1" @click="addItem">
                    <PlusIcon class="h-3 w-3" />Agregar ítem
                  </button>
                </div>
                <div class="space-y-2">
                  <div v-for="(item, idx) in newOrder.items" :key="idx" class="flex gap-2">
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
                  <input v-model.number="newOrder.deliveryFee" type="number" min="0" step="0.01" placeholder="0.00" class="input-field" />
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Descuento</label>
                  <input v-model.number="newOrder.discount" type="number" min="0" step="0.01" placeholder="0.00" class="input-field" />
                </div>
              </div>
              <div class="bg-gray-50 rounded-xl p-3 text-sm space-y-1">
                <div class="flex justify-between text-gray-500"><span>Subtotal</span><span>{{ formatCurrency(newOrderSubtotal) }}</span></div>
                <div v-if="newOrder.deliveryFee" class="flex justify-between text-gray-500"><span>Envío</span><span>{{ formatCurrency(newOrder.deliveryFee ?? 0) }}</span></div>
                <div v-if="newOrder.discount" class="flex justify-between text-red-500"><span>Descuento</span><span>-{{ formatCurrency(newOrder.discount ?? 0) }}</span></div>
                <div class="flex justify-between font-bold text-gray-900 border-t border-gray-200 pt-1 mt-1"><span>Total estimado</span><span>{{ formatCurrency(newOrderTotal) }}</span></div>
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Notas</label>
                <textarea v-model="newOrder.notes" rows="2" placeholder="Instrucciones especiales..." class="input-field resize-none" />
              </div>
            </div>
            <div class="sticky bottom-0 bg-white px-6 py-4 border-t border-gray-100 flex gap-3">
              <button class="btn-secondary flex-1" @click="showNewOrderModal = false">Cancelar</button>
              <button class="btn-primary flex-1" :disabled="loading || !newOrder.customerName || !newOrder.items.length" @click="submitNewOrder">
                {{ loading ? 'Creando...' : 'Crear Pedido' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ── Modal Programar Servicio ───────────────────────────────────────── -->
    <Teleport to="body">
      <Transition enter-active-class="ease-out duration-200" enter-from-class="opacity-0" enter-to-class="opacity-100"
        leave-active-class="ease-in duration-150" leave-from-class="opacity-100" leave-to-class="opacity-0">
        <div v-if="showScheduleModal" class="fixed inset-0 z-50 flex items-center justify-center p-4" @click.self="showScheduleModal = false">
          <div class="absolute inset-0 bg-black/40" @click="showScheduleModal = false" />
          <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div class="flex items-center justify-between mb-5">
              <h3 class="text-base font-semibold text-gray-900">Programar Servicio</h3>
              <button class="p-1 text-gray-400 hover:text-gray-600 rounded-lg" @click="showScheduleModal = false"><XMarkIcon class="h-5 w-5" /></button>
            </div>
            <p class="text-xs text-gray-500 mb-4">Se creará un pedido de tipo <strong>Programado</strong> con la fecha indicada.</p>
            <div class="space-y-4">
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Cliente <span class="text-red-500">*</span></label>
                <input v-model="scheduleForm.customerName" type="text" placeholder="Nombre" class="input-field" />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Teléfono</label>
                <input v-model="scheduleForm.customerPhone" type="tel" placeholder="Teléfono" class="input-field" />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Fecha y hora <span class="text-red-500">*</span></label>
                <input v-model="scheduleForm.scheduledAt" type="datetime-local" class="input-field" />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Descripción del servicio <span class="text-red-500">*</span></label>
                <input v-model="scheduleForm.serviceName" type="text" placeholder="Ej: Catering para 20 personas" class="input-field" />
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Precio unitario</label>
                  <input v-model.number="scheduleForm.unitPrice" type="number" min="0" step="0.01" placeholder="0.00" class="input-field" />
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Método de pago</label>
                  <select v-model="scheduleForm.paymentMethod" class="input-field">
                    <option v-for="(label, key) in PAYMENT_METHOD_LABELS" :key="key" :value="key">{{ label }}</option>
                  </select>
                </div>
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Notas</label>
                <textarea v-model="scheduleForm.notes" rows="2" placeholder="Detalles adicionales..." class="input-field resize-none" />
              </div>
              <div class="flex gap-3 pt-2">
                <button class="btn-secondary flex-1" @click="showScheduleModal = false">Cancelar</button>
                <button class="btn-primary flex-1" :disabled="loading || !scheduleForm.customerName || !scheduleForm.scheduledAt || !scheduleForm.serviceName" @click="submitSchedule">
                  {{ loading ? 'Programando...' : 'Programar' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ── Modal Detalles ─────────────────────────────────────────────────── -->
    <Teleport to="body">
      <Transition enter-active-class="ease-out duration-200" enter-from-class="opacity-0" enter-to-class="opacity-100"
        leave-active-class="ease-in duration-150" leave-from-class="opacity-100" leave-to-class="opacity-0">
        <div v-if="showDetailsModal && selectedOrder" class="fixed inset-0 z-50 flex items-center justify-center p-4" @click.self="showDetailsModal = false">
          <div class="absolute inset-0 bg-black/40" @click="showDetailsModal = false" />
          <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div class="sticky top-0 bg-white px-6 pt-5 pb-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 class="text-base font-semibold text-gray-900">Detalles del Pedido</h3>
                <p class="text-xs text-gray-400">{{ selectedOrder.orderNumber }}</p>
              </div>
              <button class="p-1 text-gray-400 hover:text-gray-600 rounded-lg" @click="showDetailsModal = false"><XMarkIcon class="h-5 w-5" /></button>
            </div>
            <div class="p-6 space-y-5">
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <p class="text-xs text-gray-400 font-medium uppercase mb-0.5">Cliente</p>
                  <p class="font-semibold text-gray-900">{{ selectedOrder.customerName }}</p>
                  <p v-if="selectedOrder.customerPhone" class="text-xs text-gray-400">{{ selectedOrder.customerPhone }}</p>
                </div>
                <div>
                  <p class="text-xs text-gray-400 font-medium uppercase mb-0.5">Estado</p>
                  <span class="badge" :class="ORDER_STATUS_CLASSES[selectedOrder.status]">{{ ORDER_STATUS_LABELS[selectedOrder.status] }}</span>
                </div>
                <div>
                  <p class="text-xs text-gray-400 font-medium uppercase mb-0.5">Tipo</p>
                  <p class="text-sm text-gray-700">{{ ORDER_TYPE_LABELS[selectedOrder.orderType] }}</p>
                </div>
                <div>
                  <p class="text-xs text-gray-400 font-medium uppercase mb-0.5">Pago</p>
                  <p class="text-sm text-gray-700">{{ PAYMENT_METHOD_LABELS[selectedOrder.paymentMethod] }}</p>
                  <span class="text-xs font-medium" :class="selectedOrder.paymentStatus === 'PAID' ? 'text-green-600' : 'text-yellow-600'">
                    {{ selectedOrder.paymentStatus === 'PAID' ? '✓ Pagado' : '⏳ Pendiente' }}
                  </span>
                </div>
                <div v-if="selectedOrder.scheduledAt">
                  <p class="text-xs text-gray-400 font-medium uppercase mb-0.5">Programado para</p>
                  <p class="text-sm text-purple-600 font-medium">{{ formatDate(selectedOrder.scheduledAt) }}</p>
                </div>
                <div v-if="selectedOrder.deliveryAddress">
                  <p class="text-xs text-gray-400 font-medium uppercase mb-0.5">Dirección</p>
                  <p class="text-sm text-gray-700">{{ selectedOrder.deliveryAddress }}</p>
                </div>
              </div>
              <div>
                <p class="text-xs text-gray-400 font-medium uppercase mb-2">Ítems</p>
                <div class="space-y-2">
                  <div v-for="item in selectedOrder.items" :key="item.id" class="flex justify-between items-center bg-gray-50 rounded-lg p-3 text-sm">
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
                <div class="flex justify-between text-gray-500"><span>Subtotal</span><span>{{ formatCurrency(selectedOrder.subtotal) }}</span></div>
                <div class="flex justify-between text-gray-500"><span>Impuesto</span><span>{{ formatCurrency(selectedOrder.tax) }}</span></div>
                <div v-if="selectedOrder.deliveryFee" class="flex justify-between text-gray-500"><span>Envío</span><span>{{ formatCurrency(selectedOrder.deliveryFee) }}</span></div>
                <div v-if="selectedOrder.discount" class="flex justify-between text-red-500"><span>Descuento</span><span>-{{ formatCurrency(selectedOrder.discount) }}</span></div>
                <div class="flex justify-between font-bold text-gray-900 border-t border-gray-200 pt-1 mt-1"><span>Total</span><span>{{ formatCurrency(selectedOrder.total) }}</span></div>
              </div>
              <div v-if="selectedOrder.notes" class="bg-yellow-50 border border-yellow-100 rounded-lg p-3 text-sm text-gray-600">
                <p class="text-xs font-medium text-yellow-700 mb-1">Notas</p>{{ selectedOrder.notes }}
              </div>
              <div v-if="NEXT_STATUS[selectedOrder.status]?.length">
                <p class="text-xs text-gray-400 font-medium uppercase mb-2">Avanzar estado</p>
                <div class="flex flex-wrap gap-2">
                  <button
                    v-for="ns in NEXT_STATUS[selectedOrder.status]"
                    :key="ns"
                    class="px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
                    :class="ns === 'CANCELLED' ? 'bg-red-100 hover:bg-red-200 text-red-700' : 'bg-indigo-100 hover:bg-indigo-200 text-indigo-700'"
                    @click="doUpdateStatus(selectedOrder, ns); showDetailsModal = false"
                  >→ {{ ORDER_STATUS_LABELS[ns] }}</button>
                </div>
              </div>
            </div>
            <div class="sticky bottom-0 bg-white px-6 py-4 border-t border-gray-100 flex gap-3">
              <button class="btn-secondary flex-1" @click="showDetailsModal = false">Cerrar</button>
              <button
                v-if="selectedOrder.status !== 'CANCELLED'"
                class="px-5 py-2.5 bg-indigo-50 text-indigo-600 rounded-xl text-sm font-medium hover:bg-indigo-100 transition-colors flex items-center gap-1.5"
                :disabled="downloadingReceipt"
                @click="handleDownloadReceipt(selectedOrder)"
              >
                <DocumentArrowDownIcon class="h-4 w-4" />
                {{ downloadingReceipt ? 'Generando...' : 'Comprobante' }}
              </button>
              <button class="px-5 py-2.5 bg-red-50 text-red-600 rounded-xl text-sm font-medium hover:bg-red-100 transition-colors" @click="confirmDelete(selectedOrder)">
                Eliminar
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ── Modal Confirmar Eliminar ────────────────────────────────────────── -->
    <Teleport to="body">
      <Transition enter-active-class="ease-out duration-200" enter-from-class="opacity-0" enter-to-class="opacity-100"
        leave-active-class="ease-in duration-150" leave-from-class="opacity-100" leave-to-class="opacity-0">
        <div v-if="showCancelConfirm && selectedOrder" class="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div class="absolute inset-0 bg-black/50" @click="showCancelConfirm = false" />
          <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 class="text-base font-semibold text-gray-900 mb-2">¿Eliminar pedido?</h3>
            <p class="text-sm text-gray-500 mb-5">Esta acción no se puede deshacer. Se eliminará <strong>{{ selectedOrder.orderNumber }}</strong>.</p>
            <div class="flex gap-3">
              <button class="btn-secondary flex-1" @click="showCancelConfirm = false">Cancelar</button>
              <button class="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-medium disabled:opacity-60 transition-colors" :disabled="loading" @click="doDelete">
                Eliminar
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  ShoppingCartIcon, CalendarIcon, ClockIcon, PlusIcon,
  XMarkIcon, ArrowPathIcon, MagnifyingGlassIcon, TrashIcon,
  UsersIcon, ChartBarIcon, DocumentArrowDownIcon,
} from '@heroicons/vue/24/outline'
import PageHeader from '~/components/ui/PageHeader.vue'
import HeaderActionButton from '~/components/ui/HeaderActionButton.vue'
import { useApi } from '~/composables/core/useApi'
import {
  useMerchantOrders,
  ORDER_STATUS_LABELS, ORDER_STATUS_CLASSES,
  ORDER_TYPE_LABELS, PAYMENT_METHOD_LABELS, NEXT_STATUS,
  type Order, type CreateOrderPayload, type OrderStatus, type OrderType, type PaymentMethod,
} from '~/composables/catalog/useMerchantOrders'
import { usePlans } from '~/composables/commerce/usePlans'
import PlanUsageBanner from '~/components/plans/PlanUsageBanner.vue'
import { useReceipts } from '~/composables/receipts/useReceipts'
import { useKyc } from '~/composables/kyc/useKyc'

definePageMeta({ middleware: 'auth' })

const {
  orders, stats, loading, loadingStats, error, totalCount, currentPage,
  activeOrders, recentOrders,
  loadOrders, loadStats, createOrder, updateStatus, deleteOrder,
  formatCurrency, formatDate,
} = useMerchantOrders()

const { myStatus: myKycStatus, fetchMyStatus: fetchMyKycStatus } = useKyc()
const kycStatus = computed(() => myKycStatus.value?.kycStatus)

const scheduledOrders = computed(() =>
  orders.value.filter(o => o.orderType === 'SCHEDULED' && o.scheduledAt && !['DELIVERED','CANCELLED'].includes(o.status))
)
const scheduledCount = computed(() =>
  orders.value.filter(o => o.orderType === 'SCHEDULED' && !['DELIVERED','CANCELLED'].includes(o.status)).length
)
const totalPages = computed(() => Math.max(1, Math.ceil(totalCount.value / 20)))

const headerStats = computed(() => [
  { label: 'Activos',      value: String(stats.value?.activeOrders ?? 0) },
  { label: 'Programados',  value: String(scheduledCount.value) },
  { label: 'Completados',  value: String(stats.value?.completedOrders ?? 0) },
  { label: 'Ingresos mes', value: stats.value ? formatCurrency(stats.value.monthlyRevenue) : '—' },
])

const orderSummary = computed(() => [
  { label: 'Activos',     value: stats.value?.activeOrders  ?? 0, dot: 'bg-blue-400'  },
  { label: 'Pendientes',  value: stats.value?.pendingOrders ?? 0, dot: 'bg-yellow-400' },
  { label: 'Completados', value: stats.value?.completedOrders ?? 0, dot: 'bg-green-400' },
  { label: 'Cancelados',  value: stats.value?.cancelledOrders ?? 0, dot: 'bg-red-400'   },
])

// Status chips
const statusChips = [
  { label: 'Todos', value: undefined },
  { label: 'Pendiente',   value: 'PENDING'   as OrderStatus },
  { label: 'Confirmado',  value: 'CONFIRMED'  as OrderStatus },
  { label: 'Preparando',  value: 'PREPARING'  as OrderStatus },
  { label: 'Listo',       value: 'READY'       as OrderStatus },
  { label: 'En Entrega',  value: 'OUT_FOR_DELIVERY'  as OrderStatus },
  { label: 'Entregado',   value: 'DELIVERED'   as OrderStatus },
  { label: 'Cancelado',   value: 'CANCELLED'   as OrderStatus },
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

// Modals
const showNewOrderModal = ref(false)
const showScheduleModal = ref(false)
const showDetailsModal  = ref(false)
const showCancelConfirm = ref(false)
const selectedOrder     = ref<Order | null>(null)

function openDetailsModal(order: Order) { selectedOrder.value = order; showDetailsModal.value = true }
function confirmDelete(order: Order) { selectedOrder.value = order; showDetailsModal.value = false; showCancelConfirm.value = true }

const { loading: downloadingReceipt, getOrCreateAndDownload } = useReceipts()
async function handleDownloadReceipt(order: Order) { await getOrCreateAndDownload(order.id) }
async function doDelete() {
  if (!selectedOrder.value) return
  await deleteOrder(selectedOrder.value.id)
  showCancelConfirm.value = false; selectedOrder.value = null
}
async function doUpdateStatus(order: Order, nextStatus: OrderStatus) { await updateStatus(order.id, nextStatus) }

// New order form
const defaultNewOrder = (): CreateOrderPayload & { orderType: OrderType; paymentMethod: PaymentMethod } => ({
  customerName: '', customerPhone: '', orderType: 'IMMEDIATE', paymentMethod: 'CASH',
  deliveryFee: 0, discount: 0, items: [{ productName: '', quantity: 1, unitPrice: 0 }],
})
const newOrder = ref(defaultNewOrder())
const newOrderSubtotal = computed(() => newOrder.value.items.reduce((s, i) => s + (i.quantity || 0) * (i.unitPrice || 0), 0))
const newOrderTotal = computed(() => Math.max(0, newOrderSubtotal.value + (newOrder.value.deliveryFee ?? 0) - (newOrder.value.discount ?? 0)))

function openNewOrderModal() { newOrder.value = defaultNewOrder(); showNewOrderModal.value = true }
function addItem() { newOrder.value.items.push({ productName: '', quantity: 1, unitPrice: 0 }) }
function removeItem(idx: number) { if (newOrder.value.items.length > 1) newOrder.value.items.splice(idx, 1) }
async function submitNewOrder() {
  const validItems = newOrder.value.items.filter(i => i.productName.trim() && i.unitPrice > 0)
  if (!newOrder.value.customerName.trim() || !validItems.length) return
  const created = await createOrder({ ...newOrder.value, customerPhone: newOrder.value.customerPhone || undefined, items: validItems })
  if (created) showNewOrderModal.value = false
}

// Schedule form
const defaultSchedule = () => ({ customerName: '', customerPhone: '', scheduledAt: '', serviceName: '', unitPrice: 0, paymentMethod: 'CASH' as PaymentMethod, notes: '' })
const scheduleForm = ref(defaultSchedule())
function openScheduleModal() { scheduleForm.value = defaultSchedule(); showScheduleModal.value = true }
async function submitSchedule() {
  const f = scheduleForm.value
  if (!f.customerName.trim() || !f.scheduledAt || !f.serviceName.trim()) return
  const created = await createOrder({
    customerName: f.customerName, customerPhone: f.customerPhone || undefined,
    orderType: 'SCHEDULED', paymentMethod: f.paymentMethod, scheduledAt: f.scheduledAt,
    notes: f.notes || undefined, items: [{ productName: f.serviceName, quantity: 1, unitPrice: f.unitPrice || 0 }],
  })
  if (created) showScheduleModal.value = false
}

// Marketplace
type MktOrderStatus = 'PENDING' | 'SEEN' | 'CONTACTED' | 'CLOSED'
type MktDeliveryType = 'HOME_DELIVERY' | 'PICKUP' | 'DIGITAL'
interface MktOrder { id: string; productId: string; productName: string; quantity: number; deliveryType: MktDeliveryType; address?: string; city?: string; buyerName: string; buyerPhone: string; buyerEmail?: string; notes?: string; totalEstimate?: number; status: MktOrderStatus; createdAt: string }

const MKT_STATUS_LABELS: Record<MktOrderStatus, string>  = { PENDING: 'Pendiente', SEEN: 'Visto', CONTACTED: 'Contactado', CLOSED: 'Cerrado' }
const MKT_STATUS_CLASSES: Record<MktOrderStatus, string>  = { PENDING: 'bg-orange-100 text-orange-700', SEEN: 'bg-blue-100 text-blue-700', CONTACTED: 'bg-green-100 text-green-700', CLOSED: 'bg-gray-100 text-gray-500' }
const MKT_NEXT_STATUS: Record<MktOrderStatus, MktOrderStatus[]> = { PENDING: ['SEEN', 'CONTACTED'], SEEN: ['CONTACTED'], CONTACTED: ['CLOSED'], CLOSED: [] }
const MKT_DELIVERY_LABELS: Record<MktDeliveryType, string> = { HOME_DELIVERY: '🛵 Domicilio', PICKUP: '🏪 Recoger', DIGITAL: '💻 Digital' }

const mktOrders = ref<MktOrder[]>([])
const mktLoading = ref(false)
const mktPage = ref(1)
const mktTotalPages = ref(1)
const mktStatusFilter = ref('')
const mktPending = computed(() => mktOrders.value.filter(o => o.status === 'PENDING').length)

const { usage, fetchUsage } = usePlans()

async function loadMktOrders() {
  mktLoading.value = true
  try {
    const params = new URLSearchParams({ page: String(mktPage.value), limit: '50' })
    if (mktStatusFilter.value) params.set('status', mktStatusFilter.value)
    const { get } = useApi()
    const res = await get<{ data: MktOrder[]; totalPages: number }>(`/catalog/orders/mine?${params}`)
    mktOrders.value = res.data; mktTotalPages.value = res.totalPages
  } catch { } finally { mktLoading.value = false }
}

// El comercio tiene productos publicados en el marketplace
const hasCatalogProducts = computed(() => (usage.value?.usage?.products ?? 0) > 0)

async function updateMktStatus(id: string, status: MktOrderStatus) {
  try {
    const { patch } = useApi()
    await patch(`/catalog/orders/${id}/status`, { status })
    const o = mktOrders.value.find(o => o.id === id)
    if (o) o.status = status
  } catch { }
}

function mktChangePage(page: number) { mktPage.value = page; loadMktOrders() }
function formatMktPrice(p: number) { return new Intl.NumberFormat('es-CO', { minimumFractionDigits: 0 }).format(p) }
function formatMktDate(d: string) { return new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) }

onMounted(async () => {
  loadOrders({ page: 1, limit: 20 })
  loadStats()
  fetchMyKycStatus()
  await fetchUsage()
  if (hasCatalogProducts.value) loadMktOrders()
})
</script>

<style scoped>
.scrollbar-none::-webkit-scrollbar { display: none; }
.scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }
</style>
