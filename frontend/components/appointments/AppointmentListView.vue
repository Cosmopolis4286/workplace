<template>
  <div>
    <!-- Empty state -->
    <div v-if="appointments.length === 0" class="card p-12 text-center">
      <CalendarIcon class="h-12 w-12 text-gray-300 mx-auto mb-3" />
      <p class="text-gray-500 font-medium">No hay agendamientos</p>
      <p class="text-sm text-gray-400 mt-1">Crea una nueva reserva para comenzar</p>
      <button class="btn-primary mt-4" @click="$emit('create')">
        <PlusIcon class="h-4 w-4 inline mr-1.5" />
        Nueva Reserva
      </button>
    </div>

    <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-6">

      <!-- Lista agrupada por fecha -->
      <div class="lg:col-span-2 space-y-4">
        <div v-for="group in groupedAppointments" :key="group.date" class="card overflow-hidden">
          <!-- Cabecera de fecha -->
          <div class="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
            <h3 class="text-xs font-semibold text-gray-500 tracking-wider">
              {{ group.dateLabel }}
            </h3>
            <span class="text-xs text-gray-400">{{ group.items.length }} reserva{{ group.items.length !== 1 ? 's' : '' }}</span>
          </div>

          <!-- Filas -->
          <div class="divide-y divide-gray-100">
            <div
              v-for="appt in group.items"
              :key="appt.id"
              class="p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors group"
            >
              <!-- Avatar -->
              <div class="flex-shrink-0 h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                <span class="text-sm font-bold text-red-700">{{ appt.customerName[0].toUpperCase() }}</span>
              </div>

              <!-- Info -->
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <p class="text-sm font-semibold text-gray-900 truncate">{{ appt.customerName }}</p>
                  <span class="badge flex-shrink-0" :class="STATUS_CLASSES[appt.status]">
                    {{ STATUS_LABELS[appt.status] }}
                  </span>
                </div>
                <p class="text-xs text-gray-400 mt-0.5 flex flex-wrap gap-x-3">
                  <span class="flex items-center gap-1">
                    <ClockIcon class="h-3 w-3" />{{ formatTime(appt.date) }}
                  </span>
                  <span class="flex items-center gap-1">
                    <UsersIcon class="h-3 w-3" />{{ appt.partySize }} personas
                  </span>
                  <span v-if="appt.tableNumber" class="flex items-center gap-1">
                    <TableCellsIcon class="h-3 w-3" />Mesa {{ appt.tableNumber }}
                  </span>
                  <span v-if="appt.customerPhone" class="flex items-center gap-1">
                    <PhoneIcon class="h-3 w-3" />{{ appt.customerPhone }}
                  </span>
                </p>
                <p v-if="appt.notes" class="text-xs text-gray-400 italic mt-0.5 truncate">"{{ appt.notes }}"</p>
              </div>

              <!-- Acciones hover -->
              <div class="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <select
                  :value="appt.status"
                  class="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-red-400 disabled:opacity-50"
                  :disabled="updatingApptId === appt.id"
                  @change="$emit('status-change', appt, ($event.target as HTMLSelectElement).value as AppointmentStatus)"
                >
                  <option v-for="(label, key) in STATUS_LABELS" :key="key" :value="key">{{ label }}</option>
                </select>
                <button
                  class="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Editar"
                  @click="$emit('edit', appt)"
                >
                  <PencilIcon class="h-4 w-4" />
                </button>
                <button
                  class="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Eliminar"
                  @click="$emit('delete', appt)"
                >
                  <TrashIcon class="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Sidebar resumen -->
      <div class="space-y-4">
        <!-- Por estado -->
        <div class="card p-5">
          <h3 class="text-sm font-semibold text-gray-700 mb-4">Por estado</h3>
          <div class="space-y-3">
            <div v-for="s in statusSummary" :key="s.key" class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="w-2 h-2 rounded-full flex-shrink-0" :class="s.dot" />
                <span class="text-sm text-gray-600">{{ s.label }}</span>
              </div>
              <span class="text-sm font-bold text-gray-900">{{ s.count }}</span>
            </div>
          </div>
        </div>

        <!-- Próximas reservas -->
        <div v-if="upcomingAppointments.length > 0" class="card p-5">
          <h3 class="text-sm font-semibold text-gray-700 mb-3">Próximas reservas</h3>
          <div class="space-y-3">
            <div
              v-for="appt in upcomingAppointments"
              :key="appt.id"
              class="flex items-start gap-3 cursor-pointer hover:bg-gray-50 rounded-lg p-1 -mx-1 transition-colors"
              @click="$emit('edit', appt)"
            >
              <div class="flex-shrink-0 w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center text-xs font-bold text-red-700">
                {{ appt.customerName[0].toUpperCase() }}
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-xs font-semibold text-gray-900 truncate">{{ appt.customerName }}</p>
                <p class="text-[10px] text-gray-400">{{ formatDateTime(appt.date) }} · {{ appt.partySize }} personas</p>
              </div>
              <span class="badge text-[10px]" :class="STATUS_CLASSES[appt.status]">
                {{ STATUS_LABELS[appt.status] }}
              </span>
            </div>
          </div>
        </div>

        <!-- Hoy -->
        <div v-if="stats.todayTotal > 0" class="card p-5 border-l-4 border-l-red-400">
          <div class="flex items-center gap-2 mb-1">
            <CalendarIcon class="h-4 w-4 text-red-500" />
            <p class="text-sm font-semibold text-gray-700">Reservas hoy</p>
          </div>
          <p class="text-3xl font-black text-red-600">{{ stats.todayTotal }}</p>
          <p class="text-xs text-gray-400 mt-1">{{ stats.pending }} pendiente{{ stats.pending !== 1 ? 's' : '' }} de confirmar</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { PlusIcon, ClockIcon, PencilIcon, TrashIcon, UsersIcon, PhoneIcon, CalendarIcon } from '@heroicons/vue/24/outline'
import { TableCellsIcon } from '@heroicons/vue/24/solid'
import {
  STATUS_LABELS,
  STATUS_CLASSES,
  type AppointmentStatus,
  type Appointment,
  type AppointmentStats,
} from '~/composables/commerce/useAppointments'
import { useDateFormat } from '~/composables/core/useDateFormat'

const props = defineProps<{
  appointments: Appointment[]
  stats: AppointmentStats
  updatingApptId: string | null
}>()

defineEmits<{
  create: []
  edit: [appt: Appointment]
  delete: [appt: Appointment]
  'status-change': [appt: Appointment, newStatus: AppointmentStatus]
}>()

const { formatDateTimeShort } = useDateFormat()

const statusSummary = computed(() => [
  { key: 'PENDING',   label: 'Pendientes',  count: props.stats.pending,   dot: 'bg-yellow-400' },
  { key: 'CONFIRMED', label: 'Confirmadas', count: props.stats.confirmed, dot: 'bg-green-400'  },
  { key: 'SEATED',    label: 'Sentadas',    count: props.appointments.filter(a => a.status === 'SEATED').length,    dot: 'bg-blue-400'   },
  { key: 'COMPLETED', label: 'Completadas', count: props.appointments.filter(a => a.status === 'COMPLETED').length, dot: 'bg-gray-400'   },
  { key: 'CANCELLED', label: 'Canceladas',  count: props.stats.cancelled, dot: 'bg-red-400'    },
  { key: 'NO_SHOW',   label: 'No show',     count: props.appointments.filter(a => a.status === 'NO_SHOW').length,    dot: 'bg-orange-400' },
])

const upcomingAppointments = computed(() => {
  const now = new Date()
  return props.appointments
    .filter(a => new Date(a.date) >= now && (a.status === 'PENDING' || a.status === 'CONFIRMED'))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5)
})

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
}

function formatDateTime(iso: string) {
  return formatDateTimeShort(iso)
}
</script>
