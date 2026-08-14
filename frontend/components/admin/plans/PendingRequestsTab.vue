<template>
  <div>
    <div v-if="error" class="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
      <p class="text-red-700 text-sm">{{ error }}</p>
      <button class="text-red-500 hover:text-red-700" @click="$emit('clear-error')"><XMarkIcon class="h-4 w-4" /></button>
    </div>

    <div class="card overflow-hidden">
      <!-- Skeleton -->
      <template v-if="loading">
        <div v-for="i in 3" :key="i" class="p-4 flex items-center gap-4 border-b border-gray-100">
          <div class="skeleton h-9 w-9 rounded-full flex-shrink-0" />
          <div class="flex-1 space-y-2"><div class="skeleton h-4 w-36 rounded" /><div class="skeleton h-3 w-48 rounded" /></div>
          <div class="skeleton h-8 w-24 rounded-lg" />
        </div>
      </template>

      <!-- Vacío -->
      <div v-else-if="requests.length === 0" class="p-12 text-center">
        <CheckIcon class="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <p class="text-gray-500 font-medium">No hay solicitudes pendientes de aprobación</p>
      </div>

      <!-- Filas -->
      <div v-else class="divide-y divide-gray-100">
        <div v-for="sub in requests" :key="sub.id" class="px-5 py-3.5 flex items-center gap-4 hover:bg-gray-50 transition-colors flex-wrap">
          <!-- Avatar -->
          <div class="h-9 w-9 rounded-full bg-yellow-100 flex items-center justify-center font-bold text-sm text-yellow-700 flex-shrink-0">
            {{ sub.user?.firstName?.[0] ?? '?' }}
          </div>
          <!-- Usuario -->
          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold text-gray-900 truncate">{{ sub.user?.firstName }} {{ sub.user?.lastName }}</p>
            <p class="text-xs text-gray-400 truncate">{{ sub.user?.email }}</p>
          </div>
          <!-- Sector solicitado -->
          <span v-if="sub.user?.category" class="badge bg-gray-100 text-gray-600 flex-shrink-0">
            {{ sub.user.category.icon ? `${sub.user.category.icon} ` : '' }}{{ sub.user.category.name }}
          </span>
          <!-- Plan -->
          <span
            class="badge flex-shrink-0"
            :style="{ backgroundColor: (sub.plan?.color ?? '#6b7280') + '20', color: sub.plan?.color ?? '#6b7280' }"
          >{{ sub.plan?.name }}</span>
          <!-- Rol nuevo -->
          <span class="badge bg-orange-100 text-orange-700 flex-shrink-0">
            {{ sub.user?.role === 'NORMAL' ? 'Pendiente' : sub.user?.role }}
          </span>
          <!-- Intervalo + precio -->
          <div class="hidden sm:block text-right flex-shrink-0">
            <p class="text-sm font-bold text-gray-900">{{ formatPrice(sub.pricePaid) }}</p>
            <p class="text-xs text-gray-400">{{ INTERVAL_LABELS[sub.interval] }}</p>
          </div>
          <!-- Fecha de solicitud -->
          <div class="hidden md:block text-right flex-shrink-0 text-xs text-gray-500">
            {{ new Date(sub.createdAt).toLocaleDateString('es') }}
          </div>
          <!-- Acciones -->
          <div class="flex gap-2 flex-shrink-0">
            <button
              class="btn-secondary text-xs px-3 py-1.5 text-red-600 hover:bg-red-50"
              :disabled="processingId === sub.id"
              @click="$emit('reject', sub)"
            >Rechazar</button>
            <button
              class="btn-primary text-xs px-3 py-1.5"
              :disabled="processingId === sub.id"
              @click="$emit('approve', sub)"
            >Aprobar</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { XMarkIcon, CheckIcon } from '@heroicons/vue/24/outline'
import { INTERVAL_LABELS, type Subscription } from '~/composables/commerce/usePlans'

defineProps<{
  requests: Subscription[]
  loading: boolean
  processingId: string | null
  error: string | null
  formatPrice: (n: number) => string
}>()

defineEmits<{
  'clear-error': []
  approve: [sub: Subscription]
  reject: [sub: Subscription]
}>()
</script>
