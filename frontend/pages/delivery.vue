<template>
  <div class="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-pink-50">
    <!-- Header -->
    <div class="bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 text-white p-6 rounded-b-3xl shadow-2xl">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-4">
          <div class="p-3 bg-white/20 rounded-2xl backdrop-blur-sm animate-float">
            <Truck class="w-8 h-8" />
          </div>
          <div>
            <h1 class="text-3xl font-bold">Gestión de Delivery</h1>
            <p class="text-orange-100">Control de entregas y repartidores</p>
          </div>
        </div>
        <div class="flex items-center space-x-2">
          <button @click="refreshAll" class="p-2 bg-white/20 rounded-xl backdrop-blur-sm hover:scale-110 transition-transform duration-200" title="Actualizar">
            <RefreshCw class="w-5 h-5" :class="loading ? 'animate-spin' : ''" />
          </button>
        </div>
      </div>
    </div>

    <div class="p-6">
      <!-- Error banner -->
      <div v-if="error" class="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center justify-between">
        <span>{{ error }}</span>
        <button @click="error = null" class="text-red-400 hover:text-red-600 ml-4">✕</button>
      </div>

      <!-- Stats Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <template v-if="loading && !stats.totalDrivers">
          <div v-for="i in 4" :key="i" class="bg-white/80 p-6 rounded-2xl shadow-xl animate-pulse h-28" />
        </template>
        <template v-else>
          <div class="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 border border-white/20">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-gray-600 text-sm font-medium">Entregas Activas</p>
                <p class="text-3xl font-bold text-gray-800">{{ stats.activeDeliveries }}</p>
                <p class="text-blue-500 text-sm flex items-center mt-1">
                  <Package class="w-4 h-4 mr-1" />
                  {{ stats.pendingDeliveries }} pendientes
                </p>
              </div>
              <div class="p-3 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl shadow-lg animate-pulse">
                <Truck class="w-8 h-8 text-white" />
              </div>
            </div>
          </div>

          <div class="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 border border-white/20">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-gray-600 text-sm font-medium">Repartidores</p>
                <p class="text-3xl font-bold text-gray-800">{{ stats.onlineDrivers }}</p>
                <p class="text-green-500 text-sm flex items-center mt-1">
                  <Users class="w-4 h-4 mr-1" />
                  {{ stats.totalDrivers }} total
                </p>
              </div>
              <div class="p-3 bg-gradient-to-br from-green-400 to-green-600 rounded-xl shadow-lg animate-bounce">
                <Users class="w-8 h-8 text-white" />
              </div>
            </div>
          </div>

          <div class="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 border border-white/20">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-gray-600 text-sm font-medium">Entregados Hoy</p>
                <p class="text-3xl font-bold text-gray-800">{{ stats.deliveredToday }}</p>
                <p class="text-orange-500 text-sm flex items-center mt-1">
                  <Clock class="w-4 h-4 mr-1" />
                  Prom: {{ stats.avgDeliveryTime || '—' }}min
                </p>
              </div>
              <div class="p-3 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl shadow-lg animate-spin-slow">
                <Clock class="w-8 h-8 text-white" />
              </div>
            </div>
          </div>

          <div class="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 border border-white/20">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-gray-600 text-sm font-medium">Total Hoy</p>
                <p class="text-3xl font-bold text-gray-800">{{ stats.todayDeliveries }}</p>
                <p class="text-red-500 text-sm flex items-center mt-1">
                  <XCircle class="w-4 h-4 mr-1" />
                  {{ stats.cancelledToday }} cancelados
                </p>
              </div>
              <div class="p-3 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-xl shadow-lg animate-pulse">
                <TrendingUp class="w-8 h-8 text-white" />
              </div>
            </div>
          </div>
        </template>
      </div>

      <!-- Active Deliveries Section -->
      <div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 mb-8 border border-white/20">
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <h2 class="text-2xl font-bold text-gray-800 flex items-center">
            <MapPin class="w-6 h-6 mr-2 text-orange-500" />
            Entregas en Curso
          </h2>
          <div class="flex items-center gap-3">
            <!-- Status filter -->
            <select v-model="statusFilter" class="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-orange-300 outline-none">
              <option value="">Todos los estados</option>
              <option v-for="(label, key) in DELIVERY_STATUS_LABELS" :key="key" :value="key">{{ label }}</option>
            </select>
            <button @click="openNewDelivery" class="bg-gradient-to-r from-orange-500 to-red-500 text-white px-5 py-2 rounded-xl hover:scale-105 transition-transform duration-200 shadow-lg flex items-center gap-2">
              <Plus class="w-5 h-5" />
              Nueva Entrega
            </button>
          </div>
        </div>

        <!-- Loading skeleton -->
        <div v-if="loading" class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          <div v-for="i in 3" :key="i" class="bg-gray-100 rounded-xl h-48 animate-pulse" />
        </div>

        <!-- Empty state -->
        <div v-else-if="filteredDeliveries.length === 0" class="text-center py-12 text-gray-400">
          <Truck class="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p class="text-lg font-medium">No hay entregas</p>
          <p class="text-sm">Crea una nueva entrega para comenzar</p>
        </div>

        <!-- Delivery cards -->
        <div v-else class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          <div
            v-for="delivery in filteredDeliveries"
            :key="delivery.id"
            class="bg-gradient-to-br from-white to-gray-50 p-5 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100"
          >
            <div class="flex items-center justify-between mb-3">
              <div class="flex items-center space-x-3">
                <div class="w-10 h-10 bg-gradient-to-br from-orange-400 to-red-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                  {{ delivery.driver?.name?.charAt(0) ?? '?' }}
                </div>
                <div>
                  <h3 class="font-semibold text-gray-800 text-sm">{{ delivery.driver?.name ?? 'Sin asignar' }}</h3>
                  <p class="text-xs text-gray-500">{{ VEHICLE_LABELS[delivery.driver?.vehicleType ?? 'MOTO'] }}</p>
                </div>
              </div>
              <span :class="DELIVERY_STATUS_CLASSES[delivery.status]" class="px-2.5 py-1 rounded-full text-xs font-medium">
                {{ DELIVERY_STATUS_LABELS[delivery.status] }}
              </span>
            </div>

            <div class="space-y-1.5 mb-3 text-sm">
              <div class="flex items-start text-gray-600 gap-2">
                <MapPin class="w-4 h-4 text-orange-500 mt-0.5 shrink-0" />
                <span class="line-clamp-1">{{ delivery.deliveryAddress }}</span>
              </div>
              <div class="flex items-center text-gray-600 gap-2">
                <User class="w-4 h-4 text-purple-500" />
                <span>{{ delivery.customerName }}</span>
              </div>
              <div class="flex items-center justify-between text-gray-600">
                <span class="flex items-center gap-1">
                  <Clock class="w-4 h-4 text-blue-500" />
                  {{ delivery.estimatedTime ? `${delivery.estimatedTime}min` : '—' }}
                </span>
                <span class="flex items-center gap-1 font-semibold text-gray-800">
                  <DollarSign class="w-4 h-4 text-green-500" />
                  ${{ delivery.total.toFixed(2) }}
                </span>
              </div>
            </div>

            <div class="flex gap-2">
              <!-- Assign driver if pending -->
              <button
                v-if="!delivery.driverId && delivery.status === 'PENDIENTE'"
                @click="openAssign(delivery)"
                class="flex-1 bg-gradient-to-r from-purple-500 to-purple-600 text-white py-1.5 px-3 rounded-lg hover:scale-105 transition-transform duration-200 text-xs flex items-center justify-center gap-1"
              >
                <UserPlus class="w-3.5 h-3.5" />
                Asignar
              </button>

              <!-- Status quick actions -->
              <button
                v-if="delivery.status === 'ASIGNADO'"
                @click="changeStatus(delivery.id, 'RECOGIENDO')"
                class="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 text-white py-1.5 px-3 rounded-lg hover:scale-105 transition-transform text-xs flex items-center justify-center gap-1"
              >
                <Package class="w-3.5 h-3.5" />
                Recogiendo
              </button>

              <button
                v-if="delivery.status === 'RECOGIENDO'"
                @click="changeStatus(delivery.id, 'EN_CAMINO')"
                class="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white py-1.5 px-3 rounded-lg hover:scale-105 transition-transform text-xs flex items-center justify-center gap-1"
              >
                <Navigation class="w-3.5 h-3.5" />
                En camino
              </button>

              <button
                v-if="delivery.status === 'EN_CAMINO'"
                @click="changeStatus(delivery.id, 'ENTREGADO')"
                class="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white py-1.5 px-3 rounded-lg hover:scale-105 transition-transform text-xs flex items-center justify-center gap-1"
              >
                <CheckCircle class="w-3.5 h-3.5" />
                Entregado
              </button>

              <!-- Edit -->
              <button
                @click="openEditDelivery(delivery)"
                class="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="Editar"
              >
                <Pencil class="w-4 h-4" />
              </button>

              <!-- Cancel -->
              <button
                v-if="!['ENTREGADO','CANCELADO','FALLIDO'].includes(delivery.status)"
                @click="changeStatus(delivery.id, 'CANCELADO')"
                class="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Cancelar"
              >
                <XCircle class="w-4 h-4" />
              </button>

              <!-- Delete -->
              <button
                @click="confirmDeleteDelivery(delivery.id)"
                class="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Eliminar"
              >
                <Trash2 class="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <!-- Pagination -->
        <div v-if="totalCount > pageSize" class="mt-6 flex items-center justify-between">
          <p class="text-sm text-gray-500">Mostrando {{ filteredDeliveries.length }} de {{ totalCount }}</p>
          <div class="flex gap-2">
            <button
              :disabled="currentPage === 1"
              @click="goPage(currentPage - 1)"
              class="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
            >
              ← Anterior
            </button>
            <button
              :disabled="currentPage * pageSize >= totalCount"
              @click="goPage(currentPage + 1)"
              class="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
            >
              Siguiente →
            </button>
          </div>
        </div>
      </div>

      <!-- Drivers Section -->
      <div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-white/20">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-2xl font-bold text-gray-800 flex items-center">
            <Users class="w-6 h-6 mr-2 text-green-500" />
            Repartidores
          </h2>
          <button @click="openNewDriver" class="bg-gradient-to-r from-green-500 to-green-600 text-white px-5 py-2 rounded-xl hover:scale-105 transition-transform duration-200 shadow-lg flex items-center gap-2">
            <UserPlus class="w-5 h-5" />
            Agregar Repartidor
          </button>
        </div>

        <div v-if="loadingDrivers" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <div v-for="i in 4" :key="i" class="bg-gray-100 rounded-xl h-36 animate-pulse" />
        </div>

        <div v-else-if="drivers.length === 0" class="text-center py-10 text-gray-400">
          <Users class="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p>No hay repartidores registrados</p>
        </div>

        <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <div
            v-for="driver in drivers"
            :key="driver.id"
            class="bg-gradient-to-br from-white to-gray-50 p-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100"
          >
            <div class="flex items-center space-x-3 mb-3">
              <div class="relative">
                <div class="w-11 h-11 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                  {{ driver.name.charAt(0) }}
                </div>
                <div
                  :class="driver.status === 'DISPONIBLE' ? 'bg-green-400' : driver.status === 'EN_ENTREGA' ? 'bg-blue-400' : driver.status === 'DESCANSO' ? 'bg-yellow-400' : 'bg-gray-400'"
                  class="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white"
                />
              </div>
              <div>
                <h3 class="font-semibold text-gray-800 text-sm">{{ driver.name }}</h3>
                <p class="text-xs text-gray-500">{{ VEHICLE_LABELS[driver.vehicleType] }}</p>
              </div>
            </div>

            <div class="space-y-1 text-xs text-gray-600 mb-3">
              <div class="flex justify-between">
                <span>Estado:</span>
                <span :class="DRIVER_STATUS_CLASSES[driver.status]" class="px-1.5 py-0.5 rounded-full font-medium">
                  {{ DRIVER_STATUS_LABELS[driver.status] }}
                </span>
              </div>
              <div class="flex justify-between">
                <span>Entregas hoy:</span>
                <span class="font-semibold">{{ driver._count?.deliveries ?? 0 }}</span>
              </div>
              <div class="flex justify-between">
                <span>Total entregas:</span>
                <span class="font-semibold">{{ driver.totalDeliveries }}</span>
              </div>
              <div class="flex justify-between items-center">
                <span>Rating:</span>
                <span class="font-semibold flex items-center gap-0.5">
                  <Star class="w-3 h-3 text-yellow-400" />
                  {{ driver.rating.toFixed(1) }}
                </span>
              </div>
            </div>

            <div class="flex gap-1.5">
              <button @click="openEditDriver(driver)" class="flex-1 text-xs py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-1">
                <Pencil class="w-3 h-3" /> Editar
              </button>
              <button @click="confirmDeleteDriver(driver.id)" class="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                <Trash2 class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ─── Delivery Modal ──────────────────────────────────────────────────── -->
    <Teleport to="body">
      <div v-if="showDeliveryModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="closeDeliveryModal" />
        <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
          <h3 class="text-xl font-bold text-gray-800 mb-5">
            {{ editingDelivery ? 'Editar Entrega' : 'Nueva Entrega' }}
          </h3>

          <form @submit.prevent="saveDelivery" class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">N° de Orden *</label>
                <input v-model="deliveryForm.orderNumber" required placeholder="ORD-001"
                  class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-300 outline-none" />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Total *</label>
                <input v-model.number="deliveryForm.total" type="number" step="0.01" min="0.01" required
                  class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-300 outline-none" />
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Nombre del Cliente *</label>
              <input v-model="deliveryForm.customerName" required placeholder="Juan García"
                class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-300 outline-none" />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Teléfono del Cliente</label>
              <input v-model="deliveryForm.customerPhone" placeholder="+52 555 000 0000"
                class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-300 outline-none" />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Dirección de Entrega *</label>
              <input v-model="deliveryForm.deliveryAddress" required placeholder="Calle, número, colonia..."
                class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-300 outline-none" />
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Costo de Envío</label>
                <input v-model.number="deliveryForm.deliveryFee" type="number" step="0.01" min="0"
                  class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-300 outline-none" />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Tiempo Est. (min)</label>
                <input v-model.number="deliveryForm.estimatedTime" type="number" min="1"
                  class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-300 outline-none" />
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Repartidor</label>
              <select v-model="deliveryForm.driverId" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-300 outline-none">
                <option value="">Sin asignar</option>
                <option v-for="d in drivers" :key="d.id" :value="d.id">
                  {{ d.name }} — {{ VEHICLE_LABELS[d.vehicleType] }} ({{ DRIVER_STATUS_LABELS[d.status] }})
                </option>
              </select>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Notas</label>
              <textarea v-model="deliveryForm.notes" rows="2" placeholder="Instrucciones especiales..."
                class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-300 outline-none resize-none" />
            </div>

            <div class="flex gap-3 pt-2">
              <button type="button" @click="closeDeliveryModal" class="flex-1 border border-gray-200 text-gray-700 py-2 rounded-xl hover:bg-gray-50 transition-colors">
                Cancelar
              </button>
              <button type="submit" :disabled="savingDelivery" class="flex-1 bg-gradient-to-r from-orange-500 to-red-500 text-white py-2 rounded-xl hover:scale-105 transition-transform disabled:opacity-50">
                {{ savingDelivery ? 'Guardando...' : editingDelivery ? 'Actualizar' : 'Crear Entrega' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- ─── Driver Modal ────────────────────────────────────────────────────── -->
    <Teleport to="body">
      <div v-if="showDriverModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="closeDriverModal" />
        <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
          <h3 class="text-xl font-bold text-gray-800 mb-5">
            {{ editingDriver ? 'Editar Repartidor' : 'Agregar Repartidor' }}
          </h3>

          <form @submit.prevent="saveDriver" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
              <input v-model="driverForm.name" required placeholder="Nombre completo"
                class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-300 outline-none" />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
              <input v-model="driverForm.phone" placeholder="+52 555 000 0000"
                class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-300 outline-none" />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Tipo de Vehículo</label>
              <select v-model="driverForm.vehicleType" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-300 outline-none">
                <option v-for="(label, key) in VEHICLE_LABELS" :key="key" :value="key">{{ label }}</option>
              </select>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Modelo del vehículo</label>
                <input v-model="driverForm.vehicleModel" placeholder="Ej. Honda CBR 150"
                  class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-300 outline-none" />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Placa</label>
                <input v-model="driverForm.vehiclePlate" placeholder="ABC-123"
                  class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-300 outline-none" />
              </div>
            </div>

            <div class="flex gap-3 pt-2">
              <button type="button" @click="closeDriverModal" class="flex-1 border border-gray-200 text-gray-700 py-2 rounded-xl hover:bg-gray-50 transition-colors">
                Cancelar
              </button>
              <button type="submit" :disabled="savingDriver" class="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white py-2 rounded-xl hover:scale-105 transition-transform disabled:opacity-50">
                {{ savingDriver ? 'Guardando...' : editingDriver ? 'Actualizar' : 'Agregar' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- ─── Assign Driver Modal ─────────────────────────────────────────────── -->
    <Teleport to="body">
      <div v-if="showAssignModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="showAssignModal = false" />
        <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
          <h3 class="text-xl font-bold text-gray-800 mb-4">Asignar Repartidor</h3>
          <p class="text-sm text-gray-500 mb-4">Orden: <strong>{{ assigningDelivery?.orderNumber }}</strong> → {{ assigningDelivery?.customerName }}</p>

          <div class="space-y-2 mb-5 max-h-60 overflow-y-auto">
            <button
              v-for="driver in drivers"
              :key="driver.id"
              @click="doAssign(driver.id)"
              class="w-full flex items-center gap-3 p-3 border border-gray-100 rounded-xl hover:border-green-300 hover:bg-green-50 transition-colors text-left"
            >
              <div class="w-9 h-9 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0">
                {{ driver.name.charAt(0) }}
              </div>
              <div>
                <p class="font-medium text-sm text-gray-800">{{ driver.name }}</p>
                <p class="text-xs text-gray-500">{{ VEHICLE_LABELS[driver.vehicleType] }} · <span :class="DRIVER_STATUS_CLASSES[driver.status]" class="px-1.5 rounded-full">{{ DRIVER_STATUS_LABELS[driver.status] }}</span></p>
              </div>
            </button>
            <p v-if="drivers.length === 0" class="text-center text-gray-400 py-4 text-sm">No hay repartidores disponibles</p>
          </div>

          <button @click="showAssignModal = false" class="w-full border border-gray-200 text-gray-600 py-2 rounded-xl hover:bg-gray-50">
            Cancelar
          </button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  Truck, MapPin, Clock, Users, Star, DollarSign,
  Plus, UserPlus, TrendingUp, RefreshCw, Package,
  Navigation, CheckCircle, XCircle, Pencil, Trash2, User,
} from 'lucide-vue-next'
import {
  useDelivery,
  DELIVERY_STATUS_LABELS,
  DELIVERY_STATUS_CLASSES,
  DRIVER_STATUS_LABELS,
  DRIVER_STATUS_CLASSES,
  VEHICLE_LABELS,
  type Delivery,
  type Driver,
  type CreateDeliveryPayload,
  type CreateDriverPayload,
  type DeliveryStatus,
} from '~/composables/useDelivery'

const {
  deliveries, drivers, stats, loading, loadingDrivers, error, totalCount,
  loadDeliveries, loadDrivers,
  createDelivery, updateDelivery, deleteDelivery, updateDeliveryStatus, assignDriver,
  createDriver, updateDriver, deleteDriver,
} = useDelivery()

// ─── Filters & Pagination ─────────────────────────────────────────────────────

const statusFilter = ref<string>('')
const currentPage = ref(1)
const pageSize = 18

const filteredDeliveries = computed(() => {
  if (!statusFilter.value) return deliveries.value
  return deliveries.value.filter((d) => d.status === statusFilter.value)
})

async function goPage(page: number) {
  currentPage.value = page
  await loadDeliveries({ status: statusFilter.value as DeliveryStatus || undefined, page, limit: pageSize })
}

// ─── Initial load ─────────────────────────────────────────────────────────────

onMounted(async () => {
  await Promise.all([
    loadDeliveries({ limit: pageSize }),
    loadDrivers(),
  ])
})

async function refreshAll() {
  await Promise.all([
    loadDeliveries({ status: statusFilter.value as DeliveryStatus || undefined, page: currentPage.value, limit: pageSize }),
    loadDrivers(),
  ])
}

// ─── Status quick change ──────────────────────────────────────────────────────

async function changeStatus(id: string, status: DeliveryStatus) {
  await updateDeliveryStatus(id, status)
}

// ─── Delivery Modal ───────────────────────────────────────────────────────────

const showDeliveryModal = ref(false)
const editingDelivery = ref<Delivery | null>(null)
const savingDelivery = ref(false)

const defaultDeliveryForm = (): CreateDeliveryPayload => ({
  orderNumber: '',
  customerName: '',
  customerPhone: '',
  deliveryAddress: '',
  notes: '',
  total: 0,
  deliveryFee: 0,
  estimatedTime: undefined,
  driverId: '',
})

const deliveryForm = ref<CreateDeliveryPayload>(defaultDeliveryForm())

function openNewDelivery() {
  editingDelivery.value = null
  deliveryForm.value = defaultDeliveryForm()
  showDeliveryModal.value = true
}

function openEditDelivery(delivery: Delivery) {
  editingDelivery.value = delivery
  deliveryForm.value = {
    orderNumber: delivery.orderNumber,
    customerName: delivery.customerName,
    customerPhone: delivery.customerPhone ?? '',
    deliveryAddress: delivery.deliveryAddress,
    notes: delivery.notes ?? '',
    total: delivery.total,
    deliveryFee: delivery.deliveryFee,
    estimatedTime: delivery.estimatedTime,
    driverId: delivery.driverId ?? '',
  }
  showDeliveryModal.value = true
}

function closeDeliveryModal() {
  showDeliveryModal.value = false
  editingDelivery.value = null
}

async function saveDelivery() {
  savingDelivery.value = true
  try {
    const payload = { ...deliveryForm.value, driverId: deliveryForm.value.driverId || undefined }
    if (editingDelivery.value) {
      await updateDelivery(editingDelivery.value.id, payload)
    } else {
      await createDelivery(payload)
    }
    closeDeliveryModal()
  } finally {
    savingDelivery.value = false
  }
}

async function confirmDeleteDelivery(id: string) {
  if (confirm('¿Eliminar esta entrega?')) {
    await deleteDelivery(id)
  }
}

// ─── Assign Driver Modal ──────────────────────────────────────────────────────

const showAssignModal = ref(false)
const assigningDelivery = ref<Delivery | null>(null)

function openAssign(delivery: Delivery) {
  assigningDelivery.value = delivery
  showAssignModal.value = true
}

async function doAssign(driverId: string) {
  if (!assigningDelivery.value) return
  await assignDriver(assigningDelivery.value.id, driverId)
  showAssignModal.value = false
  assigningDelivery.value = null
}

// ─── Driver Modal ─────────────────────────────────────────────────────────────

const showDriverModal = ref(false)
const editingDriver = ref<Driver | null>(null)
const savingDriver = ref(false)

const defaultDriverForm = (): CreateDriverPayload => ({
  name: '',
  phone: '',
  vehicleType: 'MOTO',
  vehicleModel: '',
  vehiclePlate: '',
})

const driverForm = ref<CreateDriverPayload>(defaultDriverForm())

function openNewDriver() {
  editingDriver.value = null
  driverForm.value = defaultDriverForm()
  showDriverModal.value = true
}

function openEditDriver(driver: Driver) {
  editingDriver.value = driver
  driverForm.value = {
    name: driver.name,
    phone: driver.phone ?? '',
    vehicleType: driver.vehicleType,
    vehicleModel: driver.vehicleModel ?? '',
    vehiclePlate: driver.vehiclePlate ?? '',
  }
  showDriverModal.value = true
}

function closeDriverModal() {
  showDriverModal.value = false
  editingDriver.value = null
}

async function saveDriver() {
  savingDriver.value = true
  try {
    const payload = { ...driverForm.value }
    if (editingDriver.value) {
      await updateDriver(editingDriver.value.id, payload)
    } else {
      await createDriver(payload)
    }
    closeDriverModal()
  } finally {
    savingDriver.value = false
  }
}

async function confirmDeleteDriver(id: string) {
  if (confirm('¿Desactivar este repartidor?')) {
    await deleteDriver(id)
  }
}
</script>

<style scoped>
@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
}

@keyframes spin-slow {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.animate-float {
  animation: float 3s ease-in-out infinite;
}

.animate-spin-slow {
  animation: spin-slow 3s linear infinite;
}
</style>
