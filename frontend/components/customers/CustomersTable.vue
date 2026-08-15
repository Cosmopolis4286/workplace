<template>
  <div class="card overflow-hidden">
    <div class="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
      <p class="text-sm font-medium text-gray-700">
        {{ filteredCount }} cliente{{ filteredCount !== 1 ? 's' : '' }}
        <span v-if="isFiltered" class="text-gray-400 font-normal"> — filtrados</span>
      </p>
    </div>

    <!-- Skeleton -->
    <template v-if="loading">
      <div v-for="i in 5" :key="i" class="px-5 py-4 flex items-center gap-4 border-b border-gray-100 last:border-0">
        <div class="skeleton h-10 w-10 rounded-full flex-shrink-0" />
        <div class="flex-1 space-y-2">
          <div class="skeleton h-4 w-36 rounded" />
          <div class="skeleton h-3 w-48 rounded" />
        </div>
        <div class="skeleton h-6 w-16 rounded-full" />
      </div>
    </template>

    <!-- Empty -->
    <div v-else-if="filteredCount === 0" class="p-12 text-center">
      <UsersIcon class="h-12 w-12 text-gray-300 mx-auto mb-3" />
      <p class="text-gray-500 font-medium">No hay clientes</p>
      <p class="text-sm text-gray-400 mt-1">
        {{ isFiltered ? 'Sin resultados para los filtros aplicados' : 'Agrega tu primer cliente' }}
      </p>
      <button v-if="!isFiltered" class="btn-primary mt-4" @click="$emit('create')">
        <PlusIcon class="h-4 w-4 inline mr-1.5" />Nuevo Cliente
      </button>
    </div>

    <!-- Filas -->
    <template v-else>
      <div
        v-for="client in clients"
        :key="client.id"
        class="px-5 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors group border-b border-gray-100 last:border-0"
      >
        <!-- Avatar -->
        <div class="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 font-bold text-sm text-red-700">
          {{ client.name.charAt(0).toUpperCase() }}
        </div>

        <!-- Info -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <p class="text-sm font-semibold text-gray-900 truncate">{{ client.name }}</p>
            <span class="badge" :class="segmentClasses[client.segment]">
              {{ segmentLabels[client.segment] }}
            </span>
          </div>
          <p class="text-xs text-gray-400 mt-0.5 flex flex-wrap gap-x-3">
            <span v-if="client.email">{{ client.email }}</span>
            <span v-if="client.phone">{{ client.phone }}</span>
            <span>Desde {{ formatDate(client.createdAt) }}</span>
          </p>
        </div>

        <!-- Pedidos + gasto -->
        <div class="hidden sm:flex flex-col items-end text-right flex-shrink-0">
          <p class="text-sm font-bold text-gray-900">${{ client.totalSpent.toFixed(2) }}</p>
          <p class="text-xs text-gray-400">{{ client.totalOrders }} pedido{{ client.totalOrders !== 1 ? 's' : '' }}</p>
        </div>

        <!-- Estado -->
        <button
          class="flex-shrink-0 badge transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          :class="client.isActive ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'"
          :disabled="togglingStatusId === client.id"
          @click="$emit('toggle-status', client)"
        >
          {{ client.isActive ? 'Activo' : 'Inactivo' }}
        </button>

        <!-- Acciones hover -->
        <div class="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            class="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Editar"
            @click="$emit('edit', client)"
          >
            <PencilIcon class="h-4 w-4" />
          </button>
          <button
            class="p-1.5 rounded-lg transition-colors"
            :class="client.telegramChatId ? 'text-green-500 hover:text-green-700 hover:bg-green-50' : 'text-sky-500 hover:text-sky-700 hover:bg-sky-50'"
            :title="client.telegramChatId ? 'Telegram vinculado — copiar nuevo link' : 'Enviar link de Telegram'"
            :disabled="telegramLinkLoading === client.id"
            @click="$emit('send-telegram-link', client)"
          >
            <PaperAirplaneIcon class="h-4 w-4" />
          </button>
          <button
            class="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Eliminar"
            @click="$emit('delete', client)"
          >
            <TrashIcon class="h-4 w-4" />
          </button>
        </div>
      </div>
    </template>

    <!-- Paginación -->
    <div v-if="!loading && totalPages > 1" class="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
      <p class="text-sm text-gray-500">
        {{ (currentPage - 1) * itemsPerPage + 1 }}–{{ Math.min(currentPage * itemsPerPage, filteredCount) }}
        de {{ filteredCount }}
      </p>
      <div class="flex gap-2">
        <button
          class="btn-secondary text-sm px-3 py-1"
          :disabled="currentPage === 1"
          @click="$emit('update:currentPage', currentPage - 1)"
        >Anterior</button>
        <span class="text-sm text-gray-600 px-2 py-1">{{ currentPage }} / {{ totalPages }}</span>
        <button
          class="btn-secondary text-sm px-3 py-1"
          :disabled="currentPage >= totalPages"
          @click="$emit('update:currentPage', currentPage + 1)"
        >Siguiente</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { UsersIcon, PlusIcon, PencilIcon, TrashIcon, PaperAirplaneIcon } from '@heroicons/vue/24/outline'
import type { Customer, CustomerSegment } from '~/composables/customers/useCustomers'

defineProps<{
  clients: Customer[]
  filteredCount: number
  isFiltered: boolean
  loading: boolean
  segmentLabels: Record<CustomerSegment, string>
  segmentClasses: Record<CustomerSegment, string>
  formatDate: (iso: string) => string
  togglingStatusId: string | null
  telegramLinkLoading: string | null
  currentPage: number
  totalPages: number
  itemsPerPage: number
}>()

defineEmits<{
  create: []
  edit: [client: Customer]
  delete: [client: Customer]
  'toggle-status': [client: Customer]
  'send-telegram-link': [client: Customer]
  'update:currentPage': [page: number]
}>()
</script>
