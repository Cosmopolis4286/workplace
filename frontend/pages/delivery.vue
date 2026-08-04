<template>
  <div>
    <PageHeader
      title="Gestión de Delivery"
      description="Control de entregas y repartidores"
      :icon="TruckIcon"
      :breadcrumb="[{ label: 'Delivery' }]"
      :stats="headerStats"
    >
      <template #actions>
        <HeaderActionButton :icon="ArrowPathIcon" :loading="loading" :disabled="loading" @click="refreshAll">
          Actualizar
        </HeaderActionButton>
        <HeaderActionButton :icon="UserPlusIcon" @click="openInviteDriver">
          Invitar repartidor
        </HeaderActionButton>
        <HeaderActionButton
          variant="primary"
          :icon="PlusIcon"
          :disabled="kycStatus !== undefined && kycStatus !== 'APPROVED'"
          @click="openNewDelivery"
        >
          Nueva Entrega
        </HeaderActionButton>
      </template>
    </PageHeader>

    <!-- Error -->
    <div v-if="error" class="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
      <p class="text-red-700 text-sm">{{ error }}</p>
      <button class="text-red-500 hover:text-red-700" @click="error = null"><XMarkIcon class="h-4 w-4" /></button>
    </div>

    <!-- KYC banner -->
    <div v-if="kycStatus && kycStatus !== 'APPROVED'" class="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
      Debes verificar tu identidad antes de crear una entrega.
      <NuxtLink to="/verification" class="font-semibold underline">Completa la verificación</NuxtLink>.
    </div>

    <!-- ── Entregas en curso ──────────────────────────────────────────────── -->
    <div class="card overflow-hidden mb-6">
      <div class="px-5 py-4 border-b border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <MapPinIcon class="h-4 w-4 text-red-500" />
          <h2 class="text-sm font-semibold text-gray-900">Entregas en Curso</h2>
        </div>
        <div class="flex items-center gap-2">
          <select v-model="statusFilter" class="input-field text-sm w-auto py-1.5">
            <option value="">Todos los estados</option>
            <option v-for="(label, key) in DELIVERY_STATUS_LABELS" :key="key" :value="key">{{ label }}</option>
          </select>
        </div>
      </div>

      <!-- Skeleton -->
      <div v-if="loading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-5">
        <div v-for="i in 3" :key="i" class="h-44 bg-gray-100 rounded-xl animate-pulse" />
      </div>

      <!-- Empty -->
      <div v-else-if="filteredDeliveries.length === 0" class="p-12 text-center">
        <TruckIcon class="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <p class="text-gray-500 font-medium">No hay entregas</p>
        <p class="text-sm text-gray-400 mt-1">Crea una nueva entrega para comenzar</p>
        <button class="btn-primary mt-4" @click="openNewDelivery">
          <PlusIcon class="h-4 w-4 inline mr-1.5" />Nueva Entrega
        </button>
      </div>

      <!-- Cards -->
      <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-5">
        <div
          v-for="delivery in filteredDeliveries"
          :key="delivery.id"
          class="card p-4 space-y-3 hover:shadow-md transition-shadow"
        >
          <!-- Header: conductor + estado -->
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <div class="h-9 w-9 rounded-full bg-red-100 flex items-center justify-center font-bold text-sm text-red-700 flex-shrink-0">
                {{ delivery.driver?.name?.charAt(0) ?? '?' }}
              </div>
              <div>
                <p class="text-sm font-semibold text-gray-900">{{ delivery.driver?.name ?? 'Sin asignar' }}</p>
                <p class="text-xs text-gray-400">{{ VEHICLE_LABELS[delivery.driver?.vehicleType ?? 'MOTORCYCLE'] }}</p>
              </div>
            </div>
            <span class="badge" :class="DELIVERY_STATUS_CLASSES[delivery.status]">
              {{ DELIVERY_STATUS_LABELS[delivery.status] }}
            </span>
          </div>

          <!-- Info -->
          <div class="space-y-1 text-xs text-gray-500">
            <div class="flex items-start gap-1.5">
              <MapPinIcon class="h-3.5 w-3.5 text-red-400 mt-0.5 flex-shrink-0" />
              <span class="line-clamp-1">{{ delivery.deliveryAddress }}</span>
            </div>
            <div class="flex items-center gap-1.5">
              <UserIcon class="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
              <span>{{ delivery.customerName }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="flex items-center gap-1">
                <ClockIcon class="h-3.5 w-3.5 text-blue-400" />
                {{ delivery.estimatedTime ? `${delivery.estimatedTime} min` : '—' }}
              </span>
              <span class="font-bold text-gray-900">${{ delivery.total.toFixed(2) }}</span>
            </div>
          </div>

          <!-- Acciones -->
          <div class="flex gap-1.5 flex-wrap">
            <button
              v-if="!delivery.driverId && delivery.status === 'PENDING'"
              class="flex-1 btn-secondary text-xs py-1.5 flex items-center justify-center gap-1"
              @click="openAssign(delivery)"
            >
              <UserPlusIcon class="h-3.5 w-3.5" />Asignar
            </button>
            <button v-if="delivery.status === 'ASSIGNED'"   class="flex-1 text-xs py-1.5 px-2 bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-lg font-medium transition-colors" @click="changeStatus(delivery.id, 'PICKING_UP')">Recogiendo</button>
            <button v-if="delivery.status === 'PICKING_UP'" class="flex-1 text-xs py-1.5 px-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg font-medium transition-colors" @click="changeStatus(delivery.id, 'IN_TRANSIT')">En camino</button>
            <button v-if="delivery.status === 'IN_TRANSIT'"  class="flex-1 text-xs py-1.5 px-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg font-medium transition-colors" @click="changeStatus(delivery.id, 'DELIVERED')">Entregado</button>
            <button class="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Editar" @click="openEditDelivery(delivery)">
              <PencilIcon class="h-3.5 w-3.5" />
            </button>
            <button
              v-if="!['DELIVERED','CANCELLED','FAILED'].includes(delivery.status)"
              class="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Cancelar"
              @click="changeStatus(delivery.id, 'CANCELLED')"
            ><XCircleIcon class="h-3.5 w-3.5" /></button>
            <button class="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar" @click="confirmDeleteDelivery(delivery.id)">
              <TrashIcon class="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      <!-- Paginación -->
      <div v-if="totalCount > pageSize" class="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
        <p class="text-sm text-gray-500">{{ filteredDeliveries.length }} de {{ totalCount }}</p>
        <div class="flex gap-2">
          <button class="btn-secondary text-sm px-3 py-1" :disabled="currentPage === 1" @click="goPage(currentPage - 1)">Anterior</button>
          <button class="btn-secondary text-sm px-3 py-1" :disabled="currentPage * pageSize >= totalCount" @click="goPage(currentPage + 1)">Siguiente</button>
        </div>
      </div>
    </div>

    <!-- ── Repartidores ────────────────────────────────────────────────────── -->
    <div class="card overflow-hidden">
      <div class="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <UsersIcon class="h-4 w-4 text-green-500" />
          <h2 class="text-sm font-semibold text-gray-900">Repartidores</h2>
        </div>
        <button class="btn-primary text-sm flex items-center gap-1.5" @click="openInviteDriver">
          <UserPlusIcon class="h-4 w-4" />Invitar
        </button>
      </div>

      <!-- Invitaciones pendientes -->
      <div v-if="pendingInvitations.length" class="px-5 py-4 border-b border-gray-100 space-y-2 bg-amber-50/50">
        <p class="text-xs font-semibold text-amber-700">Invitaciones pendientes</p>
        <div v-for="inv in pendingInvitations" :key="inv.id" class="flex items-center justify-between gap-3 text-sm">
          <div class="min-w-0">
            <p class="text-gray-900 truncate">{{ inv.email }}</p>
            <p class="text-xs text-gray-400">Expira {{ new Date(inv.expiresAt).toLocaleDateString('es-VE') }}</p>
          </div>
          <button class="text-xs text-red-500 hover:text-red-700 flex-shrink-0" @click="handleCancelInvitation(inv.id)">Cancelar</button>
        </div>
      </div>

      <div v-if="loadingDrivers" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-5">
        <div v-for="i in 4" :key="i" class="h-36 bg-gray-100 rounded-xl animate-pulse" />
      </div>

      <div v-else-if="drivers.length === 0" class="p-12 text-center">
        <UsersIcon class="h-10 w-10 text-gray-300 mx-auto mb-2" />
        <p class="text-sm text-gray-400">No hay repartidores registrados</p>
      </div>

      <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-5">
        <div
          v-for="driver in drivers"
          :key="driver.id"
          class="card p-4 space-y-3 hover:shadow-md transition-shadow"
        >
          <div class="flex items-center gap-3">
            <div class="relative flex-shrink-0">
              <div class="h-11 w-11 rounded-full bg-red-100 flex items-center justify-center font-bold text-red-700">
                {{ driver.name.charAt(0) }}
              </div>
              <span
                class="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white"
                :class="{
                  'bg-green-400':  driver.status === 'AVAILABLE',
                  'bg-blue-400':   driver.status === 'ON_DELIVERY',
                  'bg-yellow-400': driver.status === 'ON_BREAK',
                  'bg-gray-400':   driver.status === 'INACTIVE',
                }"
              />
            </div>
            <div class="min-w-0">
              <p class="text-sm font-semibold text-gray-900 truncate">{{ driver.name }}</p>
              <p class="text-xs text-gray-400">{{ VEHICLE_LABELS[driver.vehicleType] }}</p>
            </div>
          </div>

          <div class="space-y-1.5">
            <div v-if="driver.isAssignable === false" class="text-[11px] text-red-600 bg-red-50 rounded-lg px-2 py-1">
              Sin cuenta verificada — no puede recibir nuevas entregas
            </div>
            <div v-else-if="!driver.userId && driver.graceUntil" class="text-[11px] text-amber-700 bg-amber-50 rounded-lg px-2 py-1">
              Invítalo a registrarse antes del {{ new Date(driver.graceUntil).toLocaleDateString('es-VE') }}
            </div>
            <div class="flex items-center justify-between">
              <span class="text-xs text-gray-500">Estado</span>
              <span class="badge" :class="DRIVER_STATUS_CLASSES[driver.status]">{{ DRIVER_STATUS_LABELS[driver.status] }}</span>
            </div>
            <div class="flex items-center justify-between text-xs text-gray-500">
              <span>Entregas totales</span>
              <span class="font-semibold text-gray-900">{{ driver.totalDeliveries }}</span>
            </div>
            <div class="flex items-center justify-between text-xs text-gray-500">
              <span>Rating</span>
              <span class="font-semibold text-gray-900 flex items-center gap-0.5">
                <StarIcon class="h-3 w-3 text-yellow-400" />{{ driver.rating.toFixed(1) }}
              </span>
            </div>
          </div>

          <div class="flex gap-1.5">
            <button class="flex-1 btn-secondary text-xs py-1.5 flex items-center justify-center gap-1" @click="openEditDriver(driver)">
              <PencilIcon class="h-3 w-3" />Editar
            </button>
            <button class="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" @click="confirmDeleteDriver(driver.id)">
              <TrashIcon class="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Modal Entrega ───────────────────────────────────────────────────── -->
    <Teleport to="body">
      <Transition enter-active-class="ease-out duration-200" enter-from-class="opacity-0" enter-to-class="opacity-100"
        leave-active-class="ease-in duration-150" leave-from-class="opacity-100" leave-to-class="opacity-0">
        <div v-if="showDeliveryModal" class="fixed inset-0 z-50 flex items-center justify-center p-4" @click.self="closeDeliveryModal">
          <div class="absolute inset-0 bg-black/40" @click="closeDeliveryModal" />
          <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div class="flex items-center justify-between mb-5">
              <h3 class="text-base font-semibold text-gray-900">{{ editingDelivery ? 'Editar Entrega' : 'Nueva Entrega' }}</h3>
              <button class="p-1 text-gray-400 hover:text-gray-600 rounded-lg" @click="closeDeliveryModal"><XMarkIcon class="h-5 w-5" /></button>
            </div>
            <form @submit.prevent="saveDelivery" class="space-y-4">
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">N° de Orden <span class="text-red-500">*</span></label>
                  <input v-model="deliveryForm.orderNumber" required placeholder="ORD-001" class="input-field" />
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Total <span class="text-red-500">*</span></label>
                  <input v-model.number="deliveryForm.total" type="number" step="0.01" min="0.01" required class="input-field" />
                </div>
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Nombre del Cliente <span class="text-red-500">*</span></label>
                <input v-model="deliveryForm.customerName" required placeholder="Juan García" class="input-field" />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Teléfono del Cliente</label>
                <input v-model="deliveryForm.customerPhone" placeholder="+58 412 000 0000" class="input-field" />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Dirección de Entrega <span class="text-red-500">*</span></label>
                <input v-model="deliveryForm.deliveryAddress" required placeholder="Calle, número..." class="input-field" />
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Costo de Envío</label>
                  <input v-model.number="deliveryForm.deliveryFee" type="number" step="0.01" min="0" class="input-field" />
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Tiempo Est. (min)</label>
                  <input v-model.number="deliveryForm.estimatedTime" type="number" min="1" class="input-field" />
                </div>
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Repartidor</label>
                <select v-model="deliveryForm.driverId" class="input-field">
                  <option value="">Sin asignar</option>
                  <option v-for="d in drivers" :key="d.id" :value="d.id">
                    {{ d.name }} — {{ VEHICLE_LABELS[d.vehicleType] }} ({{ DRIVER_STATUS_LABELS[d.status] }})
                  </option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Notas</label>
                <textarea v-model="deliveryForm.notes" rows="2" placeholder="Instrucciones especiales..." class="input-field resize-none" />
              </div>
              <div class="flex gap-3 pt-2">
                <button type="button" class="btn-secondary flex-1" @click="closeDeliveryModal">Cancelar</button>
                <button type="submit" class="btn-primary flex-1" :disabled="savingDelivery">
                  {{ savingDelivery ? 'Guardando...' : (editingDelivery ? 'Actualizar' : 'Crear Entrega') }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ── Modal Repartidor ────────────────────────────────────────────────── -->
    <Teleport to="body">
      <Transition enter-active-class="ease-out duration-200" enter-from-class="opacity-0" enter-to-class="opacity-100"
        leave-active-class="ease-in duration-150" leave-from-class="opacity-100" leave-to-class="opacity-0">
        <div v-if="showDriverModal" class="fixed inset-0 z-50 flex items-center justify-center p-4" @click.self="closeDriverModal">
          <div class="absolute inset-0 bg-black/40" @click="closeDriverModal" />
          <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div class="flex items-center justify-between mb-5">
              <h3 class="text-base font-semibold text-gray-900">Editar Repartidor</h3>
              <button class="p-1 text-gray-400 hover:text-gray-600 rounded-lg" @click="closeDriverModal"><XMarkIcon class="h-5 w-5" /></button>
            </div>
            <form @submit.prevent="saveDriver" class="space-y-4">
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Nombre <span class="text-red-500">*</span></label>
                <input v-model="driverForm.name" required placeholder="Nombre completo" class="input-field" />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Teléfono</label>
                <input v-model="driverForm.phone" placeholder="+58 412 000 0000" class="input-field" />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Tipo de Vehículo</label>
                <select v-model="driverForm.vehicleType" class="input-field">
                  <option v-for="(label, key) in VEHICLE_LABELS" :key="key" :value="key">{{ label }}</option>
                </select>
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Modelo del vehículo</label>
                  <input v-model="driverForm.vehicleModel" placeholder="Honda CBR 150" class="input-field" />
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Placa</label>
                  <input v-model="driverForm.vehiclePlate" placeholder="ABC-123" class="input-field" />
                </div>
              </div>
              <div class="flex gap-3 pt-2">
                <button type="button" class="btn-secondary flex-1" @click="closeDriverModal">Cancelar</button>
                <button type="submit" class="btn-primary flex-1" :disabled="savingDriver">
                  {{ savingDriver ? 'Guardando...' : 'Actualizar' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ── Modal Invitar Repartidor ────────────────────────────────────────── -->
    <Teleport to="body">
      <Transition enter-active-class="ease-out duration-200" enter-from-class="opacity-0" enter-to-class="opacity-100"
        leave-active-class="ease-in duration-150" leave-from-class="opacity-100" leave-to-class="opacity-0">
        <div v-if="showInviteModal" class="fixed inset-0 z-50 flex items-center justify-center p-4" @click.self="closeInviteModal">
          <div class="absolute inset-0 bg-black/40" @click="closeInviteModal" />
          <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div class="flex items-center justify-between mb-5">
              <h3 class="text-base font-semibold text-gray-900">Invitar Repartidor</h3>
              <button class="p-1 text-gray-400 hover:text-gray-600 rounded-lg" @click="closeInviteModal"><XMarkIcon class="h-5 w-5" /></button>
            </div>
            <p class="text-xs text-gray-500 mb-4">
              El repartidor recibirá un correo para crear su cuenta y verificar su identidad. Solo podrá recibir entregas una vez aprobada su verificación.
            </p>
            <form @submit.prevent="sendInvite" class="space-y-4">
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Correo <span class="text-red-500">*</span></label>
                <input v-model="inviteForm.email" type="email" required placeholder="repartidor@correo.com" class="input-field" />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Nombre (opcional)</label>
                <input v-model="inviteForm.name" placeholder="Nombre completo" class="input-field" />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Teléfono (opcional)</label>
                <input v-model="inviteForm.phone" placeholder="+58 412 000 0000" class="input-field" />
              </div>
              <div v-if="inviteError" class="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{{ inviteError }}</div>
              <div class="flex gap-3 pt-2">
                <button type="button" class="btn-secondary flex-1" @click="closeInviteModal">Cancelar</button>
                <button type="submit" class="btn-primary flex-1" :disabled="sendingInvite">
                  {{ sendingInvite ? 'Enviando...' : 'Enviar invitación' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ── Modal Asignar Repartidor ────────────────────────────────────────── -->
    <Teleport to="body">
      <Transition enter-active-class="ease-out duration-200" enter-from-class="opacity-0" enter-to-class="opacity-100"
        leave-active-class="ease-in duration-150" leave-from-class="opacity-100" leave-to-class="opacity-0">
        <div v-if="showAssignModal" class="fixed inset-0 z-50 flex items-center justify-center p-4" @click.self="showAssignModal = false">
          <div class="absolute inset-0 bg-black/40" @click="showAssignModal = false" />
          <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-base font-semibold text-gray-900">Asignar Repartidor</h3>
              <button class="p-1 text-gray-400 hover:text-gray-600 rounded-lg" @click="showAssignModal = false"><XMarkIcon class="h-5 w-5" /></button>
            </div>
            <p class="text-sm text-gray-500 mb-4">Orden <strong>{{ assigningDelivery?.orderNumber }}</strong> → {{ assigningDelivery?.customerName }}</p>
            <div class="space-y-2 mb-4 max-h-60 overflow-y-auto">
              <button
                v-for="driver in drivers"
                :key="driver.id"
                class="w-full flex items-center gap-3 p-3 border border-gray-100 rounded-xl hover:border-red-300 hover:bg-red-50 transition-colors text-left"
                @click="doAssign(driver.id)"
              >
                <div class="h-9 w-9 rounded-full bg-red-100 flex items-center justify-center font-bold text-sm text-red-700 flex-shrink-0">
                  {{ driver.name.charAt(0) }}
                </div>
                <div>
                  <p class="text-sm font-medium text-gray-900">{{ driver.name }}</p>
                  <p class="text-xs text-gray-500">{{ VEHICLE_LABELS[driver.vehicleType] }} · <span class="badge px-1" :class="DRIVER_STATUS_CLASSES[driver.status]">{{ DRIVER_STATUS_LABELS[driver.status] }}</span></p>
                </div>
              </button>
              <p v-if="drivers.length === 0" class="text-center text-sm text-gray-400 py-4">No hay repartidores disponibles</p>
            </div>
            <button class="btn-secondary w-full" @click="showAssignModal = false">Cancelar</button>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  TruckIcon, MapPinIcon, ClockIcon, UsersIcon, StarIcon,
  PlusIcon, UserPlusIcon, ArrowPathIcon, XMarkIcon,
  PencilIcon, TrashIcon, XCircleIcon, UserIcon,
} from '@heroicons/vue/24/outline'
import PageHeader from '~/components/ui/PageHeader.vue'
import {
  useDelivery,
  DELIVERY_STATUS_LABELS, DELIVERY_STATUS_CLASSES,
  DRIVER_STATUS_LABELS, DRIVER_STATUS_CLASSES, VEHICLE_LABELS,
  type Delivery, type Driver, type CreateDeliveryPayload, type CreateDriverPayload,
  type DeliveryStatus, type InviteDriverPayload,
} from '~/composables/useDelivery'
import { useKyc } from '~/composables/useKyc'

definePageMeta({ middleware: 'auth' })

const {
  deliveries, drivers, stats, loading, loadingDrivers, error, totalCount,
  invitations,
  loadDeliveries, loadDrivers,
  createDelivery, updateDelivery, deleteDelivery, updateDeliveryStatus, assignDriver,
  updateDriver, deleteDriver,
  loadInvitations, inviteDriver, cancelInvitation,
} = useDelivery()

const { myStatus: myKycStatus, fetchMyStatus: fetchMyKycStatus } = useKyc()
const kycStatus = computed(() => myKycStatus.value?.kycStatus)

const statusFilter = ref<string>('')
const currentPage  = ref(1)
const pageSize     = 18

const filteredDeliveries = computed(() =>
  statusFilter.value ? deliveries.value.filter(d => d.status === statusFilter.value) : deliveries.value
)

const headerStats = computed(() => [
  { label: 'Activas',          value: String(stats.value.activeDeliveries)  },
  { label: 'Repartidores',     value: String(stats.value.onlineDrivers)     },
  { label: 'Entregados hoy',   value: String(stats.value.deliveredToday)    },
  { label: 'Total hoy',        value: String(stats.value.todayDeliveries)   },
])

async function goPage(page: number) {
  currentPage.value = page
  await loadDeliveries({ status: statusFilter.value as DeliveryStatus || undefined, page, limit: pageSize })
}

async function refreshAll() {
  await Promise.all([
    loadDeliveries({ status: statusFilter.value as DeliveryStatus || undefined, page: currentPage.value, limit: pageSize }),
    loadDrivers(),
  ])
}

async function changeStatus(id: string, status: DeliveryStatus) {
  await updateDeliveryStatus(id, status)
}

// ── Delivery Modal ────────────────────────────────────────────────────────────
const showDeliveryModal = ref(false)
const editingDelivery   = ref<Delivery | null>(null)
const savingDelivery    = ref(false)

const defaultDeliveryForm = (): CreateDeliveryPayload => ({
  orderNumber: '', customerName: '', customerPhone: '', deliveryAddress: '',
  notes: '', total: 0, deliveryFee: 0, estimatedTime: undefined, driverId: '',
})
const deliveryForm = ref<CreateDeliveryPayload>(defaultDeliveryForm())

function openNewDelivery() { editingDelivery.value = null; deliveryForm.value = defaultDeliveryForm(); showDeliveryModal.value = true }
function openEditDelivery(d: Delivery) {
  editingDelivery.value = d
  deliveryForm.value = { orderNumber: d.orderNumber, customerName: d.customerName, customerPhone: d.customerPhone ?? '', deliveryAddress: d.deliveryAddress, notes: d.notes ?? '', total: d.total, deliveryFee: d.deliveryFee, estimatedTime: d.estimatedTime, driverId: d.driverId ?? '' }
  showDeliveryModal.value = true
}
function closeDeliveryModal() { showDeliveryModal.value = false; editingDelivery.value = null }
async function saveDelivery() {
  savingDelivery.value = true
  try {
    const payload = { ...deliveryForm.value, driverId: deliveryForm.value.driverId || undefined }
    if (editingDelivery.value) await updateDelivery(editingDelivery.value.id, payload)
    else await createDelivery(payload)
    closeDeliveryModal()
  } finally { savingDelivery.value = false }
}
async function confirmDeleteDelivery(id: string) {
  if (confirm('¿Eliminar esta entrega?')) await deleteDelivery(id)
}

// ── Assign Modal ──────────────────────────────────────────────────────────────
const showAssignModal    = ref(false)
const assigningDelivery  = ref<Delivery | null>(null)

function openAssign(delivery: Delivery) { assigningDelivery.value = delivery; showAssignModal.value = true }
async function doAssign(driverId: string) {
  if (!assigningDelivery.value) return
  await assignDriver(assigningDelivery.value.id, driverId)
  showAssignModal.value = false; assigningDelivery.value = null
}

// ── Driver Modal ──────────────────────────────────────────────────────────────
const showDriverModal = ref(false)
const editingDriver   = ref<Driver | null>(null)
const savingDriver    = ref(false)

const defaultDriverForm = (): CreateDriverPayload => ({ name: '', phone: '', vehicleType: 'MOTORCYCLE', vehicleModel: '', vehiclePlate: '' })
const driverForm = ref<CreateDriverPayload>(defaultDriverForm())

function openEditDriver(d: Driver) {
  editingDriver.value = d
  driverForm.value = { name: d.name, phone: d.phone ?? '', vehicleType: d.vehicleType, vehicleModel: d.vehicleModel ?? '', vehiclePlate: d.vehiclePlate ?? '' }
  showDriverModal.value = true
}
function closeDriverModal() { showDriverModal.value = false; editingDriver.value = null }
async function saveDriver() {
  if (!editingDriver.value) return
  savingDriver.value = true
  try {
    await updateDriver(editingDriver.value.id, driverForm.value)
    closeDriverModal()
  } finally { savingDriver.value = false }
}
async function confirmDeleteDriver(id: string) {
  if (confirm('¿Desactivar este repartidor?')) await deleteDriver(id)
}

// ── Invite Modal ──────────────────────────────────────────────────────────────
const showInviteModal = ref(false)
const sendingInvite    = ref(false)
const inviteError      = ref<string | null>(null)
const inviteForm = ref<InviteDriverPayload>({ email: '', name: '', phone: '' })
const pendingInvitations = computed(() => invitations.value.filter((i) => i.status === 'PENDING'))

function openInviteDriver() {
  inviteForm.value = { email: '', name: '', phone: '' }
  inviteError.value = null
  showInviteModal.value = true
}
function closeInviteModal() { showInviteModal.value = false }
async function sendInvite() {
  sendingInvite.value = true
  inviteError.value = null
  try {
    const payload = {
      email: inviteForm.value.email,
      name: inviteForm.value.name || undefined,
      phone: inviteForm.value.phone || undefined,
    }
    const result = await inviteDriver(payload)
    if (result) closeInviteModal()
    else inviteError.value = error.value
  } finally { sendingInvite.value = false }
}
async function handleCancelInvitation(id: string) {
  if (confirm('¿Cancelar esta invitación?')) await cancelInvitation(id)
}

onMounted(async () => {
  await Promise.all([loadDeliveries({ limit: pageSize }), loadDrivers(), loadInvitations(), fetchMyKycStatus()])
})
</script>
