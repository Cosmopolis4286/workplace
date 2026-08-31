<template>
  <div class="card overflow-hidden mb-6">
    <div class="px-5 py-4 border-b border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
      <div class="flex items-center gap-2">
        <MapPinIcon class="h-4 w-4 text-red-500" />
        <h2 class="text-sm font-semibold text-gray-900">Entregas en Curso</h2>
      </div>
      <div class="flex items-center gap-2">
        <select :value="statusFilter" class="input-field text-sm w-auto py-1.5" @change="$emit('update:statusFilter', ($event.target as HTMLSelectElement).value)">
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
    <div v-else-if="deliveries.length === 0" class="p-12 text-center">
      <TruckIcon class="h-12 w-12 text-gray-300 mx-auto mb-3" />
      <p class="text-gray-500 font-medium">No hay entregas</p>
      <p class="text-sm text-gray-400 mt-1">Crea una nueva entrega para comenzar</p>
      <button class="btn-primary mt-4" @click="$emit('new')">
        <PlusIcon class="h-4 w-4 inline mr-1.5" />Nueva Entrega
      </button>
    </div>

    <!-- Cards -->
    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-5">
      <div
        v-for="delivery in deliveries"
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

        <!-- Seguimiento en vivo: solo si hay coordenadas + cliente vinculado y el backend activó trackingActive -->
        <NuxtLink
          v-if="delivery.trackingActive"
          :to="`/delivery-tracking/${delivery.id}`"
          target="_blank"
          class="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700"
        >
          <MapPinIcon class="h-3.5 w-3.5" />
          Ver seguimiento en vivo
        </NuxtLink>

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
            @click="$emit('assign', delivery)"
          >
            <UserPlusIcon class="h-3.5 w-3.5" />Asignar
          </button>
          <button v-if="delivery.status === 'ASSIGNED'"   class="flex-1 text-xs py-1.5 px-2 bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed" :disabled="changingStatusId === delivery.id" @click="$emit('change-status', delivery.id, 'PICKING_UP')">Recogiendo</button>
          <button v-if="delivery.status === 'PICKING_UP'" class="flex-1 text-xs py-1.5 px-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed" :disabled="changingStatusId === delivery.id" @click="$emit('change-status', delivery.id, 'IN_TRANSIT')">En camino</button>
          <button v-if="delivery.status === 'IN_TRANSIT'"  class="flex-1 text-xs py-1.5 px-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed" :disabled="changingStatusId === delivery.id" @click="$emit('change-status', delivery.id, 'DELIVERED')">Entregado</button>
          <button class="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Editar" @click="$emit('edit', delivery)">
            <PencilIcon class="h-3.5 w-3.5" />
          </button>
          <button
            v-if="!['DELIVERED','CANCELLED','FAILED'].includes(delivery.status)"
            class="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Cancelar"
            :disabled="changingStatusId === delivery.id"
            @click="$emit('change-status', delivery.id, 'CANCELLED')"
          ><XCircleIcon class="h-3.5 w-3.5" /></button>
          <button class="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar" @click="$emit('delete', delivery.id)">
            <TrashIcon class="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>

    <!-- Paginación -->
    <div v-if="totalCount > pageSize" class="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
      <p class="text-sm text-gray-500">{{ deliveries.length }} de {{ totalCount }}</p>
      <div class="flex gap-2">
        <button class="btn-secondary text-sm px-3 py-1" :disabled="currentPage === 1" @click="$emit('page', currentPage - 1)">Anterior</button>
        <button class="btn-secondary text-sm px-3 py-1" :disabled="currentPage * pageSize >= totalCount" @click="$emit('page', currentPage + 1)">Siguiente</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  TruckIcon, MapPinIcon, ClockIcon, PlusIcon, UserPlusIcon,
  PencilIcon, TrashIcon, XCircleIcon, UserIcon,
} from '@heroicons/vue/24/outline'
import {
  DELIVERY_STATUS_LABELS, DELIVERY_STATUS_CLASSES, VEHICLE_LABELS,
  type Delivery, type DeliveryStatus,
} from '~/composables/delivery/useDelivery'

defineProps<{
  deliveries: Delivery[]
  loading: boolean
  statusFilter: string
  changingStatusId: string | null
  totalCount: number
  pageSize: number
  currentPage: number
}>()

defineEmits<{
  'update:statusFilter': [value: string]
  new: []
  assign: [delivery: Delivery]
  edit: [delivery: Delivery]
  delete: [id: string]
  'change-status': [id: string, status: DeliveryStatus]
  page: [page: number]
}>()
</script>
