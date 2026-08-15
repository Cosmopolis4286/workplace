<template>
  <div class="card overflow-hidden">
    <div class="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
      <div class="flex items-center gap-2">
        <UsersIcon class="h-4 w-4 text-green-500" />
        <h2 class="text-sm font-semibold text-gray-900">Repartidores</h2>
      </div>
      <button class="btn-primary text-sm flex items-center gap-1.5" @click="$emit('invite')">
        <UserPlusIcon class="h-4 w-4" />Invitar
      </button>
    </div>

    <!-- Invitaciones pendientes -->
    <div v-if="pendingInvitations.length" class="px-5 py-4 border-b border-gray-100 space-y-2 bg-amber-50/50">
      <p class="text-xs font-semibold text-amber-700">Invitaciones pendientes</p>
      <div v-for="inv in pendingInvitations" :key="inv.id" class="flex items-center justify-between gap-3 text-sm">
        <div class="min-w-0">
          <p class="text-gray-900 truncate">{{ inv.email }}</p>
          <p class="text-xs text-gray-400">Expira {{ new Date(inv.expiresAt).toLocaleDateString('es') }}</p>
        </div>
        <button class="text-xs text-red-500 hover:text-red-700 flex-shrink-0" @click="$emit('cancel-invitation', inv.id)">Cancelar</button>
      </div>
    </div>

    <div v-if="loading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-5">
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
            Invítalo a registrarse antes del {{ new Date(driver.graceUntil).toLocaleDateString('es') }}
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
          <button class="flex-1 btn-secondary text-xs py-1.5 flex items-center justify-center gap-1" @click="$emit('edit', driver)">
            <PencilIcon class="h-3 w-3" />Editar
          </button>
          <button class="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" @click="$emit('delete', driver.id)">
            <TrashIcon class="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { UsersIcon, StarIcon, UserPlusIcon, PencilIcon, TrashIcon } from '@heroicons/vue/24/outline'
import {
  DRIVER_STATUS_LABELS, DRIVER_STATUS_CLASSES, VEHICLE_LABELS,
  type Driver, type DriverInvitation,
} from '~/composables/delivery/useDelivery'

defineProps<{
  drivers: Driver[]
  loading: boolean
  pendingInvitations: DriverInvitation[]
}>()

defineEmits<{
  invite: []
  'cancel-invitation': [id: string]
  edit: [driver: Driver]
  delete: [id: string]
}>()
</script>
