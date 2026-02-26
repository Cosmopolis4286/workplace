<template>
  <div>
    <!-- Header -->
    <div class="mb-8 flex justify-between items-center">
      <div>
        <h1 class="text-3xl font-bold text-gray-900">Agendamientos</h1>
        <p class="mt-2 text-gray-600">Gestiona las reservas y citas del restaurante</p>
      </div>
      <button class="btn-primary flex items-center" @click="openCreateModal">
        <PlusIcon class="h-5 w-5 mr-2" />
        Nueva Reserva
      </button>
    </div>

    <!-- Error banner -->
    <div v-if="error" class="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
      <p class="text-red-700 text-sm">{{ error }}</p>
      <button class="text-red-500 hover:text-red-700" @click="error = null">
        <XMarkIcon class="h-5 w-5" />
      </button>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div class="card p-5">
        <div class="flex items-center">
          <div class="p-2 bg-primary-100 rounded-full">
            <CalendarIcon class="h-6 w-6 text-primary-600" />
          </div>
          <div class="ml-3">
            <p class="text-xs font-medium text-gray-500">Hoy</p>
            <p class="text-xl font-bold text-gray-900">{{ stats.todayTotal }}</p>
          </div>
        </div>
      </div>
      <div class="card p-5">
        <div class="flex items-center">
          <div class="p-2 bg-yellow-100 rounded-full">
            <ClockIcon class="h-6 w-6 text-yellow-600" />
          </div>
          <div class="ml-3">
            <p class="text-xs font-medium text-gray-500">Pendientes</p>
            <p class="text-xl font-bold text-gray-900">{{ stats.pending }}</p>
          </div>
        </div>
      </div>
      <div class="card p-5">
        <div class="flex items-center">
          <div class="p-2 bg-green-100 rounded-full">
            <CheckCircleIcon class="h-6 w-6 text-green-600" />
          </div>
          <div class="ml-3">
            <p class="text-xs font-medium text-gray-500">Confirmadas</p>
            <p class="text-xl font-bold text-gray-900">{{ stats.confirmed }}</p>
          </div>
        </div>
      </div>
      <div class="card p-5">
        <div class="flex items-center">
          <div class="p-2 bg-red-100 rounded-full">
            <XCircleIcon class="h-6 w-6 text-red-600" />
          </div>
          <div class="ml-3">
            <p class="text-xs font-medium text-gray-500">Canceladas</p>
            <p class="text-xl font-bold text-gray-900">{{ stats.cancelled }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Toolbar -->
    <div class="card p-4 mb-6">
      <div class="flex flex-col sm:flex-row justify-between gap-4">
        <!-- View toggle -->
        <div class="flex space-x-2">
          <button
            :class="['px-4 py-2 rounded-md text-sm font-medium transition-colors', viewMode === 'calendar' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200']"
            @click="viewMode = 'calendar'"
          >
            <CalendarDaysIcon class="h-4 w-4 inline mr-1" />
            Calendario
          </button>
          <button
            :class="['px-4 py-2 rounded-md text-sm font-medium transition-colors', viewMode === 'list' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200']"
            @click="viewMode = 'list'"
          >
            <ListBulletIcon class="h-4 w-4 inline mr-1" />
            Lista
          </button>
        </div>

        <!-- Filters -->
        <div class="flex flex-wrap gap-3 items-center">
          <input
            v-model="filters.dateFrom"
            type="date"
            class="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            @change="applyFilters"
          />
          <input
            v-model="filters.dateTo"
            type="date"
            class="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            @change="applyFilters"
          />
          <select
            v-model="filters.status"
            class="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            @change="applyFilters"
          >
            <option value="">Todos los estados</option>
            <option v-for="(label, key) in STATUS_LABELS" :key="key" :value="key">{{ label }}</option>
          </select>
          <button
            v-if="filters.status || filters.dateFrom || filters.dateTo"
            class="text-sm text-gray-500 hover:text-gray-700 underline"
            @click="clearFilters"
          >
            Limpiar
          </button>
        </div>
      </div>
    </div>

    <!-- Loading skeleton -->
    <div v-if="loading" class="space-y-3">
      <div v-for="i in 4" :key="i" class="card p-5 animate-pulse">
        <div class="flex items-center space-x-4">
          <div class="h-10 w-10 bg-gray-200 rounded-full" />
          <div class="flex-1 space-y-2">
            <div class="h-4 bg-gray-200 rounded w-1/3" />
            <div class="h-3 bg-gray-200 rounded w-1/4" />
          </div>
          <div class="h-6 w-24 bg-gray-200 rounded-full" />
        </div>
      </div>
    </div>

    <template v-else>
      <!-- Calendar View -->
      <div v-if="viewMode === 'calendar'" class="card p-6 mb-6">
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-lg font-semibold text-gray-900">{{ calendarTitle }}</h2>
          <div class="flex space-x-2">
            <button class="p-2 hover:bg-gray-100 rounded-md" @click="prevMonth">
              <ChevronLeftIcon class="h-5 w-5" />
            </button>
            <button class="px-3 py-1 text-sm text-primary-600 hover:bg-primary-50 rounded-md" @click="goToToday">
              Hoy
            </button>
            <button class="p-2 hover:bg-gray-100 rounded-md" @click="nextMonth">
              <ChevronRightIcon class="h-5 w-5" />
            </button>
          </div>
        </div>

        <div class="grid grid-cols-7 mb-2">
          <div v-for="day in ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']" :key="day"
               class="p-2 text-center text-xs font-semibold text-gray-500 uppercase">
            {{ day }}
          </div>
        </div>

        <div class="grid grid-cols-7 border-t border-l border-gray-100">
          <div
            v-for="cell in calendarCells"
            :key="cell.key"
            :class="[
              'min-h-[90px] p-2 border-b border-r border-gray-100 relative',
              cell.isOtherMonth ? 'bg-gray-50' : 'bg-white',
              cell.isToday ? 'ring-2 ring-inset ring-primary-400' : ''
            ]"
          >
            <span :class="['text-xs font-medium', cell.isOtherMonth ? 'text-gray-300' : cell.isToday ? 'text-primary-600 font-bold' : 'text-gray-700']">
              {{ cell.day }}
            </span>
            <div class="mt-1 space-y-0.5">
              <button
                v-for="appt in cell.appointments.slice(0, 3)"
                :key="appt.id"
                :class="['w-full text-left text-xs px-1.5 py-0.5 rounded truncate', STATUS_CLASSES[appt.status]]"
                @click="openEditModal(appt)"
              >
                {{ formatTime(appt.date) }} {{ appt.customerName }}
              </button>
              <span v-if="cell.appointments.length > 3" class="text-xs text-gray-400 pl-1">
                +{{ cell.appointments.length - 3 }} más
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- List View -->
      <div v-else class="space-y-4">
        <div v-if="appointments.length === 0" class="card p-12 text-center text-gray-400">
          <CalendarIcon class="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p class="font-medium">No hay agendamientos</p>
          <p class="text-sm mt-1">Crea una nueva reserva para comenzar</p>
        </div>

        <template v-else>
          <div v-for="group in groupedAppointments" :key="group.date" class="card p-5">
            <h3 class="text-sm font-semibold text-gray-500 uppercase mb-4">{{ group.dateLabel }}</h3>
            <div class="space-y-3">
              <div
                v-for="appt in group.items"
                :key="appt.id"
                class="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <!-- Left: info -->
                <div class="flex items-center space-x-4 min-w-0">
                  <div class="flex-shrink-0 h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                    <span class="text-sm font-bold text-primary-700">{{ appt.customerName[0].toUpperCase() }}</span>
                  </div>
                  <div class="min-w-0">
                    <p class="text-sm font-semibold text-gray-900 truncate">{{ appt.customerName }}</p>
                    <p class="text-xs text-gray-500">
                      <UsersIcon class="h-3 w-3 inline mr-1" />{{ appt.partySize }} personas
                      <span v-if="appt.tableNumber" class="ml-2">
                        <TableCellsIcon class="h-3 w-3 inline mr-1" />Mesa {{ appt.tableNumber }}
                      </span>
                    </p>
                    <p class="text-xs text-gray-400 mt-0.5">
                      <ClockIcon class="h-3 w-3 inline mr-1" />{{ formatTime(appt.date) }}
                      <span v-if="appt.customerPhone" class="ml-2">
                        <PhoneIcon class="h-3 w-3 inline mr-1" />{{ appt.customerPhone }}
                      </span>
                    </p>
                  </div>
                </div>

                <!-- Right: status + actions -->
                <div class="flex items-center space-x-3 flex-shrink-0">
                  <span :class="['inline-flex px-2.5 py-1 text-xs font-medium rounded-full', STATUS_CLASSES[appt.status]]">
                    {{ STATUS_LABELS[appt.status] }}
                  </span>

                  <!-- Quick status change -->
                  <select
                    :value="appt.status"
                    class="text-xs border border-gray-200 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-primary-400"
                    @change="handleStatusChange(appt, ($event.target as HTMLSelectElement).value as AppointmentStatus)"
                  >
                    <option v-for="(label, key) in STATUS_LABELS" :key="key" :value="key">{{ label }}</option>
                  </select>

                  <button class="p-1.5 text-primary-600 hover:text-primary-800 hover:bg-primary-50 rounded" @click="openEditModal(appt)">
                    <PencilIcon class="h-4 w-4" />
                  </button>
                  <button class="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded" @click="handleDelete(appt)">
                    <TrashIcon class="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>
    </template>

    <!-- Create / Edit Modal -->
    <TransitionRoot :show="showModal" as="template">
      <Dialog class="relative z-50" @close="closeModal">
        <TransitionChild
          enter="ease-out duration-200" enter-from="opacity-0" enter-to="opacity-100"
          leave="ease-in duration-150" leave-from="opacity-100" leave-to="opacity-0"
        >
          <div class="fixed inset-0 bg-black/40" />
        </TransitionChild>

        <div class="fixed inset-0 flex items-center justify-center p-4">
          <TransitionChild
            enter="ease-out duration-200" enter-from="opacity-0 scale-95" enter-to="opacity-100 scale-100"
            leave="ease-in duration-150" leave-from="opacity-100 scale-100" leave-to="opacity-0 scale-95"
          >
            <DialogPanel class="w-full max-w-lg bg-white rounded-xl shadow-2xl p-6">
              <div class="flex justify-between items-center mb-5">
                <DialogTitle class="text-lg font-semibold text-gray-900">
                  {{ editingId ? 'Editar Reserva' : 'Nueva Reserva' }}
                </DialogTitle>
                <button class="text-gray-400 hover:text-gray-600" @click="closeModal">
                  <XMarkIcon class="h-5 w-5" />
                </button>
              </div>

              <form class="space-y-4" @submit.prevent="handleSubmit">
                <!-- Customer name -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Nombre del cliente *</label>
                  <input
                    v-model="form.customerName"
                    type="text"
                    required
                    maxlength="100"
                    placeholder="Ej. María García"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                  />
                </div>

                <!-- Phone -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                  <input
                    v-model="form.customerPhone"
                    type="tel"
                    maxlength="30"
                    placeholder="+52 55 1234 5678"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                  />
                </div>

                <!-- Date & Time -->
                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Fecha *</label>
                    <input
                      v-model="form.date"
                      type="date"
                      required
                      class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                    />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Hora *</label>
                    <input
                      v-model="form.time"
                      type="time"
                      required
                      class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                    />
                  </div>
                </div>

                <!-- Party size & Table -->
                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Personas *</label>
                    <input
                      v-model.number="form.partySize"
                      type="number"
                      required
                      min="1"
                      max="100"
                      class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                    />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Mesa (opcional)</label>
                    <input
                      v-model.number="form.tableNumber"
                      type="number"
                      min="1"
                      placeholder="Nº mesa"
                      class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                    />
                  </div>
                </div>

                <!-- Status (only when editing) -->
                <div v-if="editingId">
                  <label class="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                  <select
                    v-model="form.status"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                  >
                    <option v-for="(label, key) in STATUS_LABELS" :key="key" :value="key">{{ label }}</option>
                  </select>
                </div>

                <!-- Notes -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Notas (opcional)</label>
                  <textarea
                    v-model="form.notes"
                    rows="2"
                    maxlength="500"
                    placeholder="Alergias, preferencias especiales..."
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm resize-none"
                  />
                </div>

                <!-- Actions -->
                <div class="flex justify-end space-x-3 pt-2">
                  <button type="button" class="btn-secondary" @click="closeModal">Cancelar</button>
                  <button type="submit" class="btn-primary" :disabled="saving">
                    <span v-if="saving">Guardando...</span>
                    <span v-else>{{ editingId ? 'Guardar Cambios' : 'Crear Reserva' }}</span>
                  </button>
                </div>
              </form>
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </TransitionRoot>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  PlusIcon,
  CalendarIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  UsersIcon,
  PhoneIcon,
} from '@heroicons/vue/24/outline'
import {
  CalendarDaysIcon,
  ListBulletIcon,
  TableCellsIcon,
} from '@heroicons/vue/24/solid'
import { Dialog, DialogPanel, DialogTitle, TransitionRoot, TransitionChild } from '@headlessui/vue'
import {
  useAgendamientos,
  STATUS_LABELS,
  STATUS_CLASSES,
  type AppointmentStatus,
  type Appointment,
} from '~/composables/useAgendamientos'
import { useAlert } from '~/composables/useAlert'

const {
  appointments,
  stats,
  loading,
  error,
  loadAgendamientos,
  createAgendamiento,
  updateAgendamiento,
  deleteAgendamiento,
  updateStatus,
} = useAgendamientos()

const alert = useAlert()

// ─── View mode ────────────────────────────────────────────────────────────────
const viewMode = ref<'calendar' | 'list'>('list')

// ─── Filters ─────────────────────────────────────────────────────────────────
const filters = ref<{ status: string; dateFrom: string; dateTo: string }>({
  status: '',
  dateFrom: '',
  dateTo: '',
})

function applyFilters() {
  loadAgendamientos({
    status: filters.value.status as AppointmentStatus || undefined,
    dateFrom: filters.value.dateFrom || undefined,
    dateTo: filters.value.dateTo || undefined,
  })
}

function clearFilters() {
  filters.value = { status: '', dateFrom: '', dateTo: '' }
  loadAgendamientos()
}

// ─── Calendar ─────────────────────────────────────────────────────────────────
const calendarDate = ref(new Date())

const calendarTitle = computed(() =>
  calendarDate.value.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })
    .replace(/^\w/, (c) => c.toUpperCase()),
)

function prevMonth() {
  const d = new Date(calendarDate.value)
  d.setMonth(d.getMonth() - 1)
  calendarDate.value = d
  syncCalendarFilters()
}

function nextMonth() {
  const d = new Date(calendarDate.value)
  d.setMonth(d.getMonth() + 1)
  calendarDate.value = d
  syncCalendarFilters()
}

function goToToday() {
  calendarDate.value = new Date()
  syncCalendarFilters()
}

function syncCalendarFilters() {
  const d = calendarDate.value
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  filters.value.dateFrom = `${y}-${m}-01`
  const lastDay = new Date(y, d.getMonth() + 1, 0).getDate()
  filters.value.dateTo = `${y}-${m}-${String(lastDay).padStart(2, '0')}`
  applyFilters()
}

const calendarCells = computed(() => {
  const year = calendarDate.value.getFullYear()
  const month = calendarDate.value.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPrev = new Date(year, month, 0).getDate()
  const today = new Date()
  const cells = []

  // Padding from previous month
  for (let i = firstDay - 1; i >= 0; i--) {
    const day = daysInPrev - i
    const key = `prev-${day}`
    cells.push({ key, day, isOtherMonth: true, isToday: false, date: null, appointments: [] as Appointment[] })
  }

  // Current month days
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day)
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const isToday =
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    const dayAppts = appointments.value.filter((a) => a.date.startsWith(dateStr))
    cells.push({ key: dateStr, day, isOtherMonth: false, isToday, date: dateStr, appointments: dayAppts })
  }

  // Padding for next month
  const remaining = 42 - cells.length
  for (let i = 1; i <= remaining; i++) {
    cells.push({ key: `next-${i}`, day: i, isOtherMonth: true, isToday: false, date: null, appointments: [] as Appointment[] })
  }

  return cells
})

// ─── List grouping ────────────────────────────────────────────────────────────
const groupedAppointments = computed(() => {
  const map = new Map<string, { date: string; dateLabel: string; items: Appointment[] }>()
  for (const appt of appointments.value) {
    const dateKey = appt.date.slice(0, 10)
    if (!map.has(dateKey)) {
      map.set(dateKey, {
        date: dateKey,
        dateLabel: new Date(dateKey + 'T12:00:00').toLocaleDateString('es-MX', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
        items: [],
      })
    }
    map.get(dateKey)!.items.push(appt)
  }
  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date))
})

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatTime(isoDate: string) {
  return new Date(isoDate).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
}

// ─── Modal ────────────────────────────────────────────────────────────────────
const showModal = ref(false)
const saving = ref(false)
const editingId = ref<string | null>(null)

const emptyForm = () => ({
  customerName: '',
  customerPhone: '',
  date: '',
  time: '',
  partySize: 2,
  tableNumber: undefined as number | undefined,
  notes: '',
  status: 'PENDIENTE' as AppointmentStatus,
})

const form = ref(emptyForm())

function openCreateModal() {
  editingId.value = null
  form.value = emptyForm()
  showModal.value = true
}

function openEditModal(appt: Appointment) {
  editingId.value = appt.id
  const d = new Date(appt.date)
  form.value = {
    customerName: appt.customerName,
    customerPhone: appt.customerPhone ?? '',
    date: d.toISOString().slice(0, 10),
    time: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
    partySize: appt.partySize,
    tableNumber: appt.tableNumber,
    notes: appt.notes ?? '',
    status: appt.status,
  }
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  editingId.value = null
}

async function handleSubmit() {
  if (saving.value) return
  saving.value = true

  const isoDate = `${form.value.date}T${form.value.time}:00`

  const payload = {
    customerName: form.value.customerName.trim(),
    customerPhone: form.value.customerPhone?.trim() || undefined,
    date: isoDate,
    partySize: form.value.partySize,
    tableNumber: form.value.tableNumber || undefined,
    notes: form.value.notes?.trim() || undefined,
    ...(editingId.value && { status: form.value.status }),
  }

  try {
    let ok: Appointment | null
    if (editingId.value) {
      ok = await updateAgendamiento(editingId.value, payload)
    } else {
      ok = await createAgendamiento(payload)
    }

    if (ok) {
      alert.success('Éxito', editingId.value ? 'Reserva actualizada correctamente' : 'Reserva creada correctamente')
      closeModal()
    }
  } finally {
    saving.value = false
  }
}

async function handleStatusChange(appt: Appointment, newStatus: AppointmentStatus) {
  if (appt.status === newStatus) return
  const ok = await updateStatus(appt.id, newStatus)
  if (ok) alert.success('Estado actualizado', `Reserva marcada como ${STATUS_LABELS[newStatus]}`)
}

async function handleDelete(appt: Appointment) {
  const result = await alert.confirm(
    'Eliminar Reserva',
    `¿Estás seguro de que deseas eliminar la reserva de ${appt.customerName}? Esta acción no se puede deshacer.`,
    'Eliminar',
    'Cancelar',
  )
  if (result.isConfirmed) {
    const ok = await deleteAgendamiento(appt.id)
    if (ok) alert.success('Eliminada', 'La reserva fue eliminada correctamente')
  }
}

// ─── Init ─────────────────────────────────────────────────────────────────────
onMounted(() => loadAgendamientos())
</script>
